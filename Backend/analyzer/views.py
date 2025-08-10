import json
import logging
import os
import re
import uuid
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.utils import timezone
from django.conf import settings
from django.db import transaction
from django.contrib.auth.models import User
from .models import FoodAnalysis, AnalysisSession, Chat, Message
from .services import get_food_analyzer_service
from .utils import get_client_ip
from rest_framework import generics
from .serializers import UserSignupSerializer
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)


def index(request):
    """Main page view"""
    return render(request, 'analyzer/index.html')

@csrf_exempt
@require_http_methods(["POST"])
def analyze_food_label(request):
    """Analyze uploaded food label image"""
    try:
        # Check if image was uploaded
        if 'image' not in request.FILES:
            return JsonResponse({'error': 'No image file provided'}, status=400)
        uploaded_file = request.FILES['image']

        # Validate file type
        if not uploaded_file.content_type.startswith('image/'):
            return JsonResponse({'error': 'Invalid file type. Please upload an image.'}, status=400)

        # Validate file size (10MB limit)
        if uploaded_file.size > 10 * 1024 * 1024:
            return JsonResponse({'error': 'File too large. Maximum size is 10MB.'}, status=400)

        # Get or create analysis session
        session_id = request.session.session_key
        if not session_id:
            request.session.create()
            session_id = request.session.session_key

        analysis_session, created = AnalysisSession.objects.get_or_create(
            session_id=session_id,
            defaults={
                'ip_address': get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'total_analyses': 0
            }
        )

        # Create analysis record
        analysis = FoodAnalysis.objects.create()

        # Save uploaded image
        file_extension = uploaded_file.name.split('.')[-1]
        file_name = f"food_label_{analysis.id}.{file_extension}"
        file_path = default_storage.save(f'food_labels/{file_name}', ContentFile(uploaded_file.read()))
        analysis.image = file_path
        analysis.save()

        # Get the full path for processing
        full_image_path = os.path.join(settings.MEDIA_ROOT, file_path)

        # Get the food analyzer service
        analyzer_service = get_food_analyzer_service()

        # Extract text from image
        logger.info(f"Extracting text from image: {full_image_path}")
        extracted_text = analyzer_service.extract_text_from_image(full_image_path)
        if extracted_text.startswith("Error"):
            return JsonResponse({'error': extracted_text}, status=500)

        # Process extracted text
        ingredients_section, nutrition_section = analyzer_service.process_extracted_text(extracted_text)

        # Analyze with LangChain
        logger.info("Starting LangChain analysis...")
        analysis_result = analyzer_service.analyze_food_label(
            extracted_text,
            ingredients_section,
            nutrition_section
        )

        # Save analysis results
        analysis.extracted_text = extracted_text
        analysis.ingredients_text = ingredients_section
        analysis.nutrition_text = nutrition_section
        analysis.analysis_result = analysis_result['raw_response']
        analysis.recommendation = analysis_result['recommendation']
        analysis.health_score = analysis_result['health_score']
        analysis.save()

        # Update session stats
        analysis_session.total_analyses += 1
        analysis_session.last_activity = timezone.now()
        analysis_session.save()

        # Prepare response
        response_data = {
            'success': True,
            'analysis_id': str(analysis.id),
            'extracted_text': extracted_text,
            'ingredients': ingredients_section,
            'nutrition': nutrition_section,
            'analysis': analysis_result['raw_response'],
            'recommendation': analysis_result['recommendation'],
            'health_score': analysis_result['health_score'],
            'summary': analysis_result['summary'],
            'timestamp': analysis.created_at.isoformat()
        }
        logger.info(f"Analysis completed successfully for {analysis.id}")
        return JsonResponse(response_data)

    except Exception as e:
        logger.error(f"Error in analyze_food_label: {str(e)}", exc_info=True)
        return JsonResponse({'error': f'Analysis failed: {str(e)}'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def chat_followup(request):
    """
    Handle follow-up health-related questions about a previously analyzed label.
    Expects: {
        'analysis_id': ...,
        'question': ...,
        'chat_id': ... (optional, for continuing existing chat)
    }
    """
    try:
        logger.info("🔁 chat_followup: Received POST request")

        data = json.loads(request.body)
        analysis_id = data.get('analysis_id')
        question = data.get('question')
        chat_id = data.get('chat_id')  # Optional
        user = request.user
        print("Current user:", user)


        logger.debug(f"📥 Input Data - analysis_id: {analysis_id}, chat_id: {chat_id}, question: {question}")

        if not analysis_id or not question:
            logger.warning("❌ Missing analysis_id or question")
            return JsonResponse({'error': 'Missing analysis_id or question'}, status=400)

        if len(question.strip()) == 0:
            return JsonResponse({'error': 'Question cannot be empty'}, status=400)
        if len(question) > 1000:
            return JsonResponse({'error': 'Question too long'}, status=400)

        # Fetch the analysis object
        try:
            analysis = FoodAnalysis.objects.get(id=analysis_id)
            logger.info(f"✅ Found analysis with ID {analysis_id}")
        except FoodAnalysis.DoesNotExist:
            logger.warning(f"❌ Analysis not found: {analysis_id}")
            return JsonResponse({'error': 'Analysis not found'}, status=404)

        user = get_or_create_session_user(request)
        logger.debug(f"👤 Session user - ID: {user.id}, Username: {user.username}")

        with transaction.atomic():
            # Chat retrieval or creation
            if chat_id:
                try:
                    chat = Chat.objects.get(id=chat_id, user=user)
                    logger.info(f"✅ Existing chat found: {chat_id} for user {user.username}")
                except Chat.DoesNotExist:
                    logger.warning(f"❌ Chat not found or does not belong to user: {chat_id}")
                    return JsonResponse({'error': 'Chat not found'}, status=404)
            else:
                chat = Chat.objects.create(
                    user=user,
                    title="New Food Chat",
                    analysis_id=str(analysis.id)
                )
                logger.info(f"🆕 Created new chat with ID {chat.id} for user {user.username}")

            # Save user message
            user_msg = Message.objects.create(
                chat=chat,
                role='user',
                content=question.strip()
            )
            logger.debug(f"📝 Saved user message ID {user_msg.id} to chat {chat.id}")

            # Get recent message history for context
            recent_messages = Message.objects.filter(chat=chat).order_by('created_at')[:10]
            context_messages = [
                {'role': msg.role, 'content': msg.content}
                for msg in recent_messages
                if msg.role in ['user', 'llm']
            ]

            # Build prompt
            prompt = build_chat_prompt(analysis, context_messages, question)
            logger.debug("🧠 Built chat prompt for LLM")

            # Call the LLM
            analyzer_service = get_food_analyzer_service()
            try:
                llm_response = analyzer_service.llm(prompt)
                title, answer = parse_llm_response(llm_response)
                if not answer or not answer.strip():
                    answer = "I apologize, but I couldn't generate a proper response. Please try rephrasing your question."
                logger.info("✅ LLM response received")
            except Exception as llm_error:
                logger.error(f"❌ LLM error: {str(llm_error)}", exc_info=True)
                answer = "I'm experiencing technical difficulties. Please try again later."
                title = None

            # Save LLM response
            llm_msg = Message.objects.create(
                chat=chat,
                role='llm',
                content=answer
            )
            logger.debug(f"🧾 Saved LLM response message ID {llm_msg.id} to chat {chat.id}")

            # Update chat title if new
            if chat.title == "New Food Chat" and title:
                chat.title = title[:255]
                chat.save()
                logger.debug(f"✏️ Updated chat title to: {chat.title}")

        return JsonResponse({
            'success': True,
            'chat_id': chat.id,
            'answer': answer,
            'title': chat.title,
            'message_id': llm_msg.id,
            'timestamp': llm_msg.created_at.isoformat()
        })

    except Exception as e:
        logger.error(f"🔥 Exception in chat_followup: {str(e)}", exc_info=True)
        return JsonResponse({'error': 'Chat processing failed'}, status=500)


from django.contrib.auth.models import User

def get_or_create_session_user(request):
    """
    Get or create a user based on session.
    For hobby projects where user signup/login is not required.
    """
    # Ensure the session exists
    if not request.session.session_key:
        request.session.create()

    # Check if user_id already stored in session
    user_id = request.session.get('user_id')
    if user_id:
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            pass  # If user doesn't exist, we'll create a new one

    # Generate a unique anonymous username
    anon_username = f"anon_{uuid.uuid4().hex[:8]}"

    # Create the anonymous user
    user = User.objects.create(
        username=anon_username,
        first_name="Anonymous",  # Optional display name
        email=""
    )

    # Store the user_id in the session
    request.session['user_id'] = user.id

    return user


def build_chat_prompt(analysis, context_messages, question):
    """Build the chat prompt with title generation instruction"""
    has_ingredients = bool(analysis.ingredients_text and analysis.ingredients_text.strip())
    has_nutrition = bool(analysis.nutrition_text and analysis.nutrition_text.strip())
    has_extracted = bool(analysis.extracted_text and analysis.extracted_text.strip())

    prompt = "You are a nutritionist AI assistant. Here is the available food label information:\n\n"

    if has_extracted:
        prompt += f"FULL EXTRACTED TEXT: {analysis.extracted_text}\n\n"
    if has_ingredients:
        prompt += f"INGREDIENTS: {analysis.ingredients_text}\n\n"
    else:
        prompt += "INGREDIENTS: Not clearly visible\n\n"
    if has_nutrition:
        prompt += f"NUTRITION FACTS: {analysis.nutrition_text}\n\n"
    else:
        prompt += "NUTRITION FACTS: Not clearly visible\n\n"
    if analysis.analysis_result:
        prompt += f"PREVIOUS ANALYSIS: {analysis.analysis_result}\n\n"

    if context_messages:
        prompt += "Previous conversation:\n"
        for msg in context_messages:
            role = "User" if msg['role'] == 'user' else "Assistant"
            prompt += f"{role}: {msg['content']}\n"
        prompt += "\n"

    prompt += f"User's question: {question}\n\n"
    prompt += """
---
Instructions for your response:
- Answer ONLY if the question is about health, nutrition, ingredients, or dietary advice
- If the question is unrelated, respond: 'I'm here to answer health and nutrition questions about this product.'
- Be helpful, accurate, and concise
- Reference specific ingredients or nutritional information when available
- If information is missing, acknowledge the limitation
- If you're unsure about something, say so
Your response:"""

    return prompt


def parse_llm_response(llm_response):
    """Parse LLM response to extract title and main answer"""
    try:
        title_match = re.search(r'\*\*TITLE\*\*[:\s]*(.+?)(?:\n|---|$)', llm_response, re.IGNORECASE)
        if title_match:
            title = title_match.group(1).strip()
            answer = re.sub(r'\*\*TITLE\*\*[:\s]*.+?(?:\n|---|$)', '', llm_response, flags=re.IGNORECASE)
            answer = re.sub(r'^---\s*', '', answer.strip())
        else:
            title = None
            answer = llm_response.strip()
        return title, answer
    except Exception as e:
        logger.error(f"Error parsing LLM response: {str(e)}", exc_info=True)
        return None, llm_response.strip()


@csrf_exempt
@require_http_methods(["GET"])
def get_chat_history(request, chat_id):
    """Get full message history for a specific chat"""
    try:
        user = get_or_create_session_user(request)
        chat = get_object_or_404(Chat, id=chat_id, user=user)
        messages = Message.objects.filter(chat=chat).order_by('created_at')

        message_data = [
            {
                'id': msg.id,
                'role': msg.role,
                'content': msg.content,
                'image_url': msg.image_url,
                'timestamp': msg.created_at.isoformat()
            }
            for msg in messages
        ]

        return JsonResponse({
            'success': True,
            'chat_id': chat.id,
            'title': chat.title,
            'analysis_id': chat.analysis_id,  # ✅ Included
            'messages': message_data,
            'created_at': chat.created_at.isoformat()
        })
    except Exception as e:
        logger.error(f"Error in get_chat_history: {str(e)}", exc_info=True)
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["GET"])
def get_user_chats(request):
    """Get all chats for the current user"""
    try:
        user = get_or_create_session_user(request)
        chats = Chat.objects.filter(user=user).order_by('-created_at')

        chat_data = [
            {
                'id': chat.id,
                'title': chat.title,
                'created_at': chat.created_at.isoformat(),
                'message_count': chat.message_set.count(),
                'analysis_id': chat.analysis_id  # ✅ Now included
            }
            for chat in chats
        ]
        print(chat_data)
        return JsonResponse({
            'success': True,
            'chats': chat_data
        })
    except Exception as e:
        logger.error(f"Error getting user chats: {str(e)}", exc_info=True)
        return JsonResponse({'error': 'Failed to retrieve chats'}, status=500)


class SignupView(generics.CreateAPIView):
    queryset = get_user_model().objects.all()
    serializer_class = UserSignupSerializer