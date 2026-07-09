---
name: reactotron-debug
description: Inspects React Native runtime data captured by the local Reactotron tap sidecar at .reactotron/events.jsonl, including logs, API request/response pairs, and Redux actions. Use when the user reports a runtime issue, asks why an API call failed, asks to inspect a screen's actual behavior, asks about state changes in development, or wants to correlate code with observed runtime events. Provides ready-made jq filters to slice the JSONL by type, URL, or action and detects when the tap sidecar is not running. Don't use for static code analysis, code review, test debugging, or questions that do not require observing app runtime behavior.
---

# Reactotron Debug

## Purpose

Read runtime events emitted by the React Native app from `.reactotron/events.jsonl` to diagnose runtime issues with concrete data instead of speculation from code.

The file is populated by the local Reactotron tap sidecar (`tools/reactotron-tap/server.js`) on port 9091, which receives every event the Reactotron client tries to send. The wrap that forwards events lives in `reactotron-config.ts` and only activates under `__DEV__`.

## Step 1: Confirm the tap is producing data

Run `wc -l .reactotron/events.jsonl` and branch on the outcome:

- **File missing** → the tap was never started in this session. Stop, ask the user to run `yarn reactotron:tap` in a separate terminal and reload the app (`Cmd+R` on iOS simulator, `R R` on Android). Wait for confirmation before continuing.
- **File empty (0 lines)** → three possibilities, in order of likelihood: (a) the user just triggered the custom command **"Limpar tudo (desktop + tap)"** from the Reactotron desktop, which truncates the JSONL — ask them to reproduce the issue once more; (b) the sidecar is up but the app has not delivered any event (app started before the tap) — ask for `Cmd+R`; (c) the sidecar is offline — check with `lsof -i :9091`. Note: the regular trash button in Reactotron desktop is UI-local and does NOT clear the JSONL.
- **File has lines but no recent ones** → check the tail timestamp with `tail -n 1 .reactotron/events.jsonl | jq -r .receivedAt`. If older than the user's report, ask the user to reproduce the issue with the tap running.
- **File has recent lines** → continue to Step 2.

## Step 2: Map the user's question to an event type

Identify the relevant Reactotron event type from the user's phrasing:

| Phrasing | Event type |
| --- | --- |
| "log apareceu", "console.tron.log" | `log` |
| "request retornou", "API falhou", "status X" | `api.response` |
| "request foi enviado", "body da chamada" | `api.request` |
| "state mudou", "ação redux", "dispatch" | `state.action.complete` |
| "custom display", "tron.display" | `display` |
| "warning", "erro silencioso" | `log` with `level >= "warn"` |

If unsure of the payload shape, read references/event-types.md before composing the jq filter.

## Step 3: Compose the jq filter

Always front the query with `tail -n 500` to bound the search window. Pick one of the recipes below and adjust the regex.

- Last N API responses:
  ```sh
  tail -n 500 .reactotron/events.jsonl | jq -c 'select(.type=="api.response")'
  ```
- API responses for a URL substring:
  ```sh
  jq -c 'select(.type=="api.response" and (.payload.request.url | test("PATTERN")))' .reactotron/events.jsonl
  ```
- Failed responses (HTTP >= 400):
  ```sh
  jq -c 'select(.type=="api.response" and .payload.response.status >= 400) | {url: .payload.request.url, status: .payload.response.status, body: .payload.response.body}' .reactotron/events.jsonl
  ```
- Redux actions whose type matches a pattern:
  ```sh
  jq -c 'select(.type=="state.action.complete" and (.payload.action.type | test("PATTERN"))) | .payload.action' .reactotron/events.jsonl
  ```
- Logs containing a string:
  ```sh
  jq -c 'select(.type=="log" and ((.payload.message // "" | tostring) | test("PATTERN")))' .reactotron/events.jsonl
  ```

If the relevant data is not in the active file, also scan `.reactotron/events.prev.jsonl` (rotated history at 5MB).

## Step 4: Correlate observation with code

Once the relevant events are extracted, run `grep` on the URL, action type, or log message to find the call site, then propose a diagnosis grounded in both the observed event and the code path. Cite events as raw JSONL excerpts (one or two lines) and code locations as `path:line`.

## Error Handling

- **`jq` not installed** → instruct the user to `brew install jq`; do not attempt jq-less workarounds (regex on JSONL is brittle).
- **`fetch is not a function` in the app on reload** → the wrap in `reactotron-config.ts` was bypassed. Verify `if (__DEV__ && !console.tron)` still guards the block.
- **App crashes with "Post Evento" loop** → the networking ignoreUrls regex in `reactotron-config.ts` no longer matches `127.0.0.1:9091`. Restore the exclusion.
- **All events are JSON-parse errors** → the sidecar log was concatenated by an external process. Stop the tap, delete `.reactotron/events.jsonl`, restart `yarn reactotron:tap`, and ask for a fresh reproduction.

## References

- references/event-types.md — payload schema for each Reactotron event type.
