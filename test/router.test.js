import test from "node:test";
import assert from "node:assert/strict";
import { encodeMetadata } from "../public/metadata.js";
import { handleRequest } from "../src/router.js";

const asset = () => new Response("asset page", { headers: { "content-type": "text/html" } });

test("returns a CIMD document with the exact requested URL as client_id", async () => {
  const encoded = encodeMetadata({ client_name: "Test", custom_field: ["kept"] });
  const url = `https://example.com/cimd/${encoded}`;
  const response = await handleRequest(new Request(url), asset);

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^application\/json/);
  assert.equal(response.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.equal(response.headers.get("cross-origin-resource-policy"), "cross-origin");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("strict-transport-security"), "max-age=31536000");
  assert.deepEqual(await response.json(), {
    client_name: "Test",
    custom_field: ["kept"],
    client_id: url,
  });
});

test("rejects bad document routes without serving HTML", async () => {
  const responses = await Promise.all([
    handleRequest(new Request("https://example.com/cimd/"), asset),
    handleRequest(new Request("https://example.com/cimd/e30?x=1"), asset),
    handleRequest(new Request("http://example.com/cimd/e30"), asset),
  ]);
  for (const response of responses) {
    assert.equal(response.status, 400);
    assert.match(response.headers.get("content-type"), /^application\/json/);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
  }
});

test("allows local HTTP testing and handles HEAD and method errors", async () => {
  const url = "http://localhost:8787/cimd/e30";
  const get = await handleRequest(new Request(url), asset);
  assert.equal((await get.json()).client_id, url);
  assert.equal(get.headers.get("strict-transport-security"), null);

  const head = await handleRequest(new Request(url, { method: "HEAD" }), asset);
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.equal(await head.text(), "");

  const post = await handleRequest(new Request(url, { method: "POST" }), asset);
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("allow"), "GET, HEAD");
});

test("answers cross-origin preflight for public documents", async () => {
  const response = await handleRequest(new Request("https://example.com/cimd/e30", {
    method: "OPTIONS",
    headers: {
      origin: "https://other.example",
      "access-control-request-method": "GET",
      "access-control-request-headers": "x-test",
    },
  }), asset);

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.equal(response.headers.get("access-control-allow-methods"), "GET, HEAD, OPTIONS");
  assert.equal(response.headers.get("access-control-allow-headers"), "*");
  assert.equal(response.headers.get("access-control-max-age"), "86400");
  assert.equal(await response.text(), "");
});

test("passes the root route to the static asset handler", async () => {
  const response = await handleRequest(new Request("https://example.com/"), asset);
  assert.equal(await response.text(), "asset page");
  assert.match(response.headers.get("content-security-policy"), /script-src 'self'/);
  assert.match(response.headers.get("content-security-policy"), /connect-src 'self'/);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("permissions-policy"), "camera=(), microphone=(), geolocation=()");
});
