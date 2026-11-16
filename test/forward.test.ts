import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import {
  SportstaxClient,
  callTool,
  createClient,
  DEFAULT_ENDPOINT_URL,
  isKnownTool,
  parseRpcBody,
  PROTOCOL_VERSION,
  TOOL_DEFS,
  TOOL_NAMES,
  VERSION,
} from "../src/forward.js";
import { handleCallTool } from "../src/mcp.js";
import type {
  FetchFn,
  FetchResponseLike,
  ToolDef,
  ToolResult,
} from "../src/types.js";

/**
 * Every test runs against a stubbed JSON-RPC upstream that
 * implements the streamable-HTTP session flow
 * (initialize -> notifications/initialized -> tools/call):
 * no live network, and the real Jock Taxes endpoint is
 * never contacted.
 */

const FIXTURE_URL = new URL(
  "../../../harness/fixtures/jocktaxes-tools-original.json",
  import.meta.url,
);
const FIXTURE_AVAILABLE = existsSync(FIXTURE_URL);
const fixture = (
  FIXTURE_AVAILABLE
    ? JSON.parse(readFileSync(FIXTURE_URL, "utf-8"))
    : { tools: [] }
) as {
  tools: ToolDef[];
};
/**
 * Publish-survival guard (Wave 25 preflight, proven Wave 24 pattern):
 * the parity fixture lives in the build harness, outside the published
 * repo tree, so fixture-dependent tests skip cleanly when it is absent;
 * with the fixture present they run in full, with no skips.
 */
function skipWithoutFixture(t: {
  skip: (message: string) => void;
}): boolean {
  if (FIXTURE_AVAILABLE) return false;
  t.skip("parity fixture lives in the build harness, not the repo tree");
  return true;
}

/** Recursively strip `description` fields (tool- and parameter-level).
 * Ruling 1 (2026-11-04): the served tools carry parameter descriptions
 * added over the original capture; everything else must match exactly. */
function stripDescriptions(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripDescriptions);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k !== "description") out[k] = stripDescriptions(v);
    }
    return out;
  }
  return value;
}


const NHL_TAX = "calculate_nhl_tax";
const NHL_EQ = "equivalent_nhl_salary";
const NHL_MOVE = "player_movement_nhl";
const NFL_TAX = "calculate_nfl_tax";
const PLAYERS = "list_team_players";
const INPUTS = "list_tax_calculator_inputs";
const ALL_TOOLS = [
  "calculate_nhl_tax",
  "equivalent_nhl_salary",
  "player_movement_nhl",
  "calculate_nfl_tax",
  "equivalent_nfl_salary",
  "player_movement_nfl",
  "calculate_mlb_tax",
  "equivalent_mlb_salary",
  "player_movement_mlb",
  "calculate_nba_tax",
  "equivalent_nba_salary",
  "player_movement_nba",
  "list_team_players",
  "list_tax_calculator_inputs",
];

const SAMPLE_RESULT = {
  content: [{ type: "text", text: "{\"amounts\":{\"total\":123456}}" }],
  structuredContent: { amounts: { total: 123456 } },
};

interface Captured {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

interface FakeOptions {
  callResult?: Record<string, unknown>;
  callBodyText?: string;
  callError?: Record<string, unknown>;
  callStatus?: number;
  initError?: Record<string, unknown>;
  throwOn?: "initialize" | "tools/call";
  sessionId?: string | null;
  hangOnCall?: boolean;
  sse?: boolean;
}

function makeResponse(
  status: number,
  bodyText: string,
  headers: Record<string, string> = {},
): FetchResponseLike {
  const lowered = new Map(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => lowered.get(name.toLowerCase()) ?? null },
    text: async () => bodyText,
  };
}

function jsonResponse(
  status: number,
  payload: unknown,
  headers: Record<string, string> = {},
) {
  return makeResponse(status, JSON.stringify(payload), headers);
}

