---
name: executar-maestro
description: Drives the iOS Simulator through Maestro YAML flows and correlates each run with Reactotron events captured in .reactotron/events.jsonl. Use when the user asks to validate an acquisition flow on the simulator, reproduce a bug via a Maestro flow, run a versioned .maestro/**/*.yaml scenario, or generate a fresh flow and execute it end-to-end. Marks a [T0, T1] window around the run, slices the JSONL by that window with jq, and returns a verdict-first report with steps, durations, screenshots and correlated API events. Don't use for unit/Jest tests (use fix-failing-tests), pure code review (use executar-review), or static log inspection without UI execution (use reactotron-debug).
---

# Executar Maestro

## Purpose

Orchestrate a Maestro run on the GOL App `staging` build inside the iOS Simulator, capturing screenshots and a `[T0, T1]` window of Reactotron events that the Claude Code uses to ground its diagnosis. The skill is the single point of contact whenever a developer says "valide o fluxo X", "rode o teste Maestro Y" ou "reproduza o bug Z no app".

This skill is a runbook — it does not introduce TypeScript code. It composes existing pieces: the Maestro MCP server (or CLI fallback), the Reactotron tap sidecar (`tools/reactotron-tap/server.js`), versioned YAML flows in `.maestro/` and the jq recipes already consolidated by `reactotron-debug`.

## Step 1: Verify Pre-conditions (Mandatory)

Run the checklist below before touching the simulator. Each line is acionável — if any fails, halt and instruct the user before continuing.

1. **Maestro CLI installed**: `maestro --version` returns a version (`2.x` is the validated baseline). If missing → instruct `brew install maestro` (or the curl|bash installer) and stop.
2. **Reactotron tap up**: `curl -sS -m 2 http://127.0.0.1:9091/healthz` returns `ok`. If not → instruct the user to run `yarn reactotron:tap` in a separate terminal and reload the app (`Cmd+R` on the iOS simulator). Stop until confirmed.
3. **Tap loop guard intact**: read `reactotron-config.ts` and confirm the `networking` interceptor `ignoreUrls` regex still excludes `127.0.0.1:9091`. Skip the run if the guard is missing — the recursion will flood the JSONL (see memory `feedback_reactotron_tap_loop`).
4. **iOS Simulator running** with the GOL `staging` build installed: `xcrun simctl list devices booted | grep -i "iPhone 16"` shows a booted device. If no booted device → instruct `yarn ios:hml` and stop. The `staging` variant is `com.gol.smiles.staging` and is the only target this skill supports.
5. **`.maestro/.env.test` present** (gitignored): `test -f .maestro/.env.test` succeeds. If missing → instruct the user to copy `.maestro/.env.test.example` to `.maestro/.env.test` and fill DEV/HML credentials. Stop until present.
6. **MCP availability**: list MCP tools and check for entries prefixed `maestro` (e.g., `maestro__launchApp`, `maestro__runFlow`). If absent → fall back to CLI Bash mode (see Step 3b). Both modes are first-class — do not block the user on MCP unavailability.

## Step 2: Define the Run

1. Resolve the flow path. If the user named a versioned flow (`.maestro/busca/ida-volta-um-adulto.yaml`) → use it as-is. If they described a scenario in natural language and no versioned flow matches → propose a new YAML under `.maestro/<modulo>/<cenario>.yaml`, save it, then run.
2. Generate a run id: `RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-<flow-basename>"`.
3. Create the output directory: `mkdir -p ".maestro/output/${RUN_ID}"`.
4. Optionally clear the JSONL ring buffer (only if the user asked or if the file is large): `curl -sS -X POST http://127.0.0.1:9091/clear` (the tap is the same one that `reactotron-debug` documents).

## Step 2.5: Reset the App (Mandatory)

**Every Maestro run — manual or via skill — must start from a clean app state.** Stale data from previous runs (Origem/Destino preenchidos, PAX rascunho, sessão expirada) é a maior fonte de flakiness em iOS RN.

Run the project script:

```sh
./scripts/maestro-reset.sh
```

What it does:

