from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.
class Addgame(models.Model):
    game_name = models.CharField(max_length=100)
    game_type = models.CharField(max_length=50)
    review=models.IntegerField()
    def __str__(self):
        return self.game_name

class User(AbstractUser):
    # Add extra fields here if needed
    pass