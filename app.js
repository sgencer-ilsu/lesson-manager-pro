const state = { view:'dashboard', students:[], lessons:[], planned:[], settings:null };
const LS_KEY = 'sgencer_lesson_manager_supabase_v1';
const $ = s => document.querySelector(s);
const content = $('#content');

function money(x){ return `${Math.round(Number(x||0)).toLocaleString('tr-TR')} TL`; }
function today(){ return new Date().toISOString().slice(0,10); }
function monthKey(d=new Date()){ return d.toISOString().slice(0,7); }
function fmtDate(s){ if(!s) return ''; const d=new Date(s+'T00:00'); return d.toLocaleDateString('tr-TR',{day:'2-digit',month:'short',weekday:'short'}); }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'),2800); }
function getStudent(id){ return state.students.find(s=>String(s.id)===String(id)) || {}; }
function getFeeStudent(s){ return Number(s.fee || s.hourly_fee || 0); }
function studentSubject(s){ return s.subject || s.course || ''; }

function loadSettings(){ try{return JSON.parse(localStorage.getItem(LS_KEY)||'null')}catch{return null} }
function saveSettings(v){ localStorage.setItem(LS_KEY, JSON.stringify(v)); state.settings=v; }
function configured(){ state.settings=loadSettings(); return state.settings?.url && state.settings?.key; }

async function api(table, opts={}){
  const {url,key}=state.settings||{};
  if(!url || !key) throw new Error('Supabase ayarları eksik');
  let endpoint = `${url.replace(/\/$/,'')}/rest/v1/${table}`;
  if(opts.query) endpoint += `?${opts.query}`;
  const headers = { apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json', Prefer:'return=representation' };
  const res = await fetch(endpoint, { method:opts.method||'GET', headers, body:opts.body?JSON.stringify(opts.body):undefined });
  const text = await res.text();
  if(!res.ok){ throw new Error(text || res.statusText); }
  return text ? JSON.parse(text) : null;
}

async function loadAll(){
  if(!configured()){ showSetup(); return; }
  hideSetup();
  try{
    const [students, lessons, planned] = await Promise.all([
      api('students',''),
      api('lessons',{query:'select=*&order=lesson_date.desc,lesson_time.desc'}),
      api('planned',{query:'select=*&order=lesson_date.asc,lesson_time.asc'})
    ]);
    state.students = (students||[]).sort((a,b)=>String(a.name).localeCompare(String(b.name),'tr'));
    state.lessons = lessons||[];
    state.planned = planned||[];
    render();
  }catch(e){ showSetup(); content.innerHTML = `<div class="card pad"><h2>Bağlantı hatası</h2><p class="muted">${escapeHtml(e.message)}</p><p>Supabase bilgilerini kontrol et. Veri gelmiyorsa zip içindeki <b>04_quick_web_access.sql</b> dosyasını SQL Editor'da çalıştır.</p></div>`; }
}

function showSetup(){ $('#setupCard').classList.remove('hidden'); const s=loadSettings()||{}; $('#setupUrl').value=s.url||''; $('#setupKey').value=s.key||''; }
function hideSetup(){ $('#setupCard').classList.add('hidden'); }
$('#saveSetup').onclick = ()=>{ saveSettings({url:$('#setupUrl').value.trim(), key:$('#setupKey').value.trim()}); loadAll(); };
$('#refreshBtn').onclick = loadAll;
$('#closeModal').onclick = closeModal;
$('#modal').addEventListener('click',e=>{ if(e.target.id==='modal') closeModal(); });

function escapeHtml(s){ return String(s??'').replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); }
function setView(v){ state.view=v; document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.view===v)); render(); }
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('#addBtn').onclick = ()=>{
  if(state.view==='students') openStudentForm();
  else if(state.view==='planned') openPlannedForm();
  else if(state.view==='lessons') openLessonForm();
  else if(state.view==='dashboard') openPlannedForm();
};

function render(){
  const titles={dashboard:['Dashboard','Bugünkü derslerini ve genel durumunu gör.'],students:['Öğrenciler','Öğrenci bilgilerini yönet.'],planned:['Planlanan','Gelecek dersleri planla ve tamamla.'],lessons:['Dersler','İşlenmiş dersler ve ödeme takibi.'],settings:['Ayarlar','Supabase bağlantı bilgileri.']};
  $('#pageTitle').textContent=titles[state.view][0]; $('#pageSub').textContent=titles[state.view][1];
  $('#addBtn').style.display = ['students','planned','lessons','dashboard'].includes(state.view) ? '' : 'none';
  if(state.view==='dashboard') renderDashboard();
  if(state.view==='students') renderStudents();
  if(state.view==='planned') renderPlanned();
  if(state.view==='lessons') renderLessons();
  if(state.view==='settings') renderSettings();
}