- `xcrun simctl terminate` o app `com.yourcompany.GolCheckIn`.
- Apaga `Documents/`, `Library/`, `tmp/` do data container (mantém o binário em `Bundle/`).
- **Desativa o teclado virtual** via `defaults write com.apple.iphonesimulator ConnectHardwareKeyboard true`. Sem isso, o teclado iOS sobe nas screenshots, cobre inputs, e quebra `tapOn` perto da base da tela.
- `xcrun simctl launch` o app.
- `sleep 18` para cobrir splash + CodePush (ajustável via `MAESTRO_RESET_WAIT`).

Depois do reset, o app abre no **onboarding "Ative as notificações"** (estado pós-wipe). O aggregator (`.maestro/aquisicao-so-ida.yaml`) já cobre esse onboarding com `extendedWaitUntil + tapOn "Lembrar-me depois"`. Não toque manualmente — o flow resolve.

## Step 3: Execute the Flow

Capture the start timestamp **immediately before** invoking Maestro and the end timestamp **immediately after**:

```sh
T0="$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
# ... run flow here ...
T1="$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
```

### Step 3a — MCP mode (preferred)

If MCP tools `maestro__*` are listed, drive the run via MCP. The MCP server is launched by `maestro mcp --working-dir=.` (registered in `.mcp.json`). Use the MCP `runFlow` tool with `flowPath` set to the absolute path of the chosen `.yaml`. Persist screenshots inside `.maestro/output/<RUN_ID>/` (Maestro emits them as PNG per step).

### Step 3b — CLI fallback

When MCP is unavailable (Step 1 item 6 failed), drive Maestro via Bash:

```sh
maestro test \
  --env-file .maestro/.env.test \
  --format junit \
  --output ".maestro/output/${RUN_ID}/junit.xml" \
  "${FLOW_PATH}"
```

Both modes must end with `T1` captured and `manifest.json` written.

## Step 4: Build the Manifest

Write `.maestro/output/${RUN_ID}/manifest.json` with the shape below. The manifest is a stable artifact for later auditing and is intentionally minimal.

```json
{
  "flowPath": "<relative path to flow>",
  "runId": "<RUN_ID>",
  "T0": "<ISO 8601 UTC>",
  "T1": "<ISO 8601 UTC>",
  "status": "passed | failed",
  "screenshotCount": <int>,
  "screenshotsDir": ".maestro/output/<RUN_ID>",
  "eventCounts": {
    "api.request": <int>,
    "api.response": <int>,
    "state.action.complete": <int>,
    "log": <int>
  }
}
```

## Step 5: Slice the Reactotron Window

Use `jq` against `.reactotron/events.jsonl` filtering by `receivedAt` between `T0` and `T1`. Reuse the recipes from `reactotron-debug` (Step 3 of that skill) — do not invent new shapes. The most common slices:

- **All events in the window** (sanity check):
  ```sh
  jq -c --arg t0 "${T0}" --arg t1 "${T1}" \
    'select(.receivedAt >= $t0 and .receivedAt <= $t1)' \
    .reactotron/events.jsonl
  ```
- **API responses in the window** (most useful for verdict + diagnosis):
  ```sh
  jq -c --arg t0 "${T0}" --arg t1 "${T1}" '
    select(.type=="api.response"
       and .receivedAt >= $t0
       and .receivedAt <= $t1)
    | {
        url: .payload.request.url,
        status: .payload.response.status,
        durationMs: .payload.duration
      }
  ' .reactotron/events.jsonl
  ```
- **Failed responses (HTTP >= 400) within window**:
  ```sh
  jq -c --arg t0 "${T0}" --arg t1 "${T1}" '
    select(.type=="api.response"
       and .payload.response.status >= 400
       and .receivedAt >= $t0
       and .receivedAt <= $t1)
  ' .reactotron/events.jsonl
  ```
- **Redux actions in the window**:
  ```sh
  jq -c --arg t0 "${T0}" --arg t1 "${T1}" '
    select(.type=="state.action.complete"
       and .receivedAt >= $t0
       and .receivedAt <= $t1)
    | .payload.action
  ' .reactotron/events.jsonl
  ```

