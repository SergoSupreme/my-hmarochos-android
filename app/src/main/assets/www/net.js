// ===================================================================
//  Онлайн-шар: авторизація, синхронізація прогресу з базою даних, новини, пошта, чат, форум, рейтинг.
//  Гра завжди спершу зберігає локально (миттєво), а на сервер відправляє пакетами раз на ~15 с
//  і при згортанні вкладки — тому немає затримок і зайвого навантаження.
// ===================================================================
const API_URL = window.GAME_API || 'api/';
const AUTH_KEY = 'mx_auth_v1';
const NET = { online: false, auth: null, rev: 0, dirty: false, busy: false, locked: false, events: [], lastPush: 0, chatAfter: 0 };

function netLoadAuth() { try { NET.auth = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch (e) { NET.auth = null; } NET.rev = NET.auth ? NET.auth.rev || 0 : 0; }
function netStoreAuth() { try { if (typeof SAVE_BASE !== 'undefined') SAVE_KEY = NET.auth && NET.auth.player ? SAVE_BASE + '_p' + NET.auth.player.id : SAVE_BASE; if (NET.auth) { NET.auth.rev = NET.rev; localStorage.setItem(AUTH_KEY, JSON.stringify(NET.auth)); if (typeof SAVE_BASE !== 'undefined') localStorage.removeItem(SAVE_BASE); } else localStorage.removeItem(AUTH_KEY); } catch (e) {} }

async function api(action, data = {}, opts = {}) {
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), opts.timeout || 8000);
  try {
    const r = await fetch(API_URL + '?a=' + action, {
      method: 'POST', signal: ctl.signal, keepalive: !!opts.keepalive,
      headers: { 'Content-Type': 'application/json', ...(NET.auth ? { Authorization: 'Bearer ' + NET.auth.token } : {}) },
      body: JSON.stringify({ ...data, _v: VERSION }),
    });
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('json')) { NET.lastErr = 'HTTP ' + r.status; return { ok: false, error: r.status >= 500 ? 'server_error' : 'offline' }; }
    const j = await r.json();
    if (r.status === 401 && j.error === 'unauthorized') { const had = !!NET.auth; NET.auth = null; netStoreAuth(); if (had && NET.booted) { try { if (!sessionStorage.getItem('mx_401')) { sessionStorage.setItem('mx_401', '1'); setTimeout(() => location.reload(), 300); } } catch (e) {} } }
    if (j.error === 'db_error' && (j.code === '42S22' || j.code === '42S02') && !opts._heal) return api(action, data, { ...opts, _heal: 1 }); // сервер щойно оновив структуру бази — повторюємо
    if (!j.ok && j.error) { NET.lastErr = j.error; NET.lastCode = j.code || null; }
    if (j.error === 'banned') netBanned(j);
    if (j.error === 'chat_banned' || j.error === 'dm_banned') NET.lastBan = j;
    return j;
  } catch (e) { return { ok: false, error: e.name === 'AbortError' ? 'timeout' : 'offline' }; }
  finally { clearTimeout(to); }
}

const NET_ERR = { bad_pack: 'Невідомий пакет', don_too_many: 'У тебе вже є 3 заявки, що очікують оплати — напиши адміністратору', don_done: 'Заявку вже оброблено',
  nick_taken: 'Цей нікнейм уже зайнятий', nick_length: 'Нікнейм — від 3 до 20 символів', nick_chars: 'Лише літери, цифри, пробіл, _ . -',
  password_short: 'Пароль — щонайменше 6 символів', bad_login: 'Невірний нікнейм або пароль', banned: 'Акаунт заблоковано',
  too_many_requests: 'Забагато спроб — зачекай трохи', muted: 'Адміністрація заборонила тобі писати повідомлення', promo_over: 'Акція вже завершилась', forbidden: 'Немає доступу', offline: 'Немає з’єднання з сервером', timeout: 'Сервер не відповідає', empty: 'Порожнє повідомлення',
};
// Ідентифікатор пристрою — щоб заблокований гравець не створював нові акаунти
function netDev() { try { let d = localStorage.getItem('mx_dev'); if (!/^[a-f0-9]{32}$/.test(d || '')) { d = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem('mx_dev', d); } return d; } catch (e) { return ''; } }
function netBanActive() { try { const b = JSON.parse(localStorage.getItem('mx_ban') || 'null'); if (b && (!b.until || b.until > Date.now() / 1000)) return b; localStorage.removeItem('mx_ban'); } catch (e) {} return null; }
function netBanned(j) {
  try { localStorage.setItem('mx_ban', JSON.stringify({ until: j.until || null, reason: j.reason || '' })); } catch (e) {}
  if (document.getElementById('net-ban')) return;
  const o = document.createElement('div'); o.id = 'net-ban'; o.className = 'show';
  o.innerHTML = `<div class="nl-card"><img src="${IMG('lock')}" alt=""><b>${tr('Акаунт заблоковано')}</b><p>${j.until ? tr('Блокування діє до') + ' ' + new Date(j.until * 1000).toLocaleString('uk-UA') : tr('Блокування безстрокове.')}${j.reason ? '<br>' + tr('Причина') + ': ' + esc(j.reason) : ''}</p><p class="small">${tr('Якщо вважаєш блокування помилковим — звернись до адміністрації.')}</p></div>`;
  (document.getElementById('app') || document.body).appendChild(o);
  if (j.until) setTimeout(() => location.reload(), Math.max(5000, (j.until - Date.now() / 1000) * 1000 + 2000));
}
const banTxt = (what) => { const b = NET.lastBan || {}; return tr(what) + ' ' + (b.until && b.until < 253000000000 ? tr('до') + ' ' + new Date(b.until * 1000).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : tr('назавжди')) + (b.reason ? '. ' + tr('Причина') + ': ' + b.reason : ''); };
const netErr = e => (e === 'db_error' || e === 'db_connect') ? (e === 'db_connect' ? 'Сервер не може підключитися до бази даних — перевір налаштування в api/config.php' : 'Помилка бази даних') + (NET.lastCode ? ' (код ' + NET.lastCode + ')' : '') : e === 'chat_banned' ? banTxt('Тобі заборонено писати в чат') : e === 'dm_banned' ? banTxt('Тобі заборонено писати особисті повідомлення') : tr(NET_ERR[e] || ('Помилка: ' + e));

// ---------- статистика для рейтингів ----------
function netStats() {
  return { level: S.level, xp: Math.floor(S.xp), coins: Math.floor(S.coins), bucks: Math.floor(S.bucks), floors: S.floors.length - 1, businesses: bizFloors().length,
    residents: S.residents.length, cups: Object.keys(S.cups).length, earned: Math.floor(S.stats.earned), revHour: typeof revHourRate === 'function' ? revHourRate() : 0 };
}
function netEvent(k, i) { if (NET.auth) { NET.events.push({ k, i: String(i ?? '') }); if (NET.events.length > 50) NET.events.shift(); } }
// Позначка «є незбережені на сервері зміни» живе в localStorage — переживає закриття гри
function netMarkDirty() { if (!NET.auth || NET.locked) return; NET.dirty = true; if (!NET.auth.pending) { NET.auth.pending = true; netStoreAuth(); } clearTimeout(NET.pt); NET.pt = setTimeout(() => netPush(), 800); netSyncUI(); }

