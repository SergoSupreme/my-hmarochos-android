// ===================================================================
//  Адмін-панель «Мій Хмарочос» — відкривається кнопкою з короною біля пошти.
//  Доступна лише акаунтам з access = 1 (перевірка також на сервері для кожної дії).
// ===================================================================
const ADM = { tab: 'home', view: null, cache: {} };
const isAdmin = () => !!(typeof NET !== 'undefined' && NET.auth && NET.auth.player && +NET.auth.player.access === 1);
const ADM_ERR = { forbidden: 'Немає прав адміністратора', no_save: 'Гравець ще не має збереженої гри', self: 'Не можна застосувати до себе', self_access: 'Не можна зняти права з себе',
  no_rewards: 'Додай хоча б один подарунок', bad_dates: 'Кінець акції має бути пізніше початку', nick_taken: 'Нікнейм зайнятий', password_short: 'Пароль — щонайменше 6 символів', empty: 'Заповни назву', need_reason: 'Вкажи причину', bad_term: 'Невірний термін', no_cats: 'Обери хоча б одну категорію' };
const admErr = e => ADM_ERR[e] || (typeof netErr === 'function' ? netErr(e) : e);
const aFmt = n => fmt(+n || 0);
const aAgo = t => { const s = Math.max(0, Date.now() / 1000 - t); return s < 60 ? 'щойно' : s < 3600 ? Math.floor(s / 60) + ' хв тому' : s < 86400 ? Math.floor(s / 3600) + ' год тому' : Math.floor(s / 86400) + ' дн тому'; };
const aDate = t => new Date(t * 1000).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' });
const aDT = t => new Date(t * 1000).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const REW_KINDS = [['bucks', 'Банкноти', () => BUCK], ['coins', 'Монети', () => 'coins_heap'], ['keys', 'Ключі', () => 'keys'], ['xp', 'Досвід', () => 'star3'], ['chest', 'Скриня', () => 'chest_purple']];
const CHEST_IDS = [['wood', 'Дерев’яна'], ['blue', 'Синя'], ['purple', 'Фіолетова'], ['red', 'Легендарна']];
const PROMO_ICONS = ['gift_red', 'giftbox', 'fireworks', 'crown', 'ach_laurel', 'coins_heap', 'cash_big', 'star3', 'keys', 'chest_purple', 'megaphone2', 'vip2'];
const PROMO_COLORS = ['#7a4fe0', '#e0303c', '#2a6fe0', '#1f9a37', '#d4900a', '#d0348c', '#0e9aa7'];

function admUpdButton() { const b = document.getElementById('ti-adm'); if (b) b.hidden = !isAdmin(); }
setInterval(admUpdButton, 2000);

async function aApi(action, data) { const r = await api(action, data, { timeout: 15000 }); if (!r.ok) admToast(admErr(r.error), true); return r; }
function admToast(msg, bad) {
  const t = document.createElement('div'); t.className = 'adm-toast' + (bad ? ' bad' : ''); t.textContent = msg;
  (document.getElementById('adm') || document.body).appendChild(t); setTimeout(() => t.classList.add('out'), 2200); setTimeout(() => t.remove(), 2600);
}
function admConfirm({ title, text, yes = 'Так', danger = true }, onYes) {
  const o = document.createElement('div'); o.className = 'adm-dlg';
  o.innerHTML = `<div class="adm-dlg-card"><b>${title}</b><p>${text || ''}</p><div class="adm-dlg-btns"><button class="adm-b ghost" data-x>Скасувати</button><button class="adm-b ${danger ? 'danger' : 'gold'}" data-y>${yes}</button></div></div>`;
  document.getElementById('adm').appendChild(o);
  o.querySelector('[data-x]').onclick = () => o.remove();
  o.querySelector('[data-y]').onclick = () => { o.remove(); onYes(); };
}

// ---------- графіки (SVG, з підказкою при наведенні/дотику) ----------
function aLine(id, pts, { color = '#3fd3ff', label = '', money = false } = {}) {
  if (!pts.length) return `<div class="adm-chart empty">Даних поки немає</div>`;
  const W = 320, H = 120, P = { l: 6, r: 6, t: 10, b: 18 };
  const max = Math.max(1, ...pts.map(p => p.v)), n = pts.length;
  const X = i => P.l + (n === 1 ? (W - P.l - P.r) / 2 : i * (W - P.l - P.r) / (n - 1)), Y = v => P.t + (1 - v / max) * (H - P.t - P.b);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join('');
  const area = `${path}L${X(n - 1).toFixed(1)},${H - P.b}L${X(0).toFixed(1)},${H - P.b}Z`;
  const grid = [0.25, 0.5, 0.75].map(f => `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(max * f)}" y2="${Y(max * f)}" class="g"/>`).join('');
  const ticks = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i).map(i => `<text x="${X(i)}" y="${H - 4}" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${esc(pts[i].x)}</text>`).join('');
  const last = pts[n - 1];
  ADM.cache['ch_' + id] = { pts, X, Y, W, H, P, money, label };
  return `<div class="adm-chart" data-chart="${id}" style="--c:${color}"><div class="adm-ch-head"><span>${label}</span><b>${money ? aFmt(last.v) : (+last.v).toLocaleString('uk-UA')}</b></div>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="ag_${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    ${grid}<path d="${area}" fill="url(#ag_${id})"/><path d="${path}" class="ln" stroke="${color}"/>
    <circle cx="${X(n - 1)}" cy="${Y(last.v)}" r="4" fill="${color}" class="lastdot"/>${ticks}
    <line class="hx" y1="${P.t}" y2="${H - P.b}" x1="-10" x2="-10"/><circle class="hd" r="4.5" cx="-10" cy="-10" fill="${color}"/></svg><div class="adm-tip"></div></div>`;
}
function aBars(id, pts, { color = '#b07cff', label = '' } = {}) {
  const W = 320, H = 120, P = { l: 6, r: 6, t: 10, b: 18 }, n = pts.length, max = Math.max(1, ...pts.map(p => p.v));
  const bw = (W - P.l - P.r) / n, gap = Math.min(2, bw * .2);
  const X = i => P.l + i * bw + bw / 2, Y = v => P.t + (1 - v / max) * (H - P.t - P.b);
  ADM.cache['ch_' + id] = { pts, X, Y, W, H, P, label, bars: true };
  const bars = pts.map((p, i) => { const h = Math.max(p.v ? 2 : 0, H - P.b - Y(p.v)); return `<rect x="${(P.l + i * bw + gap / 2).toFixed(1)}" y="${(H - P.b - h).toFixed(1)}" width="${(bw - gap).toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(3, (bw - gap) / 2)}" fill="${color}"/>`; }).join('');
  const ticks = [0, n - 1].map(i => `<text x="${X(i)}" y="${H - 4}" text-anchor="${i ? 'end' : 'start'}">${esc(pts[i].x)}</text>`).join('');
  const sum = pts.reduce((a, p) => a + p.v, 0);
  return `<div class="adm-chart" data-chart="${id}" style="--c:${color}"><div class="adm-ch-head"><span>${label}</span><b>${sum.toLocaleString('uk-UA')}</b></div>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${[0.5].map(f => `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(max * f)}" y2="${Y(max * f)}" class="g"/>`).join('')}${bars}${ticks}<line class="hx" y1="${P.t}" y2="${H - P.b}" x1="-10" x2="-10"/></svg><div class="adm-tip"></div></div>`;
}
function aHBars(rows, color) {
  const max = Math.max(1, ...rows.map(r => r.v)), tot = rows.reduce((a, r) => a + r.v, 0) || 1;
  return `<div class="adm-hbars">${rows.map(r => `<div class="hb"><span>${esc(r.x)}</span><i><em style="width:${(r.v / max * 100).toFixed(1)}%;background:${color}"></em></i><b>${r.v}</b><small>${Math.round(r.v / tot * 100)}%</small></div>`).join('')}</div>`;
}
function admChartsWire(root) {
  root.querySelectorAll('[data-chart]').forEach(el => {
    const c = ADM.cache['ch_' + el.dataset.chart]; if (!c) return;
    const svg = el.querySelector('svg'), tip = el.querySelector('.adm-tip'), hx = svg.querySelector('.hx'), hd = svg.querySelector('.hd');
    const move = e => {
      const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * c.W;
      let i = 0, best = 1e9; c.pts.forEach((p, k) => { const d = Math.abs(c.X(k) - x); if (d < best) { best = d; i = k; } });
      const p = c.pts[i]; hx.setAttribute('x1', c.X(i)); hx.setAttribute('x2', c.X(i));
      if (hd) { hd.setAttribute('cx', c.X(i)); hd.setAttribute('cy', c.Y(p.v)); }
      tip.innerHTML = `<small>${esc(p.x)}</small><b>${c.money ? aFmt(p.v) : (+p.v).toLocaleString('uk-UA')}</b>`; tip.style.left = Math.min(Math.max(c.X(i) / c.W * 100, 14), 86) + '%'; tip.classList.add('on');
    };
    svg.onpointermove = move; svg.onpointerdown = move;
    svg.onpointerleave = () => { tip.classList.remove('on'); hx.setAttribute('x1', -10); hx.setAttribute('x2', -10); if (hd) hd.setAttribute('cx', -10); };
  });
}
const dLabel = d => { const [y, m, dd] = d.split('-'); return `${dd}.${m}`; };

