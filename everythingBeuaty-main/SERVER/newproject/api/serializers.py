from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Salon, GalleryImage, Services, Booking

User = get_user_model()


class ServicesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Services
        fields = ['id', 'service_name', 'price']

class SalonSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.email')
    services_list = ServicesSerializer(source='services_items', many=True, read_only=True)
    gallery = serializers.SerializerMethodField()
    
    class Meta:
        model = Salon
        fields = ['id', 'salon_name', 'owner', 'location', 'startT', 'endT', 'gallery', 'services_list']

    def get_gallery(self, obj):
        request = self.context.get('request')
        return [request.build_absolute_uri(img.image.url) for img in obj.gallery.all()]

class BookingSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    salon_id = serializers.IntegerField(write_only=True)
    service_id = serializers.IntegerField(write_only=True)
    salon_name = serializers.CharField(source='salon.salon_name', read_only=True)
    service_name_display = serializers.CharField(source='service.service_name', read_only=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    customer_name = serializers.CharField(read_only=True)
    customer_email = serializers.CharField(read_only=True)
    status = serializers.CharField(required=False)
    decline_reason = serializers.CharField(allow_blank=True, allow_null=True, required=False) 
    rating= serializers.IntegerField(required=False, allow_null=True)
    review= serializers.CharField(required=False, allow_null=True)
    
    class Meta:
        model = Booking
        fields = [
            'id', 'salon_id', 'salon_name', 'service_id', 'service_name_display',
            'date_time', 'price', 'customer_name', 'customer_email', 'status','decline_reason','rating','review'
        ]
        read_only_fields = ['price', 'customer_name', 'customer_email']
    
    def validate(self, attrs):
        if attrs.get('status') == 'declined' and not attrs.get('decline_reason'):
            raise serializers.ValidationError({
                "decline_reason": "Please provide a reason when declining a booking."
            })
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user 
     
        if not user or not user.is_authenticated:
            raise serializers.ValidationError("Authentication required.")

        salon_id = validated_data.pop('salon_id',None)
        service_id = validated_data.pop('service_id',None)
        
        try:
            salon = Salon.objects.get(id=salon_id)
        except Salon.DoesNotExist:
            raise serializers.ValidationError({'salon_id': 'Salon not found.'})

        try:
            service = Services.objects.get(id=service_id, salon=salon)
        except Services.DoesNotExist:
            raise serializers.ValidationError({'service_id': 'Service not found for this salon.'})

        validated_data['salon'] = salon
        validated_data['service'] = service
        validated_data['price'] = service.price
        validated_data['customer_name'] = user.get_full_name() or user.username
        validated_data['customer_email'] = user.email
        validated_data['status'] = 'pending'
        

        return Booking.objects.create(**validated_data)
