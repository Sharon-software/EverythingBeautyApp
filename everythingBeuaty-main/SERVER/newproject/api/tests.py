import json
import tempfile
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import PendingUser, Salon


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class SignupEmailTests(TestCase):
	def signup(self):
		return self.client.post("/api/v1/signup/", {
			"first_name": "Test",
			"last_name": "User",
			"email": "test@example.com",
			"password": "a-secure-test-password",
		}, content_type="application/json")

	def test_signup_sends_verification_code(self):
		response = self.signup()

		self.assertEqual(response.status_code, 200)
		self.assertEqual(len(mail.outbox), 1)
		self.assertEqual(mail.outbox[0].to, ["test@example.com"])
		pending = PendingUser.objects.get(email="test@example.com")
		self.assertIn(pending.verification_code, mail.outbox[0].body)

	@patch("api.views.send_mail", side_effect=OSError("SMTP unavailable"))
	def test_signup_reports_mail_delivery_failure(self, _send_mail):
		response = self.signup()

		self.assertEqual(response.status_code, 503)
		self.assertFalse(response.data["success"])
		self.assertTrue(PendingUser.objects.filter(email="test@example.com").exists())


class SalonGalleryTests(TestCase):
	def setUp(self):
		self.media_directory = tempfile.TemporaryDirectory()
		self.addCleanup(self.media_directory.cleanup)
		self.media_settings = override_settings(MEDIA_ROOT=self.media_directory.name)
		self.media_settings.enable()
		self.addCleanup(self.media_settings.disable)
		self.client = APIClient()
		self.user = get_user_model().objects.create_user(
			username="owner@example.com",
			email="owner@example.com",
			password="secret123",
			first_name="Owner",
		)
		self.client.force_authenticate(user=self.user)

	def test_salons_store_gallery_uploads_and_services(self):
		image = SimpleUploadedFile(
			"salon.jpg",
			b"fake-image-data",
			content_type="image/jpeg",
		)
		payload = {
			"salon_name": "Beauty House",
			"location": "Cape Town",
			"startT": "09:00",
			"endT": "17:00",
			"services": json.dumps([
				{"service_name": "Haircut", "price": "250.00"},
			]),
			"gallery_upload": [image],
		}

		response = self.client.post("/api/v1/salons/", payload, format="multipart")

		self.assertEqual(response.status_code, 201, response.data)
		salon = Salon.objects.get(salon_name="Beauty House")
		self.assertEqual(salon.gallery.count(), 1)
		self.assertTrue(salon.services_items.filter(service_name="Haircut").exists())
		self.assertEqual(response.data["owner_name"], "Owner")
		self.assertEqual(response.data["services_list"][0]["service_name"], "Haircut")
		self.assertIn("/media/", response.data["gallery"][0])
		gallery_image = salon.gallery.get().image
		with override_settings(DEBUG=False):
			image_response = self.client.get(f"/media/{gallery_image.name}")
		self.assertEqual(image_response.status_code, 200)
		try:
			self.assertEqual(b"".join(image_response.streaming_content), b"fake-image-data")
		finally:
			image_response.close()

		service = salon.services_items.get(service_name="Haircut")
		update_response = self.client.patch(
			f"/api/v1/salons/{salon.id}/",
			{
				"salon_name": "Beauty House Updated",
				"location": "Johannesburg",
				"services": json.dumps([
					{"id": service.id, "service_name": "Haircut and Style", "price": "300.00"},
				]),
			},
			format="multipart",
		)

		self.assertEqual(update_response.status_code, 200, update_response.data)
		salon.refresh_from_db()
		service.refresh_from_db()
		self.assertEqual(salon.salon_name, "Beauty House Updated")
		self.assertEqual(salon.location, "Johannesburg")
		self.assertEqual(salon.gallery.count(), 1)
		self.assertEqual(service.service_name, "Haircut and Style")
		self.assertEqual(str(service.price), "300.00")

	def test_salon_owner_can_delete_salon(self):
		salon = Salon.objects.create(
			salon_name="Beauty House",
			owner=self.user,
			location="22 Main Street, Cape Town",
		)

		response = self.client.delete(f"/api/v1/salons/{salon.id}/")

		self.assertEqual(response.status_code, 204)
		self.assertFalse(Salon.objects.filter(id=salon.id).exists())

	def test_other_user_cannot_delete_salon(self):
		salon = Salon.objects.create(
			salon_name="Beauty House",
			owner=self.user,
			location="22 Main Street, Cape Town",
		)
		other_user = get_user_model().objects.create_user(
			username="other@example.com",
			email="other@example.com",
			password="secret123",
		)
		self.client.force_authenticate(user=other_user)

		response = self.client.delete(f"/api/v1/salons/{salon.id}/")

		self.assertEqual(response.status_code, 403)
		self.assertTrue(Salon.objects.filter(id=salon.id).exists())

	@patch("api.views.GalleryImage.objects.create", side_effect=OSError("Cloudinary upload rejected"))
	def test_failed_gallery_upload_rolls_back_salon_creation(self, _create_image):
		image = SimpleUploadedFile("salon.jpg", b"fake-image-data", content_type="image/jpeg")
		response = self.client.post(
			"/api/v1/salons/",
			{
				"salon_name": "Incomplete Salon",
				"location": "Cape Town",
				"services": json.dumps([
					{"service_name": "Haircut", "price": "250.00"},
				]),
				"gallery_upload": [image],
			},
			format="multipart",
		)

		self.assertEqual(response.status_code, 503)
		self.assertIn("Cloudinary", response.data["detail"])
		self.assertEqual(Salon.objects.count(), 0)
