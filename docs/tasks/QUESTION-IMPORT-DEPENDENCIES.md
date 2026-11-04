# Question import dependency decision — slice-3.1

2026-11-02. Added read-excel-file 9.3.14 (XLSX-only specialized reader, lazy browser import) and fflate 0.8.3 (ZIP preflight and real zipped XML test fixtures). Versions resolved in pnpm-lock.yaml; do not hand-edit lockfile. No general workbook writer, formula evaluator or macro support is needed.

Local pnpm audit --json completed against resolved dependency tree. New reader chain (read-excel-file, fflate, saxen, worker-f, unzipper-esm) has zero matching advisories in returned audit. This is NOT proof of absence of unknown vulnerabilities.

Existing repository audit is NOT green: 5 critical, 28 high, 39 moderate, 10 low findings. These are existing broader dependencies, not suppressed or silently upgraded in this slice. Separate security remediation is required; do not claim dependency audit passed globally.

Import restrictions: CSV/XLSX only, compressed file <=2MiB, expanded ZIP <=16MiB/128 entries, exactly one worksheet and ten unique headers, <=1000 data rows. Reject macros/external-link entries, XML DTD/entities, formula cells and unsupported date/boolean cells. Never execute spreadsheet content. Backend remains authoritative strict/all-or-nothing validator. Frontend list filters currently operate on the already-loaded list, not server pagination.