function makeUpstream(options: FakeOptions = {}): {
  fetchFn: FetchFn;
  calls: Captured[];
} {
  const calls: Captured[] = [];
  const fetchFn: FetchFn = async (url, init) => {
    const body = JSON.parse(init?.body ?? "{}") as Record<string, unknown>;
    calls.push({ url, headers: init?.headers ?? {}, body });
    const method = body.method as string;
    if (options.throwOn === method) throw new Error("socket hang up");
    if (method === "initialize") {
      if (options.initError !== undefined) {
        return jsonResponse(200, {
          jsonrpc: "2.0",
          id: body.id,
          error: options.initError,
        });
      }
      const headers: Record<string, string> = {};
      const sessionId =
        options.sessionId === undefined ? "sess-xyz" : options.sessionId;
      if (sessionId !== null) headers["mcp-session-id"] = sessionId;
      return jsonResponse(
        200,
        {
          jsonrpc: "2.0",
          id: body.id,
          result: {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {},
            serverInfo: { name: "jocktaxes", version: "1.0.0" },
          },
        },
        headers,
      );
    }
    if (method === "notifications/initialized") {
      return makeResponse(202, "");
    }
    if (method === "tools/call") {
      if (options.hangOnCall) {
        return new Promise<FetchResponseLike>((_resolve, reject) => {
          const signal = init?.signal;
          if (signal) {
            if (signal.aborted) {
              reject(new Error("aborted"));
              return;
            }
            signal.addEventListener("abort", () => reject(new Error("aborted")));
          }
        });
      }
      if (options.callBodyText !== undefined) {
        return makeResponse(options.callStatus ?? 200, options.callBodyText);
      }
      if (options.callError !== undefined) {
        return jsonResponse(200, {
          jsonrpc: "2.0",
          id: body.id,
          error: options.callError,
        });
      }
      const result = options.callResult ?? SAMPLE_RESULT;
      const payload = { jsonrpc: "2.0", id: body.id, result };
      if (options.sse) {
        return makeResponse(
          200,
          `event: message\ndata: ${JSON.stringify(payload)}\n\n`,
        );
      }
      return jsonResponse(options.callStatus ?? 200, payload);
    }
    return jsonResponse(200, {});
  };
  return { fetchFn, calls };
}

function stubClient(options: FakeOptions = {}, extra: Record<string, unknown> = {}) {
  const upstream = makeUpstream(options);
  const c = new SportstaxClient({
    fetchFn: upstream.fetchFn,
    env: {},
    ...extra,
  });
  return { client: c, calls: upstream.calls };
}

function textOf(result: ToolResult): string {
  const content = result.content as Array<{ type: string; text: string }>;
  return content[0].text;
}

function methods(calls: Captured[]): string[] {
  return calls.map((c) => c.body.method as string);
}

function schemaOf(tool: ToolDef): Record<string, any> {
  return tool.inputSchema as Record<string, any>;
}

/* ------------------------------------------------------------------ */

