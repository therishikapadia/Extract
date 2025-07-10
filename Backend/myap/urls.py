from django.urls import path
from . import views

urlpatterns = [
    path('', views.game_list_and_add, name='game_list'),
]