function renderDashboard(){
  const t=today(), m=monthKey();
  const todayPlanned = state.planned.filter(p=>p.lesson_date===t && p.status!=='cancelled');
  const monthLessons = state.lessons.filter(l=>String(l.lesson_date||'').startsWith(m));
  const revenue = monthLessons.reduce((a,l)=>a+Number(l.fee||0),0);
  const unpaid = monthLessons.filter(l=>!l.paid).reduce((a,l)=>a+Number(l.fee||0),0);
  content.innerHTML = `
    <div class="grid stats">
      <div class="card stat"><div class="label">Bugün</div><div class="value">${todayPlanned.length}</div><div class="sub">planlanan ders</div></div>
      <div class="card stat"><div class="label">Bu Ay</div><div class="value">${monthLessons.length}</div><div class="sub">işlenmiş ders</div></div>
      <div class="card stat"><div class="label">Bu Ay Gelir</div><div class="value">${money(revenue)}</div><div class="sub">toplam ders ücreti</div></div>
      <div class="card stat"><div class="label">Bekleyen</div><div class="value">${money(unpaid)}</div><div class="sub">ödenmemiş</div></div>
    </div>
    <div class="grid two">
      <div class="card pad"><h2>Bugünkü Plan</h2><div class="list">${todayPlanned.length?todayPlanned.map(planRow).join(''):'<div class="empty">Bugün planlanan ders yok.</div>'}</div></div>
      <div class="card pad"><h2>Son Dersler</h2><div class="list">${state.lessons.slice(0,6).map(lessonRow).join('') || '<div class="empty">Henüz ders yok.</div>'}</div></div>
    </div>`;
}
function planRow(p){ const s=getStudent(p.student_id); return `<div class="row"><div class="rowMain"><span class="dot" style="background:${s.color||'#38bdf8'}"></span><div><b>${escapeHtml(s.name||'Öğrenci')}</b><div class="muted small">${fmtDate(p.lesson_date)} ${p.lesson_time||''} · ${money(p.fee||getFeeStudent(s))}</div></div></div><span class="badge ${p.status==='done'?'green':'orange'}">${p.status||'planned'}</span></div>`; }
function lessonRow(l){ const s=getStudent(l.student_id); return `<div class="row"><div class="rowMain"><span class="dot" style="background:${s.color||'#38bdf8'}"></span><div><b>${escapeHtml(s.name||'Öğrenci')}</b><div class="muted small">${fmtDate(l.lesson_date)} ${l.lesson_time||''} · ${escapeHtml(l.topic||'')}</div></div></div><div><span class="money">${money(l.fee)}</span> <span class="badge ${l.paid?'green':'red'}">${l.paid?'Ödendi':'Bekliyor'}</span></div></div>`; }

function renderStudents(){
  content.innerHTML = `<div class="filters"><input id="studentSearch" placeholder="Öğrenci ara..."></div><div class="tableWrap"><table><thead><tr><th>Ad</th><th>Okul</th><th>Ders</th><th>Ücret</th><th>Veli</th><th>Telefon</th><th>İşlem</th></tr></thead><tbody id="studentsBody"></tbody></table></div>`;
  const draw=()=>{ const q=($('#studentSearch').value||'').toLowerCase(); $('#studentsBody').innerHTML = state.students.filter(s=>JSON.stringify(s).toLowerCase().includes(q)).map(s=>`
    <tr><td><b>${escapeHtml(s.name)}</b></td><td>${escapeHtml(s.school||'')}</td><td>${escapeHtml(studentSubject(s))}</td><td>${money(getFeeStudent(s))}</td><td>${escapeHtml(s.parent_name||'')}</td><td>${escapeHtml(s.phone||'')}</td><td><div class="actions"><button class="ghost" onclick="openStudentForm(${s.id})">Düzenle</button></div></td></tr>`).join('') || '<tr><td colspan="7" class="empty">Öğrenci yok.</td></tr>'; };
  $('#studentSearch').oninput=draw; draw();
}

