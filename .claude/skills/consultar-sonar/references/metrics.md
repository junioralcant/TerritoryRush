# SonarQube Metric Keys — Cheat Sheet

Only the metrics commonly requested in this repository. For the full list query `http://localhost:9000/api/metrics/search?ps=200`.

## Health ratings (A=1.0 best, E=5.0 worst)

| metric                   | meaning                                |
| ------------------------ | -------------------------------------- |
| `reliability_rating`     | derived from bug severity              |
| `security_rating`        | derived from vulnerability severity    |
| `sqale_rating`           | maintainability (technical debt ratio) |
| `security_review_rating` | hotspots reviewed ratio                |

## Counters

| metric              | meaning                                  |
| ------------------- | ---------------------------------------- |
| `bugs`              | total bugs                               |
| `vulnerabilities`   | total vulnerabilities                    |
| `code_smells`       | total code smells                        |
| `security_hotspots` | total hotspots                           |
| `violations`        | sum of bugs + vulnerabilities + smells   |
| `ncloc`             | lines of code (excludes blanks/comments) |
| `lines`             | total lines including blanks             |
| `files`             | source files                             |
| `functions`         | function/method count                    |

## Coverage

| metric                 | meaning                      |
| ---------------------- | ---------------------------- |
| `coverage`             | overall % (lines + branches) |
| `line_coverage`        | line %                       |
| `branch_coverage`      | branch %                     |
| `uncovered_lines`      | absolute count               |
| `uncovered_conditions` | absolute count               |
| `tests`                | total tests reported         |
| `test_failures`        | failing tests                |
| `test_errors`          | erroring tests               |

## Duplications

| metric                     | meaning                             |
| -------------------------- | ----------------------------------- |
| `duplicated_lines_density` | duplicated % of NCLOC               |
| `duplicated_lines`         | absolute duplicated lines           |
| `duplicated_blocks`        | duplicated block count              |
| `duplicated_files`         | files with at least one duplication |

## Complexity & size

| metric                  | meaning                               |
| ----------------------- | ------------------------------------- |
| `complexity`            | cyclomatic                            |
| `cognitive_complexity`  | per-function cognitive complexity sum |
| `comment_lines_density` | % of comment lines                    |
| `sqale_index`           | tech debt in minutes                  |

## "New code" period (for PR / branch analysis)

Append `_new_` flavor for several metrics:

- `new_bugs`, `new_vulnerabilities`, `new_code_smells`
- `new_coverage`, `new_duplicated_lines_density`
- `new_lines`, `new_violations`

Request via `/api/measures/component?component=<KEY>&metricKeys=new_coverage,new_bugs,new_violations`.