describe("registration integrity (captured surface)", () => {
  it("serves exactly the fixture's 14 tools, deep-equal, in order", (t) => {
    if (skipWithoutFixture(t)) return;
    assert.equal(fixture.tools.length, 14);
    assert.deepEqual(stripDescriptions(TOOL_DEFS), stripDescriptions(fixture.tools));
  });

  it("serves the 14 tool names in fixture order", () => {
    assert.deepEqual(TOOL_NAMES, ALL_TOOLS);
  });

  it("carries exactly the fixture's keys on each tool", () => {
    for (const tool of TOOL_DEFS) {
      assert.deepEqual(Object.keys(tool).sort(), [
        "description",
        "inputSchema",
        "name",
        "title",
      ]);
    }
  });

  it("carries the fixture's tool titles verbatim", (t) => {
    if (skipWithoutFixture(t)) return;
    assert.deepEqual(
      TOOL_DEFS.map((t) => t.title),
      fixture.tools.map((t) => t.title),
    );
    assert.equal(TOOL_DEFS[0].title, "Calculate NHL tax");
    assert.equal(TOOL_DEFS[12].title, "List team players");
    assert.equal(TOOL_DEFS[13].title, "List calculator inputs");
  });

  it("carries the required fields exactly as captured, per group", () => {
    const byName = new Map(TOOL_DEFS.map((t) => [t.name, schemaOf(t)]));
    for (const league of ["nhl", "nfl", "mlb", "nba"]) {
      assert.deepEqual(byName.get(`calculate_${league}_tax`)?.required, ["team"]);
      assert.deepEqual(byName.get(`equivalent_${league}_salary`)?.required, [
        "baseline_team",
        "comparison_team",
      ]);
      assert.deepEqual(byName.get(`player_movement_${league}`)?.required, [
        "from_team",
        "to_team",
      ]);
    }
    assert.deepEqual(byName.get(PLAYERS)?.required, ["league", "team", "season_id"]);
  });

  it("carries no required key on list_tax_calculator_inputs", () => {
    const schema = schemaOf(TOOL_DEFS[13]);
    assert.equal(TOOL_DEFS[13].name, INPUTS);
    assert.equal("required" in schema, false);
    assert.equal(schema.required, undefined);
    assert.deepEqual(schema.properties, {});
  });

  it("carries the schema-level title on every tool's inputSchema", () => {
    assert.deepEqual(
      TOOL_DEFS.map((t) => schemaOf(t).title),
      ALL_TOOLS.map((n) => `${n}Arguments`),
    );
    for (const tool of TOOL_DEFS) assert.equal(schemaOf(tool).type, "object");
  });

  it("carries every fixture property, in order, for all 14 tools", (t) => {
    if (skipWithoutFixture(t)) return;
    for (let i = 0; i < 14; i += 1) {
      const served = Object.keys(schemaOf(TOOL_DEFS[i]).properties);
      const expected = Object.keys(schemaOf(fixture.tools[i]).properties);
      assert.deepEqual(served, expected);
    }
  });

  it("carries the NHL calculator's team and filing_status shapes verbatim", () => {
    const props = schemaOf(TOOL_DEFS[0]).properties;
    assert.equal(props.team.type, "string");
    assert.equal(props.team.title, "Team");
    assert.deepEqual(props.filing_status.anyOf, [
      { enum: ["Single", "Married_Joint"], type: "string" },
      { type: "null" },
    ]);
    assert.equal(props.filing_status.default, null);
    assert.equal(props.include_performance_bonus_in_jock_tax.default, false);
    assert.equal(props.art_xvi4_inducement_sb.default, false);
  });

  it("carries the NFL-only pay buckets on the NFL trio and nowhere else", () => {
    for (const tool of TOOL_DEFS) {
      const props = Object.keys(schemaOf(tool).properties);
      const hasBuckets =
        props.includes("other_duty_day_pay") && props.includes("other_inducement_pay");
      assert.equal(hasBuckets, tool.name.includes("nfl"));
    }
  });

  it("carries list_team_players' three string arguments verbatim", () => {
    const props = schemaOf(TOOL_DEFS[12]).properties;
    assert.deepEqual(Object.keys(props), ["league", "team", "season_id"]);
    for (const key of ["league", "team", "season_id"]) {
      assert.equal(props[key].type, "string");
    }
    assert.equal(props.season_id.title, "Season Id");
  });

  it("carries the fixture's quota wording on the two lookup tools", () => {
    assert.match(TOOL_DEFS[12].description, /Does not use request quota/);
    assert.match(TOOL_DEFS[13].description, /Does not use request quota/);
    assert.match(TOOL_DEFS[0].description, /not as tax or legal advice/);
  });

  it("isKnownTool recognises the 14 built tools and rejects others", () => {
    for (const name of ALL_TOOLS) assert.equal(isKnownTool(name), true);
    assert.equal(isKnownTool("calculate_wnba_tax"), false);
    assert.equal(isKnownTool("list_players"), false);
    assert.equal(isKnownTool(""), false);
  });
});

