-- migrate:up
-- slice-31 (ADR 0023): ma co so la DUY NHAT.
--
-- Vi sao: tu ADR 0022, ma hoc vien = `<branches.code>-<so thu tu>`, va bo dem `student_code_seq` khoa
-- theo TIEN TO. Hai co so trung code dung chung bo dem va sinh ra cung mot day ma — ma van unique
-- (users_student_code_unique chan trung) nhung khong con noi duoc hoc vien thuoc co so nao. Do la
-- dung thu ADR 0022 vua sua, bi pha lai boi mot lan nhap lieu sai, va no IM LANG.
--
-- Khoa duy nhat dung upper(btrim(code)) chu khong phai code tho:
--   - `normalizeStudentCodePrefix` TRIM truoc khi dung lam khoa bo dem -> 'HV' va 'HV ' CHAC CHAN
--     dung chung bo dem, du la hai chuoi khac nhau trong DB;
--   - 'hv' va 'HV' cho hai day ma ('hv-0001' / 'HV-0001') nhin gan nhu giong nhau voi nguoi doc,
--     trong khi he thong coi la hai co so khac nhau.
--
-- Kiem tra TRUOC khi tao index de bao loi doc duoc (danh sach ma trung), thay vi de Postgres tra
-- 23505 tran. Migration DUNG la co chu y: tu dong doi ten co so se lam ma hoc vien da cap tro sai
-- co so, te hon nhieu so voi viec bat nguoi van hanh quyet dinh.

do $$
declare
  dupes text;
begin
  select string_agg(format('"%s" (x%s)', c, n), ', ' order by c)
    into dupes
  from (
    select min(btrim(code)) as c, count(*) as n
    from branches
    where code is not null and btrim(code) <> ''
    group by upper(btrim(code))
    having count(*) > 1
  ) d;

  if dupes is not null then
    raise exception
      'branches.code khong duy nhat (sau khi trim + upper case): %. Doi code cua mot trong cac co so nay bang SQL roi chay lai migration.',
      dupes
      using hint = 'Vi du: update branches set code = ''HN2'' where id = ''<uuid>'';';
  end if;
end $$;

create unique index if not exists branches_code_unique
  on branches (upper(btrim(code)))
  where code is not null and btrim(code) <> '';

-- migrate:down
drop index if exists branches_code_unique;
