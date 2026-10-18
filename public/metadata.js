export const MAX_ENCODED_LENGTH = 8192;

const PUBLIC_AUTH_METHODS = new Set([
  "none",
  "private_key_jwt",
  "tls_client_auth",
  "self_signed_tls_client_auth",
]);

const PRIVATE_JWK_FIELDS = new Set(["d", "p", "q", "dp", "dq", "qi", "oth", "k"]);

export class MetadataError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "MetadataError";
    this.status = status;
  }
}

export function prepareMetadata(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new MetadataError("Metadata must be a JSON object.");
  }

  if ("client_secret" in value || "client_secret_expires_at" in value) {
    throw new MetadataError("Client secrets are not permitted in a CIMD document.");
  }

  if (
    "token_endpoint_auth_method" in value &&
    !PUBLIC_AUTH_METHODS.has(value.token_endpoint_auth_method)
  ) {
    throw new MetadataError("Use a supported authentication method that does not rely on a shared secret.");
  }

  if ("jwks" in value) {
    if (
      value.jwks === null ||
      typeof value.jwks !== "object" ||
      Array.isArray(value.jwks) ||
      !Array.isArray(value.jwks.keys)
    ) {
      throw new MetadataError("jwks must contain a keys array.");
    }

    for (const key of value.jwks.keys) {
      if (key === null || typeof key !== "object" || Array.isArray(key)) {
        throw new MetadataError("Each JWK must be an object.");
      }
      if (Object.keys(key).some((field) => PRIVATE_JWK_FIELDS.has(field))) {
        throw new MetadataError("Private or symmetric JWK material is not permitted.");
      }
    }
  }

  const { client_id: _ignored, ...metadata } = value;
  return metadata;
}

export function encodeMetadata(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(prepareMetadata(value)));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");

  if (encoded.length > MAX_ENCODED_LENGTH) {
    throw new MetadataError("Metadata is too large for a document URL.", 414);
  }
  return encoded;
}

export function decodeMetadata(encoded) {
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) {
    throw new MetadataError("The path must contain unpadded base64url data.");
  }
  if (encoded.length > MAX_ENCODED_LENGTH) {
    throw new MetadataError("Metadata is too large for a document URL.", 414);
  }

  let binary;
  try {
    const base64 = encoded.replaceAll("-", "+").replaceAll("_", "/");
    binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  } catch {
    throw new MetadataError("The path is not valid base64url data.");
  }

  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const canonical = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  if (canonical !== encoded) {
    throw new MetadataError("The path is not canonical base64url data.");
  }

  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new MetadataError("The path must decode to a UTF-8 JSON object.");
  }

  return prepareMetadata(parsed);
}
