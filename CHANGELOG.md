# Changelog

## 0.1.0 (2026-10-28)

- First release: a forwarding client for the hosted Jock Taxes MCP server. The fourteen captured tools are answered locally for tools/list, and every tools/call is forwarded upstream over a streamable-HTTP JSON-RPC session (initialize, notifications/initialized, tools/call, honouring the Mcp-Session-Id header when the upstream issues one).
- Tools: per league (NHL, NFL, MLB, NBA) a season tax calculator, an equivalent-salary solver and a player-movement comparison — `calculate_nhl_tax`, `equivalent_nhl_salary`, `player_movement_nhl`, `calculate_nfl_tax`, `equivalent_nfl_salary`, `player_movement_nfl`, `calculate_mlb_tax`, `equivalent_mlb_salary`, `player_movement_mlb`, `calculate_nba_tax`, `equivalent_nba_salary`, `player_movement_nba` — plus `list_team_players` and `list_tax_calculator_inputs`. The calculators compute over caller-supplied figures only: nothing is filed, paid or submitted, and no tool buys, subscribes, checks out or mints a key.
- Upstream results pass through verbatim, including the isError flag; upstream failures surface as `sportstax error:` text results.
- One bin serves the CLI (one subcommand per tool, plus `--version`) and the stdio MCP server (`mcp` subcommand). The upstream endpoint can be overridden via `JOCKTAXES_MCP_URL`; when `JOCKTAXES_API_KEY` is set it is sent as a raw-value `X-JockTax-Api-Key` header on every upstream request.
