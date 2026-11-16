/**
 * sportstax core: a forwarding client for the hosted
 * Jock Taxes MCP server.
 *
 * No tax figure is computed on this machine. tools/list
 * is answered from the literal definitions below, which
 * reproduce a live capture of the upstream server word
 * for word (name, title, description and inputSchema
 * exactly as captured, including each schema-level
 * `title`, and the fact that only
 * `list_tax_calculator_inputs` declares no `required`
 * field and no properties). A tools/call travels
 * upstream over a streamable-HTTP JSON-RPC session: an
 * initialize POST, a notifications/initialized POST,
 * then the tools/call POST, carrying the
 * Mcp-Session-Id response header on later requests
 * when the upstream issues one. The session opens
 * lazily on the first forwarded call and is reused for
 * the client's lifetime.
 *
 * The endpoint is pinned to https://jocktaxes.com/mcp
 * and may be replaced with the JOCKTAXES_MCP_URL
 * environment variable (that override is a labelled
 * reconstruction). When JOCKTAXES_API_KEY is set, every
 * upstream request carries an
 * `X-JockTax-Api-Key: <key>` header holding the raw key
 * value (the header name is pinned by the registry
 * record's own remote declaration, which marks it a
 * required secret; the raw-value form and forwarding
 * the key from this env var are labelled
 * reconstructions, as the capture was taken keyless).
 * When it is unset, no key header goes out.
 *
 * A successful upstream result is returned exactly as
 * received, isError flag and extra fields included.
 * Failures — an upstream JSON-RPC error, a non-2xx
 * status, a body that cannot be parsed, or a fetch
 * that throws or times out — become an isError result
 * whose text begins with `sportstax error:` (that
 * rendering is a labelled reconstruction). Replies may
 * be plain JSON or SSE (`data:` lines); the JSON-RPC
 * message whose id matches the request wins.
 */
import type {
  FetchFn,
  FetchResponseLike,
  ForwardDeps,
  ToolArgs,
  ToolDef,
  ToolResult,
} from "./types.js";

export const VERSION = "0.1.0";

export const DEFAULT_ENDPOINT_URL = "https://jocktaxes.com/mcp";

export const DEFAULT_TIMEOUT_MS = 30000;

export const PROTOCOL_VERSION = "2025-03-26";

/* ------------------------------------------------------------------ */
/* Tool definitions (tools/list literals, verbatim from the live       */
/* capture in harness/fixtures/jocktaxes-tools-original.json;   */
/* generated programmatically by parsing and re-serialising the        */
/* fixture JSON, never retyped)                                        */
/* ------------------------------------------------------------------ */

