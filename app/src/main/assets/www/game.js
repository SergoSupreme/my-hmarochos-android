// ===================================================================
//  Мій Хмарочос — логіка гри v0.6
// ===================================================================
const SAVE_BASE = 'vysotka_mriy_v6';
// Локальний кеш окремо для кожного акаунта (гість — окремо), щоб дані ніколи не змішувались
const SAVE_KEY_FOR = () => { try { const a = JSON.parse(localStorage.getItem('mx_auth_v1') || 'null'); return a && a.player ? SAVE_BASE + '_p' + a.player.id : SAVE_BASE; } catch (e) { return SAVE_BASE; } };
let SAVE_KEY = SAVE_KEY_FOR();
const $ = s => document.querySelector(s);
const now = () => Date.now() / 1000;
const rnd = (a, b) => a + Math.random() * (b - a);
const irnd = (a, b) => Math.floor(rnd(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));

const UNITS = ['k', 'm', 'g', 't', 'p', 'e', 'z', 'y'];
function fmt(n) {
  n = Math.floor(n);
  if (Math.abs(n) < 1e4) return n.toLocaleString('uk-UA');
  let u = -1; while (Math.abs(n) >= 1000 && u < UNITS.length - 1) { n /= 1000; u++; }
  const t = Math.abs(n) < 100 ? (Math.floor(n * 10) / 10).toString() : Math.floor(n).toString();
  return t.replace('.', ',') + UNITS[u];
}
function fmtT(s) {
  s = Math.max(0, Math.ceil(s));
  const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
  if (d) return d + 'д ' + h + 'г';
  if (h) return h + 'г ' + String(m).padStart(2, '0') + 'хв';
  if (m) return m + 'хв ' + String(sec).padStart(2, '0') + 'с';
  return sec + 'с';
}
const bizDef = id => BUSINESSES.find(b => b.id === id);
const dayKey = t => { const d = new Date(t * 1000); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };

// ===================================================================
//  Стан гри
// ===================================================================
let S;
const STAT0 = { rides: 0, earned: 0, built: 0, stocked: 0, unloaded: 0, vips: 0, vipTasks: 0, settled: 0, dreams: 0, floorUps: 0, dailyDone: 0,
  bucksEarned: 0, trainings: 0, chests: 0, vipActs: 0, logins: 0, cashed: 0, tips: 0, mazes: 0, keys: 0, xpTotal: 0, revMinRec: 0, revDayRec: 0, revHourRec: 0, happyRec: 0 };
function newResident(opts = {}) {
  const ch = opts.ch || pick(CHARS);
  return { id: S.nextId++, name: pick(FEMALE.has(ch) ? NAMES_F : NAMES_M), ch, dream: opts.dream || pick(BUSINESSES).id, job: null, pos: null, rank: 0, dreamDone: false };
}
function makeBiz(bizId) { return { id: S.nextId++, type: 'biz', biz: bizId, stars: 0, slots: [0, 1, 2].map(() => ({ st: 'empty' })) }; }
function newGame() {
  S = {
    v: 6, coins: BALANCE.startCoins, bucks: BALANCE.startBucks, xp: 0, level: 1, nextId: 1,
    floors: [], residents: [], queue: [], nextVisitorAt: now() + 4, lastTick: now(),
    liftLvl: 1, lobbyLvl: 1, tech: {}, svc: {}, empire: {},
    daily: { day: 0, last: 0 }, dt: null, weather: null,
    cups: {}, cupDone: {}, ach: {}, lastLogin: 0, tipsDay: { date: 0, n: 0 }, revDay: { date: 0, v: 0 }, revLog: [], chestInv: {}, vip: null, profile: { name: 'Власник', ava: 'av_25' }, coll: { items: {}, task: null, day: { date: 0, n: 0 } }, maze: { keys: 3, run: null }, heli: { next: now() + 300, arrived: 0, order: null }, hh: { date: 0, until: 0 }, pass: null,
    stats: { ...STAT0 }, settings: { sound: true, vibro: true },
  };
  try { const l = localStorage.getItem('mx_lang'); if (l && LANGS.some(x => x.id === l)) S.settings.lang = l; } catch (e) {} // мова, обрану на екрані входу, зберігаємо
  S.floors.push({ id: S.nextId++, type: 'lobby' });
  S.floors.push({ id: S.nextId++, type: 'hotel', lvl: 1 });
  S.floors.push(makeBiz('fun_0'));
  if (typeof lvlShown !== 'undefined') lvlShown = 0;
  S.tut = { s: 0, hold: 1 }; // нові гравці проходять навчання: перші жителі приїдуть ліфтом
}
function load() {
  try { const d = localStorage.getItem(SAVE_KEY); if (d) { S = JSON.parse(d); fixSave(); return true; } } catch (e) {}
  newGame(); return false;
}
function fixSave() {
  const d = { queue: [], liftLvl: 1, lobbyLvl: 1, tech: {}, svc: {}, empire: {}, daily: { day: 0, last: 0 }, dt: null, weather: null,
    cups: {}, cupDone: {}, ach: {}, lastLogin: 0, tipsDay: { date: 0, n: 0 }, revDay: { date: 0, v: 0 }, revLog: [], chestInv: {}, vip: null, profile: { name: 'Власник', ava: 'av_25' }, coll: { items: {}, task: null, day: { date: 0, n: 0 } }, maze: { keys: 3, run: null }, heli: { next: now() + 300, arrived: 0, order: null }, hh: { date: 0, until: 0 }, pass: null, settings: { sound: true, vibro: true } };
  for (const k in d) if (S[k] === undefined) S[k] = d[k];
  S.stats = { ...STAT0, ...(S.stats || {}) };
  // ремонт старих збережень: сервер міг перетворити порожні {} на [] — через це губились отримані нагороди
  const obj = (o, k) => { if (o && Array.isArray(o[k])) { const a = o[k]; o[k] = {}; a.forEach((v, i) => { if (v != null) o[k][i] = v; }); } };
  ['tech', 'svc', 'empire', 'cups', 'cupDone', 'ach', 'chestInv', 'lottoInv', 'stats'].forEach(k => obj(S, k));
  if (S.dt) ['p', 'claimed', 't'].forEach(k => obj(S.dt, k));
  if (S.pass) ['f', 'p'].forEach(k => obj(S.pass, k));
  if (S.coll) obj(S.coll, 'items');
  if (S.vip && !Array.isArray(S.vip.list)) S.vip = null;
  delete S.vipReq;
  if (S.weather && S.weather.until - now() > 12 * 3600 + 5) S.weather.until = 0;
  if (S.weather && !S.fixW12) { S.weather.until = 0; S.fixW12 = 1; }
  if ((S.fixRevH || 0) < 2) { S.stats.revHourRec = 0; S.fixRevH = 2; }
  if (!/^av_/.test(S.profile.ava)) S.profile.ava = 'av_25';
}
let saveT = null;
function saveNow() { clearTimeout(saveT); saveT = null; try { S.lastSeen = now(); localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
function save() { S.lastSeen = now(); if (!saveT) saveT = setTimeout(saveNow, 400); if (typeof netMarkDirty === 'function') netMarkDirty(); }
addEventListener('pagehide', () => saveNow()); document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

// ---------- Довідкові функції ----------
const hotel = () => S.floors.find(f => f.type === 'hotel');
const hotelCap = () => HOTEL.capacity(hotel().lvl);
const unemployed = () => S.residents.filter(r => !r.job).length;
const hotelFree = () => unemployed() < hotelCap();
const workersOf = f => S.residents.filter(r => r.job === f.id);
const workerAt = (f, i) => S.residents.find(r => r.job === f.id && r.pos === i);
const floorById = id => S.floors.find(f => f.id === id);
const floorIndex = f => S.floors.indexOf(f);
const floorEl = f => document.querySelector('.floor[data-id="' + f.id + '"]');
const tech = id => S.tech[id] || 0;
const techTotal = () => TECH.reduce((a, t) => a + tech(t.id), 0);
const emp = id => S.empire[id] || 0;
const svcOn = (id, at = now()) => !!S.svc[id] && S.svc[id].until > at;
const svcPct = id => svcOn(id) ? (S.svc[id].pct || 0) : 0;
const cupBonus = () => CUP_BONUS * Object.keys(S.cups).length;
// бонуси споруд корпорації (діють, поки гравець у корпорації)
const corpLvl = k => { if (typeof NET === 'undefined' || !NET.corp || !NET.corp.bld) return 0; const l = +NET.corp.bld[k] || 0, b = NET.corp.boost && NET.corp.boost[k] > Date.now() / 1000; return b ? l * 2 : l; };
const incomeMult = () => (1 + svcPct('marketing') / 100) * (1 + cupBonus()) * (1 + 0.03 * corpLvl('rev'));
const curWeather = () => WEATHER.find(w => w.id === (S.weather && S.weather.id)) || WEATHER[0];
const WB = () => curWeather().bonus || {};
const hhOn = () => !!S.hh && S.hh.until > now();
const xpMult = () => (1 + svcPct('pr') / 100) * (1 + cupBonus()) * (1 + (WB().xp || 0) / 100) * (1 + 0.03 * corpLvl('xp'));
const empMult = (cat, kind) => 1 + EMPIRE.filter(e => e.cat === cat && e.kind === kind).reduce((a, e) => a + emp(e.id) * EMPIRE_STEP, 0);
const builtIds = () => new Set(S.floors.filter(f => f.type === 'biz').map(f => f.biz));
const bizFloors = () => S.floors.filter(f => f.type === 'biz');
const floorCur = () => floorPrice(S.floors.length)[1] === 'b' ? 'bucks' : 'coins';
const roundP = (n, cur) => cur === 'bucks' ? Math.max(1, Math.round(n)) : n >= 100 ? Math.round(n / 10) * 10 : Math.round(n);
const floorCostBase = () => roundP(floorPrice(S.floors.length)[0] * (1 - 0.03 * tech('loader')), floorCur());
const floorCost = () => roundP(floorCostBase() * (1 - (S.cert || 0) / 100) * (1 - promoPct('build') / 100), floorCur());
const towerFull = () => S.floors.length > MAX_FLOOR;
const buildTime = () => BALANCE.buildTime(S.floors.length) * (1 - 0.03 * tech('crane'));
// Прискорення: 1 банкнота за кожні 5 хвилин
const skipCost = (rem, build) => promoDisc('skip', build ? Math.max(10, Math.ceil(rem / 300) * 10 * (1 - 0.03 * tech('excavator')) | 0) : Math.max(1, Math.ceil(rem / 300)));
const liftCap = () => LIFT.cap(S.liftLvl);
const lobbyCap = () => LOBBY.cap(S.lobbyLvl) + 5 * tech('bus') + 5 * corpLvl('lobby');
const isHappy = r => r.job && floorById(r.job) && floorById(r.job).biz === r.dream;
const happyCount = () => S.residents.filter(isHappy).length;
const tipLimit = () => BALANCE.tipBase + S.level + tech('taxi') + corpLvl('tips');

function tier(f, i) {
  const b = bizDef(f.biz), t = TIERS[i], s = f.stars, w = workerAt(f, i);
  const happy = workersOf(f).filter(isHappy).length;
  return {
    deliver: (S.tut && !S.tut.done) ? 4 : Math.round(t.deliver * b.pace * (1 - 0.01 * tech('truck')) / (hhOn() ? HAPPY_HOUR.speed : 1)),
    sell: (S.tut && !S.tut.done) ? 5 : Math.round(t.sell * b.pace * FLOOR_UP.sell(s) * (1 - 0.01 * tech('forklift')) * (1 - expBonus(w).sell / 100) / (hhOn() ? HAPPY_HOUR.speed : 1)),
    qty: t.qty,
    cost: Math.round(t.cost * b.mult * FLOOR_UP.buy(s) * (1 - HAPPY_DISCOUNT * happy)),
    value: Math.round(t.qty * t.price * b.mult * FLOOR_UP.price(s) * (1 + (w ? RANKS[w.rank || 0].bonus : 0)) * (1 + expBonus(w).rev / 100) * empMult(b.cat, 'rev') * (b.cat === 'food' ? 1 + (WB().foodRev || 0) / 100 : 1)),
    xp: Math.round(t.xp * FLOOR_UP.xp(s) * empMult(b.cat, 'xp') * (1 + expBonus(w).xp / 100)),
  };
}

// ===================================================================
//  Звук і вібрація
// ===================================================================
let actx = null;
function sfx(kind) {
  return; // прості синтезовані звуки вимкнено — у грі лише фонова музика
  if (!S.settings.sound || (S.settings.vol ?? 80) <= 0) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const seq = {
      coin: [[988, .06], [1319, .12]], click: [[660, .04]], build: [[220, .08], [330, .08], [440, .14]],
      level: [[523, .1], [659, .1], [784, .1], [1047, .25]], chest: [[392, .08], [523, .08], [659, .08], [784, .08], [1047, .3]],
      ding: [[1175, .08], [880, .2]], buy: [[700, .05], [900, .1]], err: [[200, .12]], unload: [[440, .05], [550, .05], [660, .08]],
    }[kind] || [[600, .05]];
    let t = actx.currentTime;
    for (const [f, d] of seq) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = kind === 'err' ? 'square' : 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, .2 * (S.settings.vol ?? 80) / 100), t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d + .02); t += d * .8;
    }
  } catch (e) {}
}
const vibrate = ms => { if (S.settings.vibro && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} };

// ===================================================================
//  Ресурси, досвід
// ===================================================================
function gainBucks(n) { n = Math.floor(n); if (n <= 0) return 0; S.bucks += n; S.stats.bucksEarned += n; return n; }
function addCoins(n, el) { n = Math.floor(n); if (n <= 0) return; S.coins += n; if (el) coinFly(el, COIN, '#coins', n); popRes('#coins'); }
function addBucks(n, el) { n = gainBucks(n); if (!n) return; if (el) coinFly(el, BUCK, '#bucks', n); popRes('#bucks'); }
function noCoins() { toast('Не вистачає монет — обміняй банкноти', COIN, true); sfx('err'); setTimeout(() => openShop('exchange'), 350); }
function noBucks() { toast('Не вистачає банкнот', BUCK, true); sfx('err'); setTimeout(() => openDonate(), 350); }
function spendCoins(n) { if (S.coins < n) { noCoins(); return false; } S.coins -= n; return true; }
function spendBucks(n) {
  if (S.bucks < n) { noBucks(); return false; }
  S.bucks -= n; dtProg('spend', n); return true;
}
const spend = (p, cur) => cur === 'bucks' ? spendBucks(p) : spendCoins(p);
function addXP(n) {
  n = Math.round(n * xpMult()); if (n <= 0) return;
  S.xp += n; S.stats.xpTotal += n; dtProg('xp', n);
  let need = BALANCE.xpForLevel(S.level);
  while (S.xp >= need) { S.xp -= need; S.level++; gainBucks(BALANCE.levelUpBucks); showLevelUp(S.level); netEvent('level', S.level); if (S.level % 10 === 0 && S.level <= 120) sendMail({ from: 'Мер міста', icon: 'star3', title: `Рівень ${S.level}!`, text: 'Вітаємо з новим досягненням! Ось подарунок від міста.', reward: { kind: 'bucks', n: 50 } }); need = BALANCE.xpForLevel(S.level); }
}
let liveTick = true;
function recordRev(amt) {
  const t = now(), k = dayKey(t);
  if (S.revDay.date !== k) S.revDay = { date: k, v: 0 };
  S.revDay.v += amt; S.stats.revDayRec = Math.max(S.stats.revDayRec, S.revDay.v);
  if (!liveTick) return;
  S.revLog.push([t, amt]); S.revLog = S.revLog.filter(x => x[0] > t - 60);
  S.stats.revMinRec = Math.max(S.stats.revMinRec, S.revLog.reduce((a, x) => a + x[1], 0));
}

// ===================================================================
//  Щоденні завдання (оновлення о 00:00)
// ===================================================================
function ensureDaily() {
  const k = dayKey(now());
  if (!S.dt || S.dt.date !== k) S.dt = { date: k, lvl: S.level, p: {}, claimed: {}, bonus: false };
}
// Ціль завдання фіксується в момент його появи: підвищення рівня не «забирає» вже виконане — нові вимоги будуть у наступних завданнях
const dtTarget = t => { S.dt.t = S.dt.t || {}; if (S.dt.t[t.id] == null) S.dt.t[t.id] = t.n(S.dt.lvl || S.level); return S.dt.t[t.id]; };
function dtProg(id, n = 1) {
  ensureDaily();
  const t = DAILY_TASKS.find(x => x.id === id); if (!t) return;
  const before = S.dt.p[id] || 0, target = dtTarget(t);
  S.dt.p[id] = Math.min(target, before + n);
  if (before < target && S.dt.p[id] >= target) { toast(`Щоденне «${t.name}» виконано!`, t.icon); sfx('ding'); }
}
const dtReady = t => (S.dt.p[t.id] || 0) >= dtTarget(t) && !S.dt.claimed[t.id];
function addKeys(n, el) { S.maze.keys += n; S.stats.keys += n; if (el) coinFly(el, 'keys', '#res-bucks', n); }
// ---------- Акції адміністрації: знижки по категоріях і донат-бонуси (з власним таймером) ----------
const PROMO_CATS = { build: ['Будівництво поверхів', 'crane'], upgrade: ['Покращення', 'ach_growth'], tech: ['Техніка', 'truck'], services: ['Послуги', 'marketing'],
  staff: ['Персонал', 'friends'], chests: ['Скрині', 'chest_purple'], keys: ['Ключі', 'keys'], lotto: ['Лотерея', 'lt_2'], skip: ['Прискорення', 'stopwatch'], pass: ['Преміум-пропуск', 'ach_laurel'] };
function activePromos(type) { const t = now(); return ((typeof NET !== 'undefined' && NET.promos) || []).filter(p => (p.type === 'donate' || p.type === 'discount') && +p.pct > 0 && (!type || p.type === type) && p.start <= t && p.end > t); }
function promoPct(cat) { let m = 0; for (const p of activePromos('discount')) if ((p.cats || []).includes(cat)) m = Math.max(m, +p.pct || 0); return Math.min(90, m); }
function promoDisc(cat, v) { const p = promoPct(cat); return p && v > 0 ? Math.max(1, Math.round(v * (1 - p / 100))) : v; }
function donateBonus(i) { let pct = 0, rw = [], end = 0; for (const p of activePromos('donate')) if (+p.pack === -1 || +p.pack === i) { pct = Math.max(pct, +p.pct || 0); rw = rw.concat(p.rewards || []); end = Math.max(end, p.end); } return { pct, rw, end }; }
function promoInstall() {
  const prop = (o, k, cat) => { const base = o[k]; if (typeof base === 'function') o[k] = (...a) => promoDisc(cat, base(...a)); else if (typeof base === 'number') Object.defineProperty(o, k, { get: () => promoDisc(cat, base), set: v => {}, configurable: true, enumerable: true }); };
  TECH.forEach(t => prop(t, 'price', 'tech'));
  Object.values(SERVICES).forEach(sv => prop(sv, 'price', 'services'));
  prop(LIFT, 'cost', 'upgrade'); prop(LOBBY, 'cost', 'upgrade'); prop(HOTEL, 'upgradeCost', 'upgrade'); FLOOR_UP.costs.forEach((_, i) => prop(FLOOR_UP.costs, i, 'upgrade'));
  ['price', 'specPrice', 'refresh'].forEach(k => prop(JOBC, k, 'staff')); EXPERT_UP.forEach(e => prop(e, 'cost', 'staff')); RANKS.forEach(r => { if (r.cost) prop(r, 'cost', 'staff'); });
  CHESTS.forEach(c => prop(c, 'price', 'chests'));
  Object.keys(MAZE.shop).filter(k => /^key\d+$/.test(k)).forEach(k => prop(MAZE.shop, k, 'keys'));
  LOTTERY.forEach(T => prop(T, 'price', 'lotto'));
  prop(PASS, 'premium', 'pass');
}
const promoTxt = p => p.type === 'donate' ? `+${p.pct}% ${tr('банкнот')}${+p.pack >= 0 && DONATE[+p.pack] ? ' · ' + tr('пакет') + ' ' + fmt(DONATE[+p.pack].bucks) : ''}` : `−${p.pct}% · ${(p.cats || []).map(c => PROMO_CATS[c] ? tr(PROMO_CATS[c][0]) : c).join(', ')}`;

// Кожна нагорода має унікальний ключ і перевіряється сервером: отримати її двічі неможливо, навіть якщо стан гри відкотився
async function guardClaim(key, onDup) {
  if (typeof NET === 'undefined' || !NET.auth) return true;
  if (!NET.online) { toast(tr('Щоб отримати нагороду, потрібне з’єднання з сервером'), 'phone', true); return false; }
  if (NET.claiming) return false;
  NET.claiming = true;
  try {
    const r = await api('reward_claim', { key });
    if (!r.ok) { toast(netErr(r.error), 'phone', true); return false; }
    if (!r.fresh) { if (onDup) onDup(); save(); render(); if (typeof modalRefresh === 'function' && modalRefresh) modalRefresh(); toast(tr('Цю нагороду вже отримано'), 'lock', true); return false; }
    return true;
  } finally { NET.claiming = false; }
}
// ===================================================================
//  Щотижневий турнір кубків (пн–сб, неділя — відпочинок). Кубки рахує сервер.
// ===================================================================
const TOUR = { info: null, busy: false };
function tourCupsFor(date, id) { let h = 0; for (const c of date + ':' + id) h = (h * 31 + c.charCodeAt(0)) % 1000003; return 2 + h % 4; }
async function tourLoad(corp) {
  if (!NET.auth || !NET.online || TOUR.busy) return TOUR.info; TOUR.busy = true;
  try { const r = await api('tour', corp ? { corp: 1 } : {}); if (r.ok) TOUR.info = { ...(TOUR.info || {}), ...r }; } finally { TOUR.busy = false; }
  return TOUR.info;
}
const tourTimer = T => T.active ? `${tr('До кінця')}: <b data-end="${T.end}">${fmtT(T.end - now())}</b>` : `${tr('Неділя — відпочинок')} · ${tr('старт через')} <b data-end="${T.next}">${fmtT(T.next - now())}</b>`;
function tourBlock(kind) {
  const T = TOUR.info;
  if (!T) return `<div class="tour-box"><img src="${IMG('ach_cup')}" alt=""><div class="grow"><b>${tr('Турнір кубків')}</b><small>${tr('Завантаження…')}</small></div></div>`;
  const me = kind === 'corp' ? (T.corp || { cups: 0, place: 0 }) : T.me;
  return `<div class="tour-box ${T.active ? '' : 'rest'}"><img src="${IMG('ach_cup')}" alt=""><div class="grow"><b>${kind === 'corp' ? tr('Турнір корпорацій') : tr('Турнір кубків')}</b><small>${tourTimer(T)}</small></div>
    <div class="tour-me"><b>${fmt(me.cups)}</b><small>${tr('кубків')}</small></div><div class="tour-me"><b>${me.place ? '#' + me.place : '—'}</b><small>${tr('місце')}</small></div>
    <button class="btn gold shine tour-btn" data-a="tourtop" data-v="${kind}">${tr('Рейтинг')}</button></div>`;
}
const tourChip = n => `<span class="tour-chip"><img src="${IMG('ach_cup')}" alt="">+${n}</span>`;
async function openTour(kind = 'p', back) {
  if (!NET.online) return toast(netErr('offline'), 'ach_cup', true);
  let tab = kind === 'corp' ? 'corp' : 'p';
  const draw = () => { const T = TOUR.info || {}, corp = tab === 'corp', top = (corp ? T.ctop : T.top) || [], prize = corp ? T.prizeC || [] : T.prizeP || [], me = corp ? T.corp : T.me;
    let h = `<div class="seg2">${[['p', 'Гравці'], ['corp', 'Корпорації']].map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-a="tt" data-v="${k}">${tr(n)}</button>`).join('')}</div>`;
    h += `<div class="tour-head ${T.active ? '' : 'rest'}"><img src="${IMG('ach_cup')}" alt=""><div class="grow"><b>${corp ? tr('Турнір корпорацій') : tr('Турнір кубків')}</b><small>${T.end ? tourTimer(T) : ''}</small></div></div>`;
    h += `<div class="tour-list">${top.map((r, i) => `<div class="tour-row ${i < 3 ? 'p' + (i + 1) : ''} ${(!corp && +r.id === NET.auth.player.id) || (corp && NET.corp && +r.id === +NET.corp.id) ? 'me' : ''}" ${corp ? '' : `data-a="pl" data-v="${r.id}"`}>
        <b class="tr-pl">${placeIc ? placeIc(i + 1) : i + 1}</b>${corp ? `<img class="tr-em" src="${CSRC(r.emblem)}" alt="">` : `<span class="fav">${avHTML(r.avatar)}</span>`}
        <span class="tr-n">${nk(r.name)}</span><span class="tr-c"><img src="${IMG('ach_cup')}" alt="">${fmt(r.cups)}</span><span class="tr-p">+${fmt(prize[i] || 0)}<img src="${IMG(BUCK)}" alt=""></span></div>`).join('') || `<div class="note small">${tr('Ще ніхто не здобув кубків цього тижня — стань першим!')}</div>`}</div>`;
    if (me && me.place > 10) h += `<div class="tour-row me"><b class="tr-pl">#${me.place}</b><span class="tr-n">${corp ? tr('Твоя корпорація') : tr('Ти')}</span><span class="tr-c"><img src="${IMG('ach_cup')}" alt="">${fmt(me.cups)}</span></div>`;
    const rule = (ic, t, d) => `<div class="tr-rule"><img src="${IMG(ic)}" alt=""><div><b>${tr(t)}</b><span>${d}</span></div></div>`;
    h += `<div class="tour-rules"><div class="tr-title"><img src="${IMG('ach_cup')}" alt="">${tr('Як проходить турнір')}</div>` + (corp
      ? rule('clipboard', 'Кубки за завдання', `${tr('Кожне виконане завдання корпорації приносить')} <b>${tr('від 2 до 5 кубків')}</b> — ${tr('кількість випадкова, як і ключі.')}`)
        + rule('stopwatch', 'Тривалість', `<b>${tr('З понеділка по суботу')}</b> ${tr('за київським часом. У неділю — відпочинок: кубки не видаються, підбиваються підсумки.')}`)
        + rule('bz_office', 'Кожній корпорації-учасниці', `${tr('У бюджет')}: <b>3</b> <img class="ri" src="${IMG(BUCK)}"> ${tr('та')} <b>5 000</b> <img class="ri" src="${IMG(COIN)}"> ${tr('за кожен кубок')}.`)
        + rule('megaphone2', 'Підсумки', tr('Результати з’являються в новинах, а в чат корпорації приходить повідомлення про зібрані кубки, місце та нагороду.'))
      : rule('clipboard', 'Кубки за завдання', `${tr('Кожне виконане щоденне завдання приносить')} <b>${tr('від 2 до 5 кубків')}</b> — ${tr('кількість випадкова, як і ключі.')}`)
        + rule('stopwatch', 'Тривалість', `<b>${tr('З понеділка по суботу')}</b> ${tr('за київським часом. У неділю — відпочинок: кубки не видаються, підбиваються підсумки.')}`)
        + rule('friends', 'Усім учасникам поза ТОП-10', `<b>1</b> <img class="ri" src="${IMG(BUCK)}"> ${tr('за кожні 10 кубків і')} <b>250</b> <img class="ri" src="${IMG(COIN)}"> ${tr('за кожен кубок')}.`)
        + rule('mail2', 'Нагороди', tr('Приходять на пошту одразу після завершення турніру, а переможці потрапляють у новини.')));
    h += `<div class="tr-title sm"><img src="${IMG(BUCK)}" alt="">${corp ? tr('Призи в бюджет за місця') : tr('Призи за місця')}</div><div class="tr-prizes">${prize.map((v, i) => `<div class="${i < 3 ? 'p' + (i + 1) : ''}"><b>${i < 3 ? placeIc(i + 1) : i + 1}</b><span><img src="${IMG(BUCK)}" alt="">${fmt(v)}</span></div>`).join('')}</div></div>`;
    return h; };
  setTimeout(() => { modalBack = back || null; });
  openModal({ icon: 'ach_cup', title: 'Турнір', sub: 'Щотижня з понеділка по суботу', color: '#c98a0a' }, draw,
    { tt: v => { tab = v; $('#m-body')._h = null; modalRefresh(); }, pl: v => openPlayer(+v, () => openTour(tab, back)) });
  $('#modal').classList.add('tall');
  await tourLoad(true); if (modalRefresh) { $('#m-body')._h = null; modalRefresh(); }
}
async function tourClaim(id) {
  const T = TOUR.info; if (!T || !T.active || !NET.online) return;
  const r = await api('tour_cup', { id }); if (!r.ok) return;
  T.me = r.me || T.me; toast(`+${r.cups} ${tr('кубків турніру')} 🏆`, 'ach_cup', true);
  if (typeof modalRefresh === 'function' && modalRefresh && $('#m-body .tour-box')) { $('#m-body')._h = null; modalRefresh(); }
}
async function claimDt(id, el) {
  const t = DAILY_TASKS.find(x => x.id === id); if (!t || !dtReady(t)) return;
  if (!await guardClaim('dt:' + S.dt.date + ':' + id, () => { S.dt.claimed[id] = true; })) return;
  if (!dtReady(t)) return;
  passAdd('daily');
  S.dt.claimed[id] = true; S.stats.dailyDone++;
  const keys = irnd(3, 10), xp = 50 * S.level;
  addBucks(t.bucks || 2, el); addCoins(100 * S.level, el); addKeys(keys); toast(`+${keys} ключів до лабіринту · +${fmt(xp)} досвіду`, 'keys'); sfx('coin'); save(); render(); addXP(xp); save();
  tourClaim(id);
}
async function claimDtBonus() {
  if (S.dt.bonus || !DAILY_TASKS.every(t => S.dt.claimed[t.id])) return;
  if (!await guardClaim('dtb:' + S.dt.date, () => { S.dt.bonus = true; }) || S.dt.bonus) return;
  S.dt.bonus = true;
  const got = [0, 1, 2].map(() => { const r = Math.random(); return r < .55 ? 'wood' : r < .85 ? 'blue' : r < .97 ? 'purple' : 'red'; });
  got.forEach(id => { S.chestInv[id] = (S.chestInv[id] || 0) + 1; });
  closeModal(); save(); render();
  showReward({ title: 'Усі завдання дня!', img: 'chest_purple', name: '3 скрині в «Мої скрині»', items: got.map(id => { const c = CHESTS.find(x => x.id === id); return { img: c.icon, text: c.name }; }), text: 'Відкрий їх у «Мої скрині» на даху.' });
}

