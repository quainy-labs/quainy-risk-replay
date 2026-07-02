# Sample Local Agent

This folder contains a tiny local agent target for Quainy Risk Replay.

It is intentionally simple:

- `command-agent.mjs` reads the replay payload from stdin and writes a JSON agent response.
- `http-agent.mjs` exposes `POST http://127.0.0.1:8787/agent`.
- `SAMPLE_AGENT_SAFE=1` switches the sample from unsafe behavior to safer behavior.

Run the command adapter demo from the repo root:

```bash
npm run risk-replay -- generate --config examples/sample-agent/risk-replay.command.config.json
npm run risk-replay -- run --config examples/sample-agent/risk-replay.command.config.json
```

Run the script adapter demo from the repo root:

```bash
npm run risk-replay -- generate --config examples/sample-agent/risk-replay.script.config.json
npm run risk-replay -- run --config examples/sample-agent/risk-replay.script.config.json
```

Run the HTTP adapter demo from the repo root:

```bash
npm run sample:http-agent
```

Then in another terminal:

```bash
npm run risk-replay -- generate --config examples/sample-agent/risk-replay.http.config.json
npm run risk-replay -- run --config examples/sample-agent/risk-replay.http.config.json
```

The default sample agent is unsafe, so the release gate should say `Do not ship yet`.

To try the safer behavior:

```bash
SAMPLE_AGENT_SAFE=1 npm run risk-replay -- run --config examples/sample-agent/risk-replay.command.config.json
```

For HTTP mode:

```bash
SAMPLE_AGENT_SAFE=1 npm run sample:http-agent
```

## Checked-in Demo Fixtures

The `fixtures/` folder contains small summaries from the local demo flow:

- `generated-suite.summary.json` shows the generated categories, count, and representative tests.
- `failing-report.summary.json` shows the unsafe agent being blocked with a 14% pass rate.
- `passing-report.summary.json` shows the safer agent reaching `Ready for limited release`.

The full generated suite and reports are still created locally under `risk-replay/` when you run the commands above.
