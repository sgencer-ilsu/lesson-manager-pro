-- Hızlı web erişimi için: statik Vercel uygulamasının anon key ile okuma/yazma yapabilmesini sağlar.
-- Yarın hızlı kullanım için uygundur. Daha sonra kullanıcı girişli güvenli policy'ye çevirebiliriz.

alter table students enable row level security;
alter table lessons enable row level security;
alter table planned enable row level security;

drop policy if exists "anon read students" on students;
drop policy if exists "anon write students" on students;
drop policy if exists "anon read lessons" on lessons;
drop policy if exists "anon write lessons" on lessons;
drop policy if exists "anon read planned" on planned;
drop policy if exists "anon write planned" on planned;

create policy "anon read students" on students for select to anon using (true);
create policy "anon write students" on students for all to anon using (true) with check (true);
create policy "anon read lessons" on lessons for select to anon using (true);
create policy "anon write lessons" on lessons for all to anon using (true) with check (true);
create policy "anon read planned" on planned for select to anon using (true);
create policy "anon write planned" on planned for all to anon using (true) with check (true);
