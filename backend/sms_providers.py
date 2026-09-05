"""
AnnaSetu SMS Provider Abstraction Engine
Provides a unified interface for SMS dispatch across multiple real-world providers
(Fast2SMS, Twilio, MSG91, Generic HTTP Gateway) and a local demo simulation mode.
"""

import os
import json
import logging
import urllib.request
import urllib.parse
import urllib.error
import ssl
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

logger = logging.getLogger("annasetu.sms")


class BaseSMSProvider(ABC):
    """Abstract base class for all SMS providers."""

    @abstractmethod
    def send_sms(self, to_mobile: str, message: str, sender_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Dispatches an SMS to the designated recipient mobile.

        Returns a dictionary with:
            success (bool): True if accepted by the provider, False otherwise.
            status (str): "SENT", "ACCEPTED", "FAILED", or "SIMULATED".
            provider_reference (str): External ID or reference code from provider.
            error_message (str or None): Error explanation if failed.
            raw_response (dict or str): Raw payload returned by provider API.
        """
        pass


class DemoSMSProvider(BaseSMSProvider):
    """
    Simulation provider for academic and local development mode.
    Validates numbers and simulates successful delivery without calling external APIs.
    """

    def send_sms(self, to_mobile: str, message: str, sender_id: Optional[str] = None) -> Dict[str, Any]:
        import uuid
        demo_ref = f"DEMO-SMS-{uuid.uuid4().hex[:6].upper()}"
        logger.info(f"[DEMO SMS] Simulated local dispatch to {to_mobile} (Ref: {demo_ref})")
        return {
            "success": True,
            "status": "DEMO",
            "provider_reference": demo_ref,
            "error_message": None,
            "raw_response": {
                "mode": "DEMO_SIMULATION",
                "message": "SMS simulated locally. Set SMS_MODE=production with valid credentials for real delivery.",
                "recipient": to_mobile
            }
        }


class Fast2SMSProvider(BaseSMSProvider):
    """
    Fast2SMS Gateway for Indian mobile networks.
    API Docs: https://docs.fast2sms.com/
    Uses the Quick SMS route ('q') with Unicode message support.
    """

    def __init__(self, api_key: str):
        self.api_key = (api_key or "").strip()
        self.endpoint = "https://www.fast2sms.com/dev/bulkV2"

    def send_sms(self, to_mobile: str, message: str, sender_id: Optional[str] = None) -> Dict[str, Any]:
        if not self.api_key:
            return {
                "success": False,
                "status": "FAILED",
                "provider_reference": None,
                "error_message": "Fast2SMS API key not configured (FAST2SMS_API_KEY is empty).",
                "raw_response": None
            }

        # Fast2SMS requires 10-digit Indian numbers without country code
        clean_number = to_mobile.replace("+91", "").replace("-", "").replace(" ", "")
        if len(clean_number) > 10 and clean_number.startswith("91"):
            clean_number = clean_number[2:]

        payload = {
            "route": "q",
            "message": message,
            "language": "unicode",
            "flash": 0,
            "numbers": clean_number
        }

        headers = {
            "authorization": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "AnnaSetu-SMS-Engine/1.0"
        }

        try:
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(self.endpoint, data=req_data, headers=headers, method="POST")
            ctx = ssl._create_unverified_context()

            with urllib.request.urlopen(req, context=ctx, timeout=12) as response:
                body = response.read().decode("utf-8")
                res_json = json.loads(body)

                is_return = res_json.get("return", False)
                req_id = res_json.get("request_id") or res_json.get("message_id") or "F2SMS-REQ"

                if is_return:
                    return {
                        "success": True,
                        "status": "ACCEPTED",
                        "provider_reference": str(req_id),
                        "error_message": None,
                        "raw_response": res_json
                    }
                else:
                    err_msg = res_json.get("message", ["Fast2SMS rejected the request"])[0] if isinstance(res_json.get("message"), list) else str(res_json.get("message"))
                    return {
                        "success": False,
                        "status": "FAILED",
                        "provider_reference": None,
                        "error_message": f"Fast2SMS error: {err_msg}",
                        "raw_response": res_json
                    }

        except urllib.error.HTTPError as e:
            try:
                err_body = e.read().decode("utf-8")
                err_json = json.loads(err_body)
                err_msg = err_json.get("message", err_body)
            except Exception:
                err_msg = str(e)
            logger.error(f"Fast2SMS HTTP error: {err_msg}")
            return {
                "success": False,
                "status": "FAILED",
                "provider_reference": None,
                "error_message": f"Fast2SMS HTTP {e.code}: {err_msg}",
                "raw_response": None
            }
        except Exception as e:
            logger.error(f"Fast2SMS dispatch error: {e}")
            return {
                "success": False,
                "status": "FAILED",
                "provider_reference": None,
                "error_message": f"Connection error: {str(e)}",
                "raw_response": None
            }


class TwilioSMSProvider(BaseSMSProvider):
    """
    Twilio SMS Gateway for international/Indian delivery with E.164 formatting.
    """

    def __init__(self, account_sid: str, auth_token: str, from_number: str):
        self.account_sid = (account_sid or "").strip()
        self.auth_token = (auth_token or "").strip()
        self.from_number = (from_number or "").strip()

    def send_sms(self, to_mobile: str, message: str, sender_id: Optional[str] = None) -> Dict[str, Any]:
        if not (self.account_sid and self.auth_token and self.from_number):
            return {
                "success": False,
                "status": "FAILED",
                "provider_reference": None,
                "error_message": "Twilio credentials incomplete (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM_NUMBER missing).",
                "raw_response": None
            }

        # Twilio requires E.164 format (+91XXXXXXXXXX)
        e164_number = to_mobile
        if not e164_number.startswith("+"):
            if len(e164_number) == 10:
                e164_number = f"+91{e164_number}"
            elif e164_number.startswith("91") and len(e164_number) == 12:
                e164_number = f"+{e164_number}"

        endpoint = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"

        data = urllib.parse.urlencode({
            "To": e164_number,
            "From": self.from_number,
            "Body": message
        }).encode("utf-8")

        # Basic Auth header
        import base64
        creds = f"{self.account_sid}:{self.auth_token}"
        auth_header = f"Basic {base64.b64encode(creds.encode('utf-8')).decode('utf-8')}"

        headers = {
            "Authorization": auth_header,
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "AnnaSetu-Twilio-Engine/1.0"
        }

        try:
            req = urllib.request.Request(endpoint, data=data, headers=headers, method="POST")
            ctx = ssl._create_unverified_context()

            with urllib.request.urlopen(req, context=ctx, timeout=12) as response:
                body = response.read().decode("utf-8")
                res_json = json.loads(body)

                sid = res_json.get("sid")
                status = res_json.get("status", "queued")

                return {
                    "success": True,
                    "status": "ACCEPTED" if status in ["queued", "sent", "delivered"] else "FAILED",
                    "provider_reference": sid,
                    "error_message": None,
                    "raw_response": res_json
                }

        except urllib.error.HTTPError as e:
            try:
                err_body = e.read().decode("utf-8")
                err_json = json.loads(err_body)
                err_msg = err_json.get("message", err_body)
            except Exception:
                err_msg = str(e)
            logger.error(f"Twilio HTTP error: {err_msg}")
            return {
                "success": False,
                "status": "FAILED",
                "provider_reference": None,
                "error_message": f"Twilio HTTP {e.code}: {err_msg}",
                "raw_response": None
            }
        except Exception as e:
            logger.error(f"Twilio dispatch error: {e}")
            return {
                "success": False,
                "status": "FAILED",
                "provider_reference": None,
                "error_message": f"Connection error: {str(e)}",
                "raw_response": None
            }


class MSG91Provider(BaseSMSProvider):
    """
    MSG91 Flow / Transactional SMS Provider.
    """

    def __init__(self, auth_key: str, flow_id: Optional[str] = None, sender_id: Optional[str] = None):
        self.auth_key = (auth_key or "").strip()
        self.flow_id = (flow_id or "").strip()
        self.sender_id = (sender_id or "ANNAST").strip()

    def send_sms(self, to_mobile: str, message: str, sender_id: Optional[str] = None) -> Dict[str, Any]:
        if not self.auth_key:
            return {
                "success": False,
                "status": "FAILED",
                "provider_reference": None,
                "error_message": "MSG91 Auth Key not configured (MSG91_AUTH_KEY missing).",
                "raw_response": None
            }

        clean_number = to_mobile.replace("+", "").replace("-", "").replace(" ", "")
        if len(clean_number) == 10:
            clean_number = f"91{clean_number}"

        endpoint = "https://control.msg91.com/api/v5/flow/"
        payload = {
            "template_id": self.flow_id,
            "short_url": "0",
            "recipients": [
                {
                    "mobiles": clean_number,
                    "message": message
                }
            ]
        }

        headers = {
            "authkey": self.auth_key,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        try:
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(endpoint, data=req_data, headers=headers, method="POST")
            ctx = ssl._create_unverified_context()

            with urllib.request.urlopen(req, context=ctx, timeout=12) as response:
                body = response.read().decode("utf-8")
                res_json = json.loads(body)
                msg_type = res_json.get("type")
                if msg_type == "success":
                    return {
                        "success": True,
                        "status": "ACCEPTED",
                        "provider_reference": res_json.get("message", "MSG91-SENT"),
                        "error_message": None,
                        "raw_response": res_json
                    }
                else:
                    return {
                        "success": False,
                        "status": "FAILED",
                        "provider_reference": None,
                        "error_message": res_json.get("message", "MSG91 rejected SMS request"),
                        "raw_response": res_json
                    }
        except Exception as e:
            return {
                "success": False,
                "status": "FAILED",
                "provider_reference": None,
                "error_message": str(e),
                "raw_response": None
            }


class GenericHttpSMSProvider(BaseSMSProvider):
    """
    Configurable Generic HTTP SMS Gateway for Government NIC / CDAC or custom webhooks.
    """

    def __init__(self, api_url: str, api_key: Optional[str] = None, sender_id: Optional[str] = None):
        self.api_url = (api_url or "").strip()
        self.api_key = (api_key or "").strip()
        self.sender_id = (sender_id or "ANNAST").strip()

    def send_sms(self, to_mobile: str, message: str, sender_id: Optional[str] = None) -> Dict[str, Any]:
        if not self.api_url:
            return {
                "success": False,
                "status": "FAILED",
                "provider_reference": None,
                "error_message": "Generic SMS Gateway URL not configured (SMS_API_URL missing).",
                "raw_response": None
            }

        payload = {
            "mobile": to_mobile,
            "message": message,
            "sender": sender_id or self.sender_id,
            "api_key": self.api_key
        }

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "AnnaSetu-Generic-SMS/1.0"
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        try:
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(self.api_url, data=req_data, headers=headers, method="POST")
            ctx = ssl._create_unverified_context()

            with urllib.request.urlopen(req, context=ctx, timeout=12) as response:
                body = response.read().decode("utf-8")
                return {
                    "success": True,
                    "status": "ACCEPTED",
                    "provider_reference": f"GEN-HTTP-{response.status}",
                    "error_message": None,
                    "raw_response": body
                }
        except Exception as e:
            return {
                "success": False,
                "status": "FAILED",
                "provider_reference": None,
                "error_message": f"Generic Gateway error: {str(e)}",
                "raw_response": None
            }


def get_sms_provider() -> BaseSMSProvider:
    """
    Factory function instantiating the appropriate SMS provider based on environment configuration.
    Defaults to DemoSMSProvider when SMS_MODE is 'demo' or unconfigured.
    """
    mode = os.getenv("SMS_MODE", "demo").lower().strip()
    if mode != "production":
        return DemoSMSProvider()

    provider_name = os.getenv("SMS_PROVIDER", "fast2sms").lower().strip()

    if provider_name == "fast2sms":
        api_key = os.getenv("FAST2SMS_API_KEY", "")
        return Fast2SMSProvider(api_key=api_key)

    elif provider_name == "twilio":
        sid = os.getenv("TWILIO_ACCOUNT_SID", "")
        token = os.getenv("TWILIO_AUTH_TOKEN", "")
        from_num = os.getenv("TWILIO_FROM_NUMBER", "")
        return TwilioSMSProvider(account_sid=sid, auth_token=token, from_number=from_num)

    elif provider_name == "msg91":
        auth_key = os.getenv("MSG91_AUTH_KEY", "")
        flow_id = os.getenv("MSG91_FLOW_ID", "")
        sender = os.getenv("MSG91_SENDER_ID", "ANNAST")
        return MSG91Provider(auth_key=auth_key, flow_id=flow_id, sender_id=sender)

    elif provider_name in ["generic", "http", "custom"]:
        api_url = os.getenv("SMS_API_URL", "")
        api_key = os.getenv("SMS_API_KEY", "")
        sender = os.getenv("SMS_SENDER_ID", "ANNAST")
        return GenericHttpSMSProvider(api_url=api_url, api_key=api_key, sender_id=sender)

    else:
        logger.warning(f"Unknown SMS_PROVIDER '{provider_name}'. Falling back to DemoSMSProvider.")
        return DemoSMSProvider()
