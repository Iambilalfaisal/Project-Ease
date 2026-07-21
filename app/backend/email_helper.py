"""
Project Ease — Gmail SMTP email helper.

Configure in .env:
    SMTP_EMAIL        = youraddress@gmail.com
    SMTP_APP_PASSWORD = xxxx xxxx xxxx xxxx   (Google App Password)

Gmail SMTP gives ~500 outbound emails/day for free.
"""

import logging
import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

_FROM_NAME = "Project Ease"
_SMTP_HOST = "smtp.gmail.com"
_SMTP_PORT = 465   # SSL

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body_html: str, body_text: str = "") -> bool:
    """Send an email via Gmail SMTP. Returns True on success, False on failure."""
    smtp_email    = os.getenv("SMTP_EMAIL", "").strip()
    smtp_password = os.getenv("SMTP_APP_PASSWORD", "").strip()
    if not smtp_email or not smtp_password:
        logger.warning(
            "SMTP_EMAIL or SMTP_APP_PASSWORD not set in .env — email skipped."
        )
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{_FROM_NAME} <{smtp_email}>"
        msg["To"]      = to
        if body_text:
            msg.attach(MIMEText(body_text, "plain", "utf-8"))
        msg.attach(MIMEText(body_html, "html", "utf-8"))
        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL(_SMTP_HOST, _SMTP_PORT, context=ctx) as server:
            server.login(smtp_email, smtp_password)
            server.sendmail(smtp_email, to, msg.as_string())
        logger.info("Email sent to %s: %s", to, subject)
        return True
    except Exception as exc:
        logger.error("Email send failed to %s (%s): %s", to, subject, exc)
        return False


# ── Named templates ───────────────────────────────────────────────────────────

_BRAND_STYLE = """
  font-family: 'Segoe UI', Arial, sans-serif;
  max-width: 580px;
  margin: 40px auto;
  color: #1a1a2e;
  line-height: 1.6;
"""

_GOLD = "#b8972e"


def _wrap(body: str) -> str:
    return f"""
<html>
<body style="{_BRAND_STYLE}">
  <div style="border-top: 4px solid {_GOLD}; padding-top: 24px; margin-bottom: 32px;">
    <span style="font-size:1.3rem; font-weight:700; color:{_GOLD};">Project Ease</span>
  </div>
  {body}
  <hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0;" />
  <p style="font-size:0.78rem; color:#999;">
    Questions? Contact us at
    <a href="mailto:support@projectease.ai" style="color:{_GOLD};">support@projectease.ai</a>
  </p>
</body>
</html>
"""


def send_registration_pending(to: str, firm_name: str) -> bool:
    """Confirmation email sent immediately after self-service signup."""
    subject = "Your Project Ease Registration is Under Review"
    html = _wrap(f"""
      <h2 style="color:{_GOLD}; margin-top:0;">Welcome to Project Ease</h2>
      <p>Thank you for registering <strong>{firm_name}</strong>.</p>
      <p>Your registration is currently under review. Our team will verify your
         payment and activate your account within <strong>24 hours</strong>.</p>
      <p>Once approved you will receive another email and can sign in immediately.</p>
    """)
    return send_email(to, subject, html)


def send_registration_approved(to: str, firm_name: str) -> bool:
    """Approval email sent when admin clicks Approve in the admin panel."""
    subject = f"Your Project Ease Account for {firm_name} is Active"
    html = _wrap(f"""
      <h2 style="color:{_GOLD}; margin-top:0;">Your Account is Ready</h2>
      <p>Great news — <strong>{firm_name}</strong>'s account has been
         approved and is now active.</p>
      <p>You can sign in at any time by visiting
         <a href="https://projectease.ai" style="color:{_GOLD};">projectease.ai</a>
         and clicking <strong>Sign In</strong>.</p>
      <p>Start by uploading your firm's documents and inviting your team.</p>
    """)
    return send_email(to, subject, html)


def send_team_invite(to: str, firm_name: str, temp_password: str) -> bool:
    """Invitation email sent when an org owner adds a new team member."""
    subject = f"You have been invited to {firm_name} on Project Ease"
    html = _wrap(f"""
      <h2 style="color:{_GOLD}; margin-top:0;">You've Been Invited</h2>
      <p>You have been added to <strong>{firm_name}</strong>'s workspace on
         Project Ease.</p>
      <p>Sign in at
         <a href="https://projectease.ai" style="color:{_GOLD};">projectease.ai</a>
         using your email address and the temporary password below:</p>
      <div style="background:#f8f4e8; border:1px solid {_GOLD}55; border-radius:8px;
                  padding:12px 20px; font-size:1.2rem; font-weight:700;
                  letter-spacing:0.05em; margin:20px 0; color:{_GOLD};">
        {temp_password}
      </div>
      <p>You will be asked to set a new password on your first sign-in.</p>
    """)
    return send_email(to, subject, html)
