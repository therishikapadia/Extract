from django.shortcuts import render, redirect
from .models import Addgame
from .forms import GameForm

def game_list_and_add(request):
    if request.method == 'POST':
        form = GameForm(request.POST,request.FILES)
        if form.is_valid():
            form.save()
            return redirect('game_list')  # Redirect to avoid resubmission
    else:
        form = GameForm()

    
    return render(request, 'addgame.html', { 'form': form})