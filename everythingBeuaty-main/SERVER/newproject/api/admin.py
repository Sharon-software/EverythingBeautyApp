from django.contrib import admin
from .models import Salon, GalleryImage, Services


class GalleryImageInline(admin.TabularInline):
    model = GalleryImage
    extra = 1
    fields = ("image",)


class ServiceInline(admin.TabularInline):   
    model = Services
    extra = 1
    fields = ("name", "price")


class SalonAdmin(admin.ModelAdmin):
    inlines = [GalleryImageInline, ServiceInline] 
    list_display = ("salon_name", "owner", "location") 


admin.site.register(Salon, SalonAdmin)


@admin.register(Services)
class ServicesAdmin(admin.ModelAdmin):
    list_display = ("service_name", "salon", "price")

    class Meta:  
        verbose_name = "Service"
        verbose_name_plural = "Services"
from .models import UserProfile

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'verification_code', 'is_verified')