export const TOOL_DEFS: ToolDef[] = [
  {
    "name": "calculate_nhl_tax",
    "title": "Calculate NHL tax",
    "description": "Calculate professional-athlete tax for one NHL season with the Jock Taxes engine. Ask the user for a missing team or salary. Do not invent team codes, seasons, salaries, or filing status. Call list_tax_calculator_inputs for allowed values. Send salary when the user has one season total taxed entirely as duty-day pay. Send base_salary plus optional signing_bonus and performance_bonus to match the site Salary + Bonuses form. Do not send salary together with base_salary or a bonus. exempt_signing_bonus_from_jock_tax defaults to true for a split, so the signing bonus is taxed only in the player's domicile. performance_bonus is included only when include_performance_bonus_in_jock_tax is true. art_xvi4_inducement_sb applies to an exempt signing bonus paid by a Canadian club to a U.S. resident. Present the result as a calculation, not as tax or legal advice. Required before this call: team, and salary or base_salary. Match a player with list_team_players only after league, team, and season_id are known. Repeat inputs and defaults from the result in the reply. Results are income tax only unless the user asks for take-home: then send include_payroll_taxes, agent_fee_pct, retirement_contribution (401(k), or RRSP on a Canadian club) or rca_contribution (Canadian clubs), and report result.net_pay. Comparisons then match on net_pay.net_economic, which counts an RCA after its estimated payout tax (rca_payout_tax_rate; default 25% Canadian withholding on the US-duty-day share and the US federal marginal rate on the rest, or 25% on all of it for a US person).",
    "inputSchema": {
      "properties": {
        "team": {
          "description": "Team code, such as BOS.",
          "title": "Team",
          "type": "string"
        },
        "filing_status": {
          "anyOf": [
            {
              "enum": [
                "Single",
                "Married_Joint"
              ],
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Single or Married_Joint. Defaults to Single when omitted.",
          "title": "Filing Status"
        },
        "salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "One season total in whole dollars, taxed entirely as duty-day pay. Leave this out when sending base_salary.",
          "title": "Salary"
        },
        "base_salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Duty-day base in whole dollars before signing and performance bonuses. Send this with the bonus fields to match Salary + Bonuses. Leave it out when sending salary.",
          "title": "Base Salary"
        },
        "signing_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Signing bonus in whole dollars. The site adds this into the season total. On NFL it also includes other inducement pay.",
          "title": "Signing Bonus"
        },
        "performance_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Performance bonus in whole dollars. Included in the total only when include_performance_bonus_in_jock_tax is true.",
          "title": "Performance Bonus"
        },
        "exempt_signing_bonus_from_jock_tax": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "When true, the signing bonus is taxed in the player's domicile and left out of duty-day allocation.",
          "title": "Exempt Signing Bonus From Jock Tax"
        },
        "include_performance_bonus_in_jock_tax": {
          "default": false,
          "description": "When true, performance_bonus is part of the season total and of duty-day pay.",
          "title": "Include Performance Bonus In Jock Tax",
          "type": "boolean"
        },
        "art_xvi4_inducement_sb": {
          "default": false,
          "description": "Opt in to Canada–U.S. Treaty Art. XVI(4) on an exempt signing bonus from a Canadian club.",
          "title": "Art Xvi4 Inducement Sb",
          "type": "boolean"
        },
        "contract_season": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Contract season label, such as 2025-26.",
          "title": "Contract Season"
        },
        "season_id": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Schedule season as eight digits, such as 20252026. Defaults to the latest season for the league when omitted.",
          "title": "Season Id"
        },
        "estimated_playoff_games": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Extra postseason games. Use 0 when there are none.",
          "title": "Estimated Playoff Games"
        },
        "birth_country": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Birth country code used with is_us_person.",
          "title": "Birth Country"
        },
        "primary_domicile": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Resident tax home: a state, a city, or a mode such as local_jurisdiction. Defaults to local_jurisdiction when omitted.",
          "title": "Primary Domicile"
        },
        "include_payroll_taxes": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Opt in to employee payroll taxes for each team's employer: FICA (Social Security, Medicare, Additional Medicare) and the home state's disability or paid-leave levy for US clubs; CPP/QPP, EI and QPIP for Canadian clubs. Default false. For a Canadian resident it also applies the CPP/QPP and EI credits and the enhanced CPP/QPP deduction on the Canadian return. With any take-home option set, the response adds net_pay (net = cash take-home, net_economic = net plus the 401(k) deferral), agent_fee, retirement_contribution, and payroll_taxes when payroll is on. amounts.total stays income tax only.",
          "title": "Include Payroll Taxes"
        },
        "agent_fee_pct": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Agent fee as a percent of gross pay (0-10), treated as a non-deductible cost. Default 0.",
          "title": "Agent Fee Pct"
        },
        "retirement_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Annual retirement contribution in USD. On a US club it is a 401(k) elective deferral capped at the 2026 limit ($24,500 plus catch-up). On a Canadian club it is an RRSP contribution capped at C$33,810, deducted from Canadian taxable income only. Default 0.",
          "title": "Retirement Contribution"
        },
        "retirement_contribution_type": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "401(k) only: pretax (default) lowers income-tax wages except in Pennsylvania, Philadelphia, Pittsburgh, Ohio cities, Kansas City and St. Louis; roth lowers nothing. RRSP contributions are always deductible.",
          "title": "Retirement Contribution Type"
        },
        "retirement_catch_up": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "none (default), 50_plus (+$8,000) or 60_to_63 (+$11,250). Catch-up contributions are always Roth for athletes (prior-year FICA wages over $150,000).",
          "title": "Retirement Catch Up"
        },
        "rca_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Salary deferred into a Retirement Compensation Arrangement by a Canadian club, in USD. Excluded from Canadian employment income until paid out: from worldwide income for a Canadian resident and in full from Canadian-source pay for a non-resident (Martin v. The King, 2024 TCC 153). US tax is unchanged. Not applied for US clubs. Comparisons count it after the estimated tax at payout (see rca_payout_tax_rate). Default 0.",
          "title": "Rca Contribution"
        },
        "rca_payout_tax_rate": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Estimated tax on the RCA when it is paid out, as a percent (0-100). Default models a player who retires to a no-tax US state and draws the RCA and its refundable tax account down at once: the US-duty-day share, already taxed by the US when contributed, bears Canada's 25% non-resident withholding, and the rest bears the US federal marginal rate on it (37% for a high earner). For a US person, who pays US tax on the whole contribution now, the default is the 25% withholding alone. Lowers net_pay.net_economic, which comparisons match on.",
          "title": "Rca Payout Tax Rate"
        }
      },
      "required": [
        "team"
      ],
      "type": "object",
      "title": "calculate_nhl_taxArguments"
    }
  },
  {
    "name": "equivalent_nhl_salary",
    "title": "Match NHL after-tax salary",
    "description": "Find the gross salary on a comparison NHL team that matches the after-tax income of a known salary on a baseline team. Ask for the baseline team, comparison team, filing status, and either baseline_salary or base_salary. Do not invent team codes. Call list_tax_calculator_inputs for allowed values. Present the result as a calculation, not as tax or legal advice. Required before this call: baseline_team, comparison_team, and baseline_salary or base_salary. Match a player with list_team_players only after league, team, and season_id are known. Repeat inputs and defaults from the result in the reply. Results are income tax only unless the user asks for take-home: then send include_payroll_taxes, agent_fee_pct, retirement_contribution (401(k), or RRSP on a Canadian club) or rca_contribution (Canadian clubs), and report result.net_pay. Comparisons then match on net_pay.net_economic, which counts an RCA after its estimated payout tax (rca_payout_tax_rate; default 25% Canadian withholding on the US-duty-day share and the US federal marginal rate on the rest, or 25% on all of it for a US person).",
    "inputSchema": {
      "properties": {
        "baseline_team": {
          "description": "Team that pays the known salary.",
          "title": "Baseline Team",
          "type": "string"
        },
        "comparison_team": {
          "description": "Team whose gross pay is solved to match baseline after-tax income.",
          "title": "Comparison Team",
          "type": "string"
        },
        "filing_status": {
          "anyOf": [
            {
              "enum": [
                "Single",
                "Married_Joint"
              ],
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Single or Married_Joint. Defaults to Single when omitted.",
          "title": "Filing Status"
        },
        "baseline_salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "One season total on the baseline team, taxed entirely as duty-day pay. Leave this out when sending base_salary.",
          "title": "Baseline Salary"
        },
        "base_salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Duty-day base in whole dollars before signing and performance bonuses. Send this with the bonus fields to match Salary + Bonuses. Leave it out when sending baseline_salary.",
          "title": "Base Salary"
        },
        "signing_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Signing bonus in whole dollars. The site adds this into the season total. On NFL it also includes other inducement pay.",
          "title": "Signing Bonus"
        },
        "performance_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Performance bonus in whole dollars. Included in the total only when include_performance_bonus_in_jock_tax is true.",
          "title": "Performance Bonus"
        },
        "exempt_signing_bonus_from_jock_tax": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "When true, the signing bonus is taxed in the player's domicile and left out of duty-day allocation.",
          "title": "Exempt Signing Bonus From Jock Tax"
        },
        "include_performance_bonus_in_jock_tax": {
          "default": false,
          "description": "When true, performance_bonus is part of the season total and of duty-day pay.",
          "title": "Include Performance Bonus In Jock Tax",
          "type": "boolean"
        },
        "art_xvi4_inducement_sb": {
          "default": false,
          "description": "Opt in to Canada–U.S. Treaty Art. XVI(4) on an exempt signing bonus from a Canadian club.",
          "title": "Art Xvi4 Inducement Sb",
          "type": "boolean"
        },
        "contract_season": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Contract season label, such as 2025-26.",
          "title": "Contract Season"
        },
        "season_id": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Schedule season as eight digits, such as 20252026. Defaults to the latest season for the league when omitted.",
          "title": "Season Id"
        },
        "estimated_playoff_games": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Extra postseason games. Use 0 when there are none.",
          "title": "Estimated Playoff Games"
        },
        "birth_country": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Birth country code used with is_us_person.",
          "title": "Birth Country"
        },
        "primary_domicile": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Resident tax home: a state, a city, or a mode such as local_jurisdiction. Defaults to local_jurisdiction when omitted.",
          "title": "Primary Domicile"
        },
        "include_payroll_taxes": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Opt in to employee payroll taxes for each team's employer: FICA (Social Security, Medicare, Additional Medicare) and the home state's disability or paid-leave levy for US clubs; CPP/QPP, EI and QPIP for Canadian clubs. Default false. For a Canadian resident it also applies the CPP/QPP and EI credits and the enhanced CPP/QPP deduction on the Canadian return. With any take-home option set, the match uses net_pay.net_economic and the response adds baseline_ and comparison_ net_pay, payroll_taxes, agent_fee and retirement_contribution.",
          "title": "Include Payroll Taxes"
        },
        "agent_fee_pct": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Agent fee as a percent of gross pay (0-10), treated as a non-deductible cost. Default 0.",
          "title": "Agent Fee Pct"
        },
        "retirement_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Annual retirement contribution in USD. On a US club it is a 401(k) elective deferral capped at the 2026 limit ($24,500 plus catch-up). On a Canadian club it is an RRSP contribution capped at C$33,810, deducted from Canadian taxable income only. Default 0.",
          "title": "Retirement Contribution"
        },
        "retirement_contribution_type": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "401(k) only: pretax (default) lowers income-tax wages except in Pennsylvania, Philadelphia, Pittsburgh, Ohio cities, Kansas City and St. Louis; roth lowers nothing. RRSP contributions are always deductible.",
          "title": "Retirement Contribution Type"
        },
        "retirement_catch_up": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "none (default), 50_plus (+$8,000) or 60_to_63 (+$11,250). Catch-up contributions are always Roth for athletes (prior-year FICA wages over $150,000).",
          "title": "Retirement Catch Up"
        },
        "rca_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Salary deferred into a Retirement Compensation Arrangement by a Canadian club, in USD. Excluded from Canadian employment income until paid out: from worldwide income for a Canadian resident and in full from Canadian-source pay for a non-resident (Martin v. The King, 2024 TCC 153). US tax is unchanged. Not applied for US clubs. Comparisons count it after the estimated tax at payout (see rca_payout_tax_rate). Default 0.",
          "title": "Rca Contribution"
        },
        "rca_payout_tax_rate": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Estimated tax on the RCA when it is paid out, as a percent (0-100). Default models a player who retires to a no-tax US state and draws the RCA and its refundable tax account down at once: the US-duty-day share, already taxed by the US when contributed, bears Canada's 25% non-resident withholding, and the rest bears the US federal marginal rate on it (37% for a high earner). For a US person, who pays US tax on the whole contribution now, the default is the 25% withholding alone. Lowers net_pay.net_economic, which comparisons match on.",
          "title": "Rca Payout Tax Rate"
        },
        "comparison_primary_domicile": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Resident tax home modeled for the comparison team.",
          "title": "Comparison Primary Domicile"
        },
        "tolerance": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Dollar tolerance for the equivalent-salary search. Defaults to 1.",
          "title": "Tolerance"
        }
      },
      "required": [
        "baseline_team",
        "comparison_team"
      ],
      "type": "object",
      "title": "equivalent_nhl_salaryArguments"
    }
  },
  {
    "name": "player_movement_nhl",
    "title": "Compare NHL move",
    "description": "Compare after-tax income when a NHL player moves from one team to another at the same gross pay. Ask for the origin team, destination team, filing status, and either gross_salary or base_salary. Do not invent team codes. Call list_tax_calculator_inputs for allowed values. Present the result as a calculation, not as tax or legal advice. Required before this call: from_team, to_team, and gross_salary or base_salary. Match a player with list_team_players only after league, team, and season_id are known. Repeat inputs and defaults from the result in the reply. Results are income tax only unless the user asks for take-home: then send include_payroll_taxes, agent_fee_pct, retirement_contribution (401(k), or RRSP on a Canadian club) or rca_contribution (Canadian clubs), and report result.net_pay. Comparisons then match on net_pay.net_economic, which counts an RCA after its estimated payout tax (rca_payout_tax_rate; default 25% Canadian withholding on the US-duty-day share and the US federal marginal rate on the rest, or 25% on all of it for a US person).",
    "inputSchema": {
      "properties": {
        "from_team": {
          "description": "Team the player leaves.",
          "title": "From Team",
          "type": "string"
        },
        "to_team": {
          "description": "Team the player joins.",
          "title": "To Team",
          "type": "string"
        },
        "filing_status": {
          "anyOf": [
            {
              "enum": [
                "Single",
                "Married_Joint"
              ],
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Single or Married_Joint. Defaults to Single when omitted.",
          "title": "Filing Status"
        },
        "gross_salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "One season total, taxed entirely as duty-day pay. Leave this out when sending base_salary.",
          "title": "Gross Salary"
        },
        "base_salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Duty-day base in whole dollars before signing and performance bonuses. Send this with the bonus fields to match Salary + Bonuses. Leave it out when sending gross_salary.",
          "title": "Base Salary"
        },
        "signing_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Signing bonus in whole dollars. The site adds this into the season total. On NFL it also includes other inducement pay.",
          "title": "Signing Bonus"
        },
        "performance_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Performance bonus in whole dollars. Included in the total only when include_performance_bonus_in_jock_tax is true.",
          "title": "Performance Bonus"
        },
        "exempt_signing_bonus_from_jock_tax": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "When true, the signing bonus is taxed in the player's domicile and left out of duty-day allocation.",
          "title": "Exempt Signing Bonus From Jock Tax"
        },
        "include_performance_bonus_in_jock_tax": {
          "default": false,
          "description": "When true, performance_bonus is part of the season total and of duty-day pay.",
          "title": "Include Performance Bonus In Jock Tax",
          "type": "boolean"
        },
        "art_xvi4_inducement_sb": {
          "default": false,
          "description": "Opt in to Canada–U.S. Treaty Art. XVI(4) on an exempt signing bonus from a Canadian club.",
          "title": "Art Xvi4 Inducement Sb",
          "type": "boolean"
        },
        "contract_season": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Contract season label, such as 2025-26.",
          "title": "Contract Season"
        },
        "season_id": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Schedule season as eight digits, such as 20252026. Defaults to the latest season for the league when omitted.",
          "title": "Season Id"
        },
        "estimated_playoff_games": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Extra postseason games. Use 0 when there are none.",
          "title": "Estimated Playoff Games"
        },
        "birth_country": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Birth country code used with is_us_person.",
          "title": "Birth Country"
        },
        "primary_domicile": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Resident tax home: a state, a city, or a mode such as local_jurisdiction. Defaults to local_jurisdiction when omitted.",
          "title": "Primary Domicile"
        },
        "include_payroll_taxes": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Opt in to employee payroll taxes for each team's employer: FICA (Social Security, Medicare, Additional Medicare) and the home state's disability or paid-leave levy for US clubs; CPP/QPP, EI and QPIP for Canadian clubs. Default false. For a Canadian resident it also applies the CPP/QPP and EI credits and the enhanced CPP/QPP deduction on the Canadian return. With any take-home option set, from_after_tax and to_after_tax use net_pay.net_economic and the response adds from_ and to_ net_pay, payroll_taxes, agent_fee and retirement_contribution.",
          "title": "Include Payroll Taxes"
        },
        "agent_fee_pct": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Agent fee as a percent of gross pay (0-10), treated as a non-deductible cost. Default 0.",
          "title": "Agent Fee Pct"
        },
        "retirement_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Annual retirement contribution in USD. On a US club it is a 401(k) elective deferral capped at the 2026 limit ($24,500 plus catch-up). On a Canadian club it is an RRSP contribution capped at C$33,810, deducted from Canadian taxable income only. Default 0.",
          "title": "Retirement Contribution"
        },
        "retirement_contribution_type": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "401(k) only: pretax (default) lowers income-tax wages except in Pennsylvania, Philadelphia, Pittsburgh, Ohio cities, Kansas City and St. Louis; roth lowers nothing. RRSP contributions are always deductible.",
          "title": "Retirement Contribution Type"
        },
        "retirement_catch_up": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "none (default), 50_plus (+$8,000) or 60_to_63 (+$11,250). Catch-up contributions are always Roth for athletes (prior-year FICA wages over $150,000).",
          "title": "Retirement Catch Up"
        },
        "rca_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Salary deferred into a Retirement Compensation Arrangement by a Canadian club, in USD. Excluded from Canadian employment income until paid out: from worldwide income for a Canadian resident and in full from Canadian-source pay for a non-resident (Martin v. The King, 2024 TCC 153). US tax is unchanged. Not applied for US clubs. Comparisons count it after the estimated tax at payout (see rca_payout_tax_rate). Default 0.",
          "title": "Rca Contribution"
        },
        "rca_payout_tax_rate": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Estimated tax on the RCA when it is paid out, as a percent (0-100). Default models a player who retires to a no-tax US state and draws the RCA and its refundable tax account down at once: the US-duty-day share, already taxed by the US when contributed, bears Canada's 25% non-resident withholding, and the rest bears the US federal marginal rate on it (37% for a high earner). For a US person, who pays US tax on the whole contribution now, the default is the 25% withholding alone. Lowers net_pay.net_economic, which comparisons match on.",
          "title": "Rca Payout Tax Rate"
        },
        "comparison_primary_domicile": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Resident tax home modeled on the destination team.",
          "title": "Comparison Primary Domicile"
        }
      },
      "required": [
        "from_team",
        "to_team"
      ],
      "type": "object",
      "title": "player_movement_nhlArguments"
    }
  },
  {
    "name": "calculate_nfl_tax",
    "title": "Calculate NFL tax",
    "description": "Calculate professional-athlete tax for one NFL season with the Jock Taxes engine. Ask the user for a missing team or salary. Do not invent team codes, seasons, salaries, or filing status. Call list_tax_calculator_inputs for allowed values. Send salary when the user has one season total taxed entirely as duty-day pay. Send base_salary plus optional signing_bonus and performance_bonus to match the site Salary + Bonuses form. Do not send salary together with base_salary or a bonus. exempt_signing_bonus_from_jock_tax defaults to true for a split, so the signing bonus is taxed only in the player's domicile. performance_bonus is included only when include_performance_bonus_in_jock_tax is true. art_xvi4_inducement_sb applies to an exempt signing bonus paid by a Canadian club to a U.S. resident. Present the result as a calculation, not as tax or legal advice. Required before this call: team, and salary or base_salary. Match a player with list_team_players only after league, team, and season_id are known. Repeat inputs and defaults from the result in the reply. On NFL, other_duty_day_pay is added to the duty-day base and other_inducement_pay is added into the signing bonus. Send those with base_salary, not with a single season total. Results are income tax only unless the user asks for take-home: then send include_payroll_taxes, agent_fee_pct, retirement_contribution (401(k), or RRSP on a Canadian club) or rca_contribution (Canadian clubs), and report result.net_pay. Comparisons then match on net_pay.net_economic, which counts an RCA after its estimated payout tax (rca_payout_tax_rate; default 25% Canadian withholding on the US-duty-day share and the US federal marginal rate on the rest, or 25% on all of it for a US person).",
    "inputSchema": {
      "properties": {
        "team": {
          "description": "Team code, such as BOS.",
          "title": "Team",
          "type": "string"
        },
        "filing_status": {
          "anyOf": [
            {
              "enum": [
                "Single",
                "Married_Joint"
              ],
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Single or Married_Joint. Defaults to Single when omitted.",
          "title": "Filing Status"
        },
        "salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "One season total in whole dollars, taxed entirely as duty-day pay. Leave this out when sending base_salary.",
          "title": "Salary"
        },
        "base_salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Duty-day base in whole dollars before signing and performance bonuses. Send this with the bonus fields to match Salary + Bonuses. Leave it out when sending salary.",
          "title": "Base Salary"
        },
        "signing_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Signing bonus in whole dollars. The site adds this into the season total. On NFL it also includes other inducement pay.",
          "title": "Signing Bonus"
        },
        "performance_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Performance bonus in whole dollars. Included in the total only when include_performance_bonus_in_jock_tax is true.",
          "title": "Performance Bonus"
        },
        "exempt_signing_bonus_from_jock_tax": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "When true, the signing bonus is taxed in the player's domicile and left out of duty-day allocation.",
          "title": "Exempt Signing Bonus From Jock Tax"
        },
        "include_performance_bonus_in_jock_tax": {
          "default": false,
          "description": "When true, performance_bonus is part of the season total and of duty-day pay.",
          "title": "Include Performance Bonus In Jock Tax",
          "type": "boolean"
        },
        "other_duty_day_pay": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "NFL cash bucket added to the duty-day base before the season total is summed.",
          "title": "Other Duty Day Pay"
        },
        "other_inducement_pay": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "NFL cash bucket added into signing_bonus.",
          "title": "Other Inducement Pay"
        },
        "contract_season": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Contract season label, such as 2025-26.",
          "title": "Contract Season"
        },
        "season_id": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Schedule season as eight digits, such as 20252026. Defaults to the latest season for the league when omitted.",
          "title": "Season Id"
        },
        "estimated_playoff_games": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Extra postseason games. Use 0 when there are none.",
          "title": "Estimated Playoff Games"
        },
        "birth_country": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Birth country code used with is_us_person.",
          "title": "Birth Country"
        },
        "primary_domicile": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Resident tax home: a state, a city, or a mode such as local_jurisdiction. Defaults to local_jurisdiction when omitted.",
          "title": "Primary Domicile"
        },
        "include_payroll_taxes": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Opt in to employee payroll taxes for each team's employer: FICA (Social Security, Medicare, Additional Medicare) and the home state's disability or paid-leave levy for US clubs; CPP/QPP, EI and QPIP for Canadian clubs. Default false. For a Canadian resident it also applies the CPP/QPP and EI credits and the enhanced CPP/QPP deduction on the Canadian return. With any take-home option set, the response adds net_pay (net = cash take-home, net_economic = net plus the 401(k) deferral), agent_fee, retirement_contribution, and payroll_taxes when payroll is on. amounts.total stays income tax only.",
          "title": "Include Payroll Taxes"
        },
        "agent_fee_pct": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Agent fee as a percent of gross pay (0-10), treated as a non-deductible cost. Default 0.",
          "title": "Agent Fee Pct"
        },
        "retirement_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Annual retirement contribution in USD. On a US club it is a 401(k) elective deferral capped at the 2026 limit ($24,500 plus catch-up). On a Canadian club it is an RRSP contribution capped at C$33,810, deducted from Canadian taxable income only. Default 0.",
          "title": "Retirement Contribution"
        },
        "retirement_contribution_type": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "401(k) only: pretax (default) lowers income-tax wages except in Pennsylvania, Philadelphia, Pittsburgh, Ohio cities, Kansas City and St. Louis; roth lowers nothing. RRSP contributions are always deductible.",
          "title": "Retirement Contribution Type"
        },
        "retirement_catch_up": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "none (default), 50_plus (+$8,000) or 60_to_63 (+$11,250). Catch-up contributions are always Roth for athletes (prior-year FICA wages over $150,000).",
          "title": "Retirement Catch Up"
        },
        "rca_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Salary deferred into a Retirement Compensation Arrangement by a Canadian club, in USD. Excluded from Canadian employment income until paid out: from worldwide income for a Canadian resident and in full from Canadian-source pay for a non-resident (Martin v. The King, 2024 TCC 153). US tax is unchanged. Not applied for US clubs. Comparisons count it after the estimated tax at payout (see rca_payout_tax_rate). Default 0.",
          "title": "Rca Contribution"
        },
        "rca_payout_tax_rate": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Estimated tax on the RCA when it is paid out, as a percent (0-100). Default models a player who retires to a no-tax US state and draws the RCA and its refundable tax account down at once: the US-duty-day share, already taxed by the US when contributed, bears Canada's 25% non-resident withholding, and the rest bears the US federal marginal rate on it (37% for a high earner). For a US person, who pays US tax on the whole contribution now, the default is the 25% withholding alone. Lowers net_pay.net_economic, which comparisons match on.",
          "title": "Rca Payout Tax Rate"
        }
      },
      "required": [
        "team"
      ],
      "type": "object",
      "title": "calculate_nfl_taxArguments"
    }
  },
  {
    "name": "equivalent_nfl_salary",
    "title": "Match NFL after-tax salary",
    "description": "Find the gross salary on a comparison NFL team that matches the after-tax income of a known salary on a baseline team. Ask for the baseline team, comparison team, filing status, and either baseline_salary or base_salary. Do not invent team codes. Call list_tax_calculator_inputs for allowed values. Present the result as a calculation, not as tax or legal advice. Required before this call: baseline_team, comparison_team, and baseline_salary or base_salary. Match a player with list_team_players only after league, team, and season_id are known. Repeat inputs and defaults from the result in the reply. On NFL, other_duty_day_pay is added to the duty-day base and other_inducement_pay is added into the signing bonus. Send those with base_salary, not with a single season total. Results are income tax only unless the user asks for take-home: then send include_payroll_taxes, agent_fee_pct, retirement_contribution (401(k), or RRSP on a Canadian club) or rca_contribution (Canadian clubs), and report result.net_pay. Comparisons then match on net_pay.net_economic, which counts an RCA after its estimated payout tax (rca_payout_tax_rate; default 25% Canadian withholding on the US-duty-day share and the US federal marginal rate on the rest, or 25% on all of it for a US person).",
    "inputSchema": {
      "properties": {
        "baseline_team": {
          "description": "Team that pays the known salary.",
          "title": "Baseline Team",
          "type": "string"
        },
        "comparison_team": {
          "description": "Team whose gross pay is solved to match baseline after-tax income.",
          "title": "Comparison Team",
          "type": "string"
        },
        "filing_status": {
          "anyOf": [
            {
              "enum": [
                "Single",
                "Married_Joint"
              ],
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Single or Married_Joint. Defaults to Single when omitted.",
          "title": "Filing Status"
        },
        "baseline_salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "One season total on the baseline team, taxed entirely as duty-day pay. Leave this out when sending base_salary.",
          "title": "Baseline Salary"
        },
        "base_salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Duty-day base in whole dollars before signing and performance bonuses. Send this with the bonus fields to match Salary + Bonuses. Leave it out when sending baseline_salary.",
          "title": "Base Salary"
        },
        "signing_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Signing bonus in whole dollars. The site adds this into the season total. On NFL it also includes other inducement pay.",
          "title": "Signing Bonus"
        },
        "performance_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Performance bonus in whole dollars. Included in the total only when include_performance_bonus_in_jock_tax is true.",
          "title": "Performance Bonus"
        },
        "exempt_signing_bonus_from_jock_tax": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "When true, the signing bonus is taxed in the player's domicile and left out of duty-day allocation.",
          "title": "Exempt Signing Bonus From Jock Tax"
        },
        "include_performance_bonus_in_jock_tax": {
          "default": false,
          "description": "When true, performance_bonus is part of the season total and of duty-day pay.",
          "title": "Include Performance Bonus In Jock Tax",
          "type": "boolean"
        },
        "other_duty_day_pay": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "NFL cash bucket added to the duty-day base before the season total is summed.",
          "title": "Other Duty Day Pay"
        },
        "other_inducement_pay": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "NFL cash bucket added into signing_bonus.",
          "title": "Other Inducement Pay"
        },
        "contract_season": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Contract season label, such as 2025-26.",
          "title": "Contract Season"
        },
        "season_id": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Schedule season as eight digits, such as 20252026. Defaults to the latest season for the league when omitted.",
          "title": "Season Id"
        },
        "estimated_playoff_games": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Extra postseason games. Use 0 when there are none.",
          "title": "Estimated Playoff Games"
        },
        "birth_country": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Birth country code used with is_us_person.",
          "title": "Birth Country"
        },
        "primary_domicile": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Resident tax home: a state, a city, or a mode such as local_jurisdiction. Defaults to local_jurisdiction when omitted.",
          "title": "Primary Domicile"
        },
        "include_payroll_taxes": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Opt in to employee payroll taxes for each team's employer: FICA (Social Security, Medicare, Additional Medicare) and the home state's disability or paid-leave levy for US clubs; CPP/QPP, EI and QPIP for Canadian clubs. Default false. For a Canadian resident it also applies the CPP/QPP and EI credits and the enhanced CPP/QPP deduction on the Canadian return. With any take-home option set, the match uses net_pay.net_economic and the response adds baseline_ and comparison_ net_pay, payroll_taxes, agent_fee and retirement_contribution.",
          "title": "Include Payroll Taxes"
        },
        "agent_fee_pct": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Agent fee as a percent of gross pay (0-10), treated as a non-deductible cost. Default 0.",
          "title": "Agent Fee Pct"
        },
        "retirement_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Annual retirement contribution in USD. On a US club it is a 401(k) elective deferral capped at the 2026 limit ($24,500 plus catch-up). On a Canadian club it is an RRSP contribution capped at C$33,810, deducted from Canadian taxable income only. Default 0.",
          "title": "Retirement Contribution"
        },
        "retirement_contribution_type": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "401(k) only: pretax (default) lowers income-tax wages except in Pennsylvania, Philadelphia, Pittsburgh, Ohio cities, Kansas City and St. Louis; roth lowers nothing. RRSP contributions are always deductible.",
          "title": "Retirement Contribution Type"
        },
        "retirement_catch_up": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "none (default), 50_plus (+$8,000) or 60_to_63 (+$11,250). Catch-up contributions are always Roth for athletes (prior-year FICA wages over $150,000).",
          "title": "Retirement Catch Up"
        },
        "rca_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Salary deferred into a Retirement Compensation Arrangement by a Canadian club, in USD. Excluded from Canadian employment income until paid out: from worldwide income for a Canadian resident and in full from Canadian-source pay for a non-resident (Martin v. The King, 2024 TCC 153). US tax is unchanged. Not applied for US clubs. Comparisons count it after the estimated tax at payout (see rca_payout_tax_rate). Default 0.",
          "title": "Rca Contribution"
        },
        "rca_payout_tax_rate": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Estimated tax on the RCA when it is paid out, as a percent (0-100). Default models a player who retires to a no-tax US state and draws the RCA and its refundable tax account down at once: the US-duty-day share, already taxed by the US when contributed, bears Canada's 25% non-resident withholding, and the rest bears the US federal marginal rate on it (37% for a high earner). For a US person, who pays US tax on the whole contribution now, the default is the 25% withholding alone. Lowers net_pay.net_economic, which comparisons match on.",
          "title": "Rca Payout Tax Rate"
        },
        "comparison_primary_domicile": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Resident tax home modeled for the comparison team.",
          "title": "Comparison Primary Domicile"
        },
        "tolerance": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Dollar tolerance for the equivalent-salary search. Defaults to 1.",
          "title": "Tolerance"
        }
      },
      "required": [
        "baseline_team",
        "comparison_team"
      ],
      "type": "object",
      "title": "equivalent_nfl_salaryArguments"
    }
  },
  {
    "name": "player_movement_nfl",
    "title": "Compare NFL move",
    "description": "Compare after-tax income when a NFL player moves from one team to another at the same gross pay. Ask for the origin team, destination team, filing status, and either gross_salary or base_salary. Do not invent team codes. Call list_tax_calculator_inputs for allowed values. Present the result as a calculation, not as tax or legal advice. Required before this call: from_team, to_team, and gross_salary or base_salary. Match a player with list_team_players only after league, team, and season_id are known. Repeat inputs and defaults from the result in the reply. On NFL, other_duty_day_pay is added to the duty-day base and other_inducement_pay is added into the signing bonus. Send those with base_salary, not with a single season total. Results are income tax only unless the user asks for take-home: then send include_payroll_taxes, agent_fee_pct, retirement_contribution (401(k), or RRSP on a Canadian club) or rca_contribution (Canadian clubs), and report result.net_pay. Comparisons then match on net_pay.net_economic, which counts an RCA after its estimated payout tax (rca_payout_tax_rate; default 25% Canadian withholding on the US-duty-day share and the US federal marginal rate on the rest, or 25% on all of it for a US person).",
    "inputSchema": {
      "properties": {
        "from_team": {
          "description": "Team the player leaves.",
          "title": "From Team",
          "type": "string"
        },
        "to_team": {
          "description": "Team the player joins.",
          "title": "To Team",
          "type": "string"
        },
        "filing_status": {
          "anyOf": [
            {
              "enum": [
                "Single",
                "Married_Joint"
              ],
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Single or Married_Joint. Defaults to Single when omitted.",
          "title": "Filing Status"
        },
        "gross_salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "One season total, taxed entirely as duty-day pay. Leave this out when sending base_salary.",
          "title": "Gross Salary"
        },
        "base_salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Duty-day base in whole dollars before signing and performance bonuses. Send this with the bonus fields to match Salary + Bonuses. Leave it out when sending gross_salary.",
          "title": "Base Salary"
        },
        "signing_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Signing bonus in whole dollars. The site adds this into the season total. On NFL it also includes other inducement pay.",
          "title": "Signing Bonus"
        },
        "performance_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Performance bonus in whole dollars. Included in the total only when include_performance_bonus_in_jock_tax is true.",
          "title": "Performance Bonus"
        },
        "exempt_signing_bonus_from_jock_tax": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "When true, the signing bonus is taxed in the player's domicile and left out of duty-day allocation.",
          "title": "Exempt Signing Bonus From Jock Tax"
        },
        "include_performance_bonus_in_jock_tax": {
          "default": false,
          "description": "When true, performance_bonus is part of the season total and of duty-day pay.",
          "title": "Include Performance Bonus In Jock Tax",
          "type": "boolean"
        },
        "other_duty_day_pay": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "NFL cash bucket added to the duty-day base before the season total is summed.",
          "title": "Other Duty Day Pay"
        },
        "other_inducement_pay": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "NFL cash bucket added into signing_bonus.",
          "title": "Other Inducement Pay"
        },
        "contract_season": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Contract season label, such as 2025-26.",
          "title": "Contract Season"
        },
        "season_id": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Schedule season as eight digits, such as 20252026. Defaults to the latest season for the league when omitted.",
          "title": "Season Id"
        },
        "estimated_playoff_games": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Extra postseason games. Use 0 when there are none.",
          "title": "Estimated Playoff Games"
        },
        "birth_country": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Birth country code used with is_us_person.",
          "title": "Birth Country"
        },
        "primary_domicile": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Resident tax home: a state, a city, or a mode such as local_jurisdiction. Defaults to local_jurisdiction when omitted.",
          "title": "Primary Domicile"
        },
        "include_payroll_taxes": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Opt in to employee payroll taxes for each team's employer: FICA (Social Security, Medicare, Additional Medicare) and the home state's disability or paid-leave levy for US clubs; CPP/QPP, EI and QPIP for Canadian clubs. Default false. For a Canadian resident it also applies the CPP/QPP and EI credits and the enhanced CPP/QPP deduction on the Canadian return. With any take-home option set, from_after_tax and to_after_tax use net_pay.net_economic and the response adds from_ and to_ net_pay, payroll_taxes, agent_fee and retirement_contribution.",
          "title": "Include Payroll Taxes"
        },
        "agent_fee_pct": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Agent fee as a percent of gross pay (0-10), treated as a non-deductible cost. Default 0.",
          "title": "Agent Fee Pct"
        },
        "retirement_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Annual retirement contribution in USD. On a US club it is a 401(k) elective deferral capped at the 2026 limit ($24,500 plus catch-up). On a Canadian club it is an RRSP contribution capped at C$33,810, deducted from Canadian taxable income only. Default 0.",
          "title": "Retirement Contribution"
        },
        "retirement_contribution_type": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "401(k) only: pretax (default) lowers income-tax wages except in Pennsylvania, Philadelphia, Pittsburgh, Ohio cities, Kansas City and St. Louis; roth lowers nothing. RRSP contributions are always deductible.",
          "title": "Retirement Contribution Type"
        },
        "retirement_catch_up": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "none (default), 50_plus (+$8,000) or 60_to_63 (+$11,250). Catch-up contributions are always Roth for athletes (prior-year FICA wages over $150,000).",
          "title": "Retirement Catch Up"
        },
        "rca_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Salary deferred into a Retirement Compensation Arrangement by a Canadian club, in USD. Excluded from Canadian employment income until paid out: from worldwide income for a Canadian resident and in full from Canadian-source pay for a non-resident (Martin v. The King, 2024 TCC 153). US tax is unchanged. Not applied for US clubs. Comparisons count it after the estimated tax at payout (see rca_payout_tax_rate). Default 0.",
          "title": "Rca Contribution"
        },
        "rca_payout_tax_rate": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Estimated tax on the RCA when it is paid out, as a percent (0-100). Default models a player who retires to a no-tax US state and draws the RCA and its refundable tax account down at once: the US-duty-day share, already taxed by the US when contributed, bears Canada's 25% non-resident withholding, and the rest bears the US federal marginal rate on it (37% for a high earner). For a US person, who pays US tax on the whole contribution now, the default is the 25% withholding alone. Lowers net_pay.net_economic, which comparisons match on.",
          "title": "Rca Payout Tax Rate"
        },
        "comparison_primary_domicile": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Resident tax home modeled on the destination team.",
          "title": "Comparison Primary Domicile"
        }
      },
      "required": [
        "from_team",
        "to_team"
      ],
      "type": "object",
      "title": "player_movement_nflArguments"
    }
  },
  {
    "name": "calculate_mlb_tax",
    "title": "Calculate MLB tax",
    "description": "Calculate professional-athlete tax for one MLB season with the Jock Taxes engine. Ask the user for a missing team or salary. Do not invent team codes, seasons, salaries, or filing status. Call list_tax_calculator_inputs for allowed values. Send salary when the user has one season total taxed entirely as duty-day pay. Send base_salary plus optional signing_bonus and performance_bonus to match the site Salary + Bonuses form. Do not send salary together with base_salary or a bonus. exempt_signing_bonus_from_jock_tax defaults to true for a split, so the signing bonus is taxed only in the player's domicile. performance_bonus is included only when include_performance_bonus_in_jock_tax is true. art_xvi4_inducement_sb applies to an exempt signing bonus paid by a Canadian club to a U.S. resident. Present the result as a calculation, not as tax or legal advice. Required before this call: team, and salary or base_salary. Match a player with list_team_players only after league, team, and season_id are known. Repeat inputs and defaults from the result in the reply. Results are income tax only unless the user asks for take-home: then send include_payroll_taxes, agent_fee_pct, retirement_contribution (401(k), or RRSP on a Canadian club) or rca_contribution (Canadian clubs), and report result.net_pay. Comparisons then match on net_pay.net_economic, which counts an RCA after its estimated payout tax (rca_payout_tax_rate; default 25% Canadian withholding on the US-duty-day share and the US federal marginal rate on the rest, or 25% on all of it for a US person).",
    "inputSchema": {
      "properties": {
        "team": {
          "description": "Team code, such as BOS.",
          "title": "Team",
          "type": "string"
        },
        "filing_status": {
          "anyOf": [
            {
              "enum": [
                "Single",
                "Married_Joint"
              ],
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Single or Married_Joint. Defaults to Single when omitted.",
          "title": "Filing Status"
        },
        "salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "One season total in whole dollars, taxed entirely as duty-day pay. Leave this out when sending base_salary.",
          "title": "Salary"
        },
        "base_salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Duty-day base in whole dollars before signing and performance bonuses. Send this with the bonus fields to match Salary + Bonuses. Leave it out when sending salary.",
          "title": "Base Salary"
        },
        "signing_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Signing bonus in whole dollars. The site adds this into the season total. On NFL it also includes other inducement pay.",
          "title": "Signing Bonus"
        },
        "performance_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Performance bonus in whole dollars. Included in the total only when include_performance_bonus_in_jock_tax is true.",
          "title": "Performance Bonus"
        },
        "exempt_signing_bonus_from_jock_tax": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "When true, the signing bonus is taxed in the player's domicile and left out of duty-day allocation.",
          "title": "Exempt Signing Bonus From Jock Tax"
        },
        "include_performance_bonus_in_jock_tax": {
          "default": false,
          "description": "When true, performance_bonus is part of the season total and of duty-day pay.",
          "title": "Include Performance Bonus In Jock Tax",
          "type": "boolean"
        },
        "art_xvi4_inducement_sb": {
          "default": false,
          "description": "Opt in to Canada–U.S. Treaty Art. XVI(4) on an exempt signing bonus from a Canadian club.",
          "title": "Art Xvi4 Inducement Sb",
          "type": "boolean"
        },
        "contract_season": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Contract season label, such as 2025-26.",
          "title": "Contract Season"
        },
        "season_id": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Schedule season as eight digits, such as 20252026. Defaults to the latest season for the league when omitted.",
          "title": "Season Id"
        },
        "estimated_playoff_games": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Extra postseason games. Use 0 when there are none.",
          "title": "Estimated Playoff Games"
        },
        "birth_country": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Birth country code used with is_us_person.",
          "title": "Birth Country"
        },
        "primary_domicile": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Resident tax home: a state, a city, or a mode such as local_jurisdiction. Defaults to local_jurisdiction when omitted.",
          "title": "Primary Domicile"
        },
        "include_payroll_taxes": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Opt in to employee payroll taxes for each team's employer: FICA (Social Security, Medicare, Additional Medicare) and the home state's disability or paid-leave levy for US clubs; CPP/QPP, EI and QPIP for Canadian clubs. Default false. For a Canadian resident it also applies the CPP/QPP and EI credits and the enhanced CPP/QPP deduction on the Canadian return. With any take-home option set, the response adds net_pay (net = cash take-home, net_economic = net plus the 401(k) deferral), agent_fee, retirement_contribution, and payroll_taxes when payroll is on. amounts.total stays income tax only.",
          "title": "Include Payroll Taxes"
        },
        "agent_fee_pct": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Agent fee as a percent of gross pay (0-10), treated as a non-deductible cost. Default 0.",
          "title": "Agent Fee Pct"
        },
        "retirement_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Annual retirement contribution in USD. On a US club it is a 401(k) elective deferral capped at the 2026 limit ($24,500 plus catch-up). On a Canadian club it is an RRSP contribution capped at C$33,810, deducted from Canadian taxable income only. Default 0.",
          "title": "Retirement Contribution"
        },
        "retirement_contribution_type": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "401(k) only: pretax (default) lowers income-tax wages except in Pennsylvania, Philadelphia, Pittsburgh, Ohio cities, Kansas City and St. Louis; roth lowers nothing. RRSP contributions are always deductible.",
          "title": "Retirement Contribution Type"
        },
        "retirement_catch_up": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "none (default), 50_plus (+$8,000) or 60_to_63 (+$11,250). Catch-up contributions are always Roth for athletes (prior-year FICA wages over $150,000).",
          "title": "Retirement Catch Up"
        },
        "rca_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Salary deferred into a Retirement Compensation Arrangement by a Canadian club, in USD. Excluded from Canadian employment income until paid out: from worldwide income for a Canadian resident and in full from Canadian-source pay for a non-resident (Martin v. The King, 2024 TCC 153). US tax is unchanged. Not applied for US clubs. Comparisons count it after the estimated tax at payout (see rca_payout_tax_rate). Default 0.",
          "title": "Rca Contribution"
        },
        "rca_payout_tax_rate": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Estimated tax on the RCA when it is paid out, as a percent (0-100). Default models a player who retires to a no-tax US state and draws the RCA and its refundable tax account down at once: the US-duty-day share, already taxed by the US when contributed, bears Canada's 25% non-resident withholding, and the rest bears the US federal marginal rate on it (37% for a high earner). For a US person, who pays US tax on the whole contribution now, the default is the 25% withholding alone. Lowers net_pay.net_economic, which comparisons match on.",
          "title": "Rca Payout Tax Rate"
        }
      },
      "required": [
        "team"
      ],
      "type": "object",
      "title": "calculate_mlb_taxArguments"
    }
  },
  {
    "name": "equivalent_mlb_salary",
    "title": "Match MLB after-tax salary",
    "description": "Find the gross salary on a comparison MLB team that matches the after-tax income of a known salary on a baseline team. Ask for the baseline team, comparison team, filing status, and either baseline_salary or base_salary. Do not invent team codes. Call list_tax_calculator_inputs for allowed values. Present the result as a calculation, not as tax or legal advice. Required before this call: baseline_team, comparison_team, and baseline_salary or base_salary. Match a player with list_team_players only after league, team, and season_id are known. Repeat inputs and defaults from the result in the reply. Results are income tax only unless the user asks for take-home: then send include_payroll_taxes, agent_fee_pct, retirement_contribution (401(k), or RRSP on a Canadian club) or rca_contribution (Canadian clubs), and report result.net_pay. Comparisons then match on net_pay.net_economic, which counts an RCA after its estimated payout tax (rca_payout_tax_rate; default 25% Canadian withholding on the US-duty-day share and the US federal marginal rate on the rest, or 25% on all of it for a US person).",
    "inputSchema": {
      "properties": {
        "baseline_team": {
          "description": "Team that pays the known salary.",
          "title": "Baseline Team",
          "type": "string"
        },
        "comparison_team": {
          "description": "Team whose gross pay is solved to match baseline after-tax income.",
          "title": "Comparison Team",
          "type": "string"
        },
        "filing_status": {
          "anyOf": [
            {
              "enum": [
                "Single",
                "Married_Joint"
              ],
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Single or Married_Joint. Defaults to Single when omitted.",
          "title": "Filing Status"
        },
        "baseline_salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "One season total on the baseline team, taxed entirely as duty-day pay. Leave this out when sending base_salary.",
          "title": "Baseline Salary"
        },
        "base_salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Duty-day base in whole dollars before signing and performance bonuses. Send this with the bonus fields to match Salary + Bonuses. Leave it out when sending baseline_salary.",
          "title": "Base Salary"
        },
        "signing_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Signing bonus in whole dollars. The site adds this into the season total. On NFL it also includes other inducement pay.",
          "title": "Signing Bonus"
        },
        "performance_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Performance bonus in whole dollars. Included in the total only when include_performance_bonus_in_jock_tax is true.",
          "title": "Performance Bonus"
        },
        "exempt_signing_bonus_from_jock_tax": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "When true, the signing bonus is taxed in the player's domicile and left out of duty-day allocation.",
          "title": "Exempt Signing Bonus From Jock Tax"
        },
        "include_performance_bonus_in_jock_tax": {
          "default": false,
          "description": "When true, performance_bonus is part of the season total and of duty-day pay.",
          "title": "Include Performance Bonus In Jock Tax",
          "type": "boolean"
        },
        "art_xvi4_inducement_sb": {
          "default": false,
          "description": "Opt in to Canada–U.S. Treaty Art. XVI(4) on an exempt signing bonus from a Canadian club.",
          "title": "Art Xvi4 Inducement Sb",
          "type": "boolean"
        },
        "contract_season": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Contract season label, such as 2025-26.",
          "title": "Contract Season"
        },
        "season_id": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Schedule season as eight digits, such as 20252026. Defaults to the latest season for the league when omitted.",
          "title": "Season Id"
        },
        "estimated_playoff_games": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Extra postseason games. Use 0 when there are none.",
          "title": "Estimated Playoff Games"
        },
        "birth_country": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Birth country code used with is_us_person.",
          "title": "Birth Country"
        },
        "primary_domicile": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Resident tax home: a state, a city, or a mode such as local_jurisdiction. Defaults to local_jurisdiction when omitted.",
          "title": "Primary Domicile"
        },
        "include_payroll_taxes": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Opt in to employee payroll taxes for each team's employer: FICA (Social Security, Medicare, Additional Medicare) and the home state's disability or paid-leave levy for US clubs; CPP/QPP, EI and QPIP for Canadian clubs. Default false. For a Canadian resident it also applies the CPP/QPP and EI credits and the enhanced CPP/QPP deduction on the Canadian return. With any take-home option set, the match uses net_pay.net_economic and the response adds baseline_ and comparison_ net_pay, payroll_taxes, agent_fee and retirement_contribution.",
          "title": "Include Payroll Taxes"
        },
        "agent_fee_pct": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Agent fee as a percent of gross pay (0-10), treated as a non-deductible cost. Default 0.",
          "title": "Agent Fee Pct"
        },
        "retirement_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Annual retirement contribution in USD. On a US club it is a 401(k) elective deferral capped at the 2026 limit ($24,500 plus catch-up). On a Canadian club it is an RRSP contribution capped at C$33,810, deducted from Canadian taxable income only. Default 0.",
          "title": "Retirement Contribution"
        },
        "retirement_contribution_type": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "401(k) only: pretax (default) lowers income-tax wages except in Pennsylvania, Philadelphia, Pittsburgh, Ohio cities, Kansas City and St. Louis; roth lowers nothing. RRSP contributions are always deductible.",
          "title": "Retirement Contribution Type"
        },
        "retirement_catch_up": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "none (default), 50_plus (+$8,000) or 60_to_63 (+$11,250). Catch-up contributions are always Roth for athletes (prior-year FICA wages over $150,000).",
          "title": "Retirement Catch Up"
        },
        "rca_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Salary deferred into a Retirement Compensation Arrangement by a Canadian club, in USD. Excluded from Canadian employment income until paid out: from worldwide income for a Canadian resident and in full from Canadian-source pay for a non-resident (Martin v. The King, 2024 TCC 153). US tax is unchanged. Not applied for US clubs. Comparisons count it after the estimated tax at payout (see rca_payout_tax_rate). Default 0.",
          "title": "Rca Contribution"
        },
        "rca_payout_tax_rate": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Estimated tax on the RCA when it is paid out, as a percent (0-100). Default models a player who retires to a no-tax US state and draws the RCA and its refundable tax account down at once: the US-duty-day share, already taxed by the US when contributed, bears Canada's 25% non-resident withholding, and the rest bears the US federal marginal rate on it (37% for a high earner). For a US person, who pays US tax on the whole contribution now, the default is the 25% withholding alone. Lowers net_pay.net_economic, which comparisons match on.",
          "title": "Rca Payout Tax Rate"
        },
        "comparison_primary_domicile": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Resident tax home modeled for the comparison team.",
          "title": "Comparison Primary Domicile"
        },
        "tolerance": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Dollar tolerance for the equivalent-salary search. Defaults to 1.",
          "title": "Tolerance"
        }
      },
      "required": [
        "baseline_team",
        "comparison_team"
      ],
      "type": "object",
      "title": "equivalent_mlb_salaryArguments"
    }
  },
  {
    "name": "player_movement_mlb",
    "title": "Compare MLB move",
    "description": "Compare after-tax income when a MLB player moves from one team to another at the same gross pay. Ask for the origin team, destination team, filing status, and either gross_salary or base_salary. Do not invent team codes. Call list_tax_calculator_inputs for allowed values. Present the result as a calculation, not as tax or legal advice. Required before this call: from_team, to_team, and gross_salary or base_salary. Match a player with list_team_players only after league, team, and season_id are known. Repeat inputs and defaults from the result in the reply. Results are income tax only unless the user asks for take-home: then send include_payroll_taxes, agent_fee_pct, retirement_contribution (401(k), or RRSP on a Canadian club) or rca_contribution (Canadian clubs), and report result.net_pay. Comparisons then match on net_pay.net_economic, which counts an RCA after its estimated payout tax (rca_payout_tax_rate; default 25% Canadian withholding on the US-duty-day share and the US federal marginal rate on the rest, or 25% on all of it for a US person).",
    "inputSchema": {
      "properties": {
        "from_team": {
          "description": "Team the player leaves.",
          "title": "From Team",
          "type": "string"
        },
        "to_team": {
          "description": "Team the player joins.",
          "title": "To Team",
          "type": "string"
        },
        "filing_status": {
          "anyOf": [
            {
              "enum": [
                "Single",
                "Married_Joint"
              ],
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Single or Married_Joint. Defaults to Single when omitted.",
          "title": "Filing Status"
        },
        "gross_salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "One season total, taxed entirely as duty-day pay. Leave this out when sending base_salary.",
          "title": "Gross Salary"
        },
        "base_salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Duty-day base in whole dollars before signing and performance bonuses. Send this with the bonus fields to match Salary + Bonuses. Leave it out when sending gross_salary.",
          "title": "Base Salary"
        },
        "signing_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Signing bonus in whole dollars. The site adds this into the season total. On NFL it also includes other inducement pay.",
          "title": "Signing Bonus"
        },
        "performance_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Performance bonus in whole dollars. Included in the total only when include_performance_bonus_in_jock_tax is true.",
          "title": "Performance Bonus"
        },
        "exempt_signing_bonus_from_jock_tax": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "When true, the signing bonus is taxed in the player's domicile and left out of duty-day allocation.",
          "title": "Exempt Signing Bonus From Jock Tax"
        },
        "include_performance_bonus_in_jock_tax": {
          "default": false,
          "description": "When true, performance_bonus is part of the season total and of duty-day pay.",
          "title": "Include Performance Bonus In Jock Tax",
          "type": "boolean"
        },
        "art_xvi4_inducement_sb": {
          "default": false,
          "description": "Opt in to Canada–U.S. Treaty Art. XVI(4) on an exempt signing bonus from a Canadian club.",
          "title": "Art Xvi4 Inducement Sb",
          "type": "boolean"
        },
        "contract_season": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Contract season label, such as 2025-26.",
          "title": "Contract Season"
        },
        "season_id": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Schedule season as eight digits, such as 20252026. Defaults to the latest season for the league when omitted.",
          "title": "Season Id"
        },
        "estimated_playoff_games": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Extra postseason games. Use 0 when there are none.",
          "title": "Estimated Playoff Games"
        },
        "birth_country": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Birth country code used with is_us_person.",
          "title": "Birth Country"
        },
        "primary_domicile": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Resident tax home: a state, a city, or a mode such as local_jurisdiction. Defaults to local_jurisdiction when omitted.",
          "title": "Primary Domicile"
        },
        "include_payroll_taxes": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Opt in to employee payroll taxes for each team's employer: FICA (Social Security, Medicare, Additional Medicare) and the home state's disability or paid-leave levy for US clubs; CPP/QPP, EI and QPIP for Canadian clubs. Default false. For a Canadian resident it also applies the CPP/QPP and EI credits and the enhanced CPP/QPP deduction on the Canadian return. With any take-home option set, from_after_tax and to_after_tax use net_pay.net_economic and the response adds from_ and to_ net_pay, payroll_taxes, agent_fee and retirement_contribution.",
          "title": "Include Payroll Taxes"
        },
        "agent_fee_pct": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Agent fee as a percent of gross pay (0-10), treated as a non-deductible cost. Default 0.",
          "title": "Agent Fee Pct"
        },
        "retirement_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Annual retirement contribution in USD. On a US club it is a 401(k) elective deferral capped at the 2026 limit ($24,500 plus catch-up). On a Canadian club it is an RRSP contribution capped at C$33,810, deducted from Canadian taxable income only. Default 0.",
          "title": "Retirement Contribution"
        },
        "retirement_contribution_type": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "401(k) only: pretax (default) lowers income-tax wages except in Pennsylvania, Philadelphia, Pittsburgh, Ohio cities, Kansas City and St. Louis; roth lowers nothing. RRSP contributions are always deductible.",
          "title": "Retirement Contribution Type"
        },
        "retirement_catch_up": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "none (default), 50_plus (+$8,000) or 60_to_63 (+$11,250). Catch-up contributions are always Roth for athletes (prior-year FICA wages over $150,000).",
          "title": "Retirement Catch Up"
        },
        "rca_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Salary deferred into a Retirement Compensation Arrangement by a Canadian club, in USD. Excluded from Canadian employment income until paid out: from worldwide income for a Canadian resident and in full from Canadian-source pay for a non-resident (Martin v. The King, 2024 TCC 153). US tax is unchanged. Not applied for US clubs. Comparisons count it after the estimated tax at payout (see rca_payout_tax_rate). Default 0.",
          "title": "Rca Contribution"
        },
        "rca_payout_tax_rate": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Estimated tax on the RCA when it is paid out, as a percent (0-100). Default models a player who retires to a no-tax US state and draws the RCA and its refundable tax account down at once: the US-duty-day share, already taxed by the US when contributed, bears Canada's 25% non-resident withholding, and the rest bears the US federal marginal rate on it (37% for a high earner). For a US person, who pays US tax on the whole contribution now, the default is the 25% withholding alone. Lowers net_pay.net_economic, which comparisons match on.",
          "title": "Rca Payout Tax Rate"
        },
        "comparison_primary_domicile": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Resident tax home modeled on the destination team.",
          "title": "Comparison Primary Domicile"
        }
      },
      "required": [
        "from_team",
        "to_team"
      ],
      "type": "object",
      "title": "player_movement_mlbArguments"
    }
  },
  {
    "name": "calculate_nba_tax",
    "title": "Calculate NBA tax",
    "description": "Calculate professional-athlete tax for one NBA season with the Jock Taxes engine. Ask the user for a missing team or salary. Do not invent team codes, seasons, salaries, or filing status. Call list_tax_calculator_inputs for allowed values. Send salary when the user has one season total taxed entirely as duty-day pay. Send base_salary plus optional signing_bonus and performance_bonus to match the site Salary + Bonuses form. Do not send salary together with base_salary or a bonus. exempt_signing_bonus_from_jock_tax defaults to true for a split, so the signing bonus is taxed only in the player's domicile. performance_bonus is included only when include_performance_bonus_in_jock_tax is true. art_xvi4_inducement_sb applies to an exempt signing bonus paid by a Canadian club to a U.S. resident. Present the result as a calculation, not as tax or legal advice. Required before this call: team, and salary or base_salary. Match a player with list_team_players only after league, team, and season_id are known. Repeat inputs and defaults from the result in the reply. Results are income tax only unless the user asks for take-home: then send include_payroll_taxes, agent_fee_pct, retirement_contribution (401(k), or RRSP on a Canadian club) or rca_contribution (Canadian clubs), and report result.net_pay. Comparisons then match on net_pay.net_economic, which counts an RCA after its estimated payout tax (rca_payout_tax_rate; default 25% Canadian withholding on the US-duty-day share and the US federal marginal rate on the rest, or 25% on all of it for a US person).",
    "inputSchema": {
      "properties": {
        "team": {
          "description": "Team code, such as BOS.",
          "title": "Team",
          "type": "string"
        },
        "filing_status": {
          "anyOf": [
            {
              "enum": [
                "Single",
                "Married_Joint"
              ],
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Single or Married_Joint. Defaults to Single when omitted.",
          "title": "Filing Status"
        },
        "salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "One season total in whole dollars, taxed entirely as duty-day pay. Leave this out when sending base_salary.",
          "title": "Salary"
        },
        "base_salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Duty-day base in whole dollars before signing and performance bonuses. Send this with the bonus fields to match Salary + Bonuses. Leave it out when sending salary.",
          "title": "Base Salary"
        },
        "signing_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Signing bonus in whole dollars. The site adds this into the season total. On NFL it also includes other inducement pay.",
          "title": "Signing Bonus"
        },
        "performance_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Performance bonus in whole dollars. Included in the total only when include_performance_bonus_in_jock_tax is true.",
          "title": "Performance Bonus"
        },
        "exempt_signing_bonus_from_jock_tax": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "When true, the signing bonus is taxed in the player's domicile and left out of duty-day allocation.",
          "title": "Exempt Signing Bonus From Jock Tax"
        },
        "include_performance_bonus_in_jock_tax": {
          "default": false,
          "description": "When true, performance_bonus is part of the season total and of duty-day pay.",
          "title": "Include Performance Bonus In Jock Tax",
          "type": "boolean"
        },
        "art_xvi4_inducement_sb": {
          "default": false,
          "description": "Opt in to Canada–U.S. Treaty Art. XVI(4) on an exempt signing bonus from a Canadian club.",
          "title": "Art Xvi4 Inducement Sb",
          "type": "boolean"
        },
        "contract_season": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Contract season label, such as 2025-26.",
          "title": "Contract Season"
        },
        "season_id": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Schedule season as eight digits, such as 20252026. Defaults to the latest season for the league when omitted.",
          "title": "Season Id"
        },
        "estimated_playoff_games": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Extra postseason games. Use 0 when there are none.",
          "title": "Estimated Playoff Games"
        },
        "birth_country": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Birth country code used with is_us_person.",
          "title": "Birth Country"
        },
        "primary_domicile": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Resident tax home: a state, a city, or a mode such as local_jurisdiction. Defaults to local_jurisdiction when omitted.",
          "title": "Primary Domicile"
        },
        "include_payroll_taxes": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Opt in to employee payroll taxes for each team's employer: FICA (Social Security, Medicare, Additional Medicare) and the home state's disability or paid-leave levy for US clubs; CPP/QPP, EI and QPIP for Canadian clubs. Default false. For a Canadian resident it also applies the CPP/QPP and EI credits and the enhanced CPP/QPP deduction on the Canadian return. With any take-home option set, the response adds net_pay (net = cash take-home, net_economic = net plus the 401(k) deferral), agent_fee, retirement_contribution, and payroll_taxes when payroll is on. amounts.total stays income tax only.",
          "title": "Include Payroll Taxes"
        },
        "agent_fee_pct": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Agent fee as a percent of gross pay (0-10), treated as a non-deductible cost. Default 0.",
          "title": "Agent Fee Pct"
        },
        "retirement_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Annual retirement contribution in USD. On a US club it is a 401(k) elective deferral capped at the 2026 limit ($24,500 plus catch-up). On a Canadian club it is an RRSP contribution capped at C$33,810, deducted from Canadian taxable income only. Default 0.",
          "title": "Retirement Contribution"
        },
        "retirement_contribution_type": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "401(k) only: pretax (default) lowers income-tax wages except in Pennsylvania, Philadelphia, Pittsburgh, Ohio cities, Kansas City and St. Louis; roth lowers nothing. RRSP contributions are always deductible.",
          "title": "Retirement Contribution Type"
        },
        "retirement_catch_up": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "none (default), 50_plus (+$8,000) or 60_to_63 (+$11,250). Catch-up contributions are always Roth for athletes (prior-year FICA wages over $150,000).",
          "title": "Retirement Catch Up"
        },
        "rca_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Salary deferred into a Retirement Compensation Arrangement by a Canadian club, in USD. Excluded from Canadian employment income until paid out: from worldwide income for a Canadian resident and in full from Canadian-source pay for a non-resident (Martin v. The King, 2024 TCC 153). US tax is unchanged. Not applied for US clubs. Comparisons count it after the estimated tax at payout (see rca_payout_tax_rate). Default 0.",
          "title": "Rca Contribution"
        },
        "rca_payout_tax_rate": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Estimated tax on the RCA when it is paid out, as a percent (0-100). Default models a player who retires to a no-tax US state and draws the RCA and its refundable tax account down at once: the US-duty-day share, already taxed by the US when contributed, bears Canada's 25% non-resident withholding, and the rest bears the US federal marginal rate on it (37% for a high earner). For a US person, who pays US tax on the whole contribution now, the default is the 25% withholding alone. Lowers net_pay.net_economic, which comparisons match on.",
          "title": "Rca Payout Tax Rate"
        }
      },
      "required": [
        "team"
      ],
      "type": "object",
      "title": "calculate_nba_taxArguments"
    }
  },
  {
    "name": "equivalent_nba_salary",
    "title": "Match NBA after-tax salary",
    "description": "Find the gross salary on a comparison NBA team that matches the after-tax income of a known salary on a baseline team. Ask for the baseline team, comparison team, filing status, and either baseline_salary or base_salary. Do not invent team codes. Call list_tax_calculator_inputs for allowed values. Present the result as a calculation, not as tax or legal advice. Required before this call: baseline_team, comparison_team, and baseline_salary or base_salary. Match a player with list_team_players only after league, team, and season_id are known. Repeat inputs and defaults from the result in the reply. Results are income tax only unless the user asks for take-home: then send include_payroll_taxes, agent_fee_pct, retirement_contribution (401(k), or RRSP on a Canadian club) or rca_contribution (Canadian clubs), and report result.net_pay. Comparisons then match on net_pay.net_economic, which counts an RCA after its estimated payout tax (rca_payout_tax_rate; default 25% Canadian withholding on the US-duty-day share and the US federal marginal rate on the rest, or 25% on all of it for a US person).",
    "inputSchema": {
      "properties": {
        "baseline_team": {
          "description": "Team that pays the known salary.",
          "title": "Baseline Team",
          "type": "string"
        },
        "comparison_team": {
          "description": "Team whose gross pay is solved to match baseline after-tax income.",
          "title": "Comparison Team",
          "type": "string"
        },
        "filing_status": {
          "anyOf": [
            {
              "enum": [
                "Single",
                "Married_Joint"
              ],
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Single or Married_Joint. Defaults to Single when omitted.",
          "title": "Filing Status"
        },
        "baseline_salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "One season total on the baseline team, taxed entirely as duty-day pay. Leave this out when sending base_salary.",
          "title": "Baseline Salary"
        },
        "base_salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Duty-day base in whole dollars before signing and performance bonuses. Send this with the bonus fields to match Salary + Bonuses. Leave it out when sending baseline_salary.",
          "title": "Base Salary"
        },
        "signing_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Signing bonus in whole dollars. The site adds this into the season total. On NFL it also includes other inducement pay.",
          "title": "Signing Bonus"
        },
        "performance_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Performance bonus in whole dollars. Included in the total only when include_performance_bonus_in_jock_tax is true.",
          "title": "Performance Bonus"
        },
        "exempt_signing_bonus_from_jock_tax": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "When true, the signing bonus is taxed in the player's domicile and left out of duty-day allocation.",
          "title": "Exempt Signing Bonus From Jock Tax"
        },
        "include_performance_bonus_in_jock_tax": {
          "default": false,
          "description": "When true, performance_bonus is part of the season total and of duty-day pay.",
          "title": "Include Performance Bonus In Jock Tax",
          "type": "boolean"
        },
        "art_xvi4_inducement_sb": {
          "default": false,
          "description": "Opt in to Canada–U.S. Treaty Art. XVI(4) on an exempt signing bonus from a Canadian club.",
          "title": "Art Xvi4 Inducement Sb",
          "type": "boolean"
        },
        "contract_season": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Contract season label, such as 2025-26.",
          "title": "Contract Season"
        },
        "season_id": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Schedule season as eight digits, such as 20252026. Defaults to the latest season for the league when omitted.",
          "title": "Season Id"
        },
        "estimated_playoff_games": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Extra postseason games. Use 0 when there are none.",
          "title": "Estimated Playoff Games"
        },
        "birth_country": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Birth country code used with is_us_person.",
          "title": "Birth Country"
        },
        "primary_domicile": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Resident tax home: a state, a city, or a mode such as local_jurisdiction. Defaults to local_jurisdiction when omitted.",
          "title": "Primary Domicile"
        },
        "include_payroll_taxes": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Opt in to employee payroll taxes for each team's employer: FICA (Social Security, Medicare, Additional Medicare) and the home state's disability or paid-leave levy for US clubs; CPP/QPP, EI and QPIP for Canadian clubs. Default false. For a Canadian resident it also applies the CPP/QPP and EI credits and the enhanced CPP/QPP deduction on the Canadian return. With any take-home option set, the match uses net_pay.net_economic and the response adds baseline_ and comparison_ net_pay, payroll_taxes, agent_fee and retirement_contribution.",
          "title": "Include Payroll Taxes"
        },
        "agent_fee_pct": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Agent fee as a percent of gross pay (0-10), treated as a non-deductible cost. Default 0.",
          "title": "Agent Fee Pct"
        },
        "retirement_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Annual retirement contribution in USD. On a US club it is a 401(k) elective deferral capped at the 2026 limit ($24,500 plus catch-up). On a Canadian club it is an RRSP contribution capped at C$33,810, deducted from Canadian taxable income only. Default 0.",
          "title": "Retirement Contribution"
        },
        "retirement_contribution_type": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "401(k) only: pretax (default) lowers income-tax wages except in Pennsylvania, Philadelphia, Pittsburgh, Ohio cities, Kansas City and St. Louis; roth lowers nothing. RRSP contributions are always deductible.",
          "title": "Retirement Contribution Type"
        },
        "retirement_catch_up": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "none (default), 50_plus (+$8,000) or 60_to_63 (+$11,250). Catch-up contributions are always Roth for athletes (prior-year FICA wages over $150,000).",
          "title": "Retirement Catch Up"
        },
        "rca_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Salary deferred into a Retirement Compensation Arrangement by a Canadian club, in USD. Excluded from Canadian employment income until paid out: from worldwide income for a Canadian resident and in full from Canadian-source pay for a non-resident (Martin v. The King, 2024 TCC 153). US tax is unchanged. Not applied for US clubs. Comparisons count it after the estimated tax at payout (see rca_payout_tax_rate). Default 0.",
          "title": "Rca Contribution"
        },
        "rca_payout_tax_rate": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Estimated tax on the RCA when it is paid out, as a percent (0-100). Default models a player who retires to a no-tax US state and draws the RCA and its refundable tax account down at once: the US-duty-day share, already taxed by the US when contributed, bears Canada's 25% non-resident withholding, and the rest bears the US federal marginal rate on it (37% for a high earner). For a US person, who pays US tax on the whole contribution now, the default is the 25% withholding alone. Lowers net_pay.net_economic, which comparisons match on.",
          "title": "Rca Payout Tax Rate"
        },
        "comparison_primary_domicile": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Resident tax home modeled for the comparison team.",
          "title": "Comparison Primary Domicile"
        },
        "tolerance": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Dollar tolerance for the equivalent-salary search. Defaults to 1.",
          "title": "Tolerance"
        }
      },
      "required": [
        "baseline_team",
        "comparison_team"
      ],
      "type": "object",
      "title": "equivalent_nba_salaryArguments"
    }
  },
  {
    "name": "player_movement_nba",
    "title": "Compare NBA move",
    "description": "Compare after-tax income when a NBA player moves from one team to another at the same gross pay. Ask for the origin team, destination team, filing status, and either gross_salary or base_salary. Do not invent team codes. Call list_tax_calculator_inputs for allowed values. Present the result as a calculation, not as tax or legal advice. Required before this call: from_team, to_team, and gross_salary or base_salary. Match a player with list_team_players only after league, team, and season_id are known. Repeat inputs and defaults from the result in the reply. Results are income tax only unless the user asks for take-home: then send include_payroll_taxes, agent_fee_pct, retirement_contribution (401(k), or RRSP on a Canadian club) or rca_contribution (Canadian clubs), and report result.net_pay. Comparisons then match on net_pay.net_economic, which counts an RCA after its estimated payout tax (rca_payout_tax_rate; default 25% Canadian withholding on the US-duty-day share and the US federal marginal rate on the rest, or 25% on all of it for a US person).",
    "inputSchema": {
      "properties": {
        "from_team": {
          "description": "Team the player leaves.",
          "title": "From Team",
          "type": "string"
        },
        "to_team": {
          "description": "Team the player joins.",
          "title": "To Team",
          "type": "string"
        },
        "filing_status": {
          "anyOf": [
            {
              "enum": [
                "Single",
                "Married_Joint"
              ],
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Single or Married_Joint. Defaults to Single when omitted.",
          "title": "Filing Status"
        },
        "gross_salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "One season total, taxed entirely as duty-day pay. Leave this out when sending base_salary.",
          "title": "Gross Salary"
        },
        "base_salary": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Duty-day base in whole dollars before signing and performance bonuses. Send this with the bonus fields to match Salary + Bonuses. Leave it out when sending gross_salary.",
          "title": "Base Salary"
        },
        "signing_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Signing bonus in whole dollars. The site adds this into the season total. On NFL it also includes other inducement pay.",
          "title": "Signing Bonus"
        },
        "performance_bonus": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Performance bonus in whole dollars. Included in the total only when include_performance_bonus_in_jock_tax is true.",
          "title": "Performance Bonus"
        },
        "exempt_signing_bonus_from_jock_tax": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "When true, the signing bonus is taxed in the player's domicile and left out of duty-day allocation.",
          "title": "Exempt Signing Bonus From Jock Tax"
        },
        "include_performance_bonus_in_jock_tax": {
          "default": false,
          "description": "When true, performance_bonus is part of the season total and of duty-day pay.",
          "title": "Include Performance Bonus In Jock Tax",
          "type": "boolean"
        },
        "art_xvi4_inducement_sb": {
          "default": false,
          "description": "Opt in to Canada–U.S. Treaty Art. XVI(4) on an exempt signing bonus from a Canadian club.",
          "title": "Art Xvi4 Inducement Sb",
          "type": "boolean"
        },
        "contract_season": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Contract season label, such as 2025-26.",
          "title": "Contract Season"
        },
        "season_id": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Schedule season as eight digits, such as 20252026. Defaults to the latest season for the league when omitted.",
          "title": "Season Id"
        },
        "estimated_playoff_games": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Extra postseason games. Use 0 when there are none.",
          "title": "Estimated Playoff Games"
        },
        "birth_country": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Birth country code used with is_us_person.",
          "title": "Birth Country"
        },
        "primary_domicile": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Resident tax home: a state, a city, or a mode such as local_jurisdiction. Defaults to local_jurisdiction when omitted.",
          "title": "Primary Domicile"
        },
        "include_payroll_taxes": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Opt in to employee payroll taxes for each team's employer: FICA (Social Security, Medicare, Additional Medicare) and the home state's disability or paid-leave levy for US clubs; CPP/QPP, EI and QPIP for Canadian clubs. Default false. For a Canadian resident it also applies the CPP/QPP and EI credits and the enhanced CPP/QPP deduction on the Canadian return. With any take-home option set, from_after_tax and to_after_tax use net_pay.net_economic and the response adds from_ and to_ net_pay, payroll_taxes, agent_fee and retirement_contribution.",
          "title": "Include Payroll Taxes"
        },
        "agent_fee_pct": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Agent fee as a percent of gross pay (0-10), treated as a non-deductible cost. Default 0.",
          "title": "Agent Fee Pct"
        },
        "retirement_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Annual retirement contribution in USD. On a US club it is a 401(k) elective deferral capped at the 2026 limit ($24,500 plus catch-up). On a Canadian club it is an RRSP contribution capped at C$33,810, deducted from Canadian taxable income only. Default 0.",
          "title": "Retirement Contribution"
        },
        "retirement_contribution_type": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "401(k) only: pretax (default) lowers income-tax wages except in Pennsylvania, Philadelphia, Pittsburgh, Ohio cities, Kansas City and St. Louis; roth lowers nothing. RRSP contributions are always deductible.",
          "title": "Retirement Contribution Type"
        },
        "retirement_catch_up": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "none (default), 50_plus (+$8,000) or 60_to_63 (+$11,250). Catch-up contributions are always Roth for athletes (prior-year FICA wages over $150,000).",
          "title": "Retirement Catch Up"
        },
        "rca_contribution": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Salary deferred into a Retirement Compensation Arrangement by a Canadian club, in USD. Excluded from Canadian employment income until paid out: from worldwide income for a Canadian resident and in full from Canadian-source pay for a non-resident (Martin v. The King, 2024 TCC 153). US tax is unchanged. Not applied for US clubs. Comparisons count it after the estimated tax at payout (see rca_payout_tax_rate). Default 0.",
          "title": "Rca Contribution"
        },
        "rca_payout_tax_rate": {
          "anyOf": [
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Estimated tax on the RCA when it is paid out, as a percent (0-100). Default models a player who retires to a no-tax US state and draws the RCA and its refundable tax account down at once: the US-duty-day share, already taxed by the US when contributed, bears Canada's 25% non-resident withholding, and the rest bears the US federal marginal rate on it (37% for a high earner). For a US person, who pays US tax on the whole contribution now, the default is the 25% withholding alone. Lowers net_pay.net_economic, which comparisons match on.",
          "title": "Rca Payout Tax Rate"
        },
        "comparison_primary_domicile": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Resident tax home modeled on the destination team.",
          "title": "Comparison Primary Domicile"
        }
      },
      "required": [
        "from_team",
        "to_team"
      ],
      "type": "object",
      "title": "player_movement_nbaArguments"
    }
  },
  {
    "name": "list_team_players",
    "title": "List team players",
    "description": "List player ids and pay for one team and season from the salary tables. Requires league, team, and season_id. Match the user's name against name and last_first. If several rows fit, or none fit, ask the user which person they mean. Copy season_total into the calculator's one-amount field, or copy base_salary, signing_bonus, and performance_bonus for Salary + Bonuses. Does not use request quota.",
    "inputSchema": {
      "properties": {
        "league": {
          "description": "League, e.g. 'NHL'.",
          "title": "League",
          "type": "string"
        },
        "team": {
          "description": "Team code, such as BOS.",
          "title": "Team",
          "type": "string"
        },
        "season_id": {
          "description": "Season id, e.g. '20252026'.",
          "title": "Season Id",
          "type": "string"
        }
      },
      "required": [
        "league",
        "team",
        "season_id"
      ],
      "type": "object",
      "title": "list_team_playersArguments"
    }
  },
  {
    "name": "list_tax_calculator_inputs",
    "title": "List calculator inputs",
    "description": "List leagues, seasons, filing statuses, and team codes accepted by the NHL, NFL, MLB, and NBA tax calculators. Does not use request quota.",
    "inputSchema": {
      "properties": {},
      "type": "object",
      "title": "list_tax_calculator_inputsArguments"
    }
  }
];