async function gzipBody(str) {
  if (typeof CompressionStream === 'undefined' || str.length < 4096) return null;
  try { const cs = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip')); return await new Response(cs).arrayBuffer(); } catch (e) { return null; }
}
// Відправка стану на сервер. Сервер — єдине джерело правди; зберігає лише активний пристрій.
async function netPush(force = false, keepalive = false) {
  if (!NET.auth || !NET.online || NET.locked) return;
  if (NET.busy) { NET.again = true; return; }
  if (!NET.dirty && !NET.auth.pending && !force) return;
  NET.busy = true; NET.dirty = false;
  const ev = NET.events.splice(0);
  S.pid = NET.auth.player.id; S.lastSeen = now();
  const payload = JSON.stringify({ _v: VERSION, rev: NET.rev, state: S, stats: netStats(), events: ev });
  let r;
  const gz = await gzipBody(payload);
  netSyncUI('busy');
  if (gz) {
    try {
      // keepalive (відправка під час згортання) дозволяє лише тіло до 64 КБ — стискаємо, тому вміщається
      const res = await fetch(API_URL + '?a=save', { method: 'POST', keepalive: keepalive && gz.byteLength < 63000, headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip', Authorization: 'Bearer ' + NET.auth.token }, body: gz });
      r = await res.json();
    } catch (e) { r = { ok: false, error: 'offline' }; }
  } else r = await api('save', JSON.parse(payload), { keepalive: keepalive && payload.length < 63000, timeout: 12000 });
  NET.busy = false; NET.lastPush = Date.now();
  if (NET.again) { NET.again = false; setTimeout(() => netPush(), 300); }
  if (r.ok) { NET.rev = r.rev; NET.lastSync = Date.now(); if (!NET.dirty) NET.auth.pending = false; netStoreAuth(); netSyncUI(); return true; }
  if (r.error === 'other_device') { NET.events.unshift(...ev); netLockOther(); return false; }
  if (r.error === 'conflict' && r.save) { netApplyState(r.save.data, r.save.rev); return false; }
  if (r.error === 'old_client') { try { if (!sessionStorage.getItem('mx_reloaded')) { sessionStorage.setItem('mx_reloaded', '1'); location.reload(); } } catch (e) {} return false; }
  if (r.error === 'wrong_player') { const l = await api('load'); if (l.ok && l.save) netApplyState(l.save.data, l.save.rev); else netFreshState(NET.auth.player); return false; }
  NET.events.unshift(...ev); NET.dirty = true;
  if (r.error === 'offline' || r.error === 'timeout' || r.error === 'server_error' || r.error === 'db_error' || r.error === 'db_connect') netSetOnline(false);
  netSyncUI();
  return false;
}
function netApplyState(data, rev) {
  NET.rev = rev; NET.dirty = false;
  if (NET.auth) { NET.auth.pending = false; netStoreAuth(); }
  if (!data || !data.floors) return;
  S = data; fixSave();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
  if (typeof closeModal === 'function') closeModal();
  if (typeof rewardQueue !== 'undefined') rewardQueue.length = 0;
  if (typeof applySettings === 'function') applySettings();
  if (typeof applyWeather === 'function' && S.weather) applyWeather();
  render(); tick();
}
// Новий профіль — завжди чиста гра з нуля (без даних гостя чи іншого акаунта)
function netFreshState(player) {
  newGame(); S.pid = player.id; S.profile.name = player.nick; if (player.avatar) S.profile.ava = player.avatar;
  NET.dirty = true; if (NET.auth) { NET.auth.pending = true; netStoreAuth(); }
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
  if (typeof closeModal === 'function') closeModal();
  if (typeof applySettings === 'function') applySettings();
  if (typeof setWeather === 'function') setWeather();
  render(); tick();
}
function netSetOnline(v) {
  const was = NET.online; NET.online = v; document.body.classList.toggle('net-off', !v);
  if (was && !v && NET.auth && typeof toast === 'function') toast(tr('Немає зв’язку з сервером — прогрес збережеться, щойно зв’язок повернеться'), 'phone', true);
  netSyncUI();
}
// Індикатор синхронізації (хмаринка біля пошти): зелена — все збережено в базі, жовта — зберігається, червона — немає зв'язку
function netSyncUI(busy) {
  const b = document.getElementById('ti-sync'); if (!b) return;
  const st = !NET.auth ? 'off' : !NET.online ? 'off' : NET.locked ? 'lock' : (busy === 'busy' || NET.dirty || NET.auth.pending) ? 'wait' : 'ok';
  b.className = 'ticon sync-' + st;
}
function netSyncInfo() {
  const st = !NET.auth ? tr('Ти не увійшов в акаунт') : !NET.online ? tr('Немає зв’язку з сервером') + (NET.lastErr ? ' (' + NET.lastErr + ')' : '') : NET.locked ? tr('Гра відкрита на іншому пристрої') : (NET.dirty || NET.auth.pending) ? tr('Зберігаємо в базу…') : tr('Усе збережено в базі');
  toast(st, 'phone', true);
  if (NET.auth && !NET.locked) netResume(true);
}

// Взяти гру на цей пристрій: якщо на сервері нічого нового — дописуємо свої незбережені зміни, інакше беремо серверний стан
async function netClaim() {
  const r = await api('claim');
  if (!r.ok) return r;
  NET.auth.player = r.player; NET.locked = false; netUnlockUI(); NET.lastSync = Date.now(); try { localStorage.removeItem('mx_ban'); } catch (e) {}
  const serverRev = r.rev || 0;
  const mine = S.pid === r.player.id;
  if (r.save && !(NET.auth.pending && serverRev === NET.rev && mine)) netApplyState(r.save.data, r.save.rev);
  else if (!r.save && !(mine && NET.auth.pending)) { NET.rev = serverRev; netFreshState(r.player); await netPush(true); }
  else { NET.rev = serverRev; NET.dirty = true; netStoreAuth(); await netPush(true); }
  netSyncUI();
  return r;
}
// Перевірка, чи гра не відкрита на іншому пристрої
async function netBeat() {
  if (!NET.auth || NET.locked || document.hidden) return;
  const r = await api('beat', {}, { timeout: 5000 });
  if (!r.ok) { if (r.error === 'offline' || r.error === 'timeout' || r.error === 'server_error' || r.error === 'db_error' || r.error === 'db_connect') netSetOnline(false); return; }
  if (!NET.online) { netSetOnline(true); return netResume(true); }
  if (r.dm != null) netDmBadge(r.dm);
  pushSync();
  netLiveSync(r);
  if (!r.active) return netLockOther();
  // підтягуємо новіший стан з бази лише коли в нас немає власних незбережених змін (інакше вони б загубились)
  if (r.rev > NET.rev && !NET.busy && !NET.dirty && !NET.auth.pending) { const l = await api('load'); if (l.ok && l.save && !NET.busy && !NET.dirty && !NET.auth.pending) netApplyState(l.save.data, l.save.rev); }
}
function netApplyCfg(c) {
  NET.cfg = c;
  let b = document.getElementById('g-banner');
  if (c.banner) { if (!b) { b = document.createElement('div'); b.id = 'g-banner'; (document.getElementById('app') || document.body).appendChild(b); } if (b._t !== c.banner) { b._t = c.banner; b.innerHTML = `<img src="${IMG('megaphone2')}" alt=""><div class="gb-run"><span>${mtHTML(c.banner)}</span></div>`; } }
  else if (b) b.remove();
  let m = document.getElementById('net-maint'); const admin = NET.auth && NET.auth.player && +NET.auth.player.access === 1;
  if (+c.maint && !admin) { if (!m) { m = document.createElement('div'); m.id = 'net-maint'; (document.getElementById('app') || document.body).appendChild(m); } m.innerHTML = `<div class="nl-card"><img src="${IMG('crane')}" alt=""><b>${tr('Технічні роботи')}</b><p>${esc(c.maint_msg || tr('Гра оновлюється. Спробуй трохи пізніше — прогрес збережено.'))}</p></div>`; }
  else if (m) m.remove();
}
// Живі оновлення від адміністрації: права доступу, новини, акції, пошта — без перезавантаження сторінки
function netLiveSync(r) {
  if (r.cfg) netApplyCfg(r.cfg);
  if ('corp' in r) { const was = JSON.stringify(NET.corp || null); NET.corp = r.corp; NET.cinv = r.cinv; if (was !== JSON.stringify(r.corp || null)) { if (r.corp && !S.corpRep && typeof corpProgInit === 'function') corpProgInit(); render(); } }
  if (!NET.auth || !NET.auth.player) return;
  if (r.access != null && +r.access !== +(NET.auth.player.access || 0)) {
    NET.auth.player.access = +r.access; NET.auth.player.admin = +r.access === 1; netStoreAuth();
    if (typeof admUpdButton === 'function') admUpdButton();
    if (+r.access === 1) toast(tr('Тобі надано права адміністратора — кнопка з короною біля пошти'), 'crown', true);
    else { const o = document.getElementById('adm'); if (o) o.classList.remove('show'); }
  }
  if (r.nst != null && r.nst !== NET.nst) { const first = NET.nst == null; NET.nst = r.nst; if (!first) netPullNews(); }
  if (r.pst != null && r.pst !== NET.pst) { const first = NET.pst == null; NET.pst = r.pst; if (!first) netPullPromos(); }
  if (r.mst != null && r.mst !== NET.mst) { const first = NET.mst == null; NET.mst = r.mst; if (!first) netPullMail(); }
}
function netLockOther() {
  if (NET.locked) return; NET.locked = true; netSyncUI();
  let o = document.getElementById('net-lock');
  if (!o) {
    o = document.createElement('div'); o.id = 'net-lock';
    o.innerHTML = `<div class="nl-card"><img src="${IMG('phone')}" alt=""><b>${tr('Гра відкрита на іншому пристрої')}</b><p>${tr('Щоб нічого не втратити, грати можна лише на одному пристрої одночасно. Твій прогрес збережено.')}</p><button class="btn gold wide shine" id="nl-go">${tr('Грати тут')}</button></div>`;
    document.body.appendChild(o);
    o.querySelector('#nl-go').onclick = async () => { const b = o.querySelector('#nl-go'); b.disabled = true; const r = await netClaim(); b.disabled = false; if (!r.ok) toast(netErr(r.error), 'phone', true); };
  }
  o.classList.add('show');
}
function netUnlockUI() { const o = document.getElementById('net-lock'); if (o) o.classList.remove('show'); }

// ---------- пошта й новини з сервера ----------
async function netPullMail() {
  if (!NET.auth || !NET.online || NET.locked) return;
  const r = await api('mail'); if (!r.ok) return;
  S.mail = S.mail || [];
  let added = 0;
  for (const m of r.items) if (!S.mail.some(x => x.sid === m.sid)) { S.mail.unshift({ id: S.nextId++, sid: m.sid, t: m.t, read: false, claimed: false, from: m.from, icon: m.icon, title: m.title, text: m.text, reward: m.reward }); added++; }
  if (added) { save(); render(); }
}
async function netPullNews() {
  const r = await api('news'); if (!r.ok) return;
  const was = JSON.stringify(NEWS); NEWS.length = 0; NEWS.push(...r.items); render();
  if (was !== JSON.stringify(NEWS) && typeof modalRefresh === 'function' && modalRefresh && $('.newsrow, .promo-card, #m-body .note')) { $('#m-body')._h = null; modalRefresh(); }
}
async function netPullPromos() {
  if (!NET.auth || !NET.online) return;
  const r = await api('promos'); if (!r.ok) return;
  const was = JSON.stringify(NET.promos || []); NET.promos = r.items;
  if (was !== JSON.stringify(r.items)) { render(); if (typeof modalRefresh === 'function' && modalRefresh && $('.promo-card, .newsrow')) { $('#m-body')._h = null; modalRefresh(); } }
}
async function netTakeMail(m) { const r = await api('mail_take', { id: m.sid }); return r.ok && r.fresh; }

// ---------- запуск ----------
async function netBoot() {
  netLoadAuth();
  const ping = await api('ping', {}, { timeout: 4000 });
  netSetOnline(!!ping.ok); NET.booted = true; if (ping.cfg) setTimeout(() => netApplyCfg(ping.cfg), 0);
  if (!ping.ok) return NET.auth ? 'offline_auth' : 'offline';
  if (!NET.auth) return 'need_auth';
  const r = await netClaim();
  if (!r.ok) return NET.auth ? 'offline_auth' : 'need_auth';
  return 'ok';
}
function netAfterLogin() {
  S.profile = S.profile || {}; S.profile.name = NET.auth.player.nick; S.pid = NET.auth.player.id;
  save(); render();
  netPullMail(); netPullNews(); netPullPromos(); netBeat();
}
// Повернення в гру (розблокував телефон, відкрив вкладку): цей пристрій стає активним і бере найсвіжіший стан з бази
async function netResume(force) {
  if (!NET.auth || NET.resuming) return;
  NET.resuming = true;
  try {
    for (let i = 0; i < 30 && NET.busy; i++) await new Promise(r => setTimeout(r, 100));
    if (!NET.online) { const p = await api('ping', {}, { timeout: 5000 }); if (!p.ok) return; netSetOnline(true); }
    const r = await netClaim();
    if (!r.ok && (r.error === 'offline' || r.error === 'timeout' || r.error === 'server_error')) netSetOnline(false);
  } finally { NET.resuming = false; }
}
// синхронізація: кожна зміна йде в базу за ~1 с, перевірка пристрою й свіжості — раз на 5 с
setInterval(() => { if (NET.auth && NET.online && !NET.locked && (NET.dirty || NET.auth.pending) && Date.now() - NET.lastPush > 1500) netPush(); }, 1000);
setInterval(netBeat, 5000);
setInterval(() => { if (NET.auth) { netPullMail(); netPullPromos(); netPullNews(); } }, 120000);
setInterval(() => { if (!NET.online && NET.auth && !NET.locked && !document.hidden) netResume(); }, 10000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { NET.hiddenAt = Date.now(); netPush(false, true); }
  else if (NET.booted && NET.hiddenAt && Date.now() - NET.hiddenAt > 1500) netResume(); else netBeat();
});
window.addEventListener('online', () => { if (NET.booted) netResume(); });
window.addEventListener('pagehide', () => netPush(false, true));

// ---------- вікно входу (на екрані завантаження) ----------
function showAuth(done) {
  const ban = netBanActive(); if (ban) return netBanned(ban);
  const L = document.getElementById('loader');
  const box = document.createElement('div'); box.className = 'auth'; let mode = 'new';
  const draw = (err = '') => {
    box.innerHTML = `<div class="au-card"><div class="au-tabs"><button class="${mode === 'new' ? 'on' : ''}" data-m="new">${tr('Нова гра')}</button><button class="${mode === 'login' ? 'on' : ''}" data-m="login">${tr('Увійти')}</button></div>
      <div class="au-title">${mode === 'new' ? tr('Створи свій ігровий профіль') : tr('Вхід у свій профіль')}</div>
      <label>${tr('Нікнейм')}<input id="au-nick" maxlength="20" autocomplete="username" placeholder="${tr('Наприклад: Магнат_UA')}"></label>
      <label>${tr('Пароль')}<input id="au-pass" type="password" maxlength="64" autocomplete="${mode === 'new' ? 'new-password' : 'current-password'}" placeholder="${tr('Щонайменше 6 символів')}"></label>
      <div class="au-err">${err}</div>
      <button class="btn gold wide shine" id="au-go">${mode === 'new' ? tr('Почати грати') : tr('Увійти')}</button>
      <div class="au-note">${mode === 'new' ? tr('Прогрес зберігається на сервері — грай з будь-якого пристрою.') : tr('Увійди тим самим нікнеймом і паролем, щоб продовжити гру.')}</div></div>`;
    box.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; draw(); });
    box.querySelector('#au-go').onclick = submit;
    box.querySelectorAll('input').forEach(i => i.onkeydown = e => { if (e.key === 'Enter') submit(); });
  };
  const submit = async () => {
    const nick = box.querySelector('#au-nick').value.trim(), password = box.querySelector('#au-pass').value;
    if (password.length < 6) return draw(netErr('password_short')), (box.querySelector('#au-nick').value = nick);
    const btn = box.querySelector('#au-go'); btn.disabled = true; btn.textContent = '…';
    const r = mode === 'new'
      ? await api('register', { device: netDev(), nick, password, avatar: S.profile && S.profile.ava, lang: S.settings.lang || 'uk', state: null })
      : await api('login', { device: netDev(), nick, password });
    if (!r.ok) { draw(netErr(r.error)); box.querySelector('#au-nick').value = nick; return; }
    NET.auth = { token: r.token, player: r.player }; NET.rev = r.rev || 0; NET.locked = false; netStoreAuth();
    if (r.save) netApplyState(r.save.data, r.save.rev);
    else netFreshState(r.player);
    if (NET.pickLang && S.settings.lang !== NET.pickLang) { S.settings.lang = NET.pickLang; save(); applySettings(); } // мова, обрана на екрані входу
    netAfterLogin(); netPush(true);
    box.classList.add('out'); setTimeout(() => { box.remove(); done(); }, 350);
  };
  draw(); L.appendChild(box); authLangPicker(L, () => { const nk0 = box.querySelector('#au-nick').value; draw(); box.querySelector('#au-nick').value = nk0; });
}
// вибір мови на екрані входу — правий верхній кут, випадаючий список
function authLangPicker(host, onChange) {
  if (host.querySelector('.au-lang')) return;
  const w = document.createElement('div'); w.className = 'au-lang notr';
  const cur = () => LANGS.find(l => l.id === (S.settings.lang || 'uk')) || LANGS[0];
  const paint = () => { const c = cur(); w.innerHTML = `<button class="al-btn" type="button"><i>${c.flag}</i><span>${c.name}</span><b>▾</b></button>
    <div class="al-list">${LANGS.map((l, i) => `<button type="button" class="${l.id === c.id ? 'on' : ''}" data-l="${l.id}" style="--d:${i * 28}ms"><i>${l.flag}</i><span>${l.name}</span>${l.id === c.id ? '<em>✓</em>' : ''}</button>`).join('')}</div>`; };
  paint();
  w.addEventListener('click', e => {
    e.stopPropagation();
    const b = e.target.closest('[data-l]');
    if (!b) { w.classList.toggle('open'); return; }
    const id = b.dataset.l; w.classList.remove('open');
    if (id === (S.settings.lang || 'uk')) return;
    S.settings.lang = id; NET.pickLang = id;
    try { localStorage.setItem('mx_lang', id); } catch (er) {}
    if (typeof saveNow === 'function') saveNow();
    applySettings(); paint(); if (onChange) onChange();
  });
  document.addEventListener('click', () => w.classList.remove('open'));
  host.appendChild(w);
}