// ---------- каркас ----------
const ADM_TABS = [['home', 'Огляд', 'chart'], ['online', 'Онлайн', 'phone'], ['players', 'Гравці', 'friends'], ['don', 'Донат', 'don_3'], ['gifts', 'Подарунки', 'giftbox'], ['give', 'Роздачі', 'gift_red'], ['promos', 'Акції', 'fireworks'], ['news', 'Новини', 'megaphone2'], ['chat', 'Чат', 'chat'], ['server', 'Сервер', 'gear'], ['log', 'Журнал', 'clipboard']];
function openAdmin(tab) {
  if (!isAdmin()) return toast('Немає доступу', 'lock', true);
  if (!NET.online) return toast(netErr('offline'), 'lock', true);
  let o = document.getElementById('adm');
  if (!o) {
    o = document.createElement('div'); o.id = 'adm';
    o.innerHTML = `<div class="adm-bg"></div><header class="adm-top"><img src="${IMG('crown')}" alt=""><div class="grow"><b>Адмін-панель</b><small>${esc(NET.auth.player.nick)} · ${esc(GAME_TITLE)}</small></div><button class="adm-x" data-close aria-label="Закрити">✕</button></header>
      <nav class="adm-nav">${ADM_TABS.map(([k, n, i]) => `<button data-tab="${k}"><img src="${IMG(i)}" alt="">${n}</button>`).join('')}</nav><main class="adm-main" id="adm-main"></main>`;
    document.getElementById('app').appendChild(o);
    o.addEventListener('click', admClick);
    o.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('#ap-q')) { ADM.q = e.target.value; ADM.page = 0; admRender(); } });
  }
  o.classList.add('show'); sfx('click');
  admGo(tab || ADM.tab);
}
function admClose() { const o = document.getElementById('adm'); if (o) o.classList.remove('show'); }
function admGo(tab, view = null) { ADM.tab = tab; ADM.view = view; document.querySelectorAll('#adm .adm-nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab)); admRender(); }
async function admRender() {
  const main = document.getElementById('adm-main'); if (!main) return;
  const tab = ADM.tab, view = ADM.view, token = (ADM.tok = (ADM.tok || 0) + 1);
  main.innerHTML = `<div class="adm-load"><i></i><i></i><i></i></div>`;
  let html = '';
  try {
    if (tab === 'home') html = await admHome();
    if (tab === 'players') html = view ? await admPlayer(view) : await admPlayers();
    if (tab === 'give') html = await admGive();
    if (tab === 'promos') html = await admPromos(view);
    if (tab === 'news') html = await admNews(view);
    if (tab === 'chat') html = await admChat();
    if (tab === 'log') html = await admLog();
    if (tab === 'online') html = await admOnline();
    if (tab === 'gifts') html = await admGifts();
    if (tab === 'don') html = await admDons();
    if (tab === 'server') html = await admServer();
  } catch (e) { html = `<div class="adm-empty">Помилка: ${esc(e.message)}</div>`; }
  if (token !== ADM.tok) return;
  main.innerHTML = html; main.scrollTop = 0; admChartsWire(main);
}

// ---------- Огляд ----------
async function admHome() {
  const r = await aApi('adm_overview'); if (!r.ok) return '<div class="adm-empty">Не вдалося завантажити</div>';
  const k = r.kpi;
  const tiles = [['friends', 'Гравців', (+k.players).toLocaleString('uk-UA'), `+${k.new24} за добу`], ['phone', 'Онлайн зараз', k.online, `${k.dau} за добу`],
    [BUCK, 'Банкнот у гравців', aFmt(k.bucks), 'усього в економіці'], ['coins_heap', 'Монет у гравців', aFmt(k.coins), 'усього в економіці'],
    ['star3', 'Середній рівень', (+k.avglvl).toFixed(1), 'серед усіх'], ['chat', 'Повідомлень', (+k.chat24 + +k.dm24), 'чат + особисті за добу'],
    ['lock', 'Заблоковано', k.banned, `${k.muted} з баном чату/ЛС`], ['fireworks', 'Активні акції', k.promos, 'зараз']];
  return `<section class="adm-kpis">${tiles.map(([i, n, v, s]) => `<div class="kpi"><img src="${IMG(i)}" alt=""><span>${n}</span><b>${v}</b><small>${s}</small></div>`).join('')}</section>
    <section class="adm-grid2">
      ${aBars('reg', r.reg.map(p => ({ x: dLabel(p.d), v: p.v })), { color: '#b07cff', label: 'Нові гравці · 30 днів' })}
      ${aLine('act', r.active.map(p => ({ x: dLabel(p.d), v: p.v })), { color: '#3fd3ff', label: 'Активні гравці по днях' })}
      ${aLine('ecb', r.eco.map(p => ({ x: dLabel(p.d), v: p.bucks })), { color: '#4fe07a', label: 'Банкноти в економіці', money: true })}
      ${aLine('ecc', r.eco.map(p => ({ x: dLabel(p.d), v: p.coins })), { color: '#ffc531', label: 'Монети в економіці', money: true })}
    </section>
    <section class="adm-card"><h3>Розподіл гравців за рівнями</h3>${aHBars(r.levels.map(l => ({ x: 'Рівень ' + l.b, v: l.n })), 'linear-gradient(90deg,#3fd3ff,#2a6fe0)')}</section>
    <section class="adm-card"><h3>Найбагатші гравці</h3>${r.top.map((p, i) => `<div class="adm-row" data-player="${p.id}"><b class="pos">${i + 1}</b><span class="av-s">${avHTML(p.avatar)}</span><div class="grow"><b>${esc(p.nick)}</b><small>★ ${p.level}</small></div><span class="money b"><img src="${IMG(BUCK)}">${aFmt(p.bucks)}</span><span class="money c"><img src="${IMG('coins_heap')}">${aFmt(p.coins)}</span></div>`).join('') || '<div class="adm-empty">Ще нікого</div>'}</section>`;
}

// ---------- Гравці ----------
ADM.q = ''; ADM.page = 0; ADM.sort = 'seen'; ADM.f = 'all';
async function admPlayers() {
  const r = await aApi('adm_players', { q: ADM.q, page: ADM.page, sort: ADM.sort, f: ADM.f }); if (!r.ok) return '';
  const pages = Math.max(1, Math.ceil(r.total / r.per)), now = Date.now() / 1000;
  return `<div class="adm-search"><input id="ap-q" placeholder="Пошук за ніком або ID…" value="${esc(ADM.q)}" enterkeyhint="search"><button class="adm-b gold" data-act="search">Знайти</button></div>
    <div class="adm-chips">${[['all', 'Усі'], ['online', 'Онлайн'], ['admins', 'Адміни'], ['banned', 'Блок'], ['muted', 'Бан чат/ЛС']].map(([k, n]) => `<button class="${ADM.f === k ? 'on' : ''}" data-f="${k}">${n}</button>`).join('')}
</div><div class="adm-sortrow">${aPick('sort', ADM.sort)}</div>
    <div class="adm-count">Знайдено: <b>${r.total}</b></div>
    <section class="adm-list">${r.items.map(p => `<div class="adm-row" data-player="${p.id}"><span class="av-s">${avHTML(p.avatar)}${p.seen > now - 600 ? '<i class="on"></i>' : ''}</span>
      <div class="grow"><b>${esc(p.nick)} <small class="id">#${p.id}</small>${+p.access ? '<em class="tag adm">ADMIN</em>' : ''}${+p.banned ? '<em class="tag ban">БЛОК</em>' : ''}${+p.chatban ? '<em class="tag mute">ЧАТ</em>' : ''}${+p.dmban ? '<em class="tag mute">ЛС</em>' : ''}</b>
      <small>★ ${p.level} · ${p.floors} пов. · ${p.seen > now - 600 ? '<span class="onl">онлайн</span>' : aAgo(p.seen)}</small></div>
      <div class="money-col"><span class="money b"><img src="${IMG(BUCK)}">${aFmt(p.bucks)}</span><span class="money c"><img src="${IMG('coins_heap')}">${aFmt(p.coins)}</span></div></div>`).join('') || '<div class="adm-empty">Нікого не знайдено</div>'}</section>
    ${aPager(ADM.page, pages, 'players')}`;
}
const SANC = { block: ['Блокування акаунта', 'lock', 'Гравець не зможе увійти в гру'], chat: ['Бан у чаті', 'chat', 'Не зможе писати в загальний чат і на форум'], dm: ['Бан в особистих', 'mail2', 'Не зможе писати особисті повідомлення'] };
const TERMS = [[1, '1 год'], [6, '6 год'], [12, '12 год'], [24, '24 год'], [72, '3 дні'], [168, '7 днів'], [720, '30 днів'], [0, 'Назавжди']];
const untilTxt = u => !u ? 'назавжди' : u > 253000000000 ? 'назавжди' : 'до ' + aDT(u);
async function admPlayer(id) {
  const r = await aApi('adm_player', { id }); if (!r.ok) return '<div class="adm-empty">Гравця не знайдено</div>';
  const p = r.player, s = r.save, on = p.seen > Date.now() / 1000 - 600, me = p.id === NET.auth.player.id;
  ADM.cache.player = r;
  const bal = r.balance;
  const st = { block: p.banned ? { until: p.ban_until, reason: p.ban_reason } : null, chat: p.chat_until ? { until: p.chat_until, reason: p.chat_reason } : null, dm: p.dm_until ? { until: p.dm_until, reason: p.dm_reason } : null };
  const fld = (k, n, v, img) => `<label class="adm-num"><span><img src="${IMG(img)}" alt="">${n}</span><div><button data-step="${k}" data-d="-1">−</button><input type="number" min="0" id="pf-${k}" value="${v}" inputmode="numeric"><button data-step="${k}" data-d="1">+</button></div></label>`;
  return `<button class="adm-back" data-back>‹ Усі гравці</button>
    <section class="adm-hero"><span class="av-l">${avHTML(p.avatar)}${on ? '<i class="on"></i>' : ''}</span><div class="grow"><b>${esc(p.nick)}</b><small>ID #${p.id} · ${on ? '<span class="onl">онлайн</span>' : 'був(ла) ' + aAgo(p.seen)}</small>
      <small>Реєстрація ${aDate(p.created)} · сесій: ${p.sessions} · друзів: ${r.friends}</small>
      <div class="tags">${p.access ? '<em class="tag adm">ADMIN</em>' : '<em class="tag">гравець</em>'}${st.block ? '<em class="tag ban">БЛОК</em>' : ''}${st.chat ? '<em class="tag mute">ЧАТ</em>' : ''}${st.dm ? '<em class="tag mute">ЛС</em>' : ''}</div></div></section>
    <section class="adm-stats4"><div><b>${s.level}</b><small>рівень</small></div><div><b>${s.floors}</b><small>поверхів</small></div><div><b>${s.residents}</b><small>жителів</small></div><div><b>${s.cups}</b><small>кубків</small></div></section>
    ${me ? '' : `<section class="adm-card"><h3>Покарання <small>гравець отримає системне повідомлення</small></h3>
      ${Object.entries(SANC).map(([k, [n, ic, d]]) => `<div class="adm-sanc ${st[k] ? 'active' : ''}"><img src="${IMG(ic)}" alt=""><div class="grow"><b>${n}</b>
        <small>${st[k] ? `<span class="act">Діє ${untilTxt(st[k].until)}</span> · ${esc(st[k].reason || '')}` : d}</small></div>
        ${st[k] ? `<button class="adm-b gold" data-unsanc="${k}">Зняти</button>` : `<button class="adm-b ${k === 'block' ? 'danger' : 'warn'}" data-sanc="${k}">Видати</button>`}</div>`).join('')}
      <div class="adm-actions"><button class="adm-b ghost" data-act="kick">Вийти з усіх пристроїв</button><button class="adm-b ghost" data-act="dm">Написати</button></div></section>`}
    <section class="adm-card"><h3>Обліковий запис</h3>
      <label class="adm-f"><span>Нікнейм</span><input id="pf-nick" maxlength="20" value="${esc(p.nick)}"></label>
      <label class="adm-f"><span>Новий пароль <small>(${p.hasPassword ? 'пароль встановлено — зберігається зашифрованим' : 'пароль не встановлено'})</small></span><input id="pf-pass" type="text" maxlength="64" placeholder="Залиш порожнім, щоб не змінювати" autocomplete="off"></label>
      <label class="adm-sw"><input type="checkbox" id="pf-access" ${p.access ? 'checked' : ''} ${me ? 'disabled' : ''}><i></i><span>Адміністратор (access = 1)</span></label></section>
    <section class="adm-card"><h3>Баланси та прогрес <small>оновлення гри гравця: ${s.t ? aAgo(s.t) : '—'}</small></h3>
      <div class="adm-nums">${fld('bucks', 'Банкноти', s.bucks, BUCK)}${fld('coins', 'Монети', Math.floor(s.coins), 'coins_heap')}${fld('keys', 'Ключі', s.keys, 'keys')}${fld('xp', 'Досвід (XP)', s.xp, 'star3')}${fld('level', 'Рівень', s.level, 'ach_star')}</div>
      <button class="adm-b gold wide" data-act="save">Зберегти зміни</button></section>
    <section class="adm-grid2">
      ${aLine('pb', bal.map(b => ({ x: aDT(b.t), v: b.bucks })), { color: '#4fe07a', label: 'Банкноти · 30 днів', money: true })}
      ${aLine('pc', bal.map(b => ({ x: aDT(b.t), v: b.coins })), { color: '#ffc531', label: 'Монети · 30 днів', money: true })}
    </section>
    ${me ? '' : `<section class="adm-card danger-zone"><h3>Небезпечна зона</h3><div class="adm-actions"><button class="adm-b warn" data-act="reset">Скинути прогрес</button><button class="adm-b danger" data-act="delete">Видалити акаунт</button></div></section>`}`;
}
// Видати покарання: з адмін-панелі (картка гравця) або прямо з профілю гравця в грі
function admSanction(kind, P0, back) {
  const inGame = !!P0, P = P0 || ADM.cache.player.player, [n, , d] = SANC[kind];
  let host = document.getElementById('adm');
  if (inGame) { host = document.createElement('div'); host.className = 'adm-float'; document.getElementById('app').appendChild(host); }
  const o = document.createElement('div'); o.className = 'adm-dlg';
  const close = () => { o.remove(); if (inGame) host.remove(); };
  o.innerHTML = `<div class="adm-dlg-card"><b>${n}: ${esc(P.nick)}</b><p>${d}. Гравець отримає системне повідомлення з причиною і терміном.</p>
    <div class="adm-f"><span>Термін</span><div class="adm-chips dur">${TERMS.map(([h, t], i) => `<button class="${i === 3 ? 'on' : ''}" data-h="${h}">${t}</button>`).join('')}</div></div>
    <label class="adm-f"><span>Причина <small>(обов’язково)</small></span><textarea id="sanc-r" rows="2" maxlength="200" placeholder="Наприклад: образи гравців у чаті"></textarea></label>
    <div class="adm-dlg-err"></div><div class="adm-dlg-btns"><button class="adm-b ghost" data-x>Скасувати</button><button class="adm-b ${kind === 'block' ? 'danger' : 'warn'}" data-y>Застосувати</button></div></div>`;
  host.appendChild(o);
  o.querySelectorAll('[data-h]').forEach(b => b.onclick = ev => { ev.stopPropagation(); o.querySelectorAll('[data-h]').forEach(x => x.classList.toggle('on', x === b)); });
  o.querySelector('[data-x]').onclick = close;
  o.querySelector('[data-y]').onclick = async () => {
    const reason = o.querySelector('#sanc-r').value.trim(); if (reason.length < 3) { o.querySelector('.adm-dlg-err').textContent = 'Вкажи причину (щонайменше 3 символи)'; o.querySelector('#sanc-r').focus(); return; }
    const hours = +o.querySelector('[data-h].on').dataset.h; close();
    const r = await api('adm_sanction', { id: P.id, kind, hours, reason }, { timeout: 15000 });
    if (!r.ok) return inGame ? toast(admErr(r.error), 'lock', true) : admToast(admErr(r.error), true);
    if (inGame) { toast(`${n}: ${P.nick}`, 'lock', true); if (back) back(); } else { admToast(n + ' — видано'); admRender(); }
  };
}

// ---------- ігрові випадаючі списки та навігація сторінками ----------
const CHEST_IMG = { wood: 'chest_wood', blue: 'chest_blue', purple: 'chest_purple', red: 'chest_red' };
const SORTS = [['seen', 'Останні в мережі', 'clock'], ['new', 'Нові гравці', 'star3'], ['level', 'За рівнем', 'ach_star'], ['bucks', 'За банкнотами', BUCK], ['coins', 'За монетами', 'coins_heap']];
const PICKS = {
  rk: { title: 'Що подарувати?', opts: () => REW_KINDS.map(([k, n, ic]) => [k, n, ic()]) },
  rc: { title: 'Яка скриня?', opts: () => CHEST_IDS.map(([k, n]) => [k, n, CHEST_IMG[k]]) },
  sort: { title: 'Сортування', opts: () => SORTS },
};
function aPick(type, cur, extra = '') {
  const o = PICKS[type].opts().find(x => x[0] === cur) || PICKS[type].opts()[0];
  return `<button class="asel" data-pick="${type}" data-cur="${o[0]}" ${extra}><img src="${IMG(o[2])}" alt=""><span>${o[1]}</span><i class="chev"></i></button>`;
}
function openPick(btn) {
  const type = btn.dataset.pick, P = PICKS[type], cur = btn.dataset.cur;
  const o = document.createElement('div'); o.className = 'adm-sheet-bg';
  o.innerHTML = `<div class="adm-sheet"><div class="adm-sheet-h"><b>${P.title}</b><button class="adm-x" data-x>✕</button></div><div class="adm-sheet-g">${P.opts().map(([k, n, ic]) => `<button class="${k === cur ? 'on' : ''}" data-v="${k}"><img src="${IMG(ic)}" alt=""><span>${n}</span>${k === cur ? '<i>✓</i>' : ''}</button>`).join('')}</div></div>`;
  document.getElementById('adm').appendChild(o);
  o.onclick = e => { e.stopPropagation(); if (e.target === o || e.target.closest('[data-x]')) return o.remove(); const b = e.target.closest('[data-v]'); if (!b) return; o.remove(); applyPick(type, b.dataset.v, btn.dataset); };
}
function applyPick(type, v, d) {
  if (type === 'sort') { ADM.sort = v; ADM.page = 0; return admRender(); }
  const pre = d.pre, i = +d.i; if (pre === 'p') promoSync(); else rwSync('g');
  const L = pre === 'g' ? ADM.rw : ADM.pf.rw;
  if (type === 'rk') L[i] = v === 'chest' ? { kind: 'chest', id: 'purple', n: 1 } : { kind: v, n: L[i].kind === 'chest' ? 50 : (L[i].n || 1) };
  if (type === 'rc') L[i].id = v;
  if (pre === 'g') admRender(); else document.getElementById('adm-main').innerHTML = admPromoForm();
}
function aPager(page, pages, key) {
  if (pages <= 1) return '';
  const nums = []; const from = Math.max(0, Math.min(page - 2, pages - 5)), to = Math.min(pages - 1, from + 4);
  for (let n = from; n <= to; n++) nums.push(n);
  const b = (n, label, cls = '') => `<button class="${cls}" data-pg="${key}:${n}" ${n < 0 || n >= pages || cls.includes('cur') ? 'disabled' : ''}>${label}</button>`;
  return `<nav class="adm-pg">${b(0, '«', 'edge')}${b(page - 1, '‹', 'arr')}${from > 0 ? '<span>…</span>' : ''}${nums.map(n => b(n, n + 1, n === page ? 'cur' : '')).join('')}${to < pages - 1 ? '<span>…</span>' : ''}${b(page + 1, '›', 'arr')}${b(pages - 1, '»', 'edge')}</nav>
    <div class="adm-pg-info">Сторінка ${page + 1} з ${pages}</div>`;
}

// ---------- Роздачі ----------
ADM.rw = [{ kind: 'bucks', n: 50 }];
const rewRows = (list, pre) => list.map((r, i) => `<div class="adm-rw">${aPick('rk', r.kind, `data-pre="${pre}" data-i="${i}"`)}
  ${r.kind === 'chest' ? aPick('rc', r.id, `data-pre="${pre}" data-i="${i}"`) : ''}
  <div class="astep"><button data-rstep="${pre}" data-i="${i}" data-d="-1">−</button><input type="number" min="1" data-rn="${pre}" data-i="${i}" value="${r.n || 1}" inputmode="numeric"><button data-rstep="${pre}" data-i="${i}" data-d="1">+</button></div>
  <button class="adm-b ghost sq" data-rdel="${pre}" data-i="${i}" aria-label="Прибрати">✕</button></div>`).join('') +
  (list.length < 6 ? `<button class="adm-add" data-radd="${pre}"><b>+</b> Додати подарунок</button>` : '');
const rewChips = list => list.map(r => { const k = REW_KINDS.find(x => x[0] === r.kind); return `<span class="rchip"><img src="${IMG(k ? k[2]() : 'gift')}">${r.kind === 'chest' ? (CHEST_IDS.find(c => c[0] === r.id) || ['', ''])[1] : aFmt(r.n)}</span>`; }).join('');
async function admGive() {
  const r = await aApi('adm_gives');
  return `<section class="adm-card glow"><h3>Нова роздача</h3>
    <label class="adm-f"><span>Кому <small>(нік або ID; порожньо — усім гравцям)</small></span><input id="gv-to" placeholder="Усім гравцям" value="${esc((ADM.gv || {}).to || '')}"></label>
    <label class="adm-f"><span>Заголовок листа</span><input id="gv-title" maxlength="120" placeholder="Подарунок від адміністрації" value="${esc((ADM.gv || {}).title || '')}"></label>
    <label class="adm-f"><span>Текст</span><textarea id="gv-text" rows="2" maxlength="1000" placeholder="Тримай подарунок!">${esc((ADM.gv || {}).text || '')}</textarea></label>
    <div class="adm-f"><span>Подарунки</span>${rewRows(ADM.rw, 'g')}</div>
    <div class="adm-preset">${[[{ kind: 'bucks', n: 50 }], [{ kind: 'bucks', n: 100 }, { kind: 'coins', n: 100000 }], [{ kind: 'keys', n: 10 }], [{ kind: 'chest', id: 'red', n: 1 }]].map((p, i) => `<button data-preset="${i}">${rewChips(p)}</button>`).join('')}</div>
    <label class="adm-sw"><input type="checkbox" id="gv-push" checked><i></i><span>🔔 Надіслати пуш-сповіщення на телефони</span></label>
    <button class="adm-b gold wide" data-act="give">Надіслати в пошту</button></section>
    <section class="adm-card"><h3>Останні роздачі</h3>${(r.items || []).map(g => { const rw = JSON.parse(g.reward || '[]'); const list = Array.isArray(rw) ? rw : [rw]; return `<div class="adm-row static"><img class="ri" src="${IMG('gift_red')}"><div class="grow"><b>${esc(g.title)}</b><small>${g.nick ? 'для ' + esc(g.nick) : 'усім'} · ${aAgo(g.t)} · забрали: ${g.claims}</small><div class="rchips">${rewChips(list)}</div></div></div>`; }).join('') || '<div class="adm-empty">Ще не було</div>'}</section>`;
}

// ---------- Акції ----------
const toLocalInput = t => { const d = new Date(t * 1000); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const P_CATS = { build: ['Будівництво поверхів', 'crane'], upgrade: ['Покращення', 'ach_growth'], tech: ['Техніка', 't_taxi'], services: ['Послуги', 'marketing'], staff: ['Персонал', 'friends'],
  chests: ['Скрині', 'chest_purple'], keys: ['Ключі', 'keys'], lotto: ['Лотерея', 'lt_2'], skip: ['Прискорення', 'stopwatch'], pass: ['Преміум-пропуск', 'ach_laurel'] };
const P_DUR = [[1, '1 год'], [3, '3 год'], [6, '6 год'], [12, '12 год'], [24, '1 доба'], [72, '3 дні'], [168, '7 днів']];
const fmtLeft = sec => { sec = Math.max(0, Math.floor(sec)); const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60); return d ? `${d}д ${h}г` : h ? `${h}г ${m}хв` : `${m}хв`; };
const promoDeal = p => !+p.pct ? 'Стара акція (без умов) — можна видалити' : p.type === 'donate' ? `+${p.pct}% банкнот · ${+p.pack < 0 ? 'усі пакети' : 'пакет ' + aFmt((DONATE[+p.pack] || {}).bucks)}` : `−${p.pct}% · ${(p.cats || []).map(c => (P_CATS[c] || [c])[0]).join(', ')}`;
async function admPromos(view) {
  if (view) {
    const t = Math.floor(Date.now() / 1000);
    const p = view === 'new' ? { id: 0, type: ADM.newType || 'discount', title: '', body: '', icon: ADM.newType === 'donate' ? 'cash_big' : 'fireworks', color: ADM.newType === 'donate' ? '#1f9a37' : '#e0303c', pct: ADM.newType === 'donate' ? 50 : 30, cats: ['chests'], pack: -1, rewards_list: [], s: t, e: t + 86400, active: 1 }
      : (() => { const x = ADM.cache.promos.find(y => +y.id === +view); const c = JSON.parse(x.cfg || '{}'); return { ...x, type: x.type || 'discount', pct: c.pct || 10, cats: c.cats || [], pack: c.pack ?? -1 }; })();
    ADM.pf = { ...p, rw: (p.rewards_list || []).map(x => ({ ...x })) };
    return admPromoForm();
  }
  const r = await aApi('adm_promos'); ADM.cache.promos = r.items || []; const now = Date.now() / 1000;
  return `<div class="adm-ptypes mini"><button data-promo="new" data-ptnew="discount"><img src="${IMG('fireworks')}" alt=""><b>+ Знижка</b><small>на категорії товарів</small></button><button data-promo="new" data-ptnew="donate"><img src="${IMG(BUCK)}" alt=""><b>+ Донат-акція</b><small>бонус до покупки банкнот</small></button></div>
    <section class="adm-list">${ADM.cache.promos.map(p => { const c = JSON.parse(p.cfg || '{}'), pp = { ...p, ...c, type: p.type || 'discount' };
      const st = !+p.active ? ['off', 'Вимкнена'] : p.s > now ? ['soon', 'Через ' + fmtLeft(p.s - now)] : p.e < now ? ['end', 'Завершена'] : ['live', 'Ще ' + fmtLeft(p.e - now)];
      return `<div class="adm-promo" style="--pc:${p.color}" data-promo="${p.id}"><img src="${IMG(p.icon)}" alt=""><div class="grow"><em class="ptype ${pp.type}">${pp.type === 'donate' ? 'ДОНАТ' : 'ЗНИЖКА'}</em><b>${esc(p.title)}</b><small>${promoDeal(pp)}</small>
        <small class="dim">${aDT(p.s)} — ${aDT(p.e)}</small></div><div class="pst"><em class="st ${st[0]}">${st[1]}</em></div></div>`; }).join('') || '<div class="adm-empty">Акцій ще немає — створи першу!</div>'}</section>`;
}
function admPromoForm() {
  const p = ADM.pf, dur = Math.round((p.e - p.s) / 3600);
  const preview = `<section class="promo-card adm-prev" style="--pc:${p.color}"><img src="${IMG(p.icon)}" alt=""><div class="grow"><div class="pc-tag">🔥 ${p.type === 'donate' ? 'Донат-акція' : 'Знижка'} · ⏱ ${fmtLeft(p.e - Math.max(p.s, Date.now() / 1000))}</div><div class="name">${esc(p.title || 'Назва акції')}</div><div class="meta">${esc(p.body || 'Опис для гравців')}</div><div class="pc-deal">${promoDeal(p)}</div>${p.type === 'donate' && p.rw.length ? `<div class="rchips">${rewChips(p.rw)}</div>` : ''}</div></section>`;
  return `<button class="adm-back" data-gotab="promos">‹ Усі акції</button>${preview}
    <section class="adm-card"><h3>${p.id ? 'Редагування акції' : 'Нова акція'}</h3>
      <div class="adm-ptypes"><button class="${p.type === 'discount' ? 'on' : ''}" data-ptype="discount"><img src="${IMG('fireworks')}" alt=""><b>Знижка</b><small>−% на категорії</small></button><button class="${p.type === 'donate' ? 'on' : ''}" data-ptype="donate"><img src="${IMG(BUCK)}" alt=""><b>Донат-акція</b><small>купи — отримай більше</small></button></div>
      <label class="adm-f"><span>Назва</span><input id="pr-title" maxlength="120" value="${esc(p.title)}" placeholder="${p.type === 'donate' ? 'Наприклад: Подвійні банкноти' : 'Наприклад: Розпродаж скринь'}"></label>
      <label class="adm-f"><span>Опис</span><textarea id="pr-text" rows="2" maxlength="2000" placeholder="Коротко для гравців">${esc(p.body)}</textarea></label>
      ${p.type === 'discount' ? `<div class="adm-f"><span>Категорії зі знижкою</span><div class="adm-cats">${Object.entries(P_CATS).map(([k, [n, ic]]) => `<button class="${p.cats.includes(k) ? 'on' : ''}" data-pcat="${k}"><img src="${IMG(ic)}" alt="">${n}</button>`).join('')}</div></div>
        <div class="adm-f"><span>Знижка: <b class="pctv">−${p.pct}%</b></span><div class="adm-chips">${[10, 20, 30, 40, 50, 60, 70].map(v => `<button class="${+p.pct === v ? 'on' : ''}" data-ppct="${v}">−${v}%</button>`).join('')}<input type="number" id="pr-pct" min="1" max="90" value="${p.pct}" class="pct-in"></div></div>`
      : `<div class="adm-f"><span>Пакет банкнот</span><div class="adm-packs"><button class="${+p.pack === -1 ? 'on' : ''}" data-ppack="-1"><b>Усі</b><small>пакети</small></button>${DONATE.map((d, i) => `<button class="${+p.pack === i ? 'on' : ''}" data-ppack="${i}"><img src="${IMG(d.img)}" alt=""><b>${aFmt(d.bucks)}</b><small>${d.uah} ₴</small></button>`).join('')}</div></div>
        <div class="adm-f"><span>Бонус до покупки: <b class="pctv">+${p.pct}%</b></span><div class="adm-chips">${[10, 25, 50, 75, 100, 150, 200].map(v => `<button class="${+p.pct === v ? 'on' : ''}" data-ppct="${v}">+${v}%</button>`).join('')}<input type="number" id="pr-pct" min="1" max="500" value="${p.pct}" class="pct-in"></div></div>
        <div class="adm-f"><span>Додатковий подарунок за покупку <small>(необов’язково)</small></span>${rewRows(p.rw, 'p')}</div>`}
      <div class="adm-f"><span>Тривалість (таймер акції)</span><div class="adm-chips">${P_DUR.map(([h, n]) => `<button class="${dur === h ? 'on' : ''}" data-pdur="${h}">${n}</button>`).join('')}</div></div>
      <div class="adm-2"><label class="adm-f"><span>Початок</span><input type="datetime-local" id="pr-s" value="${toLocalInput(p.s)}"></label><label class="adm-f"><span>Кінець</span><input type="datetime-local" id="pr-e" value="${toLocalInput(p.e)}"></label></div>
      <div class="adm-f"><span>Іконка</span><div class="adm-icons">${PROMO_ICONS.map(i => `<button class="${p.icon === i ? 'on' : ''}" data-picon="${i}"><img src="${IMG(i)}" alt=""></button>`).join('')}</div></div>
      <div class="adm-f"><span>Колір</span><div class="adm-colors">${PROMO_COLORS.map(c => `<button class="${p.color === c ? 'on' : ''}" data-pcol="${c}" style="background:${c}"></button>`).join('')}</div></div>
      <label class="adm-sw"><input type="checkbox" id="pr-act" ${+p.active ? 'checked' : ''}><i></i><span>Акція увімкнена</span></label>
      ${p.id ? '' : '<label class="adm-sw"><input type="checkbox" id="pf-push" checked><i></i><span>🔔 Повідомити всіх гравців пуш-сповіщенням</span></label>'}
      <button class="adm-b gold wide" data-act="promo-save">${p.id ? 'Зберегти' : 'Запустити акцію'}</button>
      ${p.id ? '<button class="adm-b danger wide" data-act="promo-del">Видалити акцію</button>' : ''}</section>`;
}

// ---------- Новини ----------
async function admNews(view) {
  const r = await aApi('adm_news'); ADM.cache.news = r.items || [];
  const e = view && view !== 'new' ? ADM.cache.news.find(n => +n.id === +view) : null;
  return `<section class="adm-card glow"><h3>${e ? 'Редагування новини #' + e.id : 'Нова новина'}</h3>
      <label class="adm-f"><span>Заголовок</span><input id="nw-title" maxlength="160" value="${esc(e ? e.title : '')}"></label>
      <label class="adm-f"><span>Текст</span><textarea id="nw-text" rows="4" maxlength="4000">${esc(e ? e.body : '')}</textarea></label>
      ${e ? '' : '<label class="adm-sw"><input type="checkbox" id="nw-push" ><i></i><span>🔔 Повідомити всіх гравців пуш-сповіщенням</span></label>'}
      <div class="adm-f"><span>Іконка</span><div class="adm-icons">${PROMO_ICONS.map(i => `<button class="${(e ? e.icon : 'megaphone2') === i ? 'on' : ''}" data-nicon="${i}"><img src="${IMG(i)}" alt=""></button>`).join('')}</div></div>
      <button class="adm-b gold wide" data-act="news-save" data-id="${e ? e.id : 0}">${e ? 'Зберегти' : 'Опублікувати для всіх'}</button>${e ? '<button class="adm-b ghost wide" data-gotab="news">Скасувати</button>' : ''}</section>
    <section class="adm-list">${ADM.cache.news.map(n => `<div class="adm-row static ${+n.published ? '' : 'dim'}"><img class="ri" src="${IMG(n.icon)}"><div class="grow"><b>${esc(n.title)}</b><small>${aDT(n.t)}${+n.published ? '' : ' · приховано'}</small></div>
      <button class="adm-b ghost sq" data-nedit="${n.id}">✎</button><button class="adm-b ghost sq" data-npub="${n.id}" data-v="${+n.published ? 0 : 1}">${+n.published ? '👁' : '🚫'}</button><button class="adm-b danger sq" data-ndel="${n.id}">✕</button></div>`).join('') || '<div class="adm-empty">Новин немає</div>'}</section>`;
}

// ---------- Чат ----------
async function admChat() {
  const r = await aApi('adm_chat');
  return `<section class="adm-list">${(r.items || []).map(m => `<div class="adm-row static"><span class="av-s" data-player="${m.pid}">${avHTML(m.avatar)}</span><div class="grow"><b data-player="${m.pid}">${esc(m.nick)}${+m.muted ? '<em class="tag mute">MUTE</em>' : ''} <small>${aAgo(m.t)}</small></b><span class="msg">${esc(m.body)}</span></div>
    <button class="adm-b danger sq" data-cdel="${m.id}">✕</button></div>`).join('') || '<div class="adm-empty">Чат порожній</div>'}</section>`;
}
// ---------- Онлайн ----------
async function admOnline() {
  const r = await aApi('adm_online'); const L = r.items || [];
  return `<div class="adm-live"><i></i>Зараз у грі: <b>${L.length}</b><button class="adm-b ghost sq" data-gotab="online" aria-label="Оновити">⟳</button></div>
    <section class="adm-list">${L.map(p => `<div class="adm-row" data-player="${p.id}"><span class="av-s">${avHTML(p.avatar)}<i class="on"></i></span><div class="grow"><b>${esc(p.nick)}${+p.access ? '<em class="tag adm">ADMIN</em>' : ''}</b><small>★ ${p.level} · ${p.floors} пов. · ${aAgo(p.seen)}</small></div>
      <div class="money-col"><span class="money b"><img src="${IMG(BUCK)}">${aFmt(p.bucks)}</span><span class="money c"><img src="${IMG('coins_heap')}">${aFmt(p.coins)}</span></div></div>`).join('') || '<div class="adm-empty">Зараз нікого немає онлайн</div>'}</section>`;
}
// ---------- Подарунки ----------
ADM.giftPage = 0;
async function admGifts() {
  const r = await aApi('adm_gifts', { page: ADM.giftPage }); if (!r.ok) return '';
  const G = id => (typeof GIFTS !== 'undefined' && GIFTS.find(g => g.id === id)) || { name: id };
  const pages = Math.max(1, Math.ceil(r.total / r.per));
  return `<section class="adm-kpis k3"><div class="kpi"><img src="${IMG('giftbox')}"><span>Подарунків</span><b>${(+r.stats.n).toLocaleString('uk-UA')}</b></div><div class="kpi"><img src="${IMG(BUCK)}"><span>Витрачено банкнот</span><b>${aFmt(r.stats.sum)}</b></div><div class="kpi"><img src="${IMG('friends')}"><span>Дарувальників</span><b>${r.stats.senders}</b></div></section>
    ${r.top.length ? `<section class="adm-card"><h3>Найпопулярніші</h3><div class="adm-gtop">${r.top.map(t => `<div><img src="${GSRC(t.gift)}" alt=""><b>${t.n}</b><small>${esc(G(t.gift).name)}</small></div>`).join('')}</div></section>` : ''}
    <section class="adm-logs">${r.items.map(g => { const d = new Date(g.t * 1000); return `<div class="lg"><div class="lg-time"><b>${d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</b><small>${d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })}</small></div>
      <div class="lg-body"><div class="lg-top"><span class="lg-p" data-player="${g.fid}"><span class="lg-av">${avHTML(g.favatar)}</span><b>${esc(g.fnick)}</b></span><i class="lg-arr">➜</i><span class="lg-p" data-player="${g.tid}"><span class="lg-av">${avHTML(g.tavatar)}</span><b>${esc(g.tnick)}</b></span></div>
      <div class="lg-act"><img class="lg-gift" src="${GSRC(g.gift)}" alt=""><span><b>${esc(G(g.gift).name)}</b> · ${aFmt(g.price)} банкнот${g.body ? ' · ' + emo(esc(g.body)) : ''}</span></div></div>
      <button class="adm-b danger sq lg-del" data-gdel="${g.id}" aria-label="Видалити">✕</button></div>`; }).join('') || '<div class="adm-empty">Подарунків ще не дарували</div>'}</section>${aPager(ADM.giftPage, pages, 'gifts')}`;
}
// ---------- Донат: заявки гравців ----------
async function admDons() {
  const r = await aApi('adm_dons', { page: ADM.donPage || 0, st: ADM.donSt || 'pending' }); if (!r.ok) return '';
  const S2 = r.stats, pages = Math.max(1, Math.ceil(r.total / r.per)), st = ADM.donSt || 'pending';
  const stTxt = { pending: ['Очікує оплати', 'wait'], done: ['Нараховано', 'ok'], rejected: ['Відхилено', 'no'] };
  return `<section class="adm-kpis k3"><div class="kpi"><img src="${IMG('stopwatch')}"><span>Очікують</span><b>${+S2.pending || 0}</b></div><div class="kpi"><img src="${IMG(BUCK)}"><span>Нараховано банкнот</span><b>${aFmt(S2.bucks)}</b></div><div class="kpi"><img src="${IMG('don_3')}"><span>Сума оплат</span><b>${aFmt(S2.uah)} ₴</b></div></section>
    <div class="adm-dseg"><button class="${st === 'pending' ? 'on' : ''}" data-dst="pending">Нові заявки${+S2.pending ? ` <i>${S2.pending}</i>` : ''}</button><button class="${st === 'all' ? 'on' : ''}" data-dst="all">Усі заявки</button></div>
    <section class="adm-dons">${r.items.map(d => { const d0 = new Date(d.t * 1000), rw = (() => { try { return JSON.parse(d.bonus_rw || 'null') || []; } catch (e) { return []; } })(), [sn, sc] = stTxt[d.status] || [d.status, ''];
      return `<div class="adm-don ${d.status}"><span class="ad-av" data-player="${d.pid}">${avHTML(d.avatar)}</span>
        <div class="grow"><div class="ad-top"><b data-player="${d.pid}">${esc(d.nick)}</b><small>№${d.id} · ${d0.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })} ${d0.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</small></div>
          <div class="ad-sum"><img src="${IMG(BUCK)}"><b>${aFmt(d.bucks)}</b><span>${aFmt(d.uah)} ₴</span></div>
          ${+d.bonus_pct || rw.length ? `<div class="ad-bonus">🔥 Акція: ${+d.bonus_pct ? `+${d.bonus_pct}% (${aFmt(Math.round(d.bucks * d.bonus_pct / 100))} банкнот)` : ''}${rw.length ? (+d.bonus_pct ? ' + ' : '') + esc(rewardView(rw).text) : ''}</div>` : ''}
          ${d.status !== 'pending' ? `<em class="ad-st ${sc}">${sn}</em>` : ''}</div>
        ${d.status === 'pending' ? `<div class="ad-act"><button class="ad-ok" data-dok="${d.id}" aria-label="Підтвердити"><img src="${IMG('check')}" alt=""><small>Підтвердити</small></button><button class="ad-no" data-dno="${d.id}" aria-label="Відхилити"><b>✕</b><small>Відхилити</small></button></div>` : ''}</div>`; }).join('') || `<div class="adm-empty">${st === 'pending' ? 'Нових заявок немає' : 'Заявок ще не було'}</div>`}</section>${aPager(ADM.donPage || 0, pages, 'don')}`;
}
const PUSH_RES = { sent: '✅ надіслано', ingame: '🎮 був у грі', read: '👁 прочитано', off: '🔕 вимкнув', night: '🌙 ніч', morning: '🌅 перенесено на ранок', limit: '⛔ ліміт на день', notoken: '📵 немає застосунку', gone: '🗑 застосунок видалено', err: '⚠ помилка Firebase' };
const PUSH_KIND = { dm: 'особисте', gift: 'подарунок', cinv: 'запрошення', cchat: 'чат корпорації', gchat: 'загальний чат', reply: 'відповідь', promo: 'акція', news: 'новина', give: 'роздача', don: 'донат', tour: 'турнір', idle1: '12 год', idle2: '3 дні', idle3: '7 днів', test: 'тест' };
const admTime = t => { const d = new Date(t * 1000); return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); };
// ---------- Сервер ----------
async function admServer() {
  const r = await aApi('adm_settings'); if (!r.ok) return ''; const c = r.cfg, db = r.db;
  return `<section class="adm-card glow"><h3>Оголошення для всіх <small>біжучий рядок угорі гри</small></h3>
      <div class="adm-f fsend-like"><input id="sv-banner" maxlength="300" value="${esc(c.banner)}" placeholder="Наприклад: Вихідні знижки на скрині!"></div>
      <small class="adm-hint">Порожнє поле — оголошення приховано.</small></section>
    <section class="adm-card ${+c.maint ? 'danger-zone' : ''}"><h3>Технічні роботи <small>${+c.maint ? '<span class="act">УВІМКНЕНО</span>' : 'вимкнено'}</small></h3>
      <label class="adm-sw"><input type="checkbox" id="sv-maint" ${+c.maint ? 'checked' : ''}><i></i><span>Закрити гру для гравців (адміністратори можуть грати)</span></label>
      <label class="adm-f"><span>Повідомлення гравцям</span><textarea id="sv-msg" rows="2" maxlength="500" placeholder="Гра оновлюється. Спробуй трохи пізніше — прогрес збережено.">${esc(c.maint_msg)}</textarea></label></section>
    <button class="adm-b gold wide" data-act="srv-save">Зберегти налаштування</button>
    <section class="adm-card"><h3>Пуш-сповіщення <small>${r.push && r.push.on ? '<span class="act">ПІДКЛЮЧЕНО</span>' : 'не підключено'}</small></h3>
      ${r.push && r.push.on ? `<div class="adm-dbg">${[['Пристроїв із застосунком', r.push.tokens], ['Твоїх пристроїв', r.push.mine], ['У черзі', r.push.queue]].map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('')}</div>
        <button class="adm-b gold wide" data-act="push-test" style="margin:8px 0">🔔 Надіслати тестове сповіщення собі</button>
        <h3 style="margin-top:10px">Останні сповіщення</h3>
        <div class="adm-plog">${(r.push.log || []).map(l => `<div class="pl-r ${l.res === 'sent' ? 'ok' : ['err', 'gone', 'notoken'].includes(l.res) ? 'bad' : ''}"><b>${esc(PUSH_RES[l.res] || l.res)}</b><span>${esc(l.nick || '—')} · ${esc(PUSH_KIND[l.kind] || l.kind)}${l.info ? ' · ' + esc(String(l.info).slice(0, 60)) : ''}</span><time>${admTime(l.t)}</time></div>`).join('') || '<small class="adm-hint">Ще нічого не надсилалось.</small>'}</div>
        <small class="adm-hint">Завдання за розкладом (cron) <b>щохвилини</b> (* * * * *): <b>php …/games2/api/cron.php</b> або посилання:<br><code style="word-break:break-all">${esc(location.origin + location.pathname.replace(/[^/]*$/, ''))}api/cron.php?key=${esc(r.push.cron)}</code></small>`
      : '<small class="adm-hint">Поклади секретний ключ сервісного акаунта Firebase у файл <b>api/firebase-key.json</b> на сервері.</small>'}</section>
    <section class="adm-card"><h3>База даних <small>PHP ${esc(r.php)}</small></h3><div class="adm-dbg">${[['Гравців', db.players], ['Збережень', db.saves], ['Сесій', db.sessions], ['Повідомлень чату', db.chat], ['Особистих', db.dm], ['Подарунків', db.gifts], ['Листів', db.mail]].map(([n, v]) => `<div><b>${(+v).toLocaleString('uk-UA')}</b><small>${n}</small></div>`).join('')}</div>
      <h3 style="margin-top:12px">Очищення</h3><div class="adm-actions three"><button class="adm-b ghost" data-clean="chat">Чат старший 7 днів</button><button class="adm-b ghost" data-clean="sessions">Старі сесії (30 дн)</button><button class="adm-b ghost" data-clean="mail">Листи старші 30 днів</button></div></section>`;
}
// ---------- Журнал ----------
const LOG_N = { edit: 'Редагування', ban: 'Блокування', unban: 'Розблокування', mute: 'Бан чату', unmute: 'Зняв бан', kick: 'Вихід з пристроїв', reset: 'Скидання прогресу', delete: 'Видалення', give: 'Роздача', promo: 'Акція', promo_del: 'Видалив акцію', news: 'Новина', news_del: 'Видалив новину', chat_del: 'Видалив повідомлення', dmban: 'Бан ЛС', gift_del: 'Видалив подарунок', settings: 'Налаштування', cleanup: 'Очищення' };
const LOG_IC = { edit: '✎', ban: '⛔', unban: '✓', mute: '🔇', unmute: '🔈', dmban: '✉', kick: '⏏', reset: '↺', delete: '🗑', give: '🎁', promo: '🔥', promo_del: '🔥', news: '📢', news_del: '📢', chat_del: '💬' };
ADM.logPage = 0;
async function admLog() {
  const r = await aApi('adm_log', { page: ADM.logPage }); if (!r.ok) return '';
  const pages = Math.max(1, Math.ceil(r.total / r.per));
  const who = (av, nick, pid) => `<span class="lg-p" ${pid ? `data-player="${pid}"` : ''}><span class="lg-av">${av ? avHTML(av) : '<i>👥</i>'}</span><b>${esc(nick || '—')}</b></span>`;
  const info = l => { let t = l.info || ''; try { const j = JSON.parse(t); if (Array.isArray(j)) t = j.map(x => x.kind === 'chest' ? 'скриня ' + ((CHEST_IDS.find(c => c[0] === x.id) || [, x.id])[1]) : aFmt(x.n) + ' ' + ((REW_KINDS.find(k => k[0] === x.kind) || [, x.kind])[1]).toLowerCase()).join(', '); else if (j && typeof j === 'object') t = (j.pct ? (j.cats ? '−' : '+') + j.pct + '% ' : '') + (j.cats ? j.cats.map(c => (P_CATS[c] || [c])[0]).join(', ') : j.pack != null ? (j.pack < 0 ? 'усі пакети' : 'пакет ' + aFmt((DONATE[j.pack] || {}).bucks)) : ''); } catch (e) {} return t; };
  return `<div class="adm-count">Записів: <b>${r.total}</b></div><section class="adm-logs">${(r.items || []).map(l => { const d = new Date(l.t * 1000);
    const toPlayer = !['promo', 'promo_del', 'news', 'news_del', 'chat_del'].includes(l.action) && l.target !== 'всім';
    return `<div class="lg lk-${l.action}"><div class="lg-time"><b>${d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</b><small>${d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })}</small></div>
      <div class="lg-body"><div class="lg-top">${who(l.avatar, l.nick)}<i class="lg-arr">➜</i>${toPlayer ? who(l.tavatar, l.target, l.tid) : `<span class="lg-obj">${esc(l.target === 'всім' ? 'Усі гравці' : l.target || '')}</span>`}</div>
      <div class="lg-act"><em class="lk ${l.action}"><i>${LOG_IC[l.action] || '•'}</i>${LOG_N[l.action] || l.action}</em><span>${esc(info(l))}</span></div></div></div>`; }).join('') || '<div class="adm-empty">Журнал порожній</div>'}</section>
    ${aPager(ADM.logPage, pages, 'log')}`;
}

