const $ = (s) => document.querySelector(s);
const content = $('#content');
let sb = null;
let state = { students: [], lessons: [], planned: [], user: null };

function toast(msg){ const t=$('#toast'); t.textContent=msg; t.style.display='block'; setTimeout(()=>t.style.display='none',3200); }
function money(n){ return new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:0}).format(Number(n||0)); }
function dateTR(d){ if(!d) return ''; return new Date(d+'T12:00:00').toLocaleDateString('tr-TR',{day:'2-digit',month:'short',year:'numeric'}); }
function getConfig(){ return { url: localStorage.getItem('slm_supabase_url')||'', key: localStorage.getItem('slm_supabase_anon')||''}; }
function initSupabase(){ const {url,key}=getConfig(); if(url&&key&&window.supabase){ sb = window.supabase.createClient(url,key); return true;} return false; }
function setPage(title, sub){ $('#pageTitle').textContent=title; $('#pageSubtitle').textContent=sub; }
function showSetup(){ $('#setupPanel').style.display='block'; $('#authPanel').style.display='none'; content.style.display='none'; }
function showAuth(){ $('#setupPanel').style.display='none'; $('#authPanel').style.display='block'; content.style.display='none'; }
function showApp(){ $('#setupPanel').style.display='none'; $('#authPanel').style.display='none'; content.style.display='block'; $('#logoutBtn').style.display='inline-block'; }

$('#saveConfigBtn').onclick=()=>{ const url=$('#supabaseUrl').value.trim(); const key=$('#supabaseAnon').value.trim(); if(!url||!key) return toast('URL ve anon key gerekli.'); localStorage.setItem('slm_supabase_url',url); localStorage.setItem('slm_supabase_anon',key); initSupabase(); checkSession(); };
$('#loginBtn').onclick=async()=>{ const email=$('#emailInput').value.trim(); const password=$('#passwordInput').value; const {data,error}=await sb.auth.signInWithPassword({email,password}); if(error) return toast(error.message); state.user=data.user; await loadAll(); };
$('#signupBtn').onclick=async()=>{ const email=$('#emailInput').value.trim(); const password=$('#passwordInput').value; const {data,error}=await sb.auth.signUp({email,password}); if(error) return toast(error.message); toast('Hesap oluşturuldu. Mail onayı gerekirse e-postanı kontrol et.'); if(data.user){ state.user=data.user; await loadAll(); }};
$('#logoutBtn').onclick=async()=>{ await sb.auth.signOut(); state.user=null; showAuth(); };
$('#refreshBtn').onclick=()=> loadAll();

async function checkSession(){ if(!initSupabase()) return showSetup(); const {data}=await sb.auth.getSession(); if(!data.session) return showAuth(); state.user=data.session.user; await loadAll(); }

async function loadAll(){
  showApp();
  $('#userBox').innerHTML = state.user ? `Giriş: <b>${state.user.email}</b>` : '';
  const [students, lessons, planned] = await Promise.all([
    sb.from('students').select('*').order('name'),
    sb.from('lessons').select('*').order('lesson_date',{ascending:false}),
    sb.from('planned').select('*').order('lesson_date',{ascending:true})
  ]);
  for(const r of [students,lessons,planned]) if(r.error) return toast(r.error.message);
  state.students=students.data||[]; state.lessons=lessons.data||[]; state.planned=planned.data||[];
  render(currentView);
}