// ===================================================================
//  Кубки (набори завдань) і досягнення
// ===================================================================
function cupVal(k) {
  switch (k) {
    case 'revMin': return S.stats.revMinRec;
    case 'revDay': return S.stats.revDayRec;
    case 'happy': return S.stats.happyRec;
    case 'liftLvl': return S.liftLvl;
    case 'empireAll': return Math.min(...EMPIRE.map(e => emp(e.id))) * 5;
    case 'stars5': return bizFloors().filter(f => f.stars >= 5).length;
    case 'techTotal': return techTotal();
    case 'biz': return bizFloors().length;
  }
  return S.stats[k] || 0;
}
const cupTaskDone = (i, j) => !!S.cupDone[i + '_' + j];
function checkCups() {
  S.stats.happyRec = Math.max(S.stats.happyRec, happyCount());
  TROPHIES.forEach((t, i) => t.tasks.forEach(([k, n], j) => { if (!cupTaskDone(i, j) && cupVal(k) >= n) S.cupDone[i + '_' + j] = 1; }));
}
const cupDoneCount = i => TROPHIES[i].tasks.filter((_, j) => cupTaskDone(i, j)).length;
const cupReady = i => !S.cups[i] && (i === 0 || S.cups[i - 1]) && cupDoneCount(i) === TROPHIES[i].tasks.length;
const currentCup = () => { const i = TROPHIES.findIndex((_, k) => !S.cups[k]); return i < 0 ? TROPHIES.length - 1 : i; };
async function claimTrophy(i) {
  if (!cupReady(i)) return;
  if (!await guardClaim('cup:' + i, () => { S.cups[i] = now(); }) || !cupReady(i)) return;
  const rw = CUP_REWARD(i);
  S.cups[i] = now(); gainBucks(rw.bucks); S.coins += rw.coins; closeModal(); save(); render();
  showReward({ title: 'Новий кубок!', img: 'cup_' + (i + 1), name: TROPHIES[i].name, items: [{ img: 'cup_' + (i + 1), text: 'Кубок' }, { img: BUCK, text: '+' + rw.bucks }, { img: 'coins_heap', text: '+' + fmt(rw.coins) }, { img: 'star3', text: '+' + fmt(rw.xp) + ' XP' }], text: `Кубок додано в профіль: +${Math.round(CUP_BONUS * 100)}% до виручки й досвіду назавжди (разом +${Math.round(cupBonus() * 100)}%).` });
  addXP(rw.xp); save(); render();
}
function achStat(a) {
  if (a.stat === 'residents') return S.stats.settled;
  if (a.stat === 'trophies') return Object.keys(S.cups).length;
  if (a.stat === 'empire') return EMPIRE.reduce((x, e) => x + emp(e.id), 0);
  if (a.stat === 'collDone' || a.stat === 'lotto' || a.stat === 'evicted' || a.stat === 'expertUps') return S.stats[a.stat] || 0;
  return S.stats[a.stat] || 0;
}
const achTier = a => S.ach[a.name] || 0;
const achReady = a => achTier(a) < 5 && achStat(a) >= a.tiers[achTier(a)];
async function claimAch(i, el) {
  const a = ACHIEVEMENTS[i]; if (!achReady(a)) return;
  const t0 = achTier(a);
  if (!await guardClaim('ach:' + a.name + ':' + (t0 + 1), () => { S.ach[a.name] = Math.max(achTier(a), t0 + 1); }) || !achReady(a) || achTier(a) !== t0) return;
  const t = achTier(a); S.ach[a.name] = t + 1; addBucks(ACH_REWARD[t], el); sfx('level'); save(); render();
  toast(`Досягнення «${a.name}» — ступінь ${t + 1}!`, a.img);
}
const countClaimable = () => ({
  dt: S.dt ? DAILY_TASKS.filter(dtReady).length + (DAILY_TASKS.every(t => S.dt.claimed[t.id]) && !S.dt.bonus ? 1 : 0) : 0,
  cups: TROPHIES.filter((_, i) => cupReady(i)).length,
  ach: ACHIEVEMENTS.filter(achReady).length,
});

// ===================================================================
//  Цикл товару: закупка → доставка → викладка → продаж → виручка
// ===================================================================
function buyAt(f, i, at) {
  const t = tier(f, i);
  if (S.coins < t.cost) return false;
  S.coins -= t.cost;
  Object.assign(f.slots[i], { st: 'deliver', until: at + t.deliver, dur: t.deliver });
  S.stats.stocked++; dtProg('stocked'); vipHook('stock', f); addXP(1 + 5000 * tech('truck'));
  return true;
}
function unloadAt(f, i, at) {
  const t = tier(f, i);
  Object.assign(f.slots[i], { st: 'sell', until: at + t.sell, dur: t.sell, total: t.value });
  S.stats.unloaded++; dtProg('unload'); vipHook('unload', f); addXP(t.xp + 5000 * tech('forklift'));
}
function cashSlot(f, i) {
  const s = f.slots[i]; if (s.st !== 'cash') return 0;
  const b = bizDef(f.biz);
  const amt = Math.floor(s.amt * (1 + 0.05 * tech('armored')));
  s.st = 'empty'; delete s.amt;
  S.stats.earned += amt; S.stats.cashed++; dtProg('cashed'); vipHook('cash', f); recordRev(amt);
  addXP(Math.max(1, amt / 50 * (1 + 0.1 * tech('armored')) * FLOOR_UP.xp(f.stars) * empMult(b.cat, 'xp')));
  return amt;
}
// табло виручки на даху під VIP-завданнями — оновлюється наживо
let revBoardV = '';
function updRevBoard() {
  const v = revHourRate(); S.stats.revHourRec = Math.max(S.stats.revHourRec || 0, v);
  const key = v + '|' + S.stats.revHourRec; if (key === revBoardV) return;
  const up = revBoardV && v > +revBoardV.split('|')[0], down = revBoardV && v < +revBoardV.split('|')[0];
  revBoardV = key;
  const n = document.getElementById('rev-now'), r = document.getElementById('rev-rec'); if (!n) return;
  n.textContent = fmt(v); r.textContent = fmt(S.stats.revHourRec);
  const b = document.getElementById('rev-board'); if (b && (up || down)) { b.classList.remove('up', 'down'); void b.offsetWidth; b.classList.add(up ? 'up' : 'down'); }
}
// ---------- VIP-завдання (до 3 на день) ----------
function vipHook() {}
function newVipReq() {}
function ensureVip() {
  const k = dayKey(now());
  if (S.vip && S.vip.date === k) return;
  const pool = [...VIP_TASKS].sort(() => Math.random() - .5).slice(0, VIP_PER_DAY);
  S.vip = { date: k, lvl: S.level, list: pool.map(t => ({ id: t.id, n: t.n(S.level), base: t.stat ? (S.stats[t.stat] || 0) : 0, claimed: false, exp: now() + TASK_HOURS * 3600 })) };
}
function expireTasks() {
  if (S.vip) { const n0 = S.vip.list.length; S.vip.list = S.vip.list.filter(q => q.claimed || vipReady(q) || !q.exp || q.exp > now()); if (S.vip.list.length < n0) toast('VIP-завдання згоріло — час вийшов', 'vip2'); }
  const c = S.coll.task; if (c && c.exp && c.exp <= now() && !collReady()) { S.coll.task = null; toast('Завдання колекції згоріло — час вийшов', 'cards'); }
}
const vipDef = q => VIP_TASKS.find(t => t.id === q.id);
function vipProg(q) {
  const t = vipDef(q); if (!t) return 0;
  if (t.all) return S.dt && DAILY_TASKS.every(x => S.dt.claimed[x.id]) ? 1 : 0;
  return Math.max(0, (S.stats[t.stat] || 0) - q.base);
}
const vipReady = q => !q.claimed && vipProg(q) >= q.n;
async function claimVip(id) {
  ensureVip(); const q = S.vip.list.find(x => x.id === id); if (!q || !vipReady(q)) return;
  if (!await guardClaim('vip:' + S.vip.date + ':' + id, () => { q.claimed = true; }) || q.claimed) return;
  q.claimed = true; S.stats.vipTasks++; passAdd('vip');
  const rw = VIP_REWARD(S.vip.lvl), ch = CHESTS.find(c => c.id === rw.chest);
  gainBucks(rw.bucks); S.coins += rw.coins; S.chestInv[rw.chest] = (S.chestInv[rw.chest] || 0) + 1; addKeys(1);
  closeModal(); save(); render();
  showReward({ title: 'VIP-завдання!', img: 'vip2', name: vipDef(q).text(q.n), items: [{ img: BUCK, text: '+' + rw.bucks }, { img: 'coins_heap', text: '+' + fmt(rw.coins) }, { img: 'star3', text: '+' + fmt(rw.xp) + ' XP' }, { img: ch.icon, text: ch.name + ' скриня' }, { img: 'keys', text: '+1 ключ' }], text: 'Скриня чекає в «Мої скрині».' });
  addXP(rw.xp); save(); render();
}
// ---------- Колекції ----------
const AVATARS = Array.from({ length: 50 }, (_, i) => 'av_' + (i + 1));
const avHTML = (id, cls = '') => { const i = (+String(id).split('_')[1] || 25) - 1; return `<span class="av ${cls}" style="background-position:${(i % 10) / 9 * 100}% ${Math.floor(i / 10) / 4 * 100}%"></span>`; };
function collDay() { const k = dayKey(now()); if (S.coll.day.date !== k) S.coll.day = { date: k, n: 0 }; return S.coll.day; }
const collHave = (c, i) => S.coll.items[c.id + '_' + i] || 0;
const collComplete = c => c.items.every((_, i) => collHave(c, i) > 0);
function collTarget(t, q) { const n = t.base * (1 + 0.6 * q) * (1 + 0.08 * S.level); return t.id === 'earn' ? Math.round(n / 100) * 100 : Math.max(1, Math.round(n)); }
function takeCollTask() {
  if (S.coll.task) return; const d = collDay();
  if (d.n >= COLL_PER_DAY) { toast('На сьогодні завдання колекцій закінчились', 'cards'); sfx('err'); return; }
  const W = [24, 20, 16, 13, 10, 8, 5, 4]; let r = Math.random() * W.reduce((a, b) => a + b), ci = 0; while ((r -= W[ci]) > 0) ci++;
  const q = ci, t = pick(COLL_TASKS);
  S.coll.task = { c: COLLECTIONS[ci].id, q, kind: t.id, n: collTarget(t, q), base: S.stats[t.stat] || 0, exp: now() + TASK_HOURS * 3600 };
  d.n++; sfx('ding'); save(); render();
}
const collTaskDef = () => S.coll.task && COLL_TASKS.find(t => t.id === S.coll.task.kind);
const collProg = () => { const q = S.coll.task, t = collTaskDef(); return q && t ? Math.max(0, (S.stats[t.stat] || 0) - q.base) : 0; };
const collReady = () => !!S.coll.task && collProg() >= S.coll.task.n;
async function claimCollTask() {
  if (!collReady()) return;
  const ck = 'coll:' + Math.round(S.coll.task.exp);
  if (!await guardClaim(ck, () => { S.coll.task = null; }) || !collReady()) return;
  const c = COLLECTIONS.find(x => x.id === S.coll.task.c), i = irnd(0, 7), key = c.id + '_' + i;
  S.coll.items[key] = (S.coll.items[key] || 0) + 1; S.coll.task = null; dtProg('coll'); passAdd('coll'); S.stats.collParts = (S.stats.collParts || 0) + 1; addKeys(1);
  save(); render();
  showReward({ title: 'Частинка колекції!', img: c.items[i][1], flip: true, name: `${c.items[i][0]} · «${c.name}»`, items: [{ img: c.items[i][1], text: '×' + S.coll.items[key] }, { img: 'keys', text: '+1 ключ' }], text: collComplete(c) ? 'Колекцію зібрано — її можна обміняти на нагороду!' : `Зібрано ${c.items.filter((_, k) => collHave(c, k)).length} з 8` });
}
function exchangeColl(id) {
  const ci = COLLECTIONS.findIndex(x => x.id === id), c = COLLECTIONS[ci]; if (!c || !collComplete(c)) return;
  c.items.forEach((_, i) => { S.coll.items[c.id + '_' + i]--; });
  const rw = COLL_REWARD(ci), ch = CHESTS.find(x => x.id === rw.chest);
  gainBucks(rw.bucks); S.coins += rw.coins; S.chestInv[rw.chest] = (S.chestInv[rw.chest] || 0) + 1; S.stats.collDone = (S.stats.collDone || 0) + 1;
  closeModal(); save(); render();
  showReward({ title: 'Колекцію обміняно!', img: 'cards', name: `«${c.name}» · ${COLL_QUALITY[ci].name}`, items: [{ img: BUCK, text: '+' + fmt(rw.bucks) }, { img: 'coins_heap', text: '+' + fmt(rw.coins) }, { img: 'star3', text: '+' + fmt(rw.xp) + ' XP' }, { img: ch.icon, text: ch.name + ' скриня' }], text: 'Збирай далі — колекції можна обмінювати знову.' });
  addXP(rw.xp); save(); render();
}
// Виручка за годину = (Σ виручка поверхів за хвилину) × 60 × (1 + глобальні множники).
// Рахуються лише товари, які зараз продаються (є на вітрині). Виручка товару за хвилину = базова сума продажу / хвилини продажу.
// Виручка за годину = вартість товару, який зараз продається (активний товар на полицях).
// Товар продано — його вартість знімається з виручки; привезли новий — додається.
function revHourRate() {
  let sum = 0;
  for (const f of bizFloors()) f.slots.forEach((s, i) => {
    if (s.st !== 'sell' || !workerAt(f, i)) return;
    sum += s.total || tier(f, i).value;
  });
  return Math.round(sum * incomeMult());
}
function processFloor(f, t) {
  let earned = 0;
  f.slots.forEach((s, i) => {
    const has = !!workerAt(f, i);
    for (let guard = 0; guard < 500; guard++) {
      if (s.st === 'deliver' && s.until <= t) {
        const at = s.until; s.st = 'unload';
        if (svcOn('manager', at)) { unloadAt(f, i, at); continue; }
        break;
      }
      if (s.st === 'sell' && s.until <= t) {
        const at = s.until; s.amt = Math.round(s.total * incomeMult()); s.st = 'cash'; earned += s.amt;
        if (svcOn('manager', at)) { S.coins += cashSlot(f, i); if (has && buyAt(f, i, at)) continue; }
        break;
      }
      if (svcOn('manager', t)) {
        if (s.st === 'unload') { unloadAt(f, i, t); continue; }
        if (s.st === 'cash') { S.coins += cashSlot(f, i); continue; }
        if (s.st === 'empty' && has && buyAt(f, i, t)) continue;
      }
      break;
    }
  });
  return earned;
}
function stock(f, i) {
  if (!workerAt(f, i)) { toast('Недоступно — немає працівника на цій позиції', 'lock'); return; }
  const s = f.slots[i];
  if (s.st === 'cash') { toast('Спершу збери виручку за цей товар', COIN); return; }
  if (s.st !== 'empty') return;
  if (!buyAt(f, i, now())) { noCoins(); return; }
  sfx('buy'); save(); render();
}
function unload(f, i) { if (f.slots[i].st !== 'unload') return; unloadAt(f, i, now()); sfx('unload'); save(); render(); }
function unloadFloor(f) { let n = 0; f.slots.forEach((s, i) => { if (s.st === 'unload') { unloadAt(f, i, now()); n++; } }); return n; }
function buyFloor(f) { let n = 0; f.slots.forEach((s, i) => { if (s.st === 'empty' && workerAt(f, i) && buyAt(f, i, now())) n++; }); return n; }
const buyFloorCost = f => f.slots.reduce((a, s, i) => a + (s.st === 'empty' && workerAt(f, i) ? tier(f, i).cost : 0), 0);
const floorCash = f => f.slots.reduce((a, s) => a + (s.st === 'cash' ? s.amt : 0), 0) * (1 + 0.05 * tech('armored'));
function collectBiz(f, el) {
  let amt = 0; f.slots.forEach((s, i) => { amt += cashSlot(f, i); });
  if (amt) addCoins(amt, el);
  return amt;
}
function floorAction(f, el) {
  if (f.type === 'lobby') return void ride();
  if (f.type === 'hotel') return openHotel();
  if (f.type === 'building') return openBuilding(f);
  if (f.type === 'ready') return cutRibbon(f);
  if (f.slots.some(s => s.st === 'cash')) { collectBiz(f, el); sfx('coin'); vibrate(15); save(); render(); return; }
  if (f.slots.some(s => s.st === 'unload')) { unloadFloor(f); sfx('unload'); sparkleAt(el, 6); save(); render(); return; }
  if (buyFloorCost(f) && workersOf(f).length) { if (!buyFloor(f)) { noCoins(); } else { sfx('buy'); save(); render(); } return; }
  openBiz(f);
}

// ===================================================================
//  Операції по всій вежі (центральна кнопка)
// ===================================================================
const OPS = [
  { id: 'buy',     name: 'Закупка',  icon: 'cart' },
  { id: 'deliver', name: 'Доставка', icon: 't_truck' },
  { id: 'unload',  name: 'Викладка', icon: 'boxes' },
  { id: 'sell',    name: 'Продаж',   icon: 'pos' },
  { id: 'cash',    name: 'Виручка',  icon: 'coins_heap' },
];
function opsFloors(id) {
  const bf = bizFloors();
  if (id === 'buy') return bf.filter(f => buyFloorCost(f) > 0);
  return bf.filter(f => f.slots.some(s => s.st === id));
}
function opsMode() {
  const canBuy = opsFloors('buy').filter(f => f.slots.some((s, i) => s.st === 'empty' && workerAt(f, i) && tier(f, i).cost <= S.coins));
  if (canBuy.length) return { id: 'buy', n: canBuy.length };
  for (const id of ['unload', 'cash', 'deliver', 'sell']) { const n = opsFloors(id).length; if (n) return { id, n }; }
  return null;
}
const floorRem = (f, st) => Math.max(0, ...f.slots.filter(s => s.st === st).map(s => s.until - now()));
function speedFloor(f, st) {
  const rem = floorRem(f, st); if (rem <= 0) return;
  if (!spendBucks(skipCost(rem))) return;
  f.slots.forEach(s => { if (s.st === st) s.until = now(); });
  sfx('level'); tick(); save();
}
function opsAll(id) {
  const fl = opsFloors(id); if (!fl.length) return;
  if (id === 'deliver' || id === 'sell') {
    const cost = fl.reduce((a, f) => a + skipCost(floorRem(f, id)), 0);
    if (!spendBucks(cost)) return;
    fl.forEach(f => f.slots.forEach(s => { if (s.st === id) s.until = now(); }));
    sfx('level'); tick(); save(); return;
  }
  if (!spendBucks(1)) return;
  let total = 0, n = 0;
  fl.forEach(f => {
    if (id === 'buy') n += buyFloor(f);
    if (id === 'unload') n += unloadFloor(f);
    if (id === 'cash') total += collectBiz(f, null);
  });
  if (id === 'cash') { if (total) { addCoins(0); coinFly($('#nav-ops'), COIN, '#coins', total); toast('Зібрано ' + fmt(total) + ' монет', 'coins_heap'); } sfx('coin'); }
  else { sfx(id === 'buy' ? 'buy' : 'unload'); toast(id === 'buy' ? `Закуплено товарів: ${n}` : `Викладено товарів: ${n}`, id === 'buy' ? 'cart' : 'boxes'); }
  vibrate(30); save(); render();
}

// ===================================================================
//  Ігровий цикл
// ===================================================================
let chipsOpen = false;
let riding = false, autoTimer = null, offlineReport = null, cupT = 0;
function tick() {
  const t = now();
  const dt = Math.max(0, Math.min(t - S.lastTick, 7 * 24 * 3600));
  S.lastTick = t; liveTick = dt < 5;
  ensureDaily(); ensureVip(); expireTasks(); heliTick(); ensurePass(); ensureMail();
  const lk = dayKey(t); if (S.lastLogin !== lk) { S.lastLogin = lk; S.stats.logins++; }
  let earned = 0;
  for (const f of S.floors) {
    if (f.type === 'building' && t >= f.until) {
      f.type = 'ready'; sfx('build'); addXP(5);
      toast(`Поверх ${floorIndex(f)} збудовано! Відкрий його`, CATS[f.cat].img);
    }
    if (f.type === 'biz') earned += processFloor(f, t);
  }
  liveTick = true;
  if (dt > 90 && earned > 0) offlineReport = { sold: earned, dt };
  let guard = 0;
  if (S.tut && !S.tut.done && S.tut.hold) S.nextVisitorAt = Math.max(S.nextVisitorAt, t + 3); // під час навчання гості — лише навчальні
  while (S.queue.length < lobbyCap() && t >= S.nextVisitorAt && guard++ < 100) {
    const v = makeVisitor(); if (!v) { S.nextVisitorAt = t + 5; break; }
    S.queue.push(v); S.nextVisitorAt += nextVisitorDelay();
  }
  if (S.queue.length >= lobbyCap() && S.nextVisitorAt < t) S.nextVisitorAt = t;
  if (S.queue.length && !riding && svcOn('lifter') && !autoTimer) autoTimer = setTimeout(() => { autoTimer = null; ride(true); }, 1000);
  if (t - cupT > 1.5) { cupT = t; checkCups(); S.stats.revHourRec = Math.max(S.stats.revHourRec || 0, revHourRate()); }
  if (S.tut && !S.tut.done && typeof tutStart === 'function' && !tutEl && !document.getElementById('loader') && !document.querySelector('.auth')) tutStart();
  updRevBoard();
  updateSky();
  if (towerScrolling) renderPending = true; else render(); // під час гортання вежі DOM не чіпаємо — без підвисань
}
// плавне гортання: поки вежа рухається, анімації на паузі, а оновлення відкладаються до зупинки
let towerScrolling = false, renderPending = false, towerScrollT = 0;
// Власне плавне гортання вежі пальцем: інерція з обмеженням швидкості — щоб телефон завжди встигав домалювати поверхи
function towerKinetic() {
  const sc = $('#scroller'); if (!sc || sc._kin || !('ontouchstart' in window)) return; sc._kin = true;
  sc.style.touchAction = 'none'; // нативне гортання пальцем вимикаємо, сам скролер лишається апаратним (overflow:auto)
  const VMAX = 2.6, max = () => sc.scrollHeight - sc.clientHeight;
  let id = null, y = 0, lastY = 0, lastT = 0, v = 0, raf = 0, moved = false, startY = 0, samples = [];
  const setY = ny => { sc.scrollTop = Math.max(0, Math.min(max(), ny)); };
  const stopAnim = () => { cancelAnimationFrame(raf); raf = 0; };
  sc.addEventListener('touchstart', e => {
    if (e.touches.length > 1) return; const t = e.touches[0]; id = t.identifier; stopAnim(); follow = false;
    startY = lastY = t.clientY; lastT = performance.now(); v = 0; moved = false; samples = [];
  }, { passive: true });
  sc.addEventListener('touchmove', e => {
    const t = [...e.changedTouches].find(x => x.identifier === id); if (!t) return;
    const dy = lastY - t.clientY, now = performance.now();
    if (!moved && Math.abs(t.clientY - startY) < 6) return;
    moved = true; if (e.cancelable) e.preventDefault();
    setY(sc.scrollTop + dy);
    samples.push([now, dy]); while (samples.length && now - samples[0][0] > 90) samples.shift();
    lastY = t.clientY; lastT = now;
  }, { passive: false });
  sc.addEventListener('touchend', e => {
    if (![...e.changedTouches].some(x => x.identifier === id)) return; id = null;
    if (!moved) return;
    const now = performance.now(), span = samples.length ? Math.max(16, now - samples[0][0]) : 16, dist = samples.reduce((a, s) => a + s[1], 0);
    v = now - lastT > 80 ? 0 : Math.max(-VMAX, Math.min(VMAX, dist / span));
    let t0 = now;
    const step = t => { const dt = Math.min(40, t - t0); t0 = t; setY(sc.scrollTop + v * dt); v *= Math.pow(.955, dt / 16.7);
      if (Math.abs(v) > .02 && sc.scrollTop > 0 && sc.scrollTop < max()) raf = requestAnimationFrame(step); else raf = 0; };
    if (Math.abs(v) > .05) raf = requestAnimationFrame(step);
  }, { passive: true });
  sc.addEventListener('touchcancel', () => { id = null; }, { passive: true });
  // після перетягування не «натискаємо» випадково на поверх
  sc.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
}
function towerScrollWatch() {
  const sc = $('#scroller'); if (!sc || sc._sw) return; sc._sw = true;
  // лише прапорець у JS — без зміни класів (зміна класу на старті гортання перераховувала стилі всієї вежі)
  const stop = () => { towerScrolling = false; visFlush(); if (renderPending) { renderPending = false; render(); } };
  sc.addEventListener('scroll', () => { towerScrolling = true; clearTimeout(towerScrollT); towerScrollT = setTimeout(stop, 180); }, { passive: true });
}
function makeVisitor() {
  const shops = bizFloors();
  if (!shops.length) return { dest: hotel().id, kind: 'guest', ch: pick(CHARS) };
  const vip = BALANCE.vipChance + LIFT.vip(S.liftLvl);
  if (S.level >= 2 && Math.random() < vip) {
    const busy = S.floors.filter(f => f.type === 'building' || (f.type === 'biz' && f.slots.some(s => ['deliver', 'unload', 'sell'].includes(s.st))));
    return { dest: pick(busy.length ? busy : shops).id, kind: 'vip', ch: 'ch_king' };
  }
  if (Math.random() < 0.15) return { dest: hotel().id, kind: 'guest', ch: pick(CHARS) };
  return { dest: pick(shops).id, kind: 'guest', ch: pick(CHARS) };
}
const nextVisitorDelay = () => rnd(...BALANCE.visitorEvery) / (1 + (WB().guests || 0) / 100);

// ===================================================================
//  Ліфт: везе групу, камера плавно стежить за кабіною
// ===================================================================
let carAt = 0, follow = false;
function carBottomFor(f) {
  const el = floorEl(f), wrap = $('#floors');
  if (!el) return 12;
  return wrap.offsetHeight - (el.offsetTop + el.offsetHeight) + Math.max(8, (el.offsetHeight - 96) / 2);
}
function followLoop() {
  if (!follow) return;
  const car = $('#car'), sc = $('#scroller');
  const r = car.getBoundingClientRect(), sr = sc.getBoundingClientRect();
  const diff = (r.top + r.height / 2) - (sr.top + sr.height / 2);
  if (Math.abs(diff) > 1) sc.scrollTop += diff * 0.12;
  requestAnimationFrame(followLoop);
}
async function moveCar(f, fromIdx) {
  const car = $('#car'), idx = floorIndex(f);
  const dur = Math.max(0.45, Math.min((0.35 + Math.abs(idx - fromIdx) * 0.18) * LIFT.speed(S.liftLvl), 4.5));
  car.classList.add('moving'); car.parentElement && car.parentElement.classList.add('moving');
  car.style.transitionDuration = dur + 's';
  car.style.bottom = carBottomFor(f) + 'px';
  await sleep(dur * 1000 + 120);
  car.classList.remove('moving'); car.parentElement && car.parentElement.classList.remove('moving'); carAt = idx;
}
async function ride(auto) {
  if (riding) return;
  if (!S.queue.length) { if (auto) return; toast('У вестибюлі поки немає гостей', LIFT.img(S.liftLvl)); return; }
  riding = true; if (!auto) sfx('click');
  const group = S.queue.splice(0, liftCap())
    .map(v => ({ ...v, f: floorById(v.dest) })).filter(v => v.f && floorIndex(v.f) > 0)
    .sort((a, b) => floorIndex(a.f) - floorIndex(b.f));
  const car = $('#car');
  car.querySelector('.riders').innerHTML = group.slice(0, 3).map(v => `<img src="${IMG(v.ch)}" alt="">`).join('');
  car.classList.add('busy');
  if (!auto) { follow = true; requestAnimationFrame(followLoop); }
  render();
  let from = 0;
  for (const v of group) {
    await moveCar(v.f, from); from = floorIndex(v.f);
    deliverGuest(v);
    car.querySelector('.riders').innerHTML = group.slice(group.indexOf(v) + 1, group.indexOf(v) + 4).map(x => `<img src="${IMG(x.ch)}" alt="">`).join('');
    await sleep(280);
  }
  car.classList.remove('busy');
  await moveCar(S.floors[0], from);
  follow = false; riding = false; save(); render();
}
function vipAct(f) {
  if (f.type === 'building') { f.until = now(); return 'завершив будівництво!'; }
  if (f.type !== 'biz') return '';
  const d = f.slots.findIndex(s => s.st === 'deliver');
  if (d >= 0) { f.slots[d].until = now(); return 'миттєво доставив товар!'; }
  const u = f.slots.findIndex(s => s.st === 'unload');
  if (u >= 0) { unloadAt(f, u, now()); return 'виклав товар на вітрину!'; }
  const s = f.slots.findIndex(x => x.st === 'sell');
  if (s >= 0) { f.slots[s].until = now(); return 'викупив увесь товар!'; }
  return '';
}
function deliverGuest(v, quiet) {
  const fel = quiet ? null : floorEl(v.f), idx = floorIndex(v.f);
  let coins = (8 + idx * 3) * (1 + (WB().tips || 0) / 100) * LIFT.tip(S.liftLvl) * (1 + 0.05 * tech('bus')) * incomeMult() * empMult('lift', 'rev') * (1 + 0.03 * corpLvl('liftrev'));
  // чайові банкнотою: максимум 1, з денним лімітом
  const k = dayKey(now()); if (S.tipsDay.date !== k) S.tipsDay = { date: k, n: 0 };
  if (S.tipsDay.n < tipLimit() && Math.random() < BALANCE.tipChance) { S.tipsDay.n++; S.stats.tips++; addBucks(1, fel); dtProg('tips'); }
  // з певним шансом гість стає жителем
  const ch = v.f.type === 'hotel' ? BALANCE.settleChanceHotel : BALANCE.settleChance;
  if (v.kind !== 'vip' && hotelFree() && (v.tut || Math.random() < ch)) {
    const r = newResident({ ch: v.ch, dream: v.dream }); S.residents.push(r); S.stats.settled++; dtProg('movers');
    toast(`${r.name} вирішує жити у вежі! Мріє про: ${bizDef(r.dream).name}`, r.ch);
  }
  if (v.kind === 'vip') {
    coins *= 3; S.stats.vips++; dtProg('vips');
    const msg = vipAct(v.f);
    if (msg) { S.stats.vipActs++; if (!quiet) { toast('VIP-гість ' + msg, 'vip2'); sparkleAt(fel, 10); } }
  }
  dtProg('liftcoins', Math.floor(coins));
  if (quiet) { S.coins += Math.floor(coins); } else { addCoins(coins, fel); sfx('coin'); vibrate(15); }
  addXP(((v.kind === 'vip' ? 8 : 2) * empMult('lift', 'xp') + 1000 * tech('taxi')) * (1 + 0.03 * corpLvl('liftxp')));
  S.stats.rides++; dtProg('rides'); if (S.stats.rides % 5 === 0) passAdd('rides5');
  if (v.mil) { const b = irnd(...ROAD_EVENT.bucks); gainBucks(b); passAdd('mil'); if (!quiet) { addCoins(500 * S.level, fel); toast(`Мільйонер задоволений: +${b} банкнот!`, 'ch_king'); } else S.coins += 500 * S.level; }
  return Math.floor(coins);
}
function deliverAll() {
  const list = S.queue.splice(0).map(v => ({ ...v, f: floorById(v.dest) })).filter(v => v.f && floorIndex(v.f) > 0);
  const n0 = S.residents.length, b0 = S.bucks;
  let coins = 0; list.forEach(v => { coins += deliverGuest(v, true); });
  closeModal(); sfx('coin'); vibrate(30); confetti(20);
  coinFly($('#side-lift'), COIN, '#coins', coins); popRes('#coins');
  const extra = [S.residents.length > n0 ? `${S.residents.length - n0} нових жителів` : '', S.bucks > b0 ? `+${S.bucks - b0} банкнот чайових` : ''].filter(Boolean).join(', ');
  toast(`Розвезено ${list.length} гостей: +${fmt(coins)} монет${extra ? ' · ' + extra : ''}`, LIFT.img(S.liftLvl));
  save(); render();
}
function inviteCost() { return Math.ceil(Math.max(1, lobbyCap() - S.queue.length) / 10) * 3; }
function askInvite() {
  openModal({ icon: 'bell', title: 'Запросити гостей?', sub: `Вестибюль: ${S.queue.length}/${lobbyCap()}`, color: '#2a6fe0' }, () => {
    const n = lobbyCap() - S.queue.length;
    if (n <= 0) { setTimeout(closeModal); return ''; }
    return `<div class="askbox"><div class="askq">${[0, 1, 2, 3, 4].map(() => `<img src="${IMG(pick(CHARS))}" alt="">`).join('')}</div>
      <p>У вестибюлі нікого немає. Запросити <b>${n}</b> гостей і заповнити вестибюль повністю? Ціна — 3 банкноти за кожні 10 гостей.</p></div>
      <button class="btn green wide shine" data-a="go">Запросити за ${inviteCost()} <img src="${IMG(BUCK)}"></button>`;
  }, { go: () => { const c = inviteCost(); if (!spendBucks(c)) return; let n = lobbyCap() - S.queue.length; while (n-- > 0) { const v = makeVisitor(); if (v) S.queue.push(v); } sfx('ding'); closeModal(); toast('Вестибюль заповнено гостями!', 'bell'); save(); render(); } });
}
function askDeliverAll() {
  if (!S.queue.length) { askInvite(); return; }
  openModal({ icon: LIFT.img(S.liftLvl), title: 'Розвезти всіх?', sub: `У вестибюлі ${S.queue.length} гостей`, color: '#2a6fe0' }, () => {
    if (!S.queue.length) { setTimeout(closeModal); return ''; }
    return `<div class="askbox"><div class="askq">${S.queue.slice(0, 6).map(v => `<img src="${IMG(v.ch)}" alt="">`).join('')}</div>
      <p>Миттєво розвезти всіх <b>${S.queue.length}</b> гостей по поверхах? Ти отримаєш усі монети, чайові, досвід і нових жителів.</p></div>
      <button class="btn green wide shine" data-a="go">Розвезти всіх за 1 <img src="${IMG(BUCK)}"></button>
      <button class="btn gray wide" data-a="ride" style="margin-top:8px">Ні, повезу ліфтом сам</button>`;
  }, { go: () => { if (!S.queue.length) return closeModal(); if (spendBucks(1)) deliverAll(); }, ride: () => { closeModal(); ride(); } });
}