export const TOOL_NAMES = TOOL_DEFS.map((t) => t.name);

/** Whether `name` belongs to the captured surface. */
export function isKnownTool(name: string): boolean {
  return TOOL_NAMES.includes(name);
}

/* ------------------------------------------------------------------ */
/* Forwarding client                                                   */
/* ------------------------------------------------------------------ */

function errorResult(detail: string): ToolResult {
  return {
    content: [{ type: "text", text: `sportstax error: ${detail}` }],
    isError: true,
  };
}

function rpcErrorMessage(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message !== "") return message;
    return JSON.stringify(error);
  }
  return String(error);
}

/**
 * Read a JSON-RPC response body, tolerating SSE framing.
 * Returns the message whose id matches `expectedId` when
 * present, otherwise the last parseable message, otherwise
 * null when nothing in the body parses.
 */
export function parseRpcBody(
  text: string,
  expectedId?: number,
): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const candidates: Record<string, unknown>[] = [];
  const tryPush = (payload: string): void => {
    try {
      const parsed: unknown = JSON.parse(payload);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        candidates.push(parsed as Record<string, unknown>);
      }
    } catch {
      // Not a JSON payload; skip this candidate.
    }
  };
  if (trimmed.includes("data:")) {
    for (const line of trimmed.split("\n")) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice("data:".length).trim();
      if (payload !== "" && payload !== "[DONE]") tryPush(payload);
    }
  } else {
    tryPush(trimmed);
  }
  if (candidates.length === 0) return null;
  if (expectedId !== undefined) {
    const match = candidates.find((c) => c.id === expectedId);
    if (match !== undefined) return match;
  }
  return candidates[candidates.length - 1];
}

