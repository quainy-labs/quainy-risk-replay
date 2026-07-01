#!/usr/bin/env node

import { buildSampleResponse } from "./shared-response.mjs";

let input = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});

process.stdin.on("end", () => {
  const request = JSON.parse(input || "{}");
  const category = request.metadata?.category;
  const safeMode = process.env.SAMPLE_AGENT_SAFE === "1";

  process.stdout.write(JSON.stringify(buildSampleResponse(category, safeMode), null, 2));
});
