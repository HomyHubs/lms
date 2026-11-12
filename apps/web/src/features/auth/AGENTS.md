# Auth UI supplemental log — slice-2.1

2026-11-02 — bugfix/slice-2.1-reset-security, coding agent.
Email is the only offered reset channel. Client never sends recipient. Tests exercise two-step flow, exact outgoing body, unavailable channel rejection, and success state (4 component tests). API remains fail-closed while verified identity binding is unavailable; do not claim production recovery accepted. See ADR0002 and supplemental task. Full web build/lint/typecheck and 12 web tests passed. Await independent review/merge; not Done.
