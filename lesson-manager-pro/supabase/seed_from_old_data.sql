-- Seed script: masaüstü uygulamanızdaki mevcut verileri Supabase'e aktarır.
-- 1) Supabase'de kendi kullanıcı hesabınızı oluşturun (login sayfasından kayıt olun).
-- 2) Supabase Dashboard > Authentication > Users içinden kendi kullanıcı ID'nizi (UUID) kopyalayın.
-- 3) Aşağıdaki her 'YOUR_USER_ID' yazan yeri kendi UUID'niz ile değiştirin (bul-değiştir).
-- 4) SQL Editor'de çalıştırın.

create temporary table _student_id_map (old_id bigint primary key, new_id bigint);

with ins as (insert into students (user_id,name,school,subject,parent_name,phone,email,fee,color,active,notes) values ('YOUR_USER_ID','Demir Barçın','Alev','IB HL Math','Onur Barçın','','',5000.0,'#7c3aed',True,'') returning id)
insert into _student_id_map select 1, id from ins;

with ins as (insert into students (user_id,name,school,subject,parent_name,phone,email,fee,color,active,notes) values ('YOUR_USER_ID','Defne Uzun','Hisar','SAT Math','','','',6000.0,'#2563eb',True,'') returning id)
insert into _student_id_map select 2, id from ins;

with ins as (insert into students (user_id,name,school,subject,parent_name,phone,email,fee,color,active,notes) values ('YOUR_USER_ID','Ekin Yıldız','Hisar','SAT Math','İpek Ebru Yıldız','','',6000.0,'#059669',True,'') returning id)
insert into _student_id_map select 3, id from ins;

with ins as (insert into students (user_id,name,school,subject,parent_name,phone,email,fee,color,active,notes) values ('YOUR_USER_ID','Kerem Tuygun','Alev','IB HL Math','Aybanu Hanım','','',5500.0,'#ea580c',True,'') returning id)
insert into _student_id_map select 4, id from ins;

with ins as (insert into students (user_id,name,school,subject,parent_name,phone,email,fee,color,active,notes) values ('YOUR_USER_ID','Aras Atılgan','Bahçeşehir Fen Lisesi','SAT Math','Tansu Atılgan','','',5000.0,'#dc2626',True,'') returning id)
insert into _student_id_map select 5, id from ins;

insert into lessons (user_id,student_id,lesson_date,lesson_time,duration_min,topic,fee,paid,notes) values ('YOUR_USER_ID',(select new_id from _student_id_map where old_id=1),'2026-07-02','18:00',90,'Calculus and IA Project',5000.0,False,'');
insert into lessons (user_id,student_id,lesson_date,lesson_time,duration_min,topic,fee,paid,notes) values ('YOUR_USER_ID',(select new_id from _student_id_map where old_id=2),'2026-07-04','12:00',90,'Geometry and Trigonometry',6000.0,False,'');
insert into lessons (user_id,student_id,lesson_date,lesson_time,duration_min,topic,fee,paid,notes) values ('YOUR_USER_ID',(select new_id from _student_id_map where old_id=3),'2026-07-04','13:30',90,'',6000.0,False,'');
insert into lessons (user_id,student_id,lesson_date,lesson_time,duration_min,topic,fee,paid,notes) values ('YOUR_USER_ID',(select new_id from _student_id_map where old_id=4),'2026-07-05','10:30',90,'',5500.0,False,'');
insert into lessons (user_id,student_id,lesson_date,lesson_time,duration_min,topic,fee,paid,notes) values ('YOUR_USER_ID',(select new_id from _student_id_map where old_id=5),'2026-07-05','12:00',90,'',5000.0,False,'');

insert into planned (user_id,student_id,lesson_date,lesson_time,fee,note,recurring,weekday,recurrence_end,status) values ('YOUR_USER_ID',(select new_id from _student_id_map where old_id=1),'2026-07-02','18:00',5000.0,'',False,3,NULL,'done');
insert into planned (user_id,student_id,lesson_date,lesson_time,fee,note,recurring,weekday,recurrence_end,status) values ('YOUR_USER_ID',(select new_id from _student_id_map where old_id=2),'2026-07-04','12:00',6000.0,'',False,5,NULL,'done');
insert into planned (user_id,student_id,lesson_date,lesson_time,fee,note,recurring,weekday,recurrence_end,status) values ('YOUR_USER_ID',(select new_id from _student_id_map where old_id=3),'2026-07-04','13:30',6000.0,'',False,5,NULL,'done');
insert into planned (user_id,student_id,lesson_date,lesson_time,fee,note,recurring,weekday,recurrence_end,status) values ('YOUR_USER_ID',(select new_id from _student_id_map where old_id=4),'2026-07-05','10:30',5500.0,'',False,6,NULL,'done');
insert into planned (user_id,student_id,lesson_date,lesson_time,fee,note,recurring,weekday,recurrence_end,status) values ('YOUR_USER_ID',(select new_id from _student_id_map where old_id=5),'2026-07-05','12:00',5000.0,'',False,6,NULL,'done');