// ---------- Форум: чат, теми, рейтинг ----------
let forumTab = 'chat', forumTopic = null, chatItems = [], chatTimer = null; const seenMsg = new Set();
const ago = t => fmtT(now() - t);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// власні смайлики гри: у тексті зберігаються як :e12:, показуються картинками
const nk = s => `<span class="notr">${esc(s)}</span>`; // ніки та назви корпорацій не перекладаємо
const emo = html => String(html).replace(/:(e\d{1,2}):/g, (m, k) => EMOJI.includes(k) ? `<img class="emo" src="${ESRC(k)}" alt="${m}">` : m);
const emoTxt = s => emo(esc(s || ''));
// ---------- автоматичний переклад повідомлень, новин і акцій на мову гравця ----------
const MT = { cache: new Map(), pend: new Set(), t: 0, orig: new Set() };
const mtLang = () => (typeof S !== 'undefined' && S.settings && S.settings.lang) || 'uk';
const mtKey = s => mtLang() + '|' + s;
function mtSkip(s) { // очевидно вже мовою гравця — не перекладаємо
  const t = String(s || '').replace(/:e\d{1,2}:/g, '').trim(), L = mtLang();
  if (!/\p{L}{2,}/u.test(t)) return true;
  if (L === 'uk') return /[іїєґІЇЄҐ]/.test(t) && !/[ыэъёЫЭЪЁ]/.test(t);
  if (L === 'ru') return /[а-яё]/i.test(t) && /[ыэъё]/i.test(t) && !/[іїєґ]/i.test(t);
  return false;
}
function mtText(raw) { const k = mtKey(raw); if (MT.orig.has(raw) || mtSkip(raw)) return raw; const c = MT.cache.get(k); if (c !== undefined) return c; mtQueue(raw); return raw; }
// розмітка для тексту, який треба перекласти: оригінал одразу, переклад — щойно прийде
function mtHTML(raw, opts = {}) {
  raw = String(raw || ''); if (opts.mine) return `<span class="notr">${emoTxt(raw)}</span>`;
  const shown = mtText(raw), trd = shown !== raw;
  return `<span class="mt notr${trd ? ' trd' : ''}" data-mt="${encodeURIComponent(raw)}">${emoTxt(shown).replace(/\n/g, opts.br ? '<br>' : '\n')}${trd ? '<i class="mt-ic" title="Оригінал">🌐</i>' : ''}</span>`;
}
function mtQueue(raw) { if (!NET.auth || !NET.online) return; const k = mtKey(raw); if (MT.cache.has(k) || MT.pend.has(k)) return; MT.pend.add(k); clearTimeout(MT.t); MT.t = setTimeout(mtFlush, 120); }
async function mtFlush() {
  const L = mtLang(), keys = [...MT.pend].filter(k => k.startsWith(L + '|')).slice(0, 40); if (!keys.length) { MT.pend.clear(); return; }
  keys.forEach(k => MT.pend.delete(k));
  const items = keys.map(k => k.slice(L.length + 1));
  const r = await api('tr', { lang: L, items }, { timeout: 15000 });
  if (r.ok) items.forEach((t, i) => MT.cache.set(L + '|' + t, r.items[i] || t)); else items.forEach(t => MT.cache.set(L + '|' + t, t));
  mtApply(); if (MT.pend.size) MT.t = setTimeout(mtFlush, 200);
}
function mtApply(root = document) {
  root.querySelectorAll('.mt[data-mt]').forEach(el => {
    const raw = decodeURIComponent(el.dataset.mt), want = mtText(raw), trd = want !== raw;
    const html = emoTxt(want).replace(/\n/g, el.closest('.meta, .pc-body, .newsrow') ? '<br>' : '\n') + (trd ? '<i class="mt-ic" title="Оригінал">🌐</i>' : '');
    if (el._h !== html) { el._h = html; el.innerHTML = html; el.classList.toggle('trd', trd); }
  });
}
document.addEventListener('click', e => { const ic = e.target.closest('.mt-ic'); if (!ic) return; e.stopPropagation(); const el = ic.closest('.mt'); const raw = decodeURIComponent(el.dataset.mt);
  if (MT.orig.has(raw)) MT.orig.delete(raw); else MT.orig.add(raw); el.innerHTML = emoTxt(MT.orig.has(raw) ? raw : mtText(raw)) + '<i class="mt-ic">🌐</i>'; }, true);
