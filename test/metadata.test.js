import test from "node:test";
import assert from "node:assert/strict";
import { decodeMetadata, encodeMetadata, MAX_ENCODED_LENGTH } from "../public/metadata.js";

test("round trips Unicode and additional metadata fields", () => {
  const metadata = {
    client_name: "Café client",
    redirect_uris: ["https://example.com/callback"],
    future_field: { enabled: true },
  };
  assert.deepEqual(decodeMetadata(encodeMetadata(metadata)), metadata);
});

test("removes a supplied client_id before encoding", () => {
  assert.deepEqual(decodeMetadata(encodeMetadata({ client_id: "https://wrong.example", client_name: "Test" })), {
    client_name: "Test",
  });
});

test("rejects malformed and non-object input", () => {
  assert.throws(() => decodeMetadata("%%%"), /base64url/);
  assert.throws(() => decodeMetadata("_w"), /UTF-8 JSON object/);
  assert.throws(() => decodeMetadata("W10"), /JSON object/);
  assert.throws(() => decodeMetadata("e31"), /canonical base64url/);
  assert.throws(() => decodeMetadata("A".repeat(MAX_ENCODED_LENGTH + 1)), /too large/);
});

test("rejects client secrets and private JWK material", () => {
  assert.throws(() => encodeMetadata({ client_secret: "secret" }), /Client secrets/);
  assert.throws(() => encodeMetadata({ token_endpoint_auth_method: "client_secret_basic" }), /shared secret/);
  assert.throws(() => encodeMetadata({ jwks: { keys: [{ kty: "oct", k: "secret" }] } }), /JWK material/);
});
