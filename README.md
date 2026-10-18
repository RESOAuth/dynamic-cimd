# Dynamic CIMD

A small, stateless service for [OAuth Client ID Metadata Documents](https://datatracker.ietf.org/doc/draft-ietf-oauth-client-id-metadata-document/). Paste or edit a JSON object on the root page. The browser encodes it into a URL, and the service returns that metadata with a `client_id` set to the exact document URL.

**Try the live service: [https://dynamic-cimd.resoauth.cloud/](https://dynamic-cimd.resoauth.cloud/).**

## Run locally

Requires Node.js 20 or newer.

```sh
npm install
npm start
```

Open <http://localhost:8787>. The Node.js server and Cloudflare Worker use the same request handler. Local HTTP URLs are for testing only. A usable CIMD client ID must be served over HTTPS.

Run the tests with `npm test`.

`npm run build` checks and bundles the Worker without uploading it. `npm run deploy` publishes the Worker and its static assets, and `npm run preview` creates a Cloudflare preview for the current branch.

## Deploy to Cloudflare Workers

The project uses Wrangler Static Assets for the root page and a Worker for document requests.

```sh
npm install
npm run dev
npm run deploy
```

`npm run dev` starts a local Wrangler preview. `npm run deploy` requires a Cloudflare account and Wrangler authentication. Configure a custom domain in Cloudflare if you want the client IDs to use your own domain.

To connect this repository to Cloudflare Workers Builds, open the existing `dynamic-cimd` Worker in **Workers & Pages**, then go to **Settings > Builds > Connect** and select the `RESOAuth/dynamic-cimd` GitHub repository. Set the root directory to `/`, the production branch to `main`, the build command to `npm run build`, the deploy command to `npm run deploy`, and the preview command to `npm run preview`. The Worker name must match the `name` in `wrangler.jsonc`. Connect after this project's files have been merged to `main`, so the first production build has the Worker configuration and assets available.

Pull requests run tests and Wrangler dry runs in GitHub Actions. This workflow does not deploy the Worker or require Cloudflare credentials.

## URL format

`/cimd/<base64url>` contains an unpadded base64url encoding of a UTF-8 JSON object. For example, `{}` encodes to `e30`, so a request to `https://dynamic-cimd.resoauth.cloud/cimd/e30` returns:

```json
{"client_id":"https://dynamic-cimd.resoauth.cloud/cimd/e30"}
```

The document endpoint returns HTTP 200 and `application/json` for valid requests. It rejects malformed input, non-object JSON, query strings, client secrets, private JWK material and encoded paths longer than 8,192 characters. Supported `token_endpoint_auth_method` values are `none`, `private_key_jwt`, `tls_client_auth` and `self_signed_tls_client_auth`. Other metadata fields pass through unchanged. A supplied `client_id` is replaced by the document URL.

Each URL is immutable because its metadata is in the path. Editing the JSON creates a new client ID. The service has no database or accounts.

Successful document responses use `Cache-Control: public, max-age=31536000, immutable`, so clients may keep a given URL for up to one year. Error responses use `no-store`.
Cloudflare's separate Workers Cache is not enabled. Its default cache key omits the hostname, while `client_id` includes it; configure a hostname-aware key before enabling that cache for more than one domain.

Document responses allow cross-origin JavaScript reads with `Access-Control-Allow-Origin: *`. The endpoint also answers `OPTIONS` preflight requests for public `GET` and `HEAD` access. It does not grant credentialed CORS access. All responses include MIME sniffing, referrer, framing and browser permission protections. The root page also uses a Content Security Policy that permits its own JavaScript and stylesheet, and HTTPS responses include HSTS.

## Public metadata

All metadata is visible in the URL and to anyone who fetches it. Do not include secrets or private keys. Anyone can generate a URL under this service's domain, so the domain alone is not evidence that the operator has verified or endorsed the client. Use a domain and deployment you control if that distinction matters to your users.