let currentView='dashboard';
document.querySelectorAll('.nav').forEach(btn=>btn.onclick=()=>{ document.querySelectorAll('.nav').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); render(btn.dataset.view); });
function render(view){ currentView=view; if(view==='dashboard') return renderDashboard(); if(view==='students') return renderStudents(); if(view==='planned') return renderPlanned(); if(view==='lessons') return renderLessons(); if(view==='settings') return renderSettings(); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function monthISO(){ return new Date().toISOString().slice(0,7); }
function getStudent(id){ return state.students.find(s=>String(s.id)===String(id)); }
function renderDashboard(){
  setPage('Dashboard','Bugünkü derslerini ve aylık durumunu gör.');
  const today=todayISO(); const month=monthISO();
  const todayPlans=state.planned.filter(p=>p.lesson_date===today);
  const monthLessons=state.lessons.filter(l=>(l.lesson_date||'').startsWith(month));
  const monthIncome=monthLessons.reduce((a,l)=>a+Number(l.fee||0),0);
  content.innerHTML=`
  <div class="cards">
    <div class="card"><div class="value">${state.students.length}</div><div class="label">Öğrenci</div></div>
    <div class="card"><div class="value">${todayPlans.length}</div><div class="label">Bugünkü plan</div></div>
    <div class="card"><div class="value">${monthLessons.length}</div><div class="label">Bu ay ders</div></div>
    <div class="card"><div class="value">${money(monthIncome)}</div><div class="label">Bu ay gelir</div></div>
  </div>
  <div class="panel"><h2>Bugün</h2>${tablePlans(todayPlans)}</div>
  <div class="panel"><h2>Son dersler</h2>${tableLessons(state.lessons.slice(0,8))}</div>`;
}
function renderStudents(){ setPage('Öğrenciler','Öğrenci ekle, düzenle ve takip et.'); content.innerHTML=`<div class="panel"><div class="row" style="justify-content:space-between"><h2>Öğrenci Listesi</h2><button class="primary" onclick="openStudentModal()">+ Öğrenci Ekle</button></div>${tableStudents(state.students)}</div>`; }
function renderPlanned(){ setPage('Planlanan','Yaklaşan ve planlanmış dersler.'); content.innerHTML=`<div class="panel"><h2>Planlanan Dersler</h2>${tablePlans(state.planned)}</div>`; }
function renderLessons(){ setPage('Dersler','İşlenmiş ders kayıtları.'); content.innerHTML=`<div class="panel"><h2>Ders Geçmişi</h2>${tableLessons(state.lessons)}</div>`; }
function renderSettings(){ setPage('Ayarlar','Bağlantı bilgileri ve bakım.'); const cfg=getConfig(); content.innerHTML=`<div class="panel"><h2>Supabase Bağlantısı</h2><p>Anon key public olduğu için burada tutulabilir. Database password burada kullanılmaz.</p><label>URL<input id="setUrl" value="${cfg.url}"></label><br><label>Anon key<input id="setKey" type="password" value="${cfg.key}"></label><br><button class="primary" onclick="saveSettings()">Kaydet</button> <button class="ghost danger" onclick="clearConfig()">Bağlantıyı Sıfırla</button></div>`; }
function tableStudents(rows){ if(!rows.length) return '<p>Kayıt yok.</p>'; return `<table class="table"><thead><tr><th>Ad</th><th>Okul</th><th>Ders</th><th>Ücret</th><th>Veli</th><th></th></tr></thead><tbody>${rows.map(s=>`<tr><td><b>${s.name||''}</b></td><td>${s.school||''}</td><td>${s.course||''}</td><td>${money(s.hourly_fee)}</td><td>${s.parent_name||''}</td><td><button class="ghost" onclick='openStudentModal(${JSON.stringify(s).replaceAll("'","&apos;")})'>Düzenle</button></td></tr>`).join('')}</tbody></table>`; }
function tablePlans(rows){ if(!rows.length) return '<p>Kayıt yok.</p>'; return `<table class="table"><thead><tr><th>Tarih</th><th>Saat</th><th>Öğrenci</th><th>Ücret</th><th>Durum</th></tr></thead><tbody>${rows.map(p=>`<tr><td>${dateTR(p.lesson_date)}</td><td>${p.lesson_time||''}</td><td><b>${getStudent(p.student_id)?.name||p.student_id}</b></td><td>${money(p.fee)}</td><td><span class="badge">${p.status||'plan'}</span></td></tr>`).join('')}</tbody></table>`; }
function tableLessons(rows){ if(!rows.length) return '<p>Kayıt yok.</p>'; return `<table class="table"><thead><tr><th>Tarih</th><th>Öğrenci</th><th>Süre</th><th>Ücret</th><th>Ödeme</th><th>Not</th></tr></thead><tbody>${rows.map(l=>`<tr><td>${dateTR(l.lesson_date)}</td><td><b>${getStudent(l.student_id)?.name||l.student_id}</b></td><td>${l.duration_min||''} dk</td><td>${money(l.fee)}</td><td>${l.paid?'Ödendi':'Bekliyor'}</td><td>${l.note||''}</td></tr>`).join('')}</tbody></table>`; }
window.saveSettings=()=>{ localStorage.setItem('slm_supabase_url',$('#setUrl').value.trim()); localStorage.setItem('slm_supabase_anon',$('#setKey').value.trim()); toast('Kaydedildi.'); location.reload(); }
window.clearConfig=()=>{ localStorage.removeItem('slm_supabase_url'); localStorage.removeItem('slm_supabase_anon'); location.reload(); }
window.openStudentModal=(s={})=>{
  const el=document.createElement('div'); el.className='modal-backdrop'; el.innerHTML=`<div class="modal"><h2>${s.id?'Öğrenciyi Düzenle':'Öğrenci Ekle'}</h2><div class="grid two"><label>Ad<input id="mName" value="${s.name||''}"></label><label>Okul<input id="mSchool" value="${s.school||''}"></label><label>Ders<input id="mCourse" value="${s.course||''}"></label><label>Saatlik ücret<input id="mFee" type="number" value="${s.hourly_fee||0}"></label><label>Veli<input id="mParent" value="${s.parent_name||''}"></label><label>Telefon<input id="mPhone" value="${s.parent_phone||''}"></label></div><br><label>Not<textarea id="mNotes">${s.notes||''}</textarea></label><br><div class="row gap"><button class="primary" id="mSave">Kaydet</button><button class="ghost" id="mClose">Kapat</button></div></div>`; document.body.appendChild(el); $('#mClose').onclick=()=>el.remove(); $('#mSave').onclick=async()=>{ const payload={name:$('#mName').value.trim(),school:$('#mSchool').value.trim(),course:$('#mCourse').value.trim(),hourly_fee:Number($('#mFee').value||0),parent_name:$('#mParent').value.trim(),parent_phone:$('#mPhone').value.trim(),notes:$('#mNotes').value.trim()}; const res=s.id? await sb.from('students').update(payload).eq('id',s.id): await sb.from('students').insert(payload); if(res.error) return toast(res.error.message); el.remove(); await loadAll(); toast('Öğrenci kaydedildi.'); };
}

checkSession();
