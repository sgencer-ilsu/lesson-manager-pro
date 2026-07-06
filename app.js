const $ = (s) => document.querySelector(s);
const content = $('#content');
let sb = null;
let currentView = 'dashboard';
let state = { students: [], lessons: [], planned: [], user: null };

function toast(msg){ const t=$('#toast'); t.textContent=msg; t.style.display='block'; setTimeout(()=>t.style.display='none',3500); }
function money(n){ return new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:0}).format(Number(n||0)); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function monthISO(){ return new Date().toISOString().slice(0,7); }
function dateTR(d){ if(!d) return ''; return new Date(d+'T12:00:00').toLocaleDateString('tr-TR',{day:'2-digit',month:'short',year:'numeric'}); }
function timeTR(t){ return (t||'').slice(0,5); }
function esc(x){ return String(x??'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function getConfig(){ return { url: localStorage.getItem('slm_supabase_url')||'', key: localStorage.getItem('slm_supabase_anon')||''}; }
function initSupabase(){ const {url,key}=getConfig(); if(url&&key&&window.supabase){ sb = window.supabase.createClient(url,key); return true;} return false; }
function showSetup(){ $('#setupPanel').style.display='block'; $('#authPanel').style.display='none'; content.style.display='none'; }
function showAuth(){ $('#setupPanel').style.display='none'; $('#authPanel').style.display='block'; content.style.display='none'; $('#logoutBtn').style.display='none'; }
function showApp(){ $('#setupPanel').style.display='none'; $('#authPanel').style.display='none'; content.style.display='block'; $('#logoutBtn').style.display='inline-block'; }
function setPage(title, sub){ $('#pageTitle').textContent=title; $('#pageSubtitle').textContent=sub; }
function studentName(id){ return state.students.find(s=>String(s.id)===String(id))?.name || id || ''; }
function studentById(id){ return state.students.find(s=>String(s.id)===String(id)); }
function studentFee(s){ return Number(s?.fee ?? s?.hourly_fee ?? 0); }
function studentSubject(s){ return s?.subject || s?.course || ''; }

$('#saveConfigBtn').onclick=()=>{ const url=$('#supabaseUrl').value.trim(); const key=$('#supabaseAnon').value.trim(); if(!url||!key) return toast('URL ve anon key gerekli.'); localStorage.setItem('slm_supabase_url',url); localStorage.setItem('slm_supabase_anon',key); initSupabase(); checkSession(); };
$('#loginBtn').onclick=async()=>{ const email=$('#emailInput').value.trim(); const password=$('#passwordInput').value; const {data,error}=await sb.auth.signInWithPassword({email,password}); if(error) return toast(error.message); state.user=data.user; await loadAll(); };
$('#signupBtn').onclick=async()=>{ const email=$('#emailInput').value.trim(); const password=$('#passwordInput').value; const {data,error}=await sb.auth.signUp({email,password}); if(error) return toast(error.message); if(data.user && !data.session) toast('Hesap oluşturuldu. Mail onayı istiyorsa Gmail sekmesinden onayla, sonra giriş yap.'); if(data.session){ state.user=data.user; await loadAll(); } };
$('#logoutBtn').onclick=async()=>{ await sb.auth.signOut(); state.user=null; showAuth(); };
$('#refreshBtn').onclick=()=> loadAll();

async function checkSession(){ if(!initSupabase()) return showSetup(); const {data}=await sb.auth.getSession(); if(!data.session) return showAuth(); state.user=data.session.user; await loadAll(); }
async function loadAll(){
  showApp(); $('#userBox').innerHTML = state.user ? `Giriş: <b>${esc(state.user.email)}</b>` : '';
  const [students, lessons, planned] = await Promise.all([
    sb.from('students').select('*').order('name'),
    sb.from('lessons').select('*').order('lesson_date',{ascending:false}).order('lesson_time',{ascending:false}),
    sb.from('planned').select('*').order('lesson_date',{ascending:true}).order('lesson_time',{ascending:true})
  ]);
  for(const r of [students,lessons,planned]) if(r.error) return toast(r.error.message);
  state.students=students.data||[]; state.lessons=lessons.data||[]; state.planned=planned.data||[];
  render(currentView);
}

document.querySelectorAll('.nav').forEach(btn=>btn.onclick=()=>{ document.querySelectorAll('.nav').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); render(btn.dataset.view); });
function render(view){ currentView=view; if(view==='dashboard') return renderDashboard(); if(view==='calendar') return renderCalendar(); if(view==='students') return renderStudents(); if(view==='addLesson') return renderAddLesson(); if(view==='lessons') return renderLessons(); if(view==='reports') return renderReports(); if(view==='settings') return renderSettings(); }

function renderDashboard(){
  setPage('Dashboard','Bugünkü derslerini ve genel durumunu gör.');
  const today=todayISO(), month=monthISO();
  const todayPlans=state.planned.filter(p=>p.lesson_date===today && (p.status||'planned')==='planned');
  const monthLessons=state.lessons.filter(l=>(l.lesson_date||'').startsWith(month));
  const monthPlans=state.planned.filter(p=>(p.lesson_date||'').startsWith(month));
  const paid=monthLessons.filter(l=>!!l.paid).reduce((a,l)=>a+Number(l.fee||0),0);
  const earned=monthLessons.reduce((a,l)=>a+Number(l.fee||0),0);
  const plannedSum=monthPlans.reduce((a,l)=>a+Number(l.fee||0),0);
  content.innerHTML=`<div class="cards">
    <div class="card"><div class="value">${money(plannedSum)}</div><div class="label">Tahmini aylık gelir</div></div>
    <div class="card"><div class="value">${money(earned)}</div><div class="label">Bugüne kadar hakediş</div></div>
    <div class="card"><div class="value">${money(paid)}</div><div class="label">Tahsil edilen</div></div>
    <div class="card"><div class="value">${monthPlans.length}</div><div class="label">Planlanan ders</div></div>
  </div>
  <div class="panel"><div class="row" style="justify-content:space-between"><h2>Bugün</h2><button class="primary" onclick="openPlanModal()">+ Yeni Ders</button></div>${tablePlans(todayPlans, true)}</div>
  <div class="panel"><h2>Son dersler</h2>${tableLessons(state.lessons.slice(0,8))}</div>`;
}

function renderStudents(){ setPage('Öğrenciler','Öğrenci ekle, düzenle ve takip et.'); content.innerHTML=`<div class="panel"><div class="row" style="justify-content:space-between"><h2>Öğrenci Listesi</h2><button class="primary" onclick="openStudentModal()">+ Öğrenci Ekle</button></div>${tableStudents(state.students)}</div>`; }
function renderCalendar(){
  setPage('Takvim','Haftalık plan.');
  const base = new Date(); const monday = new Date(base); monday.setDate(base.getDate()-((base.getDay()+6)%7));
  const days = Array.from({length:7},(_,i)=>{ const d=new Date(monday); d.setDate(monday.getDate()+i); return d.toISOString().slice(0,10); });
  content.innerHTML=`<div class="panel"><div class="row" style="justify-content:space-between"><h2>Bu Hafta</h2><button class="primary" onclick="openPlanModal()">+ Yeni Plan</button></div><div class="week">${days.map(d=>`<div class="day"><h3>${dateTR(d)}</h3>${dayEvents(d)}</div>`).join('')}</div></div>`;
}
function dayEvents(d){
  const plans=state.planned.filter(p=>p.lesson_date===d).map(p=>`<div class="event ${p.status==='done'?'done':''}"><b>${timeTR(p.lesson_time)}</b> ${esc(studentName(p.student_id))}<br>${money(p.fee)} ${p.status==='planned'?`<br><button class="ghost" onclick="completePlan(${p.id})">Yapıldı</button>`:''}</div>`);
  const lessons=state.lessons.filter(l=>l.lesson_date===d && !state.planned.some(p=>String(p.materialized_lesson_id)===String(l.id))).map(l=>`<div class="event done"><b>${timeTR(l.lesson_time)}</b> ${esc(studentName(l.student_id))}<br>${esc(l.topic||'Ders')} · ${money(l.fee)}</div>`);
  return [...plans,...lessons].join('') || '<span style="color:var(--muted);font-size:12px">Ders yok</span>';
}
function renderAddLesson(){
  setPage('Ders Ekle','İşlenmiş dersi hemen kaydet.');
  content.innerHTML=`<div class="panel"><h2>Ders Kaydet</h2>${lessonForm()}</div>`;
  fillStudentSelect('#lessonStudent'); $('#lessonStudent').onchange=()=>{ const s=studentById($('#lessonStudent').value); $('#lessonFee').value=studentFee(s)||''; };
}
function renderLessons(){
  setPage('Dersler','İşlenmiş ders kayıtları.'); const month=monthISO();
  content.innerHTML=`<div class="panel"><div class="row gap"><label>Ay<input id="lessonMonth" value="${month}"></label><button class="ghost" onclick="renderLessonsFiltered()">Filtrele</button><button class="primary" onclick="openPlanModal()">+ Planla</button></div><div id="lessonsList" style="margin-top:16px"></div></div>`; renderLessonsFiltered();
}
window.renderLessonsFiltered=()=>{ const m=$('#lessonMonth')?.value || monthISO(); const rows=state.lessons.filter(l=>(l.lesson_date||'').startsWith(m)); $('#lessonsList').innerHTML = summaryRows(rows) + tableLessons(rows); };
function renderReports(){
  setPage('Raporlar','Aylık gelir ve ödeme özeti.'); const month=monthISO();
  content.innerHTML=`<div class="panel"><div class="row gap"><label>Ay<input id="reportMonth" value="${month}"></label><button class="ghost" onclick="renderReportFiltered()">Filtrele</button><button class="primary" onclick="exportCSV()">CSV Aktar</button></div><div id="reportList" style="margin-top:16px"></div></div>`; renderReportFiltered();
}
window.renderReportFiltered=()=>{ const m=$('#reportMonth')?.value || monthISO(); const rows=state.lessons.filter(l=>(l.lesson_date||'').startsWith(m)); $('#reportList').innerHTML = summaryRows(rows)+tableLessons(rows); };
function renderSettings(){ const cfg=getConfig(); setPage('Ayarlar','Bağlantı ve bakım.'); content.innerHTML=`<div class="panel"><h2>Supabase Bağlantısı</h2><label>URL<input id="setUrl" value="${esc(cfg.url)}"></label><br><label>Anon key<input id="setKey" type="password" value="${esc(cfg.key)}"></label><br><button class="primary" onclick="saveSettings()">Kaydet</button> <button class="ghost danger" onclick="clearConfig()">Bağlantıyı Sıfırla</button></div>`; }

function summaryRows(rows){ const total=rows.reduce((a,l)=>a+Number(l.fee||0),0), paid=rows.filter(l=>l.paid).reduce((a,l)=>a+Number(l.fee||0),0); return `<div class="cards"><div class="card"><div class="value">${rows.length}</div><div class="label">Ders</div></div><div class="card"><div class="value">${money(total)}</div><div class="label">Toplam</div></div><div class="card"><div class="value">${money(paid)}</div><div class="label">Ödenen</div></div><div class="card"><div class="value">${money(total-paid)}</div><div class="label">Bekleyen</div></div></div>`; }
function tableStudents(rows){ if(!rows.length) return '<p>Kayıt yok.</p>'; return `<table class="table"><thead><tr><th>Ad</th><th>Okul</th><th>Ders</th><th>Ücret</th><th>Veli</th><th>Telefon</th><th></th></tr></thead><tbody>${rows.map(s=>`<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.school)}</td><td>${esc(studentSubject(s))}</td><td>${money(studentFee(s))}</td><td>${esc(s.parent_name)}</td><td>${esc(s.phone)}</td><td><button class="ghost" onclick='openStudentModal(${JSON.stringify(s)})'>Düzenle</button></td></tr>`).join('')}</tbody></table>`; }
function tablePlans(rows, actions=false){ if(!rows.length) return '<p>Kayıt yok.</p>'; return `<table class="table"><thead><tr><th>Tarih</th><th>Saat</th><th>Öğrenci</th><th>Ücret</th><th>Durum</th><th></th></tr></thead><tbody>${rows.map(p=>`<tr><td>${dateTR(p.lesson_date)}</td><td>${timeTR(p.lesson_time)}</td><td><b>${esc(studentName(p.student_id))}</b></td><td>${money(p.fee)}</td><td><span class="badge">${esc(p.status||'planned')}</span></td><td>${(actions || p.status==='planned')?`<button class="ghost" onclick="completePlan(${p.id})">Yapıldı</button>`:''}</td></tr>`).join('')}</tbody></table>`; }
function tableLessons(rows){ if(!rows.length) return '<p>Kayıt yok.</p>'; return `<table class="table"><thead><tr><th>Tarih</th><th>Saat</th><th>Öğrenci</th><th>Konu</th><th>Tutar</th><th>Ödeme</th><th></th></tr></thead><tbody>${rows.map(l=>`<tr><td>${dateTR(l.lesson_date)}</td><td>${timeTR(l.lesson_time)}</td><td><b>${esc(studentName(l.student_id))}</b></td><td>${esc(l.topic||'')}</td><td>${money(l.fee)}</td><td><span class="badge ${l.paid?'paid':'unpaid'}">${l.paid?'Ödendi':'Bekliyor'}</span></td><td><button class="ghost" onclick='openLessonModal(${JSON.stringify(l)})'>Düzenle</button></td></tr>`).join('')}</tbody></table>`; }

