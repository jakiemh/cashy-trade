"""Lazy WebAuthn imports — the main API must cold-start without loading this stack."""


def b64_to_bytes(value: str) -> bytes:
    from webauthn.helpers import base64url_to_bytes

    return base64url_to_bytes(value)


def b64_from_bytes(value: bytes) -> str:
    from webauthn.helpers import bytes_to_base64url

    return bytes_to_base64url(value)


def options_dict(options) -> dict:
    from webauthn.helpers import options_to_json_dict

    return options_to_json_dict(options)


def generate_registration_options(**kwargs):
    from webauthn import generate_registration_options as fn

    return fn(**kwargs)


def generate_authentication_options(**kwargs):
    from webauthn import generate_authentication_options as fn

    return fn(**kwargs)


def verify_registration_response(**kwargs):
    from webauthn import verify_registration_response as fn

    return fn(**kwargs)


def verify_authentication_response(**kwargs):
    from webauthn import verify_authentication_response as fn

    return fn(**kwargs)


def authenticator_selection():
    from webauthn.helpers.structs import (
        AuthenticatorAttachment,
        AuthenticatorSelectionCriteria,
        PublicKeyCredentialHint,
        ResidentKeyRequirement,
        UserVerificationRequirement,
    )

    return AuthenticatorSelectionCriteria(
        authenticator_attachment=AuthenticatorAttachment.PLATFORM,
        resident_key=ResidentKeyRequirement.PREFERRED,
        require_resident_key=None,
        user_verification=UserVerificationRequirement.REQUIRED,
    )


def registration_hints():
    from webauthn.helpers.structs import PublicKeyCredentialHint

    return [PublicKeyCredentialHint.CLIENT_DEVICE]


def credential_descriptor(credential_id: bytes, transports_csv: str | None):
    from webauthn.helpers.structs import AuthenticatorTransport, PublicKeyCredentialDescriptor

    transports: list[AuthenticatorTransport] = []
    for part in (transports_csv or "").split(","):
        if not part:
            continue
        try:
            transports.append(AuthenticatorTransport(part))
        except ValueError:
            continue
    return PublicKeyCredentialDescriptor(id=credential_id, transports=transports or None)


def auth_user_verification():
    from webauthn.helpers.structs import UserVerificationRequirement

    return UserVerificationRequirement.REQUIRED
