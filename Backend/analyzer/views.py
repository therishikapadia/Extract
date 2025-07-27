import json
import logging
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.utils import timezone
from django.conf import settings
from .models import FoodAnalysis, AnalysisSession
from .services import get_food_analyzer_service
import os
import tempfile
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
        file_name = f"food_label_{analysis.id}.{uploaded_file.name.split('.')[-1]}"
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
        logger.error(f"Error in analyze_food_label: {str(e)}")
        return JsonResponse({'error': f'Analysis failed: {str(e)}'}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def chat_followup(request):
    """
    Handle follow-up health-related questions about a previously analyzed label.
    Expects: {
        'analysis_id': ...,
        'question': ...,
        'history': [...],  # optional, list of previous Q&A
    }
    """
    try:
        data = json.loads(request.body)
        analysis_id = data.get('analysis_id')
        question = data.get('question')
        history = data.get('history', [])

        if not analysis_id or not question:
            return JsonResponse({'error': 'Missing analysis_id or question'}, status=400)

        # Fetch the analysis object
        from .models import FoodAnalysis
        try:
            analysis = FoodAnalysis.objects.get(id=analysis_id)
        except FoodAnalysis.DoesNotExist:
            return JsonResponse({'error': 'Analysis not found'}, status=404)

        # Compose context for the LLM
        context = {
            'extracted_text': analysis.extracted_text,
            'ingredients': analysis.ingredients_text,
            'nutrition_info': analysis.nutrition_text,
            'previous_qa': history
        }

        # Compose a prompt for the LLM
        prompt = (
            f"You are a nutritionist. Here is the food label info:\n"
            f"EXTRACTED TEXT: {context['extracted_text']}\n"
            f"INGREDIENTS: {context['ingredients']}\n"
            f"NUTRITION: {context['nutrition_info']}\n"
        )
        if history:
            prompt += "\nPrevious Q&A:\n"
            for qa in history:
                prompt += f"Q: {qa.get('question','')}\nA: {qa.get('answer','')}\n"
        prompt += f"\nUser's follow-up question: {question}\n"
        prompt += (
            "Answer ONLY if the question is about health, nutrition, or ingredients. "
            "If not, reply: 'I'm here to answer health-related questions about this product.'"
        )

        # Call the LLM
        analyzer_service = get_food_analyzer_service()
        answer = analyzer_service.llm(prompt)

        return JsonResponse({'answer': answer})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@require_http_methods(["GET"])
def health_check(request):
    """Health check endpoint"""
    try:
        # Test database connection
        try:
            FoodAnalysis.objects.count()
            db_status = True
            db_message = "Database connected"
        except Exception as e:
            db_status = False
            db_message = f"Database error: {str(e)}"
        
        # Test Ollama connection
        try:
            analyzer_service = get_food_analyzer_service()
            ollama_connected, ollama_message = analyzer_service.test_connection()
        except Exception as e:
            ollama_connected = False
            ollama_message = f"Ollama service error: {str(e)}"
        
        # Test OCR (tesseract)
        try:
            import pytesseract
            tesseract_version = pytesseract.get_tesseract_version()
            ocr_status = True
            ocr_message = f"Tesseract version: {tesseract_version}"
        except Exception as e:
            ocr_status = False
            ocr_message = f"OCR error: {str(e)}"
        
        # Overall health status
        overall_healthy = db_status and ollama_connected and ocr_status
        
        return JsonResponse({
            'status': 'healthy' if overall_healthy else 'unhealthy',
            'timestamp': timezone.now().isoformat(),
            'components': {
                'database': {
                    'status': db_status,
                    'message': db_message
                },
                'ollama': {
                    'status': ollama_connected,
                    'message': ollama_message,
                    'model': getattr(settings, 'OLLAMA_MODEL', 'llama3.2:latest')
                },
                'ocr': {
                    'status': ocr_status,
                    'message': ocr_message
                }
            },
            'stats': {
                'total_analyses': FoodAnalysis.objects.count(),
                'total_sessions': AnalysisSession.objects.count(),
                'recent_analyses': FoodAnalysis.objects.filter(
                    created_at__gte=timezone.now() - timezone.timedelta(hours=24)
                ).count()
            }
        })
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JsonResponse({
            'status': 'error',
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }, status=500)

def get_client_ip(request):
    """Get client IP address"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

class SignupView(generics.CreateAPIView):
    queryset = get_user_model().objects.all()
    serializer_class = UserSignupSerializer