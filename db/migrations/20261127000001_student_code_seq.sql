-- migrate:up
-- slice-23-b: bo dem ma hoc vien tach khoi viec quet `student_code like '<prefix>%'`.
--
-- Van de cu: `nextCode` lay max(so thu tu) tren moi ma khop `like '<prefix>%'`. Tien to khong co
-- dau phan cach nen hai co so co code long nhau dung chung bo dem: co so 'HV' va 'HV1', ma 'HV10001'
-- cua co so sau van khop `like 'HV%'`, nen bo dem cua 'HV' nhay len 10002. Unique index van chan
-- trung nen khong sinh ma trung — chi so thu tu xau di va moi doan parse ma deu sai.
--
-- Khoa cua bang la TIEN TO, khong phai branch_id: tien to chinh la thu quyet dinh chuoi ma, nen hai
-- co so tinh co dung chung mot code BAT BUOC phai dung chung bo dem (neu khong chung se cap trung so
-- va retry vo ich). Hoc vien chua gan co so dung tien to chung 'HV'.
--
-- Chi THEM (additive) va dao nguoc duoc (AGENTS.md muc 16). Khong doi `student_code` da cap.

create table if not exists student_code_seq (
  prefix text primary key,
  -- So thu tu SE cap tiep theo. Khoi tao 2 o duong ghi de lan dau cap so 1.
  next_value integer not null check (next_value > 0),
  updated_at timestamptz not null default now()
);

-- Seed tu du lieu da cap: quy ma cu ve dung co so cua hoc vien (co so gan som nhat, giong
-- `branchCodeForUser`), roi lay max so thuan sau tien to TRONG PHAM VI co so do.
--
-- Seed duoc phep dem DU (vd hoc vien chuyen co so khien ma la cua tien to khac lot vao) — dem du chi
-- lam so thu tu bat dau cao hon, khong bao gio gay trung. Dieu nguoc lai moi nguy hiem, nen cho phep
-- dem du la lua chon an toan co chu y.
with student_scope as (
  select
    u.id,
    u.student_code,
    (
      select ub.branch_id
      from user_branches ub
      where ub.user_id = u.id
      order by ub.created_at asc, ub.branch_id asc
      limit 1
    ) as branch_id
  from users u
  where u.role = 'student'
    and u.student_code is not null
),
candidate as (
  select
    coalesce(nullif(b.code, ''), 'HV') as prefix,
    s.student_code
  from student_scope s
  left join branches b on b.id = s.branch_id
)
insert into student_code_seq (prefix, next_value)
select
  prefix,
  max(
    case
      when substring(student_code from length(prefix) + 1) ~ '^[0-9]+$'
      then substring(student_code from length(prefix) + 1)::integer
      else 0
    end
  ) + 1
from candidate
where student_code like prefix || '%'
group by prefix
on conflict (prefix) do nothing;

-- migrate:down
drop table if exists student_code_seq;