// Поле вводу з картинками-смайликами (contenteditable). Значення читається як текст із кодами :e12:
const ceIn = (id, max, ph) => `<div id="${id}" class="ce-in" contenteditable="true" role="textbox" enterkeyhint="send" data-max="${max}" data-ph="${ph}"></div>`;
function ceText(el) { let t = ''; el.childNodes.forEach(n => { if (n.nodeType === 3) t += n.nodeValue; else if (n.nodeName === 'IMG' && n.dataset.e) t += ':' + n.dataset.e + ':'; else if (n.nodeName === 'BR') t += '\n'; else t += (n.nodeName === 'DIV' && t ? '\n' : '') + ceText(n); }); return t; }
if (!Object.getOwnPropertyDescriptor(HTMLDivElement.prototype, 'value')) Object.defineProperty(HTMLDivElement.prototype, 'value', {
  get() { return this.classList.contains('ce-in') ? ceText(this).replace(/\u00a0/g, ' ') : undefined; },
  set(v) { if (!this.classList.contains('ce-in')) return; this.innerHTML = emoTxt(v || '').replace(/<img class="emo" src="([^"]+)" alt=":(e\d+):">/g, '<img class="emo" src="$1" data-e="$2" alt="">'); },
  configurable: true });
document.addEventListener('keydown', e => { if (e.target.classList && e.target.classList.contains('ce-in') && e.key === 'Enter' && !e.shiftKey) e.preventDefault(); }, true);
document.addEventListener('paste', e => { if (!e.target.closest || !e.target.closest('.ce-in')) return; e.preventDefault(); const t = (e.clipboardData || window.clipboardData).getData('text'); document.execCommand('insertText', false, t); }, true);
document.addEventListener('input', e => { const el = e.target; if (!el.classList || !el.classList.contains('ce-in')) return; if (!el.textContent && !el.querySelector('img')) el.innerHTML = ''; const max = +el.dataset.max || 300; if (el.value.length > max) { el.value = el.value.slice(0, max); ceEnd(el); } });
function ceEnd(el) { const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
let ceRange = null; document.addEventListener('selectionchange', () => { const s = getSelection(); if (s.rangeCount && s.anchorNode && s.anchorNode.parentElement && (s.anchorNode.classList?.contains('ce-in') || s.anchorNode.parentElement.closest('.ce-in'))) ceRange = s.getRangeAt(0).cloneRange(); });
const emoBtn = target => `<button class="emo-btn" type="button" data-emo="${target}" aria-label="${tr('Смайлики')}"><img src="${ESRC('e3')}" alt=""></button>`;
const placeIc = n => n <= 3 ? `<img src="${CSRC('badge_' + (13 + n))}" class="medal" alt="${n}">` : n;
function pager(page, pages, key) {
  if (pages <= 1) return '';
  const from = Math.max(0, Math.min(page - 2, pages - 5)), to = Math.min(pages - 1, from + 4), b = (n, l, c = '') => `<button class="${c}" data-a="pg" data-v="${key}:${n}" ${n < 0 || n >= pages || c === 'cur' ? 'disabled' : ''}>${l}</button>`;
  let h = b(0, '«', 'edge') + b(page - 1, '‹', 'arr') + (from > 0 ? '<span>…</span>' : '');
  for (let n = from; n <= to; n++) h += b(n, n + 1, n === page ? 'cur' : '');
  return `<nav class="gpg">${h}${to < pages - 1 ? '<span>…</span>' : ''}${b(page + 1, '›', 'arr')}${b(pages - 1, '»', 'edge')}</nav>`;
}
const clockT = t => { const d = new Date(t * 1000), n = new Date(); return d.toDateString() === n.toDateString() ? d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }); };
// Вікно смайликів: не закривається після вибору — можна додати кілька підряд
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-emo]');
  if (b) {
    e.preventDefault(); e.stopPropagation();
    const host = b.closest('.fsend') || b.parentElement; let pk = host.querySelector('.emo-pick');
    if (pk) { pk.remove(); b.classList.remove('on'); return; }
    b.classList.add('on');
    pk = document.createElement('div'); pk.className = 'emo-pick'; pk.dataset.for = b.dataset.emo;
    pk.innerHTML = `<div class="emo-h"><b>${tr('Смайлики')}</b><button type="button" class="emo-x" aria-label="${tr('Закрити')}">✕</button></div><div class="emo-g">${EMOJI.map(k => `<button type="button" data-ek="${k}"><img src="${ESRC(k)}" alt=""></button>`).join('')}</div>`;
    host.appendChild(pk);
    const mb = document.getElementById('m-body'); if (mb && host.closest('#m-body')) requestAnimationFrame(() => { mb.scrollTop = mb.scrollHeight; });
    return;
  }
  const k = e.target.closest && e.target.closest('[data-ek]');
  if (k) {
    e.preventDefault(); e.stopPropagation();
    const pk = k.closest('.emo-pick'), inp = document.getElementById(pk.dataset.for); if (!inp) return;
    const tok = ':' + k.dataset.ek + ':';
    if (inp.classList.contains('ce-in')) {
      if (inp.value.length + tok.length > (+inp.dataset.max || 300)) return;
      const img = document.createElement('img'); img.className = 'emo'; img.src = ESRC(k.dataset.ek); img.dataset.e = k.dataset.ek; img.alt = '';
      let r = ceRange && inp.contains(ceRange.startContainer) ? ceRange : null;
      if (!r) { r = document.createRange(); r.selectNodeContents(inp); r.collapse(false); }
      r.deleteContents(); r.insertNode(img); r.setStartAfter(img); r.collapse(true); ceRange = r.cloneRange();
      inp.scrollLeft = inp.scrollWidth;
    } else {
      const st = inp.selectionStart ?? inp.value.length, en = inp.selectionEnd ?? inp.value.length;
      if (inp.value.length + tok.length > (+inp.maxLength > 0 ? +inp.maxLength : 2000)) return;
      inp.value = inp.value.slice(0, st) + tok + inp.value.slice(en); const pos = st + tok.length; try { inp.setSelectionRange(pos, pos); } catch (er) {}
    }
    k.classList.remove('pop'); void k.offsetWidth; k.classList.add('pop'); return;
  }
  if (e.target.closest && e.target.closest('.emo-x')) { e.preventDefault(); e.stopPropagation(); const pk = e.target.closest('.emo-pick'), f = pk.parentElement.querySelector('.emo-btn'); if (f) f.classList.remove('on'); pk.remove(); }
}, true);
async function openForum() {
  if (!NET.auth || !NET.online) { openModal({ icon: 'chat', title: 'Форум', sub: 'Спільнота гравців', color: '#2a6fe0' }, () => `<div class="soon"><img src="${IMG('chat')}" alt=""><b>${tr('Потрібне з’єднання')}</b><p>${tr('Форум і чат працюють, коли гра підключена до сервера та ти увійшов у профіль.')}</p></div>`); return; }
  let topics = [], topic = null, top = [], topBy = 'level', online = [], onF = 'all', onPage = 0, onTotal = 0, topKind = 'players', topPage = 0, topTotal = 0, ctop = [];
  const load = async () => {
    if (forumTab === 'chat') { const r = await api('chat'); if (r.ok) chatItems = r.items; }
    if (forumTab === 'forum') { if (forumTopic) { const r = await api('forum_topic', { id: forumTopic }); if (r.ok) topic = r; } else { const r = await api('forum_topics'); if (r.ok) topics = r.items; } }
    if (forumTab === 'top') { if (topKind === 'corps') { const r = await api('corp_top', { page: topPage }); if (r.ok) { ctop = r.items; topTotal = r.total; } } else { const r = await api('top', { by: topBy, page: topPage }); if (r.ok) { top = r.items; topTotal = r.total; } } }
    if (forumTab === 'online') { const r = await api('online', { f: onF, page: onPage }); if (r.ok) { online = r.items; onTotal = r.total; } }
    const fc = $('#m-body .fchat'), fi = $('#f-in');
    if (fc && fi && forumTab === 'chat') { seenMsg.add('readychat'); const b = $('#m-body'), near = b.scrollHeight - b.scrollTop - b.clientHeight < 80; fc.innerHTML = chatItems.length ? chatItems.map(msg).join('') : ''; replyBar(); if (near) b.scrollTop = b.scrollHeight; return; }
    if (modalRefresh) { $('#m-body')._h = null; if (!$('#f-in')) $('#m-body')._force = true; modalRefresh(); const b = $('#m-body'); if (forumTab === 'chat' || forumTopic) b.scrollTop = b.scrollHeight; }
    seenMsg.add('ready' + forumTab);
  };
  const tabs = () => `<div class="rtabs ft3">${[['chat', 'Чат', 'chat'], ['top', 'Рейтинг', 'ach_cup'], ['online', 'Онлайн', 'phone']].map(([k, n, i]) => `<button class="rtab ${forumTab === k ? 'on' : ''}" data-a="tab" data-v="${k}"><img src="${IMG(i)}" alt="">${n}</button>`).join('')}</div>`;
  const msg = m => { const mine = m.nick === NET.auth.player.nick;
    const fresh = seenMsg.has('ready' + forumTab) && !seenMsg.has('c' + m.id + forumTab); seenMsg.add('c' + m.id + forumTab);
    const rch = forumTab === 'chat';
    return `<div class="cm ${mine ? 'mine' : ''} ${fresh ? 'cm-new' : ''}" ${rch ? rAttr('chat', m.id, m.nick, m.body) : ''}><div class="cm-side"><span class="fav pl-av" data-a="pl" data-v="${m.pid}">${avHTML(m.avatar)}</span><time>${clockT(m.t)}</time></div>
      <div class="cm-bub"><div class="cm-nick"><span class="pl-n" data-a="pl" data-v="${m.pid}">${nk(m.nick)}</span>${+m.is_admin ? ' <span class="rec">ADMIN</span>' : ''}</div>${rch ? rQuote('chat', m.rid, m.rnick, m.rbody) : ''}<div class="cm-text ${String(m.body || '').replace(/:e\d{1,2}:/g, '').trim() ? '' : 'jumbo'}">${mtHTML(m.body, { mine })}</div>
      ${forumTab === 'chat' && typeof isAdmin === 'function' && isAdmin() ? `<button class="cm-del" data-a="cdel" data-v="${m.id}" aria-label="${tr('Видалити')}">✕</button>` : ''}</div></div>`; };
  const HEADS = { chat: ['chat', 'Чат', 'Загальний чат гравців «' + GAME_TITLE + '»'], forum: ['clipboard', 'Форум', 'Теми для обговорення'], top: ['ach_cup', 'Рейтинг', 'Найкращі власники хмарочосів'], online: ['phone', 'Онлайн', 'Гравці, які зараз у грі'] };
  const setHead = () => { const [ic, t, sub] = HEADS[forumTab] || HEADS.chat, hd = $('#m-head'); if (!hd || hd._k === forumTab) return; hd._k = forumTab; hd.querySelector('img').src = IMG(ic); hd.querySelector('h2').textContent = tr(t); hd.querySelector('p').textContent = tr(sub); };
  openModal({ icon: 'chat', title: 'Чат', sub: 'Спільнота гравців', color: '#2a6fe0' }, () => {
    setHead();
    let h = tabs();
    if (forumTab === 'chat') h += `<div class="fchat">${chatItems.length ? chatItems.map(msg).join('') : '<div class="note small">Поки тихо — напиши першим!</div>'}</div>
      <div class="fsend">${emoBtn('f-in')}${ceIn('f-in', 300, tr('Повідомлення…'))}<button class="send-b" data-a="send" aria-label="${tr('Надіслати')}"><i></i></button></div>`;
    if (forumTab === 'forum' && !forumTopic) h += `<button class="btn blue wide" data-a="newt" style="margin-bottom:8px">+ ${tr('Нова тема')}</button>` +
      (topics.length ? topics.map(t => `<div class="ftopic" data-a="open" data-v="${t.id}">${+t.pinned ? '📌 ' : ''}<b>${esc(t.title)}</b><small>${nk(t.nick)} · ${t.posts} ${tr('повід.')} · ${ago(t.t)}</small></div>`).join('') : '<div class="note small">Тем ще немає.</div>');
    if (forumTab === 'forum' && forumTopic && topic) h += `<button class="btn gray" data-a="back" style="margin-bottom:8px">← ${tr('Усі теми')}</button><div class="ftitle">${esc(topic.topic.title)}</div><div class="fchat">${topic.posts.map(msg).join('')}</div>
      <div class="fsend">${emoBtn('f-in')}${ceIn('f-in', 2000, tr('Відповідь…'))}<button class="send-b" data-a="reply" aria-label="${tr('Надіслати')}"><i></i></button></div>`;
    if (forumTab === 'top') { h += `<div class="seg2">${[['players', 'Гравці'], ['corps', 'Корпорації']].map(([k, n]) => `<button class="${topKind === k ? 'on' : ''}" data-a="tk" data-v="${k}">${tr(n)}</button>`).join('')}</div>`;
      if (topKind === 'players') h += `<div class="seg3">${[['level', 'Рівень'], ['floors', 'Поверхи'], ['earned', 'Виручка']].map(([k, n]) => `<button class="${topBy === k ? 'on' : ''}" data-a="by" data-v="${k}">${n}</button>`).join('')}</div>
        <div class="ftop">${top.map((p, i) => `<div class="frow ${p.nick === NET.auth.player.nick ? 'me' : ''}" data-a="pl" data-v="${p.pid}"><b class="fpos">${placeIc(topPage * 10 + i + 1)}</b><span class="fav pl-av">${avHTML(p.avatar)}</span><span class="grow">${nk(p.nick)}${p.corp ? `<small class="onl-sub"><img src="${CSRC(p.cemblem)}" class="ib">${esc(p.corp)}</small>` : ''}</span><em>${topBy === 'level' ? '★ ' + p.level : topBy === 'floors' ? p.floors + ' пов.' : fmt(p.earned)}</em></div>`).join('')}</div>`;
      else h += `<div class="ctop">${ctop.map((c, i) => { const n = topPage * 10 + i + 1; return `<div class="ctr ${n <= 3 ? 'p' + n : ''} ${NET.corp && NET.corp.id === +c.id ? 'me' : ''}" data-a="cv" data-v="${c.id}">
          <b class="ctr-pos">${placeIc(n)}</b><span class="ctr-em"><img src="${CSRC(c.emblem)}" alt=""><i>${c.lvl}</i></span>
          <div class="grow"><div class="ctr-name">${nk(c.name)}</div>
            <div class="ctr-meta"><span><img src="${CSRC('ic_8')}" alt="">${c.members}/${c.cap}</span></div>
            <div class="cb-bar"><i style="width:${Math.min(100, c.xp / c.need * 100)}%"></i></div></div>
</div>`; }).join('') || `<div class="note small">${tr('Корпорацій ще немає — створи першу!')}</div>`}</div>`;
      h += pager(topPage, Math.ceil(topTotal / 10), 'top'); }
    if (forumTab === 'online') h += `<div class="seg2">${[['all', 'Всі гравці'], ['nocorp', 'Без корпорації']].map(([k, n]) => `<button class="${onF === k ? 'on' : ''}" data-a="of" data-v="${k}">${tr(n)}</button>`).join('')}</div>
      <div class="onl-head"><i></i>${tr(onF === 'all' ? 'Зараз у грі' : 'Онлайн без корпорації')}: <b>${onTotal}</b></div><div class="ftop">${online.map(p => `<div class="frow ${p.nick === NET.auth.player.nick ? 'me' : ''}" data-a="pl" data-v="${p.id}"><span class="fav pl-av">${avHTML(p.avatar)}<i class="ondot"></i></span><span class="grow">${nk(p.nick)}${+p.access ? ' <span class="rec">ADMIN</span>' : ''}<small class="onl-sub">${p.corp ? `<img src="${CSRC(p.cemblem)}" class="ib">${esc(p.corp)} · ` : ''}${p.floors} ${tr('пов.')} · ${ago(p.seen)} ${tr('тому')}</small></span><em>★ ${p.level}</em></div>`).join('') || `<div class="note small">${tr('Зараз нікого немає')}</div>`}</div>${pager(onPage, Math.ceil(onTotal / 10), 'on')}`;
    return h;
  }, {
    tab: v => { forumTab = v; forumTopic = null; document.querySelectorAll('.emo-pick').forEach(e => e.remove()); $('#m-body')._force = true; load(); },
    pl: v => openPlayer(+v, openForum),
    cv: v => openCorpView(+v, openForum),
    tk: v => { topKind = v; topPage = 0; load(); },
    of: v => { onF = v; onPage = 0; load(); },
    pg: v => { const [k, n] = v.split(':'); if (k === 'top') topPage = +n; if (k === 'on') onPage = +n; load(); },
    cdel: async v => { const r = await api('adm_chat_del', { id: +v }); if (!r.ok) return toast(netErr(r.error), 'chat', true); chatItems = chatItems.filter(m => +m.id !== +v); const el = document.querySelector(`[data-a="cdel"][data-v="${v}"]`); if (el) el.closest('.cm').remove(); toast(tr('Повідомлення видалено'), 'chat', true); },
    by: v => { topBy = v; topPage = 0; load(); },
    open: v => { forumTopic = +v; load(); },
    back: () => { forumTopic = null; load(); },
    send: async () => { const i = $('#f-in'); if (!i.value.trim()) return; const r = await api('chat_send', { text: i.value, reply: replyFor('chat') }); if (!r.ok) return toast(netErr(r.error), 'chat', true); i.value = ''; replyClear(); await load(); const b = $('#m-body'); b.scrollTop = b.scrollHeight; },
    reply: async () => { const i = $('#f-in'); const r = await api('forum_reply', { id: forumTopic, text: i.value }); if (!r.ok) return toast(netErr(r.error), 'chat', true); i.value = ''; load(); },
    newt: async () => {
      const title = prompt(tr('Назва теми')); if (!title) return; const text = prompt(tr('Перше повідомлення')); if (!text) return;
      const r = await api('forum_new', { title, text }); if (!r.ok) return toast(netErr(r.error), 'chat', true); forumTopic = r.id; load();
    },
  });
  $('#modal').classList.add('tall'); $('#m-head')._k = null;
  $('#m-body').onkeydown = e => { if (e.key === 'Enter' && e.target.id === 'f-in') { const b = $('[data-a="send"], [data-a="reply"]'); if (b) b.click(); } };
  load();
  clearInterval(chatTimer); chatTimer = setInterval(() => { if (!$('#modal-bg').classList.contains('show') || !$('.rtabs')) return; if (forumTab === 'chat' && $('#f-in')) load(); if (forumTab === 'online' && !document.hidden) load(); }, 6000);
}

