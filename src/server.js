import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { handleRequest } from "./router.js";

const publicDirectory = fileURLToPath(new URL("../public/", import.meta.url));
const assets = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/metadata.js", ["metadata.js", "text/javascript; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
]);

async function serveAsset(request) {
  const pathname = new URL(request.url).pathname;
  const asset = assets.get(pathname);
  if (!asset) return new Response("Not found", { status: 404 });
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
  }

  const [name, contentType] = asset;
  const body = await readFile(join(publicDirectory, name));
  return new Response(request.method === "HEAD" ? null : body, {
    headers: { "content-type": contentType, "x-content-type-options": "nosniff" },
  });
}

const port = Number(process.env.PORT || 8787);
createServer(async (incoming, outgoing) => {
  try {
    const host = incoming.headers.host || `localhost:${port}`;
    const request = new Request(`http://${host}${incoming.url}`, { method: incoming.method });
    const response = await handleRequest(request, serveAsset);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    outgoing.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    outgoing.end("Internal server error");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Dynamic CIMD is running at http://localhost:${port}`);
});
