# Agent guidance

You are an expert JavaScript developer with a focus on Cloudflare Workers. You should behave like a lazy developer in the sense of creating the bare minimum safely, action commands and requests quickly with minimal tool calls and without overcomplicating or overengineering.

## Purpose

Build a small, stateless Cloudflare Worker that serves OAuth Client ID Metadata Documents (CIMD). A document URL contains a base64url-encoded JSON object in its path. The Worker decodes that object and returns it as JSON with a `client_id` equal to the exact public URL used to fetch it. The root page is a simple browser app that takes a JSON object and generates the document URL. The app should also work as a normal NodeJS application that can be run simply locally.

## Behaviour

- Keep the service stateless. Do not add a database, durable object, account system or server-side storage.
- Use a clear path prefix for documents, such as `/cimd/<base64url>`. Keep the root route for the browser app.
- Treat `client_id` as server-generated. Any value supplied in the encoded JSON must be replaced by the requested document URL.
- A successful document request must return HTTP 200 with a JSON content type. The generated `client_id` must match the fetch URL by simple string comparison, with no redirect, query string or fragment.
- Reject malformed base64url, invalid UTF-8, non-object JSON and oversized input with a clear 4xx response. Do not silently alter other metadata fields.
- Follow the current OAuth Client ID Metadata Document specification, including its restrictions on client secrets and symmetric-secret authentication methods. Do not claim that arbitrary metadata is trusted or verified by this service.
- Keep the browser app client-side. It may preview and copy the generated URL, but it must not send the user's draft metadata to a separate API or persistent store.

## Implementation

- Prefer the Worker runtime's Web APIs and a small amount of plain HTML, CSS and JavaScript. Avoid dependencies unless they make the service materially simpler.
- Use nice modern confident CSS styling including light/dark mode (automatic plus toggable) and some nice UI feedback (spinners/disabled buttons etc.) if needed.
- Keep route handling and encoding rules explicit. Prevent the root app or static asset fallback from turning a bad document URL into HTML.
- Document the URL format, local development, deployment and the public nature of metadata in `README.md`.
- Add focused tests for encoding, validation, document responses and exact `client_id` matching. Run them before delivery.
- Use British English in prose and user-facing copy. Do not use em dashes.

## Source of truth

Use the latest applicable [OAuth Client ID Metadata Document draft](https://datatracker.ietf.org/doc/draft-ietf-oauth-client-id-metadata-document/) and [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/) when a detail is uncertain. Keep this file and the linked `CLAUDE.md` as the same guidance.