// ---------- обробка натискань ----------
function rwSync(pre) {
  if (pre === 'g') { const v = id => { const e = document.getElementById(id); return e ? e.value : undefined; }; if (v('gv-to') !== undefined) ADM.gv = { to: v('gv-to'), title: v('gv-title'), text: v('gv-text') }; }
  const list = pre === 'g' ? ADM.rw : ADM.pf.rw;
  document.querySelectorAll(`#adm [data-rn="${pre}"]`).forEach(el => { list[+el.dataset.i].n = Math.max(1, +el.value || 1); });
  return list;
}
function promoSync() {
  const p = ADM.pf; if (!p) return;
  const v = id => document.getElementById(id);
  if (v('pr-pct')) p.pct = Math.max(1, +v('pr-pct').value || 1);
  if (v('pr-title')) { p.title = v('pr-title').value; p.body = v('pr-text').value; p.active = v('pr-act').checked ? 1 : 0; p.s = Math.floor(new Date(v('pr-s').value).getTime() / 1000) || p.s; p.e = Math.floor(new Date(v('pr-e').value).getTime() / 1000) || p.e; }
  rwSync('p');
}
async function admClick(e) {
  const t = e.target.closest('button, [data-player], [data-promo]'); if (!t || !t.closest('#adm')) return;
  const d = t.dataset, main = document.getElementById('adm-main');
  if ('close' in d) return admClose();
  if (d.pick) return openPick(t);
  if (d.gdel) return admConfirm({ title: 'Видалити подарунок?', text: 'Він зникне з профілю гравця.' }, async () => { if ((await aApi('adm_gift_del', { id: +d.gdel })).ok) { admToast('Подарунок видалено'); admRender(); } });
  if (d.clean) return admConfirm({ title: 'Очистити дані?', text: t.textContent, yes: 'Очистити' }, async () => { const r = await aApi('adm_cleanup', { what: d.clean }); if (r.ok) { admToast('Видалено записів: ' + r.n); admRender(); } });
  if (d.pg) { const [k, n] = d.pg.split(':'); if (k === 'players') ADM.page = +n; if (k === 'log') ADM.logPage = +n; if (k === 'gifts') ADM.giftPage = +n; if (k === 'don') ADM.donPage = +n; return admRender(); }
  if (d.rstep) { const inp = document.querySelector(`#adm [data-rn="${d.rstep}"][data-i="${d.i}"]`); const v = +inp.value || 0, step = v >= 10000 ? 1000 : v >= 1000 ? 100 : v >= 100 ? 10 : 1; inp.value = Math.max(1, v + d.d * step); return; }
  if (d.dst) { ADM.donSt = d.dst; ADM.donPage = 0; return admRender(); }
  if (d.dok || d.dno) { const id = +(d.dok || d.dno), ok = !!d.dok;
    return admConfirm({ title: ok ? 'Підтвердити оплату?' : 'Відхилити заявку?', text: ok ? `Заявка №${id}: гравцю прийдуть банкноти на пошту (і бонус акції, якщо діяв).` : `Заявка №${id} буде відхилена, гравцю прийде сповіщення.`, yes: ok ? 'Підтвердити' : 'Відхилити', danger: !ok },
      async () => { const r = await aApi('adm_don_set', { id, ok: ok ? 1 : 0 }); if (r.ok) { admToast(ok ? 'Банкноти нараховано' : 'Заявку відхилено'); admRender(); } else admToast(netErr(r.error), true); }); }
  if (d.tab) return admGo(d.tab);
  if (d.gotab) return admGo(d.gotab);
  if ('back' in d) return admGo('players');
  if (d.player) return admGo('players', +d.player);
  if (d.promo && !t.closest('.adm-promo.big')) { ADM.newType = d.ptnew || 'discount'; return admGo('promos', d.promo); }
  if (d.f) { ADM.f = d.f; ADM.page = 0; return admRender(); }
  if (d.page !== undefined && t.matches('[data-page]')) { ADM.page = +d.page; return admRender(); }
  if (d.step) { const i = document.getElementById('pf-' + d.step); const big = d.step === 'coins' ? 10000 : d.step === 'xp' ? 1000 : d.step === 'bucks' ? 10 : 1; i.value = Math.max(0, (+i.value || 0) + d.d * big); return; }
  // подарунки (роздача / акція)
  if (d.radd) { const pre = d.radd; if (pre === 'p') promoSync(); else rwSync('g'); (pre === 'g' ? ADM.rw : ADM.pf.rw).push({ kind: 'bucks', n: 50 }); return pre === 'g' ? admRender() : (main.innerHTML = admPromoForm()); }
  if (d.rdel) { const pre = d.rdel; if (pre === 'p') promoSync(); else rwSync('g'); (pre === 'g' ? ADM.rw : ADM.pf.rw).splice(+d.i, 1); return pre === 'g' ? admRender() : (main.innerHTML = admPromoForm()); }
  if (d.preset) { rwSync('g'); ADM.rw = [[{ kind: 'bucks', n: 50 }], [{ kind: 'bucks', n: 100 }, { kind: 'coins', n: 100000 }], [{ kind: 'keys', n: 10 }], [{ kind: 'chest', id: 'red', n: 1 }]][+d.preset].map(x => ({ ...x })); return admRender(); }
  if (d.ptnew) { ADM.newType = d.ptnew; }
  if (d.ptype) { promoSync(); ADM.pf.type = d.ptype; ADM.pf.pct = d.ptype === 'donate' ? 50 : 30; main.innerHTML = admPromoForm(); return; }
  if (d.pcat) { promoSync(); const c = ADM.pf.cats, i = c.indexOf(d.pcat); i < 0 ? c.push(d.pcat) : c.splice(i, 1); main.innerHTML = admPromoForm(); return; }
  if (d.ppct) { promoSync(); ADM.pf.pct = +d.ppct; main.innerHTML = admPromoForm(); return; }
  if (d.ppack) { promoSync(); ADM.pf.pack = +d.ppack; main.innerHTML = admPromoForm(); return; }
  if (d.pdur) { promoSync(); ADM.pf.s = Math.max(ADM.pf.s, Math.floor(Date.now() / 1000)); ADM.pf.e = ADM.pf.s + +d.pdur * 3600; main.innerHTML = admPromoForm(); return; }
  if (d.picon) { promoSync(); ADM.pf.icon = d.picon; main.innerHTML = admPromoForm(); return; }
  if (d.pcol) { promoSync(); ADM.pf.color = d.pcol; main.innerHTML = admPromoForm(); return; }
  if (d.nicon) { document.querySelectorAll('#adm [data-nicon]').forEach(b => b.classList.toggle('on', b === t)); return; }
  if (d.sanc) return admSanction(d.sanc);
  if (d.unsanc) { const P0 = ADM.cache.player.player; return admConfirm({ title: 'Зняти покарання?', text: SANC[d.unsanc][0] + ' для ' + esc(P0.nick), danger: false, yes: 'Зняти' }, async () => { if ((await aApi('adm_unsanction', { id: P0.id, kind: d.unsanc })).ok) { admToast('Покарання знято'); admRender(); } }); }
  if (d.nedit) return admGo('news', +d.nedit);
  if (d.npub) { const n = ADM.cache.news.find(x => +x.id === +d.npub); const r = await aApi('adm_news_save', { id: n.id, title: n.title, text: n.body, icon: n.icon, published: +d.v }); if (r.ok) admRender(); return; }
  if (d.ndel) return admConfirm({ title: 'Видалити новину?', text: 'Гравці більше її не побачать.' }, async () => { if ((await aApi('adm_news_del', { id: +d.ndel })).ok) { admToast('Новину видалено'); admRender(); } });
  if (d.cdel) { if ((await aApi('adm_chat_del', { id: +d.cdel })).ok) { t.closest('.adm-row').remove(); admToast('Повідомлення видалено'); } return; }
  const act = d.act; if (!act) return;
  const P = ADM.cache.player && ADM.cache.player.player;
  if (act === 'push-test') { const r = await aApi('adm_push_test'); if (r.ok) { admToast('Тест надіслано — згорни гру й подивись на телефон'); setTimeout(admRender, 2500); } else admToast(r.error === 'push_no_device' ? 'На твоєму акаунті немає телефона з застосунком' : 'Сповіщення не підключені', true); return; }
  if (act === 'srv-save') { const v = id => document.getElementById(id); const r = await aApi('adm_settings', { save: 1, banner: v('sv-banner').value, maint: v('sv-maint').checked ? 1 : 0, maint_msg: v('sv-msg').value }); if (r.ok) { admToast('Налаштування збережено'); if (typeof netApplyCfg === 'function') netApplyCfg(r.cfg); admRender(); } return; }
  if (act === 'search') { ADM.q = document.getElementById('ap-q').value; ADM.page = 0; return admRender(); }
  if (act === 'save') {
    const v = id => document.getElementById(id).value;
    const body = { id: P.id, nick: v('pf-nick').trim(), password: v('pf-pass'), access: document.getElementById('pf-access').checked ? 1 : 0, bucks: v('pf-bucks'), coins: v('pf-coins'), keys: v('pf-keys'), xp: v('pf-xp'), level: v('pf-level') };
    t.disabled = true; const r = await aApi('adm_player_save', body); t.disabled = false;
    if (r.ok) { admToast(r.changes.length ? 'Збережено: ' + r.changes.length + ' змін(и)' : 'Змін немає'); if (P.id === NET.auth.player.id) { const l = await api('load'); if (l.ok && l.save) netApplyState(l.save.data, l.save.rev); } admRender(); }
    return;
  }
  if (act === 'mute') { if ((await aApi('adm_mute', { id: P.id, v: P.muted ? 0 : 1 })).ok) { admToast(P.muted ? 'Мут знято' : 'Гравцю заборонено писати'); admRender(); } return; }
  if (act === 'kick') return admConfirm({ title: 'Вийти з усіх пристроїв?', text: 'Гравцю доведеться увійти знову.', danger: false, yes: 'Так' }, async () => { if ((await aApi('adm_kick', { id: P.id })).ok) admToast('Сесії гравця завершено'); });
  if (act === 'dm') { admClose(); return openDM(P.id); }
  if (act === 'ban') {
    if (P.banned) { if ((await aApi('adm_ban', { id: P.id, v: 0 })).ok) { admToast('Гравця розбанено'); admRender(); } return; }
    const o = document.createElement('div'); o.className = 'adm-dlg';
    o.innerHTML = `<div class="adm-dlg-card"><b>Забанити ${esc(P.nick)}?</b><p>Гравець не зможе увійти в гру.</p>
      <div class="adm-chips dur">${[[1, '1 год'], [24, '1 доба'], [168, '7 днів'], [720, '30 днів'], [0, 'Назавжди']].map(([h, n], i) => `<button class="${i === 1 ? 'on' : ''}" data-h="${h}">${n}</button>`).join('')}</div>
      <input id="ban-r" placeholder="Причина (побачить гравець)" maxlength="200"><div class="adm-dlg-btns"><button class="adm-b ghost" data-x>Скасувати</button><button class="adm-b danger" data-y>Забанити</button></div></div>`;
    document.getElementById('adm').appendChild(o);
    o.querySelectorAll('[data-h]').forEach(b => b.onclick = () => o.querySelectorAll('[data-h]').forEach(x => x.classList.toggle('on', x === b)));
    o.querySelector('[data-x]').onclick = () => o.remove();
    o.querySelector('[data-y]').onclick = async () => { const h = +o.querySelector('[data-h].on').dataset.h, reason = o.querySelector('#ban-r').value; o.remove(); if ((await aApi('adm_ban', { id: P.id, v: 1, hours: h, reason })).ok) { admToast('Гравця забанено'); admRender(); } };
    return;
  }
  if (act === 'reset') return admConfirm({ title: 'Скинути прогрес?', text: `Уся вежа, баланси й досягнення <b>${esc(P.nick)}</b> будуть видалені. Гравець почне з нуля.`, yes: 'Скинути' }, async () => { if ((await aApi('adm_reset', { id: P.id })).ok) { admToast('Прогрес скинуто'); admRender(); } });
  if (act === 'delete') return admConfirm({ title: 'Видалити акаунт назавжди?', text: `Акаунт <b>${esc(P.nick)}</b> і всі його дані буде видалено з бази. Це не можна скасувати.`, yes: 'Видалити' }, async () => { if ((await aApi('adm_delete', { id: P.id })).ok) { admToast('Акаунт видалено'); admGo('players'); } });
  if (act === 'give') {
    const rw = rwSync('g'), to = document.getElementById('gv-to').value.trim(), title = document.getElementById('gv-title').value, text = document.getElementById('gv-text').value;
    return admConfirm({ title: to ? `Надіслати гравцю ${esc(to)}?` : 'Надіслати ВСІМ гравцям?', text: `<div class="rchips">${rewChips(rw)}</div>`, danger: false, yes: 'Надіслати' },
      async () => { if ((await aApi('adm_give', { to, title, text, rewards: rw, push: document.getElementById('gv-push') && document.getElementById('gv-push').checked ? 1 : 0 })).ok) { admToast('Роздачу надіслано в пошту'); ADM.gv = null; ADM.rw = [{ kind: 'bucks', n: 50 }]; admRender(); } });
  }
  if (act === 'promo-save') { promoSync(); const p = ADM.pf; const r = await aApi('adm_promo_save', { id: p.id, type: p.type, pct: p.pct, cats: p.cats, pack: p.pack, title: p.title, text: p.body, icon: p.icon, color: p.color, rewards: p.type === 'donate' ? p.rw : [], start: p.s, end: p.e, active: p.active, push: !p.id && document.getElementById('pf-push') && document.getElementById('pf-push').checked ? 1 : 0 }); if (r.ok) { admToast(p.id ? 'Акцію збережено' : 'Акцію запущено'); admGo('promos'); } return; }
  if (act === 'promo-del') return admConfirm({ title: 'Видалити акцію?', text: 'Гравці більше її не побачать.' }, async () => { if ((await aApi('adm_promo_del', { id: ADM.pf.id })).ok) { admToast('Акцію видалено'); admGo('promos'); } });
  if (act === 'news-save') {
    const ic = document.querySelector('#adm [data-nicon].on'); const r = await aApi('adm_news_save', { id: +d.id, title: document.getElementById('nw-title').value, text: document.getElementById('nw-text').value, icon: ic ? ic.dataset.nicon : 'megaphone2', published: 1, push: document.getElementById('nw-push') && document.getElementById('nw-push').checked ? 1 : 0 });
    if (r.ok) { admToast('Новину збережено'); admGo('news'); if (typeof netPullNews === 'function') netPullNews(); } return;
  }
}
document.addEventListener('change', e => {
  if (!e.target.closest || !e.target.closest('#adm')) return;
  const d = e.target.dataset;
  if (e.target.id === 'ap-sort') { ADM.sort = e.target.value; ADM.page = 0; admRender(); }
  if (d.rk) { const pre = d.rk; if (pre === 'p') promoSync(); else rwSync('g'); const L = pre === 'g' ? ADM.rw : ADM.pf.rw; L[+d.i] = e.target.value === 'chest' ? { kind: 'chest', id: 'purple', n: 1 } : { kind: e.target.value, n: L[+d.i].n || 1 }; if (pre === 'g') admRender(); else document.getElementById('adm-main').innerHTML = admPromoForm(); }
  if (d.rc) { const pre = d.rc; if (pre === 'p') promoSync(); else rwSync('g'); (pre === 'g' ? ADM.rw : ADM.pf.rw)[+d.i].id = e.target.value; if (pre === 'p') document.getElementById('adm-main').innerHTML = admPromoForm(); }
});
document.addEventListener('input', e => { if (e.target.closest && e.target.closest('#adm') && /^pr-(title|text)$/.test(e.target.id)) { const p = ADM.pf; p.title = document.getElementById('pr-title').value; p.body = document.getElementById('pr-text').value; const b = document.querySelector('#adm .adm-promo.big'); if (b) { b.querySelector('b').textContent = p.title || 'Назва акції'; b.querySelector('small').textContent = p.body || 'Опис акції для гравців'; } } });
