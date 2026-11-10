"""SMTP email delivery helper for SpotShare (stdlib smtplib, no extra dependencies).

Reads configuration from process environment variables first, falling back to
`backend/.env` so local configuration changes take effect immediately.
"""
from __future__ import annotations

import html
import os
import smtplib
import ssl
from email.message import EmailMessage
from pathlib import Path
from typing import Dict, Optional

from database import ServiceError

ENV_PATH = Path(__file__).resolve().parent / ".env"


def _read_dotenv(path: Optional[Path] = None) -> Dict[str, str]:
    target = ENV_PATH if path is None else path
    values: Dict[str, str] = {}
    if not target.is_file():
        return values
    try:
        for raw_line in target.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip()
            if len(val) >= 2 and val[0] == val[-1] and val[0] in ("'", '"'):
                val = val[1:-1]
            if key:
                values[key] = val
    except OSError:
        return {}
    return values


def _env(key: str, dotenv_values: Dict[str, str], default: str = "") -> str:
    val = os.getenv(key)
    if val is not None and val != "":
        return val
    return dotenv_values.get(key, default)


def get_smtp_config() -> Dict[str, object]:
    dotenv_values = _read_dotenv()
    host = _env("SPOTSHARE_SMTP_HOST", dotenv_values, "smtp.gmail.com").strip() or "smtp.gmail.com"
    port_raw = _env("SPOTSHARE_SMTP_PORT", dotenv_values, "587").strip()
    try:
        port = int(port_raw)
    except ValueError:
        port = 587
    user = _env("SPOTSHARE_SMTP_USER", dotenv_values, "").strip()
    # Gmail App Passwords are often copied with spaces every 4 characters
    password = _env("SPOTSHARE_SMTP_PASSWORD", dotenv_values, "").replace(" ", "").strip()
    sender = _env("SPOTSHARE_SMTP_FROM", dotenv_values, "").strip() or user
    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "sender": sender,
    }


def send_reset_code_email(*, to_email: str, recipient_name: str, code: str, role: str) -> None:
    cfg = get_smtp_config()
    user = str(cfg["user"])
    password = str(cfg["password"])
    host = str(cfg["host"])
    port = int(cfg["port"])
    sender = str(cfg["sender"])

    if not user or not password:
        raise ServiceError(
            503,
            "email_not_configured",
            "Email service is not configured yet. Add SPOTSHARE_SMTP_USER and a Gmail App Password "
            "as SPOTSHARE_SMTP_PASSWORD in backend/.env to send verification codes to Gmail.",
        )

    role_label = "Host Hub" if role == "host" else "Customer"
    display_name = recipient_name.strip() or "User"
    safe_display_name = html.escape(display_name)

    msg = EmailMessage()
    msg["Subject"] = f"SpotShare Password Reset Code: {code}"
    msg["From"] = sender
    msg["To"] = to_email
    msg.set_content(
        f"Hi {display_name},\n\n"
        f"Your SpotShare ({role_label}) password reset verification code is:\n\n"
        f"    {code}\n\n"
        f"This code expires in 10 minutes. If you did not request a password reset, you can ignore this email.\n\n"
        f"— SpotShare Security"
    )
    msg.add_alternative(
        f"""\
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #0f172a;">
          <h2 style="margin: 0 0 8px; color: #2563eb;">SpotShare Password Reset</h2>
          <p style="margin: 0 0 16px; color: #475569; font-size: 14px;">
            Hi {safe_display_name}, use the 6-digit verification code below to reset your SpotShare ({role_label}) password:
          </p>
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; text-align: center; font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #0f172a; margin-bottom: 16px;">
            {code}
          </div>
          <p style="margin: 0; color: #64748b; font-size: 12px;">
            This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
          </p>
        </div>
        """,
        subtype="html",
    )

    context = ssl.create_default_context()
    try:
        if port == 465:
            with smtplib.SMTP_SSL(host, port, context=context, timeout=15) as server:
                server.login(user, password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=15) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(user, password)
                server.send_message(msg)
    except smtplib.SMTPAuthenticationError as exc:
        raise ServiceError(
            502,
            "email_auth_failed",
            "Gmail SMTP authentication failed. Verify SPOTSHARE_SMTP_USER and ensure SPOTSHARE_SMTP_PASSWORD "
            "in backend/.env is a valid 16-character Gmail App Password.",
        ) from exc
    except (smtplib.SMTPException, OSError) as exc:
        raise ServiceError(
            502,
            "email_send_failed",
            f"Could not send verification email to {to_email}: {exc}",
        ) from exc