// ===================================================================
//  Профілі гравців, друзі, чорний список, особисті повідомлення
// ===================================================================
Object.assign(NET_ERR, { blocked: 'Спілкування з цим гравцем заблоковано', self: 'Це твій власний профіль', not_found: 'Гравця не знайдено', friends_limit: 'Досягнуто ліміт друзів (200)' });
const needOnline = icon => { if (NET.auth && NET.online) return true; toast(netErr('offline'), icon || 'friends', true); return false; };
const seenTxt = p => p.online ? `<span class="pp-on">● ${tr('У мережі')}</span>` : `<span class="pp-off">${tr('Був(ла) в грі')} ${ago(p.seen)} ${tr('тому')}</span>`;
const plAv = (pid, av, online) => `<span class="fav pl-av" data-a="pl" data-v="${pid}">${avHTML(av)}${online ? '<i class="ondot"></i>' : ''}</span>`;

async function openPlayer(id, back) {
  if (NET.auth && (id === NET.auth.player.id || id === NET.auth.player.nick)) return openProfile();   // натиснув на себе — свій звичайний профіль
  if (!needOnline()) return;
  const r = await api('player', typeof id === 'string' ? { nick: id } : { id });
  if (!r.ok) return toast(netErr(r.error), 'friends', true);
  if (r.player.me) return openProfile();
  const p = r.player, data = r.data && r.data.floors ? r.data : null;
  if (!data) return toast(tr('Гравець ще не зберіг свою вежу'), 'friends', true);
  { const keep = S; S = data; try { fixSave(); } finally { S = keep; } }
  const again = () => openPlayer(p.id, back);
  const act = async (a, okMsg) => { const x = await api(a, { id: p.id }); if (!x.ok) return toast(netErr(x.error), 'friends', true); if (okMsg) toast(tr(okMsg), 'friends', true); again(); };
  openProfile({ p, data, actions: {
    dm: () => openDM(p.id, again),
    gift: () => openGiftShop(p, again),
    cinv: async () => { const r = await api('corp_invite', { id: p.id }); if (!r.ok) return toast(netErr(r.error), 'bz_office', true); toast(`${tr('Запрошення надіслано')}: ${p.nick}`, 'bz_office', true); sfx('ding'); again(); },
    corpv: v => openCorpView(+v, again),
    gifts: () => openGifts(p.id, p.nick, again),
    asanc: v => admSanction(v, { id: p.id, nick: p.nick }, again),
    aopen: () => { closeModal(); openAdmin('players'); setTimeout(() => admGo('players', p.id), 50); },
    fr: () => act('friend_add', 'Додано в друзі'),
    unfr: () => act('friend_del', 'Видалено з друзів'),
    unbl: () => act('unblock', 'Гравця розблоковано'),
    bl: () => confirmBox({ icon: 'friends', title: tr('Заблокувати гравця?'), text: tr('Гравець не зможе писати тобі, його повідомлення зникнуть із чату, а дружбу буде скасовано.'), yes: tr('Заблокувати'), back: again },
      async () => { const x = await api('block', { id: p.id }); if (!x.ok) return toast(netErr(x.error), 'friends', true); toast(tr('Гравця заблоковано'), 'friends', true); again(); }),
  } }, back);
}

