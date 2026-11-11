import { api } from "@/lib/api";

const READY_KEY = "cashy_biometric_ready";
const DISMISS_KEY = "cashy_biometric_dismissed";
const CRED_KEY = "cashy_biometric_id";

type JsonRecord = Record<string, unknown>;

function bufferToB64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlToBuffer(value: string): ArrayBuffer {
  const pad = "=".repeat((4 - (value.length % 4)) % 4);
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function storedCredentialId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CRED_KEY);
}

export function markBiometricReady(credentialId: string) {
  localStorage.setItem(READY_KEY, "1");
  localStorage.setItem(CRED_KEY, credentialId);
  localStorage.removeItem(DISMISS_KEY);
}

export function dismissBiometricPrompt() {
  localStorage.setItem(DISMISS_KEY, "1");
}

export function clearBiometricLocal(credentialId?: string) {
  const current = localStorage.getItem(CRED_KEY);
  if (!credentialId || current === credentialId) {
    localStorage.removeItem(READY_KEY);
    localStorage.removeItem(CRED_KEY);
  }
}

export function syncStoredCredential(ids: string[]) {
  const current = storedCredentialId();
  if (current && !ids.includes(current)) clearBiometricLocal(current);
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential || !window.isSecureContext) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function shouldOfferBiometric(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(READY_KEY) === "1" && storedCredentialId()) return false;
  if (localStorage.getItem(DISMISS_KEY) === "1") return false;
  return isBiometricAvailable();
}

function errorDetail(err: unknown): string | null {
  if (!(err instanceof Error)) return null;
  try {
    const parsed = JSON.parse(err.message) as { detail?: unknown };
    return typeof parsed.detail === "string" ? parsed.detail : null;
  } catch {
    return null;
  }
}

export function webauthnErrorKey(err: unknown): string {
  const name = err && typeof err === "object" && "name" in err ? String((err as { name: unknown }).name) : "";
  if (name === "NotAllowedError" || name === "AbortError") {
    return storedCredentialId() ? "auth.biometricCancelled" : "auth.biometricNoCredential";
  }
  if (name === "InvalidStateError") return "auth.biometricAlready";
  if (name === "NotSupportedError" || name === "SecurityError") return "auth.biometricUnavailable";
  const detail = errorDetail(err);
  if (detail === "webauthn_expired") return "auth.biometricExpired";
  if (detail === "webauthn_not_found") return "auth.biometricNoCredential";
  if (detail === "webauthn_already") return "auth.biometricAlready";
  if (detail === "webauthn_origin") return "auth.biometricUnavailable";
  return "auth.biometricFailed";
}

function toCreationOptions(options: JsonRecord): PublicKeyCredentialCreationOptions {
  const user = options.user as { id: string; name: string; displayName: string };
  const publicKey: JsonRecord = {
    rp: options.rp,
    user: {
      id: b64urlToBuffer(user.id),
      name: user.name,
      displayName: user.displayName,
    },
    challenge: b64urlToBuffer(String(options.challenge)),
    pubKeyCredParams: options.pubKeyCredParams,
  };
  if (options.timeout) publicKey.timeout = options.timeout;
  if (options.attestation) publicKey.attestation = options.attestation;
  if (options.authenticatorSelection) publicKey.authenticatorSelection = options.authenticatorSelection;
  if (options.hints) publicKey.hints = options.hints;
  if (Array.isArray(options.excludeCredentials)) {
    publicKey.excludeCredentials = options.excludeCredentials.map((cred) => {
      const row = cred as { id: string; type: PublicKeyCredentialType; transports?: AuthenticatorTransport[] };
      return {
        id: b64urlToBuffer(row.id),
        type: row.type,
        transports: row.transports,
      };
    });
  }
  return publicKey as unknown as PublicKeyCredentialCreationOptions;
}

function toRequestOptions(options: JsonRecord): PublicKeyCredentialRequestOptions {
  const publicKey: JsonRecord = {
    challenge: b64urlToBuffer(String(options.challenge)),
  };
  if (options.timeout) publicKey.timeout = options.timeout;
  if (options.rpId) publicKey.rpId = options.rpId;
  if (options.userVerification) publicKey.userVerification = options.userVerification;
  if (Array.isArray(options.allowCredentials)) {
    publicKey.allowCredentials = options.allowCredentials.map((cred) => {
      const row = cred as { id: string; type: PublicKeyCredentialType; transports?: AuthenticatorTransport[] };
      return {
        id: b64urlToBuffer(row.id),
        type: row.type,
        transports: row.transports,
      };
    });
  }
  return publicKey as unknown as PublicKeyCredentialRequestOptions;
}

function credentialToJSON(credential: PublicKeyCredential, kind: "create" | "get"): JsonRecord {
  const response = credential.response;
  const base: JsonRecord = {
    id: credential.id,
    rawId: bufferToB64url(credential.rawId),
    type: credential.type,
  };
  if (credential.authenticatorAttachment) base.authenticatorAttachment = credential.authenticatorAttachment;

  if (kind === "create") {
    const attestation = response as AuthenticatorAttestationResponse;
    base.response = {
      clientDataJSON: bufferToB64url(attestation.clientDataJSON),
      attestationObject: bufferToB64url(attestation.attestationObject),
      transports: typeof attestation.getTransports === "function" ? attestation.getTransports() : [],
    };
    return base;
  }

  const assertion = response as AuthenticatorAssertionResponse;
  base.response = {
    clientDataJSON: bufferToB64url(assertion.clientDataJSON),
    authenticatorData: bufferToB64url(assertion.authenticatorData),
    signature: bufferToB64url(assertion.signature),
    userHandle: assertion.userHandle ? bufferToB64url(assertion.userHandle) : null,
  };
  return base;
}

export async function registerBiometric(): Promise<string> {
  const { options } = await api.webauthnRegisterOptions();
  const credential = await navigator.credentials.create({ publicKey: toCreationOptions(options) });
  if (!credential || credential.type !== "public-key") {
    throw new DOMException("Biometric registration was cancelled", "NotAllowedError");
  }
  const json = credentialToJSON(credential as PublicKeyCredential, "create");
  const result = await api.webauthnRegisterVerify(json);
  markBiometricReady(result.credential_id);
  return result.credential_id;
}

export async function loginWithBiometric(email?: string): Promise<string> {
  const trimmed = email?.trim() ?? "";
  const { options } = await api.webauthnLoginOptions({
    email: trimmed.includes("@") ? trimmed : undefined,
    credential_id: storedCredentialId() || undefined,
  });
  const credential = await navigator.credentials.get({ publicKey: toRequestOptions(options) });
  if (!credential || credential.type !== "public-key") {
    throw new DOMException("Biometric sign-in was cancelled", "NotAllowedError");
  }
  const json = credentialToJSON(credential as PublicKeyCredential, "get");
  const { access_token } = await api.webauthnLoginVerify(json);
  if (typeof json.id === "string") markBiometricReady(json.id);
  return access_token;
}
