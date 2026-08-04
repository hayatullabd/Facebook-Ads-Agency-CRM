import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.core.security import hash_password, password_policy_error, verify_password
from app.schemas.inputs import AssignmentInput, FacebookAccountsInput, RegisterInput, TransactionInput


def test_password_policy_and_hash_roundtrip():
    assert password_policy_error("weak")
    password = "Strong-Pass-123!"
    encoded = hash_password(password)
    assert encoded != password
    assert verify_password(password, encoded)
    assert not verify_password("Wrong-Pass-123!", encoded)


def test_registration_rejects_extra_fields():
    with pytest.raises(ValidationError):
        RegisterInput(agencyName="Agency", name="Admin", email="admin@example.com", password="Strong-Pass-123!", role="admin")


def test_transaction_constraints():
    with pytest.raises(ValidationError):
        TransactionInput(client="507f1f77bcf86cd799439011", type="Reduce", amountUsd=-1, rateBdt=110)


def test_production_rejects_placeholder_secrets_and_disables_registration_by_default():
    with pytest.raises(ValidationError):
        Settings(environment="production", jwt_secret="replace-with-a-random-secret-at-least-32-characters", facebook_token_encryption_key="x" * 40)
    assert Settings(environment="development").allow_public_registration is False


def test_mapping_payloads_support_single_account_and_explicit_unassign():
    assert FacebookAccountsInput(facebookAdAccountId="act_123", assigned=True).assigned is True
    assert AssignmentInput(clientId=None).clientId is None