let msgTab = 'dialogs', msgTimer = null;
async function openMessages(tab, back) {
  if (!needOnline('mail2')) return;
  msgTab = tab || msgTab;
  let threads = [], friends = [], blocked = [], loaded = false;
  const self = () => openMessages(msgTab, back);
  const load = async () => {
    if (msgTab === 'dialogs') { const r = await api('dm_threads'); if (r.ok) threads = r.items; }
    else { const r = await api('friends'); if (r.ok) { friends = r.friends; blocked = r.blocked; } }
    loaded = true; if (modalRefresh) { $('#m-body')._h = null; modalRefresh(); }
  };
  setTimeout(() => { modalBack = back || null; });
  openModal({ icon: 'mail2', title: 'Повідомлення', sub: 'Особисте листування з гравцями', color: '#7a4fe0' }, () => {
    let h = `<div class="rtabs">${[['dialogs', 'Діалоги', 'mail2'], ['friends', 'Друзі', 'friends'], ['blocked', 'Заблоковані', 'mz_blocked']].map(([k, n, i]) => `<button class="rtab ${msgTab === k ? 'on' : ''}" data-a="tab" data-v="${k}"><img src="${IMG(i)}" alt="">${tr(n)}</button>`).join('')}</div>`;
    if (!loaded) return h + `<div class="note small">${tr('Завантаження…')}</div>`;
    if (msgTab === 'dialogs') h += threads.length ? threads.map(t => `<div class="dmrow ${+t.unread ? 'new' : ''}" data-a="open" data-v="${t.peer}">${plAv(t.peer, t.avatar, t.online)}
        <div class="grow"><div class="dmn">${nk(t.nick)} <small>${ago(t.t)}</small></div><div class="dmt">${t.mine ? tr('Ти') + ': ' : ''}${emoTxt(t.body)}</div></div>${+t.unread ? `<b class="dmc">${t.unread}</b>` : ''}</div>`).join('')
      : `<div class="note">${tr('Діалогів ще немає. Відкрий профіль гравця в чаті чи рейтингу й натисни «Написати».')}</div>`;
    if (msgTab === 'friends') h += friends.length ? friends.map(f => `<div class="dmrow" data-a="pl" data-v="${f.id}">${plAv(f.id, f.avatar, f.online)}
        <div class="grow"><div class="dmn">${nk(f.nick)}</div><div class="dmt">★ ${f.level} · ${f.online ? tr('У мережі') : ago(f.seen) + ' ' + tr('тому')}</div></div><button class="btn green" data-a="open" data-v="${f.id}"><img src="${IMG('mail2')}" alt=""></button></div>`).join('')
      : `<div class="note">${tr('Друзів поки немає. Додай гравців у друзі з їхнього профілю.')}</div>`;
    if (msgTab === 'blocked') h += blocked.length ? blocked.map(f => `<div class="dmrow">${plAv(f.id, f.avatar)}<div class="grow"><div class="dmn">${nk(f.nick)}</div></div><button class="btn gold" data-a="unbl" data-v="${f.id}">${tr('Розблокувати')}</button></div>`).join('')
      : `<div class="note">${tr('Чорний список порожній.')}</div>`;
    return h;
  }, {
    tab: v => { msgTab = v; loaded = false; modalRefresh(); load(); },
    open: v => openDM(+v, self),
    pl: v => openPlayer(+v, self),
    unbl: async v => { const x = await api('unblock', { id: +v }); if (!x.ok) return toast(netErr(x.error), 'friends', true); toast(tr('Гравця розблоковано'), 'friends', true); load(); },
  });
  load();
  clearInterval(msgTimer); msgTimer = setInterval(() => { if (!$('#modal-bg').classList.contains('show') || !$('.dmrow, .rtabs') || $('#dm-list')) return clearInterval(msgTimer); if (msgTab === 'dialogs') load(); }, 10000);
}