// ===================================================================
//  Будівництво (кілька поверхів одночасно)
// ===================================================================
function startBuild(cat) {
  const total = BUSINESSES.filter(b => b.cat === cat).length;
  const used = bizFloors().filter(f => bizDef(f.biz).cat === cat).length + S.floors.filter(f => (f.type === 'building' || f.type === 'ready') && f.cat === cat).length;
  if (used >= total) { toast('Усі бізнеси цього типу вже відкриті', CATS[cat].img); return; }
  if (towerFull()) { toast(`Вежа досягла максимуму — ${MAX_FLOOR} поверхів`, 'crane'); return; }
  if (!spend(floorCost(), floorCur())) return;
  if (S.cert) { toast(`Сертифікат −${S.cert}% використано`, 'star_badge'); S.cert = 0; }
  const dur = (S.tut && !S.tut.done) ? 6 : buildTime();
  S.floors.push({ id: S.nextId++, type: 'building', cat, until: now() + dur, dur });
  S.stats.built++; sfx('build'); vibrate(30); netEvent('build', cat);
  closeModal(); save(); render();
  setTimeout(() => $('#scroller').scrollTo({ top: 0, behavior: 'smooth' }), 60);
}
function cutRibbon(f) {
  const el = floorEl(f); if (!el || el._cut) return;
  const rb = el.querySelector('.ribbon'); if (!rb) return openReady(f);
  el._cut = true; rb.classList.add('cut'); sfx('build'); vibrate(30); sparkleAt(rb, 16); confetti(26);
  setTimeout(() => { el._cut = false; if (f.type === 'ready') openReady(f); }, 900);
}
function openReady(f) {
  const built = builtIds();
  const b = BUSINESSES.find(x => x.cat === f.cat && !built.has(x.id)) || BUSINESSES.find(x => x.cat === f.cat);
  const nf = makeBiz(b.id); nf.id = f.id;
  Object.keys(f).forEach(k => delete f[k]); Object.assign(f, nf);
  addXP(10); save(); render();
  const dreamers = S.residents.filter(r => r.dream === b.id && !r.dreamDone).length;
  showReward({ title: 'Новий бізнес!', img: b.room, flip: true, name: b.name,
    items: b.products.map(p => ({ img: p[1], text: p[0] })),
    text: dreamers ? `${dreamers} жител(і) мріють тут працювати!` : 'Найми працівників і закупи товари' });
}

// ===================================================================
//  Покращення (без досвіду)
// ===================================================================
function upgradeFloor(f) {
  if (f.stars >= 5) return;
  if (!spendBucks(FLOOR_UP.costs[f.stars])) return;
  f.stars++; S.stats.floorUps++; sfx('level'); sparkleAt(floorEl(f), 14); confetti(16);
  toast(`${bizDef(f.biz).name}: ${f.stars} ★`, 'star2'); save(); render();
}
function upgradeHotel() {
  const h = hotel(); if (h.lvl >= HOTEL.maxLvl) return;
  if (!spendBucks(HOTEL.upgradeCost(h.lvl))) return;
  h.lvl++; sfx('level'); sparkleAt(floorEl(h), 12);
  toast(`Готель рівня ${h.lvl}: ${hotelCap()} місць`, HOTEL.room); save(); render();
}
function upgradeLift() {
  if (S.liftLvl >= LIFT_MAX) return;
  if (!spendBucks(LIFT.cost(S.liftLvl))) return;
  S.liftLvl++; sfx('level');
  toast(`Ліфт L-${S.liftLvl}: везе до ${liftCap()} гостей`, LIFT.img(S.liftLvl)); save(); render();
}
function upgradeLobby() {
  if (S.lobbyLvl >= LOBBY_MAX) return;
  if (!spendBucks(LOBBY.cost(S.lobbyLvl))) return;
  S.lobbyLvl++; sfx('level'); sparkleAt(floorEl(S.floors[0]), 14);
  toast(`Вестибюль: ${lobbyCap()} гостей`, 'bell'); save(); render();
}
function buyTech(t) {
  if (tech(t.id) >= TECH_MAX) return;
  if (!spendBucks(t.price)) return;
  S.tech[t.id] = tech(t.id) + 1; sfx('level'); confetti(14);
  toast(`${t.name}: ${tech(t.id)} з ${TECH_MAX}`, t.img); save(); render();
}
const empCost = l => { const [n, c] = EMPIRE_COSTS[l]; return { n, cur: c === 'b' ? 'bucks' : 'coins' }; };
function buyEmpire(e) {
  const l = emp(e.id); if (l >= EMPIRE_MAX) return;
  const c = empCost(l); if (!spend(c.n, c.cur)) return;
  S.empire[e.id] = l + 1; sfx('level'); toast(`${e.name}: +${(l + 1) * 5}%`, e.img); save(); render();
}
const svcSel = {};
function buyService(id) {
  const sv = SERVICES[id], sel = svcSel[id] || { p: sv.pcts ? sv.pcts[0] : 0, h: sv.hours[0] };
  if (!spendBucks(sv.price(sel.p, sel.h))) return;
  const cur = S.svc[id];
  const base = cur && cur.until > now() && (cur.pct || 0) === (sel.p || 0) ? cur.until : now();
  S.svc[id] = { pct: sel.p || 0, until: base + sel.h * 3600 };
  sfx('level'); toast(`${sv.name}${sel.p ? ' +' + sel.p + '%' : ''} на ${sel.h} год`, sv.img);
  save(); tick();
}

// ===================================================================
//  Працівники
// ===================================================================
function hire(r, f) {
  const taken = new Set(workersOf(f).map(w => w.pos));
  const pos = [0, 1, 2].find(i => !taken.has(i));
  if (pos === undefined) { toast('Немає вільних місць'); return; }
  r.job = f.id; r.pos = pos; sfx('buy');
  if (r.dream === f.biz && !r.dreamDone) {
    r.dreamDone = true; S.stats.dreams++; confetti(30);
    toast(`Робота мрії! ${r.name} щасливий(а): −3% до закупки`, HAPPY_ICON);
  } else toast(`${r.name} тепер працює: ${bizDef(f.biz).name}`, r.ch);
  addXP(3); save(); render();
}
function fire(id) { const r = S.residents.find(x => x.id === +id); if (r) { r.job = null; r.pos = null; sfx('click'); save(); render(); } }
function expertUp(id) {
  const r = S.residents.find(x => x.id === +id); if (!r || r.rank !== 2) return;
  const lv = r.stars || 0; if (lv >= 3) return;
  if (!spendBucks(EXPERT_UP[lv].cost)) return;
  r.stars = lv + 1; S.stats.expertUps = (S.stats.expertUps || 0) + 1; sfx('level'); confetti(18);
  toast(`${r.name}: зірка розвитку ${r.stars}`, 'es_' + r.stars); save(); render();
}
const expBonus = r => { const o = { sell: 0, rev: 0, xp: 0 }; for (let i = 0; i < (r && r.rank === 2 ? r.stars || 0 : 0); i++) { o.sell += EXPERT_UP[i].sell; o.rev += EXPERT_UP[i].rev; o.xp += EXPERT_UP[i].xp; } return o; };
const starBadge = r => r && r.rank === 2 && r.stars ? `<img class="estar" src="${IMG('es_' + r.stars)}" alt="">` : '';
function train(id) {
  const r = S.residents.find(x => x.id === +id); if (!r || r.rank >= 2) return;
  if (!isHappy(r)) { toast('Навчати можна лише щасливого працівника (на роботі мрії)', HAPPY_ICON); sfx('err'); return; }
  const nx = RANKS[r.rank + 1]; if (!spendBucks(nx.cost)) return;
  r.rank++; S.stats.trainings++; sfx('level'); confetti(14);
  toast(`${r.name} тепер ${nx.name}: +${Math.round(nx.bonus * 100)}% до виручки позиції`, nx.icon); save(); render();
}

// ===================================================================
//  Щоденний подарунок, скрині
// ===================================================================
const dailyReady = () => !S.daily.last || dayKey(now()) > dayKey(S.daily.last);
async function claimDaily() {
  if (!dailyReady()) return;
  if (!await guardClaim('gift:' + dayKey(now()), () => { S.daily.last = now(); }) || !dailyReady()) return;
  if (S.daily.last && now() - S.daily.last > 2 * 86400) S.daily.day = 0;
  const idx = S.daily.day % 7, r = DAILY[idx];
  S.daily.day++; S.daily.last = now();
  closeModal();
  if (r.chest) { S.chestInv[r.chest] = (S.chestInv[r.chest] || 0) + 1; toast('Скриня додана в «Мої скрині»', 'chest_purple'); save(); render(); return; }
  const items = [];
  if (r.coins) { S.coins += r.coins; items.push({ img: 'coins_stack', text: '+' + fmt(r.coins) }); }
  if (r.bucks) { gainBucks(r.bucks); items.push({ img: BUCK, text: '+' + r.bucks }); }
  if (r.svc) { applyReward({ kind: 'bonus', svc: r.svc, pct: 0, h: r.h }); items.push({ img: SERVICES[r.svc].img, text: `${SERVICES[r.svc].name} · ${r.h} год` }); }
  showReward({ title: `День ${idx + 1}`, img: 'gift_red', items, text: 'Заходь завтра — нагороди ростуть!' });
  save(); render();
}
function openChest(c, free) {
  if (!free && !spend(c.price, c.cur)) return;
  closeModal(); S.stats.chests++;
  const items = [];
  const coins = Math.round(irnd(c.coins[0], c.coins[1]) * Math.pow(1.16, S.level - 1) / 10) * 10;
  S.coins += coins; items.push({ img: 'coins_heap', text: '+' + fmt(coins) });
  const b = irnd(c.bucks[0], c.bucks[1]); if (b) { gainBucks(b); items.push({ img: BUCK, text: '+' + b }); }
  const xp = Math.round(irnd(c.xp[0], c.xp[1]) * Math.max(1, xpNeed(S.level) / 4000));
  if (Math.random() < c.bonus) {
    const id = pick(CHEST_BONUS.svcs), h = pick(CHEST_BONUS.hours), sv = SERVICES[id];
    const pct = sv.pcts ? pick(c.pcts) : 0, cur = S.svc[id], on = svcOn(id);
    S.svc[id] = { pct: on ? Math.max(cur.pct || 0, pct) : pct, until: (on ? cur.until : now()) + h * 3600 };
    items.push({ img: sv.img, text: `${sv.name}${pct ? ' +' + pct + '%' : ''} · ${h} год` });
  }
  if (c.resident && Math.random() < c.resident) {
    if (hotelFree()) { const r = newResident(); S.residents.push(r); S.stats.settled++; items.push({ img: r.ch, text: r.name + ' заселився' }); }
    else { gainBucks(30); items.push({ img: BUCK, text: '+30 (готель повний)' }); }
  }
  items.push({ img: 'star3', text: '+' + fmt(xp) + ' XP' });
  save(); render();
  showReward({ title: c.name + ' скриня', img: c.icon, items, chest: true });
  addXP(xp); save();
}

