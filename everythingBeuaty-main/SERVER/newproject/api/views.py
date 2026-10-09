import json
import logging
import random

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q
from django.utils.crypto import get_random_string
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Booking, GalleryImage, PendingUser, Salon, Services, UserProfile
from .serializers import BookingSerializer, SalonSerializer


logger = logging.getLogger(__name__)


class GalleryUploadError(Exception):
    pass


def _send_verification_email(email, code):
    try:
        sent_count = send_mail(
            "Verify your account",
            f"Your verification code is: {code}",
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
    except Exception:
        logger.exception("Unable to send verification email to %s", email)
        return False
    return sent_count == 1



class ProtectedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        response = {
            'status': 'Request was permitted'
        }
        return Response(response)


class UserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        details = request.user
        return Response({
            "first_name": details.first_name,
            "email": details.email,
        })


class SalonViewSet(viewsets.ModelViewSet):
    serializer_class = SalonSerializer
    queryset = Salon.objects.all()
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [AllowAny]
        return [permission() for permission in permission_classes]

    def _save_services(self, salon, raw_services):
        if not raw_services:
            return

        try:
            services = json.loads(raw_services)
        except (TypeError, ValueError):
            raise ValueError("services must be valid JSON")

        existing_services = {
            service.id: service for service in salon.services_items.all()
        }
        for service in services:
            service = service or {}
            service_name = service.get('service_name')
            price = service.get('price')
            if service_name and price is not None:
                service_id = service.get('id')
                existing_service = existing_services.pop(service_id, None)
                if existing_service:
                    existing_service.service_name = service_name
                    existing_service.price = price
                    existing_service.save(update_fields=['service_name', 'price'])
                else:
                    Services.objects.create(salon=salon, service_name=service_name, price=price)

        for service in existing_services.values():
            if not Booking.objects.filter(service=service).exists():
                service.delete()

    def _save_gallery(self, salon, files):
        if not files:
            return

        new_images = []
        try:
            for uploaded_file in files:
                if uploaded_file:
                    new_images.append(
                        GalleryImage.objects.create(salon=salon, image=uploaded_file)
                    )
        except Exception as exc:
            logger.exception("Failed to upload gallery images for salon %s", salon.pk)
            for image in new_images:
                try:
                    image.delete()
                except Exception:
                    logger.exception("Failed to clean up partial gallery upload for salon %s", salon.pk)
            raise GalleryUploadError from exc

        if new_images:
            salon.gallery.exclude(pk__in=[image.pk for image in new_images]).delete()

    def create(self, request, *args, **kwargs):
        request_user = request.user
        if not request_user or not request_user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)

        services = request.data.get('services')
        files = request.FILES.getlist('gallery_upload')

        try:
            with transaction.atomic():
                serializer = self.get_serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                salon = serializer.save(owner=request_user)
                self._save_services(salon, services)
                self._save_gallery(salon, files)
                response = self.get_serializer(salon, context={'request': request}).data
        except ValueError as exc:
            return Response({"services": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except GalleryUploadError:
            return Response({
                "detail": "Image upload failed. Check the Cloudinary API key, secret, and cloud name in Render."
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        headers = self.get_success_headers(response)
        return Response(response, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        if instance.owner != request.user:
            return Response({"detail": "You are not allowed to edit this salon."}, status=status.HTTP_403_FORBIDDEN)

        services = request.data.get('services')
        files = request.FILES.getlist('gallery_upload')

        try:
            with transaction.atomic():
                serializer = self.get_serializer(instance, data=request.data, partial=partial)
                serializer.is_valid(raise_exception=True)
                salon = serializer.save(owner=request.user)

                if services is not None:
                    self._save_services(salon, services)

                if files:
                    self._save_gallery(salon, files)

                response = self.get_serializer(salon, context={'request': request}).data
        except ValueError as exc:
            return Response({"services": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except GalleryUploadError:
            return Response({
                "detail": "Image upload failed. Check the Cloudinary API key, secret, and cloud name in Render."
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(response, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        salon = self.get_object()
        if salon.owner != request.user:
            return Response(
                {"detail": "You are not allowed to delete this salon."},
                status=status.HTTP_403_FORBIDDEN,
            )

        self.perform_destroy(salon)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def get_queryset(self):
        owner = self.request.query_params.get('owner')
        if owner:
            return self.queryset.filter(owner__id=owner)
        return self.queryset.all()


class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    queryset = Booking.objects.all()
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Booking.objects.filter(
              Q(salon__owner=user) | Q(customer_email=user.email)
        ).order_by('-date_time')

    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        user = request.user
        booking = self.get_object()
        reason = request.data.get('decline_reason', '').strip()

        if booking.salon.owner != user:
            return Response(
                {"detail": "You are not authorized to decline this booking."},
                status=status.HTTP_403_FORBIDDEN
            )

        if not reason:
            return Response(
                {"error": "Decline reason is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        booking.status = 'declined'
        booking.decline_reason = reason
        booking.save()

        try:
            send_mail(
                subject=f"Booking Declined - {booking.salon.salon_name}",
                message=(
                    f"Dear {booking.customer_name},\n\n"
                    f"Unfortunately, your booking at {booking.salon.salon_name.upper()} for "
                    f"{booking.service.service_name.upper()} has been declined.\n\n"
                    f"Reason: {reason}\n\n"
                    f"Thank you for understanding."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[booking.customer_email],
                fail_silently=True,
            )
        except Exception as e:
            print("Email send error:", e)

        return Response(
            {"message": "Booking declined.", "decline_reason": reason},
            status=status.HTTP_200_OK
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context

    def perform_create(self, serializer):
        serializer.save()

    def update(self, request, *args, **kwargs):
        booking = self.get_object()
        user = request.user
        status_value = request.data.get('status', '').lower()

        if booking.salon.owner == user:
            if status_value in ['approved', 'declined', 'completed', 'incomplete']:
                booking.status = status_value
                booking.save()

                # approval email to customer
                if status_value == 'approved':
                    send_mail(
                        subject="Booking Confirmed",
                        message=(
                            f"Dear {booking.customer_name},\n\n"
                            f"Your booking at {booking.salon.salon_name.upper()} for {booking.service.service_name.upper()} "
                            f"has been approved.\n"
                            f"For further communication, please contact the owner directly at {booking.salon.owner.email}."
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[booking.customer_email],
                        fail_silently=True,
                    )
                    return Response(
                        {"detail": f"Booking {status_value} successfully."},
                        status=status.HTTP_200_OK
                    )

                # completed service email to customer
                elif status_value == 'completed':
                    send_mail(
                        subject="Service Completed",
                        message=(
                            f"Dear {booking.customer_name},\n\n"
                            f"Your service '{booking.service.service_name}' at "
                            f"{booking.salon.salon_name} has been completed.\n\n"
                            "Please rate your experience in the app."
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[booking.customer_email],
                        fail_silently=True,
                    )

                    serializer = self.get_serializer(booking)
                    return Response(serializer.data, status=200)

            else:
                if booking.customer_email == user.email:
                    serializer = self.get_serializer(booking, data=request.data, partial=True)
                    serializer.is_valid(raise_exception=True)

                    send_mail(
                        "Booking Edited",
                        f"{user.get_full_name() or user.username} has updated their booking for {booking.salon.salon_name.upper()}.\n"
                        f"Please review and approve the changes.",
                        settings.DEFAULT_FROM_EMAIL,
                        [booking.salon.owner.email],
                        fail_silently=True,
                    )

                    return Response({"success": True, "status": "edited"})

                return Response(
                    {"detail": "Invalid status for salon owner."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Customer cancelling or editing
        elif booking.customer_email == user.email:

            if status_value == 'cancelled':
                booking.status = 'cancelled'
                booking.save()
                return Response(
                    {"detail": "Booking cancelled successfully."},
                    status=status.HTTP_200_OK
                )

            # Customer edits booking details
            service_name = request.data.get('service_name')
            date_time = request.data.get('date_time')

            if service_name or date_time:
                data = {}
                if service_name:
                    try:
                        service = Services.objects.get(salon=booking.salon, service_name=service_name)
                        data['service'] = service.id  # send the service ID to serializer
                    except Services.DoesNotExist:
                        return Response(
                            {"service_name": "Service not found for this salon."},
                            status=400
                        )
                if date_time:
                    data['date_time'] = date_time

                serializer = self.get_serializer(booking, data=data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save(status='edited')

                return Response(
                    {"detail": "Booking updated and awaiting re-approval."},
                    status=status.HTTP_200_OK
                )

            return Response(
                {"detail": "No valid updates provided."},
                status=status.HTTP_400_BAD_REQUEST
            )
    

        return Response(
            {"detail": "You are not authorized to modify this booking."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    @action(detail=True, methods=['post'])
    def rate(self, request, pk=None):
        booking = self.get_object()
        user = request.user

        if booking.customer_email != user.email:
            return Response({"detail": "You are not authorized to rate this booking."}, status=403)

        if booking.status != 'completed':
            return Response({"detail": "You can only rate completed bookings."}, status=400)

        rating = request.data.get('rating')
        review = request.data.get('review', '')

        if not rating:
            return Response({"detail": "Rating is required."}, status=400)

        booking.rating = rating
        booking.review = review
        booking.save()

        return Response({"success": True, "message": "Thank you for your rating!"}, status=200)


User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    first_name = request.data.get("first_name")
    last_name = request.data.get("last_name")
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response({"success": False, "message": "Email and password required"}, status=400)

    if User.objects.filter(email=email).exists():
        return Response({"success": False, "message": "Email already exists"}, status=400)

    pending = PendingUser.objects.filter(email=email).first()
    if pending:
        pending.verification_code = str(random.randint(100000, 999999))
        pending.save()
        if not _send_verification_email(email, pending.verification_code):
            return Response({
                "success": False,
                "message": "Verification email could not be sent. Please try again later."
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({
            "success": False,
            "message": "Email already exists but is unverified. Verification code resent to your email."
        }, status=400)

    code = str(random.randint(100000, 999999))
    PendingUser.objects.create(
        first_name=first_name,
        last_name=last_name,
        email=email,
        password=password,
        verification_code=code,
    )

    if not _send_verification_email(email, code):
        return Response({
            "success": False,
            "message": "Verification email could not be sent. Please try again later."
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return Response({"success": True, "message": "Verification code sent to your email"})


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_code(request):
    email = request.data.get("email")
    code = request.data.get("code")

    if not email or not code:
        return Response({"success": False, "message": "Email and code are required"}, status=400)

    try:
        pending = PendingUser.objects.get(email=email)
    except PendingUser.DoesNotExist:
        return Response({"success": False, "message": "No pending signup found"}, status=404)

    if pending.verification_code != code:
        return Response({"success": False, "message": "Invalid code"}, status=400)

    user = User.objects.create_user(
        username=email,
        email=email,
        password=pending.password,
        first_name=pending.first_name,
        last_name=pending.last_name,
        is_active=True
    )

    user_profile, created = UserProfile.objects.get_or_create(
        user=user,
        defaults={'is_verified': True}
    )

    if not created:
        user_profile.is_verified = True
        user_profile.save()

    pending.delete()

    return Response({"success": True, "message": "Account verified"})

@api_view(['POST'])
def forgot_password(request):
    email = request.data.get("email")

    if not email:
        return Response({"success": False, "message": "Email is required"}, status=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"success": False, "message": "User with this email does not exist"}, status=404)
    
    profile, created = UserProfile.objects.get_or_create(user=user)
    reset_token = get_random_string(length=32)
    profile.reset_token = reset_token
    profile.save()
    
    reset_link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password/{reset_token}"
    
    try:
        send_mail(
            subject="Password Reset Code",
            message=f"Hi {user.username},\n\nClick the link below to reset your password:\n{reset_link}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception as e:
        print("Email send failed:", e)
        return Response({"success": False, "message": "Failed to send email"}, status=500)

    return Response({"success": True, "message": "Password reset code sent to your email"})