let dmTimer = null;
async function openDM(peerId, back) {
  if (!needOnline('mail2')) return;
  if (REPLY && REPLY.ch === 'dm' && REPLY.peer !== peerId) REPLY = null; if (REPLY) REPLY.peer = peerId;
  let items = [], peer = null, blocked = false;
  const msgHTML = () => items.length ? items.map(m => { const fresh = seenMsg.has('readyd' + peerId) && !seenMsg.has('d' + m.id); seenMsg.add('d' + m.id); const myN = NET.auth.player.nick, pn = peer ? peer.nick : ''; return `<div class="fmsg ${m.mine ? 'mine' : ''} ${fresh ? 'cm-new' : ''}" ${rAttr('dm', m.id, m.mine ? myN : pn, m.body)}><div class="fb">${rQuote('dm', m.rid, m.rmine ? myN : pn, m.rbody)}<div class="ft">${mtHTML(m.body, { mine: m.mine })}</div><div class="fn"><small>${ago(m.t)}${m.mine ? (m.seen ? ' ✓✓' : ' ✓') : ''}</small></div></div></div>`; }).join('')
    : `<div class="note small">${tr('Напиши перше повідомлення!')}</div>`;
  const load = async (first) => {
    const r = await api('dm_get', { id: peerId });
    if (!r.ok) { if (first) toast(netErr(r.error), 'mail2', true); return; }
    const changed = JSON.stringify(r.items) !== JSON.stringify(items);
    items = r.items; peer = r.peer; blocked = r.blocked;
    const list = $('#dm-list');
    if (first || !list) { $('#m-body')._h = null; modalRefresh && modalRefresh(); }
    else if (changed) { const b = $('#m-body'), near = b.scrollHeight - b.scrollTop - b.clientHeight < 80; list.innerHTML = msgHTML(); replyBar(); if (near) b.scrollTop = b.scrollHeight; }
    if (first || changed) { const b = $('#m-body'); if (first) b.scrollTop = b.scrollHeight; }
    seenMsg.add('readyd' + peerId);
    netBeat();
  };
  const self = () => openDM(peerId, back);
  setTimeout(() => { modalBack = back || (() => openMessages('dialogs')); });
  openModal({ icon: 'mail2', title: 'Листування', sub: 'Особисті повідомлення', color: '#7a4fe0' }, () => {
    if (!peer) return `<div class="note small">${tr('Завантаження…')}</div>`;
    return `<div class="dmhead" data-a="pl" data-v="${peer.id}">${plAv(peer.id, peer.avatar, peer.online)}<div class="grow"><b>${nk(peer.nick)}</b><small>${peer.online ? tr('У мережі') : tr('Не в мережі')}</small></div><span class="dmprof">${tr('Профіль')} ›</span></div>
      <div class="fchat" id="dm-list">${msgHTML()}</div>
      ${blocked ? `<div class="note small">${tr('Спілкування з цим гравцем заблоковано.')}</div>` : `<div class="fsend">${emoBtn('dm-in')}${ceIn('dm-in', 1000, tr('Повідомлення…'))}<button class="send-b" data-a="send" aria-label="${tr('Надіслати')}"><i></i></button></div>`}`;
  }, {
    pl: v => openPlayer(+v, self),
    send: async () => {
      const i = $('#dm-in'); if (!i || !i.value.trim()) return;
      const text = i.value; i.value = '';
      const r = await api('dm_send', { id: peerId, text, reply: replyFor('dm') }); if (!r.ok) { i.value = text; return toast(netErr(r.error), 'mail2', true); }
      replyClear();
      sfx('click'); load(); i.focus();
    },
  });
  $('#modal').classList.add('tall');
  $('#m-body').onkeydown = e => { if (e.key === 'Enter' && e.target.id === 'dm-in') { e.preventDefault(); const b = $('[data-a="send"]'); if (b) b.click(); } };
  load(true);
  clearInterval(dmTimer); dmTimer = setInterval(() => { if (!$('#modal-bg').classList.contains('show') || !$('#dm-list')) return clearInterval(dmTimer); if (!document.hidden) load(); }, 4000);
}

// значок непрочитаних особистих повідомлень
function netDmBadge(n) {
  const prev = NET.dmUnread || 0; NET.dmUnread = n;
  if (n !== prev) render();
  if (n > prev && !$('#dm-list') && typeof toast === 'function') toast(tr('Нове особисте повідомлення'), 'mail2', true);
}