async function defaultFetch(
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
): Promise<FetchResponseLike> {
  return fetch(url, init) as unknown as FetchResponseLike;
}

/**
 * A forwarding client holding a single upstream session,
 * opened lazily on first use and reused from then on
 * (for the process lifetime in the MCP server, or for a
 * single invocation in the CLI).
 */
export class SportstaxClient {
  private readonly deps: ForwardDeps;
  private sessionId: string | null = null;
  private ready = false;
  private sessionPromise: Promise<void> | null = null;
  private idCounter = 0;

  constructor(deps: ForwardDeps = {}) {
    this.deps = deps;
  }

  private fetchFn(): FetchFn {
    return this.deps.fetchFn ?? defaultFetch;
  }

  private endpointUrl(): string {
    if (this.deps.url && this.deps.url.trim() !== "") return this.deps.url.trim();
    const raw = (this.deps.env ?? process.env).JOCKTAXES_MCP_URL;
    if (raw && raw.trim() !== "") return raw.trim();
    return DEFAULT_ENDPOINT_URL;
  }

  private apiKey(): string | null {
    const raw = (this.deps.env ?? process.env).JOCKTAXES_API_KEY;
    if (raw && raw.trim() !== "") return raw.trim();
    return null;
  }

  private timeoutMs(): number {
    if (typeof this.deps.timeoutMs === "number" && this.deps.timeoutMs > 0) {
      return this.deps.timeoutMs;
    }
    return DEFAULT_TIMEOUT_MS;
  }

