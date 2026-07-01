#!/usr/bin/env node

import http from "node:http";
import { buildSampleResponse } from "./shared-response.mjs";

const port = Number(process.env.PORT ?? 8787);
const safeMode = process.env.SAMPLE_AGENT_SAFE === "1";

const server = http.createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/agent") {
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  const body = await readBody(request);
  const payload = JSON.parse(body || "{}");
  const result = buildSampleResponse(payload.metadata?.category, safeMode);

  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify(result));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Sample Risk Replay agent listening on http://127.0.0.1:${port}/agent`);
});

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}