// ---------- клавіатура на телефоні: поле вводу завжди над клавіатурою ----------
(function kbFix() {
  const vv = window.visualViewport; if (!vv) return;
  const root = document.documentElement;
  const upd = () => {
    const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    root.style.setProperty('--kb', kb + 'px'); root.style.setProperty('--vvh', Math.round(vv.height) + 'px');
    document.body.classList.toggle('kb-open', kb > 80 || (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName) && vv.height < window.screen.height * .7));
  };
  vv.addEventListener('resize', upd); vv.addEventListener('scroll', upd);
  // поле вводу підкручуємо лише всередині вікна (не всю сторінку — інакше вікна потім відкриваються зі зсувом)
  const fixPage = () => { const app = document.getElementById('app'); if (app && app.scrollTop) app.scrollTop = 0; if (app && app.scrollLeft) app.scrollLeft = 0; if (!document.body.classList.contains('kb-open') && (window.scrollY || document.documentElement.scrollTop)) window.scrollTo(0, 0); };
  document.addEventListener('focusin', e => { const t = e.target; if (!(/INPUT|TEXTAREA/.test(t.tagName) || t.isContentEditable) || t.type === 'range') return;
    setTimeout(() => { upd(); const box = t.closest('#m-body, .adm-main'); if (box) { const r = t.getBoundingClientRect(), br = box.getBoundingClientRect(); if (r.bottom > br.bottom - 10 || r.top < br.top) box.scrollTop += r.top - br.top - box.clientHeight / 2 + r.height / 2; } fixPage(); }, 300); });
  document.addEventListener('focusout', () => setTimeout(() => { upd(); fixPage(); }, 120));
  window.addEventListener('scroll', () => { if (!document.body.classList.contains('kb-open')) fixPage(); }, { passive: true });
  window.fixPage = fixPage;
})();

// ---------- пуш-сповіщення (лише в Android-застосунку: він дає токен Firebase через window.HmApp) ----------
const PUSH_GROUPS = [['msg', 'Повідомлення та подарунки', 'mail2'], ['chat', 'Загальний чат', 'chat'], ['promo', 'Акції, новини та роздачі', 'fireworks'], ['tour', 'Турніри', 'ach_cup'], ['tower', 'Нагадування про вежу', 'crane']];
const hasApp = () => !!(window.HmApp && typeof HmApp.getPushToken === 'function');
const pushCfg = () => (S.settings.push = S.settings.push || { all: true, off: [] });
const pushOff = () => { const p = pushCfg(); return p.all === false ? ['all'] : (p.off || []); };
let pushSig = '';
function pushSync(force) {
  if (!hasApp() || !NET.auth || !NET.online) return;
  let tok = ''; try { tok = HmApp.getPushToken() || ''; } catch (e) {}
  if (!tok) return;
  const d = { token: tok, lang: S.settings.lang || 'uk', tz: -new Date().getTimezoneOffset(), off: pushOff() };
  const sig = NET.auth.player.id + '|' + JSON.stringify(d);
  if (!force && sig === pushSig) return;
  pushSig = sig; api('push_reg', d).then(r => { if (!r.ok) pushSig = ''; });
}
function pushUnreg() { if (!hasApp()) return; try { const t = HmApp.getPushToken(); if (t) api('push_unreg', { token: t }); } catch (e) {} pushSig = ''; }
const pushAllowed = () => { try { return !hasApp() || typeof HmApp.notificationsAllowed !== 'function' || HmApp.notificationsAllowed(); } catch (e) { return true; } };
// застосунок викликає, коли отримав/оновив токен
window.hmPushToken = () => pushSync(true);
// натиснули на сповіщення — відкриваємо потрібне місце гри
let pushOpenQ = null;
window.hmOpen = target => { pushOpenQ = String(target || ''); pushOpenNow(); };
function pushOpenNow() {
  const t = pushOpenQ; if (!t) return;
  if (!NET.auth || document.getElementById('loader') || typeof openMail !== 'function') { setTimeout(pushOpenNow, 700); return; }
  pushOpenQ = null;
  if (S.tut && !S.tut.done) return; // під час навчання нікуди не перемикаємо
  try {
    if (t.startsWith('dm:')) openDM(+t.slice(3));
    else if (t === 'mail') openMail();
    else if (t === 'gifts') openGifts(NET.auth.player.id, NET.auth.player.nick);
    else if (t === 'news' || t === 'promo') openNews();
    else if (t === 'corp') openCorp('mem');
    else if (t === 'cchat') openCorp('chat');
    else if (t === 'chat') { forumTab = 'chat'; forumTopic = null; openForum(); }
    else if (t === 'tour') openTour('p');
  } catch (e) {}
}

// ---------- відповідь на повідомлення: потягни повідомлення вправо (як у месенджерах) ----------
const RSRC = {}; let REPLY = null;
// запам'ятовуємо, що показувати в цитаті; повертає атрибути для елемента повідомлення
const rAttr = (ch, id, nick, body) => { RSRC[ch + id] = { nick, body: String(body || '') }; return `data-rch="${ch}" data-rid="${id}"`; };
function rQuote(ch, rid, rnick, rbody) {
  if (!rid) return '';
  if (rbody == null) return `<div class="rq gone"><span>${tr('Повідомлення видалено')}</span></div>`;
  return `<div class="rq" data-jump="${ch}:${rid}"><b>${rnick ? nk(rnick) : tr('Система')}</b><span class="notr">${emoTxt(String(rbody).replace(/\s+/g, ' '))}</span></div>`;
}
function replySet(ch, id) {
  const s = RSRC[ch + id]; if (!s) return;
  REPLY = { ch, id: +id, nick: s.nick, body: s.body }; replyBar();
  const inp = document.querySelector('#m-body .ce-in'); if (inp) { inp.focus(); if (typeof ceEnd === 'function') ceEnd(inp); }
  vibrate(12);
}
function replyClear() { REPLY = null; replyBar(); }
const replyFor = ch => (REPLY && REPLY.ch === ch ? REPLY.id : 0);
function replyBar() {
  const fs = document.querySelector('#m-body .fsend'); if (!fs) return;
  let b = fs.previousElementSibling && fs.previousElementSibling.classList.contains('rbar') ? fs.previousElementSibling : null;
  const ch = fs.closest('#m-body').querySelector('[data-rch]'); const curCh = ch ? ch.dataset.rch : (REPLY && REPLY.ch);
  if (!REPLY || REPLY.ch !== curCh) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('div'); b.className = 'rbar'; fs.parentNode.insertBefore(b, fs); }
  b.innerHTML = `<i class="rbar-ic">↩</i><div class="grow"><b>${tr('Відповідь')} ${REPLY.nick ? nk(REPLY.nick) : ''}</b><span class="notr">${emoTxt(REPLY.body.replace(/\s+/g, ' ').slice(0, 120))}</span></div><button type="button" class="rbar-x" aria-label="${tr('Скасувати')}">✕</button>`;
}
document.addEventListener('click', e => {
  if (e.target.closest && e.target.closest('.rbar-x')) { e.preventDefault(); e.stopPropagation(); replyClear(); return; }
  const q = e.target.closest && e.target.closest('.rq[data-jump]'); if (!q) return;
  e.stopPropagation(); const [ch, id] = q.dataset.jump.split(':');
  const el = document.querySelector(`#m-body [data-rch="${ch}"][data-rid="${id}"]`); if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.remove('rflash'); void el.offsetWidth; el.classList.add('rflash');
}, true);
// жест: тягнемо вправо — з'являється стрілка, відпустили після порогу — відповідаємо
(() => {
  let g = null; const TH = 58;
  const end = ok => { if (!g) return; const { el, dx } = g; el.classList.add('rback'); el.style.transform = ''; el.style.removeProperty('--rp'); setTimeout(() => el.classList.remove('rback', 'rdrag'), 220);
    if (ok && dx >= TH) replySet(el.dataset.rch, el.dataset.rid); g = null; };
  document.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    const el = e.target.closest && e.target.closest('#m-body [data-rid]'); if (!el || e.target.closest('button, a, .pl-n, .pl-av, .mt-ic, .rq, input, .ce-in')) return;
    g = { el, x: e.clientX, y: e.clientY, dx: 0, on: false, id: e.pointerId };
  }, { passive: true });
  document.addEventListener('pointermove', e => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.on) { if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { g = null; return; } if (dx > 10 && dx > Math.abs(dy) * 1.2) { g.on = true; g.el.classList.add('rdrag'); } else return; }
    g.dx = Math.max(0, Math.min(90, dx * 0.7));
    g.el.style.transform = `translateX(${g.dx}px)`; g.el.style.setProperty('--rp', Math.min(1, g.dx / TH).toFixed(2));
    if (g.dx >= TH && !g.buzz) { g.buzz = 1; vibrate(8); }
  }, { passive: true });
  document.addEventListener('pointerup', e => { if (g && e.pointerId === g.id) end(g.on); }, { passive: true });
  document.addEventListener('pointercancel', () => end(false), { passive: true });
})();
