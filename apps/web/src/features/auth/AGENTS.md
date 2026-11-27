# Auth UI supplemental log — slice-2.1

2026-11-02 — bugfix/slice-2.1-reset-security, coding agent.
Email is the only offered reset channel. Client never sends recipient. Tests exercise two-step flow, exact outgoing body, unavailable channel rejection, and success state (4 component tests). API remains fail-closed while verified identity binding is unavailable; do not claim production recovery accepted. See ADR0002 and supplemental task. Full web build/lint/typecheck and 12 web tests passed. Await independent review/merge; not Done.

2026-11-27 — slice-1 (ADR 0021), huong toi thieu.

`RequireAuth.tsx` khong con tu cai luat "superadmin vuot moi guard": no goi `isAllowed(user.role, roles)` cua `@lms/shared`, dung chung voi `rbac.requireRole` phia API. Truoc day luat nay duoc viet lai o 6 noi (rbac.ts, exams/routes.ts x3, questions/routes.ts, RequireAuth.tsx); mot cho moi quen viet lai thi chi tai khoan superadmin gap 403 va khong test nao bat duoc.

Ghi chu: `components/layout/nav.ts` VAN khai bao `roles` rieng cho tung muc menu — do la quyet dinh hien thi, khong phai kiem soat truy cap (API moi thuc thi). Gop vao ma tran quyen can them bo ma `nav.*` va doi rong o FE; de slice rieng neu can.
