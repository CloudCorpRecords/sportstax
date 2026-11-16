# sportstax

A professional athlete's pay is taxed in every jurisdiction they play in, and the difference between two teams' offers is rarely the headline salary. sportstax is a small local bridge to the hosted Jock Taxes MCP service: it calculates the tax on one season in the NHL, NFL, MLB or NBA, works out what gross salary on another team would leave the player equally well off, compares a move between two teams at the same pay, lists a team's players and their pay from the published salary tables, and lists the leagues, seasons, filing statuses and team codes the calculators accept.

No tax figure is worked out on your own machine. This package answers `tools/list` locally from the captured tool definitions and forwards every `tools/call` to the hosted service over a streamable-HTTP JSON-RPC session, returning whatever the service sends back unchanged.

## The tools

The fourteen tools fall into four groups. For each league — NHL, NFL, MLB and NBA — there are three calculators, and two shared lookup tools sit alongside them.

- **`calculate_<league>_tax`** (`calculate_nhl_tax`, `calculate_nfl_tax`, `calculate_mlb_tax`, `calculate_nba_tax`) — Calculates the tax for one season with one team. Requires `team`; supply either a single season total (`salary`) or a `base_salary` together with optional signing and performance bonuses, mirroring the service's two input forms. Filing status defaults to Single, and take-home figures (payroll taxes, agent fee, retirement or RCA contributions) are available when the matching options are sent. The NFL calculator additionally accepts `other_duty_day_pay` and `other_inducement_pay`.
- **`equivalent_<league>_salary`** (`equivalent_nhl_salary`, `equivalent_nfl_salary`, `equivalent_mlb_salary`, `equivalent_nba_salary`) — Given a known salary on a `baseline_team`, solves for the gross salary on a `comparison_team` that matches its after-tax income, within an optional dollar `tolerance`.
- **`player_movement_<league>`** (`player_movement_nhl`, `player_movement_nfl`, `player_movement_mlb`, `player_movement_nba`) — Compares after-tax income when a player moves `from_team` to `to_team` at the same gross pay.
- **`list_team_players`** — Lists player ids and pay for one team and season from the salary tables. Requires `league`, `team` and `season_id`.
- **`list_tax_calculator_inputs`** — Lists the leagues, seasons, filing statuses and team codes the calculators accept. Takes no arguments.

The calculators are computations over figures the caller supplies: they file nothing, pay nothing and submit nothing, and their results are calculations, not tax or legal advice. No tool in this surface buys anything, starts a subscription, checks out, or creates an API key.

## Install and run

As an MCP server via npm:

```bash
npx -y @reneturcios/sportstax mcp
```

MCP client configuration:

```json
{
  "mcpServers": {
    "sportstax": {
      "command": "npx",
      "args": ["-y", "@reneturcios/sportstax", "mcp"]
    }
  }
}
```

As a container:

```bash
docker run -i ghcr.io/cloudcorprecords/sportstax
docker run --rm ghcr.io/cloudcorprecords/sportstax list_team_players '{"league":"NHL","team":"BOS","season_id":"20252026"}'
```

## CLI

One binary serves both the command line and the MCP server. Each tool is a subcommand taking a single JSON string with that tool's arguments:

```bash
sportstax calculate_nhl_tax '{"team":"BOS","salary":5000000}'
sportstax equivalent_nba_salary '{"baseline_team":"LAL","comparison_team":"MIA","baseline_salary":10000000}'
sportstax player_movement_mlb '{"from_team":"NYY","to_team":"HOU","gross_salary":8000000}'
sportstax list_tax_calculator_inputs '{}'
sportstax --version
```

Exit codes: `0` when the forwarded call succeeds, `1` when the upstream result is an error, and `2` for usage problems such as an unknown subcommand or a malformed JSON argument.

## Configuration

- `JOCKTAXES_MCP_URL` — Overrides the upstream endpoint. The default is the pinned hosted endpoint, `https://jocktaxes.com/mcp`. (The override variable is a reconstruction added by this rebuild.)
- `JOCKTAXES_API_KEY` — When set, its value is sent to the upstream on every request as an `X-JockTax-Api-Key: <value>` header, holding the raw key. When it is not set, no key header is sent at all, matching the keyless behaviour the tool surface was captured with. (The header name is pinned by the hosted service's registry record, which declares it a required secret; the raw-value form and the variable name are reconstructions, since the capture was taken without a key.)

Upstream failures — a JSON-RPC error from the service, a non-2xx response, an unreadable body, or a request that fails outright — are reported to the caller as an error result whose text starts with `sportstax error:`.

## How forwarding works

The first forwarded call opens a session: an `initialize` request (protocol version `2025-03-26`), followed by a `notifications/initialized` notification, then the `tools/call` itself. If the service answers the initialize request with an `Mcp-Session-Id` header, that value is carried on every later request, and the open session is reused for the rest of the process. Replies are accepted either as plain JSON or as server-sent events. Successful results pass through verbatim, including any `isError` flag and any extra fields the service includes.

## Development

```bash
npm install
npm run build   # tsc -> dist/ (dist/cli.js is the bin)
npm test        # tsx --test test/*.test.ts — stubbed upstream, no network
npm run dev     # run the CLI from source
```

The test suite checks the served tool list against the captured surface tool by tool, exercises the session handshake and its reuse, covers both key-header branches, and verifies that arguments go upstream untouched and results come back untouched.

## License

MIT — see `LICENSE`. Copyright (c) 2026 Rene Turcios.
