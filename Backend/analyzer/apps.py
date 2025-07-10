from django.apps import AppConfig

class AnalyzerConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'analyzer'
    verbose_name = 'Food Label Analyzer'
    
    def ready(self):
        """Initialize the app when Django starts"""
        # Import services to ensure LangChain is initialized
        try:
            from .services import get_food_analyzer_service
            # Test the service initialization
            service = get_food_analyzer_service()
            print("✅ Food Analyzer Service initialized successfully")
        except Exception as e:
            print(f"⚠️  Warning: Could not initialize Food Analyzer Service: {e}")
            print("Make sure Ollama is running and a model is available")