If the active JSONL has no events in the window, also inspect `.reactotron/events.prev.jsonl` (rotated history at 5MB).

## Step 6: Report (Mandatory Format)

Produce a textual report in the chat following the **verdict-first** convention. The structure below is required so that future devs can skim quickly:

```
Veredito: passed | failed
Flow: <relative .yaml path>
Run id: <RUN_ID>
Janela: T0=<…> T1=<…>

Passos:
  1. <name> [status] (<ms>)
  2. ...

Eventos correlatos:
  - api.response GET /availability → 200 (412ms)
  - state.action.complete OFFERS_LOADED { … resumo }
  - (apenas mostrar até 5 eventos; preferir os com status anômalo ou actions disparadas)

Erros (se failed):
  - <último request 4xx/5xx> ou <último log level=error>

Artefatos:
  - manifest: .maestro/output/<RUN_ID>/manifest.json
  - screenshots: .maestro/output/<RUN_ID>/*.png
```

Order matters: verdict, flow, window, steps, events, errors, artifacts. Never dump raw JSONL above the verdict.

## Step 7: Anti-flake Validation (Optional, on demand)

When the user is bringing a new flow into the versioned suite for the first time, run it twice consecutively. Only consider it stable when both runs end `passed`. Document the second run id in the same chat message and link both manifests. This mirrors the criterion in `tasks/prd-claude-code-qa-maestro/2_task.md` and `3_task.md`.

## Error Handling

- **Tap healthz returns nothing** → tap is offline. Halt and ask the user to run `yarn reactotron:tap`. Do not proceed with an incomplete window.
- **Maestro CLI not on PATH** → halt with the installation hint. Do not silently downgrade to MCP-only — MCP also requires the CLI as the backing process.
- **`.maestro/.env.test` missing** → halt. The flow references `${EMAIL}`, `${PASSWORD}`, etc., and Maestro will fail at runtime if vars are unset; failing here gives a better message.
- **Simulator not booted** → halt. `xcrun simctl boot "iPhone 16"` is a possibility, but installing the `staging` build the first time is the user's responsibility (`yarn ios:hml`).
- **MCP available but tool call fails mid-run** → capture `T1` immediately, retry once via CLI (Step 3b). If both fail, mark the run `failed` with `cause: "maestro driver error"` and surface the original error verbatim in the report.
- **No events in the window** → check the tap loop guard (Step 1 item 3) and the `receivedAt` field exists; if everything is fine and the JSONL truly has zero entries for `[T0, T1]`, mention this explicitly in the report rather than fabricating events.
- **JSONL parse error mid-stream** → consult `reactotron-debug` Error Handling — same root cause (external writer corrupted the file), same fix (stop tap, truncate file, restart).
- **Stale flow YAML** (selector not found because the screen refactored) → mark `failed` and instruct the user to either update the flow or revisit the screen. Do not auto-patch the YAML without confirmation.

## Notes

- The skill is sob demanda. Never auto-launch a run after a code edit without explicit user confirmation — see PRD §3 (Disparo sob demanda).
- Payment flows MUST use the test card variant (`pagamento/cartao-teste.yaml`). Never run a flow that confirms real charges.
- Each new versioned flow MUST live under `.maestro/<modulo>/<cenario>.yaml` with a short comment on the first line describing the scenario, per Tech Spec §"Abordagem de Testes → Testes de E2E".
- Reuse the jq recipes from `.claude/skills/reactotron-debug/SKILL.md` verbatim — do not reinvent payload shapes. Payload schemas live in `.claude/skills/reactotron-debug/references/event-types.md`.

## References

- `.claude/skills/reactotron-debug/SKILL.md` — base for the jq recipes and the tap availability checks.
- `.claude/skills/reactotron-debug/references/event-types.md` — payload schema for each event consumed in Step 5.
- `tasks/prd-claude-code-qa-maestro/techspec.md` — sections "Interfaces Principais", "Modelos de Dados", "Abordagem de Testes" and "Riscos Conhecidos".
