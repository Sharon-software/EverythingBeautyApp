import os
import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from newproject.settings import *
from newproject.settings import BASE_DIR

render_hostname = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
frontend_host = os.environ.get("FRONTEND_HOST")

ALLOWED_HOSTS = [render_hostname] if render_hostname else []
CSRF_TRUSTED_ORIGINS = [f"https://{frontend_host}"] if frontend_host else []
CORS_ALLOWED_ORIGINS = [f"https://{frontend_host}"] if frontend_host else []
FRONTEND_URL = f"https://{frontend_host}" if frontend_host else "http://localhost:3000"
DEBUG = False
SECRET_KEY = os.environ["SECRET_KEY"]
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
if not os.environ.get("CLOUDINARY_URL"):
    raise ImproperlyConfigured("CLOUDINARY_URL must be configured for production image storage.")

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    
]

#Cors_allowed_origins

STORAGES = {
    "default": {
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600,
        ssl_require=True,
    )
}

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

EMAIL_BACKEND = "anymail.backends.brevo.EmailBackend"

