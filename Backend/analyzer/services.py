import os
import re
from PIL import Image
import pytesseract
from langchain.llms import Ollama
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.schema import OutputParserException
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class FoodAnalyzerService:
    """Service class for food label analysis using LangChain and Ollama"""
    
    def __init__(self):
        self.model_name = getattr(settings, 'OLLAMA_MODEL', 'llama3.2:latest')
        self.base_url = getattr(settings, 'OLLAMA_BASE_URL', 'http://localhost:11434')
        self.llm = None
        self.analysis_chain = None
        self._initialize_langchain()
    
    def _initialize_langchain(self):
        """Initialize LangChain components"""
        try:
            # Initialize Ollama LLM
            self.llm = Ollama(
                model=self.model_name,
                base_url=self.base_url,
                temperature=0.3,  # Lower temperature for more consistent responses
                top_p=0.9,
            )
            
            prompt_template = """You are a certified nutritionist and food safety expert. Your task is to analyze a food label and provide a detailed health assessment, including specific, practical dietary advice for a general consumer.

First, generate a short, clear **TITLE** summarizing the food item or the main concern (3–8 words). Do not include this title in your main response — it's for internal use only.

---

### 🧾 EXTRACTED TEXT:
{extracted_text}

### 🍽 INGREDIENTS:
{ingredients}

### 📊 NUTRITION INFORMATION:
{nutrition_info}

---

### 🎯 Your Response Format:

**RECOMMENDATION:** [EAT / AVOID / MODERATE]

**HEALTH SCORE:** [1–10]

**DETAILED ANALYSIS:**
- **Ingredients:** Comment on ingredient quality, additives, preservatives, allergens, natural vs. artificial items.
- **Nutrition:** Discuss calories, sugar, fats, sodium, protein, fiber, vitamins, minerals.
- **Concerns:** Clearly highlight any issues like high sugar/sodium, trans fats, allergens, ultra-processing, etc.

**PRACTICAL ADVICE:** Give real-life, contextual suggestions. For example:
- “Safe to eat up to 100g occasionally, not daily.”
- “Avoid if you have hypertension due to high sodium content.”
- “Better suited for active individuals due to higher carbs.”
- “Consume in moderation—especially if you're managing weight or sugar.”

**SUMMARY:** One strong sentence summarizing your overall health verdict and why.

---

### 🔍 Scoring Guidelines:
- 9–10: Excellent — clean ingredients, balanced nutrition, minimal processing
- 7–8: Good — minor concerns but generally healthy
- 5–6: Average — processed or sugary, eat occasionally
- 3–4: Poor — several concerns, eat rarely
- 1–2: Unhealthy — avoid due to serious nutritional issues
"""
            
            self.prompt = PromptTemplate(
                input_variables=["extracted_text", "ingredients", "nutrition_info"],
                template=prompt_template
            )
            
            # Create the analysis chain
            self.analysis_chain = LLMChain(
                llm=self.llm,
                prompt=self.prompt,
                verbose=False
            )
            
            logger.info(f"LangChain initialized successfully with model: {self.model_name}")
            
        except Exception as e:
            logger.error(f"Failed to initialize LangChain: {str(e)}")
            raise
    
    def test_connection(self):
        """Test connection to Ollama"""
        try:
            response = self.llm("Hello, respond with 'OK' if you can hear me.")
            return True, response
        except Exception as e:
            return False, str(e)
    
    def extract_text_from_image(self, image_path):
        """Extract text from image using OCR"""
        try:
            # Open the image
            with Image.open(image_path) as img:
                # Convert to RGB if necessary
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Configure tesseract for better food label reading
                custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz()[]{},./:;%*+-=<>!@#$%^&*()_+|\\~`" "'
                
                # Extract text
                text = pytesseract.image_to_string(img, config=custom_config)
                
                # Clean up the text
                text = self._clean_extracted_text(text)
                
                logger.info(f"Successfully extracted {len(text)} characters from image")
                return text
                
        except Exception as e:
            logger.error(f"Error extracting text from image: {str(e)}")
            return f"Error extracting text: {str(e)}"
    
    def _clean_extracted_text(self, text):
        """Clean and normalize extracted text"""
        if not text:
            return ""
        
        # Remove extra whitespace and empty lines
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        # Join lines back together
        cleaned_text = '\n'.join(lines)
        
        # Remove excessive whitespace
        cleaned_text = re.sub(r'\s+', ' ', cleaned_text)
        
        return cleaned_text.strip()
    
    def process_extracted_text(self, text):
        """Process extracted text to identify ingredients and nutrition sections"""
        if not text:
            return "", ""
        
        text_lower = text.lower()
        ingredients_section = ""
        nutrition_section = ""
        
        # Try to find ingredients section
        ingredients_keywords = ['ingredients', 'ingredient list', 'contains']
        for keyword in ingredients_keywords:
            if keyword in text_lower:
                start_idx = text_lower.find(keyword)
                # Look for the next 500 characters or until we find nutrition info
                end_idx = start_idx + 500
                
                # Try to find where ingredients section ends
                nutrition_start = text_lower.find('nutrition', start_idx)
                if nutrition_start != -1 and nutrition_start < end_idx:
                    end_idx = nutrition_start
                
                ingredients_section = text[start_idx:end_idx].strip()
                break
        
        # Try to find nutrition section
        nutrition_keywords = ['nutrition facts', 'nutrition information', 'nutritional information', 
                            'calories', 'protein', 'carbohydrate', 'fat', 'sodium', 'sugar']
        for keyword in nutrition_keywords:
            if keyword in text_lower:
                start_idx = text_lower.find(keyword)
                # Look for the next 400 characters
                end_idx = start_idx + 400
                nutrition_section = text[start_idx:end_idx].strip()
                break
        
        return ingredients_section, nutrition_section
    
    def analyze_food_label(self, extracted_text, ingredients_section, nutrition_section):
        """Analyze food label using LangChain"""
        try:
            # Prepare the input
            analysis_input = {
                "extracted_text": extracted_text or "No text extracted",
                "ingredients": ingredients_section or "No ingredients section found",
                "nutrition_info": nutrition_section or "No nutrition information found"
            }
            
            # Run the analysis
            logger.info("Starting LangChain analysis...")
            result = self.analysis_chain.run(**analysis_input)
            
            # Parse the result
            parsed_result = self._parse_analysis_result(result)
            
            logger.info("Analysis completed successfully")
            return parsed_result
            
        except Exception as e:
            logger.error(f"Error in food label analysis: {str(e)}")
            return {
                'raw_response': f"Error: {str(e)}",
                'recommendation': 'ERROR',
                'health_score': 0,
                'analysis': f"Analysis failed: {str(e)}",
                'summary': 'Unable to analyze due to an error'
            }
    
    def _parse_analysis_result(self, result):
        """Parse the LLM analysis result"""
        try:
            # Extract recommendation
            recommendation_match = re.search(r'\*\*RECOMMENDATION:\*\*\s*\[([^\]]+)\]', result, re.IGNORECASE)
            recommendation = recommendation_match.group(1).strip() if recommendation_match else 'MODERATE'
            
            # Extract health score
            score_match = re.search(r'\*\*HEALTH SCORE:\*\*\s*(\d+)', result, re.IGNORECASE)
            health_score = int(score_match.group(1)) if score_match else 5
            
            # Extract analysis section
            analysis_match = re.search(r'\*\*ANALYSIS:\*\*(.*?)\*\*SUMMARY:\*\*', result, re.DOTALL | re.IGNORECASE)
            analysis = analysis_match.group(1).strip() if analysis_match else "No detailed analysis available"
            
            # Extract summary
            summary_match = re.search(r'\*\*SUMMARY:\*\*\s*(.+)', result, re.IGNORECASE)
            summary = summary_match.group(1).strip() if summary_match else "No summary available"
            
            return {
                'raw_response': result,
                'recommendation': recommendation.upper(),
                'health_score': health_score,
                'analysis': analysis,
                'summary': summary
            }
            
        except Exception as e:
            logger.error(f"Error parsing analysis result: {str(e)}")
            return {
                'raw_response': result,
                'recommendation': 'MODERATE',
                'health_score': 5,
                'analysis': result,
                'summary': 'Analysis completed but parsing failed'
            }

# Global service instance
_food_analyzer_service = None

def get_food_analyzer_service():
    """Get or create the food analyzer service instance"""
    global _food_analyzer_service
    if _food_analyzer_service is None:
        _food_analyzer_service = FoodAnalyzerService()
    return _food_analyzer_service