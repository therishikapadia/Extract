from django.urls import path
from . import views
from .views import SignupView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

app_name = 'analyzer'

urlpatterns = [
    path('', views.index, name='index'),
    path('analyze/', views.analyze_food_label, name='analyze'),
    path('chat/', views.chat_followup, name='chat_followup'),
    path('user-chats/', views.get_user_chats, name='get_user_chats'),
    path('chat-history/<int:chat_id>/', views.get_chat_history, name='get_chat_history'),
    path('signup/', SignupView.as_view(), name='signup'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]