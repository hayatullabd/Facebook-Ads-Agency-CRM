from urllib.parse import urlparse

import httpx

from app.core.config import get_settings
from app.core.responses import ApiError

RESULT_ACTIONS = ("offsite_conversion", "lead", "onsite_conversion.lead_grouped", "purchase", "complete_registration", "link_click")


class MetaPaginationIncomplete(ApiError):
    def __init__(self, message="Facebook result exceeded the configured page limit"):
        super().__init__(502, message)


def normalize_ad_account(account: dict) -> dict:
    raw = str(account.get("account_id") or account.get("id") or "").removeprefix("act_")
    account_id = f"act_{raw}" if raw.isdigit() else str(account.get("id") or "")
    spend_cap = account.get("spend_cap")
    return {**account, "id": account_id, "facebookAdAccountId": account_id, "account_id": raw, "spend_cap": float(spend_cap) if spend_cap not in (None, "") else None}


def normalize_insight(row: dict) -> dict:
    action = next((item for item in row.get("actions", []) if item.get("action_type") in RESULT_ACTIONS), None)
    results, spend = float(action.get("value", 0)) if action else 0, float(row.get("spend", 0))
    return {**row, "spend": spend, "reach": int(row.get("reach", 0)), "impressions": int(row.get("impressions", 0)), "results": results, "resultMetric": action.get("action_type", "") if action else "", "costPerResult": spend / results if results else 0}


class MetaService:
    def __init__(self, token: str):
        settings = get_settings()
        self.token = token
        self.base_url = f"https://graph.facebook.com/{settings.facebook_graph_version}"
        self.max_pages = settings.facebook_sync_max_pages
        self.client = httpx.AsyncClient(timeout=settings.facebook_request_timeout_seconds, headers={"Authorization": f"Bearer {token}", "Accept": "application/json"})

    async def close(self):
        await self.client.aclose()

    async def _paged(self, path: str, params: dict) -> list[dict]:
        rows, url, request_params = [], f"{self.base_url}/{path.lstrip('/')}", params
        for _ in range(self.max_pages):
            response = await self.client.get(url, params=request_params)
            if response.status_code >= 400:
                raise ApiError(429 if response.status_code == 429 else 502, "Facebook Graph API request failed")
            payload = response.json()
            rows.extend(payload.get("data", []))
            url = payload.get("paging", {}).get("next")
            if not url: break
            parsed = urlparse(url)
            if parsed.scheme != "https" or parsed.hostname != "graph.facebook.com":
                raise ApiError(502, "Invalid Facebook pagination URL")
            request_params = None
        if url:
            raise MetaPaginationIncomplete()
        return rows

    async def accounts(self) -> list[dict]:
        rows = await self._paged("me/adaccounts", {"fields": "id,account_id,name,account_status,currency,timezone_name,spend_cap,amount_spent"})
        return [normalize_ad_account(row) for row in rows]

    async def campaigns(self, account_id: str) -> list[dict]:
        account_id = account_id.removeprefix("act_")
        return await self._paged(f"act_{account_id}/campaigns", {"fields": "id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time", "limit": 100})

    async def insights(self, account_id: str) -> list[dict]:
        account_id = account_id.removeprefix("act_")
        rows = await self._paged(f"act_{account_id}/insights", {"fields": "campaign_id,campaign_name,spend,reach,impressions,actions", "level": "campaign", "date_preset": "last_30d", "limit": 100})
        return [normalize_insight(row) for row in rows]

    async def update_spend_cap(self, account_id: str, new_limit: float) -> dict:
        account_id = account_id.removeprefix("act_")
        response = await self.client.post(f"{self.base_url}/act_{account_id}", data={"spend_cap": new_limit})
        if response.status_code >= 400: raise ApiError(502, "Facebook spend cap update failed")
        return response.json()
