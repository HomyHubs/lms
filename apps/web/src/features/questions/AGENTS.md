# Question UI supplemental log — slice-3.1

2026-11-02; coding agent; bugfix/slice-3.1-question-completion.

## Đã xong
Edit UI reuses the existing useUpdateQuestion hook; prefilled data, save/cancel, nullable metadata clearing and query invalidation. Added create/edit explanation and sourceReference. Four combinable client-side filters on the loaded list; no server filtering/pagination claim.

CSV requires ten unique exact headers, matching row width and valid quoting; XLSX uses actual read-excel-file browser reader with ZIP/XML guardrails. Backend row/field errors survive ApiError to rendered UI. No generated files hand-edited.

14 real parser/client regression tests (including real ZIP/XML XLSX) and 5 component regressions exercise real hooks/client/parser, not mocked hook results. Whole web suite31 tests passed; core build/lint/typecheck also passed. Existing one-question smoke test retained.

## Còn lại
Independent review, merge, browser E2E/accessibility and real production acceptance remain outside this CI/test closeout. Not Done. See supplemental task and QUESTION-IMPORT-DEPENDENCIES.md for audit limitations and explicit restrictions.

2026-11-03 — CI/test closeout only: fresh Node24.20.0/pnpm11.24.0 full gates build/lint/typecheck/test exit0 each; web31 (including14 parser/client +5 component regressions), shared14 and API93 all pass, none skipped. Added mandatory isolated PostgreSQL18 integration CI for the questions backend; exact-head guard/questions-postgres conclusions must be verified after push and reported in the PR handoff. No browser harness touched and no browser acceptance claimed.
