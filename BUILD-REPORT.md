# BUILD REPORT — sportstax

Clean-room rebuild of `com.jocktaxes/developer` v1.0.0 (remote-only MCP
server at `https://jocktaxes.com/mcp`), built 2026-10-28 as a
forwarding client. Package: `@reneturcios/sportstax` 0.1.0,
registry name `io.github.CloudCorpRecords/sportstax`.

## Surface built

Full surface built: **14/14 tools**, no omissions.

| Tool | Title (as served) | Required fields as served |
|------|-------------------|-----------------------------|
| `calculate_nhl_tax` | Calculate NHL tax | `team` |
| `equivalent_nhl_salary` | Match NHL after-tax salary | `baseline_team`, `comparison_team` |
| `player_movement_nhl` | Compare NHL move | `from_team`, `to_team` |
| `calculate_nfl_tax` | Calculate NFL tax | `team` |
| `equivalent_nfl_salary` | Match NFL after-tax salary | `baseline_team`, `comparison_team` |
| `player_movement_nfl` | Compare NFL move | `from_team`, `to_team` |
| `calculate_mlb_tax` | Calculate MLB tax | `team` |
| `equivalent_mlb_salary` | Match MLB after-tax salary | `baseline_team`, `comparison_team` |
| `player_movement_mlb` | Compare MLB move | `from_team`, `to_team` |
| `calculate_nba_tax` | Calculate NBA tax | `team` |
| `equivalent_nba_salary` | Match NBA after-tax salary | `baseline_team`, `comparison_team` |
| `player_movement_nba` | Compare NBA move | `from_team`, `to_team` |
| `list_team_players` | List team players | `league`, `team`, `season_id` |
| `list_tax_calculator_inputs` | List calculator inputs | *(no `required` key in schema; empty `properties`)* |

Every tool's inputSchema carries a schema-level `title`
(`<tool>Arguments`); those are served verbatim. The NFL trio additionally
carries the NFL-only `other_duty_day_pay` / `other_inducement_pay`
properties. Tool literals were generated programmatically from
`harness/fixtures/jocktaxes-tools-original.json` by the script at
`/tmp/b40-sportstax-gen.py` (parse + re-serialise, placeholder substitution
into `src/forward.ts`) — never retyped — and a post-generation check
confirmed the served literals deep-equal the fixture's 14 tool objects in
order. Tools are registered via the MCP SDK low-level Server API
(`ListToolsRequestSchema` / `CallToolRequestSchema` handlers), not
McpServer+zod, per the task instruction overriding TEMPLATE.md §2 item 12.

Judgment call (from the spec, recorded): the twelve calculators are
deterministic computations over caller-supplied figures — they file
nothing, pay nothing and submit nothing; `list_team_players` reads the
vendor's published salary tables. No tool buys, subscribes, checks out or
mints a key. The surface was built in full.

## Fixture conflicts

**None.** The spec and the fixture agree on tool names, order, titles,
required fields, the NFL-only properties, and on
`list_tax_calculator_inputs` carrying no `required` key and empty
`properties`.

## Labelled reconstructions (from the spec's Wire section)

- Upstream endpoint pinned: `https://jocktaxes.com/mcp`.
- Env override `JOCKTAXES_MCP_URL` — labelled reconstruction.
- Env name `JOCKTAXES_API_KEY` — labelled reconstruction (the capture was
  keyless). When set, the raw value is sent on every upstream request as
  an `X-JockTax-Api-Key: <value>` header (header name pinned by the
  registry record's own remote declaration, which marks it a required
  secret; the raw-value form — explicitly NOT `Authorization: Bearer` —
  and the env forwarding are reconstructions). When unset, no key header
  is sent. Both branches, plus the never-Bearer branch, are tested.
- Error rendering `sportstax error:` text for upstream failures —
  labelled reconstruction.
- Upstream results pass through verbatim, including `isError` and extra
  fields. tools/call is forwarded as streamable-HTTP JSON-RPC:
  initialize (protocolVersion `2025-03-26`) → notifications/initialized →
  tools/call, honouring `Mcp-Session-Id` when issued; plain-JSON and SSE
  replies are both parsed. The forwarding core takes an injectable fetch;
  tests stub the upstream — no live network calls in tests.

## Deviations

None from the task brief. TEMPLATE.md §2 item 12's McpServer+zod pattern
was overridden by the task instruction in favour of the low-level Server
API with fixture-generated literals, as in the reference build.

## Lockfile

- Route: **Route 3** — generated clean from birth in the build dir with
  no `node_modules` and no pre-existing lockfile:
  `npm install --package-lock-only --ignore-scripts --offline`.
- Parses as JSON; `name` == `@reneturcios/sportstax`.
- Package entries: **128**.
- sha256: `572f588a9835363307830c6536a66f35d78525a28062179241b61b0236beba02`
  (re-verified unchanged after the subsequent offline `npm install`).

## server.json

- Description exactly: "Pro athlete tax calculators for the NHL, NFL, MLB and NBA: seasons, moves and salary equivalents." — **97 characters**.
- npm package entry carries `"version": "0.1.0"`; the OCI entry
  (`ghcr.io/cloudcorprecords/sportstax:0.1.0`) carries **no** `version`
  field. Dockerfile (node:20-alpine, both stages) carries the label
  `io.modelcontextprotocol.server.name="io.github.CloudCorpRecords/sportstax"`.
  Container workflow `IMAGE` is `ghcr.io/cloudcorprecords/sportstax` and
  its smoke test asserts the server name `sportstax`.

## Verification (all run 2026-10-28)

1. `npx tsc --noEmit` → exit 0.
2. `npm run build` → exit 0; real `dist/` produced (cli, forward, index,
   mcp, types — .js, .d.ts, .js.map each).
3. `node dist/cli.js --version` → `0.1.0`; unknown subcommand → Usage on
   stderr, exit 2.
4. `npm test` → **60 tests, 60 pass, 0 fail** (registration-integrity
   suite deep-equals the served tools/list against the fixture's 14 tools
   in order, plus per-group required fields, NFL-only properties, session
   handling/reuse, env override, key-header present/absent/blank and
   never-Bearer branches, verbatim argument forwarding and result
   pass-through including upstream isError, SSE parsing, error rendering,
   MCP-layer validation, and CLI behaviour). Fake-fetch only; no live
   upstream calls.
5. Parity: `python3 harness/parity.py --original
   harness/fixtures/jocktaxes-tools-original.json --rebuild
   "stdio:node builds/sportstax/dist/cli.js mcp" --out
   builds/sportstax/parity-out` → **verdict PASS, parity 100.0**
   (14/14 identical, 0 missing, 0 extra, no schema diffs). Output in
   `parity-out/`.