function renderPlanned(){
  content.innerHTML = `<div class="filters"><select id="planFilter"><option value="future">Gelecek</option><option value="all">Tümü</option><option value="done">Tamamlanan</option></select></div><div class="tableWrap"><table><thead><tr><th>Tarih</th><th>Saat</th><th>Öğrenci</th><th>Ücret</th><th>Not</th><th>Durum</th><th>İşlem</th></tr></thead><tbody id="plannedBody"></tbody></table></div>`;
  const draw=()=>{ const f=$('#planFilter').value; let arr=[...state.planned]; if(f==='future') arr=arr.filter(p=>p.status!=='done' && p.status!=='cancelled'); if(f==='done') arr=arr.filter(p=>p.status==='done'); $('#plannedBody').innerHTML = arr.map(p=>{ const s=getStudent(p.student_id); return `<tr><td>${fmtDate(p.lesson_date)}</td><td>${p.lesson_time||''}</td><td><b>${escapeHtml(s.name||'')}</b></td><td>${money(p.fee||getFeeStudent(s))}</td><td>${escapeHtml(p.note||'')}</td><td><span class="badge ${p.status==='done'?'green':'orange'}">${p.status||'planned'}</span></td><td><div class="actions">${p.status!=='done'?`<button class="ok" onclick="completePlanned(${p.id})">Dersi işle</button>`:''}<button class="ghost" onclick="openPlannedForm(${p.id})">Düzenle</button><button class="danger" onclick="deleteRow('planned',${p.id})">Sil</button></div></td></tr>` }).join('') || '<tr><td colspan="7" class="empty">Plan yok.</td></tr>'; };
  $('#planFilter').onchange=draw; draw();
}

function renderLessons(){
  content.innerHTML = `<div class="filters"><input id="lessonMonth" type="month" value="${monthKey()}"><select id="lessonStudent"><option value="">Tüm öğrenciler</option>${state.students.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}</select></div><div class="tableWrap"><table><thead><tr><th>Tarih</th><th>Saat</th><th>Öğrenci</th><th>Konu</th><th>Ücret</th><th>Ödeme</th><th>İşlem</th></tr></thead><tbody id="lessonsBody"></tbody></table></div>`;
  const draw=()=>{ const mo=$('#lessonMonth').value, sid=$('#lessonStudent').value; let arr=state.lessons.filter(l=>(!mo || String(l.lesson_date).startsWith(mo)) && (!sid || String(l.student_id)===sid)); $('#lessonsBody').innerHTML = arr.map(l=>{ const s=getStudent(l.student_id); return `<tr><td>${fmtDate(l.lesson_date)}</td><td>${l.lesson_time||''}</td><td><b>${escapeHtml(s.name||'')}</b></td><td>${escapeHtml(l.topic||'')}</td><td>${money(l.fee)}</td><td><button class="${l.paid?'ok':'danger'}" onclick="togglePaid(${l.id},${!l.paid})">${l.paid?'Ödendi':'Bekliyor'}</button></td><td><div class="actions"><button class="ghost" onclick="openLessonForm(${l.id})">Düzenle</button><button class="danger" onclick="deleteRow('lessons',${l.id})">Sil</button></div></td></tr>` }).join('') || '<tr><td colspan="7" class="empty">Ders yok.</td></tr>'; };
  $('#lessonMonth').onchange=draw; $('#lessonStudent').onchange=draw; draw();
}

function renderSettings(){ const s=state.settings||{}; content.innerHTML=`<div class="card pad"><h2>Supabase Bağlantısı</h2><p class="muted">Bilgiler bu tarayıcıda saklanır.</p><div class="setupGrid"><label>Project URL<input id="setUrl" value="${escapeHtml(s.url||'')}"></label><label>Anon public key<input id="setKey" value="${escapeHtml(s.key||'')}"></label></div><button class="primary" onclick="saveSettings({url:document.querySelector('#setUrl').value.trim(),key:document.querySelector('#setKey').value.trim()}); loadAll(); toast('Kaydedildi')">Kaydet</button></div>`; }

function modal(title, html, onSubmit){ $('#modalTitle').textContent=title; $('#modalForm').innerHTML=html; $('#modal').classList.remove('hidden'); $('#modalForm').onsubmit=async e=>{ e.preventDefault(); await onSubmit(new FormData(e.target)); closeModal(); await loadAll(); }; }
function closeModal(){ $('#modal').classList.add('hidden'); $('#modalForm').innerHTML=''; }
function studentOptions(selected=''){ return state.students.map(s=>`<option value="${s.id}" ${String(selected)===String(s.id)?'selected':''}>${escapeHtml(s.name)}</option>`).join(''); }

window.openStudentForm = (id)=>{ const s=id?getStudent(id):{}; modal(id?'Öğrenci Düzenle':'Yeni Öğrenci', `
  <label>Ad Soyad<input name="name" required value="${escapeHtml(s.name||'')}"></label><label>Okul<input name="school" value="${escapeHtml(s.school||'')}"></label>
  <label>Ders<input name="subject" value="${escapeHtml(studentSubject(s)||'')}"></label><label>Ücret<input name="fee" type="number" value="${getFeeStudent(s)||''}"></label>
  <label>Veli<input name="parent_name" value="${escapeHtml(s.parent_name||'')}"></label><label>Telefon<input name="phone" value="${escapeHtml(s.phone||'')}"></label>
  <label>E-posta<input name="email" value="${escapeHtml(s.email||'')}"></label><label>Renk<input name="color" type="color" value="${s.color||'#2563eb'}"></label>
  <label class="full">Notlar<textarea name="notes">${escapeHtml(s.notes||'')}</textarea></label><div class="formFooter"><button class="ghost" type="button" onclick="closeModal()">Vazgeç</button><button class="primary">Kaydet</button></div>`, async fd=>{
    const body=Object.fromEntries(fd.entries()); body.fee=Number(body.fee||0); body.hourly_fee=body.fee; body.course=body.subject; body.active=true;
    if(id) await api('students',{method:'PATCH',query:`id=eq.${id}`,body}); else await api('students',{method:'POST',body}); toast('Öğrenci kaydedildi');
  }); };

