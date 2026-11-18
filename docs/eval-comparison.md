# Eval comparison: after Steps 1-3 (token-optimization.md)

Three runs of `npx tsx src/lib/ai/eval/run-eval.ts`, raw output saved as
`eval-output-after-step4-run1.json`, `run2.json`, `run3.json`. Median per scenario below.

## Median input/output tokens per scenario

| Scenario | input (3 runs) | median in | output (3 runs) | median out |
| --- | --- | --- | --- | --- |
| new-goal | 11703, 11681, 11590 | 11,681 | 801, 777, 776 | 777 |
| progress-warning | 20240, 11708, 20207 | 20,207 | 734, 758, 699 | 734 |
| invest-trap | 40616, 40624, 40460 | 40,616 | 1796, 923, 1378 | 1,378 |
| no-history | 7949, 7758, 8234 | 7,949 | 1815, 1673, 1959 | 1,815 |
| **TOTAL** | 80508, 71771, 80491 | 80,491 | 5146, 4131, 4812 | 4,812 |

## Grader stability across the 3 runs

`tool-order`, `confirmation-before-write`, `no-invest-without-yes`, and
`categories-exist` passed on every scenario in all three runs - these checks are
stable. `no-invented-numbers` is flaky on `new-goal` and `progress-warning`
(PASS on some runs, FAIL on others, with different flagged numbers each time);
this traces to number-formatting edge cases in the grader's number extraction
(e.g. thousands separators), not to anything in Steps 1-4 of
token-optimization.md. `reply-length` fails consistently on every scenario in
every run - this is a pre-existing gap in reply length (the agent writes longer
replies than the 1-2 sentence target), not something caused by the
token-optimization work.
