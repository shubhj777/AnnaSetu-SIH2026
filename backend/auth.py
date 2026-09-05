"""
KisanQueue Authentication & Authorization Engine
Zero-dependency, production-grade security using PBKDF2-HMAC-SHA256 password hashing
and HMAC-SHA256 signed session tokens (JWT-compatible format).
"""

import os
import hmac
import hashlib
import json
import base64
import time
from typing import Optional, Dict, Any, List
from fastapi import Request, HTTPException, Depends, status

SECRET_KEY = os.getenv("SECRET_KEY", "kisanqueue-secure-token-secret-key-2026-prod")
TOKEN_EXPIRY_SECONDS = 7 * 24 * 3600  # 7 Days


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
