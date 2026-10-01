"""Alipay mobile / WAP payment — production hooks + dev mock."""
from __future__ import annotations

import os
import urllib.parse

from app.schemas.football_training import AlipayOrderOut

ALIPAY_APP_ID = os.getenv("ALIPAY_APP_ID", "")
ALIPAY_PRIVATE_KEY = os.getenv("ALIPAY_PRIVATE_KEY", "")
ALIPAY_NOTIFY_URL = os.getenv("ALIPAY_NOTIFY_URL", "")
ALIPAY_RETURN_URL = os.getenv("ALIPAY_RETURN_URL", "")


def create_alipay_order(
    booking_id: str,
    amount_cents: int,
    subject: str,
) -> AlipayOrderOut:
    """
    Create Alipay order. Mini programs typically open WAP pay URL or use copy-link flow.
    Returns mock=True when credentials are not configured.
    """
    if not (ALIPAY_APP_ID and ALIPAY_PRIVATE_KEY):
        return AlipayOrderOut(mock=True)

    amount_yuan = f"{amount_cents / 100:.2f}"
    # Production: sign with RSA2 using Alipay SDK; below is a placeholder URL shape.
    params = {
        "app_id": ALIPAY_APP_ID,
        "method": "alipay.trade.wap.pay",
        "charset": "utf-8",
        "sign_type": "RSA2",
        "timestamp": "",
        "version": "1.0",
        "notify_url": ALIPAY_NOTIFY_URL,
        "return_url": ALIPAY_RETURN_URL,
        "biz_content": f'{{"out_trade_no":"{booking_id}","total_amount":"{amount_yuan}","subject":"{subject}"}}',
    }
    query = urllib.parse.urlencode(params)
    pay_url = f"https://openapi.alipay.com/gateway.do?{query}"

    return AlipayOrderOut(
        order_string=query,
        pay_url=pay_url,
        mock=False,
    )
