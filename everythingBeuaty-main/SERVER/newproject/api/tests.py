from unittest.mock import patch

from django.core import mail
from django.test import TestCase, override_settings

from .models import PendingUser


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
