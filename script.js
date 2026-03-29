
(function(){
  const c = document.getElementById('bubbles');
  const ctx = c.getContext('2d');
  const DARK_COLORS  = ['rgba(124,92,252,', 'rgba(255,107,107,', 'rgba(255,196,107,', 'rgba(67,232,216,'];
  const LIGHT_COLORS = ['rgba(140,90,210,',  'rgba(200,80,60,',   'rgba(180,110,30,',  'rgba(80,150,130,'];
  let bs = [];
  function resize(){ c.width = window.innerWidth; c.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  function make(){
    const r = 30 + Math.random() * 70;
    return { x: Math.random() * window.innerWidth, y: window.innerHeight + r, r, speed: 0.25 + Math.random() * 0.4, drift: (Math.random() - .5) * 0.35, ci: Math.floor(Math.random() * 4), opBase: 0.04 + Math.random() * 0.06 };
  }
  for(let i = 0; i < 20; i++){ const b = make(); b.y = Math.random() * window.innerHeight; bs.push(b); }
  function draw(){
    ctx.clearRect(0, 0, c.width, c.height);
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const pal = isLight ? LIGHT_COLORS : DARK_COLORS;
    const opMul = isLight ? 3.5 : 1;
    bs.forEach(b => {
      b.y -= b.speed; b.x += b.drift;
      if(b.y < -b.r * 2) Object.assign(b, make());
      const op = b.opBase * opMul;
      const g = ctx.createRadialGradient(b.x - b.r * .3, b.y - b.r * .3, b.r * .1, b.x, b.y, b.r);
      g.addColorStop(0, pal[b.ci] + Math.min(op * 1.8, 0.45) + ')');
      g.addColorStop(0.6, pal[b.ci] + Math.min(op, 0.25) + ')');
      g.addColorStop(1, pal[b.ci] + '0)');
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.strokeStyle = pal[b.ci] + Math.min(op * 1.2, 0.3) + ')';
      ctx.lineWidth = isLight ? 1.5 : 1; ctx.stroke();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ════════════════════════════════════════
// STORAGE
// ════════════════════════════════════════
const S = {
  g: (k, d=null) => { try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d }catch{ return d } },
  s: (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)) }catch{} },
};

// ════════════════════════════════════════
// THEME
// ════════════════════════════════════════
(()=>{ document.documentElement.setAttribute('data-theme', S.g('stride_theme','dark')); })();
function toggleTheme(){
  const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  S.s('stride_theme', t);
}

// ════════════════════════════════════════
// NAV
// ════════════════════════════════════════
function nav(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  if(page==='review') renderReview();
  if(page==='schedule') renderSchedule();
  if(page==='notes') renderNList();
}

// ════════════════════════════════════════
// TOAST
// ════════════════════════════════════════
function toast(msg, type='ok'){
  const c = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = {ok:'✓', err:'✕', info:'◆'};
  const col = type==='ok'?'var(--mint)':type==='err'?'var(--accent)':'var(--prime)';
  el.innerHTML = `<span style="font-weight:700;font-size:1rem;color:${col}">${icons[type]||'·'}</span><span>${msg}</span>`;
  c.appendChild(el);
  setTimeout(()=>{ el.style.animation='t-in .25s reverse both'; setTimeout(()=>el.remove(),250); }, 2600);
}

// ════════════════════════════════════════
// TASKS
// ════════════════════════════════════════
let tasks = S.g('stride_tasks', []);
let taskFilter = 'all';
let autoSort = false;
let focusMode = false;
let pendTags = [];
let dragId = null;
const PRI_ORDER = {critical:0, high:1, medium:2, low:3};

if(!tasks.length){
  tasks = [
    {id:uid(),text:'Update portfolio with new projects',priority:'critical',date:'',tags:['dev','portfolio'],completed:false,createdAt:Date.now()-6e3},
    {id:uid(),text:'Solve 3 LeetCode problems',priority:'high',date:tomorrow(),tags:['study'],completed:false,createdAt:Date.now()-5e3},
    {id:uid(),text:'Write weekly review notes',priority:'medium',date:'',tags:[],completed:false,createdAt:Date.now()-4e3},
    {id:uid(),text:'Read 30 pages',priority:'low',date:'',tags:['personal'],completed:true,createdAt:Date.now()-3e3,completedAt:Date.now()-3e3},
  ];
  saveTasks();
}

function uid(){ return Math.random().toString(36).slice(2,9)+Date.now().toString(36); }
function tomorrow(){ const d=new Date(); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); }
function saveTasks(){ S.s('stride_tasks', tasks); }
function escH(s){ return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function addTag(){
  const el = document.getElementById('tagIn');
  const v = el.value.trim().toLowerCase().replace(/\s+/g,'-').slice(0,20);
  if(!v || pendTags.includes(v)) return;
  pendTags.push(v); el.value='';
  renderPendTags();
}
function renderPendTags(){
  document.getElementById('pendingTags').innerHTML = pendTags.map(t=>
    `<span class="tag-chip">#${escH(t)}<button onclick="rmTag('${t}')">✕</button></span>`
  ).join('');
}
function rmTag(t){ pendTags=pendTags.filter(x=>x!==t); renderPendTags(); }

document.getElementById('tagIn').addEventListener('keydown', e=>{ if(e.key==='Enter') addTag(); });
document.getElementById('taskIn').addEventListener('keydown', e=>{ if(e.key==='Enter') addTask(); });

function addTask(){
  const text = document.getElementById('taskIn').value.trim();
  if(!text){
    const el = document.getElementById('taskIn');
    el.style.borderColor = 'var(--accent)';
    el.style.animation = 'shake .35s ease';
    setTimeout(()=>{ el.style.borderColor=''; el.style.animation=''; }, 700);
    return;
  }
  const t = {id:uid(), text, priority:document.getElementById('priSel').value, date:document.getElementById('dateIn').value, tags:[...pendTags], completed:false, createdAt:Date.now()};
  tasks.unshift(t);
  document.getElementById('taskIn').value = '';
  document.getElementById('dateIn').value = '';
  pendTags = []; renderPendTags();
  saveTasks(); renderTasks(); toast('Task added');
}

function setF(f, btn){
  taskFilter = f;
  document.querySelectorAll('.f-pill').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  renderTasks();
}

function toggleSort(){
  autoSort = !autoSort;
  document.getElementById('sortBtn').classList.toggle('on', autoSort);
  renderTasks();
  toast(autoSort ? 'Auto-sort on — Critical first' : 'Auto-sort off', 'info');
}

function toggleFocus(){
  focusMode = !focusMode;
  document.getElementById('focusBanner').classList.toggle('on', focusMode);
  document.getElementById('focusBtn').classList.toggle('focus-on', focusMode);
  renderTasks();
  toast(focusMode ? '🎯 Focus Mode on' : 'Focus Mode off', 'info');
}

function toggleTask(id){
  const t = tasks.find(x=>x.id===id); if(!t) return;
  t.completed = !t.completed;
  if(t.completed){ t.completedAt = Date.now(); spawnBurst(id); }
  else delete t.completedAt;
  saveTasks();
  const card = document.querySelector(`[data-id="${id}"]`);
  if(card){ card.style.transition='all .3s ease'; card.style.transform='scale(.97)'; setTimeout(()=>renderTasks(),200); }
  else renderTasks();
}

function spawnBurst(id){
  const card = document.querySelector(`[data-id="${id}"]`);
  if(!card) return;
  const rect = card.getBoundingClientRect();
  const colors = ['#7c5cfc','#ff6b6b','#ffc46b','#5af7c0','#43e8d8','#ff4f8b'];
  for(let i=0;i<10;i++){
    const el = document.createElement('div');
    el.className = 'burst';
    el.style.cssText = `left:${rect.left+18}px;top:${rect.top+12}px;z-index:9999;background:${colors[i%colors.length]};border-radius:${Math.random()>.5?'50%':'3px'};width:${5+Math.random()*6}px;height:${5+Math.random()*6}px;--bx:${(Math.random()-.5)*70}px;--by:${(Math.random()-.5)*70}px;--br:${Math.random()*360}deg;animation-delay:${i*.04}s;`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 700);
  }
}

function delTask(id){
  const card = document.querySelector(`[data-id="${id}"]`);
  if(card){
    card.style.transition = 'all .25s ease';
    card.style.opacity = '0'; card.style.transform = 'translateX(24px) scale(.96)';
    setTimeout(()=>{ tasks=tasks.filter(x=>x.id!==id); saveTasks(); renderTasks(); }, 220);
  } else { tasks=tasks.filter(x=>x.id!==id); saveTasks(); renderTasks(); }
  toast('Task removed','err');
}

function clearDone(){ tasks=tasks.filter(t=>!t.completed); saveTasks(); renderTasks(); toast('Cleared completed tasks','info'); }

function editTask(id){
  const t = tasks.find(x=>x.id===id); if(!t) return;
  const card = document.querySelector(`[data-id="${id}"]`);
  const textEl = card.querySelector('.t-text');
  const old = t.text;
  textEl.innerHTML = `<input style="width:100%;background:var(--surface3);border:1.5px solid var(--prime);border-radius:8px;padding:6px 10px;font-size:.85rem;color:var(--ink);font-family:var(--font-display);outline:none;box-shadow:0 0 0 4px rgba(124,92,252,.1);letter-spacing:.01em" value="${escH(t.text)}"/>`;
  const inp = textEl.querySelector('input');
  inp.focus(); inp.select();
  inp.addEventListener('blur',()=>{ const v=inp.value.trim(); t.text=v||old; saveTasks(); renderTasks(); });
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter') inp.blur(); if(e.key==='Escape'){t.text=old;renderTasks();} });
}

function fmtDate(d){
  if(!d) return '';
  const dt = new Date(d+'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.floor((dt-today)/864e5);
  if(diff===0) return 'today';
  if(diff===1) return 'tomorrow';
  if(diff===-1) return 'yesterday';
  if(diff<0) return `${Math.abs(diff)}d overdue`;
  return dt.toLocaleDateString('en-US',{month:'short',day:'numeric'});
}
function isLate(d){ if(!d) return false; const dt=new Date(d+'T00:00:00'); const t=new Date(); t.setHours(0,0,0,0); return dt<t; }

const PRI_LABEL = {critical:'🚨 Critical', high:'⚡ High', medium:'📌 Medium', low:'💤 Low'};
const PRI_CLASS = {critical:'pc', high:'ph', medium:'pm', low:'pl'};

function getFiltered(){
  const q = (document.getElementById('searchIn').value||'').toLowerCase();
  let list = tasks.filter(t=>{
    if(focusMode && t.priority!=='critical' && t.priority!=='high') return false;
    const mf = taskFilter==='all'||(taskFilter==='active'&&!t.completed)||(taskFilter==='done'&&t.completed)||(taskFilter==='critical'&&t.priority==='critical')||(taskFilter==='high'&&t.priority==='high');
    const ms = !q || t.text.toLowerCase().includes(q) || (t.tags||[]).some(g=>g.includes(q));
    return mf && ms;
  });
  if(autoSort){
    list = [...list].sort((a,b)=>{
      if(a.completed!==b.completed) return a.completed?1:-1;
      return (PRI_ORDER[a.priority]??9)-(PRI_ORDER[b.priority]??9);
    });
  }
  return list;
}

function renderTasks(){
  const filtered = getFiltered();
  const done = tasks.filter(t=>t.completed).length;
  const total = tasks.length;
  const pw = document.getElementById('progWrap');
  pw.style.display = total ? 'block' : 'none';
  const pct = total ? Math.round(done/total*100) : 0;
  document.getElementById('progFill').style.width = pct+'%';
  document.getElementById('progPct').textContent = pct+'%';
  document.getElementById('progLabel').textContent = `${done}/${total} done`;
  const list = document.getElementById('taskList');
  if(!filtered.length){
    list.innerHTML = `<div class="empty"><span class="e-icon">${total===0?'∅':'◌'}</span><h3>${total===0?'Nothing yet.':focusMode?'No critical tasks.':'Nothing matches.'}</h3><p style="font-size:1.08rem;font-style:italic;color:var(--ink4);margin-top:6px;font-family:var(--font-display)">${total===0?'Add your first task above.':''}</p></div>`;
    return;
  }
  list.innerHTML = filtered.map((t,i)=>`
    <div class="task-card ${PRI_CLASS[t.priority]||''} ${t.completed?'done':''}" data-id="${t.id}"
      style="animation:slideIn .35s ${i*.05}s var(--ease-out) both"
      draggable="true"
      ondragstart="dStart(event,'${t.id}')"
      ondragover="dOver(event)"
      ondrop="dDrop(event,'${t.id}')"
      ondragend="dEnd()">
      <span class="drag-handle">⠿</span>
      <div class="chk ${t.completed?'on':''}" onclick="toggleTask('${t.id}')">
        <svg viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><polyline points="1.5,6 5,9.5 10.5,2.5"/></svg>
      </div>
      <div class="t-body">
        <div class="t-text">${escH(t.text)}</div>
        <div class="t-meta">
          <span class="badge badge-${t.priority}">${PRI_LABEL[t.priority]||t.priority}</span>
          ${(t.tags||[]).map(g=>`<span class="badge badge-tag">#${escH(g)}</span>`).join('')}
          ${t.date?`<span class="t-date ${isLate(t.date)&&!t.completed?'late':''}">${fmtDate(t.date)}</span>`:''}
        </div>
      </div>
      <div class="t-actions">
        <button class="ic-btn" onclick="editTask('${t.id}')" title="Edit">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="ic-btn del" onclick="delTask('${t.id}')" title="Delete">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    </div>
  `).join('');
}

function dStart(e,id){ dragId=id; setTimeout(()=>document.querySelector(`[data-id="${id}"]`)?.classList.add('dragging'),0); }
function dOver(e){ e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
function dEnd(){ document.querySelectorAll('.task-card').forEach(c=>c.classList.remove('dragging','drag-over')); dragId=null; }
function dDrop(e,tid){
  e.preventDefault();
  document.querySelectorAll('.task-card').forEach(c=>c.classList.remove('drag-over'));
  if(!dragId||dragId===tid) return;
  const si=tasks.findIndex(t=>t.id===dragId), ti=tasks.findIndex(t=>t.id===tid);
  if(si<0||ti<0) return;
  const [item]=tasks.splice(si,1); tasks.splice(ti,0,item);
  saveTasks(); renderTasks();
}

function openExport(){ document.getElementById('exportModal').classList.remove('hidden'); }
function doExport(){
  const fmt = document.getElementById('expFmt').value;
  const inc = document.getElementById('expComp').checked;
  let data = inc ? tasks : tasks.filter(t=>!t.completed);
  let content, fn, type;
  if(fmt==='json'){ content=JSON.stringify(data,null,2); fn='tasks.json'; type='application/json'; }
  else if(fmt==='csv'){ content='Text,Priority,Tags,Date,Completed\n'+data.map(t=>`"${t.text}","${t.priority}","${(t.tags||[]).join(';')}","${t.date}","${t.completed}"`).join('\n'); fn='tasks.csv'; type='text/csv'; }
  else { content=data.map(t=>`[${t.completed?'x':' '}] ${t.text} (${t.priority})${t.date?' — '+t.date:''}`).join('\n'); fn='tasks.txt'; type='text/plain'; }
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([content],{type})); a.download=fn; a.click();
  document.getElementById('exportModal').classList.add('hidden');
  toast('Exported!','info');
}

renderTasks();

// ════════════════════════════════════════
// POMODORO
// ════════════════════════════════════════
const PM = {work:25, short:5, long:15};
let pMode='work', pMins=25, pSecs=0, pRunning=false, pIv=null;
let pSessN=1, pRoundN=1, pSessPerRound=4;
let pDayStats = S.g('stride_pomo_day', {sessions:0, mins:0, breaks:0, date:''});

function updatePSettings(){
  PM.work  = parseInt(document.getElementById('setWork').value)||25;
  PM.short = parseInt(document.getElementById('setShort').value)||5;
  PM.long  = parseInt(document.getElementById('setLong').value)||15;
  pSessPerRound = parseInt(document.getElementById('setSess').value)||4;
  if(!pRunning){ pMins=PM[pMode]; pSecs=0; updatePDisplay(); }
}

function setPMode(mode, btn){
  if(pRunning){ clearInterval(pIv); pRunning=false; setPIcon(false); }
  pMode=mode; pMins=PM[mode]; pSecs=0;
  document.querySelectorAll('.p-tab').forEach(b=>b.classList.remove('on')); btn.classList.add('on');
  document.getElementById('ringGlow').className = 'ring-glow'+(mode!=='work'?' break-glow':'');
  updatePDisplay();
}

function setPIcon(running){
  const ico = document.getElementById('playIco');
  ico.innerHTML = running
    ? '<rect x="6" y="4" width="4" height="16" fill="white"/><rect x="14" y="4" width="4" height="16" fill="white"/>'
    : '<polygon points="5,3 19,12 5,21" fill="white"/>';
}

function pomoToggle(){
  if(pRunning){ clearInterval(pIv); pRunning=false; setPIcon(false); }
  else{
    pRunning=true; setPIcon(true);
    pIv = setInterval(()=>{
      if(pSecs===0){ if(pMins===0){ pomoComplete(); return; } pMins--; pSecs=59; } else pSecs--;
      updatePDisplay();
    }, 1000);
  }
}

function pomoComplete(){
  clearInterval(pIv); pRunning=false; setPIcon(false);
  const today = new Date().toDateString();
  if(pDayStats.date!==today) pDayStats={sessions:0,mins:0,breaks:0,date:today};
  if(pMode==='work'){
    pDayStats.sessions++; pDayStats.mins+=PM.work;
    addPLog('Work', PM.work); toast(`🎉 Session ${pSessN} done!`);
    if(pSessN%pSessPerRound===0){ pRoundN++; pSessN=1; setTimeout(()=>switchPMode('long'),600); }
    else{ pSessN++; setTimeout(()=>switchPMode('short'),600); }
  } else {
    pDayStats.breaks++;
    addPLog(pMode==='short'?'Short break':'Long break', PM[pMode]);
    toast('Break done — back to work 🚀','info');
    setTimeout(()=>switchPMode('work'),600);
  }
  S.s('stride_pomo_day', pDayStats); updatePStats();
}

function switchPMode(mode){
  pMode=mode; pMins=PM[mode]; pSecs=0;
  document.querySelectorAll('.p-tab').forEach((b,i)=>b.classList.toggle('on',['work','short','long'][i]===mode));
  document.getElementById('ringGlow').className = 'ring-glow'+(mode!=='work'?' break-glow':'');
  updatePDisplay();
}

function pomoReset(){ clearInterval(pIv); pRunning=false; setPIcon(false); pMins=PM[pMode]; pSecs=0; updatePDisplay(); }
function pomoSkip(){ clearInterval(pIv); pRunning=false; setPIcon(false); pomoComplete(); }

function updatePDisplay(){
  const mm=String(pMins).padStart(2,'0'), ss=String(pSecs).padStart(2,'0');
  document.getElementById('pomoTime').textContent = `${mm}:${ss}`;
  document.getElementById('pomoLbl').textContent = pMode==='work'?'FOCUS':pMode==='short'?'SHORT BREAK':'LONG BREAK';
  document.getElementById('pSess').textContent = pSessN;
  document.getElementById('pRound').textContent = pRoundN;
  document.title = pRunning ? `${mm}:${ss} — Stride` : 'Stride';
  const total=PM[pMode]*60, elapsed=total-(pMins*60+pSecs), C=326.7;
  document.getElementById('ringFill').style.strokeDashoffset = C-(elapsed/total)*C;
  document.getElementById('pomoDots').innerHTML = Array.from({length:pSessPerRound},(_,i)=>
    `<div class="p-dot${i<pSessN-1?' done':''}"></div>`
  ).join('');
}

function addPLog(type, mins){
  const log = document.getElementById('pomoLog');
  if(log.querySelector('[style*="ink4"]')) log.innerHTML='';
  const el = document.createElement('div'); el.className='p-session-log';
  const now = new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  el.innerHTML = `<span class="p-stype">${type} — ${mins}m</span><span class="p-stime">${now}</span>`;
  log.prepend(el);
}

function updatePStats(){
  document.getElementById('sFocused').textContent = pDayStats.sessions||0;
  document.getElementById('sMins').textContent     = pDayStats.mins||0;
  document.getElementById('sBreaks').textContent   = pDayStats.breaks||0;
  document.getElementById('sStreak').textContent   = pDayStats.sessions||0;
}
updatePDisplay(); updatePStats();

// ════════════════════════════════════════
// NOTES
// ════════════════════════════════════════
let notes = S.g('stride_notes', []);
let activeNId = null;
let notePreviewMode = false;

if(!notes.length){
  notes = [{
    id:uid(), title:'Getting started',
    content:'Welcome to Stride notes.\n\nWrite anything here — raw thoughts, meeting notes, study summaries.\n\nYour notes **auto-save** as you type.\n\n## Formatting\n\nUse the toolbar above for *italics*, **bold**, headings, lists and more.\n\nSwitch to Preview mode to see rendered output.',
    createdAt:Date.now(), updatedAt:Date.now()
  }];
  S.s('stride_notes', notes);
}

function saveNotes(){ S.s('stride_notes', notes); }

function wordCount(text){
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function newNote(){
  const n = {id:uid(), title:'Untitled', content:'', createdAt:Date.now(), updatedAt:Date.now()};
  notes.unshift(n); saveNotes(); renderNList(); openNote(n.id);
  toast('New note created');
}

function mdToHtml(text){
  let h = escH(text);
  h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  h = h.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  h = h.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  h = h.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  h = h.replace(/^---$/gm, '<hr>');
  h = h.replace(/^- \[ \] (.+)$/gm, '<li><input type="checkbox" disabled> $1</li>');
  h = h.replace(/^- \[x\] (.+)$/gm, '<li><input type="checkbox" checked disabled> $1</li>');
  h = h.replace(/^- (.+)$/gm, '<li>$1</li>');
  h = h.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  h = h.replace(/(<li>.*<\/li>\n?)+/g, m=>'<ul>'+m+'</ul>');
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
  h = h.replace(/`(.+?)`/g, '<code>$1</code>');
  h = h.split('\n').map(line=>{
    if(line.match(/^<(h[1-3]|blockquote|hr|ul|li|\/ul)/) || line==='' ) return line;
    return `<p>${line}</p>`;
  }).join('\n');
  return h;
}

function openNote(id){
  activeNId = id;
  notePreviewMode = false;
  const n = notes.find(x=>x.id===id); if(!n) return;

  document.getElementById('nEditorInner').innerHTML = `
    <div class="n-editor-toolbar">
      <button class="tb" onclick="ins('**','**')" title="Bold"><b>B</b></button>
      <button class="tb" onclick="ins('*','*')" title="Italic"><em>I</em></button>
      <div class="tb-divider"></div>
      <button class="tb" onclick="ins('# ','')">H1</button>
      <button class="tb" onclick="ins('## ','')">H2</button>
      <button class="tb" onclick="ins('### ','')">H3</button>
      <div class="tb-divider"></div>
      <button class="tb" onclick="ins('- ','')">• List</button>
      <button class="tb" onclick="ins('- [ ] ','')">☐ Todo</button>
      <button class="tb" onclick="ins('> ','')">❝ Quote</button>
      <button class="tb" onclick="ins('\`','\`')">{ }</button>
      <button class="tb" onclick="ins('---\\n','')">— HR</button>
      <div class="tb-divider"></div>
      <button class="tb" id="previewToggleBtn" onclick="toggleNotePreview('${id}')" title="Preview">Preview</button>
      <button class="btn btn-danger btn-sm" style="margin-left:auto" onclick="delNote('${id}')">Delete</button>
    </div>
    <div class="n-editor-title-wrap">
      <input class="n-editor-title" id="nTitleIn" value="${escH(n.title)}" placeholder="Note title…"/>
    </div>
    <div class="n-editor-meta">
      <span><span id="nWordCount">${wordCount(n.content)}</span> words</span>
      <div class="n-meta-dot"></div>
      <span><span id="nCharCount">${n.content.length}</span> chars</span>
      <div class="n-meta-dot"></div>
      <span>edited ${new Date(n.updatedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
    </div>
    <div class="n-editor-body">
      <textarea class="n-area" id="nArea" placeholder="Start writing… (markdown supported)">${escH(n.content)}</textarea>
      <div class="n-preview-pane" id="nPreview"></div>
    </div>
    <div class="n-editor-footer">
      <span class="n-footer-left" id="nSaveStatus">All changes saved</span>
      <div class="n-footer-right">
        <button class="btn btn-ghost btn-sm" onclick="copyNoteText('${id}')">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          Copy
        </button>
        <button class="btn btn-ghost btn-sm" onclick="downloadNote('${id}')">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export
        </button>
      </div>
    </div>
  `;

  document.getElementById('nTitleIn').addEventListener('input', e=>{
    n.title = e.target.value; n.updatedAt=Date.now();
    saveNotes(); renderNList(); setNSaveStatus();
  });

  document.getElementById('nArea').addEventListener('input', e=>{
    n.content = e.target.value; n.updatedAt=Date.now();
    saveNotes(); renderNList();
    document.getElementById('nWordCount').textContent = wordCount(n.content);
    document.getElementById('nCharCount').textContent = n.content.length;
    setNSaveStatus();
    if(notePreviewMode) updateNPreview(n.content);
  });

  document.getElementById('nArea').addEventListener('keydown', e=>{
    if(e.key==='Tab'){
      e.preventDefault();
      const ta=e.target, s=ta.selectionStart;
      ta.value=ta.value.slice(0,s)+'  '+ta.value.slice(ta.selectionEnd);
      ta.selectionStart=ta.selectionEnd=s+2;
    }
  });

  renderNList();
}

let nSaveTimer=null;
function setNSaveStatus(){
  const el = document.getElementById('nSaveStatus');
  if(!el) return;
  el.textContent='Saving…';
  clearTimeout(nSaveTimer);
  nSaveTimer = setTimeout(()=>{ if(el) el.textContent='All changes saved'; }, 800);
}

function toggleNotePreview(id){
  const n = notes.find(x=>x.id===id); if(!n) return;
  notePreviewMode = !notePreviewMode;
  const area    = document.getElementById('nArea');
  const preview = document.getElementById('nPreview');
  const btn     = document.getElementById('previewToggleBtn');
  if(notePreviewMode){
    area.classList.add('hidden-area');
    preview.classList.add('visible');
    preview.innerHTML = mdToHtml(n.content);
    btn.classList.add('active');
    btn.textContent = 'Edit';
  } else {
    area.classList.remove('hidden-area');
    preview.classList.remove('visible');
    btn.classList.remove('active');
    btn.textContent = 'Preview';
    area.focus();
  }
}

function updateNPreview(content){
  const preview = document.getElementById('nPreview');
  if(preview && preview.classList.contains('visible')) preview.innerHTML = mdToHtml(content);
}

function copyNoteText(id){
  const n = notes.find(x=>x.id===id); if(!n) return;
  navigator.clipboard.writeText(n.content).then(()=>toast('Copied to clipboard','info'));
}

function downloadNote(id){
  const n = notes.find(x=>x.id===id); if(!n) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([n.content],{type:'text/markdown'}));
  a.download = (n.title||'note').replace(/[^a-z0-9]/gi,'_').toLowerCase()+'.md';
  a.click(); toast('Note exported','info');
}

function ins(before, after){
  const ta = document.getElementById('nArea'); if(!ta) return;
  const s=ta.selectionStart, e=ta.selectionEnd, sel=ta.value.slice(s,e);
  ta.value = ta.value.slice(0,s)+before+sel+after+ta.value.slice(e);
  ta.selectionStart = s+before.length;
  ta.selectionEnd   = s+before.length+sel.length;
  ta.focus(); ta.dispatchEvent(new Event('input'));
}

function delNote(id){
  notes = notes.filter(x=>x.id!==id); saveNotes(); activeNId=null;
  document.getElementById('nEditorInner').innerHTML = `
    <div class="n-no-note">
      <div class="n-no-note-icon">write.</div>
      <p>Select a note or create a new one</p>
    </div>`;
  renderNList(); toast('Note deleted','err');
}

function renderNList(){
  const q = (document.getElementById('noteSearch')?.value||'').toLowerCase();
  const filtered = notes.filter(n=>!q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
  document.getElementById('nCount').textContent = notes.length;

  if(!filtered.length){
    document.getElementById('noteList').innerHTML = `
      <div class="n-empty-state">
        <span class="n-empty-icon">✦</span>
        <span class="n-empty-text">${q?'No notes match your search':'No notes yet'}</span>
      </div>`;
    return;
  }

  document.getElementById('noteList').innerHTML = filtered.map(n=>`
    <div class="note-item ${n.id===activeNId?'on':''}" onclick="openNote('${n.id}')">
      <div class="n-item-title">${escH(n.title)||'Untitled'}</div>
      <div class="n-item-preview">${escH(n.content.replace(/[#*\`>\-]/g,'').slice(0,60)).replace(/\n/g,' ')||'Empty note'}</div>
      <div class="n-item-meta">
        <span class="n-item-date">${new Date(n.updatedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
        <span class="n-item-words">${wordCount(n.content)}w</span>
      </div>
    </div>
  `).join('');
}

// ════════════════════════════════════════
// SCHEDULE
// ════════════════════════════════════════
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const HOURS = Array.from({length:15},(_,i)=>i+7);
let events = S.g('stride_events', []);
let activeDay = DAYS[new Date().getDay()===0?6:new Date().getDay()-1];

function saveEvents(){ S.s('stride_events', events); }

function addEvent(){
  const title = document.getElementById('evTitle').value.trim();
  if(!title){ toast('Enter a title','err'); return; }
  const start = document.getElementById('evStart').value;
  const end   = document.getElementById('evEnd').value;
  if(!start||!end||start>=end){ toast('End must be after start','err'); return; }
  events.push({id:uid(), title, start, end, day:document.getElementById('evDay').value, cat:document.getElementById('evCat').value});
  saveEvents(); renderSchedule(); document.getElementById('evTitle').value=''; toast('Event added');
}

function delEvent(id){ events=events.filter(e=>e.id!==id); saveEvents(); renderSchedule(); }

function renderSchedule(){
  const today = DAYS[new Date().getDay()===0?6:new Date().getDay()-1];
  document.getElementById('dayTabs').innerHTML = DAYS.map(d=>
    `<button class="d-tab ${d===activeDay?'on':''} ${d===today&&d!==activeDay?'today-tab':''}" onclick="setDay('${d}')">${d.slice(0,3)}</button>`
  ).join('');
  document.getElementById('curDayLbl').textContent = activeDay;
  const dayEvs = events.filter(e=>e.day===activeDay);
  const now=new Date(), nowM=now.getHours()*60+now.getMinutes();
  document.getElementById('timetable').innerHTML = HOURS.map(h=>{
    const slotEvs = dayEvs.filter(e=>parseInt(e.start.split(':')[0])===h);
    const isNow = today===activeDay && nowM>=h*60 && nowM<(h+1)*60;
    const nowPct = isNow ? ((nowM-h*60)/60*100) : null;
    return `<div class="time-slot">
      <div class="t-label">${h<12?h+'am':h===12?'12pm':(h-12)+'pm'}</div>
      <div class="t-line">
        ${nowPct!==null?`<div class="now-line" style="top:${nowPct}%"></div>`:''}
        ${slotEvs.map(ev=>{
          const[sh,sm]=ev.start.split(':').map(Number);
          const[eh,em]=ev.end.split(':').map(Number);
          const top=sm/60*100;
          const dur=Math.max(((eh*60+em)-(sh*60+sm))/60*100,28);
          return `<div class="ev-block cat-${ev.cat}" style="top:${top}%;height:${dur}%" onclick="delEvent('${ev.id}')">
            <div class="ev-title">${escH(ev.title)}</div>
            <div class="ev-time">${ev.start}–${ev.end}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
  const colors={study:'var(--teal)',work:'var(--accent)',personal:'var(--prime)',health:'var(--mint)'};
  document.getElementById('evMiniList').innerHTML = dayEvs.length
    ? [...dayEvs].sort((a,b)=>a.start.localeCompare(b.start)).map(ev=>`
      <div class="ev-mini">
        <div class="ev-dot" style="background:${colors[ev.cat]||'var(--prime)'}"></div>
        <div class="ev-info">
          <div class="ev-info-title">${escH(ev.title)}</div>
          <div class="ev-info-time">${ev.start} – ${ev.end}</div>
        </div>
        <button class="ev-del" onclick="delEvent('${ev.id}')">✕</button>
      </div>`).join('')
    : `<div style="color:var(--ink4);font-size:1.06rem;padding:6px 0;font-style:italic;font-family:var(--font-display);letter-spacing:.01em">No events on ${activeDay}</div>`;
}

function setDay(d){ activeDay=d; renderSchedule(); }

// ════════════════════════════════════════
// WEEKLY REVIEW
// ════════════════════════════════════════
function renderReview(){
  const now=new Date(), wd=now.getDay();
  const mon=new Date(now); mon.setDate(now.getDate()-(wd===0?6:wd-1));
  const sun=new Date(mon); sun.setDate(mon.getDate()+6);
  document.getElementById('reviewWkLbl').textContent =
    `week of ${mon.toLocaleDateString('en-US',{month:'long',day:'numeric'})} — ${sun.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}`;

  const done   = tasks.filter(t=>t.completed).length;
  const active = tasks.filter(t=>!t.completed).length;
  const wAgo   = Date.now()-7*864e5;
  const wDone  = tasks.filter(t=>t.completed&&t.completedAt&&t.completedAt>=wAgo).length;
  const ps     = S.g('stride_pomo_day',{sessions:0,mins:0});

  document.getElementById('reviewStats').innerHTML = `
    <div class="card r-stat"><div class="big">${wDone}</div><div class="lbl">Done this week</div><div class="sub">${active} still in queue</div></div>
    <div class="card r-stat"><div class="big">${ps.mins||0}</div><div class="lbl">Focus minutes</div><div class="sub">${ps.sessions||0} pomodoro sessions</div></div>
    <div class="card r-stat"><div class="big">${notes.length}</div><div class="lbl">Notes</div><div class="sub">${events.length} scheduled events</div></div>
  `;

  const bars=[];
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0);
    const nx=new Date(d); nx.setDate(d.getDate()+1);
    bars.push({day:d.toLocaleDateString('en-US',{weekday:'short'}), count:tasks.filter(t=>t.completed&&t.completedAt&&t.completedAt>=d.getTime()&&t.completedAt<nx.getTime()).length});
  }
  const mx=Math.max(...bars.map(b=>b.count),1);
  document.getElementById('barChart').innerHTML = bars.map(b=>`
    <div class="bar-col">
      <div class="bar-val">${b.count||''}</div>
      <div class="bar-wrap"><div class="bar" style="height:${(b.count/mx)*100}%"></div></div>
      <div class="bar-day">${b.day}</div>
    </div>`).join('');

  document.getElementById('pomoSummary').innerHTML = `
    <div>Today: <strong style="color:var(--ink)">${ps.mins||0} min</strong> in <strong style="color:var(--ink)">${ps.sessions||0} sessions</strong></div>
    <div>Breaks taken: <strong style="color:var(--ink)">${ps.breaks||0}</strong></div>
    <div style="margin-top:9px;font-size:.74rem;color:var(--ink4);font-family:var(--font-mono);letter-spacing:.08em;text-transform:uppercase">// resets daily</div>
  `;

  const saved=S.g('stride_review',{});
  document.getElementById('r1').value = saved.r1||'';
  document.getElementById('r2').value = saved.r2||'';
  document.getElementById('r3').value = saved.r3||'';
  const moods=saved.moods||[];
  document.querySelectorAll('.m-tag').forEach(el=>el.classList.toggle('sel', moods.includes(el.textContent.trim())));
}

function saveReview(){
  const sv=S.g('stride_review',{});
  sv.r1=document.getElementById('r1').value;
  sv.r2=document.getElementById('r2').value;
  sv.r3=document.getElementById('r3').value;
  S.s('stride_review', sv);
}

function toggleMood(el){
  el.classList.toggle('sel');
  const sv=S.g('stride_review',{});
  sv.moods=[...document.querySelectorAll('.m-tag.sel')].map(e=>e.textContent.trim());
  S.s('stride_review', sv);
}

function exportReview(){
  const sv=S.g('stride_review',{});
  const content=`STRIDE — WEEKLY REVIEW\n${'─'.repeat(40)}\nWeek ending: ${new Date().toLocaleDateString()}\n\nSTATS\nTasks done this week: ${tasks.filter(t=>t.completed&&t.completedAt&&t.completedAt>=Date.now()-7*864e5).length}\nNotes: ${notes.length} | Events: ${events.length}\n\nWHAT WENT WELL\n${sv.r1||'—'}\n\nWHAT TO IMPROVE\n${sv.r2||'—'}\n\nNEXT WEEK GOALS\n${sv.r3||'—'}\n\nMOOD\n${(sv.moods||[]).join(', ')||'—'}`;
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([content],{type:'text/plain'}));
  a.download=`stride-review-${new Date().toISOString().slice(0,10)}.txt`;
  a.click(); toast('Review exported','info');
}
