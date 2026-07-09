---
name: consultar-sonar
description: Queries the local SonarQube instance (http://localhost:9000) seeded for the GOL App Mobile project. Use when the user asks for Sonar metrics, quality gate, issues, bugs, code smells, vulnerabilities, coverage, duplications, hotspots, or wants to trigger a scoped scan on a specific path. Handles container startup, token loading, project key resolution, scan execution and result querying via the Web API. Don't use for generic code review (use executar-review), test failures (use fix-failing-tests), or static analysis tools other than SonarQube.
---

# Consultar Sonar

## Purpose

Run scans and query results from the local SonarQube instance configured for this repository. The instance lives in the docker container `sonarqube-local` on `http://localhost:9000`, configured via `sonar-project.properties` at the repo root.

## Step 1: Ensure SonarQube is reachable

Run `scripts/sonar-up.sh` from the skill directory. The script starts the docker container if stopped and polls `/api/system/status` until status is `UP` (timeout 120 s).

Branch on the script outcome:

- **Exit 0** → continue to Step 2.
- **Exit 10 (container missing)** → the container was deleted. Stop and ask the user to recreate it with the canonical command from references/runbook.md.
- **Exit 11 (timeout)** → check `docker logs sonarqube-local --tail 80` and report the failure cause to the user. Do not retry blindly.
- **Exit 12 (docker daemon down)** → ask the user to start Docker Desktop.

## Step 2: Load the authentication token

The token is required for any write operation and for many reads. Resolve in this order:

1. If `SONAR_TOKEN` is set in the environment, use it.
2. Otherwise, read the last `sqa_*` or `squ_*` token from `sonar-project.properties` (the user keeps it as a trailing comment, e.g. `# sqa_xxxxxxxx`). Use `grep -oE '(sqa|squ|sqp)_[a-f0-9]+' sonar-project.properties | tail -n 1`.
3. If neither is available, stop and ask the user to generate one at http://localhost:9000/account/security and either export `SONAR_TOKEN` or paste it back.

Never echo the token in user-facing output. When passing it to `curl`, use `-u "$TOKEN:"` (trailing colon) so the token plays the username role with empty password.

## Step 3: Resolve the project key

Default project keys for this repository:

| Scope                                     | projectKey                   |
| ----------------------------------------- | ---------------------------- |
| Whole repo (modernization + modules)      | `gol-app-mobile`             |
| `AcquisitionNew/screens/Passageiros` only | `gol-app-mobile-passageiros` |

For any other scoped scan, derive the key as `gol-app-mobile-<kebab-of-last-path-segment>` and confirm with the user before creating it on the server.

List the existing keys at any time with `scripts/sonar-api.sh '/api/projects/search?ps=50'`.

## Step 4: Identify the user intent

Pick exactly one of the actions below. If the user request maps to multiple, ask which to run first.

| User asks for…                               | Action                 |
| -------------------------------------------- | ---------------------- |
| "rode/refaça a análise", "scan", "atualizar" | A. Run a scan          |
| "quality gate", "está passando?"             | B. Quality gate status |
| "métricas", "cobertura", "bugs no total"     | C. Project measures    |
| "issues", "problemas em <file>", "bug X"     | D. Issue search        |
| "duplicação", "código duplicado"             | E. Duplications        |
| "hotspots", "segurança"                      | F. Security hotspots   |
| "histórico", "evolução"                      | G. Measures history    |

## Step 5: Execute the action

All API calls go through `scripts/sonar-api.sh <path-with-query>` which prepends host, attaches the token, and pipes through `python3 -m json.tool` for readability. Scans use `scripts/sonar-scan.sh`.

### A. Run a scan

```sh
scripts/sonar-scan.sh --key <projectKey> --path <relative/source/path>
```

- Omit `--path` to scan the full repo using the values from `sonar-project.properties`.
- The script regenerates coverage only if `--with-coverage` is passed; default reuses `coverage/lcov.info`.
- Wait for the `EXECUTION SUCCESS` line before querying results — Compute Engine processes the report asynchronously. After success, poll `scripts/sonar-api.sh "/api/ce/task?id=<id>"` until `status=SUCCESS`. The task id is printed on the second-to-last line of the scanner output.

### B. Quality gate

```sh
scripts/sonar-api.sh "/api/qualitygates/project_status?projectKey=<projectKey>"
```

Report `projectStatus.status` (`OK`, `WARN`, `ERROR`) and any failing `conditions[].metricKey`.

### C. Measures

Use a curated key list, not all metrics. Default set:

```
bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density,ncloc,sqale_index,reliability_rating,security_rating,sqale_rating
```

```sh
scripts/sonar-api.sh "/api/measures/component?component=<projectKey>&metricKeys=<csv>"
```

Read references/metrics.md before adding metrics outside the default set.

### D. Issues

```sh
scripts/sonar-api.sh "/api/issues/search?componentKeys=<projectKey>&ps=20&s=SEVERITY&asc=false"
```

Refine with these filters (combine via `&`):

| Filter          | Example                               |
| --------------- | ------------------------------------- |
| Severity        | `severities=BLOCKER,CRITICAL`         |
| Type            | `types=BUG`                           |
| File substring  | `componentKeys=<key>:path/to/file.ts` |
| Tags            | `tags=react,suspicious`               |
| Only unresolved | `resolved=false`                      |

Default presentation: one issue per line as `[SEVERITY] type file:line — rule: message`. Read references/api-recipes.md for the jq one-liners.

### E. Duplications

```sh
scripts/sonar-api.sh "/api/duplications/show?key=<projectKey>:<path/to/file.ts>"
```

### F. Hotspots

```sh
scripts/sonar-api.sh "/api/hotspots/search?projectKey=<projectKey>&status=TO_REVIEW"
```

### G. History

```sh
scripts/sonar-api.sh "/api/measures/search_history?component=<projectKey>&metrics=coverage,bugs,code_smells&ps=30"
```

## Step 6: Format the response for the user

- Lead with the project key and the action performed.
- For measures, render a compact markdown table (max 8 rows).
- For issues, show the top 10 sorted by severity desc, then total count.
- Always link the dashboard: `http://localhost:9000/dashboard?id=<projectKey>`.
- Never paste the raw JSON unless the user explicitly asks for it.

## Error Handling

- **`401` from API** → token expired or invalid. Re-run Step 2 with the user generating a new one.
- **`404` on project key** → run `scripts/sonar-api.sh '/api/projects/search?ps=50'` and propose the closest match before creating a new project via scan.
- **Scanner warns "Could not resolve N file paths" in `lcov.info`** → expected when scanning a sub-path; only the in-scope files matter. If coverage stays at 0.0 % for files clearly inside scope, regenerate the coverage with `yarn test:coverage` (or the scoped variant from `package.json`) and rerun the scan with `--with-coverage`.
- **Container running but API still `STARTING`** → the Compute Engine is bootstrapping; wait, do not restart.
- **User asks for a metric not in `metrics.md`** → consult the SonarQube docs at `http://localhost:9000/web_api/api/metrics` rather than guessing.