/* ------------------------------------------------------------------ */

describe("session establishment and reuse", () => {
  it("runs initialize, notifications/initialized, then tools/call in order", async () => {
    const { client: c, calls } = stubClient();
    const out = await c.callTool(NHL_TAX, { team: "BOS", salary: 5000000 });
    assert.equal(out.isError, undefined);
    assert.deepEqual(methods(calls), [
      "initialize",
      "notifications/initialized",
      "tools/call",
    ]);
    assert.ok(calls.every((call) => call.url === DEFAULT_ENDPOINT_URL));
    assert.equal(DEFAULT_ENDPOINT_URL, "https://jocktaxes.com/mcp");
    for (const call of calls) {
      assert.equal(call.headers["Content-Type"], "application/json");
      assert.equal(call.headers["Accept"], "application/json, text/event-stream");
    }
    assert.equal(calls[0].headers["Mcp-Session-Id"], undefined);
    assert.equal(calls[1].headers["Mcp-Session-Id"], "sess-xyz");
    assert.equal(calls[2].headers["Mcp-Session-Id"], "sess-xyz");
  });

  it("sends clientInfo name sportstax and the pinned protocol version on initialize", async () => {
    const { client: c, calls } = stubClient();
    await c.callTool(INPUTS, {});
    const initParams = calls[0].body.params as Record<string, unknown>;
    assert.equal(initParams.protocolVersion, PROTOCOL_VERSION);
    assert.equal(PROTOCOL_VERSION, "2025-03-26");
    assert.deepEqual(initParams.capabilities, {});
    assert.deepEqual(initParams.clientInfo, { name: "sportstax", version: VERSION });
  });

  it("establishes the session lazily once and reuses it on later calls", async () => {
    const { client: c, calls } = stubClient();
    await c.callTool(NHL_TAX, { team: "BOS", salary: 5000000 });
    await c.callTool(PLAYERS, { league: "NHL", team: "BOS", season_id: "20252026" });
    assert.deepEqual(methods(calls), [
      "initialize",
      "notifications/initialized",
      "tools/call",
      "tools/call",
    ]);
    assert.equal(calls[3].headers["Mcp-Session-Id"], "sess-xyz");
    assert.notEqual(calls[2].body.id, calls[3].body.id);
  });

  it("sends no session header when the upstream issues none", async () => {
    const { client: c, calls } = stubClient({ sessionId: null });
    const out = await c.callTool(NFL_TAX, { team: "DAL", salary: 9000000 });
    assert.equal(out.isError, undefined);
    assert.ok(calls.every((call) => call.headers["Mcp-Session-Id"] === undefined));
  });

  it("honours the JOCKTAXES_MCP_URL env override", async () => {
    const upstream = makeUpstream();
    const c = new SportstaxClient({
      fetchFn: upstream.fetchFn,
      env: { JOCKTAXES_MCP_URL: "https://staging.example.com/mcp" },
    });
    await c.callTool(NHL_EQ, { baseline_team: "BOS", comparison_team: "NYR" });
    assert.ok(
      upstream.calls.every((call) => call.url === "https://staging.example.com/mcp"),
    );
  });

  it("honours an explicit url override over the default endpoint", async () => {
    const upstream = makeUpstream();
    const c = createClient({
      fetchFn: upstream.fetchFn,
      env: {},
      url: "https://alt.example.com/mcp",
    });
    await c.callTool(INPUTS, {});
    assert.ok(upstream.calls.every((call) => call.url === "https://alt.example.com/mcp"));
  });

  it("prefers an explicit url override over the env override", async () => {
    const upstream = makeUpstream();
    const c = createClient({
      fetchFn: upstream.fetchFn,
      env: { JOCKTAXES_MCP_URL: "https://env.example.com/mcp" },
      url: "https://explicit.example.com/mcp",
    });
    await c.callTool(NHL_TAX, { team: "BOS", salary: 5000000 });
    assert.ok(
      upstream.calls.every((call) => call.url === "https://explicit.example.com/mcp"),
    );
  });

  it("falls back to the pinned endpoint when the env override is blank", async () => {
    const upstream = makeUpstream();
    const c = new SportstaxClient({
      fetchFn: upstream.fetchFn,
      env: { JOCKTAXES_MCP_URL: "   " },
    });
    await c.callTool(NHL_TAX, { team: "BOS", salary: 5000000 });
    assert.ok(upstream.calls.every((call) => call.url === DEFAULT_ENDPOINT_URL));
  });
});

