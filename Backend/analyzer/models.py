from django.db import models
from django.utils import timezone
import uuid
from django.contrib.auth.models import User

class FoodAnalysis(models.Model):
    """Model to store food label analysis results"""
    
    RECOMMENDATION_CHOICES = [
        ('EAT', 'Eat'),
        ('AVOID', 'Avoid'),
        ('MODERATE', 'Moderate'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    image = models.ImageField(upload_to='food_labels/', null=True, blank=True)
    extracted_text = models.TextField(blank=True)
    ingredients_text = models.TextField(blank=True)
    nutrition_text = models.TextField(blank=True)
    analysis_result = models.TextField(blank=True)
    recommendation = models.CharField(max_length=10, choices=RECOMMENDATION_CHOICES, blank=True)
    health_score = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Analysis {self.id} - {self.recommendation} ({self.health_score}/10)"

class AnalysisSession(models.Model):
    """Model to track analysis sessions"""
    
    session_id = models.CharField(max_length=100, unique=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    total_analyses = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    last_activity = models.DateTimeField(default=timezone.now)
    
    def __str__(self):
        return f"Session {self.session_id} - {self.total_analyses} analyses"
    

class Chat(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    is_title_auto_generated = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    analysis_id = models.CharField(max_length=100, blank=True, null=True) 

class Message(models.Model):
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=[('user', 'User'), ('llm', 'LLM')])
    content = models.TextField()
    image_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
