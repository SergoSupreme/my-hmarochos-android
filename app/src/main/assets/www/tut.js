// ===================================================================
//  Навчання для нових гравців: дівчата-провідниці, підсвічування, дії
// ===================================================================
const TUT_GIRLS = [
  null,
  { name: 'Аліна', role: 'Керуюча вежею', c: '#e8423a' },
  { name: 'Софія', role: 'Адміністраторка', c: '#3aa0ff' },
  { name: 'Дарина', role: 'Прораб', c: '#d6303d' },
  { name: 'Марта', role: 'Власниця кав’ярні', c: '#ff7a3d' },
  null,
  { name: 'Ліза', role: 'Розваги та турніри', c: '#b45cff' },
  { name: 'Ірина', role: 'Відділ кадрів', c: '#6f8cff' },
  { name: 'Катерина', role: 'Бізнес-аналітикиня', c: '#4fb3ff' },
  { name: 'Яна', role: 'Спільнота й чат', c: '#2ec4a6' },
  { name: 'Остап', role: 'Охорона вежі', c: '#5b86e5' },
  { name: 'Мирослава', role: 'Маркетологиня', c: '#ff4d6d' },
];
const TUT_REWARD = 1000;
const tutCafe = () => bizFloors()[0];
const tutFloorBtn = f => { const el = f && floorEl(f); return el && (el.querySelector('[data-act="main"]') || el); };
const tutSlots = st => { const f = tutCafe(); return !!f && f.slots.some(s => st.includes(s.st)); };
const tutReady = () => S.floors.find(f => f.type === 'ready');

const TUT_STEPS = [
  { g: 1, t: 'Привіт! Я Аліна — керуюча твоїм хмарочосом. Разом із дівчатами покажу, як тут усе влаштовано. Пройди навчання до кінця — і отримаєш 1000 банкнот!', btn: 'Поїхали!' },
  { g: 2, t: 'Я Софія, адміністраторка. Це вестибюль — сюди приходять гості. А ось і перші відвідувачі!', target: () => floorEl(S.floors[0]),
    enter: () => { S.tut.hold = 1; if (!S.queue.some(v => v.tut) && S.residents.length < 3) { const h = hotel().id; S.queue = [
      { dest: h, kind: 'guest', ch: 'ch_3', tut: 1, dream: 'fun_0' }, { dest: h, kind: 'guest', ch: 'ch_4', tut: 1 }, { dest: h, kind: 'guest', ch: 'ch_13', tut: 1 }]; render(); } } },
  { g: 2, t: 'Натисни на кабіну ліфта — вона відвезе гостя на його поверх.', target: () => $('#car'), done: () => S.residents.length >= 1 && !riding },
  { g: 2, t: 'Чудово! Гість вирішив оселитися у вежі. Відвези ще двох — нам потрібні працівники.', target: () => $('#car'), done: () => S.residents.length >= 3 && !riding },
  { g: 10, t: 'Я Остап, охорона вежі. Нові жителі живуть у готелі, поки не знайдуть роботу. Розширюй готель, щоб у вежі жило більше людей.', target: () => floorEl(hotel()), enter: () => { S.tut.hold = 0; } },
  { g: 7, t: 'Я Ірина з відділу кадрів. У кав’ярні ще немає працівників — натисни на кнопку поверху й найми всіх трьох жителів.', target: () => tutFloorBtn(tutCafe()),
    modal: ['[data-a="hire"]', '[data-a="hirelist"]'], done: () => workersOf(tutCafe()).length >= 3 },
  { g: 7, t: () => { const r = S.residents.find(x => x.dream === 'fun_0' && x.job); return (r ? r.name + ' ' : '') + 'мріє працювати саме тут — тепер це щаслива працівниця ⭐ Щасливі приносять більше, їх можна навчати, а товар для них дешевший.'; }, enter: () => closeModal() },
  { g: 4, t: 'Я Марта, власниця кав’ярні. Натисни кнопку поверху, щоб закупити товар.', target: () => tutFloorBtn(tutCafe()), modal: ['[data-a="stock"]'], done: () => tutSlots(['deliver', 'unload', 'sell', 'cash']), enter: () => closeModal() },
  { g: 4, t: 'Товар уже в дорозі! Зазвичай доставка триває довше, але зараз я трохи прискорила 😉', target: () => tutFloorBtn(tutCafe()), wait: 1, done: () => tutSlots(['unload']) },
  { g: 4, t: 'Товар доставили! Натисни, щоб викласти його на вітрину.', target: () => tutFloorBtn(tutCafe()), modal: ['[data-a="unload"]'], done: () => !tutSlots(['unload']) && tutSlots(['sell', 'cash']) },
  { g: 4, t: 'Покупці вже розбирають товар… Ще мить!', target: () => tutFloorBtn(tutCafe()), wait: 1, done: () => tutSlots(['cash']) },
  { g: 4, t: 'Усе продано! Збери виручку — натисни на монети.', target: () => tutFloorBtn(tutCafe()), modal: ['[data-a="cash"]'], done: () => !tutSlots(['cash']) },
  { g: 4, t: 'Порада: центральна кнопка внизу робить закупку, викладку чи збір виручки одразу на всіх поверхах.', target: () => $('#nav-ops'), enter: () => closeModal() },
  { g: 3, t: 'Я Дарина, прораб. Час рости вгору! Натисни «Будувати» на даху й обери тип бізнесу.', target: () => $('#build-btn'), modal: ['.catcard [data-a="build"]'],
    done: () => S.floors.some(f => f.type === 'building' || f.type === 'ready') || bizFloors().length >= 2 },
  { g: 3, t: 'Будівельники вже працюють. Під час навчання — у прискореному режимі!', target: () => { const f = S.floors.find(x => x.type === 'building' || x.type === 'ready'); return f && floorEl(f); }, wait: 1, done: () => !!tutReady() || bizFloors().length >= 2 },
  { g: 3, t: 'Поверх готовий! Перережи стрічку, щоб відкрити новий бізнес.', target: () => tutFloorBtn(tutReady()), done: () => !tutReady() && bizFloors().length >= 2 },
  { g: 11, t: 'Я Мирослава, маркетологиня. У магазині — покращення ліфта, вестибюля й готелю, піар, маркетинг, менеджер і техніка, що пришвидшує доставку та продаж.', target: () => $('#nav-shop'), enter: () => closeModal() },
  { g: 6, t: 'Я Ліза! Тут щоденні завдання: виконуй їх і отримуй банкноти, ключі та кубки турніру.', target: () => $('#nav-quest') },
  { g: 6, t: 'Кубки й досягнення. А з понеділка по суботу триває тижневий турнір — збирай кубки й вигравай до 1000 банкнот!', target: () => $('#rn-cups') },
  { g: 8, t: 'Я Катерина, бізнес-аналітикиня. Бізнес: кожен рівень назавжди збільшує виручку й досвід свого типу поверхів.', target: () => $('#rn-up') },
  { g: 6, t: 'Лабіринт: відчиняй двері ключами й шукай скарби — монети, банкноти та бонуси.', target: () => $('#rn-maze') },
  { g: 6, t: 'Колекції: збирай предмети з завдань і обмінюй повні колекції на нагороди.', target: () => $('#rn-coll') },
  { g: 6, t: 'Лотерея та сезонний пропуск — ще більше призів щодня.', target: () => $('#rn-lotto') },
  { g: 9, t: 'Я Яна, відповідаю за спільноту. Корпорація: об’єднуйся з друзями, будуйте спільні споруди й змагайтеся в турнірі корпорацій.', target: () => $('#nav-corp') },
  { g: 9, t: 'А тут — чат з усіма гравцями та особисті повідомлення.', target: () => $('#nav-forum') },
  { g: 1, final: 1, t: 'Ти справжній власник хмарочоса! Навчання завершено — тримай заслужену нагороду.' },
];

let tutEl = null, tutRaf = 0, tutShown = -1, tutTypeT = 0, tutScrolled = -1, tutMode = '';
const tutOn = () => !!(S && S.tut && !S.tut.done);
function tutStart() {
  if (!tutOn() || tutEl) return;
  TUT_GIRLS.forEach((g, i) => { if (g) { const im = new Image(); im.src = `images/tut/g${i}.webp`; } });
  tutEl = document.createElement('div'); tutEl.id = 'tut'; tutEl.className = 'notr';
  tutEl.innerHTML = `<div class="tt-catch"></div><div class="tt-dim t"></div><div class="tt-dim l"></div><div class="tt-dim r"></div><div class="tt-dim b"></div>
    <div class="tt-hole"></div><div class="tt-hand"><i>👆</i></div>
    <div class="tt-card"><img class="tt-girl" alt=""><div class="tt-bub"><div class="tt-name"><b></b><span></span></div><div class="tt-txt"></div><div class="tt-row"><button class="tt-next btn green shine"></button></div></div></div>
    <div class="tt-final"><div class="rays"></div><img class="tt-fgirl" src="images/tut/g1.webp" alt=""><div class="tt-fbox"><div class="ribbon"></div><div class="tt-ftxt"></div><div class="tt-fprize"><img src="${IMG(BUCK)}" alt=""><b>+${fmt(TUT_REWARD)}</b></div><button class="btn gold shine tt-get"></button></div></div>
`;
  ($('#app') || document.body).appendChild(tutEl);
  tutEl.querySelector('.tt-next').onclick = e => { e.stopPropagation(); tutNext(); };
  tutEl.querySelector('.tt-txt').onclick = () => tutFinishType();
  tutEl.querySelector('.tt-catch').onclick = () => { const st = TUT_STEPS[S.tut.s]; if (!tutFinishType() && st && !st.done && !st.final) tutNext(); };
  tutEl.querySelector('.tt-get').onclick = tutClaim;
  tutEl.querySelector('.tt-get').innerHTML = `${tr('Отримати')} ${fmt(TUT_REWARD)} <img src="${IMG(BUCK)}" alt="">`;
  tutEl.querySelector('.tt-final .ribbon').textContent = tr('Навчання завершено!');
  tutShown = -1; tutRaf = requestAnimationFrame(tutLoop);
}
function tutToast() { // сповіщення гри показуємо під вікном навчання, щоб не закривали текст
  const t = $('#toast'), c = tutEl && tutEl.querySelector('.tt-card'); if (!t || !c) return;
  const r = c.getBoundingClientRect(), top = r.top < innerHeight * 0.4 ? Math.round(r.bottom + 8) + 'px' : '';
  if (t.style.top !== top) t.style.top = top;
}
function tutEnd() {
  const t = $('#toast'); if (t) t.style.top = ''; cancelAnimationFrame(tutRaf); clearInterval(tutTypeT); if (tutEl) { tutEl.classList.add('bye'); const e = tutEl; setTimeout(() => e.remove(), 400); } tutEl = null; document.querySelectorAll('.tut-glow').forEach(x => x.classList.remove('tut-glow')); render(); }
function tutNext() {
  const st = TUT_STEPS[S.tut.s]; if (st && st.leave) st.leave();
  S.tut.s++; save();
  if (S.tut.s >= TUT_STEPS.length) { S.tut.s = TUT_STEPS.length - 1; }
}
function tutClaim() {
  if (!tutOn()) return;
  const b = tutEl.querySelector('.tt-get');
  addBucks(TUT_REWARD, b); confetti(60); vibrate(40);
  S.tut = { done: 1, paid: 1 }; S.stats.tutDone = 1; save(); if (typeof netPush === 'function') netPush(true);
  toast(`+${fmt(TUT_REWARD)} банкнот за навчання!`, BUCK);
  setTimeout(tutEnd, 700);
}
// друкуємо текст по літері (переклад — заздалегідь, щоб словник не чіпав половинки слів)
function tutType(text) {
  const el = tutEl.querySelector('.tt-txt'); clearInterval(tutTypeT);
  if (typeof text === 'function') text = text();
  const full = tr(text); let i = 0; el._full = full; el._done = false;
  // невидимий «хвіст» тексту одразу займає місце — вікно не стрибає, поки літери друкуються
  el.innerHTML = '<span class="tt-a"></span><span class="tt-b"></span>';
  const A = el.firstChild, B = el.lastChild; B.textContent = full;
  if (document.body.classList.contains('lite')) { A.textContent = full; B.textContent = ''; el._done = true; return; }
  tutTypeT = setInterval(() => { i++; A.textContent = full.slice(0, i); B.textContent = full.slice(i); if (i >= full.length) { clearInterval(tutTypeT); el._done = true; } }, 30);
}
function tutFinishType() { const el = tutEl && tutEl.querySelector('.tt-txt'); if (el && el._full && !el._done) { clearInterval(tutTypeT); el.firstChild.textContent = el._full; el.lastChild.textContent = ''; el._done = true; return true; } return false; }
function tutShow(i, pi) {
  const st = TUT_STEPS[i], g = TUT_GIRLS[st.g], card = tutEl.querySelector('.tt-card');
  if (st.enter) st.enter();
  tutEl.classList.toggle('final', !!st.final);
  if (st.final) { tutEl.querySelector('.tt-ftxt').textContent = tr(typeof st.t === 'function' ? st.t() : st.t); confetti(40); return; }
  const prev = pi >= 0 ? TUT_STEPS[pi] : null;
  const im = tutEl.querySelector('.tt-girl');
  if (!prev || prev.g !== st.g) { im.src = `images/tut/g${st.g}.webp`; card.classList.remove('in'); void card.offsetWidth; card.classList.add('in'); }
  else { card.classList.remove('pulse'); void card.offsetWidth; card.classList.add('pulse'); }
  card.style.setProperty('--gc', g.c);
  tutEl.querySelector('.tt-name b').textContent = tr(g.name); tutEl.querySelector('.tt-name span').textContent = tr(g.role);
  const nb = tutEl.querySelector('.tt-next'), act = !!st.done;
  nb.hidden = act; nb.textContent = tr(st.btn || 'Далі');
  tutEl.classList.toggle('act', act); tutEl.classList.toggle('wait', !!st.wait);
  tutType(st.t); tutScrolled = -1;
}
// плавно підганяємо вежу, щоб ціль було видно
function tutScrollTo(el) {
  const sc = $('#scroller'); if (!sc || !sc.contains(el)) return;
  const r = el.getBoundingClientRect(), sr = sc.getBoundingClientRect();
  if (r.top >= sr.top + 70 && r.bottom <= sr.bottom - 160) return;
  sc.scrollTo({ top: sc.scrollTop + (r.top - sr.top) - sr.height * 0.38 + r.height / 2, behavior: 'smooth' });
}
function tutGlow(sel) {
  const old = document.querySelectorAll('.tut-glow');
  let el = null;
  if (sel) for (const s of sel) { el = [...document.querySelectorAll('#m-body ' + s)].find(e => e.offsetParent && !e.classList.contains('poor')) || [...document.querySelectorAll('#m-body ' + s)].find(e => e.offsetParent); if (el) break; }
  old.forEach(o => { if (o !== el) o.classList.remove('tut-glow'); });
  if (el && !el.classList.contains('tut-glow')) { el.classList.add('tut-glow'); }
}
function tutPlace(r) {
  const W = innerWidth, H = innerHeight, p = 6;
  const q = (c, css) => { const e = tutEl.querySelector(c); for (const k in css) e.style[k] = css[k]; };
  if (!r) { q('.tt-dim.t', { left: '0', top: '0', width: W + 'px', height: H + 'px' }); ['l', 'r', 'b'].forEach(s => q('.tt-dim.' + s, { width: '0', height: '0' })); tutEl.classList.add('nohole'); return; }
  tutEl.classList.remove('nohole');
  const x = Math.max(0, r.left - p), y = Math.max(0, r.top - p), x2 = Math.min(W, r.right + p), y2 = Math.min(H, r.bottom + p);
  q('.tt-dim.t', { left: '0', top: '0', width: W + 'px', height: y + 'px' });
  q('.tt-dim.b', { left: '0', top: y2 + 'px', width: W + 'px', height: Math.max(0, H - y2) + 'px' });
  q('.tt-dim.l', { left: '0', top: y + 'px', width: x + 'px', height: Math.max(0, y2 - y) + 'px' });
  q('.tt-dim.r', { left: x2 + 'px', top: y + 'px', width: Math.max(0, W - x2) + 'px', height: Math.max(0, y2 - y) + 'px' });
  const ho = tutEl.querySelector('.tt-hole'); ho.style.transform = `translate(${x}px,${y}px)`; ho.style.width = (x2 - x) + 'px'; ho.style.height = (y2 - y) + 'px';
  const ha = tutEl.querySelector('.tt-hand'); const below = y2 + 70 < H - 10;
  ha.style.transform = `translate(${(x + x2) / 2 - 22}px,${below ? y2 + 4 : y - 54}px)`; ha.classList.toggle('up', !below); ha.firstChild.textContent = below ? '👆' : '👇';
  tutEl.classList.toggle('cardtop', (y + y2) / 2 > H * 0.5);
}
let tutLastKey = '', tutT = 0;
function tutLoop(t = 0) {
  tutRaf = requestAnimationFrame(tutLoop);
  if (!tutEl || !tutOn() || t - tutT < 70) return; // ~14 разів на секунду досить — рамка рухається плавно завдяки CSS
  tutT = t;
  if (typeof rewardOpen !== 'undefined' && rewardOpen) { tutEl.classList.add('hide'); return; }
  tutEl.classList.remove('hide');
  const i = S.tut.s || 0, st = TUT_STEPS[i]; if (!st) return;
  if (tutShown !== i) { const pi = tutShown; tutShown = i; tutShow(i, pi); }
  if (st.done && st.done()) { tutNext(); return; }
  if (st.final) return;
  const mOpen = $('#modal-bg').classList.contains('show');
  const mode = mOpen ? (st.modal || st.done ? 'modal' : 'block') : 'main';
  if (mode !== tutMode) { tutMode = mode; tutEl.classList.toggle('inmodal', mode === 'modal'); if (mode === 'block' && !st.done) closeModal(); }
  if (mode === 'modal') { tutGlow(st.modal); tutToast(); return; }
  tutGlow(null);
  const el = st.target ? st.target() : null;
  if (el && tutScrolled !== i) { tutScrolled = i; tutScrollTo(el); }
  const r = el && el.getBoundingClientRect();
  const key = r ? `${r.left | 0},${r.top | 0},${r.width | 0},${r.height | 0}` : 'none';
  if (key !== tutLastKey) { tutLastKey = key; tutPlace(r && r.width ? r : null); }
  tutToast();
  tutEl.classList.toggle('pass', !!st.done && !st.wait); // клікати можна лише в підсвічене місце
}