/* ------------------------------------------------------------------ */

describe("upstream key header", () => {
  it("sends the raw X-JockTax-Api-Key on every request when JOCKTAXES_API_KEY is set", async () => {
    const upstream = makeUpstream();
    const c = new SportstaxClient({
      fetchFn: upstream.fetchFn,
      env: { JOCKTAXES_API_KEY: "jt-key-42" },
    });
    await c.callTool(NHL_TAX, { team: "BOS", salary: 5000000 });
    assert.equal(upstream.calls.length, 3);
    assert.ok(
      upstream.calls.every(
        (call) => call.headers["X-JockTax-Api-Key"] === "jt-key-42",
      ),
    );
  });

  it("never wraps the key in a Bearer Authorization header", async () => {
    const upstream = makeUpstream();
    const c = new SportstaxClient({
      fetchFn: upstream.fetchFn,
      env: { JOCKTAXES_API_KEY: "jt-key-42" },
    });
    await c.callTool(NHL_TAX, { team: "BOS", salary: 5000000 });
    assert.ok(
      upstream.calls.every((call) => call.headers["Authorization"] === undefined),
    );
  });

  it("sends no key header when JOCKTAXES_API_KEY is unset", async () => {
    const { client: c, calls } = stubClient();
    await c.callTool(NHL_TAX, { team: "BOS", salary: 5000000 });
    assert.ok(calls.every((call) => call.headers["X-JockTax-Api-Key"] === undefined));
  });

  it("sends no key header when JOCKTAXES_API_KEY is blank", async () => {
    const upstream = makeUpstream();
    const c = new SportstaxClient({
      fetchFn: upstream.fetchFn,
      env: { JOCKTAXES_API_KEY: "   " },
    });
    await c.callTool(INPUTS, {});
    assert.ok(
      upstream.calls.every((call) => call.headers["X-JockTax-Api-Key"] === undefined),
    );
  });
});

/* ------------------------------------------------------------------ */

