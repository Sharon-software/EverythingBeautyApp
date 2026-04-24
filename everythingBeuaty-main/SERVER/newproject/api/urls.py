from django.urls import path
from .views import ProtectedView, BookingViewSet
from .views import UserView, SalonViewSet,signup,verify_code
from rest_framework_simplejwt.views import TokenObtainPairView,TokenRefreshView
from rest_framework.routers import DefaultRouter
from .views import forgot_password

router = DefaultRouter()
router.register(r'salons', SalonViewSet, basename='salon')
router.register(r'bookings', BookingViewSet, basename='booking')

urlpatterns = [
    #path('register/', RegisterView.as_view(), name='register'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('protected-view/', ProtectedView.as_view(), name='protected'),
    path('details/', UserView.as_view(), name='details'),
    path('signup/',signup,name='signup'),
    path('verify/', verify_code, name='verify'),
    path('forgot-password/', forgot_password, name='forgot-password'),
] + router.urls

