"""WeChat mini program auth (code2session) — mock in dev when credentials absent."""
from __future__ import annotations

import hashlib
import logging
import os
import urllib.parse
import urllib.request
import json

logger = logging.getLogger(__name__)

WECHAT_APP_ID = os.getenv("WECHAT_MINI_APP_ID", "")
WECHAT_APP_SECRET = os.getenv("WECHAT_MINI_APP_SECRET", "")


def exchange_code_for_openid(code: str) -> tuple[str, str | None]:
    """
    Returns (openid, session_key).
    Uses WeChat jscode2session when configured; otherwise deterministic mock openid for dev.
    """
    if WECHAT_APP_ID and WECHAT_APP_SECRET:
        params = urllib.parse.urlencode({
            "appid": WECHAT_APP_ID,
            "secret": WECHAT_APP_SECRET,
            "js_code": code,
            "grant_type": "authorization_code",
        })
        url = f"https://api.weixin.qq.com/sns/jscode2session?{params}"
        try:
            with urllib.request.urlopen(url, timeout=10) as resp:
                data = json.loads(resp.read().decode())
            if "errcode" in data and data["errcode"] != 0:
                logger.error("WeChat jscode2session error: %s", data)
                raise ValueError(data.get("errmsg", "WeChat login failed"))
            return data["openid"], data.get("session_key")
        except Exception as exc:
            logger.exception("WeChat API request failed")
            raise ValueError("WeChat login service unavailable") from exc

    # Dev mock: stable openid per code for testing
    digest = hashlib.sha256(code.encode()).hexdigest()[:28]
    return f"mock_openid_{digest}", None
