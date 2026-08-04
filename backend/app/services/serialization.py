from datetime import datetime
from typing import Any

from beanie import PydanticObjectId

from app.models.documents import Client, User


def json_value(value: Any) -> Any:
    if isinstance(value, PydanticObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [json_value(item) for item in value]
    if isinstance(value, dict):
        return {key: json_value(item) for key, item in value.items()}
    return value


def document_dict(document, *, exclude: set[str] | None = None) -> dict:
    data = document.model_dump(exclude=exclude or set(), by_alias=True)
    data["_id"] = str(document.id)
    return json_value(data)


def public_user(user: User, client: Client | None = None) -> dict:
    data = document_dict(user, exclude={"passwordHash"})
    if client:
        data["client"] = document_dict(client)
    return data


async def populate(document, fields: dict[str, type]) -> dict:
    data = document_dict(document)
    for field, model in fields.items():
        object_id = getattr(document, field, None)
        if object_id:
            related = await model.get(object_id)
            data[field] = document_dict(related) if related else None
    return data