window.openPlannedForm = (id)=>{ const p=id?state.planned.find(x=>x.id===id):{lesson_date:today(),lesson_time:'19:30'}; modal(id?'Plan Düzenle':'Yeni Plan', `
  <label>Öğrenci<select name="student_id" required>${studentOptions(p.student_id)}</select></label><label>Tarih<input name="lesson_date" type="date" required value="${p.lesson_date||today()}"></label>
  <label>Saat<input name="lesson_time" type="time" required value="${p.lesson_time||'19:30'}"></label><label>Ücret<input name="fee" type="number" value="${p.fee||''}"></label>
  <label class="full">Not<textarea name="note">${escapeHtml(p.note||'')}</textarea></label><div class="formFooter"><button class="ghost" type="button" onclick="closeModal()">Vazgeç</button><button class="primary">Kaydet</button></div>`, async fd=>{
    const body=Object.fromEntries(fd.entries()); body.student_id=Number(body.student_id); body.fee=Number(body.fee||getFeeStudent(getStudent(body.student_id))||0); body.status=body.status||'planned';
    if(id) await api('planned',{method:'PATCH',query:`id=eq.${id}`,body}); else await api('planned',{method:'POST',body}); toast('Plan kaydedildi');
  }); };

window.openLessonForm = (id)=>{ const l=id?state.lessons.find(x=>x.id===id):{lesson_date:today(),lesson_time:'19:30',duration_min:90}; modal(id?'Ders Düzenle':'Yeni Ders', `
  <label>Öğrenci<select name="student_id" required>${studentOptions(l.student_id)}</select></label><label>Tarih<input name="lesson_date" type="date" required value="${l.lesson_date||today()}"></label>
  <label>Saat<input name="lesson_time" type="time" required value="${l.lesson_time||'19:30'}"></label><label>Süre<input name="duration_min" type="number" value="${l.duration_min||l.duration||90}"></label>
  <label>Konu<input name="topic" value="${escapeHtml(l.topic||'')}"></label><label>Ücret<input name="fee" type="number" value="${l.fee||''}"></label>
  <label>Ödendi mi?<select name="paid"><option value="false" ${!l.paid?'selected':''}>Hayır</option><option value="true" ${l.paid?'selected':''}>Evet</option></select></label>
  <label class="full">Notlar<textarea name="notes">${escapeHtml(l.notes||'')}</textarea></label><div class="formFooter"><button class="ghost" type="button" onclick="closeModal()">Vazgeç</button><button class="primary">Kaydet</button></div>`, async fd=>{
    const body=Object.fromEntries(fd.entries()); body.student_id=Number(body.student_id); body.fee=Number(body.fee||getFeeStudent(getStudent(body.student_id))||0); body.duration_min=Number(body.duration_min||90); body.duration=body.duration_min; body.paid=body.paid==='true';
    if(id) await api('lessons',{method:'PATCH',query:`id=eq.${id}`,body}); else await api('lessons',{method:'POST',body}); toast('Ders kaydedildi');
  }); };

window.completePlanned = async (id)=>{ const p=state.planned.find(x=>x.id===id); if(!p) return; const s=getStudent(p.student_id); const lesson = await api('lessons',{method:'POST',body:{student_id:p.student_id, lesson_date:p.lesson_date, lesson_time:p.lesson_time, duration:90, duration_min:90, topic:'', fee:Number(p.fee||getFeeStudent(s)||0), paid:false, notes:p.note||'', planned_id:p.id}}); const newId=Array.isArray(lesson)&&lesson[0]?.id; await api('planned',{method:'PATCH',query:`id=eq.${id}`,body:{status:'done', materialized_lesson_id:newId||null, actual_lesson_id:newId||null}}); toast('Ders işlendi'); await loadAll(); };
window.togglePaid = async (id, val)=>{ await api('lessons',{method:'PATCH',query:`id=eq.${id}`,body:{paid:val}}); toast(val?'Ödendi işaretlendi':'Bekliyor işaretlendi'); await loadAll(); };
window.deleteRow = async (table,id)=>{ if(!confirm('Silinsin mi?')) return; await api(table,{method:'DELETE',query:`id=eq.${id}`}); toast('Silindi'); await loadAll(); };

loadAll();
