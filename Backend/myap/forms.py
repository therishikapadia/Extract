from django import forms
from .models import Addgame

class GameForm(forms.ModelForm):
    class Meta:
        model = Addgame
        fields = ['game_name', 'game_type', 'review']
