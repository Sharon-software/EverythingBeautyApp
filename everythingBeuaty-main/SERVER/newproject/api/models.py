from django.db import models
from django.contrib.auth.models import User
from django.conf import settings



# Create your models here.
##class Register(models.Model):
   # firstname = models.CharField(max_length=100)
    #lastname = models.CharField(max_length=100)
    #email = models.EmailField(unique=True)
    #password = models.CharField(max_length=100)

    #def __str__(self):
        #return self.firstname
class Salon(models.Model):
    
    salon_name=models.CharField(max_length=150)
    owner=models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    location=models.CharField(max_length=255)
    startT=models.CharField(max_length=100,default="09:00:00")
    endT=models.CharField(max_length=100, default="17:00:00")
    

    def __str__(self):
     return self.salon_name

class GalleryImage(models.Model):
    salon = models.ForeignKey(Salon, related_name='gallery', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='salon_images/')

    def __str__(self):
        return f"Image for {self.salon.salon_name}"


class PendingUser(models.Model):
    first_name = models.CharField(max_length=100,default="")  ### ADDED
    last_name = models.CharField(max_length=100,default="") 
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    verification_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.email

class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    verification_code = models.CharField(max_length=6, blank=True, null=True)
    is_verified = models.BooleanField(default=False)

class Services(models.Model):
    salon = models.ForeignKey(Salon, on_delete=models.CASCADE, related_name='services_items')
    service_name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=8, decimal_places=2)

    def __str__(self):
        return self.service_name

class Booking(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('declined', 'Declined'),
        ('completed', 'Completed'),
        ('incomplete', 'Incomplete'),
        ('cancelled', 'Cancelled'),
    ]


    salon = models.ForeignKey('Salon', on_delete=models.CASCADE)
    service =  models.ForeignKey('Services', on_delete=models.CASCADE)
    date_time = models.DateTimeField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    customer_name = models.CharField(max_length=255)
    customer_email = models.EmailField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    decline_reason = models.TextField(blank=True, null=True)
    rating= models.IntegerField(blank=True, null=True)
    review= models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.customer_name} - {self.salon.salon_name} - {self.status}"
