"""
Project Ease — Twilio WhatsApp helper.

Configure in .env:
    TWILIO_ACCOUNT_SID = ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    TWILIO_AUTH_TOKEN  = your_auth_token
    TWILIO_WA_FROM     = +14155238886   (Twilio sandbox number, or your
                                          approved WhatsApp Business number —
                                          digits only, no "whatsapp:" prefix)

Sandbox vs. production, read before wiring this into anything user-facing:
  - On the Twilio *sandbox* (the default until you apply for a WhatsApp
    Business Profile), freeform text only reaches numbers that have joined
    the sandbox, and only within a 24h window after they last messaged you.
  - Meta requires pre-approved *message templates* for anything you send
    outside that 24h window or to a number that hasn't messaged first —
    that covers every "business-initiated" message this app sends: the 8am
    cause-list digest, the auto client notification after a hearing, and
    the bulk court-holiday blast. `send_whatsapp_text` below sends freeform
    text (fine for sandbox testing); swap in `send_whatsapp_template` once
    real templates are approved for production client-facing sends.
"""

import logging
import os
import re

import httpx

logger = logging.getLogger(__name__)

_TWILIO_API_BASE = "https://api.twilio.com/2010-04-01"


def _twilio_credentials() -> tuple[str, str, str] | None:
    sid   = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    from_ = os.getenv("TWILIO_WA_FROM", "").strip()
    if not sid or not token or not from_:
        return None
    return sid, token, from_


def normalize_pk_number(raw: str) -> str | None:
    """Normalize a Pakistani phone number to E.164 (+92XXXXXXXXXX).

    Accepts common local formats: 03001234567, 3001234567, 0092..., 92...,
    +92..., with spaces/dashes. Returns None if it doesn't look like a
    plausible Pakistani mobile number.
    """
    if not raw:
        return None
    digits = re.sub(r"[^\d]", "", raw)
    if digits.startswith("0092"):
        digits = digits[2:]
    if digits.startswith("92") and len(digits) == 12:
        pass
    elif digits.startswith("0") and len(digits) == 11:
        digits = "92" + digits[1:]
    elif len(digits) == 10 and digits.startswith("3"):
        digits = "92" + digits
    else:
        return None
    if len(digits) != 12 or not digits.startswith("923"):
        return None
    return "+" + digits


def send_whatsapp_text(to_number: str, message: str) -> dict:
    """Send a freeform WhatsApp text via Twilio. Sync — call via
    asyncio.to_thread from async code (matches existing call sites in app.py).

    Returns {"sent": bool, "sid": str|None, "error": str|None}.
    """
    creds = _twilio_credentials()
    if not creds:
        logger.warning("Twilio credentials not set in .env — WhatsApp send skipped.")
        return {"sent": False, "sid": None, "error": "twilio_not_configured"}
    sid, token, from_number = creds

    to = to_number if to_number.startswith("whatsapp:") else f"whatsapp:{to_number}"
    frm = from_number if from_number.startswith("whatsapp:") else f"whatsapp:{from_number}"

    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                f"{_TWILIO_API_BASE}/Accounts/{sid}/Messages.json",
                auth=(sid, token),
                data={"From": frm, "To": to, "Body": message},
            )
        if resp.status_code >= 400:
            logger.error("Twilio WhatsApp send failed (%s) to %s: %s",
                         resp.status_code, to_number, resp.text[:300])
            return {"sent": False, "sid": None, "error": f"http_{resp.status_code}"}
        body = resp.json()
        logger.info("WhatsApp sent to %s (sid=%s)", to_number, body.get("sid"))
        return {"sent": True, "sid": body.get("sid"), "error": None}
    except Exception as exc:
        logger.error("Twilio WhatsApp send exception to %s: %s", to_number, exc)
        return {"sent": False, "sid": None, "error": str(exc)}


def send_whatsapp_template(to_number: str, content_sid: str, variables: dict) -> dict:
    """Send a Meta-approved WhatsApp template via Twilio Content API.

    Not usable until you've submitted templates for approval (see module
    docstring) and have real Content SIDs — kept here so switching from
    freeform to templated sends later is a config change, not a rewrite.
    """
    creds = _twilio_credentials()
    if not creds:
        logger.warning("Twilio credentials not set in .env — WhatsApp send skipped.")
        return {"sent": False, "sid": None, "error": "twilio_not_configured"}
    sid, token, from_number = creds

    to = to_number if to_number.startswith("whatsapp:") else f"whatsapp:{to_number}"
    frm = from_number if from_number.startswith("whatsapp:") else f"whatsapp:{from_number}"

    try:
        import json as _json
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                f"{_TWILIO_API_BASE}/Accounts/{sid}/Messages.json",
                auth=(sid, token),
                data={
                    "From": frm,
                    "To": to,
                    "ContentSid": content_sid,
                    "ContentVariables": _json.dumps(variables),
                },
            )
        if resp.status_code >= 400:
            logger.error("Twilio WhatsApp template send failed (%s) to %s: %s",
                         resp.status_code, to_number, resp.text[:300])
            return {"sent": False, "sid": None, "error": f"http_{resp.status_code}"}
        body = resp.json()
        return {"sent": True, "sid": body.get("sid"), "error": None}
    except Exception as exc:
        logger.error("Twilio WhatsApp template send exception to %s: %s", to_number, exc)
        return {"sent": False, "sid": None, "error": str(exc)}