function fillStudentSelect(sel, val=''){ const el=$(sel); el.innerHTML=state.students.map(s=>`<option value="${s.id}" ${String(s.id)===String(val)?'selected':''}>${esc(s.name)}</option>`).join(''); }
function lessonForm(l={}){ return `<div class="grid three"><label>Öğrenci<select id="lessonStudent"></select></label><label>Tarih<input id="lessonDate" type="date" value="${l.lesson_date||todayISO()}"></label><label>Saat<input id="lessonTime" type="time" value="${timeTR(l.lesson_time)||'18:00'}"></label><label>Konu<input id="lessonTopic" value="${esc(l.topic||'')}"></label><label>Tutar<input id="lessonFee" type="number" value="${l.fee||''}"></label><label>Ödeme<select id="lessonPaid"><option value="false">Bekliyor</option><option value="true" ${l.paid?'selected':''}>Ödendi</option></select></label></div><br><label>Not<textarea id="lessonNotes">${esc(l.notes||'')}</textarea></label><br><button class="primary" onclick="saveLesson(${l.id||''})">Dersi Kaydet</button>`; }
window.saveLesson=async(id)=>{ const sid=Number($('#lessonStudent').value); const payload={student_id:sid,lesson_date:$('#lessonDate').value,lesson_time:$('#lessonTime').value,duration_min:90,duration:90,topic:$('#lessonTopic').value.trim(),fee:Number($('#lessonFee').value||0),paid:$('#lessonPaid').value==='true',notes:$('#lessonNotes').value.trim()}; const res=id? await sb.from('lessons').update(payload).eq('id',id): await sb.from('lessons').insert(payload); if(res.error) return toast(res.error.message); await loadAll(); toast('Ders kaydedildi.'); };
window.openLessonModal=(l)=>{ const el=document.createElement('div'); el.className='modal-backdrop'; el.innerHTML=`<div class="modal"><h2>Dersi Düzenle</h2>${lessonForm(l)}<br><button class="ghost" id="closeModal">Kapat</button></div>`; document.body.appendChild(el); fillStudentSelect('#lessonStudent', l.student_id); $('#closeModal').onclick=()=>el.remove(); const old=window.saveLesson; window.saveLesson=async(id)=>{ await old(id); el.remove(); window.saveLesson=old; }; };
window.openStudentModal=(s={})=>{ const el=document.createElement('div'); el.className='modal-backdrop'; el.innerHTML=`<div class="modal"><h2>${s.id?'Öğrenciyi Düzenle':'Öğrenci Ekle'}</h2><div class="grid two"><label>Ad<input id="mName" value="${esc(s.name||'')}"></label><label>Okul<input id="mSchool" value="${esc(s.school||'')}"></label><label>Ders<input id="mSubject" value="${esc(studentSubject(s))}"></label><label>90 dk Ücreti<input id="mFee" type="number" value="${studentFee(s)||''}"></label><label>Veli<input id="mParent" value="${esc(s.parent_name||'')}"></label><label>Telefon<input id="mPhone" value="${esc(s.phone||'')}"></label><label>E-posta<input id="mEmail" value="${esc(s.email||'')}"></label><label>Aktif<select id="mActive"><option value="true">Aktif</option><option value="false" ${s.active===false?'selected':''}>Pasif</option></select></label></div><br><label>Not<textarea id="mNotes">${esc(s.notes||'')}</textarea></label><br><div class="row gap"><button class="primary" id="mSave">Kaydet</button><button class="ghost" id="mClose">Kapat</button></div></div>`; document.body.appendChild(el); $('#mClose').onclick=()=>el.remove(); $('#mSave').onclick=async()=>{ const fee=Number($('#mFee').value||0); const payload={name:$('#mName').value.trim(),school:$('#mSchool').value.trim(),subject:$('#mSubject').value.trim(),course:$('#mSubject').value.trim(),fee,hourly_fee:fee,parent_name:$('#mParent').value.trim(),phone:$('#mPhone').value.trim(),email:$('#mEmail').value.trim(),active:$('#mActive').value==='true',notes:$('#mNotes').value.trim()}; const res=s.id? await sb.from('students').update(payload).eq('id',s.id): await sb.from('students').insert(payload); if(res.error) return toast(res.error.message); el.remove(); await loadAll(); toast('Öğrenci kaydedildi.'); }; };
window.openPlanModal=()=>{ const el=document.createElement('div'); el.className='modal-backdrop'; el.innerHTML=`<div class="modal"><h2>Yeni Planlanan Ders</h2><div class="grid three"><label>Öğrenci<select id="pStudent"></select></label><label>Tarih<input id="pDate" type="date" value="${todayISO()}"></label><label>Saat<input id="pTime" type="time" value="18:00"></label><label>Tutar<input id="pFee" type="number"></label><label>Not<input id="pNote"></label><label>Durum<select id="pStatus"><option value="planned">Planlandı</option><option value="done">Yapıldı</option></select></label></div><br><div class="row gap"><button class="primary" id="pSave">Kaydet</button><button class="ghost" id="pClose">Kapat</button></div></div>`; document.body.appendChild(el); fillStudentSelect('#pStudent'); $('#pStudent').onchange=()=>{ $('#pFee').value=studentFee(studentById($('#pStudent').value))||''; }; $('#pStudent').onchange(); $('#pClose').onclick=()=>el.remove(); $('#pSave').onclick=async()=>{ const payload={student_id:Number($('#pStudent').value),lesson_date:$('#pDate').value,lesson_time:$('#pTime').value,fee:Number($('#pFee').value||0),note:$('#pNote').value.trim(),status:$('#pStatus').value,recurring:false,repeat_rule:'none',weekday:new Date($('#pDate').value+'T12:00:00').getDay()===0?6:new Date($('#pDate').value+'T12:00:00').getDay()-1}; const res=await sb.from('planned').insert(payload); if(res.error) return toast(res.error.message); el.remove(); await loadAll(); toast('Plan kaydedildi.'); }; };
window.completePlan=async(id)=>{ const p=state.planned.find(x=>String(x.id)===String(id)); if(!p) return; const lesson={student_id:p.student_id,lesson_date:p.lesson_date,lesson_time:p.lesson_time,duration_min:90,duration:90,topic:p.note||'',fee:Number(p.fee||0),paid:false,notes:p.note||'',planned_id:p.id}; const ins=await sb.from('lessons').insert(lesson).select().single(); if(ins.error) return toast(ins.error.message); const upd=await sb.from('planned').update({status:'done',materialized_lesson_id:ins.data.id,actual_lesson_id:ins.data.id}).eq('id',p.id); if(upd.error) return toast(upd.error.message); await loadAll(); toast('Ders yapıldı olarak işlendi.'); };
window.saveSettings=()=>{ localStorage.setItem('slm_supabase_url',$('#setUrl').value.trim()); localStorage.setItem('slm_supabase_anon',$('#setKey').value.trim()); toast('Kaydedildi.'); location.reload(); };
window.clearConfig=()=>{ localStorage.removeItem('slm_supabase_url'); localStorage.removeItem('slm_supabase_anon'); location.reload(); };
window.exportCSV=()=>{ const m=$('#reportMonth')?.value || monthISO(); const rows=state.lessons.filter(l=>(l.lesson_date||'').startsWith(m)); const csv=[['Tarih','Saat','Öğrenci','Konu','Tutar','Ödeme','Not'],...rows.map(l=>[l.lesson_date,l.lesson_time,studentName(l.student_id),l.topic,l.fee,l.paid?'Ödendi':'Bekliyor',l.notes])].map(r=>r.map(x=>`"${String(x??'').replaceAll('"','""')}"`).join(',')).join('\n'); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})); a.download=`ders_raporu_${m}.csv`; a.click(); };

checkSession();
