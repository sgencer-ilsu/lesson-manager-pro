-- Planlanan (henüz yapılmamış) derslerin peşin ödenebilmesini sağlar.
-- "Dersler" raporunda artık "Durum" (Yapıldı/Planlandı) ve "Ödeme"
-- (Ödendi/Ödenmedi) ayrı sütunlar; bir ders henüz yapılmamış olsa bile
-- veli önceden ödemişse "Ödendi" olarak işaretlenebilsin diye
-- planned tablosuna da paid alanı eklenir.
alter table planned add column if not exists paid boolean not null default false;