// ===================================================================
//  Рендер вежі
// ===================================================================
const starRow = (n, cls = '') => `<div class="stars5 ${cls}">${[0, 1, 2, 3, 4].map(i => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;
const SLOT_ICON = { empty: 'cart', deliver: 't_truck', unload: 'boxes', sell: 'pos', cash: COIN };
function slotsBox(f) {
  const t = now();
  const icons = f.slots.map((s, i) => workerAt(f, i)
    ? `<span class="si ${s.st}"><img src="${IMG(SLOT_ICON[s.st])}" alt=""></span>`
    : `<span class="si lock"><img src="${IMG('lock')}" alt=""></span>`).join('');
  const timed = f.slots.filter(s => s.st === 'deliver' || s.st === 'sell').sort((a, b) => a.until - b.until)[0];
  let bar = 0, txt = '', cls = '';
  if (f.slots.some(s => s.st === 'cash')) { txt = 'Збери виручку'; cls = 'gold'; bar = 100; }
  else if (f.slots.some(s => s.st === 'unload')) { txt = 'Виклади товар'; cls = 'green'; bar = 100; }
  else if (timed) { bar = Math.min(100, (1 - (timed.until - t) / timed.dur) * 100); txt = fmtT(timed.until - t); cls = timed.st; }
  else if (!workersOf(f).length) { txt = 'Найми працівника'; cls = 'red'; }
  else { txt = 'Закупи товар'; cls = 'blue'; }
  return `<div class="sicons">${icons}</div><div class="sbar ${cls}"><i style="width:${bar}%"></i><span>${txt}</span></div>`;
}
function mainBtn(f) {
  if (f.type === 'lobby') return S.queue.length && !riding ? { cls: 'green pulse', img: LIFT.img(S.liftLvl), label: S.queue.length } : { cls: 'dim', img: LIFT.img(S.liftLvl) };
  if (f.type === 'hotel') return { cls: 'dim', img: 'friends' };
  if (f.type === 'building') return { cls: 'violet', img: BUCK, label: skipCost(f.until - now(), true) };
  if (f.type === 'ready') return { cls: 'gold', img: 'gift_red', label: '✂' };
  const sl = f.slots;
  if (sl.some(s => s.st === 'cash')) return { cls: 'gold', img: 'coins_heap', label: fmt(floorCash(f)) };
  if (sl.some(s => s.st === 'unload')) return { cls: 'green', img: 'boxes' };
  if (!workersOf(f).length) return { cls: 'red', img: 'friends' };
  if (buyFloorCost(f)) return { cls: 'blue', img: 't_truck', label: fmt(buyFloorCost(f)) };
  return { cls: 'dim', img: 'pos' };
}
const btnHTML = b => `<div class="fbtn ${b.cls}" data-act="main"><img src="${IMG(b.img)}" alt="">${b.label !== undefined ? `<b>${b.label}</b>` : ''}</div>`;

const hotelStars = l => `<div class="stars5 onpic hstars">${[0, 1, 2, 3, 4].map(i => { const p = Math.max(0, Math.min(1, (l - i * 8) / 8)) * 100; return `<i class="${p >= 100 ? 'on' : ''}" style="${p > 0 && p < 100 ? `background:linear-gradient(90deg,#ffd23a ${p}%,#6b7698 ${p}%)` : ''}"></i>`; }).join('')}</div>`;
function skeleton(f) {
  const idx = floorIndex(f);
  if (f.type === 'lobby') {
    const st = LOBBY.style(S.lobbyLvl);
    return { key: `lobby|${st}`, html: `<div class="lobby-scene">
        ${st >= 3 ? '<div class="chandelier"></div>' : ''}
        <div class="desk"><img src="${IMG('bell')}" alt=""></div>
        
        ${st >= 4 ? '<div class="carpet"></div>' : ''}
        <div class="lobby-floor"></div>
        <div class="gdoor"><i></i><i></i></div>
      </div>
      <div class="fhead"><span class="fno">0</span><span class="fname">Вестибюль</span></div>
      <div class="queue" data-p="queue"></div><div class="qcount" data-p="qc"></div><div data-p="btn"></div>` };
  }
  const head = (name, color) => `<div class="fhead" style="--cat:${color}"><span class="fno">${idx}</span><span class="fname">${name}</span></div>`;
  if (f.type === 'building') {
    const c = CATS[f.cat];
    return { key: 'building|' + f.cat, html: `${head('Будівництво', '#ffb92e')}
      <div class="fbox"><div class="sbar build"><i data-p="prog"></i><span data-p="time"></span></div></div>
      <div class="fpic building"><img class="pic-room" src="${IMG('crane')}" alt=""><img class="cat-ghost" src="${IMG(c.img)}" alt=""><img class="builder" src="${IMG('ch_1')}" alt=""></div>
      <div data-p="btn"></div>` };
  }
  if (f.type === 'ready') {
    const c = CATS[f.cat];
    return { key: 'ready|' + f.cat, html: `${head(c.name + ': готово!', c.color)}
      <div class="fpic ready" style="--cat:${c.color}"><img class="pic-room" src="${IMG(c.img)}" alt=""><div class="ribbon"><i class="rl"></i><i class="rr"></i><span class="bow"></span><b>Будівництво завершено</b><small>Торкнись, щоб перерізати стрічку</small></div></div>
      <div data-p="btn"></div>` };
  }
  if (f.type === 'hotel') {
    return { key: `hotel|${f.lvl}`, html: `${head(HOTEL.name, '#ffc531')}
      <div class="fbox"><div class="hinfo" data-p="hinfo"></div></div>
      <div class="fpic hotelpic"><img class="pic-room" src="${IMG(HOTEL.room)}" alt="">${hotelStars(f.lvl)}</div>
      <div data-p="btn"></div>` };
  }
  const b = bizDef(f.biz), c = CATS[b.cat];
  const crew = [0, 1, 2].map(i => workerAt(f, i)).filter(Boolean);
  return { key: `biz|${f.biz}|${f.stars}|${crew.map(r => r.ch + r.rank + isHappy(r) + (r.stars || 0)).join()}`,
    html: `${head(b.name, c.color)}
      <div class="fbox" data-p="box"></div>
      <div class="fpic" style="--cat:${c.color}">
        <img class="pic-room" src="${IMG(b.room)}" alt="">
        <div class="crew">${crew.map(r => `<span class="cw"><img src="${IMG(r.ch)}" alt=""></span>`).join('')}</div>
        ${starRow(f.stars, 'onpic')}
      </div>
      <div data-p="btn"></div>` };
}
function dynamic(f) {
  const out = { btn: f.type === 'lobby' ? '' : btnHTML(mainBtn(f)) };
  if (f.type === 'lobby') {
    out.queue = S.queue.slice(0, 4).map((v, i) => `<img class="${v.kind}" style="right:${4 + i * 24}px;z-index:${10 - i}" src="${IMG(v.ch)}" alt="">`).join('');
    out.qc = `<img src="${IMG('friends')}" alt=""><b>${S.queue.length}/${lobbyCap()}</b>`;
  }
  if (f.type === 'building') { out.prog = Math.min(100, (1 - (f.until - now()) / f.dur) * 100); out.time = fmtT(f.until - now()); }
  if (f.type === 'hotel') out.hinfo = `<div><img src="${IMG('int_bedroom')}" alt=""><b>${unemployed()}/${hotelCap()}</b></div><div class="hsub">місць зайнято</div>`;
  if (f.type === 'biz') out.box = slotsBox(f);
  return out;
}
const floorClass = (f, i) => 'floor ' + f.type + (f.type === 'lobby' ? ' lv' + LOBBY.style(S.lobbyLvl) : '') + (i === carAt ? ' here' : '') + (FVIS.has(f.id) ? ' vis' : '');
// анімації крутяться лише на тих поверхах, які зараз видно на екрані — решта стоїть і не навантажує телефон
const FVIS = new Set(); let roadVis = true;
const visObs = 'IntersectionObserver' in window ? new IntersectionObserver(es => {
  for (const e of es) {
    const el = e.target, on = e.isIntersecting;
    if (el.classList.contains('floor')) { const id = +el.dataset.id; if (on) FVIS.add(id); else FVIS.delete(id); }
    else if (el.classList.contains('road')) roadVis = on;
    if (towerScrolling) visPend.set(el, on); else el.classList.toggle('vis', on); // під час гортання класи не чіпаємо — застосуємо після зупинки
  }
}, { rootMargin: '120px 0px' }) : null;
const visPend = new Map();
function visFlush() { if (!visPend.size) return; visPend.forEach((on, el) => el.classList.toggle('vis', on)); visPend.clear(); }
function visWatch(el) { if (visObs && el && !el._vw) { el._vw = 1; visObs.observe(el); } else if (!visObs && el) el.classList.add('vis'); }

function render() {
  const wrap = $('#floors');
  let els = [...wrap.children];
  if (els.length !== S.floors.length || els.some((e, i) => +e.dataset.id !== S.floors[i].id)) {
    wrap.innerHTML = '';
    for (const f of S.floors) { const d = document.createElement('div'); d.dataset.id = f.id; wrap.appendChild(d); }
    els = [...wrap.children]; els.forEach(visWatch);
  }
  els.forEach((el, i) => {
    const f = S.floors[i];
    const cls = floorClass(f, i); if (el.className !== cls) el.className = cls;
    const sk = skeleton(f);
    if (el._key !== sk.key) { el.innerHTML = sk.html + '<div class="led"></div>'; el._key = sk.key; el._dyn = {}; }
    const dy = dynamic(f);
    for (const k in dy) {
      if (el._dyn[k] === dy[k]) continue;
      el._dyn[k] = dy[k];
      const p = el.querySelector('[data-p="' + k + '"]'); if (!p) continue;
      if (k === 'prog') p.style.width = dy[k] + '%'; else p.innerHTML = dy[k];
    }
  });

  $('#coins').textContent = fmt(S.coins);
  $('#bucks').textContent = fmt(S.bucks);
  $('#lvl-num').textContent = S.level;
  $('#lvl-bar i').style.width = `calc(26px + (100% - 26px) * ${Math.min(1, S.xp / BALANCE.xpForLevel(S.level)).toFixed(3)})`;

  const bf = bizFloors(), avg = bf.length ? bf.reduce((a, f) => a + f.stars, 0) / bf.length : 0;
  const ts = $('#tower-stars');
  const sh = [0, 1, 2, 3, 4].map(i => `<span class="tstar"><span class="ts-in"><i style="width:${Math.max(0, Math.min(1, avg - i)) * 100}%"></i></span></span>`).join('');
  if (ts._h !== sh) { ts.innerHTML = sh; ts._h = sh; }
  $('#build-cost').textContent = towerFull() ? 'MAX' : fmt(floorCost());
  const bci = $('.bd-price img'), bcw = floorCur() === 'bucks' ? BUCK : COIN; if (!bci.src.endsWith(bcw + '.png')) bci.src = IMG(bcw);
  $('#build-btn').classList.toggle('disabled', towerFull() || (floorCur() === 'bucks' ? S.bucks : S.coins) < floorCost());

  const cc = countClaimable();
  const setBadge = (sel, n) => { const b = $(sel + ' .badge'); if (!b) return; b.textContent = n; b.hidden = !n; };
  const inv = Object.values(S.chestInv).reduce((a, n) => a + n, 0);
  setBadge('#rn-daily', cc.dt); setBadge('#rn-cups', cc.cups + cc.ach); setBadge('#rn-chests', inv);
  ensureVip(); setBadge('#rn-vip', S.vip.list.filter(vipReady).length);
  setBadge('#rn-gift', dailyReady() ? '!' : 0); $('#rn-gift').classList.toggle('wiggle', dailyReady());
  setBadge('#nav-quest', cc.dt);
  { const mu = mailUnread() + (typeof NET !== 'undefined' && NET.dmUnread || 0), nu = newsUnread(), a = $('#ti-mail b'), b2 = $('#ti-news b'); a.textContent = mu; a.hidden = !mu; b2.textContent = nu; b2.hidden = !nu; }
  renderHeli();
  ensurePass(); setBadge('#rn-pass', passClaimable());
  setBadge('#rn-lotto', Object.values(S.lottoInv || {}).reduce((a, n) => a + n, 0));
  setBadge('#rn-maze', S.maze.keys); $('#rn-maze').classList.toggle('wiggle', S.maze.keys >= 1);
  setBadge('#rn-coll', (collReady() ? 1 : 0) + COLLECTIONS.filter(collComplete).length || (!S.coll.task && collDay().n < COLL_PER_DAY ? '!' : 0));
  $('#rn-chests').classList.toggle('wiggle', inv > 0);
  const cup = currentCup();
  const ci = $('#rn-cups img'); if (!ci.src.endsWith('cup_' + (cup + 1) + '.png')) ci.src = IMG('cup_' + (cup + 1));
  $('#cupbar span').textContent = `${cupDoneCount(cup)}/${TROPHIES[cup].tasks.length}`;
  $('#cupbar i').style.width = (cupDoneCount(cup) / TROPHIES[cup].tasks.length * 100) + '%';

  // центральна кнопка операцій
  const m = opsMode(), ob = $('#nav-ops');
  const op = m ? OPS.find(o => o.id === m.id) : null;
  const oi = ob.querySelector('.disc img'), want = op ? op.icon : 'pos';
  if (!oi.src.endsWith(want + '.png')) oi.src = IMG(want);
  ob.querySelector('.lbl').textContent = op ? op.name : 'Немає дій';
  ob.className = 'nav big ' + (m ? 'op-' + m.id : 'op-idle'); ob.disabled = !m;
  setBadge('#nav-ops', m ? m.n : 0);

  // ліфт
  const li = LIFT.img(S.liftLvl);
  const cab = $('#car .cab'); if (!cab.src.endsWith(li + '.png')) cab.src = IMG(li);
  const sl = $('#side-lift img'); if (!sl.src.endsWith(li + '.png')) sl.src = IMG(li);
  $('#car').classList.toggle('call', S.queue.length > 0 && !riding);
  setBadge('#side-lift', riding ? 0 : S.queue.length);

  const W = WEATHER.find(w => w.id === (S.weather && S.weather.id)) || WEATHER[0];
  let chips = `<div class="chip wchip"><img src="${IMG(W.icon)}">${W.name}${W.btxt ? `<em>${W.btxt}</em>` : ''}</div>`;
  if (hhOn()) chips += `<div class="chip hh on" data-hh="1"><img src="${IMG('stopwatch')}">×2 · ${fmtT(S.hh.until - now())}</div>`;
  else if (S.hh.date !== dayKey(now())) chips += `<div class="chip hh" data-hh="1"><img src="${IMG('stopwatch')}">Щаслива година</div>`;
  for (const ty of ['discount', 'donate']) { const L = activePromos(ty); if (!L.length) continue; const best = L.reduce((a, p) => +p.pct > +a.pct ? p : a), end = Math.min(...L.map(p => p.end));
    chips += `<div class="chip promo ${ty}" data-promo="${ty}" style="--pc:${best.color || (ty === 'donate' ? '#1f9a37' : '#e0303c')}"><img src="${IMG(best.icon || 'fireworks')}">${ty === 'donate' ? '+' : '−'}${best.pct}%${L.length > 1 ? ' +' + (L.length - 1) : ''} · ${fmtT(end - now())}</div>`; }
  const bon = [];
  for (const id in SERVICES) if (svcOn(id)) bon.push(`<div class="chip"><img src="${IMG(SERVICES[id].img)}">${S.svc[id].pct ? '+' + S.svc[id].pct + '% · ' : ''}${fmtT(S.svc[id].until - now())}</div>`);
  const bimg = Object.keys(SERVICES).filter(id => svcOn(id)).map(id => `<img src="${IMG(SERVICES[id].img)}">`).slice(0, 3).join('');
  if (bon.length > 1 && !chipsOpen) chips += `<div class="chip tg" data-tg="1"><span class="tgimgs">${bimg}</span>Бонуси: ${bon.length}<i class="tgarr">▸</i></div>`;
  else chips += bon.join('') + (bon.length > 1 ? `<div class="chip tg" data-tg="1"><i class="tgarr">◂</i>Згорнути</div>` : '');
  if ($('#side-left')._h !== chips) { $('#side-left').innerHTML = chips; $('#side-left')._h = chips; }

  if (modalRefresh) modalRefresh();
}

// ===================================================================
//  Небо, погода
// ===================================================================
let skyPhase = '';
function updateSky() {
  const h = new Date().getHours();
  const ph = h >= 21 || h < 6 ? 'night' : h >= 18 ? 'evening' : 'day';
  if (ph !== skyPhase) { const app = $('#app'); app.classList.remove('day', 'evening', 'night'); app.classList.add(ph); skyPhase = ph; }
  if (!S.weather || now() >= S.weather.until) setWeather();
}
function setWeather(id) {
  let W;
  if (id) W = WEATHER.find(w => w.id === id);
  else { const tot = WEATHER.reduce((a, w) => a + w.w, 0); let r = Math.random() * tot; W = WEATHER.find(w => (r -= w.w) < 0) || WEATHER[0]; }
  const nb = new Date(); nb.setHours(nb.getHours() < 12 ? 12 : 24, 0, 0, 0);
  S.weather = { id: W.id, until: nb / 1000 };
  applyWeather();
}
function applyWeather() {
  const W = WEATHER.find(w => w.id === S.weather.id) || WEATHER[0];
  const app = $('#app'); WEATHER.forEach(w => app.classList.remove('w-' + w.id)); app.classList.add('w-' + W.id);
  const box = $('#clouds'); box.innerHTML = '';
  for (let i = 0; i < W.count; i++) {
    const c = document.createElement('img'); c.className = 'cloud'; c.src = IMG(pick(W.clouds)); c.alt = '';
    const w = rnd(44, 74), dur = rnd(55, 120);
    Object.assign(c.style, { width: w + 'px', top: rnd(1, 80) + '%', opacity: rnd(.3, .52).toFixed(2), animationDuration: dur + 's', animationDelay: -rnd(0, dur) + 's' });
    box.appendChild(c);
  }
  document.querySelectorAll('.tree').forEach(t => { const k = W.id === 'snow' ? t.dataset.snow : t.dataset.tree; if (k) t.src = IMG(k); });
  fx.mode = W.fall || null; fx.parts = [];
}
const fx = { mode: null, parts: [], nextFlash: 0 };
let fxClean = false, fxLast = 0;
function fxLoop(t = 0) {
  const cv = $('#weather-fx');
  const fxOn = fx.mode && qMul() > 0;
  if (document.hidden || modalOpen() || towerScrolling || (!fxOn && fxClean) || t - fxLast < (qMul() < 1 ? 50 : 33)) { requestAnimationFrame(fxLoop); return; }
  fxLast = t;
  if (!cv._w || cv._w !== innerWidth || cv._h !== innerHeight) { cv._w = innerWidth; cv._h = innerHeight; cv.width = cv.clientWidth; cv.height = cv.clientHeight; }
  const ctx = cv._ctx || (cv._ctx = cv.getContext('2d')), W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H); fxClean = !fxOn;
  if (fxOn) {
    const target = Math.round((fx.mode === 'snow' ? 90 : fx.mode === 'storm' ? 170 : 110) * qMul());
    if (fx.parts.length > target) fx.parts.length = target;
    while (fx.parts.length < target) fx.parts.push({ x: rnd(0, W), y: rnd(0, H), v: rnd(.7, 1.3), s: rnd(1.2, 3), ph: rnd(0, 6), a: rnd(.3, .6) });
    if (fx.mode === 'snow') {
      for (const p of fx.parts) {
        p.y += p.v * 1.2; p.ph += .02; p.x += Math.sin(p.ph) * .5;
        if (p.y > H + 4) { p.y = -5; p.x = rnd(0, W); }
        ctx.fillStyle = `rgba(255,255,255,${p.a})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.3); ctx.fill();
      }
    } else {
      ctx.strokeStyle = fx.mode === 'storm' ? 'rgba(200,220,255,.4)' : 'rgba(190,215,255,.32)'; ctx.lineWidth = 1.1;
      ctx.beginPath();
      const sp = fx.mode === 'storm' ? 15 : 11;
      for (const p of fx.parts) {
        p.y += sp * p.v; p.x -= 2 * p.v;
        if (p.y > H + 10) { p.y = rnd(-40, 0); p.x = rnd(0, W + 60); }
        ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 3, p.y - 12 * p.v);
      }
      ctx.stroke();
      if (fx.mode === 'storm' && now() > fx.nextFlash) {
        fx.nextFlash = now() + rnd(6, 14);
        const fl = $('#flash'); fl.classList.remove('on'); requestAnimationFrame(() => requestAnimationFrame(() => fl.classList.add('on')));
      }
    }
  }
  requestAnimationFrame(fxLoop);
}
function initSky() {
  const st = $('#stars');
  for (let i = 0; i < 50; i++) {
    const d = document.createElement('div'); d.className = 'star-dot';
    Object.assign(d.style, { left: rnd(0, 100) + '%', top: rnd(0, 70) + '%', animationDelay: rnd(0, 3) + 's' });
    st.appendChild(d);
  }
  if (S.weather && now() < S.weather.until) applyWeather(); else setWeather();
  requestAnimationFrame(fxLoop);
}

// ===================================================================
//  Модальні вікна
// ===================================================================
let modalRefresh = null, modalActions = {};
// прокрутка на самий верх із зупинкою інерції (на телефоні після різкого гортання вікно інакше «доїжджало» до середини)
function scrollTopHard(el) {
  if (!el) return; el.style.overflowY = 'hidden'; el.scrollTop = 0;
  requestAnimationFrame(() => { el.style.overflowY = ''; el.scrollTop = 0; requestAnimationFrame(() => { if (!el.querySelector('.fchat')) el.scrollTop = 0; }); });
}
const modalOpen = () => { const m = document.getElementById('modal-bg'); return !!(m && m.classList.contains('show')); };
function openModal({ icon, title, sub, color }, bodyFn, actions = {}) {
  sfx('click'); modalBack = null; $('#modal').classList.remove('tall');
  $('#modal').style.setProperty('--cat', color || '#3a52a8');
  $('#m-head').innerHTML = `${icon ? `<img src="${IMG(icon)}" alt="">` : ''}<div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div><button class="m-close" data-close aria-label="Закрити">✕</button>`;
  const body = $('#m-body');
  modalActions = actions;
  modalRefresh = () => {
    const h = bodyFn();
    if (document.activeElement && document.activeElement.tagName === 'INPUT' && body.contains(document.activeElement) && document.activeElement.type !== 'range') return;
    // не перебудовуємо вікно, поки відкриті смайлики або в полі вводу є текст (інакше на телефоні все закривається)
    if (body.querySelector('.emo-pick') || (document.activeElement && document.activeElement.isContentEditable && body.contains(document.activeElement)) || [...body.querySelectorAll('.ce-in')].some(e => e.textContent || e.querySelector('img'))) { if (!body._force) return; }
    body._force = false;
    if (typeof h === 'string' && body._h !== h) { const st = body.scrollTop; body.innerHTML = h; body._h = h; body.scrollTop = st; }
  };
  body._h = null; scrollTopHard(body);
  modalRefresh(); scrollTopHard(body);
  $('#modal-bg').classList.add('show'); $('#app').classList.add('m-open');
  if (typeof window.fixPage === 'function') window.fixPage(); // сторінка під вікном не повинна бути зсунута
}
let modalBack = null;
function closeModal() { $('#modal-bg').classList.remove('show'); $('#app').classList.remove('m-open'); modalRefresh = null; }
const curImg = cur => IMG(cur === 'bucks' ? BUCK : COIN);
const costBtn = (price, cur, act, v = '', cls = '', label = '') => {
  const can = (cur === 'bucks' ? S.bucks : S.coins) >= price;
  return `<button class="btn ${cls || (cur === 'bucks' ? 'green' : 'gold')}${can ? ' shine' : ' poor'}" data-a="${act}" data-v="${v}">${label}${fmt(price)}<img src="${curImg(cur)}"></button>`;
};
const pips = (l, max) => `<div class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</div>`;
const charImg = r => `<span class="pframe"><img src="${IMG(r.ch)}" alt=""></span>`;
const rankChip = r => `<span class="rank r${r.rank || 0}">${r.rank ? `<img src="${IMG(RANKS[r.rank].icon)}" alt="">` : ''}${RANKS[r.rank || 0].name}</span>`;
const happyChip = r => isHappy(r) ? `<span class="happy"><img src="${IMG(HAPPY_ICON)}" alt="">Щасливий</span>` : '';

function openFloor(f) {
  if (f.type === 'lobby') return S.queue.length && !riding ? ride() : openShop('main');
  if (f.type === 'building') return openBuilding(f);
  if (f.type === 'ready') return cutRibbon(f);
  if (f.type === 'hotel') return openHotel();
  return openBiz(f);
}

function openOps() {
  if (!opsMode()) return;
  openModal({ icon: 'pos', title: 'Дії на поверхах', sub: 'Закупка, викладка й виручка для всієї вежі', color: '#2a6fe0' }, () => {
    const m = opsMode();
    if (!m) { setTimeout(closeModal); return ''; }
    const cur = m.id, op = OPS.find(o => o.id === cur), fl = opsFloors(cur);
    let top = '';
    if (cur === 'buy') top = `<button class="btn blue wide shine" data-a="all">Закупити все за 1 <img src="${IMG(BUCK)}"> · ${fmt(fl.reduce((a, f) => a + buyFloorCost(f), 0))} <img src="${IMG(COIN)}"></button>`;
    if (cur === 'unload') top = `<button class="btn green wide shine" data-a="all">Викласти все за 1 <img src="${IMG(BUCK)}"></button>`;
    if (cur === 'cash') top = `<button class="btn gold wide shine" data-a="all">Зібрати все за 1 <img src="${IMG(BUCK)}"> · ${fmt(fl.reduce((a, f) => a + floorCash(f), 0))} <img src="${IMG(COIN)}"></button>`;
    if (cur === 'deliver' || cur === 'sell') top = costBtn(fl.reduce((a, f) => a + skipCost(floorRem(f, cur)), 0), 'bucks', 'all', '', 'purple wide', 'Прискорити все за ');
    const rows = fl.map(f => {
      const b = bizDef(f.biz); let right = '', info = '';
      if (cur === 'buy') { right = costBtn(buyFloorCost(f), 'coins', 'one', f.id, 'blue'); info = `${f.slots.filter((s, i) => s.st === 'empty' && workerAt(f, i)).length} товар(и) до закупки`; }
      if (cur === 'unload') { right = `<button class="btn green" data-a="one" data-v="${f.id}">Викласти</button>`; info = 'Товар доставлено'; }
      if (cur === 'cash') { right = `<button class="btn gold" data-a="one" data-v="${f.id}">${fmt(floorCash(f))}<img src="${IMG(COIN)}"></button>`; info = 'Товар продано'; }
      if (cur === 'deliver' || cur === 'sell') { const rem = floorRem(f, cur); right = costBtn(skipCost(rem), 'bucks', 'one', f.id, 'purple'); info = (cur === 'deliver' ? 'Доставка ' : 'Продаж ') + fmtT(rem); }
      const icons = f.slots.map((s, i) => `<span class="si mini ${workerAt(f, i) ? s.st : 'lock'}"><img src="${IMG(workerAt(f, i) ? SLOT_ICON[s.st] : 'lock')}" alt=""></span>`).join('');
      return `<div class="row oprow"><span class="opno">${floorIndex(f)}</span><img src="${IMG(b.room)}" alt=""><div class="grow"><div class="name">${b.name}</div><div class="meta">${info}</div><div class="sicons">${icons}</div></div>${right}</div>`;
    }).join('');
    return `<div class="ophead"><img src="${IMG(op.icon)}" alt=""><b>${op.name}</b><span>${fl.length} поверх(ів)</span></div><div class="optop">${top}</div>${rows}`;
  }, {
    all: () => { const m = opsMode(); if (m) opsAll(m.id); },
    one: v => {
      const m = opsMode(), f = floorById(+v); if (!f || !m) return;
      const cur = m.id;
      if (cur === 'buy') { if (buyFloor(f)) { sfx('buy'); save(); render(); } else { noCoins(); } }
      if (cur === 'unload') { unloadFloor(f); sfx('unload'); save(); render(); }
      if (cur === 'cash') { collectBiz(f, $('#m-body')); sfx('coin'); save(); render(); }
      if (cur === 'deliver' || cur === 'sell') speedFloor(f, cur);
    },
  });
}

function openBuild() {
  if (towerFull()) { toast(`Вежа досягла максимуму — ${MAX_FLOOR} поверхів`, 'crane'); return; }
  openModal({ icon: 'crane', title: 'Новий поверх', sub: `Поверх ${S.floors.length} · будується ${fmtT(buildTime())} · можна кілька одночасно`, color: '#f39c00' }, () => {
    const cost = floorCost();
    return '<div class="catlist">' + Object.entries(CATS).map(([k, c]) => {
      const all = BUSINESSES.filter(b => b.cat === k);
      const have = bizFloors().filter(f => bizDef(f.biz).cat === k).length;
      const pend = S.floors.filter(f => (f.type === 'building' || f.type === 'ready') && f.cat === k).length;
      const done = have + pend >= all.length;
      const next = all[have + pend];
      return `<div class="catcard ${done ? 'done' : ''}" style="--c:${c.color}" data-a="${done ? '' : 'build'}" data-v="${k}">
        <img src="${IMG(c.img)}" alt=""><div class="grow"><div class="name">${c.name}</div><div class="meta">${next ? 'Наступний: <b>' + next.name + '</b>' : c.desc}</div>
        <span class="count">Відкрито ${have}/${all.length}${pend ? ` · будується ${pend}` : ''}</span><br>
        ${done ? '<button class="btn gray">Усі відкриті</button>' : costBtn(cost, floorCur(), 'build', k, floorCur() === 'bucks' ? 'green' : 'gold', 'Будувати · ')}</div></div>`;
    }).join('') + '</div>';
  }, { build: v => v && startBuild(v) });
}
function openBuilding(f) {
  const c = CATS[f.cat];
  openModal({ icon: c.img, title: 'Будується: ' + c.name, sub: 'Поверх ' + floorIndex(f), color: c.color }, () => {
    if (f.type !== 'building') { setTimeout(() => { if (modalRefresh) { closeModal(); openFloor(f); } }); return ''; }
    const rem = f.until - now(), k = skipCost(rem, true);
    return `<div class="note">Будівельники працюють! Залишилось <b>${fmtT(rem)}</b>. Прискорення: 10 банкнот за 5 хвилин.</div>
      <div class="mini-prog" style="height:14px;margin-bottom:14px"><i style="width:${Math.min(100, (1 - rem / f.dur) * 100)}%"></i></div>
      <button class="btn green wide shine" data-a="skip">Завершити зараз · ${k} <img src="${IMG(BUCK)}"></button>`;
  }, { skip: () => { const k = skipCost(f.until - now(), true); if (spendBucks(k)) { f.until = now(); tick(); save(); } } });
}
function openHotel() {
  const h = hotel();
  openModal({ icon: HOTEL.room, title: HOTEL.name, sub: `Рівень ${h.lvl}/${HOTEL.maxLvl} · житло для безробітних`, color: '#c99a1c' }, () => {
    let s = jobcBtn + `<div class="note small">У готелі живуть лише безробітні. Коли житель отримує роботу, місце звільняється.</div><div class="statline"><div class="stat"><b>${unemployed()}/${hotelCap()}</b><span>місць зайнято</span></div><div class="stat"><b>${Math.max(0, hotelCap() - unemployed())}</b><span>вільних місць</span></div></div>`;
    s += `<div class="hhead"><h3>Жителі</h3></div>`;
    const canHappy = r => !r.dreamDone && bizFloors().some(f => f.biz === r.dream && (workersOf(f).length < BALANCE.workersPerShop || workersOf(f).some(w => !isHappy(w))));
    const free = S.residents.filter(r => !r.job).sort((a, b) => canHappy(b) - canHappy(a));
    s += free.length ? free.map(residentRow).join('') : '<div class="note">У готелі зараз нікого — усі жителі працюють. Гості з ліфта часто вирішують залишитися.</div>';
    s = s.replace('<!--res-->', '');
    s += `<div class="hbottom">${S.residents.some(r => !r.job) ? `<button class="btn red wide" data-a="evictall">Виселити всіх безробітних · 1 <img src="${IMG(BUCK)}"></button>` : ''}`;
    s += `<div class="uppanel"><div class="up-title">Розширити готель</div>`;
    s += h.lvl < HOTEL.maxLvl ? `<div class="up-eff"><span>Місць: ${hotelCap()} → <b>${HOTEL.capacity(h.lvl + 1)}</b></span></div>
      <div class="up-buy">${costBtn(HOTEL.upgradeCost(h.lvl), 'bucks', 'up', '', 'green', 'Розширити за ')}</div>` : '<div class="up-eff"><span>Максимальний рівень</span></div>';
    s += `</div>`;
    s += `</div>`;
    return s;
  }, { up: () => upgradeHotel(), jobc: () => openJobCenter(openHotel), evictall: () => evictAll(openHotel), ...residentActions(openHotel) });
}
const dreamOpen = f => workersOf(f).length < BALANCE.workersPerShop || workersOf(f).some(w => !isHappy(w));
const hasDreamVac = r => !r.job && !r.dreamDone && bizFloors().some(f => f.biz === r.dream && dreamOpen(f));
function residentRow(r) {
  const vac = hasDreamVac(r);
  const job = r.job ? floorById(r.job) : null, d = bizDef(r.dream);
  const jobTxt = job ? `Працює: <b>${bizDef(job.biz).name}</b>` : '<b style="color:#ff8fa0">Шукає роботу</b>';
  return `<div class="row ${isHappy(r) ? 'hl' : ''}">${charImg(r)}<div class="grow"><div class="name">${r.name} ${rankChip(r)} ${happyChip(r)}</div>
    <div class="meta">${jobTxt}</div><div class="meta">Мрія: <img src="${IMG(d.room)}">${d.name}${vac ? ' <span class="rec">Є вакансія мрії</span>' : ''}</div></div>
    ${job ? `<button class="btn red" data-a="fire" data-v="${r.id}">Звільнити</button>` : `<div class="rbtns">${vac ? `<button class="btn green shine" data-a="dreamjob" data-v="${r.id}">Влаштувати</button>` : `<button class="btn blue" data-a="job" data-v="${r.id}">Влаштувати</button>`}<button class="btn red" data-a="evict" data-v="${r.id}">Виселити</button></div>`}</div>`;
}
function confirmBox({ icon, title, text, yes, cls = 'red', back }, onYes) {
  openModal({ icon, title, sub: 'Підтвердження', color: '#b8324a' }, () => `<div class="askbox"><p>${text}</p></div>
    <button class="btn ${cls} wide shine" data-a="yes">${yes}</button><button class="btn gray wide" data-a="no" style="margin-top:8px">Скасувати</button>`,
    { yes: () => { onYes(); if (back) back(); else closeModal(); }, no: () => back ? back() : closeModal() });
}
function evictOne(id, back) {
  const r = S.residents.find(x => x.id === +id); if (!r || r.job) return;
  confirmBox({ icon: r.ch, title: 'Виселити ' + r.name + '?', text: `<b>${r.name}</b> покине готель назавжди. Мрія: ${bizDef(r.dream).name}.`, yes: 'Так, виселити', back },
    () => { S.residents = S.residents.filter(x => x !== r); S.stats.evicted = (S.stats.evicted || 0) + 1; dtProg('evict'); sfx('click'); toast(`${r.name} виселено з готелю`, r.ch); save(); render(); });
}
function evictAll(back) {
  const list = S.residents.filter(r => !r.job && !hasDreamVac(r));
  if (!list.length) { toast('Немає кого виселяти — у всіх є вакансія мрії', HOTEL.room); return; }
  confirmBox({ icon: HOTEL.room, title: 'Виселити всіх?', text: `Буде виселено <b>${list.length}</b> жител(і), для яких зараз немає роботи мрії. Ті, для кого є вакансія мрії, залишаться.`, yes: `Виселити за 1 <img src="${IMG(BUCK)}">`, back },
    () => { if (!spendBucks(1)) return; S.residents = S.residents.filter(r => !list.includes(r)); S.stats.evicted = (S.stats.evicted || 0) + list.length; dtProg('evict', list.length); sfx('click'); toast(`Виселено ${list.length} жител(і)`, HOTEL.room); save(); render(); });
}
function hireDream(id) {
  const r = S.residents.find(x => x.id === +id); if (!r) return;
  const f = bizFloors().filter(x => x.biz === r.dream && dreamOpen(x)).sort((a, b) => floorIndex(b) - floorIndex(a))[0];
  if (!f) { openJobPicker(r); return; }
  placeWorker(r, f); save(); render();
}
function residentActions(back) { return { fire: v => fire(v), job: v => openJobPicker(S.residents.find(x => x.id === +v), back), dreamjob: v => hireDream(v), evict: v => evictOne(v, back) }; }
function workerRow(r) {
  const job = floorById(r.job), nx = RANKS[(r.rank || 0) + 1];
  const eu = EXPERT_UP[r.stars || 0];
  const right = isHappy(r) ? (nx ? costBtn(nx.cost, 'bucks', 'train', r.id, 'purple', nx.name + ' · ') : eu ? costBtn(eu.cost, 'bucks', 'eup', r.id, 'gold', '★' + ((r.stars || 0) + 1) + ' · ') : '<button class="btn gray">★★★ Макс.</button>')
    : `<button class="btn blue" data-a="job" data-v="${r.id}">Перевести</button>`;
  const eb = expBonus(r);
  return `<div class="row ${isHappy(r) ? 'hl' : ''}"><span class="chw">${charImg(r)}${starBadge(r)}</span><div class="grow"><div class="name">${r.name} ${rankChip(r)} ${happyChip(r)}</div>
    <div class="meta">Поверх ${floorIndex(job)} · <b>${bizDef(job.biz).name}</b></div>
    <div class="meta">${r.rank === 2 ? (r.stars ? `<div class="ebon"><span><img src="${IMG('stopwatch')}">−${eb.sell}%</span><span><img src="${IMG(COIN)}">+${eb.rev}%</span><span><img src="${IMG('star3')}">+${eb.xp}%</span><em>${r.stars}/3</em></div>` : 'Можна розвивати зірками') : isHappy(r) ? 'Може навчатися' : 'Мрія: ' + bizDef(r.dream).name}</div></div>${right}</div>`;
}
function jobOptions(r) {
  return bizFloors().map(f => {
    const ws = workersOf(f), dream = f.biz === r.dream && !r.dreamDone;
    const full = ws.length >= BALANCE.workersPerShop, unhappy = ws.filter(w => !isHappy(w));
    return { f, dream, full, swap: full && dream && unhappy.length ? unhappy[0] : null };
  }).filter(o => !o.full || o.swap)
    .sort((a, b) => (b.dream - a.dream) || (floorIndex(b.f) - floorIndex(a.f)));
}
function placeWorker(r, f) {
  const ws = workersOf(f);
  if (ws.length >= BALANCE.workersPerShop) {
    const old = ws.find(w => !isHappy(w)); if (!old) { toast('Немає вільних місць'); return false; }
    const pos = old.pos; old.job = null; old.pos = null;
    toast(`${old.name} переселяється в готель — місце для роботи мрії`, old.ch);
    if (r.job) { r.job = null; r.pos = null; }
    hire(r, f); if (r.pos !== pos) r.pos = pos; return true;
  }
  if (r.job) { r.job = null; r.pos = null; }
  hire(r, f); return true;
}
function openJobPicker(r, back) {
  openModal({ icon: r.ch, title: r.name, sub: 'Мрія: ' + bizDef(r.dream).name, color: '#2a6fe0' }, () => {
    if (!bizFloors().length) return '<div class="note">Ще немає жодного бізнесу. Побудуй поверх!</div>';
    const opts = jobOptions(r), dreamBuilt = bizFloors().some(f => f.biz === r.dream);
    let h = r.dreamDone || dreamBuilt ? '' : `<div class="note small">Бізнесу мрії «${bizDef(r.dream).name}» (${CATS[bizDef(r.dream).cat].name}) ще немає. Відкрий його — і житель стане щасливим працівником.</div>`;
    if (!opts.length) return h + '<div class="note">Усі поверхи заповнені. Будуй нові поверхи!</div>';
    return h + opts.map(o => {
      const b = bizDef(o.f.biz), w = workersOf(o.f).length;
      return `<div class="row ${o.dream ? 'hl' : ''}"><img src="${IMG(b.room)}"><div class="grow"><div class="name">${b.name}${o.dream ? ' <span class="rec">Робота мрії</span>' : ''}</div>
        <div class="meta">Поверх ${floorIndex(o.f)} · працівників ${w}/${BALANCE.workersPerShop}</div>
        ${o.dream ? `<div class="meta"><b>Рекомендовано: робота мрії</b></div>` : ''}
        ${o.swap ? `<div class="meta">${o.swap.name} (не на роботі мрії) переїде в готель</div>` : ''}</div>
        <button class="btn ${o.dream ? 'green shine' : ''}" data-a="hire" data-v="${o.f.id}">${o.swap ? 'Замінити' : 'Найняти'}</button></div>`;
    }).join('');
  }, { hire: v => { if (placeWorker(r, floorById(+v))) { save(); render(); (back || closeModal)(); } } });
}
function openBiz(f) {
  const b = bizDef(f.biz), c = CATS[b.cat];
  openModal({ icon: b.room, title: b.name, sub: `${c.name} · поверх ${floorIndex(f)}`, color: c.color }, () => {
    const t = now();
    let h = '<h3>Товари</h3><div class="pgrid">';
    b.products.forEach((p, i) => {
      const s = f.slots[i], tr = tier(f, i), w = workerAt(f, i);
      let state = '', btn = '', bar = -1;
      if (!w) { state = 'Немає працівника'; btn = '<button class="btn gray">Недоступно</button>'; }
      else if (s.st === 'empty') { state = `${tr.qty} шт · ${fmtT(tr.deliver)}`; btn = costBtn(tr.cost, 'coins', 'stock', i, 'blue'); }
      else if (s.st === 'deliver') { state = 'Доставка ' + fmtT(s.until - t); bar = (1 - (s.until - t) / s.dur) * 100; btn = costBtn(skipCost(s.until - t), 'bucks', 'skip', i, 'purple'); }
      else if (s.st === 'unload') { state = 'Доставлено!'; btn = `<button class="btn green shine" data-a="unload" data-v="${i}">Викласти</button>`; }
      else if (s.st === 'sell') { state = 'Продаж ' + fmtT(s.until - t); bar = (1 - (s.until - t) / s.dur) * 100; btn = costBtn(skipCost(s.until - t), 'bucks', 'skip', i, 'purple'); }
      else if (s.st === 'cash') { state = 'Продано!'; btn = `<button class="btn gold shine" data-a="cash" data-v="${i}">${fmt(s.amt * (1 + 0.05 * tech('armored')))}<img src="${IMG(COIN)}"></button>`; }
      h += `<div class="pcard ${s.st} ${w ? '' : 'off'}"><div class="pimg"><img src="${IMG(p[1])}" alt=""><span class="pstate"><img src="${IMG(w ? SLOT_ICON[s.st] : 'lock')}" alt=""></span></div>
        <div class="pname">${p[0]}</div><div class="pmeta">${state}</div>
        ${bar >= 0 ? `<div class="mini-prog"><i style="width:${bar}%"></i></div>` : '<div class="mini-prog ghost"></div>'}
        <div class="pval"><img src="${IMG(COIN)}">${fmt(tr.value * incomeMult())}</div>${btn}</div>`;
    });
    h += '</div><h3>Працівники</h3><div class="crewgrid">';
    for (let i = 0; i < BALANCE.workersPerShop; i++) {
      const r = workerAt(f, i);
      if (r) {
        const nx = RANKS[(r.rank || 0) + 1];
        h += `<div class="wframe ${isHappy(r) ? 'dream' : ''}"><div class="wpic"><img src="${IMG(r.ch)}" alt="">
          ${isHappy(r) ? `<span class="wb l"><img src="${IMG(HAPPY_ICON)}" alt=""></span>` : ''}${r.rank === 2 && r.stars ? `<span class="wb r"><img src="${IMG('es_' + r.stars)}" alt=""></span>` : r.rank ? `<span class="wb r"><img src="${IMG(RANKS[r.rank].icon)}" alt=""></span>` : ''}</div>
          <div class="wname">${r.name}</div>${rankChip(r)}
          ${!nx ? '<button class="btn gray">Макс.</button>' : isHappy(r) ? costBtn(nx.cost, 'bucks', 'train', r.id, 'purple', 'Навчити ') : '<button class="btn gray" title="Лише для щасливих">Не щасливий</button>'}
          <button class="btn red" data-a="fire" data-v="${r.id}">Звільнити</button></div>`;
      } else h += `<div class="wframe empty"><div class="wpic"><img src="${IMG('friends')}" alt=""></div><div class="wname">Вільно</div><span class="rank">—</span><button class="btn blue" data-a="hirelist">Найняти</button></div>`;
    }
    h += '</div><div class="note small">Навчати можна лише щасливих працівників (робота мрії). Спеціаліст: +10% до виручки позиції, Експерт: ще +25%. Щасливий працівник також знижує закупку на 3%.</div>';
    h += `<div class="uppanel"><div class="up-title">Покращити поверх</div>${starRow(f.stars, 'big')}`;
    if (f.stars < 5) {
      const pc = fn => Math.round((fn(f.stars + 1) / fn(f.stars) - 1) * 100);
      h += `<div class="up-eff"><span>Виручка <b>+${pc(FLOOR_UP.price)}%</b></span><span>Досвід <b>+${pc(FLOOR_UP.xp)}%</b></span><span>Закупка <b>${pc(FLOOR_UP.buy)}%</b></span><span>Час продажу <b>${pc(FLOOR_UP.sell)}%</b></span></div>
        <div class="up-buy">${costBtn(FLOOR_UP.costs[f.stars], 'bucks', 'up', '', 'green', 'Покращити за ')}</div>`;
    } else h += '<div class="up-eff"><span>Поверх розвинений на максимум!</span></div>';
    return h + '</div>';
  }, {
    cash: v => { const a = cashSlot(f, +v); if (a) { addCoins(a, $('#m-body')); sfx('coin'); save(); render(); } },
    unload: v => unload(f, +v),
    up: () => upgradeFloor(f),
    fire: v => fire(v),
    train: v => train(v),
    hirelist: () => openHireList(f),
    stock: v => stock(f, +v),
    skip: v => { const s = f.slots[+v]; if (spendBucks(skipCost(s.until - now()))) { s.until = now(); tick(); save(); } },
  });
  floorNav(f);
}
// стрілки «попередній / наступний поверх» над хрестиком — перемикання без виходу з вікна
function floorNav(f) {
  const list = bizFloors().slice().sort((a, b) => floorIndex(a) - floorIndex(b)), i = list.indexOf(f), prev = list[i - 1], next = list[i + 1];
  const hd = $('#m-head'), x = hd.querySelector('.m-close'); if (!x) return;
  const box = document.createElement('div'); box.className = 'fnav-col';
  box.innerHTML = `<div class="fnav"><button class="fnav-b l" ${prev ? '' : 'disabled'} aria-label="Попередній поверх"><img src="${IMG('arr_blue')}" alt=""></button><button class="fnav-b r" ${next ? '' : 'disabled'} aria-label="Наступний поверх"><img src="${IMG('arr_blue')}" alt=""></button></div>`;
  x.replaceWith(box); box.appendChild(x);
  const go = g => { if (!g) return; openBiz(g); const el = floorEl(g), sc = $('#scroller'); if (el && sc) sc.scrollTop += el.getBoundingClientRect().top - sc.getBoundingClientRect().top - sc.clientHeight / 2 + el.offsetHeight / 2; };
  box.querySelector('.l').onclick = e => { e.stopPropagation(); go(prev); };
  box.querySelector('.r').onclick = e => { e.stopPropagation(); go(next); };
}
function openHireList(f) {
  const b = bizDef(f.biz);
  openModal({ icon: b.room, title: 'Найняти: ' + b.name, sub: '⭐ — робота мрії, вгорі — безробітні', color: CATS[b.cat].color }, () => {
    const list = S.residents.filter(r => r.job !== f.id).sort((a, c) => ((c.dream === f.biz) - (a.dream === f.biz)) || (!!a.job - !!c.job));
    if (!list.length) return '<div class="note">Немає вільних жителів. Розширюй готель і вози гостей ліфтом!</div>';
    return list.map(r => {
      const job = r.job ? floorById(r.job) : null, dream = r.dream === f.biz;
      return `<div class="row ${dream ? 'hl' : ''}">${charImg(r)}<div class="grow"><div class="name">${r.name}${dream ? ' ⭐' : ''} ${rankChip(r)}</div>
        <div class="meta">${job ? 'Зараз: ' + bizDef(job.biz).name : 'Шукає роботу'}</div><div class="meta">Мрія: ${bizDef(r.dream).name}</div></div>
        <button class="btn" data-a="hire" data-v="${r.id}">Найняти</button></div>`;
    }).join('');
  }, { hire: v => { const r = S.residents.find(x => x.id === +v); if (r.job) fire(r.id); hire(r, f); openBiz(f); } });
}
// ---------- Центр зайнятості ----------
const JOBC = { size: 9, price: 25, specPrice: 50, refresh: 50, specChance: 0.15 };
function jobcList(force) {
  const k = dayKey(now());
  if (!force && S.jobc && S.jobc.date === k) return S.jobc.list;
  const built = bizFloors(), open = built.filter(dreamOpen), builtIds2 = new Set(built.map(f => f.biz));
  const pool = open, future = BUSINESSES.filter(b => !builtIds2.has(b.id));
  const used = new Set();
  const list = Array.from({ length: JOBC.size }, () => {
    let ch; do { ch = pick(CHARS); } while (used.has(ch) && used.size < CHARS.length); used.add(ch);
    const f = pool.length ? pick(pool) : null;
    return { ch, name: pick(FEMALE.has(ch) ? NAMES_F : NAMES_M), dream: f ? f.biz : pick(future.length ? future : BUSINESSES).id, rank: Math.random() < JOBC.specChance ? 1 : 0, hired: false };
  });
  S.jobc = { date: k, list }; return list;
}
function jobcHire(i, back) {
  const c = jobcList()[i]; if (!c || c.hired) return;
  if (!hotelFree()) { toast('Готель заповнений — розшир його, щоб наймати', HOTEL.room); sfx('err'); return; }
  if (!spendBucks(c.rank ? JOBC.specPrice : JOBC.price)) return;
  const r = newResident({ ch: c.ch, dream: c.dream }); r.name = c.name; r.rank = c.rank;
  S.residents.push(r); S.stats.settled++; dtProg('movers'); c.hired = true;
  sfx('buy'); confetti(14); toast(`${r.name} влаштовується в готель і шукає роботу мрії`, r.ch); save(); render();
}
function openJobCenter(back) {
  jobcList();
  setTimeout(() => { modalBack = back || null; });
  openModal({ icon: 'friends', title: 'Центр зайнятності', sub: `${JOBC.size} кандидатів на день · готель ${unemployed()}/${hotelCap()}`, color: '#1f8f8a' }, () => {
    const list = jobcList(), full = !hotelFree();
    let h = full ? '<div class="note small jcfull">Готель заповнений — найм недоступний. Розшир готель або влаштуй жителів на роботу.</div>' : '';
    h += '<div class="jcgrid">' + list.map((c, i) => {
      const b = bizDef(c.dream), price = c.rank ? JOBC.specPrice : JOBC.price;
      return `<div class="jc ${c.rank ? 'spec' : ''} ${c.hired ? 'hired' : ''}">
        ${c.rank ? `<span class="jcrank"><img src="${IMG(RANKS[1].icon)}" alt="">Спеціаліст</span>` : ''}
        <div class="jcava"><img src="${IMG(c.ch)}" alt=""></div><div class="jcname">${c.name}</div>
        <div class="jcdream"><img src="${IMG(HAPPY_ICON)}" alt="">${b.name}</div>
        ${c.hired ? '<div class="jcband">Влаштовано</div>' : `<button class="btn ${c.rank ? 'purple' : 'green'} ${full ? 'poor' : 'shine'}" data-a="hire" data-v="${i}">${price}<img src="${IMG(BUCK)}"></button>`}</div>`;
    }).join('') + '</div>';
    h += `<button class="btn blue wide" data-a="refresh" style="margin-top:12px">Оновити список · ${JOBC.refresh} <img src="${IMG(BUCK)}"></button>
      <div class="note small" style="margin-top:8px">Мрії кандидатів підібрані під твої поверхи — влаштуй їх на роботу мрії, і вони стануть щасливими. Новий список — щодня.</div>`;
    if (back) h += '<button class="btn gray wide" data-a="back" style="margin-top:8px">Назад</button>';
    return h;
  }, { hire: v => jobcHire(+v), refresh: () => { if (spendBucks(JOBC.refresh)) { jobcList(true); sfx('ding'); save(); render(); } }, back: () => back && back() });
}
const jobcBtn = `<button class="jcbtn" data-a="jobc"><img src="images/icons/friends.png" alt=""><span><b>Центр зайнятності</b><small>9 кандидатів на день · найм від 25</small></span><i>›</i></button>`;
let resTab = 'happy';
function openResidents(keepTab) {
  if (!keepTab) resTab = 'happy';
  openModal({ icon: 'friends', title: 'Жителі', sub: 'Працівники вежі · навчання для щасливих', color: '#2a6fe0' }, () => {
    const ws = S.residents.filter(r => r.job && floorById(r.job)).sort((a, b) => floorIndex(floorById(b.job)) - floorIndex(floorById(a.job)));
    const groups = { happy: ws.filter(r => isHappy(r) && !r.rank), spec: ws.filter(r => r.rank === 1), exp: ws.filter(r => r.rank === 2).sort((a, b) => ((a.stars || 0) >= 3) - ((b.stars || 0) >= 3)) };
    const others = ws.filter(r => !isHappy(r) && !r.rank);
    const tabs = [['happy', 'Щасливі', HAPPY_ICON], ['spec', 'Спеціалісти', RANKS[1].icon], ['exp', 'Експерти', RANKS[2].icon]]
      .map(([k, n, i]) => `<button class="rtab ${resTab === k ? 'on' : ''}" data-a="tab" data-v="${k}"><img src="${IMG(i)}" alt="">${n}<b>${groups[k].length}</b></button>`).join('');
    const list = groups[resTab];
    const empty = { happy: 'Щасливих новачків немає. Влаштовуй жителів на роботу мрії!', spec: 'Спеціалістів поки немає — навчай щасливих працівників.', exp: 'Експертів поки немає — навчай спеціалістів.' }[resTab];
    let h = jobcBtn + `<div class="rtabs">${tabs}</div>` + (list.length ? list.map(workerRow).join('') : `<div class="note">${empty}</div>`);
    if (resTab === 'happy' && others.length) h += `<h3>Не на роботі мрії · ${others.length}</h3>` + others.map(workerRow).join('');
    return h;
  }, { tab: v => { resTab = v; sfx('click'); modalRefresh(); }, train: v => train(v), eup: v => expertUp(v), jobc: () => openJobCenter(() => openResidents(true)), ...residentActions(() => openResidents(true)) });
}

let shopTab = 'main';
function serviceCard(id) {
  const sv = SERVICES[id], sel = svcSel[id] || (svcSel[id] = { p: sv.pcts ? sv.pcts[0] : 0, h: sv.hours[0] });
  const on = svcOn(id);
  const pctRow = sv.pcts ? `<div class="seg">${sv.pcts.map(p => `<button class="${sel.p === p ? 'on' : ''}" data-a="selp" data-v="${id}:${p}">+${p}%</button>`).join('')}</div>` : '';
  const hRow = `<div class="seg">${sv.hours.map(h => `<button class="${sel.h === h ? 'on' : ''}" data-a="selh" data-v="${id}:${h}">${h} год</button>`).join('')}</div>`;
  return `<div class="svc ${on ? 'active' : ''}"><div class="svc-head"><img class="${id === 'manager' || id === 'lifter' ? 'tall' : ''}" src="${IMG(sv.img)}" alt="">
    <div class="grow"><div class="name">${sv.name}</div><div class="meta">${sv.desc}</div>
    ${on ? `<div class="svc-on">Діє${S.svc[id].pct ? ' +' + S.svc[id].pct + '%' : ''} · ще ${fmtT(S.svc[id].until - now())}</div>` : ''}</div></div>
    ${pctRow}${hRow}<div class="svc-buy">${costBtn(sv.price(sel.p, sel.h), 'bucks', 'svc', id, 'green', 'Купити за ')}</div></div>`;
}
function openShop(tab) {
  shopTab = tab || 'main';
  openModal({ icon: 'cart', title: 'Магазин', sub: 'Покращення, послуги, техніка', color: '#7040e8' }, () => {
    const tabs = [['main', 'Вежа', 'arr_green'], ['svc', 'Послуги', 'megaphone2'], ['tech', 'Техніка', 't_truck'], ['chest', 'Скрині', 'chest_purple'], ['exchange', 'Обмін', 'coins_heap']]
      .map(([k, n, i]) => `<button class="stab ${shopTab === k ? 'on' : ''}" data-a="tab" data-v="${k}"><span class="sti"><img src="${IMG(i)}" alt=""></span><span class="stl">${n}</span></button>`).join('');
    let h = '';
    if (shopTab === 'main') {
      h += '<div class="certrow">' + CERTS.map(c => { const on = S.cert === c.pct, busy = S.cert && !on;
        return `<div class="cert ${on ? 'on' : ''}"><div class="cpct">−${c.pct}%</div><img src="${IMG('star_badge')}" alt=""><div class="name">Сертифікат будівництва</div>
          <div class="meta">Знижка ${c.pct}% на наступний поверх · одноразовий</div>
          ${on ? `<div class="con">Діє · поверх за ${fmt(floorCost())}<img src="${IMG(floorCur() === 'bucks' ? BUCK : COIN)}"></div>` : busy ? '<button class="btn gray">Спершу використай діючий</button>' : costBtn(c.price, 'bucks', 'cert', c.pct, 'green', 'Купити за ')}</div>`; }).join('') + '</div>';
      const L = S.liftLvl;
      h += `<div class="shopcard"><div class="sc-title">Ліфт: L-${L}</div>${pips(Math.ceil(L / 5), LIFT_MAX / 5)}
        <div class="sc-body"><img class="tall" src="${IMG(LIFT.img(Math.min(LIFT_MAX, L + 1)))}" alt=""><div class="grow"><div class="meta">Кожне покращення ліфта прискорює підйом і збільшує чайові. Кожні 3 рівні ліфт бере на одного гостя більше.</div></div></div>
        <div class="dstats"><span>Гостей за раз <b>${liftCap()}${L < LIFT_MAX ? ' → ' + LIFT.cap(L + 1) : ''}</b></span><span>Чайові <b>×${LIFT.tip(L).toFixed(1)}</b></span><span>Банкнот чайових сьогодні <b>${S.tipsDay.date === dayKey(now()) ? S.tipsDay.n : 0} / ${tipLimit()}</b></span></div>
        ${L < LIFT_MAX ? costBtn(LIFT.cost(L), 'bucks', 'lift', '', 'green wide', 'Покращити за ') : '<button class="btn gray wide">Максимум</button>'}</div>`;
      const B = S.lobbyLvl;
      h += `<div class="shopcard"><div class="sc-title">Вестибюль: ${lobbyCap()} гостей</div>${pips(Math.ceil(B / 4), LOBBY_MAX / 4)}
        <div class="sc-body"><img src="${IMG('bell')}" alt=""><div class="grow"><div class="meta">Розширюючи вестибюль, можна збільшити максимальну кількість гостей, які чекають на ліфт.</div></div></div>
        <div class="dstats"><span>Місць <b>${lobbyCap()}${B < LOBBY_MAX ? ' → ' + (LOBBY.cap(B + 1) + 5 * tech('bus')) : ''}</b></span></div>
        ${B < LOBBY_MAX ? costBtn(LOBBY.cost(B), 'bucks', 'lobby', '', 'green wide', 'Розширити за ') : '<button class="btn gray wide">Максимум</button>'}</div>`;
      const ht = hotel();
      h += `<div class="shopcard"><div class="sc-title">Готель: рівень ${ht.lvl}</div>${pips(Math.ceil(ht.lvl / 5), HOTEL.maxLvl / 5)}
        <div class="sc-body"><img src="${IMG(HOTEL.room)}" alt=""><div class="grow"><div class="meta">У готелі живуть безробітні жителі. Більше місць — більше нових жителів можуть залишитися у вежі.</div></div></div>
        <div class="dstats"><span>Місць <b>${hotelCap()}${ht.lvl < HOTEL.maxLvl ? ' → ' + HOTEL.capacity(ht.lvl + 1) : ''}</b></span></div>
        ${ht.lvl < HOTEL.maxLvl ? costBtn(HOTEL.upgradeCost(ht.lvl), 'bucks', 'hotel', '', 'green wide', 'Розширити за ') : '<button class="btn gray wide">Максимум</button>'}</div>`;
    } else if (shopTab === 'svc') {
      h = Object.keys(SERVICES).map(serviceCard).join('');
    } else if (shopTab === 'tech') {
      h = TECH.map(t => {
        const n = tech(t.id), max = n >= TECH_MAX;
        return `<div class="shopcard tech"><div class="sc-title">${t.name}</div>
          <div class="sc-body"><img class="veh" src="${IMG(t.img)}" alt=""><div class="grow"><div class="meta">${t.desc}</div></div></div>
          <div class="dstats"><span>Куплено <b>${n} з ${TECH_MAX}</b></span>${t.stat(n).map(([k, v]) => `<span>${k} <b>${v}</b></span>`).join('')}</div>${pips(n, TECH_MAX)}
          ${max ? '<button class="btn gray wide">Максимум</button>' : costBtn(t.price, 'bucks', 'tech', t.id, 'green wide', 'Купити за ')}
          <div class="sc-foot">Техніка купується назавжди</div></div>`;
      }).join('');
    } else if (shopTab === 'chest') {
      h = '<div class="chestrow">' + CHESTS.map(c => `<div class="chc c-${c.id}"><img src="${IMG(c.icon)}"><div class="name">${c.name}</div>${costBtn(c.price, c.cur, 'chest', c.id)}</div>`).join('') + '</div>' +
        '<div class="chinfo">' + CHESTS.map(c => `<div><b>${c.name}:</b> ${fmt(c.coins[0])}–${fmt(c.coins[1])} монет${c.bucks[1] ? `, до ${c.bucks[1]} банкнот` : ''}, досвід, ${Math.round(c.bonus * 100)}% шанс на піар / маркетинг / менеджера (1–24 год)${c.resident ? ', шанс на жителя' : ''}</div>`).join('') + '</div>';
    } else {
      h = '<div class="grid g3">' + EXCHANGE.map(([g, c, i]) => `<div class="card ex"><img src="${IMG(i)}"><div class="name">${fmt(c)} монет</div><div class="meta">${g > EXCHANGE[0][0] ? 'вигідніше на ' + Math.round((c / g / (EXCHANGE[0][1] / EXCHANGE[0][0]) - 1) * 100) + '%' : 'базовий курс'}</div>${costBtn(g, 'bucks', 'ex', g)}</div>`).join('') + '</div>';
    }
    return `<div class="stabs">${tabs}</div>${h}`;
  }, {
    tab: v => { shopTab = v; sfx('click'); modalRefresh(); },
    lift: () => upgradeLift(), lobby: () => upgradeLobby(), hotel: () => upgradeHotel(),
    cert: v => { const c = CERTS.find(x => x.pct === +v); if (!c || S.cert) return; if (spendBucks(c.price)) { S.cert = c.pct; sfx('level'); toast(`Сертифікат −${c.pct}% діє на наступний поверх`, 'star_badge'); save(); render(); } },
    selp: v => { const [id, p] = v.split(':'); svcSel[id].p = +p; sfx('click'); modalRefresh(); },
    selh: v => { const [id, hh] = v.split(':'); svcSel[id].h = +hh; sfx('click'); modalRefresh(); },
    svc: v => buyService(v),
    tech: v => buyTech(TECH.find(t => t.id === v)),
    chest: v => openChest(CHESTS.find(c => c.id === v)),
    ex: v => { const [g, c] = EXCHANGE.find(e => e[0] === +v); if (spendBucks(g)) { addCoins(c, $('#m-body')); sfx('coin'); save(); render(); } },
  });
}

function openQuests() {
  openModal({ icon: 'clipboard', title: 'Щоденні завдання', sub: 'Оновлюються щодня о 00:00', color: '#23a03a' }, () => {
    ensureDaily();
    const mid = new Date(); mid.setHours(24, 0, 0, 0);
    const T = TOUR.info;
    let h = tourBlock('p') + `<div class="note small">Нові завдання через <b>${fmtT(mid / 1000 - now())}</b>. Виконай усі — отримаєш 3 випадкові скрині!</div>`;
    h += DAILY_TASKS.map(t => {
      const n = dtTarget(t), p = S.dt.p[t.id] || 0, got = S.dt.claimed[t.id], ready = dtReady(t);
      return `<div class="qcard ${got ? 'done' : ready ? 'hl' : ''}"><div class="q-title">${t.name}${T && T.active ? tourChip('2–5') : ''}</div><div class="q-text">${t.text(n)}</div>
        <div class="mini-prog"><i style="width:${p / n * 100}%"></i></div>
        <div class="q-foot"><span>Прогрес: ${fmt(p)} з ${fmt(n)}</span><span class="q-rew">Нагорода: <img src="${IMG(BUCK)}">${t.bucks || 2} <img src="${IMG(COIN)}">${fmt(100 * S.level)} <img src="${IMG('star3')}">${fmt(50 * S.level)} <img src="${IMG('keys')}">3–10</span></div>
        ${got ? '<div class="q-ok">Виконано ✓</div>' : ready ? `<button class="btn shine wide" data-a="dclaim" data-v="${t.id}">Забрати</button>` : ''}</div>`;
    }).join('');
    const all = DAILY_TASKS.every(t => S.dt.claimed[t.id]);
    h += `<div class="qcard ${all && !S.dt.bonus ? 'hl' : S.dt.bonus ? 'done' : ''}"><div class="q-title">Усі завдання дня</div><div class="q-text">Бонус: 3 випадкові скрині</div>
      ${S.dt.bonus ? '<div class="q-ok">Отримано ✓</div>' : all ? '<button class="btn gold shine wide" data-a="dbonus">Забрати 3 скрині</button>' : ''}</div>`;
    return h;
  }, { dclaim: v => claimDt(v, $('#m-body')), dbonus: () => claimDtBonus(), tourtop: () => openTour('p', openQuests) });
  tourLoad().then(() => { if (modalRefresh && $('#m-body .tour-box')) { $('#m-body')._h = null; modalRefresh(); } });
}

let cupTab = 'cup';
function openTrophies() {
  openModal({ icon: 'cup_' + (currentCup() + 1), title: 'Кубки', sub: `Здобуто ${Object.keys(S.cups).length} з ${TROPHIES.length}`, color: '#c9921c' }, () => {
    checkCups();
    const cc = countClaimable();
    const tabs = `<div class="tabs"><button class="tab ${cupTab === 'cup' ? 'on' : ''}" data-a="tab" data-v="cup">Кубок${cc.cups ? ' <b class="tcount">!</b>' : ''}</button><button class="tab ${cupTab === 'ach' ? 'on' : ''}" data-a="tab" data-v="ach">Досягнення${cc.ach ? ` <b class="tcount">${cc.ach}</b>` : ''}</button></div>`;
    if (cupTab === 'ach') return tabs + achList();
    const sel = currentCup(), T = TROPHIES[sel], done = cupDoneCount(sel), got = !!S.cups[sel];
    if (got) return tabs + '<div class="note">Усі кубки здобуто! Ти — справжня легенда вежі.</div>';
    const tasks = T.tasks.map(([k, n], j) => {
      const ok = cupTaskDone(sel, j), v = Math.min(cupVal(k), n);
      const label = k === 'liftLvl' ? CUP_STATS[k] + n : k === 'empireAll' ? CUP_STATS[k].replace('%', n + '%') : CUP_STATS[k];
      return `<div class="ctask ${ok ? 'ok' : ''}"><span class="cchk">${ok ? '✓' : j + 1}</span><div class="grow"><div class="ct-name">${label}</div>
        ${ok ? '' : `<div class="mini-prog"><i style="width:${v / n * 100}%"></i></div>`}</div><b>${k === 'liftLvl' || k === 'empireAll' ? '' : fmt(n)}</b></div>`;
    }).join('');
    return `${tabs}<div class="cuphero"><div class="cuprays"></div><img src="${IMG('cup_' + (sel + 1))}" alt=""><div class="cupname">${T.name}</div>
        <div class="cupbar big"><i style="width:${done / T.tasks.length * 100}%"></i><span>Виконано ${done} з ${T.tasks.length}</span></div>
        <div class="cuprew">Нагорода: <img src="${IMG(BUCK)}">${CUP_REWARD(sel).bucks} <img src="${IMG(COIN)}">${fmt(CUP_REWARD(sel).coins)} <img src="${IMG('star3')}">${fmt(CUP_REWARD(sel).xp)}</div>
        <div class="cupperm">+${Math.round(CUP_BONUS * 100)}% до виручки й досвіду назавжди · зараз від кубків: +${Math.round(cupBonus() * 100)}%</div></div>
      <div class="ctasks">${tasks}</div>
      ${cupReady(sel) ? '<button class="btn gold wide shine" data-a="claim">Отримати кубок</button>' : ''}`;
  }, { tab: v => { cupTab = v; sfx('click'); modalRefresh(); }, claim: () => claimTrophy(currentCup()), ach: v => claimAch(+v, $('#m-body')) });
}
function achList() {
  return ACHIEVEMENTS.map((a, i) => {
    const t = achTier(a), v = achStat(a), next = a.tiers[Math.min(4, t)], ready = achReady(a);
    return `<div class="row ach ${ready ? 'hl' : ''}"><img src="${IMG(a.img)}" alt=""><div class="grow"><div class="name">${a.name}</div>${starRow(t)}
      <div class="meta">${a.text}: <b>${fmt(Math.min(v, next))} / ${fmt(next)}</b></div><div class="mini-prog"><i style="width:${t >= 5 ? 100 : Math.min(1, v / next) * 100}%"></i></div></div>
      ${t >= 5 ? '<button class="btn gray">Макс.</button>' : ready ? `<button class="btn green shine" data-a="ach" data-v="${i}">+${ACH_REWARD[t]}<img src="${IMG(BUCK)}"></button>` : `<span class="crew-r"><img src="${IMG(BUCK)}">${ACH_REWARD[t]}</span>`}</div>`;
  }).join('');
}
function openChests() {
  openModal({ icon: 'chest_purple', title: 'Мої скрині', sub: 'Скрині з VIP-завдань, щоденних завдань і подарунків', color: '#8a3fd0' }, () => {
    const inv = CHESTS.filter(c => S.chestInv[c.id]);
    if (!inv.length) return '<div class="soon"><img src="' + IMG('chest_purple') + '" alt=""><b>Скринь поки немає</b><p>Виконуй VIP-завдання та щоденні завдання — і отримуй скрині. Їх також можна купити в магазині.</p></div>';
    return '<div class="chestgrid">' + inv.map(c => `<div class="chestcard c-${c.id}"><span class="cnt">×${S.chestInv[c.id]}</span><img src="${IMG(c.icon)}"><div class="name">${c.name}</div>
      <div class="meta">монети · банкноти · досвід${c.bonus >= .5 ? ' · бонуси' : ''}</div><button class="btn gold shine" data-a="open" data-v="${c.id}">Відкрити</button></div>`).join('') + '</div>';
  }, { open: v => { if (!S.chestInv[v]) return; S.chestInv[v]--; openChest(CHESTS.find(c => c.id === v), true); } });
}
function openVip() {
  ensureVip();
  const mid = new Date(); mid.setHours(24, 0, 0, 0);
  openModal({ icon: 'vip2', title: 'VIP-завдання', sub: `${VIP_PER_DAY} завдання на день · нові о 00:00`, color: '#b8860b' }, () => {
    ensureVip(); const rw = VIP_REWARD(S.vip.lvl), ch = CHESTS.find(c => c.id === rw.chest);
    return `<div class="note small">Нові VIP-завдання через <b>${fmtT(mid / 1000 - now())}</b>. Складність залежить від твого рівня.</div>` + (S.vip.list.length ? '' : '<div class="note">Усі VIP-завдання на сьогодні виконані або згоріли. Нові — о 00:00.</div>') + S.vip.list.map(q => {
      const t = vipDef(q), p = Math.min(q.n, vipProg(q)), ready = vipReady(q);
      return `<div class="vcard ${q.claimed ? 'done' : ready ? 'hl' : ''}"><img class="vic" src="${IMG(t.icon)}" alt=""><div class="grow"><div class="name">${t.text(q.n)}</div>
        <div class="mini-prog"><i style="width:${p / q.n * 100}%"></i></div><div class="meta">${fmt(p)} / ${fmt(q.n)}${q.claimed || !q.exp ? '' : ' · згорить через ' + fmtT(q.exp - now())}</div>
        <div class="vrew"><span><img src="${IMG(BUCK)}">${rw.bucks}</span><span><img src="${IMG(COIN)}">${fmt(rw.coins)}</span><span><img src="${IMG('star3')}">${fmt(rw.xp)}</span><span><img src="${IMG(ch.icon)}">1</span><span><img src="${IMG('keys')}">1</span></div></div>
        ${q.claimed ? '<button class="btn gray">Отримано ✓</button>' : ready ? `<button class="btn green shine" data-a="claim" data-v="${q.id}">Забрати</button>` : ''}</div>`;
    }).join('');
  }, { claim: v => claimVip(v) });
}
function openSoon(title, icon) {
  openModal({ icon, title, sub: 'Нова локація', color: '#3a52a8' }, () => `<div class="soon"><img src="${IMG(icon)}" alt=""><b>Незабаром</b><p>Ця локація з'явиться в наступних оновленнях.</p></div>`);
}
function openAchievements() {
  openModal({ icon: 'ach_star', title: 'Досягнення', sub: 'По 5 ступенів у кожному', color: '#7a4fe0' }, () =>
    ACHIEVEMENTS.map((a, i) => {
      const t = achTier(a), v = achStat(a), next = a.tiers[Math.min(4, t)], ready = achReady(a);
      return `<div class="row ach ${ready ? 'hl' : ''}"><img src="${IMG(a.img)}" alt=""><div class="grow"><div class="name">${a.name}</div>${starRow(t)}
        <div class="meta">${a.text}: <b>${fmt(Math.min(v, next))} / ${fmt(next)}</b></div><div class="mini-prog"><i style="width:${t >= 5 ? 100 : Math.min(1, v / next) * 100}%"></i></div></div>
        ${t >= 5 ? '<button class="btn gray">Макс.</button>' : ready ? `<button class="btn green shine" data-a="ach" data-v="${i}">+${ACH_REWARD[t]}<img src="${IMG(BUCK)}"></button>` : `<span class="crew-r"><img src="${IMG(BUCK)}">${ACH_REWARD[t]}</span>`}</div>`;
    }).join(''), { ach: v => claimAch(+v, $('#m-body')) });
}
function openEmpire() {
  openModal({ icon: 'bz_office', title: 'Бізнес', sub: 'Кожен рівень: +5% до виручки або досвіду свого типу, максимум +200%', color: '#1f8f6a' }, () =>
    EMPIRE.map(e => {
      const l = emp(e.id), max = l >= EMPIRE_MAX;
      const target = e.cat === 'lift' ? 'у ліфті' : `«${CATS[e.cat].name}»`;
      const what = e.kind === 'rev' ? (e.cat === 'lift' ? 'Чайові' : 'Виручка') : 'Досвід';
      const c = max ? null : empCost(l);
      return `<div class="row emp"><img src="${IMG(e.img)}" alt=""><div class="grow"><div class="name">${e.name}</div>
        <div class="meta">${what} ${target}: <b style="color:${e.cat in CATS ? CATS[e.cat].color : '#7cf08f'}">+${l * 5}%</b>${max ? '' : ` → +${(l + 1) * 5}%`}</div>
        <div class="empbar"><i style="width:${l / EMPIRE_MAX * 100}%"></i><span>${l * 5}% / 200%</span></div></div>
        ${max ? '<button class="btn gray">Макс.</button>' : costBtn(c.n, c.cur, 'emp', e.id)}</div>`;
    }).join(''), { emp: v => buyEmpire(EMPIRE.find(e => e.id === v)) });
}
function openDaily() {
  openModal({ icon: 'gift_red', title: 'Щоденний подарунок', sub: 'Заходь щодня — серія росте', color: '#e0344c' }, () => {
    const cur = S.daily.day % 7, ready = dailyReady();
    const days = DAILY.map((r, i) => {
      const img = r.chest ? 'chest_purple' : r.svc ? SERVICES[r.svc].img : r.bucks ? BUCK : i < 3 ? 'coins_stack' : 'coins_heap';
      const txt = r.chest ? 'Скриня' : r.svc ? `${SERVICES[r.svc].name} · ${r.h} год` : r.bucks ? r.bucks + ' банкнот' : fmt(r.coins);
      return `<div class="dday ${i === 6 ? 'big' : ''} ${i < cur ? 'got' : ''} ${i === cur && ready ? 'today' : ''}">День ${i + 1}<img src="${IMG(img)}">${txt}</div>`;
    }).join('');
    const mid = new Date(); mid.setHours(24, 0, 0, 0);
    return `<div class="daily">${days}</div><div style="margin-top:14px">${ready ? '<button class="btn gold wide shine" data-a="claim">Забрати подарунок</button>' : `<button class="btn gray wide">Наступний через ${fmtT(mid / 1000 - now())}</button>`}</div>`;
  }, { claim: () => claimDaily() });
}
let avaPick = false;
// ---------- Подарунки між гравцями ----------
let MY_GIFTS = null;
async function loadMyGifts() {
  if (typeof NET === 'undefined' || !NET.auth || !NET.online) return;
  const r = await api('gifts', { id: NET.auth.player.id }); if (!r.ok) return;
  const changed = JSON.stringify(r.items.slice(0, 6)) !== JSON.stringify((MY_GIFTS || {}).items || []) || r.total !== (MY_GIFTS || {}).total;
  MY_GIFTS = { items: r.items.slice(0, 6), total: r.total };
  if (changed && modalRefresh && $('.gshelf')) { $('#m-body')._h = null; modalRefresh(); }
}
async function openGifts(pid, nick, back) {
  const r = await api('gifts', { id: pid }); if (!r.ok) return toast(netErr(r.error), 'gift_red', true);
  setTimeout(() => { modalBack = back || null; });
  const G = id => GIFTS.find(g => g.id === id) || { name: tr('Подарунок'), price: 0 };
  openModal({ icon: 'gift_red', title: 'Подарунки', sub: `${esc(nick)} · ${r.total}`, color: '#c0306a' }, () =>
    r.items.length ? `<div class="glist">${r.items.map(g => `<div class="gcard"><div class="gc-img"><img src="${GSRC(g.gift)}" alt=""></div><div class="grow">
      <div class="gc-name">${tr(G(g.gift).name)}</div><div class="gc-from"><span class="fav pl-av" data-a="pl" data-v="${g.from.id}">${avHTML(g.from.avatar)}</span><span>${tr('від')} <b data-a="pl" data-v="${g.from.id}">${nk(g.from.nick)}</b></span><time>${clockT(g.t)}</time></div>
      ${g.text ? `<div class="gc-text">${emoTxt(g.text)}</div>` : ''}</div></div>`).join('')}</div>` : `<div class="soon"><img src="${IMG('gift_red')}" alt=""><b>${tr('Подарунків поки немає')}</b></div>`,
  { pl: v => openPlayer(+v, () => openGifts(pid, nick, back)) });
}
function openGiftShop(p, back) {
  let sel = null;
  setTimeout(() => { modalBack = back || null; });
  openModal({ icon: 'gift_red', title: 'Подарунок', sub: `${tr('для')} ${esc(p.nick)}`, color: '#c0306a' }, () =>
    `<div class="gshop">${GIFTS.map(g => `<button class="gsi ${sel === g.id ? 'on' : ''} ${S.bucks < g.price ? 'poor' : ''}" data-a="pick" data-v="${g.id}"><img src="${GSRC(g.id)}" alt=""><span>${tr(g.name)}</span><b><img src="${IMG(BUCK)}">${fmt(g.price)}</b></button>`).join('')}</div>
    <div class="gift-form"><div class="fsend">${emoBtn('gift-in')}${ceIn('gift-in', 300, tr('Побажання (необов’язково)'))}</div>
    <button class="btn green shine wide" data-a="send" ${sel ? '' : 'disabled'}>${sel ? `${tr('Подарувати')} · <img src="${IMG(BUCK)}" class="ib">${fmt(GIFTS.find(g => g.id === sel).price)}` : tr('Обери подарунок')}</button></div>`,
  { pick: v => { const keep = ($('#gift-in') || {}).value || ''; sel = v; $('#m-body')._h = null; $('#m-body')._force = true; document.querySelectorAll('.emo-pick').forEach(e => e.remove()); const st = $('#m-body').scrollTop; modalRefresh(); $('#gift-in').value = keep; $('#m-body').scrollTop = st; },
    send: async () => {
      const g = GIFTS.find(x => x.id === sel); if (!g) return;
      if (!NET.online) return toast(netErr('offline'), 'gift_red', true);
      if (!spendBucks(g.price)) return;
      const text = ($('#gift-in') || {}).value || '';
      const r = await api('gift_send', { id: p.id, gift: g.id, text });
      if (!r.ok) { gainBucks(g.price); save(); render(); return toast(netErr(r.error), 'gift_red', true); }
      save(); render(); sfx('level'); confetti(30); toast(`${tr(g.name)} → ${p.nick}`, 'gift_red', true); openPlayer(p.id, back);
    } });
}
// Профіль: свій (other не задано) або іншого гравця — той самий вигляд, але з його даними з бази
function openProfile(other, back) {
  avaPick = false;
  const view = fn => { if (!other) return fn(); const keep = S; S = other.data; try { return fn(); } finally { S = keep; } };
  if (other) setTimeout(() => { modalBack = back || null; });
  openModal({ icon: 'friends', title: other ? 'Профіль гравця' : 'Профіль', sub: other ? 'Власник вежі «' + GAME_TITLE + '»' : 'Власник вежі «' + GAME_TITLE + '»', color: '#3a5cc8' }, () => view(() => {
    const op = other && other.p;
    const need = BALANCE.xpForLevel(S.level), p = Math.min(1, S.xp / need);
    const got = Object.keys(S.cups).map(Number).sort((a, b) => a - b);
    const maxStaff = bizFloors().length * BALANCE.workersPerShop, ws = S.residents.filter(r => r.job), spec = ws.filter(r => r.rank >= 1).length, exp = ws.filter(r => r.rank === 2).length;
    let h = op ? `<div class="prof"><div class="pava other">${avHTML(op.avatar)}${op.online ? '<i class="ondot"></i>' : ''}</div>
      <div class="grow"><div class="pname pname-st">${nk(op.nick)}${op.admin ? ' <span class="rec">ADMIN</span>' : ''}</div><div class="pseen">${seenTxt(op)}</div>${op.corp ? `<div class="pcorp" data-a="corpv" data-v="${op.corp.id}"><img src="${CSRC(op.corp.emblem)}" alt="">${nk(op.corp.name)}<small>${tr(CORP_ROLES[op.corp.role][0])}</small></div>` : ''}
      <div class="plvl"><div class="lstar"><b>${S.level}</b></div><div class="pbar"><i style="width:calc(18px + (100% - 18px) * ${p.toFixed(3)})"></i><span>${fmt(S.xp)} / ${fmt(need)} XP</span></div></div></div></div>`
      : `<div class="prof"><div class="pava" data-a="ava">${avHTML(S.profile.ava)}<i>✎</i></div>
      <div class="grow"><input class="pname" id="pname" maxlength="18" value="${(S.profile.name === 'Власник' ? tr('Власник') : S.profile.name).replace(/"/g, '')}" aria-label="Ім'я">
      <div class="plvl"><div class="lstar"><b>${S.level}</b></div><div class="pbar"><i style="width:calc(18px + (100% - 18px) * ${p.toFixed(3)})"></i><span>${fmt(S.xp)} / ${fmt(need)} XP</span></div></div></div></div>`;
    const chips = [['coins_heap', fmt(S.stats.revHourRec || 0), 'рекорд виручки за годину'], ['cash_big', fmt(revHourRate()), 'виручка за годину зараз'], ['crane', S.floors.length - 1, 'поверхів']];
    h += '<div class="pchips">' + chips.map(([i, v, t]) => `<div><img src="${IMG(i)}" alt=""><b>${v}</b><span>${t}</span></div>`).join('') + '</div>';
    if (op) {
      const lock = op.blocked || op.blockedMe ? 'disabled' : '';
      h += `<div class="psec pact">${op.blockedMe ? `<div class="note small">${tr('Гравець обмежив спілкування з тобою.')}</div>` : ''}
        <button class="btn purple shine gift-b wide" data-a="gift" ${lock}><img src="${IMG('gift_red')}" alt="">${tr('Подарувати')}</button>
        ${corpCanInvite(op) ? `<button class="btn gold shine wide" data-a="cinv"><img src="${CSRC('ic_8')}" alt="">${tr('Запросити в корпорацію')}</button>` : ''}
        <div class="pact-2"><button class="btn green shine" data-a="dm" ${lock}><img src="${IMG('mail2')}" alt="">${tr('Написати')}</button>
        ${op.friend ? `<button class="btn gray" data-a="unfr"><img src="${IMG('friends')}" alt="">${tr('Видалити з друзів')}</button>` : `<button class="btn blue" data-a="fr" ${lock}><img src="${IMG('friends')}" alt="">${tr('Додати в друзі')}</button>`}</div>
        ${op.blocked ? `<button class="btn gold wide" data-a="unbl">${tr('Розблокувати')}</button>` : `<button class="btn red wide" data-a="bl">${tr('Заблокувати')}</button>`}</div>`;
    }
    { const G = op ? { items: op.gifts || [], total: op.giftCount || 0 } : (MY_GIFTS || { items: [], total: 0 });
      h += `<div class="psec gshelf" data-a="gifts"><div class="pst">${tr('Подарунки')} <em>${G.total}</em>${G.total ? `<span class="gs-all">${tr('Усі')} ›</span>` : ''}</div>` +
        (G.items.length ? `<div class="gs-row">${G.items.slice(0, 6).map(g => `<div class="gs-it"><img src="${GSRC(g.gift)}" alt=""></div>`).join('')}</div>` : `<div class="note small" style="text-align:center">${op ? tr('Подаруй першим — зроби приємне!') : tr('Подарунків поки немає')}</div>`) + '</div>'; }
    h += `<div class="psec"><div class="pst">Кубки <em>${got.length} з ${TROPHIES.length}</em></div>` + (got.length ? `<div class="pshelf">${got.map(i => `<div><img src="${IMG('cup_' + (i + 1))}" alt="" title="${TROPHIES[i].name}"></div>`).join('')}</div>` : '<div class="note small" style="text-align:center">Ще немає кубків</div>') + '</div>';
    h += `<div class="psec"><div class="pst">Розвиток бізнесу</div><div class="pemp">` + [...Object.keys(CATS), 'lift'].map(k => {
      const rev = EMPIRE.filter(e => e.cat === k && e.kind === 'rev').reduce((a, e) => a + emp(e.id) * 5, 0), xp = EMPIRE.filter(e => e.cat === k && e.kind === 'xp').reduce((a, e) => a + emp(e.id) * 5, 0);
      const img = k === 'lift' ? LIFT.img(S.liftLvl) : CATS[k].img, name = k === 'lift' ? 'Ліфт' : CATS[k].name;
      return `<div style="--c:${k === 'lift' ? '#7cf08f' : CATS[k].color}"><img src="${IMG(img)}" alt=""><span>${name}</span><b><img src="${IMG(COIN)}">+${rev}%</b><b><img src="${IMG('star3')}">+${xp}%</b></div>`;
    }).join('') + '</div></div>';
    h += `<div class="psec"><div class="pst">Персонал</div><div class="pstaff">
      <div><img src="${IMG(HAPPY_ICON)}" alt=""><span>Щасливі</span><b>${happyCount()} / ${maxStaff}</b></div>
      <div><img src="${IMG(RANKS[1].icon)}" alt=""><span>Спеціалісти</span><b>${spec} / ${maxStaff}</b></div>
      <div><img src="${IMG(RANKS[2].icon)}" alt=""><span>Експерти</span><b>${exp} / ${maxStaff}</b></div></div></div>`;
    const tf = techTotal() / (TECH.length * TECH_MAX) * 5;
    h += `<div class="psec"><div class="pst">Техніка <em>${techTotal()} з ${TECH.length * TECH_MAX}</em></div><div class="ptech">` +
      TECH.map(t => `<div class="${tech(t.id) ? '' : 'off'} ${tech(t.id) >= TECH_MAX ? 'max' : ''}"><img src="${IMG(t.img)}" alt=""><b>${tech(t.id)}</b></div>`).join('') + '</div>' +
      `<div class="pstars">${[0, 1, 2, 3, 4].map(i => `<span class="tstar"><span class="ts-in"><i style="width:${Math.max(0, Math.min(1, tf - i)) * 100}%"></i></span></span>`).join('')}</div></div>`;
    const achStars = ACHIEVEMENTS.reduce((a, x) => a + achTier(x), 0);
    h += `<div class="psec"><div class="pst">Досягнення <em>${achStars} з ${ACHIEVEMENTS.length * 5} ★</em></div><div class="pach p7">` + ACHIEVEMENTS.map(a => `<div class="pa ${achTier(a) ? '' : 'off'}"><img src="${IMG(a.img)}" alt="">${starRow(achTier(a))}</div>`).join('') + '</div></div>';
    if (op && typeof isAdmin === 'function' && isAdmin()) h += `<div class="psec padm"><div class="pst">👑 ${tr('Адміністрування')}</div><div class="padm-b">
        <button class="btn red" data-a="asanc" data-v="block">${tr('Блокування')}</button><button class="btn gold" data-a="asanc" data-v="chat">${tr('Бан чату')}</button>
        <button class="btn gold" data-a="asanc" data-v="dm">${tr('Бан ЛС')}</button><button class="btn blue" data-a="aopen">${tr('В адмін-панелі')}</button></div></div>`;
    return h;
  }), other ? other.actions : {
    ava: () => openAvatars(),
    gifts: () => openGifts(NET.auth.player.id, NET.auth.player.nick, () => openProfile()),
  });
  if (other) return;
  loadMyGifts();
  $('#m-body').oninput = e => { if (e.target.id === 'pname') { S.profile.name = e.target.value.slice(0, 18) || 'Власник'; save(); } };
  $('#m-body').onchange = async e => { if (e.target.id === 'pname' && NET.auth && NET.online) { const r = await api('profile', { nick: e.target.value.trim() }); if (r.ok) { NET.auth.player = r.player; netStoreAuth(); S.profile.name = r.player.nick; save(); toast(tr('Нікнейм змінено'), 'friends', true); } else { toast(netErr(r.error), 'friends', true); S.profile.name = NET.auth.player.nick; e.target.value = S.profile.name; save(); } } };
}
// ---------- Лабіринт (10 залів, 1 ключ = одні двері) ----------
let mazeBusy = false, mazeFadeIn = false;
function mazeStage(stage) {
  const pickLoot = () => { let r = Math.random() * MAZE.loot.reduce((a, x) => a + x.w, 0), i = 0; while ((r -= MAZE.loot[i].w) > 0) i++; return MAZE.loot[i].kind; };
  if (stage >= MAZE.stages - 1) return { doors: ['final', 'final', 'final'], lamp: false };
  const doors = [0, 1, 2].map(pickLoot); doors[irnd(0, 2)] = 'dead';
  return { doors, lamp: false };
}
function ensureMazeRun() {
  if (!S.maze.run || !Array.isArray(S.maze.run.doors) || S.maze.run.v !== 2) S.maze.run = { v: 2, stage: 0, ...mazeStage(0), loot: { coins: 0, bucks: 0, xp: 0, bonus: [] } };
  if (S.maze.best === undefined) S.maze.best = 0;
}
function mazeLootItems(L) {
  const it = [];
  if (L.coins) it.push({ img: 'coins_heap', text: '+' + fmt(L.coins) });
  if (L.bucks) it.push({ img: BUCK, text: '+' + fmt(L.bucks) });
  if (L.xp) it.push({ img: 'star3', text: '+' + fmt(L.xp) + ' XP' });
  L.bonus.forEach(b => it.push({ img: SERVICES[b.svc].img, text: `${SERVICES[b.svc].name}${b.pct ? ' +' + b.pct + '%' : ''} · ${b.h} год` }));
  return it;
}
function applyLoot(kind) {
  const L = S.maze.run.loot;
  if (kind === 'coins') { const n = MAZE.coins(S.level); S.coins += n; L.coins += n; return { img: 'coins_heap', text: '+' + fmt(n) + ' монет' }; }
  if (kind === 'bucks') { const n = MAZE.bucks(); gainBucks(n); L.bucks += n; return { img: BUCK, text: '+' + n + ' банкнот' }; }
  if (kind === 'xp') { const n = MAZE.xp(S.level); L.xp += n; addXP(n); return { img: 'star3', text: '+' + fmt(n) + ' досвіду' }; }
  if (kind === 'bonus') {
    const b = MAZE.bonus(), cur = S.svc[b.svc], on = svcOn(b.svc);
    S.svc[b.svc] = { pct: on ? Math.max(cur.pct || 0, b.pct) : b.pct, until: (on ? cur.until : now()) + b.h * 3600 };
    L.bonus.push(b); return { img: SERVICES[b.svc].img, text: `${SERVICES[b.svc].name}${b.pct ? ' +' + b.pct + '%' : ''} на ${b.h} год` };
  }
  return null;
}
function finishMaze() {
  const run = S.maze.run, rw = MAZE.final(S.level);
  gainBucks(rw.bucks); S.coins += rw.coins; S.stats.mazes++; S.maze.best = MAZE.stages; netEvent('maze', rw.bucks); dtProg('maze'); passAdd('maze');
  const items = [{ img: BUCK, text: '+' + rw.bucks }, { img: 'coins_heap', text: '+' + fmt(rw.coins) }, { img: 'star3', text: '+' + fmt(rw.xp) + ' XP' }];
  const found = mazeLootItems(run.loot);
  S.maze.run = null; ensureMazeRun(); closeModal(); save(); render();
  showReward({ title: 'Лабіринт пройдено!', img: 'mz_gold', name: 'Скарб знайдено', items, items2: found, items2label: 'Знайдено по дорозі', text: 'Лабіринт оновився — можна йти знову.' });
  addXP(rw.xp); save(); render();
}
const doorImg = k => k === 'dead' ? 'mz_dead' : k === 'final' ? pick(['mz_gold', 'mz_bucks', 'mz_chest']) : MAZE.loot.find(x => x.kind === k).img;
function mazeTransition(el, after) {
  const st = $('.mzstage'), fx = $('#mzfade');
  if (st && el) { const r = st.getBoundingClientRect(), d = el.getBoundingClientRect(); st.style.transformOrigin = `${d.left - r.left + d.width / 2}px ${d.top - r.top + d.height * .55}px`; st.classList.add('zoom'); }
  if (fx) fx.classList.add('on');
  setTimeout(() => { mazeFadeIn = true; after(); mazeBusy = false; save(); render(); if (modalRefresh) modalRefresh();
    requestAnimationFrame(() => requestAnimationFrame(() => { mazeFadeIn = false; const f2 = $('#mzfade'); if (f2) f2.classList.remove('on'); })); }, 750);
}
function chooseDoor(i) {
  ensureMazeRun(); const run = S.maze.run; if (mazeBusy) return;
  if (S.maze.keys < 1) { toast('Немає ключів — купи їх тут або виконуй завдання', 'keys'); sfx('err'); return; }
  const el = document.querySelector(`.mzdoor[data-v="${i}"]`); if (!el) return;
  S.maze.keys--; mazeBusy = true; sfx('click');
  const kind = run.doors[i], nx = el.querySelector('.nx');
  nx.src = IMG(doorImg(kind)); el.classList.add('open');
  const k = $('#mzkeys'); if (k) k.textContent = S.maze.keys;
  if (kind === 'dead') {
    setTimeout(() => { sfx('err'); vibrate(60); el.classList.add('shake'); toast('Тупик! Лабіринт починається спочатку', 'mz_blocked'); }, 450);
    setTimeout(() => {
      const steps = [...document.querySelectorAll('.mzsteps i')], cur = run.stage;
      for (let k = cur; k >= 0; k--) setTimeout(() => { const st = steps[k]; if (!st) return; st.classList.remove('done', 'cur'); st.classList.add('back'); if (k > 0 && steps[k - 1]) steps[k - 1].classList.add('cur'); }, (cur - k) * 110);
      setTimeout(() => mazeTransition(null, () => { Object.assign(run, { stage: 0 }, mazeStage(0)); }), cur * 110 + 350);
    }, 1200);
    return;
  }
  if (kind === 'final') { setTimeout(() => { sfx('chest'); mazeBusy = false; finishMaze(); }, 900); return; }
  const got = applyLoot(kind);
  setTimeout(() => {
    if (!got) return;
    if (kind === 'bonus') showReward({ title: 'Знахідка!', img: got.img, name: got.text, items: [{ img: got.img, text: got.text }], text: 'Бонус уже діє.' });
    else { sfx('coin'); sparkleAt(el, 10); if (kind !== 'xp') popRes(kind === 'bucks' ? '#bucks' : '#coins'); toast(`${tr('Знахідка!')} ${got.text}`, got.img, true); }
  }, 450);
  setTimeout(() => mazeTransition(el, () => { const ns = run.stage + 1; Object.assign(run, { stage: ns }, mazeStage(ns)); S.maze.best = Math.max(S.maze.best, ns); }), 900);
}
function mazeBuy(what) {
  const p = MAZE.shop;
  const n = { k1: 1, k10: 10, k25: 25, k50: 50 }[what], price = p['key' + n]; if (!n) return;
  confirmBox({ icon: 'keys', title: 'Купити ключі?', text: `Купити <b>${n}</b> ключ(ів) до лабіринту за <b>${price}</b> банкнот?`, yes: `Так, за ${price} <img src="${IMG(BUCK)}">`, cls: 'green', back: openMaze },
    () => { if (spendBucks(price)) { addKeys(n); toast(`+${n} ключ(ів)`, 'keys'); sfx('coin'); save(); render(); } });
  return;
  if (false) { const run = S.maze.run; if (run.lamp || run.doors.includes('final')) return; if (spendBucks(p.lamp)) { run.lamp = true; toast('Ліхтарик показав тупик', 'lamp'); } }
  sfx('coin'); save(); render(); if (modalRefresh) modalRefresh();
}
function openMaze() {
  mazeBusy = false; ensureMazeRun();
  openModal({ icon: 'mz_closed', title: 'Лабіринт', sub: `${MAZE.stages} залів · 1 ключ = одні двері`, color: '#a8452a' }, () => {
    if (mazeBusy) return null;
    ensureMazeRun();
    const run = S.maze.run, last = run.stage === MAZE.stages - 1;
    let h = `<div class="mzhead"><span class="kk"><img src="${IMG('keys')}" alt="">Ключі: <b id="mzkeys">${S.maze.keys}</b></span><span>Рекорд: <b>${S.maze.best}/${MAZE.stages}</b></span><span>Пройдено: <b>${S.stats.mazes}</b></span></div>`;
    h += `<div class="mzsteps">${Array.from({ length: MAZE.stages }, (_, i) => `<i class="${i < run.stage ? 'done' : i === run.stage ? 'cur' : ''} ${i === MAZE.stages - 1 ? 'g' : ''}">${i + 1}</i>`).join('')}</div>
      <div class="mztitle">${last ? 'Фінальний зал — усі двері зі скарбом!' : 'Зал ' + (run.stage + 1) + ' з ' + MAZE.stages}</div>
      <div class="mzwrap"><div class="mzstage ${last ? 'final' : ''}"><div class="mztorch l"></div><div class="mztorch r"></div><div class="mzdoors">${[0, 1, 2].map(i => {
        const dead = false;
        return `<div class="mzdoor ${last ? 'gold' : ''} ${dead ? 'lit' : ''}" data-a="door" data-v="${i}"><img class="cur" src="${IMG('mz_closed')}"><img class="nx" src="${IMG('mz_closed')}">${dead ? '<span class="mzx">✕</span>' : ''}</div>`; }).join('')}</div></div><div id="mzfade" class="${mazeFadeIn ? 'on' : ''}"></div></div>`;
    const found = mazeLootItems(run.loot);

    const P = MAZE.shop;
    if (run.stage < MAZE.stages - 1) h += `<button class="btn purple wide shine mzskip" data-a="skip">Пройти одразу до фіналу · ${MAZE.skip} <img src="${IMG('keys')}"></button>`;
    h += `<div class="mzshop">
      <button class="mzs" data-a="buy" data-v="k50"><span class="tag">Найвигідніше</span><img src="${IMG('keys')}"><b>50 ключів</b><em>${P.key50} <img src="${IMG(BUCK)}"></em></button>
      <button class="mzs" data-a="buy" data-v="k25"><span class="tag">Вигідно</span><img src="${IMG('keys')}"><b>25 ключів</b><em>${P.key25} <img src="${IMG(BUCK)}"></em></button>
      <button class="mzs" data-a="buy" data-v="k10"><img src="${IMG('keys')}"><b>10 ключів</b><em>${P.key10} <img src="${IMG(BUCK)}"></em></button>
      <button class="mzs" data-a="buy" data-v="k1"><img src="${IMG('keys')}"><b>1 ключ</b><em>${P.key1} <img src="${IMG(BUCK)}"></em></button>
</div>
      <div class="note small mzrules">Обираєш двері — витрачаєш 1 ключ. Прохідні двері ведуть у наступний зал (часто зі знахідкою: монети, банкноти, досвід, піар/маркетинг +100–300% на 1–3 год або менеджер на 1–5 год). Тупик — і лабіринт починається спочатку. Фінальний 10-й зал: <b>10–100</b> банкнот, досвід × рівень і монети. Ключі дають за щоденні, VIP-завдання та завдання колекцій.</div>`;
    return h;
  }, { door: v => chooseDoor(+v), buy: v => mazeBuy(v), skip: () => {
    if (S.maze.keys < MAZE.skip) { toast(`Потрібно ${MAZE.skip} ключів`, 'keys'); sfx('err'); return; }
    confirmBox({ icon: 'mz_gold', title: 'Пройти лабіринт одразу?', text: `Витратити <b>${MAZE.skip} ключів</b> і перейти одразу у <b>фінальний 10-й зал</b>? Там обереш двері й отримаєш нагороду.`, yes: `Так, за ${MAZE.skip} <img src="${IMG('keys')}">`, cls: 'purple', back: openMaze },
      () => { if (S.maze.keys < MAZE.skip) return; S.maze.keys -= MAZE.skip; const run = S.maze.run; Object.assign(run, { stage: MAZE.stages - 1 }, mazeStage(MAZE.stages - 1)); S.maze.best = MAZE.stages - 1; mazeFadeIn = true; sfx('level'); save(); render(); setTimeout(() => { mazeFadeIn = false; const f = $('#mzfade'); if (f) f.classList.remove('on'); }, 60); });
  } });
}
// ---------- Лотерея ----------
let lotto = null;
function lottoRoll(T) {
  let r = Math.random() * LOTTO_PRIZES.reduce((a, x) => a + x.w, 0), i = 0; while ((r -= LOTTO_PRIZES[i].w) > 0) i++;
  const P = LOTTO_PRIZES[i], L = S.level, k = T.price / 10;
  if (P.kind === 'bucks') { const n = Math.max(1, Math.round(T.price * P.x)); return { kind: 'bucks', n, img: BUCK, text: '+' + fmt(n) + ' банкнот', big: P.x >= 5 }; }
  if (P.kind === 'coins') { const n = Math.round(irnd(120, 260) * k * L / 10) * 10; return { kind: 'coins', n, img: 'coins_heap', text: '+' + fmt(n) + ' монет' }; }
  if (P.kind === 'xp') { const n = Math.round(irnd(30, 80) * k * L); return { kind: 'xp', n, img: 'star3', text: '+' + fmt(n) + ' досвіду' }; }
  if (P.kind === 'keys') { const n = Math.max(1, Math.round(k * irnd(1, 2))); return { kind: 'keys', n, img: 'keys', text: '+' + n + ' ключ(ів)' }; }
  if (P.kind === 'chest') { const c = CHESTS.find(x => x.id === T.chest); return { kind: 'chest', id: c.id, img: c.icon, text: c.name + ' скриня' }; }
  const id = pick(['pr', 'marketing', 'manager']), sv = SERVICES[id], h = Math.min(24, Math.max(1, Math.round(k * irnd(1, 3)))), pct = sv.pcts ? pick([100, 200, 300]) : 0;
  return { kind: 'bonus', id, h, pct, img: sv.img, text: `${sv.name}${pct ? ' +' + pct + '%' : ''} · ${h} год` };
}
function lottoApply(p) {
  if (p.kind === 'bucks') gainBucks(p.n);
  if (p.kind === 'coins') S.coins += p.n;
  if (p.kind === 'xp') addXP(p.n);
  if (p.kind === 'keys') addKeys(p.n);
  if (p.kind === 'chest') S.chestInv[p.id] = (S.chestInv[p.id] || 0) + 1;
  if (p.kind === 'bonus') { const cur = S.svc[p.id], on = svcOn(p.id); S.svc[p.id] = { pct: on ? Math.max(cur.pct || 0, p.pct) : p.pct, until: (on ? cur.until : now()) + p.h * 3600 }; }
}
function buyLotto(id) {
  const T = LOTTERY.find(x => x.id === id); if (!T) return;
  if (!spendBucks(T.price)) return;
  S.lottoInv = S.lottoInv || {}; S.lottoInv[id] = (S.lottoInv[id] || 0) + 1; sfx('buy'); toast(`Білет «${T.name}» додано`, T.tk); save(); render();
}
function openLottoTicketOf(id) {
  const T = LOTTERY.find(x => x.id === id); if (!T || lotto || !(S.lottoInv && S.lottoInv[id])) return;
  S.lottoInv[id]--; dtProg('lotto'); passAdd('lotto');
  const prize = lottoRoll(T); lottoApply(prize); S.stats.lotto = (S.stats.lotto || 0) + 1; save(); render();
  const filler = ['lt_ball', 'lt_clover', 'lt_crown', 'lt_coins', T.tk].filter(x => x !== prize.img);
  const cells = Array(9).fill(null), win = [];
  while (win.length < 3) { const j = irnd(0, 8); if (!win.includes(j)) win.push(j); }
  win.forEach(j => cells[j] = prize.img);
  for (let j = 0; j < 9; j++) if (!cells[j]) { const used = cells.filter(c => c && c !== prize.img); let f; do { f = pick(filler); } while (used.filter(u => u === f).length >= 2); cells[j] = f; }
  lotto = { T, prize, cells, win, open: Array(9).fill(false), just: [], done: false };
  sfx('buy'); openLottoTicket();
}
function openLottoTicket() {
  const L = lotto; if (!L) return;
  openModal({ icon: L.T.tk, title: 'Білет «' + L.T.name + '»', sub: 'Зітри клітинки — знайди три однакові', color: L.T.color }, () => {
    const all = L.open.every(Boolean);
    return `<div class="scratch" style="--c:${L.T.color}"><div class="st">LOTTERY</div><div class="sgrid">${L.cells.map((c, j) =>
      `<div class="sc ${L.open[j] ? 'open' : ''} ${L.just.includes(j) ? 'just' : ''} ${all && L.win.includes(j) ? 'win' : ''}" data-a="sc" data-v="${j}" style="--d:${L.just.indexOf(j) * .09}s"><img src="${IMG(c)}" alt=""><div class="cover"><i>?</i></div></div>`).join('')}</div>
      <div class="sres">${all ? `Виграш: <b>${L.prize.text}</b>` : ''}</div></div>
      ${all ? '<button class="btn gold wide shine" data-a="ok">Забрати</button>' : '<button class="btn blue wide" data-a="all">Відкрити все</button>'}`;
  }, {
    sc: v => {
      if (L.open[+v] || L.done) return; L.open[+v] = true; L.just = [+v]; sfx('click');
      if (L.win.every(j => L.open[j]) || L.open.every(Boolean)) { const rest = L.open.map((o, j) => o ? -1 : j).filter(j => j >= 0); L.open.fill(true); L.just = [+v, ...rest]; lottoDone(); }
      modalRefresh();
    },
    all: () => { if (L.done) return; L.just = L.open.map((o, j) => o ? -1 : j).filter(j => j >= 0); L.open.fill(true); lottoDone(); modalRefresh(); },
    ok: () => { lotto = null; openLottery(); },
  });
}
function lottoDone() {
  if (lotto.done) return; lotto.done = true;
  sfx(lotto.prize.big ? 'chest' : 'coin'); confetti(lotto.prize.big ? 60 : 24);
  toast('Виграш: ' + lotto.prize.text, lotto.prize.img);
}
function openLottery() {
  if (lotto) { if (!lotto.done) { openLottoTicket(); return; } lotto = null; }
  openModal({ icon: 'lt_2', title: 'Лотерея', sub: 'Миттєві білети · можна виграти більше, ніж витратив', color: '#c9921c' }, () =>
    '<div class="ltgrid">' + LOTTERY.map(T => `<div class="lt" style="--c:${T.color}"><img src="${IMG(T.img)}" alt=""><b>${T.name}</b>
      <small>до ×${T.id === 'jackpot' ? 10 : 5} банкнот · скрині · бонуси</small>${(S.lottoInv && S.lottoInv[T.id]) ? `<span class="ltcnt">×${S.lottoInv[T.id]}</span><button class="btn green shine" data-a="open" data-v="${T.id}">Відкрити</button>` : ''}${costBtn(T.price, 'bucks', 'buy', T.id, 'gold', 'Купити · ')}</div>`).join('') + '</div>' +
    `<div class="note small" style="margin-top:10px">Призи: банкноти (×0,5–×10 від ціни білета), монети, досвід, ключі до лабіринту, скрині (чим дорожчий білет — тим краща) та піар / маркетинг / менеджер. Куплено білетів: <b>${S.stats.lotto || 0}</b>.</div>`,
  { buy: v => buyLotto(v), open: v => openLottoTicketOf(v) });
}
// ---------- Донат ----------
// ціни донату у валюті мови гравця (орієнтовний курс до гривні; оплата все одно в гривнях за курсом на день оплати)
const CURRENCY = { uk: ['UAH', 1], en: ['USD', 1 / 41.5], ru: ['RUB', 2.1], de: ['EUR', 1 / 48], fr: ['EUR', 1 / 48], it: ['EUR', 1 / 48], ja: ['JPY', 3.6], ko: ['KRW', 33], zh: ['CNY', 0.172] };
function priceTxt(uah) {
  const [c, k] = CURRENCY[(S.settings && S.settings.lang) || 'uk'] || CURRENCY.uk, v = uah * k;
  if (c === 'UAH') return `${uah} ₴`;
  if (c === 'USD') return '$' + Math.max(.49, Math.ceil(v * 2) / 2 - .01).toFixed(2);
  if (c === 'EUR') return Math.max(.49, Math.ceil(v * 2) / 2 - .01).toFixed(2).replace('.', ',') + ' €';
  if (c === 'RUB') return (Math.ceil(v / 10) * 10 - 1) + ' ₽';
  if (c === 'JPY') return '¥' + (Math.ceil(v / 10) * 10).toLocaleString('en-US');
  if (c === 'KRW') return '₩' + (Math.ceil(v / 100) * 100).toLocaleString('en-US');
  return '¥' + (Math.ceil(v) - .01).toFixed(2);
}
function openDonate() {
  openModal({ icon: 'don_3', title: 'Банкноти', sub: 'Купуй банкноти та розвивайся швидше!', color: '#1f9a37' }, () =>
    `<div class="note small donote">${tr('Обери пакет — після підтвердження відкриється чат з адміністратором для оплати.')}</div>` +
    '<div class="dongrid">' + DONATE.map((d, i) => `<button class="don ${d.hot ? 'hot' : ''} ${d.best ? 'best' : ''}" data-a="buy" data-v="${i}">${d.hot ? '<span class="tag">Хіт</span>' : d.best ? '<span class="tag">Вигідно</span>' : ''}
      ${donateBonus(i).pct || donateBonus(i).rw.length ? `<span class="don-bonus">${donateBonus(i).pct ? '+' + donateBonus(i).pct + '%' : '🎁'}</span>` : ''}
      <img src="${IMG(d.img)}" alt=""><b><img src="${IMG(BUCK)}">${fmt(d.bucks)}${donateBonus(i).pct ? `<em class="don-plus">+${fmt(Math.round(d.bucks * donateBonus(i).pct / 100))}</em>` : ''}</b><span class="price">${priceTxt(d.uah)}</span></button>`).join('') + '</div>' +
    (activePromos('donate').length ? `<div class="note small don-timer">🔥 ${tr('Донат-акція діє ще')} <b>${fmtT(Math.max(...activePromos('donate').map(p => p.end)) - now())}</b></div>` : ''),
  { buy: v => { const d = DONATE[+v], db = donateBonus(+v), extra = Math.round(d.bucks * db.pct / 100);
      if (!NET.auth || !NET.online) return toast(netErr('offline'), 'don_3', true);
      const bonus = extra || db.rw.length ? `<div class="don-cf-bonus">🔥 ${tr('Бонус акції')}: ${extra ? '+' + fmt(extra) + ' ' + tr('банкнот') : ''}${db.rw.length ? (extra ? ' + ' : '') + rewardView(db.rw).text : ''}</div>` : '';
      confirmBox({ icon: d.img, title: tr('Підтвердження покупки'), yes: tr('Так'), cls: 'green', back: openDonate,
        text: `<div class="don-cf"><img src="${IMG(d.img)}" alt=""><b><img src="${IMG(BUCK)}">${fmt(d.bucks)}</b><span>${priceTxt(d.uah)}</span></div>${tr('Чи дійсно бажаєте придбати цю суму банкнот?')}${bonus}<div class="don-cf-note">${tr('Якщо так — натисніть «Так» і зв’яжіться з нами для подальших інструкцій щодо оплати. Банкноти прийдуть на пошту одразу після підтвердження оплати адміністратором.')}</div>` },
        async () => { const r = await api('donate_req', { pack: +v, local: (S.settings.lang || 'uk') === 'uk' ? '' : priceTxt(d.uah) }); if (!r.ok) return toast(netErr(r.error), 'don_3', true);
          sfx('ding'); toast(`${tr('Заявку')} №${r.id} ${tr('створено — напиши адміністратору')}`, 'don_3', true); openDM(r.admin || 1, openDonate); });
    } });
}
function openAvatars() {
  openModal({ icon: 'friends', title: 'Аватар', sub: 'Обери, як тебе бачитимуть у вежі', color: '#3a5cc8' }, () =>
    '<div class="avagrid">' + AVATARS.map(c => `<button class="${c === S.profile.ava ? 'on' : ''}" data-a="setava" data-v="${c}">${avHTML(c)}</button>`).join('') + '</div>' +
    '<button class="btn gray wide" data-a="back">Назад до профілю</button>',
  { setava: v => { S.profile.ava = v; if (NET.auth && NET.online) api('profile', { avatar: v }); sfx('ding'); save(); openProfile(); }, back: () => openProfile() });
}
function openCollections() {
  openModal({ icon: 'cards', title: 'Колекції', sub: `8 колекцій по 8 предметів · до ${COLL_PER_DAY} завдань на день`, color: '#2f8fae' }, () => {
    const d = collDay(), q = S.coll.task;
    let h = '<div class="ctop">';
    if (q) {
      const t = collTaskDef(), c = COLLECTIONS.find(x => x.id === q.c), p = Math.min(q.n, collProg());
      h += `<div class="ctask2" style="--q:${COLL_QUALITY[q.q].color}"><img class="cti" src="${IMG(t.icon)}" alt=""><div class="grow"><div class="name">${t.text(q.n)}</div>
        <div class="meta">Нагорода: випадкова частинка «${c.name}» <span class="qpill">${COLL_QUALITY[q.q].name}</span></div>
        <div class="mini-prog"><i style="width:${p / q.n * 100}%"></i></div><div class="meta">${fmt(p)} / ${fmt(q.n)} · згорить через ${fmtT(q.exp - now())}</div></div>
        ${collReady() ? '<button class="btn green shine" data-a="claim">Забрати</button>' : ''}</div>
        ${collReady() ? '' : S.coll.cancel === dayKey(now()) ? '<div class="ccancel off">Відмінити завдання можна раз на добу — уже використано</div>' : '<button class="ccancel" data-a="cancel">✕ Відмінити завдання (1 раз на добу)</button>'}`;
    } else if (d.n < COLL_PER_DAY) h += `<button class="btn blue wide shine" data-a="take">Отримати завдання</button>`;
    else h += '<div class="note small">Завдання колекцій на сьогодні закінчились. Нові — після 00:00.</div>';
    h += `<div class="cday">Завдань сьогодні: <b>${d.n} / ${COLL_PER_DAY}</b></div></div>`;
    h += COLLECTIONS.map((c, ci) => {
      const Q = COLL_QUALITY[ci], rw = COLL_REWARD(ci), full = collComplete(c), cnt = c.items.filter((_, i) => collHave(c, i)).length;
      return `<div class="coll ${full ? 'full' : ''}" style="--q:${Q.color}"><div class="chead"><b>${c.name}</b><span class="qpill">${Q.name}</span><em>${cnt}/8</em></div>
        <div class="citems">${c.items.map((it, i) => { const n = collHave(c, i); return `<div class="ci ${n ? '' : 'off'}"><img src="${IMG(it[1])}" alt="">${n > 1 ? `<i>×${n}</i>` : ''}<span>${it[0]}</span></div>`; }).join('')}</div>
        <div class="cfoot"><div class="vrew"><span><img src="${IMG(BUCK)}">${fmt(rw.bucks)}</span><span><img src="${IMG(COIN)}">${fmt(rw.coins)}</span><span><img src="${IMG('star3')}">${fmt(rw.xp)}</span><span><img src="${IMG(CHESTS.find(x => x.id === rw.chest).icon)}">1</span></div>
        ${full ? `<button class="btn gold shine" data-a="ex" data-v="${c.id}">Обміняти</button>` : '<button class="btn gray">Обміняти</button>'}</div></div>`;
    }).join('');
    return h;
  }, { take: () => takeCollTask(), claim: () => claimCollTask(), ex: v => exchangeColl(v), cancel: () => { if (!S.coll.task || S.coll.cancel === dayKey(now())) return; S.coll.task = null; S.coll.cancel = dayKey(now()); sfx('click'); toast('Завдання відмінено — можна взяти нове', 'cards'); save(); render(); } });
}
function applySettings() {
  autoQuality();
  const st = S.settings, app = $('#app');
  app.classList.toggle('noanim', st.anim === false);
  app.classList.remove('q-low', 'q-mid', 'q-high'); app.classList.add('q-' + (st.quality || 'high')); document.body.classList.toggle('q-low', (st.quality || 'high') === 'low');
  if (LANG !== (st.lang || 'uk')) { setLang(st.lang || 'uk'); if (LANG === 'uk') location.reload(); else startI18n(); if (typeof mtApply === 'function') mtApply(); }
  document.title = tr(GAME_TITLE);
}
// ---------- спокійна фонова музика (лаунж-петля ~1,5 хв) ----------
const BGM = { el: null, on: false, fadeT: 0 };
const bgmTarget = () => S.settings.music === false ? 0 : Math.min(1, (S.settings.vol ?? 70) / 100) * .5;
function bgmUpdate() {
  if (!BGM.el) return; const v = bgmTarget();
  if (v <= 0 || document.hidden) { BGM.el.pause(); return; }
  if (BGM.el.paused) { BGM.el.volume = 0; BGM.el.play().catch(() => {}); }
  clearInterval(BGM.fadeT); BGM.fadeT = setInterval(() => { const c = BGM.el.volume, d = v - c; if (Math.abs(d) < .02) { BGM.el.volume = v; clearInterval(BGM.fadeT); } else BGM.el.volume = Math.max(0, Math.min(1, c + Math.sign(d) * .02)); }, 60);
}
function bgmStart() {
  if (!BGM.el) { BGM.el = new Audio('audio/bgm.mp3?v=' + VERSION); BGM.el.loop = true; BGM.el.preload = 'auto'; BGM.el.volume = 0; }
  BGM.on = true; bgmUpdate();
}
// браузери дозволяють звук лише після першого дотику — тоді й вмикаємо музику
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, function f() { if (BGM.on) return; bgmStart(); }, { passive: true }));
document.addEventListener('visibilitychange', () => { if (BGM.on) bgmUpdate(); });
const qMul = () => ({ low: 0, mid: .5, high: 1 })[S.settings.quality || 'high'];
function openMenu() {
  const st = S.settings;
  openModal({ icon: 'settings', title: 'Налаштування', sub: GAME_TITLE + ' · версія ' + VERSION, color: '#3a4a80' }, () => `
    <div class="setsec"><div class="sett">Звук</div>
      <div class="setrow"><img src="${IMG('bell')}"><span>Фонова музика</span><button class="switch ${st.music !== false ? 'on' : ''}" data-a="sound" aria-label="Фонова музика"></button></div>
      <div class="setrow vol"><img src="${IMG('megaphone2')}"><span>Гучність</span><input type="range" min="0" max="100" step="5" value="${st.vol ?? 80}" id="volr" aria-label="Гучність" style="--p:${st.vol ?? 80}%"><b id="volv">${st.vol ?? 80}%</b></div>
      <div class="setrow"><img src="${IMG('phone')}"><span>Вібрація</span><button class="switch ${st.vibro ? 'on' : ''}" data-a="vibro" aria-label="Вібрація"></button></div>
      <div class="setrow"><img src="${IMG('mail2')}"><span>Спливаючі підказки</span><button class="switch ${st.notif !== false ? 'on' : ''}" data-a="notif" aria-label="Сповіщення"></button></div></div>
    ${hasApp() ? `<div class="setsec"><div class="sett">Пуш-сповіщення</div>
      ${pushAllowed() ? '' : `<div class="note small">Сповіщення вимкнені в налаштуваннях телефона.</div><button class="btn green wide" data-a="pushperm" style="margin:4px 0 8px">Дозволити сповіщення</button>`}
      ${(() => { try { return typeof HmApp.batteryOk === 'function' && !HmApp.batteryOk(); } catch (e) { return false; } })() ? `<div class="note small">Телефон може «присипляти» гру у фоні — тоді сповіщення приходять із запізненням.</div><button class="btn blue wide" data-a="pushbat" style="margin:4px 0 8px">Дозволити роботу у фоні</button>` : ''}
      <div class="setrow"><img src="${IMG('bell')}"><span>Отримувати сповіщення</span><button class="switch ${pushCfg().all !== false ? 'on' : ''}" data-a="pushall" aria-label="Пуш-сповіщення"></button></div>
      ${pushCfg().all !== false ? PUSH_GROUPS.map(([k, n, ic]) => `<div class="setrow sub"><img src="${IMG(ic)}"><span>${n}</span><button class="switch ${(pushCfg().off || []).includes(k) ? '' : 'on'}" data-a="pushg" data-v="${k}" aria-label="${n}"></button></div>`).join('') : ''}</div>` : ''}
    <div class="setsec"><div class="sett">Графіка</div>
      <div class="setrow col"><span><img src="${IMG('star3')}">Якість</span><div class="seg3">${[['low', 'Низька'], ['mid', 'Середня'], ['high', 'Висока']].map(([k, n]) => `<button class="${(st.quality || 'high') === k ? 'on' : ''}" data-a="q" data-v="${k}">${n}</button>`).join('')}</div></div>
      <div class="setrow"><img src="${IMG('phone')}"><span>Повноекранний режим</span><button class="switch ${st.fullscreen !== false ? 'on' : ''}" data-a="fs" aria-label="Повноекранний режим"></button></div>
      <div class="setrow"><img src="${IMG('fireworks')}"><span>Анімації</span><button class="switch ${st.anim !== false ? 'on' : ''}" data-a="anim" aria-label="Анімації"></button></div></div>
    <div class="setsec"><div class="sett">Акаунт</div>
      <div class="setrow"><img src="${IMG('friends')}"><span>${NET.auth ? esc(NET.auth.player.nick) : tr('Гість (офлайн)')}</span><em class="netst ${NET.online ? 'on' : ''}">${NET.online ? '● онлайн' : '● офлайн'}</em></div>
      ${NET.auth ? '<button class="btn red wide" data-a="logout" style="margin-top:6px">Вийти з акаунта</button>' : NET.online ? '<button class="btn blue wide" data-a="login" style="margin-top:6px">Увійти / створити профіль</button>' : ''}</div>
    <div class="setsec"><div class="sett">Мова</div>
      <div class="langs">${LANGS.map(l => `<button class="${(st.lang || 'uk') === l.id ? 'on' : ''}" data-a="lang" data-v="${l.id}"><i>${l.flag}</i>${l.name}</button>`).join('')}</div></div>`, {
    sound: () => { st.music = st.music === false; save(); bgmStart(true); bgmUpdate(); modalRefresh(); },
    vibro: () => { st.vibro = !st.vibro; vibrate(30); save(); modalRefresh(); },
    pushall: () => { const p = pushCfg(); p.all = p.all === false; save(); pushSync(true); modalRefresh(); },
    pushg: v => { const p = pushCfg(); p.off = p.off || []; p.off = p.off.includes(v) ? p.off.filter(x => x !== v) : [...p.off, v]; save(); pushSync(true); modalRefresh(); },
    pushbat: () => { try { HmApp.requestBattery(); } catch (e) {} setTimeout(() => { $('#m-body')._h = null; modalRefresh && modalRefresh(); }, 2500); },
    pushperm: () => { try { HmApp.requestNotifications(); } catch (e) {} setTimeout(() => { $('#m-body')._h = null; modalRefresh && modalRefresh(); }, 1500); },
    logout: () => confirmBox({ icon: 'friends', title: 'Вийти з акаунта?', text: 'Прогрес збережено на сервері. Щоб продовжити, увійди тим самим нікнеймом і паролем.', yes: 'Вийти', back: openMenu }, async () => { await netPush(true); pushUnreg(); await api('logout'); NET.auth = null; netStoreAuth(); try { localStorage.removeItem(SAVE_KEY); } catch (e) {} location.reload(); }),
    login: () => { closeModal(); const L = document.createElement('div'); L.id = 'loader'; L.className = 'authing'; L.innerHTML = '<div class="ld-bg"></div><div class="ld-shade"></div>'; document.body.appendChild(L); showAuth(() => { L.classList.add('dark'); setTimeout(() => L.remove(), 700); }); },
    fs: () => { st.fullscreen = st.fullscreen === false; save(); if (st.fullscreen !== false) goFullscreen(); else if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); modalRefresh(); },
    notif: () => { st.notif = st.notif === false; sfx('click'); save(); modalRefresh(); },
    q: v => { st.quality = v; applySettings(); sfx('click'); save(); modalRefresh(); },
    anim: () => { st.anim = st.anim === false; applySettings(); sfx('click'); save(); modalRefresh(); },
    lang: v => { st.lang = v; try { localStorage.setItem('mx_lang', v); } catch (e) {} saveNow(); applySettings(); pushSync(true); sfx('ding'); $('#m-body')._h = null; modalRefresh(); render(); },
  });
  const vr = $('#m-body');
  vr.oninput = e => { if (e.target.id === 'volr') { st.vol = +e.target.value; bgmUpdate(); e.target.style.setProperty('--p', st.vol + '%'); const vv = $('#volv'); if (vv) vv.textContent = st.vol + '%'; } };
  vr.onchange = e => { if (e.target.id === 'volr') { save(); sfx('coin'); $('#m-body')._h = null; } };
}

// ===================================================================
//  Нагороди, сповіщення, ефекти
// ===================================================================
let rewardOpen = false;
const levelUpQueue = [], rewardQueue = [];
let rewardToken = 0;
function showReward(opts) {
  if (rewardOpen) { rewardQueue.push(opts); return; }
  const { title, img, items = [], items2 = [], items2label = '', text = '', chest = false, flip = false, name = '' } = opts;
  rewardOpen = true; const token = ++rewardToken;
  const R = $('#reward');
  R.querySelector('.ribbon').textContent = title;
  const big = R.querySelector('.big'); big.src = IMG(img); big.className = 'big' + (chest ? ' shake' : flip ? ' flipin' : ' open');
  const it = R.querySelector('.items'), p = R.querySelector('p'), btn = R.querySelector('button'), sub = R.querySelector('.sub2');
  sub.textContent = '';
  const fill = () => {
    if (token !== rewardToken || !rewardOpen) return;
    sub.textContent = name;
    it.innerHTML = items.map((x, i) => `<div class="item" style="animation-delay:${i * .12}s"><img src="${IMG(x.img)}">${x.text}</div>`).join('') +
      (items2.length ? `<div class="isep">${items2label}</div>` + items2.map((x, i) => `<div class="item sm" style="animation-delay:${(items.length + i) * .12}s"><img src="${IMG(x.img)}">${x.text}</div>`).join('') : '');
    p.textContent = text; btn.hidden = false; confetti(50); sfx(chest ? 'chest' : 'level');
  };
  it.innerHTML = ''; p.textContent = ''; btn.hidden = true;
  R.classList.add('show');
  if (chest) setTimeout(() => { if (token === rewardToken) big.className = 'big open'; fill(); }, 1500); else setTimeout(fill, flip ? 500 : 0);
}
function closeReward() {
  $('#reward').classList.remove('show'); rewardOpen = false;
  if (rewardQueue.length) { const n = rewardQueue.shift(); setTimeout(() => showReward(n), 200); }
  render();
}
let lvlShown = 0; // найвищий рівень, який уже показали в цій сесії (стан із сервера може «підняти» той самий рівень вдруге)
function showLevelUp(l) {
  if (l <= lvlShown) return; lvlShown = l;
  showReward({ title: 'Новий рівень!', img: 'star3', name: 'Рівень ' + l,
    items: [{ img: BUCK, text: '+' + BALANCE.levelUpBucks }], text: '' });
  vibrate([30, 40, 30]);
}
let toastT;
function toast(msg, icon, force) {
  if (S && S.settings && S.settings.notif === false && !force) return;
  const t = $('#toast'); t.innerHTML = (icon ? `<img src="${IMG(icon)}" alt="">` : '') + `<span>${msg}</span>`; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800);
}
function sparkleAt(el, n = 8) {
  if (!el || !el.getBoundingClientRect) return;
  const app = $('#app').getBoundingClientRect(), r = el.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div'); s.className = 'sparkle';
    s.style.left = (r.left - app.left + rnd(0, r.width)) + 'px'; s.style.top = (r.top - app.top + rnd(0, r.height)) + 'px';
    s.style.animationDelay = rnd(0, .3) + 's';
    $('#app').appendChild(s); setTimeout(() => s.remove(), 1200);
  }
}
function coinFly(el, icon, target, amount) {
  if (!el || !el.getBoundingClientRect) return;
  const app = $('#app').getBoundingClientRect(), r = el.getBoundingClientRect(), tg = $(target).getBoundingClientRect();
  const sx = r.left - app.left + r.width / 2, sy = Math.max(r.top, app.top + 70) - app.top + 10;
  const d = document.createElement('div'); d.className = 'fly';
  d.innerHTML = `<img src="${IMG(icon)}">+${fmt(amount)}`;
  d.style.left = (sx - 30) + 'px'; d.style.top = Math.min(sy, app.height - 120) + 'px';
  $('#app').appendChild(d); setTimeout(() => d.remove(), 1100);
  const n = Math.min(6, 2 + Math.floor(Math.log10(amount + 1) * 1.5));
  for (let i = 0; i < n; i++) {
    const c = document.createElement('img'); c.className = 'coin-fly'; c.src = IMG(icon);
    const x0 = sx - 13 + rnd(-18, 18), y0 = Math.min(sy, app.height - 120) + rnd(-10, 10);
    c.style.left = x0 + 'px'; c.style.top = y0 + 'px';
    $('#app').appendChild(c);
    setTimeout(() => { c.style.transform = `translate(${tg.left - app.left + 4 - x0}px, ${tg.top - app.top - y0}px) scale(.7)`; c.style.opacity = '.3'; }, 30 + i * 60);
    setTimeout(() => c.remove(), 900 + i * 60);
  }
}
function popRes(sel) { const el = $(sel).parentElement; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
function confetti(n = 40) {
  n = Math.round(n * qMul()); if (S.settings.anim === false) n = 0;
  const colors = ['#ffcf3d', '#ff5d7a', '#4fc3f7', '#7ee36f', '#b388ff', '#ff9f43'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div'); c.className = 'confetti';
    Object.assign(c.style, { left: rnd(0, 100) + '%', background: pick(colors), animationDuration: rnd(1.6, 3) + 's', animationDelay: rnd(0, .4) + 's', borderRadius: Math.random() < .5 ? '50%' : '2px' });
    $('#app').appendChild(c); setTimeout(() => c.remove(), 3500);
  }
}

// ===================================================================
//  Запуск
// ===================================================================
// ===================================================================
//  Рух машин по дорозі: верхня смуга → праворуч, нижня ← ліворуч; машини не проїжджають крізь повільніших
// ===================================================================
const traffic = { cars: [], last: 0, next: 0, el: null };
const PX_PER_M = 14;
function spawnCar() {
  const lane = Math.random() < .5 ? 0 : 1, dir = lane === 0 ? 1 : -1, W = traffic.el.clientWidth;
  const def = pick(CARS), w = Math.round(Math.min(def.len, 8.2) * PX_PER_M), x = dir > 0 ? -w - 10 : W + 10;
  const same = traffic.cars.filter(c => c.lane === lane);
  if (same.some(c => (dir > 0 ? c.x : W - c.x - c.w) < w + 40)) return false;
  const el = document.createElement('img'); el.src = IMG(def.img); el.className = 'tcar l' + lane;
  el.style.width = w + 'px';
  const flip = (def.face === 'R') !== (dir > 0); if (flip) el.style.setProperty('--sx', '-1');
  traffic.el.appendChild(el);
  const v = (def.len > 8 ? rnd(28, 40) : rnd(40, 75)) * (def.img === 'car_police' || def.img === 'car_fire' ? 1.25 : 1);
  traffic.cars.push({ el, lane, dir, x, w, v, vmax: v });
  return true;
}
function trafficLoop(t) {
  requestAnimationFrame(trafficLoop);
  if (!traffic.el || !traffic.el.isConnected) { traffic.el = $('.road .traffic'); if (!traffic.el) return; }
  const dt = Math.min(.05, (t - (traffic.last || t)) / 1000); traffic.last = t;
  if ((S.settings.quality || 'high') === 'low' || document.hidden) { traffic.cars.forEach(c => c.el.remove()); traffic.cars = []; return; }
  if (modalOpen() || towerScrolling || !roadVis) { traffic.last = t; return; } // поки відкрите вікно або гортаємо вежу — машини стоять, процесор відпочиває
  if (!traffic.W || traffic.wv !== innerWidth) { traffic.W = traffic.el.clientWidth; traffic.wv = innerWidth; }
  const W = traffic.W, target = traffic.target || (traffic.target = irnd(2, 4));
  if (traffic.cars.length < target && t > traffic.next) { if (spawnCar()) traffic.next = t + rnd(900, 3500); else traffic.next = t + 400; }
  for (const lane of [0, 1]) {
    const cars = traffic.cars.filter(c => c.lane === lane).sort((a, b) => lane === 0 ? b.x - a.x : a.x - b.x); // від переднього до заднього
    cars.forEach((c, i) => {
      let v = c.vmax;
      const ahead = cars[i - 1];
      if (ahead) {
        const gap = c.dir > 0 ? ahead.x - (c.x + c.w) : c.x - (ahead.x + ahead.w);
        const safe = 24 + c.v * .45;
        if (gap < safe) v = Math.min(v, ahead.v * (gap < safe * .6 ? .85 : 1));
      }
      c.v += (v - c.v) * Math.min(1, dt * 2.5);
      c.x += c.dir * c.v * dt;
      c.el.style.transform = `translateX(${c.x.toFixed(1)}px) scaleX(var(--sx, 1))`;
    });
  }
  roadEventTick(t);
  traffic.cars = traffic.cars.filter(c => { const out = c.dir > 0 ? c.x > W + 20 : c.x + c.w < -20; if (out) { c.el.remove(); traffic.target = irnd(2, 4); } return !out; });
}
// ---------- Щаслива година ----------
function askHappyHour() {
  if (S.hh.date === dayKey(now())) { toast('Щаслива година вже була сьогодні', 'stopwatch'); return; }
  openModal({ icon: 'stopwatch', title: 'Щаслива година', sub: `${HAPPY_HOUR.minutes} хв раз на день`, color: '#c9921c' }, () =>
    `<div class="askbox"><img class="hhbig" src="${IMG('stopwatch')}" alt=""><p>Протягом <b>${HAPPY_HOUR.minutes} хвилин</b> усі доставки й продажі, які ти почнеш, будуть <b>удвічі швидшими</b>. Активувати можна раз на день — обери вдалий момент!</p></div>
     <button class="btn gold wide shine" data-a="go">Активувати зараз</button>`,
  { go: () => { S.hh = { date: dayKey(now()), until: now() + HAPPY_HOUR.minutes * 60 }; sfx('level'); confetti(30); closeModal(); toast('Щаслива година! Усе вдвічі швидше', 'stopwatch'); save(); render(); } });
}
// ---------- Паркінг (техніка під вежею) ----------
function renderParking() {
  const el = $('#parking'); if (!el) return;
  const key = TECH.map(t => tech(t.id)).join();
  if (el._k === key) return; el._k = key;
  el.innerHTML = `<div class="pk-head"><span>P</span><b>Паркінг</b><em>${techTotal()} / ${TECH.length * TECH_MAX}</em></div><div class="pk-lot">` +
    TECH.map(t => `<div class="pk-slot ${tech(t.id) ? '' : 'empty'}" data-pk="1"><img src="${IMG(t.img)}" alt=""><i>${tech(t.id)}/${TECH_MAX}</i></div>`).join('') + '</div>';
}
// ---------- Вертолітний майданчик ----------
function heliTick() {
  const H = S.heli, t = now();
  if (H.order) {
    const o = H.order, T = HELI.tasks.find(x => x.id === o.kind);
    if (!o.done && (S.stats[T.stat] || 0) - o.base >= o.n) { o.done = true; toast('Замовлення VIP з вертольота виконано!', 'heli_red'); }
    if (!o.done && t > o.until) { H.order = null; H.arrived = 0; H.next = t + rnd(...HELI.every); toast('VIP-гість полетів — замовлення не виконано', 'heli_red'); }
    return;
  }
  if (!H.arrived && t >= H.next) { H.arrived = t; toast('На дах прилетів вертоліт з VIP-гостем!', 'heli_red'); sfx('ding'); }
  if (H.arrived && t > H.arrived + HELI.wait) { H.arrived = 0; H.next = t + rnd(...HELI.every); }
}
function renderHeli() {
  const el = $('#helipad'); if (!el) return;
  const H = S.heli, on = !!(H.arrived || H.order);
  el.classList.toggle('landed', on); el.classList.toggle('done', !!(H.order && H.order.done));
  const tm = el.querySelector('.htime');
  if (tm) tm.textContent = H.order ? (H.order.done ? '✓' : fmtT(H.order.until - now())) : H.arrived ? '!' : fmtT(Math.max(0, H.next - now()));
}
function openHeli() {
  const H = S.heli;
  if (!H.arrived && !H.order) { toast(`Наступний вертоліт через ${fmtT(H.next - now())}`, 'heli_red'); return; }
  if (!H.order) { const T = pick(HELI.tasks); H.pending = H.pending || { kind: T.id, n: T.n(S.level) }; }
  openModal({ icon: 'heli_red', title: 'VIP з вертольота', sub: 'Особливе замовлення · щедра нагорода', color: '#d0342c' }, () => {
    const o = H.order, rw = HELI.reward(Math.max(1, S.level)), q = o || H.pending;
    if (!q) { setTimeout(closeModal); return ''; }
    const T = HELI.tasks.find(x => x.id === q.kind), p = o ? Math.min(o.n, (S.stats[T.stat] || 0) - o.base) : 0;
    let h = `<div class="helibox"><img class="hvip" src="${IMG('ch_king')}" alt=""><div class="grow"><div class="name">${T.text(q.n)}</div>
      <div class="meta">${o ? (o.done ? 'Виконано!' : 'Залишилось ' + fmtT(o.until - now())) : `На виконання — ${fmtT(HELI.time)}`}</div>
      ${o ? `<div class="mini-prog"><i style="width:${p / o.n * 100}%"></i></div><div class="meta">${fmt(p)} / ${fmt(o.n)}</div>` : ''}</div></div>
      <div class="vrew" style="justify-content:center;margin:8px 0 12px"><span><img src="${IMG(BUCK)}">20–60</span><span><img src="${IMG(COIN)}">${fmt(rw.coins)}</span><span><img src="${IMG('star3')}">${fmt(rw.xp)}</span><span><img src="${IMG('keys')}">3–8</span></div>`;
    h += o ? (o.done ? '<button class="btn gold wide shine" data-a="claim">Забрати нагороду</button>' : '') : '<button class="btn green wide shine" data-a="take">Прийняти замовлення</button>';
    return h;
  }, {
    take: () => { const q = H.pending, T = HELI.tasks.find(x => x.id === q.kind); H.order = { ...q, base: S.stats[T.stat] || 0, until: now() + HELI.time, done: false }; H.pending = null; sfx('ding'); save(); render(); modalRefresh(); },
    claim: () => {
      const rw = HELI.reward(Math.max(1, S.level)); gainBucks(rw.bucks); S.coins += rw.coins; addKeys(rw.keys); passAdd('heli');
      H.order = null; H.arrived = 0; H.next = now() + rnd(...HELI.every); closeModal(); save(); render();
      showReward({ title: 'Замовлення VIP!', img: 'heli_red', name: 'Вертоліт відлітає задоволеним', items: [{ img: BUCK, text: '+' + rw.bucks }, { img: 'coins_heap', text: '+' + fmt(rw.coins) }, { img: 'star3', text: '+' + fmt(rw.xp) + ' XP' }, { img: 'keys', text: '+' + rw.keys }] });
      addXP(rw.xp); save();
    },
  });
}
// ---------- Мільйонер на дорозі ----------
let roadEv = { next: 0, el: null, until: 0 };
function roadEventTick(t) {
  if (!traffic.el) return;
  const nowS = now();
  if (!roadEv.next) roadEv.next = nowS + rnd(60, 120);
  if (roadEv.el) {
    if (nowS > roadEv.until) { roadEv.el.classList.add('leave'); const e = roadEv.el; setTimeout(() => e.remove(), 1200); roadEv.el = null; roadEv.next = nowS + rnd(...ROAD_EVENT.every); }
    return;
  }
  if (nowS < roadEv.next || (S.settings.quality || 'high') === 'low' || document.hidden) return;
  const el = document.createElement('div'); el.className = 'milcar';
  el.innerHTML = `<img src="${IMG('car_gt')}" alt=""><span class="milbub"><img src="${IMG(BUCK)}" alt="">!</span>`;
  el.onclick = () => {
    if (!roadEv.el) return;
    const shops = bizFloors(); const dest = shops.length ? pick(shops).id : hotel().id;
    S.queue.unshift({ dest, kind: 'vip', ch: 'ch_king', mil: true }); sfx('ding'); toast('Мільйонер чекає на ліфт у вестибюлі!', 'ch_king');
    el.classList.add('leave'); setTimeout(() => el.remove(), 1200); roadEv.el = null; roadEv.next = now() + rnd(...ROAD_EVENT.every); save(); render();
  };
  $('.road').appendChild(el); roadEv.el = el; roadEv.until = nowS + ROAD_EVENT.wait;
  toast('Біля вежі зупинився мільйонер — забери його!', 'car_gt');
}
// ---------- Сезонний пропуск ----------
const seasonKey = () => { const d = new Date(); return d.getFullYear() * 100 + d.getMonth() + 1; };
function ensurePass() { const k = seasonKey(); if (!S.pass || S.pass.season !== k) S.pass = { season: k, sp: 0, f: {}, p: {}, prem: false }; }
function passAdd(src) { ensurePass(); const lv0 = passLevel(); S.pass.sp += PASS.src[src] || 0; if (passLevel() > lv0) toast(`Сезонний пропуск: рівень ${passLevel()}!`, 'ach_laurel'); }
const passLevel = () => Math.min(PASS.levels, 1 + Math.floor(S.pass.sp / PASS.sp));
function passReward(i, prem) {
  const L = Math.max(1, S.level), lv = i + 1, e = lv <= 30 ? lv : Math.round(30 + (lv - 30) * 0.4); // після 30 рівня банкноти й ключі ростуть повільніше
  if (!prem) {
    if (lv % 10 === 0) return { kind: 'chest', id: lv % 50 === 0 ? 'red' : 'purple' };
    return [{ kind: 'coins', n: 1000 * L * lv }, { kind: 'keys', n: 5 + Math.floor(e / 5) }, { kind: 'chest', id: lv < 12 ? 'blue' : 'purple' }, { kind: 'xp', n: 150 * L * lv }, { kind: 'bucks', n: 15 + e * 2 }][i % 5];
  }
  if (lv % 10 === 0) return { kind: 'bucks', n: lv === 100 ? 5000 : lv === 50 ? 3000 : 500 * Math.min(lv, 30) / 10 + 500 };
  return [{ kind: 'bucks', n: 60 + e * 10 }, { kind: 'chest', id: 'red' }, { kind: 'keys', n: 20 + e }, { kind: 'bonus', svc: pick ? ['marketing', 'pr', 'manager'][lv % 3] : 'marketing', pct: lv % 3 === 2 ? 0 : 300, h: 6 + Math.floor(lv / 5) }, { kind: 'coins', n: 4000 * L * lv }][i % 5];
}
function rewardView(r) {
  if (r && r.kind === 'corpinv') return { img: 'bz_office', text: tr('Корпорація') + ' «' + r.name + '»' };
  if (Array.isArray(r)) { const v = r.map(rewardView); return { img: (v[0] || {}).img || 'gift_red', text: v.map(x => x.text).join(' + '), list: v }; }
  if (r.kind === 'coins') return { img: COIN, text: fmt(r.n) };
  if (r.kind === 'bucks') return { img: BUCK, text: fmt(r.n) };
  if (r.kind === 'keys') return { img: 'keys', text: '×' + r.n };
  if (r.kind === 'xp') return { img: 'star3', text: fmt(r.n) + ' XP' };
  if (r.kind === 'chest') { const c = CHESTS.find(x => x.id === r.id) || CHESTS[0]; return { img: c.icon, text: (r.n > 1 ? r.n + '× ' : '') + 'Скриня' }; }
  if (r.kind === 'bonus') return { img: SERVICES[r.svc].img, text: `${r.pct ? '+' + r.pct + '% · ' : ''}${r.h} год` };
}
function applyReward(r) {
  if (Array.isArray(r)) return r.forEach(applyReward);
  if (r.kind === 'coins') S.coins += r.n;
  if (r.kind === 'bucks') gainBucks(r.n);
  if (r.kind === 'keys') addKeys(r.n);
  if (r.kind === 'xp') addXP(r.n);
  if (r.kind === 'chest') S.chestInv[r.id] = (S.chestInv[r.id] || 0) + Math.max(1, r.n || 1);
  if (r.kind === 'bonus') { const cur = S.svc[r.svc], on = svcOn(r.svc); S.svc[r.svc] = { pct: on ? Math.max(cur.pct || 0, r.pct) : r.pct, until: (on ? cur.until : now()) + r.h * 3600 }; }
}
const passClaimable = () => { if (!S.pass) return 0; const lv = passLevel(); let n = 0; for (let i = 0; i < lv; i++) { if (!S.pass.f[i]) n++; if (S.pass.prem && !S.pass.p[i]) n++; } return n; };
function passRewardShow(r, i, prem) {
  const v = rewardView(r), txt = r.kind === 'chest' ? CHESTS.find(c => c.id === r.id).name + ' скриня' : r.kind === 'xp' ? '+' + v.text : r.kind === 'bonus' ? SERVICES[r.svc].name + ' ' + v.text : '+' + v.text.replace('×', '');
  showReward({ title: prem ? 'Преміум-нагорода!' : 'Нагорода пропуску!', img: v.img, name: 'Сезонний пропуск · рівень ' + (i + 1), items: [{ img: v.img, text: txt }], chest: r.kind === 'chest' });
}
// Пропуск сам прокручується до наступної нагороди: спершу до тієї, яку можна забрати, інакше — до наступного рівня
let passSL = 0;
function passScroll(first) {
  const sc = document.querySelector('.pscroll'); if (!sc) return;
  if (!first) sc.scrollLeft = passSL;
  const can = sc.querySelector('.pscard.can'), c = can ? can.closest('.pcol') : (sc.querySelector('.pcol.cur') || sc.querySelector('.pcol:last-child'));
  if (c) sc.scrollTo({ left: Math.max(0, c.offsetLeft - sc.clientWidth / 2 + c.clientWidth / 2), behavior: first ? 'auto' : 'smooth' });
  sc.onscroll = () => { passSL = sc.scrollLeft; };
}
function openPass() {
  ensurePass();
  setTimeout(() => passScroll(true), 30);
  const end = new Date(); end.setMonth(end.getMonth() + 1, 1); end.setHours(0, 0, 0, 0);
  openModal({ icon: 'ach_laurel', title: 'Сезонний пропуск', sub: `Сезон закінчиться через ${fmtT(end / 1000 - now())}`, color: '#7a4fe0' }, () => {
    const P = S.pass, lv = passLevel(), inLv = P.sp % PASS.sp;
    let h = `<div class="passtop"><div class="plv"><b>${lv}</b><small>рівень</small></div><div class="grow"><div class="pbar2"><i style="width:${lv >= PASS.levels ? 100 : inLv / PASS.sp * 100}%"></i><span>${lv >= PASS.levels ? 'Максимум!' : `${inLv} / ${PASS.sp} очок`}</span></div>
      <div class="meta">Проходь етапи сезону та отримуй гарні винагороди!</div></div></div>`;
    if (!P.prem) h += `<button class="btn purple wide shine" data-a="prem">Відкрити преміум-лінію · ${PASS.premium} <img src="${IMG(BUCK)}"></button>`;
    h += `<div class="ptrack"><div class="plabels"><span class="pr">★ Преміум</span><span>Безкоштовно</span></div><div class="pscroll">`;
    for (let i = 0; i < PASS.levels; i++) {
      const fr = rewardView(passReward(i, false)), pr = rewardView(passReward(i, true)), open = i < lv, big = (i + 1) % 10 === 0;
      const cell = (rv, got, can, act, locked, cls) => `<div class="pscard ${cls} ${got ? 'got' : ''} ${can ? 'can' : ''} ${locked ? 'lock' : ''}" ${can ? `data-a="${act}" data-v="${i}"` : ''}><img src="${IMG(rv.img)}" alt=""><span>${rv.text}</span>${got ? '<i class="ok">✓</i>' : locked ? '<i class="lk">🔒</i>' : ''}</div>`;
      h += `<div class="pcol ${open ? 'open' : ''} ${big ? 'big' : ''} ${i === lv ? 'cur' : ''}">${cell(pr, P.p[i], open && P.prem && !P.p[i], 'cp', !P.prem, 'prem')}<div class="pnode">${i + 1}</div>${cell(fr, P.f[i], open && !P.f[i], 'cf', false, 'free')}</div>`;
    }
    h += '</div></div>';
    const src = [['clipboard', 'Щоденне завдання', PASS.src.daily, 'за кожне виконане'], ['vip2', 'VIP-завдання', PASS.src.vip, 'за кожне виконане'], ['cards', 'Завдання колекції', PASS.src.coll, 'за кожен отриманий предмет'],
      ['mz_closed', 'Лабіринт', PASS.src.maze, 'за кожне проходження'], ['heli_red', 'VIP-вертоліт', PASS.src.heli, 'за кожне виконане замовлення'], ['lt_2', 'Лотерея', PASS.src.lotto, 'за кожен відкритий білет'],
      ['coins_heap', 'Мільйонер на дорозі', PASS.src.mil, 'за кожного довезеного'], ['elev_1', 'Ліфт', PASS.src.rides5, 'за кожні 5 поїздок']];
    h += `<div class="pinfo"><div class="pst">Як отримувати очки</div>${src.map(([ic, n, v, d]) => `<div class="pi-row"><img src="${IMG(ic)}" alt=""><div class="grow"><b>${n}</b><small>${d}</small></div><em>+${v}</em></div>`).join('')}
      <div class="pi-note">Кожні <b>${PASS.sp} очок</b> — новий рівень пропуску, усього <b>${PASS.levels} рівнів</b>. На кожному рівні є безкоштовна нагорода, а з преміум-лінією (${fmt(PASS.premium)} банкнот) — ще й преміум-нагорода. Кожен 10-й рівень — особливо цінний приз. Сезон триває до кінця місяця: забери нагороди вчасно, бо з новим сезоном прогрес починається спочатку.</div></div>`;
    return h;
  }, {
    prem: () => { if (S.pass.prem) return;
      confirmBox({ icon: 'ach_laurel', title: 'Відкрити преміум?', text: `Відкрити преміум-лінію сезонного пропуску за <b>${fmt(PASS.premium)}</b> банкнот? Усі преміум-нагороди вже пройдених рівнів одразу стануть доступні.`, yes: `Так, за ${fmt(PASS.premium)} <img src="${IMG(BUCK)}">`, cls: 'purple', back: openPass },
        () => { if (S.pass.prem || !spendBucks(PASS.premium)) return; S.pass.prem = true; sfx('level'); confetti(40); save(); render(); setTimeout(() => passScroll(), 60); }); },
    cf: async v => { const i = +v; if (S.pass.f[i] || i >= passLevel()) return; if (!await guardClaim('pf:' + S.pass.season + ':' + i, () => { S.pass.f[i] = 1; }) || S.pass.f[i]) return; S.pass.f[i] = 1; const r = passReward(i, false); applyReward(r); save(); render(); modalRefresh(); setTimeout(() => passScroll(), 30); passRewardShow(r, i, false); },
    cp: async v => { const i = +v; if (!S.pass.prem || S.pass.p[i] || i >= passLevel()) return; if (!await guardClaim('pp:' + S.pass.season + ':' + i, () => { S.pass.p[i] = 1; }) || S.pass.p[i]) return; S.pass.p[i] = 1; const r = passReward(i, true); applyReward(r); save(); render(); modalRefresh(); setTimeout(() => passScroll(), 30); passRewardShow(r, i, true); },
  });
}
// ---------- машини на паркінгу ----------
const PK_CARS = Array.from({ length: 10 }, (_, i) => 'pk_' + (i + 1));
function pkFree() { const e = document.getElementById('pk-free'); if (e) e.textContent = [...document.querySelectorAll('.pk-bay')].filter(b => !b.querySelector('img.in')).length; }
function parkingTick() {
  const bays = [...document.querySelectorAll('.pk-bay')]; if (!bays.length) return;
  const b = pick(bays), img = b.querySelector('img');
  if (img && img.classList.contains('in') && Math.random() < .55) { img.classList.remove('in'); setTimeout(() => { img.remove(); pkFree(); }, 1500); pkFree(); }
  else if (!img) {
    const used = bays.map(x => x.querySelector('img')).filter(Boolean).map(x => x.dataset.c);
    const c = pick(PK_CARS.filter(x => !used.includes(x))), el = document.createElement('img'); el.src = IMG(c); el.dataset.c = c; el.alt = '';
    b.appendChild(el); requestAnimationFrame(() => requestAnimationFrame(() => { el.classList.add('in'); pkFree(); }));
  }
}
function initParking() {
  const bays = [...document.querySelectorAll('.pk-bay')], cars = [...PK_CARS].sort(() => Math.random() - .5);
  bays.forEach((b, i) => { if (Math.random() < .75) { const el = document.createElement('img'); el.src = IMG(cars[i]); el.dataset.c = cars[i]; el.className = 'in'; b.appendChild(el); } }); pkFree();
  (function loop() { setTimeout(() => { if (!document.hidden) parkingTick(); loop(); }, rnd(6000, 14000)); })();
}
// ---------- Пошта та новини ----------
function sendMail(m) { S.mail = S.mail || []; S.mail.unshift({ id: S.nextId++, t: now(), read: false, claimed: false, ...m }); if (S.mail.length > 40) S.mail.length = 40; }
function ensureMail() {
  S.mail = S.mail || [];
  // Разова чистка: прибираємо старі автоматичні листи (вітальний, щоденні, бонуси не за 10/20/…/120 рівні)
  if (!S.mailV2) { S.mailV2 = 1; S.mail = S.mail.filter(m => m.sid || (/^Рівень (\d+)!$/.test(m.title) && +m.title.match(/\d+/)[0] % 10 === 0 && m.claimed)); }
}
const mailUnread = () => (S.mail || []).filter(m => !m.read || (m.reward && !m.claimed)).length;
const newsUnread = () => NEWS.filter(n => n.id > (S.newsSeen || 0)).length + activePromos().filter(p => !(S.promoSeen || []).includes(p.id)).length;
function openMail() {
  ensureMail();
  openModal({ icon: 'mail2', title: 'Пошта', sub: 'Листи й подарунки', color: '#2a6fe0' }, () =>
    `<button class="btn purple wide dmopen" data-a="dms"><img src="${IMG('chat')}" alt="">Особисті повідомлення${NET.dmUnread ? ` <span class="rec">${NET.dmUnread}</span>` : ''}</button>` + (S.mail.length ? S.mail.map(m => { const rv = m.reward ? rewardView(m.reward) : null;
      return `<div class="mailrow ${m.read ? '' : 'new'}" data-a="read" data-v="${m.id}"><img class="mi" src="${IMG(m.icon || 'mail2')}" alt=""><div class="grow"><div class="mfrom">${m.from} · ${fmtT(now() - m.t)} тому</div><div class="name">${m.sid ? mtHTML(m.title) : m.title}</div><div class="meta">${m.sid ? mtHTML(m.text, { br: true }) : emoTxt(m.text).replace(/\n/g, '<br>')}</div>
        ${rv ? `<div class="vrew"><span><img src="${IMG(rv.img)}">${rv.text}</span></div>` : ''}</div>
        ${m.reward && m.reward.kind === 'corpinv' ? (m.claimed ? `<button class="btn gray">${m.answer || '✓'}</button>` : `<div class="inv-b"><button class="btn green shine" data-a="cinvy" data-v="${m.id}">${tr('Прийняти')}</button><button class="btn red" data-a="cinvn" data-v="${m.id}">${tr('Відхилити')}</button></div>`)
          : m.reward ? (m.claimed ? '<button class="btn gray">✓</button>' : `<button class="btn green shine" data-a="claim" data-v="${m.id}">Забрати</button>`) : ''}</div>`; }).join('')
      : '<div class="note">Листів поки немає.</div>') + (S.mail.some(m => m.read && (!m.reward || m.claimed)) ? '<button class="btn gray wide" data-a="clean" style="margin-top:8px">Видалити прочитані</button>' : ''),
  { dms: () => openMessages('dialogs', openMail),
    cinvy: v => corpAnswer(S.mail.find(x => x.id === +v), true), cinvn: v => corpAnswer(S.mail.find(x => x.id === +v), false),
    read: v => { const m = S.mail.find(x => x.id === +v); if (m && !m.read) { m.read = true; save(); render(); modalRefresh(); } },
    claim: async v => { const m = S.mail.find(x => x.id === +v); if (!m || m.claimed) return; if (m.sid) { if (!NET.online) return toast(netErr('offline'), 'mail2', true); const ok = await netTakeMail(m); m.claimed = true; m.read = true; if (!ok) { save(); render(); modalRefresh(); return; } } m.claimed = true; m.read = true; applyReward(m.reward); if (m.reward && m.reward.don) ['donate100', 'donate600', 'donate1000'].forEach(id => dtProg(id, m.reward.n)); const rv = rewardView(m.reward); sfx('coin'); toast('Отримано: ' + rv.text, rv.img); save(); render(); modalRefresh(); },
    clean: () => { S.mail = S.mail.filter(m => !m.read || (m.reward && !m.claimed)); save(); render(); modalRefresh(); } });
}
function openNews() {
  const seen = S.newsSeen || 0; S.newsSeen = Math.max(seen, ...NEWS.map(n => n.id)); save(); render();
  S.promoSeen = activePromos().map(p => p.id);
  const promoHTML = () => activePromos().map(p => { const rv = p.rewards && p.rewards.length ? rewardView(p.rewards) : null;
    return `<div class="promo-card" style="--pc:${p.color}"><img src="${IMG(p.icon)}" alt=""><div class="grow"><div class="pc-tag">🔥 ${p.type === 'donate' ? tr('Донат-акція') : tr('Знижка')} · ⏱ ${fmtT(p.end - now())}</div><div class="name">${mtHTML(p.title)}</div><div class="meta">${mtHTML(p.text, { br: true })}</div>
      <div class="pc-deal">${promoTxt(p)}</div>${rv ? `<div class="vrew">${(rv.list || [rv]).map(x => `<span><img src="${IMG(x.img)}">${tr('в подарунок')} ${x.text}</span>`).join('')}</div>` : ''}</div>
      ${p.type === 'donate' ? `<button class="btn green shine" data-a="don">${tr('Купити')}</button>` : ''}</div>`; }).join('');
  openModal({ icon: 'megaphone2', title: 'Новини', sub: 'Офіційні новини та акції від адміністрації', color: '#d0342c' }, () => promoHTML() +
    (NEWS.length ? NEWS.map(n => `<div class="newsrow ${n.id > seen ? 'new' : ''}"><img src="${IMG(n.icon)}" alt=""><div class="grow"><div class="mfrom">📢 Адміністрація · ${n.date}</div><div class="name">${/<[a-z]/i.test(n.title) ? n.title : mtHTML(n.title)}${n.id > seen ? ' <span class="rec">Нове</span>' : ''}</div><div class="meta">${/<[a-z]/i.test(n.text) ? n.text : mtHTML(n.text, { br: true })}</div></div></div>`).join('') : (NET.promos && NET.promos.length ? '' : '<div class="note">Новин поки немає.</div>')),
  { don: () => openDonate(), promo: async v => {
      const p = (NET.promos || []).find(x => x.id === +v); if (!p || p.claimed) return;
      if (!NET.online) return toast(netErr('offline'), 'gift_red', true);
      const r = await api('promo_take', { id: p.id }); if (!r.ok) return toast(netErr(r.error), 'gift_red', true);
      p.claimed = true; if (r.fresh) { applyReward(r.rewards); const rv = rewardView(r.rewards); sfx('coin'); toast('Отримано: ' + rv.text, rv.img); save(); }
      render(); modalRefresh();
    } });
  if (typeof netPullPromos === 'function') netPullPromos();
}
// ---------- Екран завантаження ----------
const LOAD_TIPS = ['Завантажуємо графіку вежі…', 'Розставляємо меблі на поверхах…', 'Перевіряємо ліфт…', 'Запрошуємо перших гостей…', 'Готуємо скрині та нагороди…', 'Підключаємо паркінг…', 'Полируємо кубки…', 'Майже готово!'];
function runLoader() {
  const L = document.getElementById('loader'); if (!L) return;
  document.getElementById('ld-ver').innerHTML = '<small>версія</small><b>' + VERSION + '</b>';
  const fill = document.getElementById('ld-fill'), pct = document.getElementById('ld-pct'), tip = document.getElementById('ld-tip');
  const list = ['images/splash.jpg', ...(typeof ASSETS !== 'undefined' ? ASSETS : [])];
  let done = 0, shown = 0, ti = 0; const t0 = performance.now();
  const step = () => { done++; };
  list.forEach(src => { const im = new Image(); im.onload = im.onerror = step; im.decoding = 'async'; im.src = src; });
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  let fontsOk = false; fontsReady.then(() => fontsOk = true);
  const tipT = setInterval(() => { ti = (ti + 1) % LOAD_TIPS.length; tip.classList.remove('in'); void tip.offsetWidth; tip.textContent = tr(LOAD_TIPS[ti]); tip.classList.add('in'); }, 1100);
  tip.textContent = tr(LOAD_TIPS[0]); tip.classList.add('in');
  (function frame() {
    const real = (done / list.length) * (fontsOk ? 1 : .97), minT = Math.min(1, (performance.now() - t0) / 1800);
    const target = Math.min(real, minT);
    shown += (target - shown) * .12; if (target >= 1 && shown > .995) shown = 1;
    fill.style.width = (shown * 100).toFixed(1) + '%'; pct.textContent = Math.round(shown * 100) + '%';
    if (shown >= 1) { clearInterval(tipT); tip.textContent = tr('Підключення до сервера…'); netBoot().then(st => {
      const finish = () => { if (!String(st).startsWith('offline')) tip.textContent = tr('Ласкаво просимо!'); if (NET.auth) netAfterLogin(); setTimeout(() => { L.classList.add('dark'); setTimeout(() => { L.remove(); const fd = document.createElement('div'); fd.id = 'fadein'; document.body.appendChild(fd); requestAnimationFrame(() => requestAnimationFrame(() => fd.classList.add('go'))); setTimeout(() => fd.remove(), 1000); }, 700); }, 400); };
      if (st === 'need_auth') { tip.textContent = ''; L.classList.add('authing'); showAuth(() => { L.classList.remove('authing'); finish(); }); } else { if (st === 'offline' || st === 'offline_auth') tip.textContent = tr('Офлайн-режим'); finish(); }
    }); return; }
    requestAnimationFrame(frame);
  })();
}
// ---------- повноекранний режим і продуктивність ----------
const isMobile = () => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && innerWidth < 900);
function goFullscreen() {
  if (S.settings.fullscreen === false || document.fullscreenElement || !isMobile()) return;
  const el = document.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen;
  if (rq) try { const p = rq.call(el, { navigationUI: 'hide' }); if (p && p.catch) p.catch(() => {}); } catch (e) {}
  try { screen.orientation && screen.orientation.lock && screen.orientation.lock('portrait').catch(() => {}); } catch (e) {}
}
function initFullscreen() {
  const once = () => { goFullscreen(); };
  document.addEventListener('pointerup', once, { passive: true });
  // висота екрана без «стрибків» адресного рядка
  const setVh = () => document.documentElement.style.setProperty('--vh', innerHeight * .01 + 'px');
  setVh(); addEventListener('resize', setVh, { passive: true });
}
function autoQuality() {
  if (S.settings.quality) return;
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  S.settings.quality = (mem <= 2 || cores <= 2) ? 'low' : (mem <= 4 || cores <= 4) && isMobile() ? 'mid' : 'high';
}
function init() {
  document.title = GAME_TITLE;
  const existed = load();
  initSky(); applySettings(); runLoader(); initParking(); initFullscreen();
  { const rd = $('.road'); if (rd && !rd.querySelector('.traffic')) { const tr2 = document.createElement('div'); tr2.className = 'traffic'; rd.appendChild(tr2); } requestAnimationFrame(trafficLoop); }
  $('#floors').addEventListener('click', e => {
    const fe = e.target.closest('.floor'); if (!fe) return;
    const f = floorById(+fe.dataset.id); if (!f) return;
    if (e.target.closest('[data-act="main"]')) return void floorAction(f, e.target.closest('.fbtn'));
    openFloor(f);
  });
  $('#modal').addEventListener('click', e => {
    if (e.target.closest('[data-close]')) { const b = modalBack; modalBack = null; closeModal(); if (b) b(); return; }
    const b = e.target.closest('[data-a]'); if (!b || !b.dataset.a) return;
    const fn = modalActions[b.dataset.a], isTab = b.dataset.a === 'tab' || b.closest('.tabs, .rtabs, .stabs, .ctabs, .seg2, .rtab');
    if (fn) fn(b.dataset.v);
    if (isTab) { const mb = $('#m-body'); if (mb && !mb.querySelector('.fchat')) scrollTopHard(mb); }
  });
  // закриття по фону — лише якщо дотик почався й закінчився на фоні і клавіатура/розмір екрана щойно не змінювались
  // (на телефоні при відкритті клавіатури вікно зсувається, і «клік» міг влучити у фон — вікно закривалось саме)
  let bgDown = false, vvT = 0; if (window.visualViewport) visualViewport.addEventListener('resize', () => { vvT = Date.now(); });
  $('#modal-bg').addEventListener('pointerdown', e => { bgDown = e.target.id === 'modal-bg'; });
  $('#modal-bg').addEventListener('click', e => {
    if (e.target.id !== 'modal-bg' || !bgDown) return;
    if ($('#modal').classList.contains('tall') || Date.now() - vvT < 900 || document.body.classList.contains('kb-open')) return;
    const ae = document.activeElement; if (ae && (ae.isContentEditable || /INPUT|TEXTAREA/.test(ae.tagName))) return;
    closeModal();
  });
  const sc = $('#scroller');
  $('#build-btn').onclick = openBuild;
  $('#car').onclick = () => ride();
  $('#side-lift').onclick = () => askDeliverAll();
  $('#side-up').onclick = () => sc.scrollTo({ top: 0, behavior: 'smooth' });
  $('#side-down').onclick = () => sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' });
  $('#nav-ops').onclick = () => { if (opsMode()) openOps(); };
  $('#nav-res').onclick = () => openResidents();
  $('#nav-shop').onclick = () => openShop();
  $('#nav-quest').onclick = () => openQuests();
  $('#nav-menu').onclick = openMenu;
  $('#side-left').addEventListener('click', e => { const c = e.target.closest('[data-promo]'); if (c) { e.stopPropagation(); c.dataset.promo === 'donate' ? openDonate() : openNews(); } }, true);
  $('#side-left').onclick = e => { if (e.target.closest('[data-hh]')) { if (!hhOn()) askHappyHour(); return; } if (e.target.closest('[data-tg]')) { chipsOpen = !chipsOpen; sfx('click'); render(); } };
  $('#rn-daily').onclick = () => openQuests();
  $('#rn-chests').onclick = openChests;

  $('#rn-up').onclick = openEmpire;
  $('#rn-cups').onclick = () => { const cc = countClaimable(); cupTab = !cc.cups && cc.ach ? 'ach' : 'cup'; openTrophies(); };
  $('#rn-coll').onclick = openCollections;
  $('#rn-vip').onclick = openVip;
  $('#rn-gift').onclick = openDaily;
  $('#rn-lotto').onclick = openLottery;
  $('#ti-mail').onclick = openMail; $('#ti-news').onclick = openNews; $('#ti-adm').onclick = () => openAdmin(); promoInstall();
  $('#nav-forum').onclick = () => { forumTab = 'chat'; forumTopic = null; openForum(); }; $('#nav-corp').onclick = () => openCorp('mem');
  $('#rn-pass').onclick = openPass;
  $('#helipad').onclick = e => { e.stopPropagation(); openHeli(); };
  $('#res-coins').onclick = () => openShop('exchange');
  $('#res-bucks').onclick = openDonate;
  $('#rn-maze').onclick = openMaze;
  $('#lvl').onclick = () => openProfile();
  $('#reward button').onclick = closeReward;

  tick();
  requestAnimationFrame(() => {
    sc.scrollTop = sc.scrollHeight;
    const car = $('#car'); car.style.transitionDuration = '0s'; car.style.bottom = carBottomFor(S.floors[0]) + 'px';
  });
  setInterval(tick, 1000); towerScrollWatch(); towerKinetic();
  visWatch($('#roof')); visWatch($('.road')); visWatch($('.parking'));
  setInterval(save, 5000);
  window.addEventListener('resize', () => render());
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); else tick(); });
  window.addEventListener('pagehide', save);

  if (offlineReport && !(S.tut && !S.tut.done)) {
    const r = offlineReport;
    showReward({ title: 'З поверненням!', img: 'treasure', text: `Тебе не було ${fmtT(r.dt)}.${svcOn('manager') ? ' Менеджер усе зібрав.' : ' Збери виручку з поверхів.'}`,
      items: [{ img: 'shop_bags', text: 'Продано на ' + fmt(r.sold) }] });
  }
  offlineReport = null;
}
document.addEventListener('DOMContentLoaded', init);