describe("tools/call forwarding", () => {
  it("forwards a calculate_nhl_tax call verbatim", async () => {
    const { client: c, calls } = stubClient();
    const args = { team: "BOS", salary: 5000000, filing_status: "Single" };
    await c.callTool(NHL_TAX, args);
    const params = calls[2].body.params as Record<string, unknown>;
    assert.equal(params.name, NHL_TAX);
    assert.deepEqual(params.arguments, args);
  });

  it("forwards an equivalent_nhl_salary call verbatim", async () => {
    const { client: c, calls } = stubClient();
    const args = {
      baseline_team: "BOS",
      comparison_team: "NYR",
      baseline_salary: 7000000,
      tolerance: 1,
    };
    await c.callTool(NHL_EQ, args);
    const params = calls[2].body.params as Record<string, unknown>;
    assert.equal(params.name, NHL_EQ);
    assert.deepEqual(params.arguments, args);
  });

  it("forwards a player_movement_nhl call verbatim", async () => {
    const { client: c, calls } = stubClient();
    const args = { from_team: "BOS", to_team: "FLA", gross_salary: 6000000 };
    await c.callTool(NHL_MOVE, args);
    const params = calls[2].body.params as Record<string, unknown>;
    assert.equal(params.name, NHL_MOVE);
    assert.deepEqual(params.arguments, args);
  });

  it("forwards a calculate_nfl_tax call with NFL pay buckets verbatim", async () => {
    const { client: c, calls } = stubClient();
    const args = {
      team: "DAL",
      base_salary: 8000000,
      other_duty_day_pay: 250000,
      other_inducement_pay: 100000,
    };
    await c.callTool(NFL_TAX, args);
    const params = calls[2].body.params as Record<string, unknown>;
    assert.equal(params.name, NFL_TAX);
    assert.deepEqual(params.arguments, args);
  });

  it("forwards a list_team_players call verbatim", async () => {
    const { client: c, calls } = stubClient();
    const args = { league: "NHL", team: "BOS", season_id: "20252026" };
    await c.callTool(PLAYERS, args);
    const params = calls[2].body.params as Record<string, unknown>;
    assert.equal(params.name, PLAYERS);
    assert.deepEqual(params.arguments, args);
  });

  it("forwards a list_tax_calculator_inputs call with empty arguments", async () => {
    const { client: c, calls } = stubClient();
    await c.callTool(INPUTS, {});
    const params = calls[2].body.params as Record<string, unknown>;
    assert.equal(params.name, INPUTS);
    assert.deepEqual(params.arguments, {});
  });

  it("passes the upstream result through verbatim, including extra fields", async () => {
    const { client: c } = stubClient();
    const out = await c.callTool(NHL_TAX, { team: "BOS", salary: 5000000 });
    assert.deepEqual(out, SAMPLE_RESULT);
  });

  it("passes an upstream isError result through untouched", async () => {
    const upstreamResult = {
      content: [{ type: "text", text: "unknown team code" }],
      isError: true,
    };
    const { client: c } = stubClient({ callResult: upstreamResult });
    const out = await c.callTool(NHL_TAX, { team: "BOS", salary: 5000000 });
    assert.deepEqual(out, upstreamResult);
  });

  it("reads an SSE-framed tools/call response", async () => {
    const { client: c } = stubClient({ sse: true });
    const out = await c.callTool(INPUTS, {});
    assert.equal(out.isError, undefined);
    assert.deepEqual(out, SAMPLE_RESULT);
  });

  it("the one-shot callTool helper forwards under the right tool name", async () => {
    const upstream = makeUpstream();
    const out = await callTool(
      PLAYERS,
      { league: "NBA", team: "LAL", season_id: "20252026" },
      { fetchFn: upstream.fetchFn, env: {} },
    );
    assert.equal(out.isError, undefined);
    const params = upstream.calls[2].body.params as Record<string, unknown>;
    assert.equal(params.name, PLAYERS);
    assert.deepEqual(params.arguments, {
      league: "NBA",
      team: "LAL",
      season_id: "20252026",
    });
  });
});

/* ------------------------------------------------------------------ */

