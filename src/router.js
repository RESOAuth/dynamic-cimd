import { decodeMetadata, MetadataError } from "../public/metadata.js";

const DOCUMENT_CACHE_CONTROL = "public, max-age=31536000, immutable";
const PAGE_CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "connect-src 'self'",
  "img-src 'self' data:",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join("; ");

function secureResponse(response, request, isDocument = false) {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  headers.set("x-frame-options", "DENY");

  if (new URL(request.url).protocol === "https:") {
    headers.set("strict-transport-security", "max-age=31536000");
  }
  if (headers.get("content-type")?.startsWith("text/html")) {
    headers.set("content-security-policy", PAGE_CONTENT_SECURITY_POLICY);
  }
  if (isDocument) {
    headers.set("access-control-allow-origin", "*");
    headers.set("cross-origin-resource-policy", "cross-origin");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(body, status = 200, method = "GET") {
  return new Response(method === "HEAD" ? null : JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": status === 200 ? DOCUMENT_CACHE_CONTROL : "no-store",
    },
  });
}

function isLocalPreview(url) {
  return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
}

export async function handleRequest(request, serveAsset) {
  const url = new URL(request.url);

  if (url.pathname === "/cimd" || url.pathname.startsWith("/cimd/")) {
    const documentResponse = (body, status = 200) =>
      secureResponse(jsonResponse(body, status, request.method), request, true);

    if (request.method === "OPTIONS") {
      return secureResponse(new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET, HEAD, OPTIONS",
          "access-control-allow-headers": "*",
          "access-control-max-age": "86400",
          "cache-control": "no-store",
        },
      }), request, true);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      const response = jsonResponse({ error: "Use GET or HEAD for a CIMD document." }, 405);
      response.headers.set("allow", "GET, HEAD");
      return secureResponse(response, request, true);
    }

    if (url.protocol !== "https:" && !isLocalPreview(url)) {
      return documentResponse({ error: "CIMD document URLs must use HTTPS." }, 400);
    }
    if (url.username || url.password || request.url.includes("?") || request.url.includes("#")) {
      return documentResponse({ error: "Document URLs must not contain user information, a query or a fragment." }, 400);
    }

    const match = /^\/cimd\/([A-Za-z0-9_-]+)$/.exec(url.pathname);
    if (!match) {
      return documentResponse({ error: "Use /cimd/<base64url> for a document URL." }, 400);
    }

    try {
      const metadata = decodeMetadata(match[1]);
      return documentResponse({ ...metadata, client_id: request.url });
    } catch (error) {
      if (error instanceof MetadataError) {
        return documentResponse({ error: error.message }, error.status);
      }
      throw error;
    }
  }

  return secureResponse(await serveAsset(request), request);
}
