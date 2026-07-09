# SonarQube API Recipes

Reusable curl/jq pipelines for the most common questions. Replace `<KEY>` with the project key.

All commands assume the `scripts/sonar-api.sh` wrapper handles authentication; pipe its JSON output into `jq` for filtering.

## Quality gate

```sh
scripts/sonar-api.sh "/api/qualitygates/project_status?projectKey=<KEY>" \
  | jq '{status: .projectStatus.status, failing: [.projectStatus.conditions[] | select(.status!="OK")]}'
```

## Measures snapshot

```sh
scripts/sonar-api.sh "/api/measures/component?component=<KEY>&metricKeys=bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density,ncloc,sqale_index,reliability_rating,security_rating,sqale_rating" \
  | jq '.component.measures | map({(.metric): .value}) | add'
```

## Top issues sorted by severity

```sh
scripts/sonar-api.sh "/api/issues/search?componentKeys=<KEY>&ps=20&s=SEVERITY&asc=false&resolved=false" \
  | jq -r '.issues[] | "[\(.severity)] \(.type) \(.component | sub("^[^:]+:"; "")):\(.line // "-") — \(.rule): \(.message)"'
```

## Issues filtered by file substring

```sh
scripts/sonar-api.sh "/api/issues/search?componentKeys=<KEY>&componentKeys=<KEY>:<path/to/file.ts>&ps=50&resolved=false"
```

## Issues for a single rule

```sh
scripts/sonar-api.sh "/api/issues/search?componentKeys=<KEY>&rules=typescript:S3776&ps=50"
```

## Facets: counts per type / severity / file

```sh
scripts/sonar-api.sh "/api/issues/search?componentKeys=<KEY>&facets=types,severities,files&ps=1" \
  | jq '.facets'
```

## Duplications for one file

```sh
scripts/sonar-api.sh "/api/duplications/show?key=<KEY>:<path/to/file.ts>" \
  | jq '{duplications: .duplications, files: .files}'
```

## Security hotspots to review

```sh
scripts/sonar-api.sh "/api/hotspots/search?projectKey=<KEY>&status=TO_REVIEW&ps=50" \
  | jq -r '.hotspots[] | "[\(.vulnerabilityProbability)] \(.component | sub("^[^:]+:"; "")):\(.line) — \(.message)"'
```

## Coverage and metric history (last 30 analyses)

```sh
scripts/sonar-api.sh "/api/measures/search_history?component=<KEY>&metrics=coverage,bugs,code_smells&ps=30" \
  | jq '.measures[] | {metric, points: .history | map({date, value})}'
```

## Compute Engine task status (after a scan)

```sh
scripts/sonar-api.sh "/api/ce/task?id=<TASK_ID>" | jq '{status: .task.status, errorMessage: .task.errorMessage}'
```

Poll until `status` is `SUCCESS` before querying the dashboard. The task id is printed near the end of `sonar-scanner` output (`more about the report processing at /api/ce/task?id=...`).

## List all projects

```sh
scripts/sonar-api.sh "/api/projects/search?ps=50" | jq -r '.components[] | "\(.key)\t\(.name)"'
```

## Delete a project (rarely needed)

```sh
scripts/sonar-api.sh "/api/projects/delete?project=<KEY>" -X POST
```

Confirm with the user before running — irreversible.