  private nextId(): number {
    this.idCounter += 1;
    return this.idCounter;
  }

  private async post(
    body: unknown,
    withSession: boolean,
  ): Promise<FetchResponseLike> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    const key = this.apiKey();
    if (key !== null) headers["X-JockTax-Api-Key"] = key;
    if (withSession && this.sessionId !== null) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs());
    try {
      return await this.fetchFn()(this.endpointUrl(), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async ensureSession(): Promise<void> {
    if (this.ready) return;
    if (this.sessionPromise === null) {
      this.sessionPromise = (async () => {
        const initId = this.nextId();
        const initRes = await this.post(
          {
            jsonrpc: "2.0",
            id: initId,
            method: "initialize",
            params: {
              protocolVersion: PROTOCOL_VERSION,
              capabilities: {},
              clientInfo: { name: "sportstax", version: VERSION },
            },
          },
          false,
        );
        const sessionId = initRes.headers.get("mcp-session-id");
        if (sessionId) this.sessionId = sessionId;
        const initText = await initRes.text();
        const initParsed = parseRpcBody(initText, initId);
        if (initParsed !== null && initParsed.error) {
          throw new Error(rpcErrorMessage(initParsed.error));
        }
        if (initRes.status < 200 || initRes.status >= 300) {
          throw new Error(`HTTP ${initRes.status}`);
        }
        if (initParsed === null && initText.trim() !== "") {
          throw new Error("malformed response");
        }
        const initializedRes = await this.post(
          { jsonrpc: "2.0", method: "notifications/initialized" },
          true,
        );
        try {
          await initializedRes.text();
        } catch {
          // Nothing needed from the notification response body.
        }
        this.ready = true;
      })();
    }
    try {
      await this.sessionPromise;
    } catch (err) {
      this.sessionPromise = null;
      this.sessionId = null;
      throw err;
    }
  }

  /** Forward one tool call; upstream failures come back as isError results. */
  async callTool(name: string, args: ToolArgs): Promise<ToolResult> {
    try {
      await this.ensureSession();
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }

    const callId = this.nextId();
    let callRes: FetchResponseLike;
    try {
      callRes = await this.post(
        {
          jsonrpc: "2.0",
          id: callId,
          method: "tools/call",
          params: { name, arguments: args ?? {} },
        },
        true,
      );
    } catch (err) {
      return errorResult(
        `request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const parsed = parseRpcBody(await callRes.text(), callId);
    if (parsed !== null && parsed.error) {
      return errorResult(rpcErrorMessage(parsed.error));
    }
    if (callRes.status < 200 || callRes.status >= 300) {
      return errorResult(`HTTP ${callRes.status}`);
    }
    if (parsed === null) return errorResult("malformed response");
    const result = parsed.result as ToolResult | undefined;
    if (result === undefined || result === null || typeof result !== "object") {
      return errorResult("malformed response");
    }
    // Hand the upstream result back exactly as received.
    return result;
  }
}

/** Build a forwarding client; tests inject a fake fetch and env through deps. */
export function createClient(deps: ForwardDeps = {}): SportstaxClient {
  return new SportstaxClient(deps);
}

/** One-shot helper: a fresh client for a single call (the CLI path). */
export async function callTool(
  name: string,
  args: ToolArgs,
  deps: ForwardDeps = {},
): Promise<ToolResult> {
  return new SportstaxClient(deps).callTool(name, args);
}