describe("upstream failures surface as sportstax error text", () => {
  it("maps a JSON-RPC error to `sportstax error: <message>`", async () => {
    const { client: c } = stubClient({
      callError: { code: -32000, message: "calculation failed upstream" },
    });
    const out = await c.callTool(NHL_TAX, { team: "BOS", salary: 5000000 });
    assert.equal(out.isError, true);
    assert.equal(textOf(out), "sportstax error: calculation failed upstream");
  });

  it("maps an initialize JSON-RPC error to sportstax error text", async () => {
    const { client: c } = stubClient({
      initError: { code: -32600, message: "bad initialize" },
    });
    const out = await c.callTool(NHL_TAX, { team: "BOS", salary: 5000000 });
    assert.equal(out.isError, true);
    assert.equal(textOf(out), "sportstax error: bad initialize");
  });

  it("maps an unparseable upstream response to a malformed-response error", async () => {
    const { client: c } = stubClient({ callBodyText: "<html>oops</html>" });
    const out = await c.callTool(NHL_TAX, { team: "BOS", salary: 5000000 });
    assert.equal(out.isError, true);
    assert.equal(textOf(out), "sportstax error: malformed response");
  });

  it("maps a response with no result object to a malformed-response error", async () => {
    const { client: c } = stubClient({
      callBodyText: '{"jsonrpc":"2.0","id":3,"result":null}',
    });
    const out = await c.callTool(NHL_TAX, { team: "BOS", salary: 5000000 });
    assert.equal(out.isError, true);
    assert.equal(textOf(out), "sportstax error: malformed response");
  });

  it("maps a non-2xx upstream status to sportstax error text", async () => {
    const { client: c } = stubClient({ callBodyText: "internal error", callStatus: 500 });
    const out = await c.callTool(NHL_TAX, { team: "BOS", salary: 5000000 });
    assert.equal(out.isError, true);
    assert.equal(textOf(out), "sportstax error: HTTP 500");
  });

  it("maps a throwing fetch to sportstax error text", async () => {
    const { client: c } = stubClient({ throwOn: "tools/call" });
    const out = await c.callTool(NHL_TAX, { team: "BOS", salary: 5000000 });
    assert.equal(out.isError, true);
    assert.match(textOf(out), /^sportstax error: /);
  });

  it("maps a throwing initialize fetch to sportstax error text", async () => {
    const { client: c } = stubClient({ throwOn: "initialize" });
    const out = await c.callTool(NHL_TAX, { team: "BOS", salary: 5000000 });
    assert.equal(out.isError, true);
    assert.equal(textOf(out), "sportstax error: socket hang up");
  });

  it("maps a timed-out call to sportstax error text", async () => {
    const { client: c } = stubClient({ hangOnCall: true }, { timeoutMs: 20 });
    const out = await c.callTool(NHL_TAX, { team: "BOS", salary: 5000000 });
    assert.equal(out.isError, true);
    assert.match(textOf(out), /^sportstax error: /);
  });
});

/* ------------------------------------------------------------------ */

describe("parseRpcBody", () => {
  it("parses plain JSON and picks the message with the matching id", () => {
    const body = '{"jsonrpc":"2.0","id":7,"result":{"ok":true}}';
    assert.deepEqual(parseRpcBody(body, 7), {
      jsonrpc: "2.0",
      id: 7,
      result: { ok: true },
    });
  });

  it("parses SSE data lines", () => {
    const body =
      'event: message\ndata: {"jsonrpc":"2.0","id":2,"result":{"ok":true}}\n\n';
    assert.deepEqual(parseRpcBody(body, 2), {
      jsonrpc: "2.0",
      id: 2,
      result: { ok: true },
    });
  });

  it("picks the matching id among several SSE messages", () => {
    const body =
      'data: {"jsonrpc":"2.0","id":1,"result":{"n":1}}\n\n' +
      'data: {"jsonrpc":"2.0","id":2,"result":{"n":2}}\n\n';
    assert.deepEqual(parseRpcBody(body, 2), {
      jsonrpc: "2.0",
      id: 2,
      result: { n: 2 },
    });
  });

  it("ignores the SSE [DONE] sentinel", () => {
    const body =
      'data: {"jsonrpc":"2.0","id":4,"result":{"ok":true}}\ndata: [DONE]\n';
    assert.deepEqual(parseRpcBody(body, 4), {
      jsonrpc: "2.0",
      id: 4,
      result: { ok: true },
    });
  });

  it("returns null for empty and unparseable bodies", () => {
    assert.equal(parseRpcBody(""), null);
    assert.equal(parseRpcBody("not json at all"), null);
    assert.equal(parseRpcBody("[1,2,3]"), null);
  });
});

/* ------------------------------------------------------------------ */

