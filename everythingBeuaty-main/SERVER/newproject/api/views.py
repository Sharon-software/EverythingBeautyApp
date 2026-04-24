from rest_framework import generics
from rest_framework.permissions import AllowAny
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets
from rest_framework.parsers import MultiPartParser, FormParser
import random
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes, action
from .models import Salon, Booking, Services, UserProfile, PendingUser
from .serializers import SalonSerializer, BookingSerializer
from django.conf import settings
from rest_framework import status
from django.utils.crypto import get_random_string
from django.db.models import Q



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
        if self.action in ['create']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [AllowAny]
        return [permission() for permission in permission_classes]

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

        send_mail(
            "Verify your account",
            f"Your verification code is: {pending.verification_code}",
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
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

    send_mail(
        "Verify your account",
        f"Your verification code is: {code}",
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=True,
    )

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
    
    reset_link = f"http://localhost:3000/reset-password/{reset_token}"
    
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
