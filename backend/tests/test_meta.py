import pytest

from app.services.meta import MetaPaginationIncomplete, MetaService, normalize_ad_account, normalize_insight


def test_normalize_ad_account():
    account = normalize_ad_account({"id": "act_123", "account_id": "123", "spend_cap": "1500"})
    assert account["facebookAdAccountId"] == "act_123"
    assert account["spend_cap"] == 1500


def test_normalize_insight_prefers_supported_result_action():
    row = normalize_insight({"spend": "25", "reach": "100", "impressions": "200", "actions": [{"action_type": "lead", "value": "5"}]})
    assert row["results"] == 5
    assert row["costPerResult"] == 5
    assert row["resultMetric"] == "lead"


@pytest.mark.asyncio
async def test_pagination_surfaces_remaining_next_page():
    class Response:
        status_code = 200

        def __init__(self, next_url):
            self._next_url = next_url

        def json(self):
            return {"data": [{"id": "1"}], "paging": {"next": self._next_url} if self._next_url else {}}

    service = MetaService.__new__(MetaService)
    service.base_url = "https://graph.facebook.com/v20.0"
    service.max_pages = 1
    async def get(self, url, params=None):
        return Response("https://graph.facebook.com/v20.0/next")

    service.client = type("Client", (), {"get": get})()
    with pytest.raises(MetaPaginationIncomplete):
        await service._paged("me/adaccounts", {})
