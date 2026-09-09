"""
KisanQueue Authentication & Authorization Engine
Zero-dependency, production-grade security using PBKDF2-HMAC-SHA256 password hashing
and HMAC-SHA256 signed session tokens (JWT-compatible format).
"""

import os
import re
import hmac
import hashlib
import json
import base64
import time
from typing import Optional, Dict, Any, List, Tuple
from fastapi import Request, HTTPException, Depends, status

SECRET_KEY = os.getenv("SECRET_KEY", "kisanqueue-secure-token-secret-key-2026-prod")
TOKEN_EXPIRY_SECONDS = 7 * 24 * 3600  # 7 Days

# In-memory rate limiting tracker for security question verification
_FAILED_ATTEMPTS: Dict[str, Dict[str, Any]] = {}
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_SECONDS = 15 * 60  # 15 minutes


def normalize_indian_mobile(mobile: str) -> Optional[str]:
    """
    Validates and normalizes Indian mobile numbers into standard 10-digit format.
    Accepts 10 digits starting with 6-9, as well as +91, 91, or leading 0 prefixes.
    Returns normalized 10-digit string or None if invalid.
    """
    if not mobile or not isinstance(mobile, str):
        return None
    cleaned = re.sub(r"[\s\-\(\)\.]", "", mobile.strip())
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    elif cleaned.startswith("0") and len(cleaned) == 11:
        cleaned = cleaned[1:]

    if re.fullmatch(r"[6-9]\d{9}", cleaned):
        return cleaned
    return None


def validate_strong_password(password: str) -> Tuple[bool, str]:
    """
    Enforces strong password policy:
    - At least 8 characters
    - At least 1 uppercase letter (A-Z)
    - At least 1 lowercase letter (a-z)
    - At least 1 number (0-9)
    - At least 1 special character (!@#$%^&* etc.)
    """
    if not password or len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter (A-Z)."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter (a-z)."
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one number (0-9)."
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_=+]", password):
        return False, "Password must contain at least one special character (!@#$%^&* etc.)."
    return True, ""


def normalize_security_answer(answer: str) -> str:
    """Trims whitespace and converts to lowercase for consistent verification."""
    if not answer:
        return ""
    return re.sub(r"\s+", " ", answer.strip().lower())


def hash_security_answer(answer: str) -> str:
    """Hashes normalized security answer using salted PBKDF2-HMAC-SHA256."""
    norm = normalize_security_answer(answer)
    return hash_password(norm)


def verify_security_answer(answer: str, hashed_str: str) -> bool:
    """Verifies user input against stored PBKDF2 hash of the security answer."""
    if not hashed_str:
        return False
    norm = normalize_security_answer(answer)
    return verify_password(norm, hashed_str)


def check_recovery_rate_limit(mobile: str) -> Tuple[bool, str]:
    """Checks if a mobile number is temporarily locked out due to excessive failed attempts."""
    now = time.time()
    record = _FAILED_ATTEMPTS.get(mobile)
    if record:
        locked_until = record.get("locked_until", 0)
        if now < locked_until:
            rem_min = int((locked_until - now) // 60) + 1
            return False, f"Too many failed attempts. Please try again in {rem_min} minutes."
        if now >= locked_until and record.get("count", 0) >= MAX_FAILED_ATTEMPTS:
            # Reset after lockout expires
            _FAILED_ATTEMPTS.pop(mobile, None)
    return True, ""


def record_failed_recovery_attempt(mobile: str):
    """Records a failed security answer attempt and applies lockout if threshold reached."""
    now = time.time()
    record = _FAILED_ATTEMPTS.get(mobile, {"count": 0, "locked_until": 0})
    record["count"] += 1
    if record["count"] >= MAX_FAILED_ATTEMPTS:
        record["locked_until"] = now + LOCKOUT_SECONDS
    _FAILED_ATTEMPTS[mobile] = record


def clear_recovery_attempts(mobile: str):
    """Clears failed attempts upon successful verification."""
    _FAILED_ATTEMPTS.pop(mobile, None)



def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64decode(s: str) -> bytes:
    padding = 4 - (len(s) % 4)
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s.encode("utf-8"))


def hash_password(password: str, salt: Optional[str] = None) -> str:
    """Hashes a password using PBKDF2-HMAC-SHA256 with 100,000 iterations and random salt."""
    if not salt:
        salt = os.urandom(16).hex()
    pwd_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return f"{salt}${pwd_hash}"


def verify_password(password: str, hashed_str: str) -> bool:
    """Verifies a plain password against the stored salt$hash string."""
    try:
        parts = hashed_str.split('$')
        if len(parts) != 2:
            return False
        salt, expected_hash = parts
        computed_hash = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        ).hex()
        return hmac.compare_digest(computed_hash, expected_hash)
    except Exception:
        return False


def create_access_token(data: Dict[str, Any], expires_in: int = TOKEN_EXPIRY_SECONDS) -> str:
    """Creates a signed HMAC-SHA256 JWT-compatible token."""
    header = {"alg": "HS256", "typ": "JWT"}
    payload = dict(data)
    payload["exp"] = int(time.time()) + expires_in
    payload["iat"] = int(time.time())

    h_str = _b64encode(json.dumps(header, separators=(',', ':')).encode('utf-8'))
    p_str = _b64encode(json.dumps(payload, separators=(',', ':')).encode('utf-8'))
    signature_base = f"{h_str}.{p_str}"

    sig = hmac.new(
        SECRET_KEY.encode('utf-8'),
        signature_base.encode('utf-8'),
        hashlib.sha256
    ).digest()
    sig_str = _b64encode(sig)

    return f"{signature_base}.{sig_str}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Verifies signature and expiration of access token. Returns payload dict or None."""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        h_str, p_str, sig_str = parts

        signature_base = f"{h_str}.{p_str}"
        expected_sig = hmac.new(
            SECRET_KEY.encode('utf-8'),
            signature_base.encode('utf-8'),
            hashlib.sha256
        ).digest()

        if not hmac.compare_digest(_b64decode(sig_str), expected_sig):
            return None

        payload = json.loads(_b64decode(p_str).decode('utf-8'))
        if "exp" in payload and payload["exp"] < int(time.time()):
            return None  # Expired

        return payload
    except Exception:
        return None


def get_current_user_optional(request: Request) -> Optional[Dict[str, Any]]:
    """Extracts user from Authorization header or cookie, if present."""
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    elif "access_token" in request.cookies:
        token = request.cookies.get("access_token")

    if not token:
        return None

    payload = decode_access_token(token)
    if not payload or "user_id" not in payload:
        return None

    from database import get_db, row_to_dict
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (payload["user_id"],))
        user = row_to_dict(cursor.fetchone())
        if user:
            user.pop("password_hash", None)
        return user


def get_current_user(request: Request) -> Dict[str, Any]:
    """Strict FastAPI dependency requiring valid authenticated session."""
    user = get_current_user_optional(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user


def require_role(allowed_roles: List[str]):
    """FastAPI dependency enforcing strict role-based access control."""
    def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role", "farmer")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker
