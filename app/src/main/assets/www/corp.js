// ===================================================================
//  Корпорації «Мій Хмарочос»: головна сторінка, створення, споруди з бонусами,
//  звання, бюджет, спільні завдання й колекції. Усе зберігається на сервері.
// ===================================================================
const CSRC = n => (window.SPRITES && SPRITES['c_' + n]) || 'images/corp/' + n + '.png';
const CCSRC = (cat, i) => (window.SPRITES && SPRITES['cc_' + cat + '_' + i]) || `images/corp/coll/${cat}_${i}.png?v=${VERSION}`;
const CORP_PRICE = 5000, CORP_LEVEL = 10, CORP_EMBLEM_PRICE = 1000, CORP_BMAX = 30;
const CORP_ROLES = [['Новачок', 'badge_9', 'Учасник корпорації: отримує всі бонуси споруд і допомагає із завданнями'], ['Менеджер', 'badge_17', 'Може запрошувати гравців у корпорацію'],
  ['Адміністратор', 'badge_18', 'Запрошує гравців, змінює звання й виключає Новачків і Менеджерів'], ['Зам. директора', 'badge_10', 'Керує всіма, крім Директора; поповнює бюджет одразу, обмінює колекції'],
  ['Директор', 'badge_12', 'Головний: покращує споруди, змінює герб, керує всіма учасниками']];
const CORP_BLD = [
  { id: 'rev', name: 'Бізнес-центр', img: 'bld_5', what: 'виручки поверхів', per: 3, unit: '%' },
  { id: 'xp', name: 'Академія', img: 'bld_9', what: 'досвіду', per: 3, unit: '%' },
  { id: 'liftxp', name: 'Транспортна вежа', img: 'bld_3', what: 'досвіду в ліфті', per: 3, unit: '%' },
  { id: 'liftrev', name: 'Корпоративний банк', img: 'bld_7', what: 'виручки в ліфті', per: 3, unit: '%' },
  { id: 'lobby', name: 'Гранд-лобі', img: 'bld_8', what: 'місць для гостей біля ліфта', per: 5, unit: '' },
  { id: 'tips', name: 'Готель-люкс', img: 'bld_2', what: 'чайових банкнотами на день', per: 1, unit: '' },
];
const CORP_COLLS = [['tech', 'Технології'], ['energy', 'Енергетика'], ['finance', 'Фінанси'], ['auto', 'Автопромисловість'], ['retail', 'Ритейл та сервіс'], ['industry', 'Виробництво'], ['fashion', 'Мода та стиль'], ['medicine', 'Медицина'], ['food', 'Харчова промисловість']];
const CORP_TASKN = { rides: ['Ліфт', 'elev_1'], stocked: ['Закуп', 'handtruck'], unloaded: ['Склад', 'boxes'], cashed: ['Каса', 'cash_big'], vips: ['VIP', 'vip2'], tips: ['Чайові', 'cash'], earned: ['Виручка', 'coins_heap'], built: ['Поверхи', 'crane'], evict: ['Готель', 'friends'], evicted: ['Готель', 'friends'] };
const plw = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; };
// повний опис завдання з кількістю й одиницями
const fmtN = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const ctTitle = (k, n) => { const N = fmtN(n); return ({
  rides: `Перевезти ліфтом ${N} ${plw(n, 'відвідувача', 'відвідувачів', 'відвідувачів')}`, vips: `Розвезти ${N} VIP-${plw(n, 'гостя', 'гостей', 'гостей')}`,
  stocked: `Замовити товар на поверхи ${N} ${plw(n, 'раз', 'рази', 'разів')}`, unloaded: `Розвантажити товар на складі ${N} ${plw(n, 'раз', 'рази', 'разів')}`,
  cashed: `Зібрати виручку з поверхів ${N} ${plw(n, 'раз', 'рази', 'разів')}`, earned: `Зібрати ${N} ${plw(n, 'монету', 'монети', 'монет')} виручки`,
  evict: `Виселити з готелю ${N} ${plw(n, 'жителя', 'жителів', 'жителів')}`, evicted: `Виселити з готелю ${N} ${plw(n, 'жителя', 'жителів', 'жителів')}`,
  tips: `Отримати ${N} ${plw(n, 'банкноту', 'банкноти', 'банкнот')} чайових`, built: `Побудувати ${N} ${plw(n, 'новий поверх', 'нові поверхи', 'нових поверхів')}` })[k] || k; };
const ctUnit = (k, n) => ({ rides: plw(n, 'відвідувач', 'відвідувачі', 'відвідувачів'), vips: 'VIP', stocked: plw(n, 'замовлення', 'замовлення', 'замовлень'), unloaded: plw(n, 'раз', 'рази', 'разів'),
  cashed: plw(n, 'раз', 'рази', 'разів'), earned: plw(n, 'монета', 'монети', 'монет'), evict: plw(n, 'житель', 'жителі', 'жителів'), evicted: plw(n, 'житель', 'жителі', 'жителів'), tips: plw(n, 'банкнота', 'банкноти', 'банкнот'), built: plw(n, 'поверх', 'поверхи', 'поверхів') })[k] || '';
const cbldTime = to => Math.round(3600 * Math.pow(504, (to - 1) / 29));
const SHIELDS = Array.from({ length: 33 }, (_, i) => 'shield_' + (i + 1));
const bldCost = l => l % 2 === 0 ? { bucks: Math.round(1500 * Math.pow(1.14, l) / 10) * 10 } : { coins: Math.round(50e6 * Math.pow(1.22, l) / 1e6) * 1e6 };
const BOOSTABLE = ['rev', 'xp', 'liftxp', 'liftrev'];
const corpBoostOn = k => !!(NET.corp && NET.corp.boost && NET.corp.boost[k] > Date.now() / 1000);
const corpErr = { no_corp: 'Ти не в корпорації', in_corp: 'Ти вже в корпорації', corp_level: 'Доступно з 10 рівня', corp_name_len: 'Назва — від 3 до 24 символів', corp_name_chars: 'Недопустимі символи в назві',
  corp_name_taken: 'Така назва вже зайнята', corp_rights: 'Недостатньо прав', corp_target_level: 'Гравець ще не досяг 10 рівня', corp_target_in: 'Гравець уже в корпорації', corp_target_invited: 'Гравець уже має запрошення',
  no_invite: 'Запрошення вже недійсне', corp_gone: 'Корпорацію розпущено', corp_transfer_first: 'Спершу передай посаду Директора іншому учаснику', corp_too_new: 'Поповнювати бюджет можна після 3 днів у корпорації',
  corp_limit_b: 'Денний ліміт банкнот вичерпано', corp_limit_c: 'Денний ліміт монет вичерпано', corp_max: 'Максимальний рівень', corp_budget: 'Недостатньо коштів у бюджеті', coll_incomplete: 'Колекцію ще не зібрано', corp_full: 'У корпорації немає вільних місць', corp_boost_on: 'Бонус уже діє', corp_boost_zero: 'Спершу збудуй споруду',
  task_done: 'Завдання вже виконано', already_claimed: 'Нагороду вже отримано', task_busy: 'Ти вже виконуєш або допомагаєш в іншому завданні', corp_building: 'Споруда вже будується', ctask_have: 'У тебе вже є завдання', ctask_cancel_wait: 'Скасувати завдання можна раз на 3 години',
  ctask_not_done: 'Завдання ще не виконано', coll_cycle_done: 'Усі колекції циклу вже зібрано', bad_op: 'Помилка запиту' };
Object.assign(NET_ERR, corpErr);
const cErr = e => netErr(e);
let corpTab = 'mem', CORP = null, corpChatT = null, corpChat = [];
const roleChip = r => `<span class="crole r${r}"><img src="${CSRC(CORP_ROLES[r][1])}" alt="">${tr(CORP_ROLES[r][0])}</span>`;
const bonusTxt = (b, l) => `+${b.per * l}${b.unit} ${tr(b.what)}`;
const corpOn = () => NET.auth && NET.online;

function corpCanInvite(op) {
  return !!(NET.corp && NET.corp.role >= 1 && op && !op.me && !op.corp && !op.invited && (op.level || 1) >= CORP_LEVEL && !op.blocked && !op.blockedMe);
}
async function corpAnswer(m, yes) {
  if (!m || m.claimed) return; if (!corpOn()) return toast(netErr('offline'), 'bz_office', true);
  const r = await api('corp_answer', { accept: yes ? 1 : 0 });
  m.claimed = true; m.read = true; m.answer = yes ? tr('Прийнято') : tr('Відхилено'); save(); render();
  if (!r.ok) { modalRefresh && modalRefresh(); return toast(cErr(r.error), 'bz_office', true); }
  if (yes && r.joined) { toast(tr('Ласкаво просимо до корпорації!'), 'bz_office', true); confetti(30); await netBeat(); openCorp(); } else modalRefresh && modalRefresh();
}

// ---------- головний вхід ----------
// відкриваємо миттєво з кешу, а свіжі дані з сервера підтягуємо у фоні й тихо оновлюємо вікно (без стрибка прокрутки)
let corpRef = null;
const corpShowing = () => !!(modalRefresh && modalRefresh === corpRef && $('#modal-bg').classList.contains('show'));
function corpSoftRefresh(force) {
  if (!corpShowing()) return; const b = $('#m-body');
  if (!force && (corpTab === 'chat' || corpTab === 'bud' || corpTab === 'set')) return; // там є поля вводу — не чіпаємо
  b._h = null; modalRefresh();
}
async function openCorp(tab) {
  if (!corpOn()) return toast(netErr('offline'), 'bz_office', true);
  const prevTab = corpTab; if (tab) corpTab = tab;
  const cached = !!(CORP && CORP.corp && NET.corp && +CORP.corp.id === +NET.corp.id);
  if (corpShowing() && cached) { const b = $('#m-body'); b._h = null; b._force = true; modalRefresh(); if (prevTab !== corpTab) scrollTopHard(b); }
  else if (cached) corpPage();
  const r = await api('corp_info'); if (!r.ok) { if (!cached) toast(cErr(r.error), 'bz_office', true); return; }
  S.corpCt = r.corp ? r.corp.ctask || null : null; S.corpPlus = r.corp && r.corp.tasks.some(t => t.done && !t.claimed && t.taker === NET.auth.player.id) ? 1 : 0; save(); corpBadge();
  if (!r.corp) { CORP = r; return corpLanding(r); }
  if (cached && corpShowing() && +CORP.corp.id === +r.corp.id) { Object.assign(CORP.corp, r.corp); CORP.limit = r.limit; CORP.level = r.level; corpSoftRefresh(true); if (corpTab === 'chat') corpChatLoad(true); return; }
  CORP = r; corpPage();
  tourLoad().then(() => corpSoftRefresh());
}

// ---------- головна сторінка «Корпорації» для тих, хто ще не в корпорації ----------
function corpLanding(r) {
  openModal({ icon: 'bz_office', title: 'Корпорації', sub: 'Будуйте імперію разом', color: '#1f4fb8' }, () => {
    let h = `<div class="cl-hero"><div class="cl-sky">${['bld_10', 'bld_4', 'bld_1', 'bld_6', 'bld_11'].map((b, i) => `<img class="cl-b b${i}" src="${CSRC(b)}" alt="">`).join('')}</div>
      <div class="cl-txt"><b>${tr('Корпорації')}</b><p>${tr('Об’єднуйся з іншими гравцями, будуйте спільні споруди — і кожен учасник отримує бонуси для своєї вежі.')}</p></div></div>`;
    if (r.invite) h += `<div class="cl-inv"><img src="${CSRC(r.invite.emblem)}" alt=""><div class="grow"><b>${nk(r.invite.name)}</b><small>${tr('запрошує')} ${esc(r.invite.fnick)}</small></div>
      <div class="inv-b"><button class="btn green shine" data-a="iny">${tr('Прийняти')}</button><button class="btn red" data-a="inn">${tr('Відхилити')}</button></div></div>`;
    h += `<div class="psec"><div class="pst">${tr('Як це працює')}</div><div class="cl-how">
      <div><img src="${CSRC('ic_6')}" alt=""><span>${tr('Учасники поповнюють спільний бюджет: до 100 банкнот і 10 млн монет на день (більше, якщо ти підтримував гру покупками).')}</span></div>
      <div><img src="${CSRC('bld_9')}" alt=""><span>${tr('Директор покращує 6 споруд до 30 рівня — бонуси отримує кожен учасник.')}</span></div>
      <div><img src="${CSRC('ic_7')}" alt=""><span>${tr('Спільні завдання: хтось бере, інші допомагають. Нагорода — у бюджет і предмет колекції.')}</span></div>
      <div><img src="${CSRC('card_1')}" alt=""><span>${tr('9 колекцій корпорації: зберіть усі 8 предметів і обміняйте на бюджет.')}</span></div>
      <div><img src="${CSRC('shield_7')}" alt=""><span>${tr('Власна назва та герб корпорації.')}</span></div></div></div>`;
    const can = r.level >= CORP_LEVEL;
    h += `<button class="btn gold shine wide cl-create" data-a="create" ${can ? '' : 'disabled'}>${tr('Створити корпорацію')} · <img src="${IMG(BUCK)}" class="ib">${fmt(CORP_PRICE)}</button>
      ${can ? `<div class="note small">${tr('У бюджеті нової корпорації одразу буде 2 000 банкнот і 10 млн монет.')}</div>` : `<div class="note small">${tr('Створити або вступити до корпорації можна з 10 рівня. Твій рівень')}: ${r.level}</div>`}`;
    return h;
  }, { create: () => corpCreate(), iny: () => corpAnswerInvite(true), inn: () => corpAnswerInvite(false) });
  $('#modal').classList.add('tall');
}
async function corpAnswerInvite(yes) {
  const r = await api('corp_answer', { accept: yes ? 1 : 0 }); if (!r.ok) return toast(cErr(r.error), 'bz_office', true);
  (S.mail || []).forEach(m => { if (m.reward && m.reward.kind === 'corpinv' && !m.claimed) { m.claimed = true; m.answer = yes ? tr('Прийнято') : tr('Відхилено'); } }); save();
  if (yes) { confetti(30); toast(tr('Ласкаво просимо до корпорації!'), 'bz_office', true); await netBeat(); }
  openCorp();
}
function corpCreate() {
  let em = 'shield_1';
  setTimeout(() => { modalBack = () => corpLanding(CORP); });
  openModal({ icon: 'bz_office', title: 'Нова корпорація', sub: `${fmt(CORP_PRICE)} ${tr('банкнот')}`, color: '#1f4fb8' }, () =>
    `<div class="cc-prev"><img src="${CSRC(em)}" alt=""><div class="grow"><small>${tr('Назва корпорації')}</small><input id="cc-name" maxlength="24" autocomplete="off" placeholder="${tr('Наприклад: Небесна Імперія')}"></div></div>
     <div class="pst" style="margin:10px 0 6px">${tr('Обери герб')}</div><div class="cemb">${SHIELDS.map(s => `<button class="${s === em ? 'on' : ''}" data-a="em" data-v="${s}"><img src="${CSRC(s)}" alt=""></button>`).join('')}</div>
     <button class="btn gold shine wide" data-a="go" style="margin-top:12px">${tr('Створити')} · <img src="${IMG(BUCK)}" class="ib">${fmt(CORP_PRICE)}</button>`,
  { em: v => { const nm = $('#cc-name').value; em = v; $('#m-body')._h = null; modalRefresh(); $('#cc-name').value = nm; },
    go: async () => {
      const name = $('#cc-name').value.trim(); if (name.length < 3) return toast(cErr('corp_name_len'), 'bz_office', true);
      if (!spendBucks(CORP_PRICE)) return;
      const r = await api('corp_create', { name, emblem: em });
      if (!r.ok) { gainBucks(CORP_PRICE); save(); render(); return toast(cErr(r.error), 'bz_office', true); }
      save(); render(); sfx('level'); confetti(50); toast(`${tr('Корпорацію створено')}: ${name}`, 'bz_office', true); await netBeat(); openCorp('bld');
    } });
}

// ---------- сторінка корпорації ----------
function corpPage() {
  const C = CORP.corp, me = NET.auth.player.id, my = C.role, nowS = Date.now() / 1000;
  const tabs = [['mem', 'Учасники', 'ic_8'], ['bld', 'Споруди', 'bld_5'], ['task', 'Завдання', 'ic_14'], ['coll', 'Колекції', 'card_1'], ['bud', 'Бюджет', 'ic_6'], ['chat', 'Чат', 'ic_3'], ['set', 'Налаштування', 'ic_10']];
  openModal({ icon: 'bz_office', title: C.name, sub: `${tr('Корпорація')} · ${tr('рівень')} ${C.lvl}`, color: '#1f4fb8' }, () => {
    const xpPct = Math.min(100, C.xp / C.need * 100);
    let h = `<div class="cp-head"><img class="cp-em" src="${CSRC(C.emblem)}" alt=""><div class="grow"><b>${nk(C.name)}</b>
        <div class="cp-row"><img src="${CSRC('ic_13')}" alt="">${tr('Рівень')} <b>${C.lvl}</b></div><div class="cp-row"><img src="${CSRC('ic_8')}" alt="">${tr('Учасники')} <b>${C.members.length}/${C.cap}</b></div>${roleChip(my)}</div>
        <div class="cp-bud"><span><img src="${IMG(BUCK)}">${fmt(C.bucks)}</span><span><img src="${IMG(COIN)}">${fmt(C.coins)}</span>
          <span class="cpx" title="${tr('Досвід корпорації')}"><img src="${CSRC('ic_13')}"><em>${fmt(C.xp)} / ${fmt(C.need)}</em><i style="width:${xpPct}%"></i></span></div></div>
      <div class="ctabs">${tabs.map(([k, n, ic]) => `<button class="${corpTab === k ? 'on' : ''}" data-a="tab" data-v="${k}"><img src="${CSRC(ic)}" alt="">${tr(n)}</button>`).join('')}</div>`;
    // ---- учасники ----
    if (corpTab === 'mem') h += C.members.map(m => { const on = m.seen > nowS - 600, can = m.id !== me && my >= 2 && m.role < my;
      return `<div class="cmem2"><div class="cm2-top"><span class="fav pl-av" data-a="pl" data-v="${m.id}">${avHTML(m.avatar)}${on ? '<i class="ondot"></i>' : ''}</span>
          <div class="grow"><b data-a="pl" data-v="${m.id}">${nk(m.nick)}</b><div>${roleChip(m.role)}</div></div>
          ${can ? `<div class="cm2-act"><button class="btn blue" data-a="role" data-v="${m.id}">${tr('Редагувати')}</button><button class="btn red" data-a="kick" data-v="${m.id}">${tr('Вигнати')}</button></div>` : ''}</div>
        <div class="cm2-stats"><div><img src="${IMG(BUCK)}"><b>${fmt(m.d_bucks)}</b><small>${tr('внесено')}</small></div><div><img src="${IMG(COIN)}"><b>${fmt(m.d_coins)}</b><small>${tr('внесено')}</small></div><div><img src="${IMG('star3')}"><b>${fmt(m.xp)}</b><small>${tr('Досвіду')}</small></div></div></div>`; }).join('') +
      `<button class="btn ${my === 4 && C.members.length === 1 ? 'red' : 'gray'} wide" data-a="leave" style="margin-top:8px">${my === 4 ? (C.members.length === 1 ? tr('Розпустити корпорацію') : tr('Покинути (спершу передай посаду)')) : tr('Покинути корпорацію')}</button>`;
    // ---- споруди ----
    if (corpTab === 'bld') h += CORP_BLD.map(b => { const l = C.bld[b.id] || 0, max = l >= CORP_BMAX, cost = bldCost(l), cur = cost.bucks ? 'bucks' : 'coins', amt = cost.bucks || cost.coins, ok = (cur === 'bucks' ? C.bucks : C.coins) >= amt;
      const bt = C.boost && C.boost[b.id] > nowS ? C.boost[b.id] : 0, canBoost = BOOSTABLE.includes(b.id) && l >= 1, bu = C.build && C.build[b.id], rem = bu ? Math.max(0, bu[1] - nowS) : 0;
      const bar = bu ? `<div class="cb2-build"><div class="cb2-bt"><img src="${IMG('crane')}" alt="">${tr('Будується рівень')} ${bu[0]}<b data-end="${bu[1]}" data-reload="1">${fmtT(rem)}</b></div>
          <div class="cb-bar"><i style="width:${Math.min(100, (1 - rem / cbldTime(bu[0])) * 100)}%"></i></div></div>` : '';
      const upBtn = max ? '' : bu ? (my === 4 ? `<button class="btn green shine" data-a="speed" data-v="${b.id}">⚡ ${tr('Прискорити')}<img src="${IMG(BUCK)}" class="ib">${fmt(Math.ceil(rem / 300) * 15)}</button>` : '')
        : `<button class="btn ${cur === 'bucks' ? 'green' : 'gold'} ${ok && my === 4 ? 'shine' : 'poor'}" data-a="up" data-v="${b.id}" ${my === 4 ? '' : 'disabled'}><img src="${IMG(cur === 'bucks' ? BUCK : COIN)}" class="ib">${fmtN(amt)}</button>`;
      const bxBtn = canBoost ? `<button class="btn purple bx2 ${bt || my < 3 ? '' : 'shine'}" data-a="boost" data-v="${b.id}" ${bt || my < 3 ? 'disabled' : ''}><b class="x2b">${tr('Бонус Х2')}</b><img src="${IMG(BUCK)}" class="ib">1000</button>` : '';
      return `<div class="cbld2 ${l ? '' : 'zero'} ${bt ? 'boosted' : ''} ${bu ? 'building' : ''}"><div class="cb2-top"><div class="cb2-art"><i class="cb2-glow"></i><img src="${CSRC(b.img)}" alt=""><span class="cb2-lv">${l}</span></div>
        <div class="grow"><div class="cb2-name">${tr(b.name)}${bt ? `<em class="x2">×2 · <span data-end="${bt}">${fmtT(bt - nowS)}</span></em>` : ''}</div>
          <div class="cb2-bonus">${l ? bonusTxt(b, l * (bt ? 2 : 1)) : tr('Ще не збудовано')}</div>
          <div class="cb2-pips">${Array.from({ length: CORP_BMAX }, (_, i) => `<i class="${i < l ? 'on' : bu && i === l ? 'bld' : ''}"></i>`).join('')}</div>
          <div class="cb2-next">${max ? tr('Максимальний рівень') : tr('Далі') + ': ' + bonusTxt(b, l + 1)}</div></div></div>
        ${bar}${upBtn || bxBtn ? `<div class="cb2-btns">${upBtn}${bxBtn}</div>` : ''}</div>`; }).join('') +
      `<div class="note small">${tr('Будівництво триває певний час: 1-й рівень — 1 година, далі довше, 30-й — 21 день. Директор може прискорити з бюджету: 15 банкнот за кожні 5 хвилин. Бонус ×2 на 24 години (для збудованих споруд) запускає Зам. директора або Директор.')}</div>`;
    // ---- завдання (8 щодня, оновлення о 00:00; 48 год на виконання) ----
    if (corpTab === 'task') { const busy = C.tasks.find(t => !t.done && t.who.includes(me));
      const rank = t => t.done ? (t.taker === me && !t.claimed ? 0 : 2) : t.who.includes(me) ? 0 : 1, list = C.tasks.slice().sort((a, b) => rank(a) - rank(b));
      h += `<div class="ct3-head"><div class="ct3-ht"><img src="${CSRC('ic_7')}" alt=""><span>${tr('Нові завдання через')}<b data-end="${C.reset}">${fmtT(C.reset - nowS)}</b></span></div>
        <small>${tr('Одне завдання бере один гравець, інші можуть допомагати. Кожен може брати участь лише в одному завданні. На виконання — 48 годин.')}</small>
        <div class="ct3-rw3"><div><small>${tr('У бюджет')}</small><span><img src="${IMG(BUCK)}">25</span><span><img src="${IMG(COIN)}">50 000</span></div>
          <div><small>${tr('Учасникам')}</small><span><img src="${IMG(BUCK)}">15</span><span><img src="${IMG(COIN)}">30 000</span></div>
          <div><small>${tr('Колекції')}</small><span><img src="${CSRC('card_1')}">${tr('предмет')}</span></div></div></div>`;
      h += tourBlock('corp');
      h += list.map(t => { const [cat, ic] = CORP_TASKN[t.kind] || ['', 'clipboard'], inT = !t.done && t.who.includes(me), canCancel = !t.done && t.taker && (my === 4 || t.taker === me);
        const end = t.taker ? t.exp : C.reset, pct = Math.min(100, t.p / t.n * 100);
        const who = t.who.map(id => { const m = C.members.find(x => x.id === id); return m ? `<div class="ct3-p ${id === t.taker ? 'tk' : ''} ${id === me ? 'me' : ''}"><span class="fav pl-av">${avHTML(m.avatar)}</span><span>${nk(m.nick)}</span></div>` : ''; }).join('');
        const main = t.done ? (t.taker === me && !t.claimed ? `<button class="btn green shine ct3-go" data-a="tclaim" data-v="${t.id}">${tr('Забрати нагороду')}</button>` : `<span class="ct3-done">✓ ${tr('Виконано')}</span>`) : inT ? ''
          : busy ? `<button class="btn gray" disabled>${tr('Ти зайнятий іншим завданням')}</button>`
          : `<button class="btn ${t.taker ? 'blue' : 'green'} shine ct3-go" data-a="task" data-v="${t.id}">${t.taker ? tr('Допомогти') : tr('Взяти завдання')}</button>`;
        return `<div class="ctask3 ${inT ? 'in' : ''} ${t.taker ? 'taken' : ''} ${t.done ? (t.taker === me && !t.claimed ? 'claim' : 'done') : ''}">
          <div class="ct3-l"><img src="${IMG(ic)}" alt=""><small>${tr(cat)}</small></div>
          <div class="ct3-m"><b class="ct3-n">${tr(ctTitle(t.kind, t.n))}</b><div class="ct3-cups">${tourChip(t.done && t.cups ? t.cups : '2–5')}<small>${t.done && t.cups ? tr('кубків отримано') : tr('кубків у турнір корпорацій')}</small></div>
            <div class="cb-bar"><i style="width:${pct}%"></i><span>${fmtN(t.p)} / ${fmtN(t.n)} ${tr(ctUnit(t.kind, t.n))}</span></div>
            <div class="ct3-who">${who || `<div class="ct3-none">${tr('Ніхто ще не взяв')}</div>`}</div>
            ${main || canCancel ? `<div class="ct3-btns">${main}${canCancel ? `<button class="btn red" data-a="tcancel" data-v="${t.id}">✕ ${tr('Скасувати')}</button>` : ''}</div>` : ''}</div>
          <div class="ct3-r">${t.done ? `<img src="${IMG('check')}" alt=""><b>${tr('Готово')}</b>` : `<img src="${IMG('stopwatch')}" alt=""><b data-end="${end}">${fmtT(end - nowS)}</b>`}</div></div>`; }).join(''); }
    // ---- колекції (строго по черзі, оновлення раз на 3 дні) ----
    if (corpTab === 'coll') { const K = C.coll, pos = K.pos;
      h += `<div class="ccol-top"><span>${tr('Зібрано')}: <b>${pos}/${K.order.length}</b></span><span>⏳ ${tr('Оновлення через')} <b data-end="${K.ends}">${fmtT(K.ends - nowS)}</b></span></div>` + ctaskHTML(C, pos >= K.order.length);
      if (pos >= K.order.length) h += `<div class="soon"><img src="${CSRC('card_1')}" alt=""><b>${tr('Усі колекції циклу зібрано!')}</b><p>${tr('Нові з’являться після оновлення.')}</p></div>`;
      K.order.forEach((k, i) => { if (i < pos) return; const nm = (CORP_COLLS.find(c => c[0] === k) || [k, k])[1], act = i === pos, got = act ? K.items.filter(v => v > 0).length : 0;
        h += act ? `<div class="ccol-act"><div class="cca-h"><img src="${CCSRC(k, 'icon')}" alt=""><div class="grow"><b>${tr(nm)}</b><small>${tr('Зараз збираємо')} · ${got}/8</small></div></div>
            <div class="cca-g">${K.items.map((v, j) => `<div class="${v ? 'got' : ''}"><img src="${CCSRC(k, j + 1)}" alt="">${v ? '<i>✓</i>' : ''}</div>`).join('')}</div>
            <div class="cb-bar"><i style="width:${got / 8 * 100}%"></i></div>
            <div class="cca-rw">${tr('Нагорода в бюджет')}: <span><img src="${IMG(BUCK)}">${fmt(K.rb[i])}</span><span><img src="${IMG(COIN)}">${fmt(K.rc[i])}</span><small>${tr('кожному учаснику — 10%')}</small></div></div>`
          : `<div class="ccol-lock"><img src="${CCSRC(k, 'icon')}" alt=""><div class="grow"><b>${tr(nm)}</b><small>🔒 ${tr('після попередньої')}</small></div><span class="ccl-rw"><img src="${IMG(BUCK)}">${fmt(K.rb[i])} · <img src="${IMG(COIN)}">${fmt(K.rc[i])}</span></div>`; }); }
    // ---- бюджет ----
    if (corpTab === 'bud') { const L = CORP.limit, early = my < 3 && nowS - C.joined < 3 * 86400;
      h += `<div class="cbud2"><div class="cbx b"><img src="${IMG(BUCK)}"><div><b>${fmt(C.bucks)}</b><small>${tr('банкнот у бюджеті')}</small></div></div>
          <div class="cbx c"><img src="${IMG(COIN)}"><div><b>${fmt(C.coins)}</b><small>${tr('монет у бюджеті')}</small></div></div>
</div>
        <div class="note small">${tr('20% досвіду, який отримує кожен учасник, іде в досвід корпорації. Після нового рівня досвід починається з нуля, а ліміт учасників зростає на +2.')}</div>
        <div class="cdon2"><div class="pst">${tr('Поповнити бюджет')}</div>
        ${early ? `<div class="note small">${tr('Поповнювати бюджет можна через 3 дні після вступу')} (${fmtT(C.joined + 3 * 86400 - nowS)}).</div>` : `
          <label class="cd2"><img src="${IMG(BUCK)}"><input id="cd-b" type="number" min="0" inputmode="numeric" placeholder="0"><span>${fmt(L.usedB)} / ${fmt(L.bucks)}<small>${tr('сьогодні')}</small></span></label>
          <label class="cd2"><img src="${IMG(COIN)}"><input id="cd-c" type="number" min="0" inputmode="numeric" placeholder="0"><span>${fmt(L.usedC)} / ${fmt(L.coins)}<small>${tr('сьогодні')}</small></span></label>
          <button class="btn green shine wide" data-a="don">${tr('Внести в бюджет')}</button>
          <div class="note small">${tr('Ліміт банкнот на день = 100 + усі банкноти, які ти купив у грі')} (${fmt(L.donated)}).</div>`}</div>`; }
    // ---- чат корпорації ----
    if (corpTab === 'chat') h += `<div class="fchat" id="cc-list">${corpChatHTML()}</div><div class="fsend">${emoBtn('cc-in')}${ceIn('cc-in', 500, tr('Повідомлення корпорації…'))}<button class="send-b" data-a="csend" aria-label="${tr('Надіслати')}"><i></i></button></div>`;
    // ---- налаштування ----
    if (corpTab === 'set') h += my === 4 ? `<div class="cset"><div class="pst">${tr('Назва корпорації')} · <img src="${IMG(BUCK)}" class="ib">5 000 ${tr('з бюджету')}</div>
        <div class="cset-row"><input id="cs-name" maxlength="24" value="${esc(C.name)}"><button class="btn gold shine" data-a="rename">${tr('Змінити')}</button></div></div>
        <div class="cset"><div class="pst">${tr('Герб корпорації')} · <img src="${IMG(BUCK)}" class="ib">${fmt(CORP_EMBLEM_PRICE)} ${tr('з бюджету')}</div><div class="cemb">${SHIELDS.map(s => `<button class="${s === C.emblem ? 'on' : ''}" data-a="emb" data-v="${s}"><img src="${CSRC(s)}" alt=""></button>`).join('')}</div></div>`
      : `<div class="soon"><img src="${CSRC('ic_10')}" alt=""><b>${tr('Налаштування')}</b><p>${tr('Змінювати назву та герб корпорації може лише Директор.')}</p></div>`;
    return h;
  }, {
    tab: v => { corpTab = v; $('#m-body')._h = null; modalRefresh(); scrollTopHard($('#m-body')); if (v === 'chat') corpChatLoad(true); },
    pl: v => openPlayer(+v, () => openCorp()),
    up: v => { const b = CORP_BLD.find(x => x.id === v), l = C.bld[v] || 0, cost = bldCost(l);
      confirmBox({ icon: 'bz_office', title: `${tr(b.name)} → ${l + 1}`, text: `${bonusTxt(b, l + 1)}<br>${tr('Вартість з бюджету')}: <b>${fmt(cost.bucks || cost.coins)}</b> ${cost.bucks ? tr('банкнот') : tr('монет')}`, yes: tr('Покращити'), cls: 'green', back: () => openCorp() },
        async () => { const r = await api('corp_upgrade', { b: v }); if (!r.ok) return toast(cErr(r.error), 'bz_office', true); sfx('build'); toast(`${tr(b.name)}: ${tr('будівництво рівня')} ${r.to} ${tr('почалося')} · ⏱ ${fmtT(r.until - Date.now() / 1000)}`, 'bz_office', true); openCorp(); }); },
    speed: v => { const b = CORP_BLD.find(x => x.id === v), bu = C.build[v]; if (!bu) return; const cost = Math.ceil(Math.max(0, bu[1] - Date.now() / 1000) / 300) * 15;
      confirmBox({ icon: 'bz_office', title: `${tr(b.name)}: ${tr('прискорити')}`, text: `${tr('Завершити будівництво рівня')} ${bu[0]} ${tr('зараз')}.<br>${tr('Вартість з бюджету')}: <b>${fmt(cost)}</b> ${tr('банкнот')}`, yes: tr('Прискорити'), cls: 'green', back: () => openCorp() },
        async () => { const r = await api('corp_speed', { b: v }); if (!r.ok) return toast(cErr(r.error), 'bz_office', true); sfx('level'); confetti(30); toast(`${tr(b.name)}: ${tr('рівень')} ${bu[0]}!`, 'bz_office', true); await netBeat(); openCorp(); }); },
    tourtop: () => openTour('corp', () => openCorp('task')),
    tclaim: async v => { const r = await api('corp_task_claim', { id: v }); if (!r.ok) return toast(cErr(r.error), 'bz_office', true);
      applyReward(r.reward); save(); render(); sfx('level'); confetti(30);
      showReward({ title: tr('Завдання корпорації виконано!'), img: 'gift_red', name: tr('Нагорода за виконане завдання'), items: r.reward.map(rewardView).map(x => ({ img: x.img, text: '+' + x.text })) });
      openCorp('task'); },
    tcancel: v => confirmBox({ icon: 'bz_office', title: tr('Скасувати завдання?'), text: tr('Прогрес завдання обнулиться, а всі учасники звільняться.'), yes: tr('Скасувати'), back: () => openCorp() },
      async () => { const r = await api('corp_task_cancel', { id: v }); if (!r.ok) return toast(cErr(r.error), 'bz_office', true); openCorp(); }),
    ctake: async () => { const base = {}; Object.keys(CTASK_K).forEach(k => base[k] = S.stats[k] || 0);
      const r = await api('corp_ctask', { op: 'take', base }); if (!r.ok) return toast(cErr(r.error), 'bz_office', true); sfx('ding'); openCorp(); },
    ccancel: () => confirmBox({ icon: 'bz_office', title: tr('Скасувати завдання?'), text: tr('Наступне скасування буде доступне через 3 години.'), yes: tr('Скасувати'), back: () => openCorp() },
      async () => { const r = await api('corp_ctask', { op: 'cancel' }); if (!r.ok) return toast(cErr(r.error), 'bz_office', true); openCorp(); }),
    cdone: async () => { const P = C.ctask; if (!P) return; const r = await api('corp_ctask', { op: 'done', cur: S.stats[P.kind] || 0 }); if (!r.ok) return toast(cErr(r.error), 'bz_office', true);
      applyReward(r.reward); S.corpCt = null; corpBadge(); save(); render(); sfx('level'); confetti(40);
      const v = r.reward.map(rewardView), K = C.coll, cat = K.order[K.pos], nm = (CORP_COLLS.find(c => c[0] === cat) || [cat, cat])[1];
      showReward({ title: tr('Завдання виконано!'), img: 'gift_red', name: `${tr('Колекція')} «${tr(nm)}»: ${tr('новий предмет')}`, items: v.map(x => ({ img: x.img, text: '+' + x.text })) });
      if (r.coll) toast(tr('Колекцію корпорації зібрано!'), 'bz_office', true);
      openCorp('coll'); },
    cdel: v => confirmBox({ icon: 'chat', title: tr('Видалити повідомлення?'), yes: tr('Видалити'), back: () => openCorp('chat') },
      async () => { const r = await api('corp_chat_del', { id: +v }); if (!r.ok) return toast(cErr(r.error), 'bz_office', true); corpChat = []; openCorp('chat'); }),
    boost: v => { const b = CORP_BLD.find(x => x.id === v);
      confirmBox({ icon: 'bz_office', title: `${tr(b.name)}: ${tr('бонус')} ×2`, text: `${tr('На 24 години бонус споруди подвоюється для всіх учасників.')}<br>${tr('Вартість з бюджету')}: <b>1000</b> ${tr('банкнот')}`, yes: tr('Запустити'), cls: 'green', back: () => openCorp() },
        async () => { const r = await api('corp_boost', { b: v }); if (!r.ok) return toast(cErr(r.error), 'bz_office', true); sfx('level'); confetti(30); await netBeat(); openCorp(); }); },
    task: async v => { await corpFlush(); const r = await api('corp_task', { id: v }); if (!r.ok) return toast(cErr(r.error), 'bz_office', true); sfx('ding'); openCorp(); },
    role: v => corpRolePick(+v),
    kick: v => { const m = C.members.find(x => x.id === +v); confirmBox({ icon: 'bz_office', title: tr('Вигнати з корпорації?'), text: esc(m.nick), yes: tr('Вигнати'), back: () => openCorp() }, async () => { const r = await api('corp_kick', { id: +v }); if (!r.ok) return toast(cErr(r.error), 'bz_office', true); openCorp(); }); },
    leave: () => confirmBox({ icon: 'bz_office', title: my === 4 && C.members.length === 1 ? tr('Розпустити корпорацію?') : tr('Покинути корпорацію?'), text: tr('Бонуси споруд корпорації перестануть діяти.'), yes: tr('Так'), back: () => openCorp() },
      async () => { const r = await api('corp_leave'); if (!r.ok) return toast(cErr(r.error), 'bz_office', true); NET.corp = null; S.corpRep = null; S.corpCt = null; S.corpPlus = 0; corpBadge(); save(); render(); toast(r.disbanded ? tr('Корпорацію розпущено') : tr('Ти покинув корпорацію'), 'bz_office', true); corpTab = 'mem'; openCorp(); }),
    don: async () => {
      const b = Math.max(0, Math.floor(+$('#cd-b').value || 0)), c = Math.max(0, Math.floor(+$('#cd-c').value || 0)); if (!b && !c) return;
      if (b > S.bucks) return noBucks(); if (c > S.coins) return noCoins();
      const r = await api('corp_donate', { bucks: b, coins: c }); if (!r.ok) return toast(cErr(r.error), 'bz_office', true);
      S.bucks -= b; S.coins -= c; save(); render(); sfx('coin'); toast(tr('Дякуємо за внесок у корпорацію!'), 'bz_office', true); openCorp('bud');
    },
    rename: () => { const name = $('#cs-name').value.trim(); if (name === C.name) return; if (name.length < 3) return toast(cErr('corp_name_len'), 'bz_office', true);
      confirmBox({ icon: 'bz_office', title: tr('Змінити назву?'), text: `«${esc(name)}»<br>5 000 ${tr('банкнот з бюджету')}`, yes: tr('Змінити'), cls: 'green', back: () => openCorp('set') },
        async () => { const r = await api('corp_rename', { name }); if (!r.ok) return toast(cErr(r.error), 'bz_office', true); await netBeat(); openCorp('set'); }); },
    emb: v => { if (v === C.emblem) return; confirmBox({ icon: 'bz_office', title: tr('Змінити герб?'), text: `<img src="${CSRC(v)}" style="width:80px;height:80px"><br>${fmt(CORP_EMBLEM_PRICE)} ${tr('банкнот з бюджету')}`, yes: tr('Змінити'), cls: 'green', back: () => openCorp('set') },
      async () => { const r = await api('corp_emblem', { emblem: v }); if (!r.ok) return toast(cErr(r.error), 'bz_office', true); await netBeat(); openCorp('set'); }); },
    csend: async () => { const i = $('#cc-in'); if (!i || !i.value.trim()) return; const text = i.value; i.value = ''; const r = await api('corp_chat_send', { text, reply: replyFor('corp') }); if (!r.ok) { i.value = text; return toast(netErr(r.error), 'chat', true); } replyClear(); corpChatLoad(); },
  });
  $('#modal').classList.add('tall'); corpRef = modalRefresh;
  $('#m-body').onkeydown = e => { if (e.key === 'Enter' && e.target.id === 'cc-in') { e.preventDefault(); const b = $('[data-a="csend"]'); if (b) b.click(); } };
  if (corpTab === 'chat') corpChatLoad(true);
  clearInterval(corpChatT); corpChatT = setInterval(() => { if (!$('#cc-list') || !$('#modal-bg').classList.contains('show')) return; if (!document.hidden) corpChatLoad(); }, 5000);
}
// особисте завдання колекції (як в особистих колекціях): 12 год на виконання, скасування раз на 3 год
const CTASK_K = { rides: 1, stocked: 1, unloaded: 1, cashed: 1, vips: 1, evicted: 1 };
function ctaskHTML(C, cycleDone) {
  const P = C.ctask, nowS = Date.now() / 1000, lv = S.level || 1;
  const rw = `<div class="ct3-rw4"><div><img src="${CSRC('card_1')}"><b>×1</b></div><div><img src="${IMG(BUCK)}"><b>5</b></div><div><img src="${IMG(COIN)}"><b>${fmt(5000 * lv)}</b></div><div><img src="${IMG('star3')}"><b>${fmt(150 * lv)}</b></div></div>`;
  if (!P) return `<div class="cpt cpt-empty"><div class="cpt-h"><img src="${CSRC('ic_7')}" alt=""><div class="grow"><b>${tr('Особисте завдання')}</b><small>${tr('Виконай випадкове завдання за 12 годин — і отримай предмет колекції корпорації та особисту нагороду.')}</small></div></div>${rw}
    <button class="btn gold shine ct3-go cpt-take" data-a="ctake" ${cycleDone ? 'disabled' : ''}>${tr('Взяти завдання')}</button></div>`;
  const [cat, ic] = CORP_TASKN[P.kind] || ['', 'clipboard'], cur = Math.max(0, (S.stats[P.kind] || 0) - P.base), done = cur >= P.n, cw = (C.ctaskCancel || 0) + 3 * 3600 - nowS;
  return `<div class="ctask3 cpt ${done ? 'in' : ''}"><div class="ct3-l"><img src="${IMG(ic)}" alt=""><small>${tr(cat)}</small></div>
    <div class="ct3-m"><span class="cpt-k">${tr('Особисте завдання')}</span><b class="ct3-n">${tr(ctTitle(P.kind, P.n))}</b>
      <div class="cb-bar"><i style="width:${Math.min(100, cur / P.n * 100)}%"></i><span>${fmtN(Math.min(cur, P.n))} / ${fmtN(P.n)} ${tr(ctUnit(P.kind, P.n))}</span></div>${rw}
      <div class="ct3-btns">${done ? `<button class="btn green shine ct3-go" data-a="cdone">${tr('Забрати нагороду')}</button>` : ''}
        ${done ? '' : `<button class="btn red" data-a="ccancel" ${cw > 0 ? 'disabled' : ''}>✕ ${cw > 0 ? `${tr('Скасувати через')} <span data-end="${C.ctaskCancel + 3 * 3600}">${fmtT(cw)}</span>` : tr('Скасувати')}</button>`}</div></div>
    <div class="ct3-r"><img src="${IMG('stopwatch')}" alt=""><b data-end="${P.exp}" data-reload="1">${fmtT(P.exp - nowS)}</b></div></div>`;
}
// живі таймери в модалці корпорації; коли щось завершилось — оновлюємо сторінку
let corpReloading = false; const corpDoneEnds = new Set();
setInterval(() => {
  if (!$('#modal-bg').classList.contains('show')) return; const nowS = Date.now() / 1000; let reload = false;
  document.querySelectorAll('#m-body [data-end]').forEach(e => { const left = +e.dataset.end - nowS; e.textContent = fmtT(left); if (left <= 0 && left > -30 && e.dataset.reload && !corpDoneEnds.has(e.dataset.end)) { corpDoneEnds.add(e.dataset.end); reload = true; } });
  if (reload && !corpReloading && CORP && CORP.corp && document.querySelector('#m-body .ctabs')) { corpReloading = true; setTimeout(async () => { await netBeat(); await openCorp(); corpReloading = false; }, 1200); }
}, 1000);
// плюсик над кнопкою «Корпорація»: виконано завдання корпорації або особисте завдання колекції готове
function corpBadge() {
  const b = $('#nav-corp'); if (!b) return; let i = b.querySelector('.nplus');
  const ct = S.corpCt, on = !!(NET.corp && (S.corpPlus || (ct && (S.stats[ct.kind] || 0) - ct.base >= ct.n && ct.exp > Date.now() / 1000)));
  if (on && !i) { i = document.createElement('img'); i.className = 'nplus'; i.src = IMG('plus_green'); i.alt = ''; b.appendChild(i); }
  if (!on && i) i.remove();
}
setInterval(corpBadge, 2000);
const corpSeen = new Set();
function corpChatHTML() {
  const me = NET.auth.player.id, ready = corpSeen.has('ready'), canDel = !!(CORP && CORP.corp && CORP.corp.role >= 2);
  return corpChat.length ? corpChat.map(m => { const mine = +m.pid === me, fresh = ready && !corpSeen.has(m.id); corpSeen.add(m.id);
    if (!m.pid) return `<div class="cm-sys ${fresh ? 'cm-new' : ''}" ${rAttr('corp', m.id, '', m.body)}><img src="${IMG('ach_cup')}" alt=""><div><small>${tr('Система')} · ${clockT(m.t)}</small><span>${mtHTML(m.body)}</span></div>${canDel ? `<button class="cm-del" data-a="cdel" data-v="${m.id}">✕</button>` : ''}</div>`;
    return `<div class="cm ${mine ? 'mine' : ''} ${fresh ? 'cm-new' : ''}" ${rAttr('corp', m.id, m.nick, m.body)}><div class="cm-side"><span class="fav pl-av" data-a="pl" data-v="${m.pid}">${avHTML(m.avatar)}</span><time>${clockT(m.t)}</time></div>
      <div class="cm-bub">${canDel ? `<button class="cm-del" data-a="cdel" data-v="${m.id}" aria-label="${tr('Видалити')}">✕</button>` : ''}<div class="cm-nick"><span class="pl-n" data-a="pl" data-v="${m.pid}">${nk(m.nick)}</span> ${m.role != null ? roleChip(+m.role) : ''}</div>${rQuote('corp', m.rid, m.rnick, m.rbody)}<div class="cm-text ${String(m.body || '').replace(/:e\d{1,2}:/g, '').trim() ? '' : 'jumbo'}">${mtHTML(m.body, { mine })}</div></div></div>`; }).join('')
    : `<div class="note small">${tr('Тут поки тихо — привітай свою корпорацію!')}</div>`;
}
async function corpChatLoad(first) {
  const r = await api('corp_chat'); if (!r.ok) return;
  const changed = JSON.stringify(r.items) !== JSON.stringify(corpChat); corpChat = r.items;
  const L = $('#cc-list'); if (!L) return;
  if (changed || first) { const b = $('#m-body'), near = first || b.scrollHeight - b.scrollTop - b.clientHeight < 90; L.innerHTML = corpChatHTML(); replyBar(); if (near) b.scrollTop = b.scrollHeight; }
  corpSeen.add('ready');
}
const corpLogInfo = l => { if (l.kind === 'upgrade') { const [k, lv] = String(l.info).split(':'); const b = CORP_BLD.find(x => x.id === k); return b ? `${tr(b.name)} → ${lv}` : l.info; }
  if (l.kind === 'coll') { const [k, rest] = String(l.info).split(' · '); const c = CORP_COLLS.find(x => x[0] === k); return (c ? tr(c[1]) : k) + (rest ? ' · ' + rest : ''); } return l.info || ''; };
function corpRolePick(id) {
  const C = CORP.corp, m = C.members.find(x => x.id === id), my = C.role;
  const opts = CORP_ROLES.map((r, i) => i).filter(i => i < my || (my === 4 && i === 4));
  openModal({ icon: 'bz_office', title: tr('Звання'), sub: esc(m.nick), color: '#1f4fb8' }, () => opts.map(i => `<button class="crp ${m.role === i ? 'on' : ''}" data-a="set" data-v="${i}">${roleChip(i)}<small>${tr(CORP_ROLES[i][2])}</small>${i === 4 ? `<em>${tr('Передати посаду Директора')}</em>` : ''}</button>`).join(''),
    { set: v => { const go = async () => { const r = await api('corp_role', { id, role: +v }); if (!r.ok) return toast(cErr(r.error), 'bz_office', true); toast(tr('Звання змінено'), 'bz_office', true); await netBeat(); openCorp('mem'); };
      if (+v === 4) confirmBox({ icon: 'bz_office', title: tr('Передати посаду Директора?'), text: `${esc(m.nick)} ${tr('стане Директором, а ти — Зам. директора.')}`, yes: tr('Передати'), back: () => corpRolePick(id) }, go); else go(); } });
  setTimeout(() => { modalBack = () => openCorp('mem'); });
}
// сторінка чужої корпорації (з рейтингу чи профілю)
async function openCorpView(id, back) {
  if (NET.corp && +NET.corp.id === +id) { corpTab = 'mem'; return openCorp('mem'); }
  const r = await api('corp_info', { id }); if (!r.ok || !r.corp) return toast(cErr(r.error || 'not_found'), 'bz_office', true);
  const C = r.corp; setTimeout(() => { modalBack = back || null; });
  openModal({ icon: 'bz_office', title: C.name, sub: `${tr('Корпорація')} · ${tr('рівень')} ${C.lvl}`, color: '#1f4fb8' }, () =>
    `<div class="cp-head"><img class="cp-em" src="${CSRC(C.emblem)}" alt=""><div class="grow"><b>${nk(C.name)}</b><div class="cp-row"><img src="${CSRC('ic_13')}" alt="">${tr('Рівень')} <b>${C.lvl}</b></div><div class="cp-row"><img src="${CSRC('ic_8')}" alt="">${tr('Учасники')} <b>${C.members.length}/${C.cap}</b></div></div></div>
     <div class="cl-bonus small">${CORP_BLD.map(b => `<div><img src="${CSRC(b.img)}" alt=""><b>${tr(b.name)} · ${C.bld[b.id] || 0}</b><span>${C.bld[b.id] ? bonusTxt(b, C.bld[b.id]) : '—'}</span></div>`).join('')}</div>
     <div class="pst" style="margin:10px 0 6px">${tr('Учасники')}</div>${C.members.map(m => `<div class="cmem" data-a="pl" data-v="${m.id}"><span class="fav pl-av">${avHTML(m.avatar)}${m.seen > Date.now() / 1000 - 600 ? '<i class="ondot"></i>' : ''}</span><div class="grow"><b>${nk(m.nick)}</b>${roleChip(m.role)}<small>★ ${m.level}</small></div></div>`).join('')}`,
  { pl: v => openPlayer(+v, () => openCorpView(id, back)) });
}

// ---------- прогрес спільних завдань: раз на 30 с надсилаємо прирости статистики ----------
const CORP_STATS = ['rides', 'stocked', 'unloaded', 'cashed', 'vips', 'tips', 'earned', 'built', 'evicted', 'xpTotal'];
const CORP_KEY = { xpTotal: 'xp', evicted: 'evict' };
function corpProgInit() { S.corpRep = {}; CORP_STATS.forEach(k => S.corpRep[k] = S.stats[k] || 0); save(); }
// прогрес завдань і досвід — майже одразу: через ~1 с після дії (а не раз на 15 с), без дублювань і без втрат
let corpRepBusy = false, corpRepLast = 0;
async function corpFlush() { if (!S.corpRep) return corpProgInit(); corpRepLast = 0; await corpReport(true); }
setInterval(() => corpReport(), 500);
async function corpReport(now) {
  if (!NET.corp || !corpOn() || NET.locked || corpRepBusy) return;
  if (!S.corpRep) return corpProgInit();
  if (!now && Date.now() - corpRepLast < 1200) return;
  const d = {}, snap = {}; let any = false;
  CORP_STATS.forEach(k => { if (S.corpRep[k] == null) S.corpRep[k] = S.stats[k] || 0; snap[k] = S.stats[k] || 0; const v = Math.max(0, snap[k] - S.corpRep[k]); if (v > 0) { d[CORP_KEY[k] || k] = v; any = true; } });
  if (!any) return;
  corpRepBusy = true; corpRepLast = Date.now();
  let r; try { r = await api('corp_prog', { d }); } finally { corpRepBusy = false; }
  if (!r || !r.ok) return;
  CORP_STATS.forEach(k => S.corpRep[k] = snap[k]); save(); // те, що набралось під час запиту, піде наступного разу
  if (r.tasks && CORP && CORP.corp) { CORP.corp.tasks = r.tasks; CORP.corp.xp = r.xp; CORP.corp.need = r.need; CORP.corp.lvl = r.lvl; corpSoftRefresh(); }
  if (r.cups) { toast(`+${r.cups} ${tr('кубків у турнір корпорацій')} 🏆`, 'ach_cup', true); if (TOUR.info && TOUR.info.corp) TOUR.info.corp.cups += r.cups; }
  if (r.claim != null) { S.corpPlus = r.claim ? 1 : 0; save(); corpBadge(); }
  if (r.done) { toast(r.claim ? tr('Завдання корпорації виконано! Забери нагороду в завданнях') : tr('Завдання корпорації виконано!'), 'bz_office', true); sfx('level'); netPullMail(); }
  if (r.coll) { toast(tr('Колекцію корпорації зібрано!'), 'bz_office', true); confetti(30); }
  if (r.up) toast(`${tr('Корпорація досягла рівня')} ${r.lvl}!`, 'bz_office', true);
}