describe("MCP layer validation", () => {
  it("rejects an unknown tool with MethodNotFound before any network hop", async () => {
    const upstream = makeUpstream();
    const c = createClient({ fetchFn: upstream.fetchFn, env: {} });
    await assert.rejects(
      () => handleCallTool(c, "not_a_tool", {}),
      (err: unknown) =>
        err instanceof McpError && err.code === ErrorCode.MethodNotFound,
    );
    assert.equal(upstream.calls.length, 0);
  });

  it("rejects array arguments with InvalidParams before any network hop", async () => {
    const upstream = makeUpstream();
    const c = createClient({ fetchFn: upstream.fetchFn, env: {} });
    await assert.rejects(
      () => handleCallTool(c, NHL_TAX, ["nope"]),
      (err: unknown) =>
        err instanceof McpError && err.code === ErrorCode.InvalidParams,
    );
    assert.equal(upstream.calls.length, 0);
  });

  it("rejects string arguments with InvalidParams before any network hop", async () => {
    const upstream = makeUpstream();
    const c = createClient({ fetchFn: upstream.fetchFn, env: {} });
    await assert.rejects(
      () => handleCallTool(c, PLAYERS, "league=NHL"),
      (err: unknown) =>
        err instanceof McpError && err.code === ErrorCode.InvalidParams,
    );
    assert.equal(upstream.calls.length, 0);
  });

  it("forwards a valid calculate_nhl_tax call through the MCP layer unchanged", async () => {
    const upstream = makeUpstream();
    const c = createClient({ fetchFn: upstream.fetchFn, env: {} });
    const out = await handleCallTool(c, NHL_TAX, { team: "BOS", salary: 5000000 });
    assert.deepEqual(out, SAMPLE_RESULT);
    const params = upstream.calls[2].body.params as Record<string, unknown>;
    assert.deepEqual(params.arguments, { team: "BOS", salary: 5000000 });
  });

  it("forwards a valid list_team_players call through the MCP layer unchanged", async () => {
    const upstream = makeUpstream();
    const c = createClient({ fetchFn: upstream.fetchFn, env: {} });
    const out = await handleCallTool(c, PLAYERS, {
      league: "NHL",
      team: "BOS",
      season_id: "20252026",
    });
    assert.deepEqual(out, SAMPLE_RESULT);
    const params = upstream.calls[2].body.params as Record<string, unknown>;
    assert.equal(params.name, PLAYERS);
  });

  it("treats omitted arguments as an empty object", async () => {
    const upstream = makeUpstream();
    const c = createClient({ fetchFn: upstream.fetchFn, env: {} });
    const out = await handleCallTool(c, INPUTS, undefined);
    assert.deepEqual(out, SAMPLE_RESULT);
    const params = upstream.calls[2].body.params as Record<string, unknown>;
    assert.deepEqual(params.arguments, {});
  });
});

/* ------------------------------------------------------------------ */

describe("CLI", () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const cliPath = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

  function runCli(args: string[]) {
    return spawnSync(process.execPath, ["--import", "tsx", cliPath, ...args], {
      cwd: root,
      encoding: "utf8",
      timeout: 30000,
    });
  }

  it("--version prints 0.1.0 and exits 0", () => {
    const res = runCli(["--version"]);
    assert.equal(res.status, 0);
    assert.equal(res.stdout.trim(), "0.1.0");
    assert.equal(res.stdout.trim(), VERSION);
  });

  it("-v prints 0.1.0 and exits 0", () => {
    const res = runCli(["-v"]);
    assert.equal(res.status, 0);
    assert.equal(res.stdout.trim(), "0.1.0");
  });

  it("an unknown command prints usage on stderr and exits 2", () => {
    const res = runCli(["not-a-tool"]);
    assert.equal(res.status, 2);
    assert.match(res.stderr, /Usage:/);
  });

  it("a non-JSON argument exits 2", () => {
    const res = runCli([NHL_TAX, "not json"]);
    assert.equal(res.status, 2);
  });

  it("a JSON array argument exits 2", () => {
    const res = runCli([NHL_TAX, "[]"]);
    assert.equal(res.status, 2);
  });

  it("extra arguments after mcp exit 2", () => {
    const res = runCli(["mcp", "extra"]);
    assert.equal(res.status, 2);
  });
});
