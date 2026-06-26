/**
 * Stride - Productivity Dashboard Application
 * Ultra-simplified, compact, and interview-friendly logic (~330 lines).
 */

// ════════════════════════════════════════
// 1. STORAGE, THEME, NAVIGATION & TOASTS
// ════════════════════════════════════════

const Storage = {
  get: (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
};
const S = { g: Storage.get, s: Storage.set }; // Backwards compatibility alias

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const escH = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };

function toggleTheme() {
  const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t); Storage.set('stride_theme', t);
}
document.documentElement.setAttribute('data-theme', Storage.get('stride_theme', 'dark'));

function nav(page) {
  document.querySelectorAll('.page, .nav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  if (page === 'review') renderReview();
  if (page === 'schedule') renderSchedule();
  if (page === 'notes') renderNList();
}

function toast(msg, type = 'ok') {
  const c = document.getElementById('toasts'), el = document.createElement('div');
  if (!c) return;
  el.className = `toast ${type}`;
  const icons = { ok: '✓', err: '✕', info: '◆' }, cols = { ok: 'var(--mint)', err: 'var(--accent)', info: 'var(--prime)' };
  el.innerHTML = `<span style="font-weight:700;color:${cols[type]}">${icons[type]}</span> <span>${msg}</span>`;
  c.appendChild(el);
  setTimeout(() => { el.style.animation = 't-in .25s reverse both'; setTimeout(() => el.remove(), 250); }, 2600);
}

// ════════════════════════════════════════
// 2. BACKGROUND BUBBLES ANIMATION (CANVAS)
// ════════════════════════════════════════

(() => {
  const c = document.getElementById('bubbles'), ctx = c?.getContext('2d');
  if (!c) return;
  const DARK = ['rgba(124,92,252,', 'rgba(255,107,107,', 'rgba(255,196,107,', 'rgba(67,232,216,'];
  const LIGHT = ['rgba(140,90,210,', 'rgba(200,80,60,', 'rgba(180,110,30,', 'rgba(80,150,130,'];
  let bs = [];
  const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
  window.addEventListener('resize', resize); resize();
  const make = () => ({ x: Math.random() * window.innerWidth, y: window.innerHeight + 50, r: 30 + Math.random() * 70, speed: 0.25 + Math.random() * 0.4, drift: (Math.random() - .5) * 0.35, ci: Math.floor(Math.random() * 4), op: 0.04 + Math.random() * 0.06 });
  for (let i = 0; i < 20; i++) { const b = make(); b.y = Math.random() * window.innerHeight; bs.push(b); }
  function draw() {
    ctx.clearRect(0, 0, c.width, c.height);
    const isL = document.documentElement.getAttribute('data-theme') === 'light', pal = isL ? LIGHT : DARK, mul = isL ? 3.5 : 1;
    bs.forEach(b => {
      b.y -= b.speed; b.x += b.drift;
      if (b.y < -b.r * 2) Object.assign(b, make());
      const o = b.op * mul, g = ctx.createRadialGradient(b.x - b.r * .3, b.y - b.r * .3, b.r * .1, b.x, b.y, b.r);
      g.addColorStop(0, pal[b.ci] + Math.min(o * 1.8, 0.45) + ')'); g.addColorStop(0.6, pal[b.ci] + Math.min(o, 0.25) + ')'); g.addColorStop(1, pal[b.ci] + '0)');
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.strokeStyle = pal[b.ci] + Math.min(o * 1.2, 0.3) + ')'; ctx.lineWidth = isL ? 1.5 : 1; ctx.stroke();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ════════════════════════════════════════
// 3. TASK MANAGEMENT
// ════════════════════════════════════════

let tasks = Storage.get('stride_tasks', []), taskFilter = 'all', autoSort = false, focusMode = false, pendTags = [], dragId = null;
const PRI_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }, PRI_LABEL = { critical: '🚨 Critical', high: '⚡ High', medium: '📌 Medium', low: '💤 Low' }, PRI_CLASS = { critical: 'pc', high: 'ph', medium: 'pm', low: 'pl' };

if (!tasks.length) {
  tasks = [
    { id: uid(), text: 'Update portfolio with new projects', priority: 'critical', date: '', tags: ['dev', 'portfolio'], completed: false, createdAt: Date.now() - 6000 },
    { id: uid(), text: 'Solve 3 LeetCode problems', priority: 'high', date: tomorrow(), tags: ['study'], completed: false, createdAt: Date.now() - 5000 },
    { id: uid(), text: 'Write weekly review notes', priority: 'medium', date: '', tags: [], completed: false, createdAt: Date.now() - 4000 },
    { id: uid(), text: 'Read 30 pages', priority: 'low', date: '', tags: ['personal'], completed: true, createdAt: Date.now() - 3000, completedAt: Date.now() - 3000 }
  ];
  saveTasks();
}
function saveTasks() { Storage.set('stride_tasks', tasks); }

function addTag() {
  const el = document.getElementById('tagIn'), val = el?.value.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 20);
  if (!val || pendTags.includes(val)) return;
  pendTags.push(val); el.value = ''; renderPendingTags();
}
function renderPendingTags() {
  const container = document.getElementById('pendingTags');
  if (container) container.innerHTML = pendTags.map(t => `<span class="tag-chip">#${escH(t)}<button onclick="rmTag('${t}')">✕</button></span>`).join('');
}
function rmTag(t) { pendTags = pendTags.filter(x => x !== t); renderPendingTags(); }

document.getElementById('tagIn').addEventListener('keydown', e => e.key === 'Enter' && addTag());
document.getElementById('taskIn').addEventListener('keydown', e => e.key === 'Enter' && addTask());

function addTask() {
  const input = document.getElementById('taskIn'), text = input?.value.trim();
  if (!text) {
    input.style.borderColor = 'var(--accent)'; input.style.animation = 'shake .35s ease';
    setTimeout(() => { input.style.borderColor = ''; input.style.animation = ''; }, 700); return;
  }
  tasks.unshift({ id: uid(), text, priority: document.getElementById('priSel').value, date: document.getElementById('dateIn').value, tags: [...pendTags], completed: false, createdAt: Date.now() });
  input.value = ''; document.getElementById('dateIn').value = ''; pendTags = [];
  renderPendingTags(); saveTasks(); renderTasks(); toast('Task added');
}

function setF(f, btn) { taskFilter = f; document.querySelectorAll('.f-pill').forEach(b => b.classList.remove('on')); btn?.classList.add('on'); renderTasks(); }
function toggleSort() { autoSort = !autoSort; document.getElementById('sortBtn')?.classList.toggle('on', autoSort); renderTasks(); toast(autoSort ? 'Auto-sort on — Critical first' : 'Auto-sort off', 'info'); }
function toggleFocus() { focusMode = !focusMode; document.getElementById('focusBanner')?.classList.toggle('on', focusMode); document.getElementById('focusBtn')?.classList.toggle('focus-on', focusMode); renderTasks(); toast(focusMode ? '🎯 Focus Mode on' : 'Focus Mode off', 'info'); }

function toggleTask(id) {
  const t = tasks.find(x => x.id === id); if (!t) return;
  t.completed = !t.completed;
  if (t.completed) { t.completedAt = Date.now(); spawnBurst(id); } else delete t.completedAt;
  saveTasks();
  const card = document.querySelector(`[data-id="${id}"]`);
  if (card) { card.style.transition = 'all .3s ease'; card.style.transform = 'scale(.97)'; setTimeout(() => renderTasks(), 200); } else renderTasks();
}

function spawnBurst(id) {
  const card = document.querySelector(`[data-id="${id}"]`); if (!card) return;
  const rect = card.getBoundingClientRect(), colors = ['#7c5cfc', '#ff6b6b', '#ffc46b', '#5af7c0', '#43e8d8', '#ff4f8b'];
  for (let i = 0; i < 10; i++) {
    const el = document.createElement('div'); el.className = 'burst';
    el.style.cssText = `left:${rect.left + 18}px;top:${rect.top + 12}px;z-index:9999;background:${colors[i % colors.length]};border-radius:${Math.random() > .5 ? '50%' : '3px'};width:${5 + Math.random() * 6}px;height:${5 + Math.random() * 6}px;--bx:${(Math.random() - .5) * 70}px;--by:${(Math.random() - .5) * 70}px;--br:${Math.random() * 360}deg;animation-delay:${i * .04}s;`;
    document.body.appendChild(el); setTimeout(() => el.remove(), 700);
  }
}

function delTask(id) {
  const card = document.querySelector(`[data-id="${id}"]`);
  const removeTaskData = () => { tasks = tasks.filter(x => x.id !== id); saveTasks(); renderTasks(); };
  if (card) {
    card.style.transition = 'all .25s ease'; card.style.opacity = '0'; card.style.transform = 'translateX(24px) scale(.96)';
    setTimeout(removeTaskData, 220);
  } else removeTaskData();
  toast('Task removed', 'err');
}
function clearDone() { tasks = tasks.filter(t => !t.completed); saveTasks(); renderTasks(); toast('Cleared completed tasks', 'info'); }

function editTask(id) {
  const t = tasks.find(x => x.id === id), textEl = document.querySelector(`[data-id="${id}"] .t-text`);
  if (!t || !textEl) return;
  const old = t.text;
  textEl.innerHTML = `<input style="width:100%;background:var(--surface3);border:1.5px solid var(--prime);border-radius:8px;padding:6px 10px;font-size:.85rem;color:var(--ink);font-family:var(--font-display);outline:none;box-shadow:0 0 0 4px rgba(124,92,252,.1)" value="${escH(old)}"/>`;
  const inp = textEl.querySelector('input'); inp.focus(); inp.select();
  const doneEdit = () => { t.text = inp.value.trim() || old; saveTasks(); renderTasks(); };
  inp.addEventListener('blur', doneEdit);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); if (e.key === 'Escape') { t.text = old; renderTasks(); } });
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00'), today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.floor((dt - today) / 864e5);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  return diff < 0 ? `${Math.abs(diff)}d overdue` : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
const isLate = d => d ? new Date(d + 'T00:00:00') < new Date().setHours(0, 0, 0, 0) : false;

function getFiltered() {
  const q = (document.getElementById('searchIn')?.value || '').toLowerCase();
  let list = tasks.filter(t => {
    if (focusMode && t.priority !== 'critical' && t.priority !== 'high') return false;
    const mf = taskFilter === 'all' || (taskFilter === 'active' && !t.completed) || (taskFilter === 'done' && t.completed) || (taskFilter === 'critical' && t.priority === 'critical') || (taskFilter === 'high' && t.priority === 'high');
    const ms = !q || t.text.toLowerCase().includes(q) || (t.tags || []).some(g => g.includes(q));
    return mf && ms;
  });
  if (autoSort) list.sort((a, b) => (a.completed !== b.completed) ? (a.completed ? 1 : -1) : PRI_ORDER[a.priority] - PRI_ORDER[b.priority]);
  return list;
}

function renderTasks() {
  const filtered = getFiltered(), done = tasks.filter(t => t.completed).length, total = tasks.length, pw = document.getElementById('progWrap');
  if (pw) pw.style.display = total ? 'block' : 'none';
  const pct = total ? Math.round(done / total * 100) : 0;
  const fill = document.getElementById('progFill'), pctText = document.getElementById('progPct'), lbl = document.getElementById('progLabel');
  if (fill) fill.style.width = pct + '%';
  if (pctText) pctText.textContent = pct + '%';
  if (lbl) lbl.textContent = `${done}/${total} done`;
  const list = document.getElementById('taskList');
  if (!list) return;
  if (!filtered.length) {
    list.innerHTML = `<div class="empty"><span class="e-icon">${total === 0 ? '∅' : '◌'}</span><h3>${total === 0 ? 'Nothing yet.' : focusMode ? 'No critical tasks.' : 'Nothing matches.'}</h3><p style="font-size:1.08rem;font-style:italic;color:var(--ink4);margin-top:6px;font-family:var(--font-display)">${total === 0 ? 'Add your first task above.' : ''}</p></div>`;
    return;
  }
  list.innerHTML = filtered.map((t, i) => `
    <div class="task-card ${PRI_CLASS[t.priority] || ''} ${t.completed ? 'done' : ''}" data-id="${t.id}" style="animation:slideIn .35s ${i * .05}s var(--ease-out) both" draggable="true" ondragstart="dStart(event,'${t.id}')" ondragover="dOver(event)" ondrop="dDrop(event,'${t.id}')" ondragend="dEnd()">
      <span class="drag-handle">⠿</span>
      <div class="chk ${t.completed ? 'on' : ''}" onclick="toggleTask('${t.id}')">
        <svg viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><polyline points="1.5,6 5,9.5 10.5,2.5"/></svg>
      </div>
      <div class="t-body">
        <div class="t-text">${escH(t.text)}</div>
        <div class="t-meta">
          <span class="badge badge-${t.priority}">${PRI_LABEL[t.priority] || t.priority}</span>
          ${(t.tags || []).map(g => `<span class="badge badge-tag">#${escH(g)}</span>`).join('')}
          ${t.date ? `<span class="t-date ${isLate(t.date) && !t.completed ? 'late' : ''}">${fmtDate(t.date)}</span>` : ''}
        </div>
      </div>
      <div class="t-actions">
        <button class="ic-btn" onclick="editTask('${t.id}')" title="Edit"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="ic-btn del" onclick="delTask('${t.id}')" title="Delete"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/><path d="M9 6V4h6v2"/></svg></button>
      </div>
    </div>`).join('');
}

function dStart(e, id) { dragId = id; setTimeout(() => document.querySelector(`[data-id="${id}"]`)?.classList.add('dragging'), 0); }
function dOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
function dEnd() { document.querySelectorAll('.task-card').forEach(c => c.classList.remove('dragging', 'drag-over')); dragId = null; }
function dDrop(e, tid) {
  e.preventDefault(); document.querySelectorAll('.task-card').forEach(c => c.classList.remove('drag-over'));
  if (!dragId || dragId === tid) return;
  const si = tasks.findIndex(t => t.id === dragId), ti = tasks.findIndex(t => t.id === tid);
  if (si >= 0 && ti >= 0) { const [item] = tasks.splice(si, 1); tasks.splice(ti, 0, item); saveTasks(); renderTasks(); }
}

function openExport() { document.getElementById('exportModal')?.classList.remove('hidden'); }
function doExport() {
  const fmt = document.getElementById('expFmt').value, inc = document.getElementById('expComp').checked, data = inc ? tasks : tasks.filter(t => !t.completed);
  let content = '', fn = '', type = '';
  if (fmt === 'json') { content = JSON.stringify(data, null, 2); fn = 'tasks.json'; type = 'application/json'; }
  else if (fmt === 'csv') { content = 'Text,Priority,Tags,Date,Completed\n' + data.map(t => `"${t.text}","${t.priority}","${(t.tags || []).join(';')}","${t.date}","${t.completed}"`).join('\n'); fn = 'tasks.csv'; type = 'text/csv'; }
  else { content = data.map(t => `[${t.completed ? 'x' : ' '}] ${t.text} (${t.priority})${t.date ? ' — ' + t.date : ''}`).join('\n'); fn = 'tasks.txt'; type = 'text/plain'; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = fn; a.click();
  document.getElementById('exportModal')?.classList.add('hidden'); toast('Exported!', 'info');
}
renderTasks();

// ════════════════════════════════════════
// 4. FOCUS TIMER (POMODORO)
// ════════════════════════════════════════

const PM = { work: 25, short: 5, long: 15 };
let pMode = 'work', pMins = 25, pSecs = 0, pRunning = false, pIv = null, pSessN = 1, pRoundN = 1, pSessPerRound = 4;
let pDayStats = Storage.get('stride_pomo_day', { sessions: 0, mins: 0, breaks: 0, date: '' });

function updatePSettings() {
  PM.work = parseInt(document.getElementById('setWork')?.value) || 25; PM.short = parseInt(document.getElementById('setShort')?.value) || 5; PM.long = parseInt(document.getElementById('setLong')?.value) || 15; pSessPerRound = parseInt(document.getElementById('setSess')?.value) || 4;
  if (!pRunning) { pMins = PM[pMode]; pSecs = 0; updatePDisplay(); }
}

function setPMode(mode, btn) {
  if (pRunning) { clearInterval(pIv); pRunning = false; setPIcon(false); }
  pMode = mode; pMins = PM[mode]; pSecs = 0;
  document.querySelectorAll('.p-tab').forEach(b => b.classList.remove('on')); btn?.classList.add('on');
  const glow = document.getElementById('ringGlow'); if (glow) glow.className = 'ring-glow' + (mode !== 'work' ? ' break-glow' : '');
  updatePDisplay();
}

function setPIcon(running) {
  const ico = document.getElementById('playIco');
  if (ico) ico.innerHTML = running ? '<rect x="6" y="4" width="4" height="16" fill="white"/><rect x="14" y="4" width="4" height="16" fill="white"/>' : '<polygon points="5,3 19,12 5,21" fill="white"/>';
}

function pomoToggle() {
  if (pRunning) { clearInterval(pIv); pRunning = false; setPIcon(false); }
  else {
    pRunning = true; setPIcon(true);
    pIv = setInterval(() => {
      if (pSecs === 0) { if (pMins === 0) { pomoComplete(); return; } pMins--; pSecs = 59; } else pSecs--;
      updatePDisplay();
    }, 1000);
  }
}

function pomoComplete() {
  clearInterval(pIv); pRunning = false; setPIcon(false);
  const today = new Date().toDateString(); if (pDayStats.date !== today) pDayStats = { sessions: 0, mins: 0, breaks: 0, date: today };
  if (pMode === 'work') {
    pDayStats.sessions++; pDayStats.mins += PM.work; addPLog('Work', PM.work); toast(`🎉 Session ${pSessN} done!`);
    if (pSessN % pSessPerRound === 0) { pRoundN++; pSessN = 1; setTimeout(() => switchPMode('long'), 600); }
    else { pSessN++; setTimeout(() => switchPMode('short'), 600); }
  } else {
    pDayStats.breaks++; addPLog(pMode === 'short' ? 'Short break' : 'Long break', PM[pMode]); toast('Break done — back to work 🚀', 'info'); setTimeout(() => switchPMode('work'), 600);
  }
  Storage.set('stride_pomo_day', pDayStats); updatePStats();
}

function switchPMode(mode) {
  pMode = mode; pMins = PM[mode]; pSecs = 0;
  document.querySelectorAll('.p-tab').forEach((b, i) => b.classList.toggle('on', ['work', 'short', 'long'][i] === mode));
  const glow = document.getElementById('ringGlow'); if (glow) glow.className = 'ring-glow' + (mode !== 'work' ? ' break-glow' : '');
  updatePDisplay();
}

function pomoReset() { clearInterval(pIv); pRunning = false; setPIcon(false); pMins = PM[pMode]; pSecs = 0; updatePDisplay(); }
function pomoSkip() { clearInterval(pIv); pRunning = false; setPIcon(false); pomoComplete(); }

function updatePDisplay() {
  const mm = String(pMins).padStart(2, '0'), ss = String(pSecs).padStart(2, '0');
  const pomoTime = document.getElementById('pomoTime'), pomoLbl = document.getElementById('pomoLbl'), pSess = document.getElementById('pSess'), pRound = document.getElementById('pRound');
  if (pomoTime) pomoTime.textContent = `${mm}:${ss}`;
  if (pomoLbl) pomoLbl.textContent = pMode === 'work' ? 'FOCUS' : pMode === 'short' ? 'SHORT BREAK' : 'LONG BREAK';
  if (pSess) pSess.textContent = pSessN;
  if (pRound) pRound.textContent = pRoundN;
  document.title = pRunning ? `${mm}:${ss} — Stride` : 'Stride';
  const total = PM[pMode] * 60, elapsed = total - (pMins * 60 + pSecs), C = 326.7;
  const fill = document.getElementById('ringFill'); if (fill) fill.style.strokeDashoffset = C - (elapsed / total) * C;
  const dots = document.getElementById('pomoDots'); if (dots) dots.innerHTML = Array.from({ length: pSessPerRound }, (_, i) => `<div class="p-dot${i < pSessN - 1 ? ' done' : ''}"></div>`).join('');
}

function addPLog(type, mins) {
  const log = document.getElementById('pomoLog'); if (!log) return;
  if (log.querySelector('[style*="ink4"]')) log.innerHTML = '';
  const el = document.createElement('div'); el.className = 'p-session-log';
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  el.innerHTML = `<span class="p-stype">${type} — ${mins}m</span><span class="p-stime">${now}</span>`; log.prepend(el);
}

function updatePStats() {
  const sFocused = document.getElementById('sFocused'), sMins = document.getElementById('sMins'), sBreaks = document.getElementById('sBreaks'), sStreak = document.getElementById('sStreak');
  if (sFocused) sFocused.textContent = pDayStats.sessions || 0;
  if (sMins) sMins.textContent = pDayStats.mins || 0;
  if (sBreaks) sBreaks.textContent = pDayStats.breaks || 0;
  if (sStreak) sStreak.textContent = pDayStats.sessions || 0;
}
updatePDisplay(); updatePStats();

// ════════════════════════════════════════
// 5. NOTES MANAGER
// ════════════════════════════════════════

let notes = Storage.get('stride_notes', []), activeNId = null, notePreviewMode = false;
if (!notes.length) {
  notes = [{ id: uid(), title: 'Getting started', content: 'Welcome to Stride notes.\n\nWrite anything here — raw thoughts, meeting notes, study summaries.\n\nYour notes **auto-save** as you type.\n\n## Formatting\n\nUse the toolbar above for *italics*, **bold**, headings, lists and more.\n\nSwitch to Preview mode to see rendered output.', createdAt: Date.now(), updatedAt: Date.now() }];
  saveNotes();
}
function saveNotes() { Storage.set('stride_notes', notes); }
const wordCount = txt => txt.trim() ? txt.trim().split(/\s+/).length : 0;

function mdToHtml(text) {
  let h = escH(text);
  h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^# (.+)$/gm, '<h1>$1</h1>').replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>').replace(/^---$/gm, '<hr>').replace(/^- \[ \] (.+)$/gm, '<li><input type="checkbox" disabled> $1</li>').replace(/^- \[x\] (.+)$/gm, '<li><input type="checkbox" checked disabled> $1</li>').replace(/^- (.+)$/gm, '<li>$1</li>').replace(/^\d+\. (.+)$/gm, '<li>$1</li>').replace(/(<li>.*<\/li>\n?)+/g, m => '<ul>' + m + '</ul>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`(.+?)`/g, '<code>$1</code>');
  return h.split('\n').map(line => line.match(/^<(h[1-3]|blockquote|hr|ul|li|\/ul)/) || line === '' ? line : `<p>${line}</p>`).join('\n');
}

function newNote() {
  const n = { id: uid(), title: 'Untitled', content: '', createdAt: Date.now(), updatedAt: Date.now() };
  notes.unshift(n); saveNotes(); renderNList(); openNote(n.id); toast('New note created');
}

function openNote(id) {
  activeNId = id; notePreviewMode = false; const n = notes.find(x => x.id === id); if (!n) return;
  const inner = document.getElementById('nEditorInner'); if (!inner) return;
  inner.innerHTML = `
    <div class="n-editor-toolbar">
      <button class="tb" onclick="ins('**','**')"><b>B</b></button><button class="tb" onclick="ins('*','*')"><em>I</em></button><div class="tb-divider"></div>
      <button class="tb" onclick="ins('# ','')">H1</button><button class="tb" onclick="ins('## ','')">H2</button><button class="tb" onclick="ins('### ','')">H3</button><div class="tb-divider"></div>
      <button class="tb" onclick="ins('- ','')">• List</button><button class="tb" onclick="ins('- [ ] ','')">☐ Todo</button><button class="tb" onclick="ins('> ','')">❝ Quote</button><button class="tb" onclick="ins('\`','\`')">{ }</button><button class="tb" onclick="ins('---\\n','')">— HR</button><div class="tb-divider"></div>
      <button class="tb" id="previewToggleBtn" onclick="toggleNotePreview('${id}')">Preview</button>
      <button class="btn btn-danger btn-sm" style="margin-left:auto" onclick="delNote('${id}')">Delete</button>
    </div>
    <div class="n-editor-title-wrap"><input class="n-editor-title" id="nTitleIn" value="${escH(n.title)}" placeholder="Note title…"/></div>
    <div class="n-editor-meta"><span><span id="nWordCount">${wordCount(n.content)}</span> words</span><div class="n-meta-dot"></div><span><span id="nCharCount">${n.content.length}</span> chars</span><div class="n-meta-dot"></div><span>edited ${new Date(n.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
    <div class="n-editor-body"><textarea class="n-area" id="nArea" placeholder="Start writing…">${escH(n.content)}</textarea><div class="n-preview-pane" id="nPreview"></div></div>
    <div class="n-editor-footer"><span class="n-footer-left" id="nSaveStatus">All changes saved</span>
      <div class="n-footer-right"><button class="btn btn-ghost btn-sm" onclick="copyNoteText('${id}')">Copy</button><button class="btn btn-ghost btn-sm" onclick="downloadNote('${id}')">Export</button></div>
    </div>`;

  document.getElementById('nTitleIn')?.addEventListener('input', e => { n.title = e.target.value; n.updatedAt = Date.now(); saveNotes(); renderNList(); setNSaveStatus(); });
  const area = document.getElementById('nArea');
  area?.addEventListener('input', e => {
    n.content = e.target.value; n.updatedAt = Date.now(); saveNotes(); renderNList();
    const w = document.getElementById('nWordCount'), c = document.getElementById('nCharCount');
    if (w) w.textContent = wordCount(n.content); if (c) c.textContent = n.content.length;
    setNSaveStatus(); if (notePreviewMode) updateNPreview(n.content);
  });
  area?.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); const s = area.selectionStart; area.value = area.value.slice(0, s) + '  ' + area.value.slice(area.selectionEnd); area.selectionStart = area.selectionEnd = s + 2; } });
  renderNList();
}

let nSaveTimer = null;
function setNSaveStatus() {
  const el = document.getElementById('nSaveStatus'); if (!el) return;
  el.textContent = 'Saving…'; clearTimeout(nSaveTimer); nSaveTimer = setTimeout(() => { if (el) el.textContent = 'All changes saved'; }, 800);
}

function toggleNotePreview(id) {
  const n = notes.find(x => x.id === id); if (!n) return;
  notePreviewMode = !notePreviewMode;
  const area = document.getElementById('nArea'), preview = document.getElementById('nPreview'), btn = document.getElementById('previewToggleBtn');
  if (!area || !preview || !btn) return;
  if (notePreviewMode) {
    area.classList.add('hidden-area'); preview.classList.add('visible'); preview.innerHTML = mdToHtml(n.content); btn.classList.add('active'); btn.textContent = 'Edit';
  } else {
    area.classList.remove('hidden-area'); preview.classList.remove('visible'); btn.classList.remove('active'); btn.textContent = 'Preview'; area.focus();
  }
}
function updateNPreview(c) { const p = document.getElementById('nPreview'); if (p && p.classList.contains('visible')) p.innerHTML = mdToHtml(c); }
function copyNoteText(id) { const n = notes.find(x => x.id === id); if (n) navigator.clipboard.writeText(n.content).then(() => toast('Copied to clipboard', 'info')); }
function downloadNote(id) {
  const n = notes.find(x => x.id === id); if (!n) return;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([n.content], { type: 'text/markdown' }));
  a.download = (n.title || 'note').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.md'; a.click(); toast('Note exported', 'info');
}
function ins(b, a) {
  const area = document.getElementById('nArea'); if (!area) return;
  const s = area.selectionStart, e = area.selectionEnd, sel = area.value.slice(s, e);
  area.value = area.value.slice(0, s) + b + sel + a + area.value.slice(e);
  area.selectionStart = s + b.length; area.selectionEnd = s + b.length + sel.length; area.focus(); area.dispatchEvent(new Event('input'));
}
function delNote(id) {
  notes = notes.filter(x => x.id !== id); saveNotes(); activeNId = null;
  const inner = document.getElementById('nEditorInner'); if (inner) inner.innerHTML = `<div class="n-no-note"><div class="n-no-note-icon">write.</div><p>Select a note or create a new one to start writing</p></div>`;
  renderNList(); toast('Note deleted', 'err');
}
function renderNList() {
  const q = (document.getElementById('noteSearch')?.value || '').toLowerCase(), filtered = notes.filter(n => !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)), nCount = document.getElementById('nCount');
  if (nCount) nCount.textContent = notes.length;
  const list = document.getElementById('noteList'); if (!list) return;
  if (!filtered.length) { list.innerHTML = `<div class="n-empty-state"><span class="n-empty-icon">✦</span><span class="n-empty-text">${q ? 'No notes match search' : 'No notes yet'}</span></div>`; return; }
  list.innerHTML = filtered.map(n => {
    const preview = n.content.replace(/[#*\`>\-]/g, '').slice(0, 60).replace(/\n/g, ' ') || 'Empty note';
    return `<div class="note-item ${n.id === activeNId ? 'on' : ''}" onclick="openNote('${n.id}')"><div class="n-item-title">${escH(n.title) || 'Untitled'}</div><div class="n-item-preview">${escH(preview)}</div><div class="n-item-meta"><span class="n-item-date">${new Date(n.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span><span class="n-item-words">${wordCount(n.content)}w</span></div></div>`;
  }).join('');
}

// ════════════════════════════════════════
// 6. SCHEDULE
// ════════════════════════════════════════

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], HOURS = Array.from({ length: 15 }, (_, i) => i + 7);
let events = Storage.get('stride_events', []), activeDay = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
const saveEvents = () => Storage.set('stride_events', events);

function addEvent() {
  const title = document.getElementById('evTitle')?.value.trim(); if (!title) { toast('Enter a title', 'err'); return; }
  const start = document.getElementById('evStart')?.value, end = document.getElementById('evEnd')?.value;
  if (!start || !end || start >= end) { toast('End must be after start', 'err'); return; }
  events.push({ id: uid(), title, start, end, day: document.getElementById('evDay').value, cat: document.getElementById('evCat').value });
  saveEvents(); renderSchedule(); const el = document.getElementById('evTitle'); if (el) el.value = ''; toast('Event added');
}
function delEvent(id) { events = events.filter(e => e.id !== id); saveEvents(); renderSchedule(); }
function setDay(d) { activeDay = d; renderSchedule(); }

function renderSchedule() {
  const today = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1], tabs = document.getElementById('dayTabs');
  if (tabs) tabs.innerHTML = DAYS.map(d => `<button class="d-tab ${d === activeDay ? 'on' : ''} ${d === today && d !== activeDay ? 'today-tab' : ''}" onclick="setDay('${d}')">${d.slice(0, 3)}</button>`).join('');
  const lbl = document.getElementById('curDayLbl'); if (lbl) lbl.textContent = activeDay;
  const dayEvs = events.filter(e => e.day === activeDay), now = new Date(), nowM = now.getHours() * 60 + now.getMinutes(), tt = document.getElementById('timetable');
  if (tt) {
    tt.innerHTML = HOURS.map(h => {
      const slotEvs = dayEvs.filter(e => parseInt(e.start.split(':')[0]) === h), isNow = today === activeDay && nowM >= h * 60 && nowM < (h + 1) * 60, nowPct = isNow ? ((nowM - h * 60) / 60 * 100) : null;
      return `<div class="time-slot"><div class="t-label">${h < 12 ? h + 'am' : h === 12 ? '12pm' : (h - 12) + 'pm'}</div><div class="t-line">${nowPct !== null ? `<div class="now-line" style="top:${nowPct}%"></div>` : ''}${slotEvs.map(ev => {
        const [sh, sm] = ev.start.split(':').map(Number), [eh, em] = ev.end.split(':').map(Number);
        const top = sm / 60 * 100, dur = Math.max(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 100, 28);
        return `<div class="ev-block cat-${ev.cat}" style="top:${top}%;height:${dur}%" onclick="delEvent('${ev.id}')"><div class="ev-title">${escH(ev.title)}</div><div class="ev-time">${ev.start}–${ev.end}</div></div>`;
      }).join('')}</div></div>`;
    }).join('');
  }
  const colors = { study: 'var(--teal)', work: 'var(--accent)', personal: 'var(--prime)', health: 'var(--mint)' }, mini = document.getElementById('evMiniList');
  if (mini) mini.innerHTML = dayEvs.length ? [...dayEvs].sort((a, b) => a.start.localeCompare(b.start)).map(ev => `<div class="ev-mini"><div class="ev-dot" style="background:${colors[ev.cat]}"></div><div class="ev-info"><div class="ev-info-title">${escH(ev.title)}</div><div class="ev-info-time">${ev.start} – ${ev.end}</div></div><button class="ev-del" onclick="delEvent('${ev.id}')">✕</button></div>`).join('') : `<div style="color:var(--ink4);font-size:1.06rem;padding:6px 0;font-style:italic;font-family:var(--font-display)">No events on ${activeDay}</div>`;
}

// ════════════════════════════════════════
// 7. WEEKLY REVIEW
// ════════════════════════════════════════

function renderReview() {
  const now = new Date(), wd = now.getDay(), mon = new Date(now); mon.setDate(now.getDate() - (wd === 0 ? 6 : wd - 1)); const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const lbl = document.getElementById('reviewWkLbl'); if (lbl) lbl.textContent = `week of ${mon.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} — ${sun.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  const active = tasks.filter(t => !t.completed).length, wDone = tasks.filter(t => t.completed && t.completedAt && t.completedAt >= (Date.now() - 7 * 864e5)).length, ps = Storage.get('stride_pomo_day', { sessions: 0, mins: 0, breaks: 0 });
  const stats = document.getElementById('reviewStats');
  if (stats) stats.innerHTML = `<div class="card r-stat"><div class="big">${wDone}</div><div class="lbl">Done this week</div><div class="sub">${active} still in queue</div></div><div class="card r-stat"><div class="big">${ps.mins || 0}</div><div class="lbl">Focus minutes</div><div class="sub">${ps.sessions || 0} pomodoro sessions</div></div><div class="card r-stat"><div class="big">${notes.length}</div><div class="lbl">Notes</div><div class="sub">${events.length} scheduled events</div></div>`;
  const bars = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0); const nx = new Date(d); nx.setDate(d.getDate() + 1);
    bars.push({ day: d.toLocaleDateString('en-US', { weekday: 'short' }), count: tasks.filter(t => t.completed && t.completedAt && t.completedAt >= d.getTime() && t.completedAt < nx.getTime()).length });
  }
  const mx = Math.max(...bars.map(b => b.count), 1), chart = document.getElementById('barChart');
  if (chart) chart.innerHTML = bars.map(b => `<div class="bar-col"><div class="bar-val">${b.count || ''}</div><div class="bar-wrap"><div class="bar" style="height:${(b.count / mx) * 100}%"></div></div><div class="bar-day">${b.day}</div></div>`).join('');
  const summary = document.getElementById('pomoSummary');
  if (summary) summary.innerHTML = `<div>Today: <strong style="color:var(--ink)">${ps.mins || 0} min</strong> in <strong style="color:var(--ink)">${ps.sessions || 0} sessions</strong></div><div>Breaks taken: <strong style="color:var(--ink)">${ps.breaks || 0}</strong></div><div style="margin-top:9px;font-size:.74rem;color:var(--ink4);font-family:var(--font-mono);letter-spacing:.08em;text-transform:uppercase">// resets daily</div>`;
  const saved = Storage.get('stride_review', {}), r1 = document.getElementById('r1'), r2 = document.getElementById('r2'), r3 = document.getElementById('r3');
  if (r1) r1.value = saved.r1 || ''; if (r2) r2.value = saved.r2 || ''; if (r3) r3.value = saved.r3 || '';
  const moods = saved.moods || []; document.querySelectorAll('.m-tag').forEach(el => el.classList.toggle('sel', moods.includes(el.textContent.trim())));
}

function saveReview() {
  const sv = Storage.get('stride_review', {}); sv.r1 = document.getElementById('r1')?.value || ''; sv.r2 = document.getElementById('r2')?.value || ''; sv.r3 = document.getElementById('r3')?.value || ''; Storage.set('stride_review', sv);
}
function toggleMood(el) { if (!el) return; el.classList.toggle('sel'); const sv = Storage.get('stride_review', {}); sv.moods = [...document.querySelectorAll('.m-tag.sel')].map(e => e.textContent.trim()); Storage.set('stride_review', sv); }
function exportReview() {
  const sv = Storage.get('stride_review', {}), wDone = tasks.filter(t => t.completed && t.completedAt && t.completedAt >= (Date.now() - 7 * 864e5)).length;
  const content = `STRIDE — WEEKLY REVIEW\n${'─'.repeat(40)}\nWeek ending: ${new Date().toLocaleDateString()}\n\nSTATS\nTasks done this week: ${wDone}\nNotes: ${notes.length} | Events: ${events.length}\n\nWHAT WENT WELL\n${sv.r1 || '—'}\n\nWHAT TO IMPROVE\n${sv.r2 || '—'}\n\nNEXT WEEK GOALS\n${sv.r3 || '—'}\n\nMOOD\n${(sv.moods || []).join(', ') || '—'}`;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' })); a.download = `stride-review-${new Date().toISOString().slice(0, 10)}.txt`; a.click(); toast('Review exported', 'info');
}
