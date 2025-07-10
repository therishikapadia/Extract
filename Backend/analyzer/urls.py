from django.urls import path
from . import views

app_name = 'analyzer'

urlpatterns = [
    path('', views.index, name='index'),
    path('analyze/', views.analyze_food_label, name='analyze'),
    path('health/', views.health_check, name='health'),
    
]