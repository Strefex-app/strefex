"""WeChat Pay unified order — production hooks + dev mock."""
from __future__ import annotations

import os
import time
import uuid

from app.schemas.football_training import WeChatPayOrderOut

WECHAT_PAY_MCH_ID = os.getenv("WECHAT_PAY_MCH_ID", "")
WECHAT_PAY_API_KEY = os.getenv("WECHAT_PAY_API_KEY", "")
WECHAT_PAY_NOTIFY_URL = os.getenv("WECHAT_PAY_NOTIFY_URL", "")


def create_wechat_pay_order(
    booking_id: str,
    amount_cents: int,
    description: str,
    openid: str,
) -> WeChatPayOrderOut:
    """
    Create WeChat Pay JSAPI order for mini program.
    When merchant credentials are not set, returns mock=True for dev simulation.
    """
    if not (WECHAT_PAY_MCH_ID and WECHAT_PAY_API_KEY):
        return WeChatPayOrderOut(mock=True)

    # Production: integrate WeChat Pay v3 API (unified order + sign for requestPayment)
    # Placeholder structure — replace with official SDK or signed HTTP calls.
    nonce = uuid.uuid4().hex
    timestamp = str(int(time.time()))
    prepay_id = f"wx{uuid.uuid4().hex[:16]}"
    package = f"prepay_id={prepay_id}"

    return WeChatPayOrderOut(
        timeStamp=timestamp,
        nonceStr=nonce,
        package=package,
        signType="RSA",
        paySign="REPLACE_WITH_REAL_SIGN",
        mock=False,
    )
