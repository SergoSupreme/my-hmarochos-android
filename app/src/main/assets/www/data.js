// ===================================================================
//  Мій Хмарочос — конфіг гри v0.5
//  Щоб замінити картинку — поклади PNG з такою ж назвою в images/icons/
// ===================================================================
const IMG = n => 'images/icons/' + n + '.png';
const GAME_TITLE = 'Мій Хмарочос';
const VERSION = '1.7';
const BUCK = 'cash';          // іконка банкнот
const COIN = 'coin';          // іконка монет

// 5 типів поверхів (як в оригіналі)
const CATS = {
  food:    { name: 'Продукти',    color: '#3fbf4f', img: 'f2_warehouse', desc: 'Кондитерські, лавки, напої' },
  service: { name: 'Послуги',     color: '#2ea8ff', img: 'f2_tech',      desc: 'Банки, клініки, майстерні' },
  fun:     { name: 'Відпочинок',  color: '#ff9b22', img: 'f2_club',      desc: 'Кіно, ресторани, розваги' },
  style:   { name: 'Мода',        color: '#ff4fa8', img: 'f2_boutique',  desc: 'Одяг, краса, аксесуари' },
  tech:    { name: 'Електроніка', color: '#9a5cff', img: 'f2_servers',   desc: 'Гаджети, техніка, авто' },
};

// Назва | інтер'єр | Товар:іконка, Товар:іконка, Товар:іконка
const BIZ_RAW = {
  food: `Кондитерська|shop_bakery|Торти:cake2,Тістечка:cookies,Цукерки:candies
М'ясна лавка|b_mall|Стейки:steak,М'ясо:meat,Ковбаси:sausage
Молочна лавка|b_cafe|Молоко:bottles,Йогурти:yogurt,Сири:cheese
Морозиво|room_cafe|Ріжки:icecream,Коктейлі:milkshake,Пломбір:icecream_box
Спеції|shop_market|Трави:herbs,Соуси:sauce,Приправи:jars
Чайна крамниця|shop_cafe|Чай:tea,Кава:coffee2,Солодощі:chocolates
Напівфабрикати|f2_warehouse|Пельмені:dumplings,Обіди:lunchbox,Пироги:pies
Доставка води|b_shop|Вода:water,Соки:juice_box,Напої:soda
Бакалія|shop_store|Макарони:pasta,Крупи:p_wheat,Консерви:cans
Консерви|f2_warehouse|Консерви:cans,Варення:preserves,Соління:jars
Винний бутік|int_lounge|Вино:wine,Коктейлі:cocktails,Сири:cheese
Морепродукти|f2_restaurant|Креветки:shrimp,Риба:fish_ice,Суші:sushi2
Фруктова лавка|shop_market|Фрукти:fruits,Соки:juice_box,Ягоди:veg_basket
Рибна лавка|int_lounge|Риба:fish,Охолоджена:fish_ice,Креветки:shrimp
Овочева лавка|room_house|Овочі:veggies2,Кошики:veg_basket,Салати:salad
Делікатеси|int_lounge|Делікатеси:deli,Сири:cheese,Вино:wine
Сирна лавка|b_shop|Сири:cheese,Молоко:bottles,Мед:honey
Напої|b_shop|Газована:soda,Соки:juice_box,Вода:water
Сухофрукти|shop_market|Горіхи:nuts,Фрукти:fruits,Мед:honey
Трави|int_terrace|Трави:herbs,Чай:tea,Розсада:sprout
Шоколадна лавка|shop_bakery|Шоколад:chocolates,Цукерки:candies,Торти:cake
Фастфуд|int_terrace|Бургери:burger2,Картопля:fries,Комбо:combo
Пончики|shop_cafe|Пончики:donut,Кава:coffee_go,Печиво:cookies
Горіхи|shop_market|Горіхи:nuts,Сухофрукти:fruits,Мед:honey
Крупи|b_shop|Крупи:p_wheat,Хліб:bread,Макарони:pasta
Спортивне харчування|shop_gym|Протеїн:milkshake,Батончики:chocolates,Вода:water
Соуси|shop_store|Соуси:sauce,Кетчуп:ketchup,Заправки:sauces
Дитяче харчування|b_shop|Пюре:preserves,Йогурти:yogurt,Соки:juice_box
Хлібна лавка|shop_bakery|Хліб:bread,Багети:baguette,Булочки:buns
Медова лавка|b_cafe|Мед:honey,Варення:preserves,Чай:tea
Готові страви|f2_restaurant|Обіди:lunchbox,Супи:soup,Салати:salad2
Корм для тварин|f2_warehouse|Корм:petfood,Ласощі:cookies,Іграшки:p_ball
Мармелад|shop_bakery|Мармелад:candies,Желейки:chocolates,Торти:cake2
Натуральні продукти|room_pool|Овочі:veggies,Мед:honey,Трави:herbs
Йогурти|shop_diner|Йогурти:yogurt,Молоко:bottles,Морозиво:icecream_box`,
  service: `Пральня|int_living|Прання:washer2,Сушіння:washer3,Прасування:towels
Майстерня|b_garage|Ремонт:toolbox,Інструменти:tool,Деталі:gear2
Перукарня|lobby_2|Стрижка:scissors,Барбер:barber,Укладка:beauty
Ательє|int_living|Пошиття:sewing,Костюми:suit2,Сорочки:shirt
Ремонт одягу|int_living|Латки:sewing,Ґудзики:scissors,Куртки:jacket
Турагенція|f2_office|Тури:tour,Мапи:maps,Квитки:tickets
Манікюрний салон|lobby_2|Манікюр:makeup,Лаки:lipstick,Косметика:cosmetics
Копі-центр|shop_office|Друк:printer2,Копії:doc,Скан:printer3
Банк|b_bank|Вклади:bank2,Обмін:exchange,Кредити:money_bag
Поліклініка|b_hospital|Огляд:medkit,Аптека:pharmacy,Щеплення:plus_green
Ремонт взуття|b_gas|Підбори:shoe_repair,Кросівки:sneakers,Туфлі:heels
Фотостудія|f2_studio|Фото:photo_kit,Камери:camera2,Портрети:painting
Страхування|int_conference|Поліси:insurance,Угоди:deal,Документи:doc
Консалтинг|int_conference|Консультації:chat,Аналітика:chart,Угоди:handshake
Лізинг|b_office|Лізинг:leasing,Авто:suv_white,Договори:clipboard
Експрес-пошта|b_police|Листи:mail2,Посилки:courier,Доставка:delivery
Стоматологія|b_hospital|Огляд:tooth,Пломби:medkit,Відбілювання:plus_orange
Тренінг-центр|int_conference|Курси:teaching,Книги:books,Сертифікати:star_badge
Реклама|shop_office|Реклама:ads,Банери:megaphone2,Маркетинг:marketing
Мовна школа|int_office|Уроки:teaching,Книги:books,Словники:doc
Ветклініка|b_hospital|Огляд:pets,Корм:petfood,Ліки:pharmacy
IT-компанія|int_servers|Сайти:webdev,Підтримка:it_service,Програми:pc
Домашній персонал|int_living|Няні:nanny,Прибирання:washer,Кухарі:cooking
Обмін валют|b_bank|Валюта:exchange,Монети:coins_pile,Злитки:gold_bars
Тату-салон|lobby_3|Ескізи:brushes,Тату:palette,Пірсинг:jewels
Аптека|b_hospital|Ліки:pharmacy,Аптечки:medkit,Вітаміни:jars
Прокат|b_garage|Велосипеди:v_bike,Мопеди:v_moto,Кемпери:camper
Ландшафтний дизайн|int_terrace|Сад:garden,Розсада:sprout,Дерева:p_tree
Естетика|lobby_2|Догляд:spa,Косметика:cosmetics,Макіяж:makeup
Годинникова майстерня|shop_store|Годинники:watch,Ремонт:tool,Ремінці:watch2
Ремонт телефонів|f2_tech|Смартфони:smartphone,Планшети:tablet,Чохли:phone
Нерухомість|int_conference|Оренда:realty,Ключі:keys,Угоди:deal
Ремонт авто|b_garage|Ремонт:toolbox,Шини:gear,Авто:car_red
Доставка|f2_warehouse|Посилки:delivery,Кур'єри:courier,Фургони:van
Дитячий центр|f2_lounge|Ігри:kids_play,Іграшки:toys,Няні:nanny`,
  fun: `Кав'ярня|room_cafe|Кава:coffee2,Пончики:donut,Торти:cake2
Бар|int_lounge|Коктейлі:cocktails,Вино:wine,Закуски:combo
Феєрверки|shop_city|Салюти:fireworks,Кульки:p_balloon,Свята:giftbox
Ресторан|f2_restaurant|Вечері:dinner,Стейки:steak,Вино:wine
Кінотеатр|int_cinema|Попкорн:popcorn,Квитки:cinema_tix,VR-сеанси:vr
Тир|shop_gym|Мішені:target,Дартс:darts,Призи:teddy
Піцерія|room_house|Піца:pizza2,Паста:pasta,Напої:soda
Іграшки|f2_lounge|Іграшки:toys,Ведмедики:teddy,Ляльки:doll
Музей|b_museum|Експонати:museum,Картини:painting,Квитки:tickets
Виставка|b_museum|Картини:painting,Скульптури:p_silver,Каталоги:books
Казино|int_casino|Автомати:slots,Карти:cards,Фішки:coins_pile
Фітнес-клуб|room_gym|Абонементи:card,Тренування:stopwatch,Коктейлі:milkshake
Спа-салон|int_pool|Масаж:spa,Сауна:sauna,Рушники:towels
Студія засмаги|room_pool|Засмага:beach,Креми:cosmetics,Капелюхи:hat
Бібліотека|int_office|Книги:books,Журнали:doc,Карти:maps
Екстрим-парк|shop_resort|Гірки:aquapark,Пейнтбол:paintball,Квадроцикли:v_moto
Сауни|int_pool|Сауна:sauna,Рушники:towels,Чай:tea
Ковзанка|room_gym|Ковзани:rink,Прокат:sneakers,Какао:coffee_cup
Суші-бар|int_lounge|Суші:sushi2,Роли:sushi,Креветки:shrimp
Школа танців|f2_club|Уроки:dance,Костюми:dress,Музика:speaker
Пейнтбол|shop_gym|Маркери:paintball,Шоломи:helmet,Мішені:target
Концертна зала|f2_club|Концерти:concert,Квитки:tickets,Музика:speaker
Кулінарна школа|f2_restaurant|Уроки:cooking,Рецепти:books,Страви:dinner
Цирк|shop_city|Вистави:circus,Квитки:tickets,Кульки:p_balloon
Книжковий дім|int_office|Книги:books,Листівки:mail,Блокноти:clipboard
Фітобар|room_cafe|Смузі:milkshake,Чай:tea,Салати:salad
Розплідник|room_house|Цуценята:puppies,Корм:petfood,Іграшки:p_ball
Зоопарк|room_house|Тварини:zoo,Корм:petfood,Екскурсії:tickets
Планетарій|room_tech|Сеанси:planetarium,Телескопи:telescope,Глобуси:globe
Ботанічний сад|int_terrace|Теплиці:greenhouse,Квіти:p_flower,Дерева:p_tree
Аквапарк|room_pool|Гірки:aquapark,Пляж:beach,Сауна:sauna
Екскурсії|int_reception|Тури:tour,Автобуси:t_bus,Квитки:tickets
Школа малювання|f2_studio|Палітри:palette,Пензлі:brushes,Картини:painting
VR-клуб|f2_club|VR:vr,Геймпади:gamepad,Аркади:arcade3
Боулінг|shop_gym|Боулінг:bowling,Взуття:sneakers2,Напої:soda`,
  style: `Біжутерія|lobby_4|Прикраси:jewels,Каблучки:gem_purple,Намиста:gem_blue
Спідня білизна|f2_boutique|Білизна:lingerie,Купальники:swimwear,Халати:towels
Взуття|lobby_3|Туфлі:heels2,Кросівки:sneakers2,Чоботи:heels
Жіночий одяг|f2_boutique|Сукні:dress,Блузки:blouse,Сумки:handbag
Чоловічий одяг|shop_boutique|Костюми:suit3,Сорочки:shirt,Куртки:jacket2
Дитячий одяг|f2_lounge|Курточки:jacket,Кепки:cap,Іграшки:toys
Весільний салон|lobby_1|Сукні:wedding,Смокінги:tuxedo,Букети:bouquet
Салон краси|lobby_2|Макіяж:makeup,Косметика:cosmetics,Барбер:barber
Аксесуари|shop_boutique|Сумки:handbag,Годинники:watch3,Капелюхи:hat
Хутряний салон|lobby_4|Шуби:fur,Пальта:coat,Шапки:hat
Шкіргалантерея|shop_store|Портфелі:briefcase,Сумки:bag_brown,Гаманці:money_bag2
Купальники|room_pool|Купальники:swimwear,Рушники:towels,Капелюхи:hat
Спорттовари|shop_gym|М'ячі:p_ball,Кросівки:sneakers,Рюкзаки:backpack
Спецодяг|b_shop|Уніформа:uniform,Каски:hardhat,Інструменти:tool
Одяг для дому|int_bedroom|Халати:towels,Худі:hoodie,Капці:sneakers
Салон годинників|lobby_4|Годинники:watch3,Хронографи:watch2,Будильники:clock2
Косметика|lobby_2|Креми:cosmetics,Помада:lipstick,Парфуми:makeup
Термобілизна|f2_boutique|Термо:hoodie,Штани:pants,Куртки:jacket
Головні убори|shop_boutique|Капелюхи:hat,Кепки:cap,Шоломи:helmet
Домашній текстиль|int_bedroom|Рушники:towels,Постіль:bed,Декор:decor
Костюми|shop_boutique|Костюми:suit2,Смокінги:tux,Краватки:suit
Вінтажний одяг|lobby_3|Пальта:coat,Сукні:red_dress,Капелюхи:hat
Килимовий двір|int_living|Килими:decor,Пледи:towels,Дивани:sofa
Стильні меблі|int_bedroom|Дивани:sofa,Крісла:armchair,Ліжка:bed
Сувеніри|shop_city|Сувеніри:giftbox,Листівки:mail,Магніти:star3
Антикварна крамниця|b_museum|Годинники:clock2,Картини:painting,Вази:p_gold
Дитячий світ|f2_lounge|Іграшки:toys,Ляльки:doll,Єдинороги:unicorn
Квітковий салон|lobby_1|Букети:bouquet,Квіти:p_flower,Флористика:florist
Барбершоп|lobby_3|Стрижка:barber,Гоління:scissors,Догляд:cosmetics
Нумізматика|b_bank|Монети:gold_coins,Злитки:gold_bars,Альбоми:books
Інтер'єр|int_living|Декор:decor,Лампи:lamp2,Полиці:shelf
Зимовий одяг|lobby_4|Пуховики:jacket2,Шуби:fur,Шапки:hat
Магазин кігурумі|f2_lounge|Кігурумі:unicorn,Піжами:hoodie,Капці:sneakers
Магазин кросівок|shop_store|Кросівки:sneakers2,Кеди:sneakers,Кепки:cap
Мото-одяг|b_garage|Куртки:red_jacket,Шоломи:helmet,Рукавиці:jacket`,
  tech: `Побутова техніка|f2_tech|Пральні машини:washer3,Холодильники:fridge,Мікрохвильовки:appliances
Комп'ютери|room_tech|ПК:pc,Ноутбуки:laptop,Монітори:monitor
Оргтехніка|shop_office|Принтери:printer3,Сканери:printer2,Папір:doc
Салон зв'язку|f2_tech|Смартфони:smartphone,Тарифи:phone,Планшети:tablet
Домашнє відео|int_cinema|Телевізори:tv2,Проєктори:projector,Колонки:speaker
Оптика|shop_tech|Лупи:magnifier,Телескопи:telescope,Камери:camera4
Дроти|b_factory|Кабелі:bolt2,Подовжувачі:gear2,Роз'єми:tool
Елементи живлення|b_factory|Батарейки:bolt_yellow,Акумулятори:bolt_green,Зарядки:bolt_blue
Світлотехніка|shop_tech|Лампи:lamp2,Люстри:lamp,Гірлянди:fireworks
Радіотехніка|room_tech|Радіо:speaker,Антени:globe,Рації:phone
Ілюмінація|shop_city|Гірлянди:fireworks,Лампи:lamp2,Неон:star3
Фототовари|f2_studio|Камери:camera2,Об'єктиви:camera3,Штативи:photo_kit
Відеотовари|f2_studio|Відеокамери:camera4,Дрони:drone2,Проєктори:projector
Акустика|f2_club|Колонки:speaker,Навушники:headset,Мікрофони:headphones
Автоелектроніка|b_garage|Навігатори:map,Реєстратори:camera3,Магнітоли:speaker
Модні гаджети|shop_tech|Смарт-годинники:watch2,Навушники:headphones,Планшети:tablet
Відеоспостереження|int_control|Камери:camera3,Монітори:monitor,Сервери:workstation
Роботи|room_tech|Роботи:robot,Дрони:drone,Набори:gear2
Електроінструмент|b_construction|Дрилі:tool,Набори:toolbox,Шуруповерти:gear
Радіоіграшки|f2_lounge|Машинки:car_red,Дрони:drone,Вертольоти:heli_red
Клімат-контроль|f2_servers|Кондиціонери:appliances,Обігрівачі:fire,Вентилятори:snow
Розумний дім|int_control|Датчики:it_service,Камери:camera3,Хаби:tablet
Відділ музики|f2_club|Колонки:speaker,Навушники:headset,Платівки:cards
Ігровий салон|f2_club|Консолі:gamepad,Аркади:arcade3,VR:vr
Медтехніка|b_hospital|Тонометри:medkit,Термометри:plus_green,Апарати:monitor
Тренажери|room_gym|Доріжки:stopwatch,Гантелі:gear,Велотренажери:v_bike
Автомати|room_casino|Автомати:arcade2,Слоти:slots,Вендинг:vending
Спецобладнання|b_factory|Обладнання:gear2,Сейфи:safe,Термінали:terminal
Електрика|b_construction|Кабелі:bolt2,Щитки:bolt_yellow,Лампи:lamp2
Товари для саду|room_house|Сад:garden,Розсада:sprout,Інструменти:toolbox
Обладнання|b_factory|Верстати:gear,Сервери:workstation,Термінали:pos
Кухонна техніка|f2_tech|Плити:kitchen,Холодильники:fridge,Блендери:appliances
Космічна техніка|int_helipad|Телескопи:telescope,Супутники:globe,Дрони:drone2
Автосалон|b_garage|Мопеди:v_moto,Таксі:v_taxi,Позашляховики:v_suv
Мототехніка|b_garage|Мотоцикли:v_moto,Шоломи:helmet,Квадроцикли:suv_red`,
};

// Розгортаємо список: кожен бізнес має свій множник цін (mult) і темп (pace)
const BUSINESSES = [];
for (const [cat, txt] of Object.entries(BIZ_RAW)) {
  txt.trim().split('\n').forEach((line, i) => {
    const [name, room, prods] = line.split('|');
    BUSINESSES.push({
      id: cat + '_' + i, cat, name, room: CATS[cat].img, idx: i,
      mult: Math.round((1 + i * 0.09) * 100) / 100,
      pace: Math.round((0.65 + ((i * 7) % 11) * 0.09) * 100) / 100,
      products: prods.split(',').map(p => p.split(':')),
    });
  });
}

// Товари: доставка (сек), продаж (сек), кількість, ціна закупки, ціна продажу, досвід
const TIERS = [
  { deliver: 30,  sell: 120,  qty: 20, cost: 30,  price: 3,  xp: 2 },
  { deliver: 180, sell: 600,  qty: 40, cost: 150, price: 8,  xp: 6 },
  { deliver: 600, sell: 1800, qty: 60, cost: 600, price: 22, xp: 15 },
];
// Покращення поверху — 5 зірок, лише за банкноти
const FLOOR_UP = {
  costs: [10, 25, 50, 100, 250],
  price: s => 1 + 0.15 * s,   // виручка
  xp:    s => 1 + 0.10 * s,   // досвід
  buy:   s => 1 - 0.05 * s,   // вартість закупки
  sell:  s => 1 - 0.06 * s,   // час продажу
};
// Навчання працівників
const RANKS = [
  { name: 'Новачок',    bonus: 0,    icon: '' },
  { name: 'Спеціаліст', bonus: 0.10, cost: 50,  icon: 'star_badge' },
  { name: 'Експерт',    bonus: 0.35, cost: 100, icon: 'crown3' },
];
const HAPPY_ICON = 'heart';
const HAPPY_DISCOUNT = 0.03;  // щасливий працівник (робота мрії) — −3% до закупки

const HOTEL = {
  name: 'Готель «Мрія»', room: 'int_bedroom', maxLvl: 50,
  capacity: l => 5 + 3 * (l - 1),   // місця лише для безробітних
  upgradeCost: l => 25 * l,          // 25, 50, 75 … — кожен наступний рівень на 25 банкнот дорожчий
};

const CHARS = Array.from({ length: 42 }, (_, i) => 'ch_' + (i + 1)).filter(c => c !== 'ch_11' && c !== 'ch_17');
const FEMALE = new Set(['ch_3','ch_7','ch_13','ch_14','ch_21','ch_24','ch_27','ch_28','ch_30','ch_35','ch_38','ch_39','ch_41']);
const NAMES_M = ['Олег','Андрій','Іван','Тарас','Богдан','Дмитро','Максим','Віктор','Роман','Петро','Сергій','Назар','Ярослав','Остап','Денис','Артем','Микола','Степан','Василь','Юрій'];
const NAMES_F = ['Марія','Оксана','Софія','Ірина','Наталя','Юлія','Катерина','Олена','Анна','Дарина','Христина','Вікторія','Леся','Соломія','Злата','Мирослава'];

// Досвід, потрібний для переходу з рівня l на l+1 (індекс l-1). Рівні 1–110, далі +10% за рівень.
const XP_TABLE = [200,210,220,450,750,1500,3000,4500,7500,12000,20000,32000,51000,82000,130000,220000,350000,570000,920000,1500000,2400000,3900000,6300000,10000000,16000000,27000000,43000000,70000000,110000000,180000000,290000000,480000000,770000000,1200000000,1500000000,1800000000,2200000000,2600000000,3000000000,3600000000,4300000000,5200000000,6200000000,7500000000,9000000000,11000000000,13000000000,16000000000,19000000000,22000000000,27000000000,32000000000,39000000000,46000000000,56000000000,67000000000,80000000000,96000000000,110000000000,120000000000,140000000000,170000000000,210000000000,250000000000,300000000000,360000000000,430000000000,520000000000,540000000000,560000000000,580000000000,640000000000,700000000000,750000000000,780000000000,810000000000,840000000000,870000000000,900000000000,940000000000,980000000000,1000000000000,1000000000000,1200000000000,1200000000000,1200000000000,1200000000000,1200000000000,1500000000000,1600000000000,1700000000000,1800000000000,1900000000000,2200000000000,3800000000000,4000000000000,4200000000000,4400000000000,7500000000000,7800000000000,8100000000000,8400000000000,8700000000000,9000000000000,9400000000000,9800000000000,10000000000000,10000000000000,10000000000000];
function xpNeed(l) {
  if (l <= XP_TABLE.length) return XP_TABLE[l - 1];
  return Math.round(XP_TABLE[XP_TABLE.length - 1] * Math.pow(1.1, l - XP_TABLE.length));
}
// Ціна поверху за його номером (3…200): [сума, 'c' — монети | 'b' — банкноти]. Максимум 200 поверхів.
const MAX_FLOOR = 200;
const FLOOR_PRICES = [[300,'c'],[3,'b'],[500,'c'],[750,'c'],[1200,'c'],[1700,'c'],[15,'b'],[4000,'c'],[7000,'c'],[11500,'c'],[18000,'c'],[50,'b'],[50000,'c'],[80000,'c'],[130000,'c'],[210000,'c'],[100,'b'],[275000,'c'],[475000,'c'],[775000,'c'],[1000000,'c'],[150,'b'],[1300000,'c'],[2100000,'c'],[3380000,'c'],[5460000,'c'],[250,'b'],[6000000,'c'],[10000000,'c'],[16000000,'c'],[26000000,'c'],[500,'b'],[40000000,'c'],[52000000,'c'],[68000000,'c'],[88000000,'c'],[1000,'b'],[100000000,'c'],[140000000,'c'],[196000000,'c'],[275000000,'c'],[2000,'b'],[300000000,'c'],[450000000,'c'],[675000000,'c'],[900000000,'c'],[3000,'b'],[1000000000,'c'],[1100000000,'c'],[1200000000,'c'],[1300000000,'c'],[4000,'b'],[1400000000,'c'],[1500000000,'c'],[1600000000,'c'],[1700000000,'c'],[5000,'b'],[1800000000,'c'],[1900000000,'c'],[2000000000,'c'],[2100000000,'c'],[6000,'b'],[2200000000,'c'],[2300000000,'c'],[2400000000,'c'],[2500000000,'c'],[7000,'b'],[2600000000,'c'],[2700000000,'c'],[2800000000,'c'],[2900000000,'c'],[8000,'b'],[3000000000,'c'],[3100000000,'c'],[3200000000,'c'],[3300000000,'c'],[9000,'b'],[3500000000,'c'],[4000000000,'c'],[4500000000,'c'],[5000000000,'c'],[10000,'b'],[6000000000,'c'],[7000000000,'c'],[8000000000,'c'],[9000000000,'c'],[15000,'b'],[10000000000,'c'],[12000000000,'c'],[14000000000,'c'],[16000000000,'c'],[20000,'b'],[18000000000,'c'],[20000000000,'c'],[22000000000,'c'],[24000000000,'c'],[25000,'b'],[27000000000,'c'],[30000000000,'c'],[33000000000,'c'],[36000000000,'c'],[30000,'b'],[39000000000,'c'],[42000000000,'c'],[45000000000,'c'],[48000000000,'c'],[35000,'b'],[52000000000,'c'],[56000000000,'c'],[60000000000,'c'],[64000000000,'c'],[40000,'b'],[68000000000,'c'],[72000000000,'c'],[76000000000,'c'],[80000000000,'c'],[45000,'b'],[84000000000,'c'],[88000000000,'c'],[92000000000,'c'],[96000000000,'c'],[50000,'b'],[100000000000,'c'],[105000000000,'c'],[110000000000,'c'],[115000000000,'c'],[55000,'b'],[135000000000,'c'],[155000000000,'c'],[175000000000,'c'],[195000000000,'c'],[60000,'b'],[250000000000,'c'],[270000000000,'c'],[290000000000,'c'],[310000000000,'c'],[65000,'b'],[350000000000,'c'],[380000000000,'c'],[410000000000,'c'],[440000000000,'c'],[70000,'b'],[470000000000,'c'],[500000000000,'c'],[530000000000,'c'],[560000000000,'c'],[75000,'b'],[580000000000,'c'],[600000000000,'c'],[640000000000,'c'],[680000000000,'c'],[80000,'b'],[720000000000,'c'],[770000000000,'c'],[820000000000,'c'],[870000000000,'c'],[85000,'b'],[1000000000000,'c'],[1300000000000,'c'],[1600000000000,'c'],[1900000000000,'c'],[90000,'b'],[2200000000000,'c'],[2500000000000,'c'],[2800000000000,'c'],[3100000000000,'c'],[100000,'b'],[3400000000000,'c'],[3700000000000,'c'],[4000000000000,'c'],[4300000000000,'c'],[120000,'b'],[5000000000000,'c'],[5400000000000,'c'],[5820000000000,'c'],[6260000000000,'c'],[140000,'b'],[6740000000000,'c'],[7240000000000,'c'],[7760000000000,'c'],[8300000000000,'c'],[160000,'b'],[8880000000000,'c'],[9480000000000,'c'],[10100000000000,'c'],[10740000000000,'c'],[180000,'b'],[11420000000000,'c'],[12120000000000,'c'],[12840000000000,'c'],[13580000000000,'c'],[200000,'b'],[14360000000000,'c'],[15160000000000,'c'],[15980000000000,'c'],[16820000000000,'c'],[250000,'b'],[17700000000000,'c']];
const floorPrice = n => FLOOR_PRICES[Math.max(0, Math.min(FLOOR_PRICES.length - 1, n - 3))];
const BALANCE = {
  startCoins: 1500,
  startBucks: 250,
  floorCost: n => Math.round(350 * Math.pow(1.28, n - 2) / 10) * 10,
  buildTime: n => Math.min(Math.round(20 * Math.pow(1.22, n - 1) + n * 15), 24 * 3600), // що вище поверх — то довше
  workersPerShop: 3,
  visitorEvery: [6, 14],        // сек між новими гостями в холі
  vipChance: 0.07,
  tipChance: 0.3,               // шанс отримати 1 банкноту чайових
  tipBase: 9,                   // денний ліміт чайових = 9 + рівень + таксі
  settleChance: 0.3,            // шанс, що гість залишиться жити в готелі
  settleChanceHotel: 0.8,
  xpForLevel: l => xpNeed(l),
  dreamJobBucks: 25,
  levelUpBucks: 20,
};

// Ліфт: L-1 … L-50. Рівень → швидкість, чайові, скільки людей за раз
const UPG_COST = [5, 10, 15, 25, 40, 65, 85, 110, 140, 170, 205, 240, 280, 320, 365, 410, 460, 510, 565, 620, 680, 740, 805, 870, 940, 1010, 1085, 1160, 1240, 1320, 1405, 1490, 1580, 1670, 1765, 1860, 1960, 2060, 2165, 2270, 2380, 2490, 2605, 2720, 2840, 2960, 3085, 3210, 3340];  // ціна переходу l → l+1 (банкноти)
const LIFT_MAX = 50;
const LIFT = {
  speed: l => Math.pow(0.965, l - 1),
  tip:   l => l <= 20 ? 1 + 0.1 * (l - 1) : 2.9 + 0.05 * (l - 20),
  cap:   l => 1 + Math.floor((l - 1) / 3),
  cost:  l => UPG_COST[l - 1],
  img:   l => ['elev_1', 'elev_2', 'elev_6', 'elev_3', 'elev_4', 'elev_5', 'elev_7'][Math.min(6, Math.floor((l - 1) / 7.2))],
  vip:   l => l >= 19 ? 0.06 + 0.04 * (l - 19) / 31 : 0,
};
// Вестибюль: скільки гостей може чекати (40 рівнів)
const LOBBY_MAX = 40;
const LOBBY = {
  cap:   l => 10 + 5 * (l - 1),
  cost:  l => UPG_COST[l - 1],
  style: l => Math.min(5, 1 + Math.floor((l - 1) / 8)),
};

const SERVICES = {
  marketing: { name: 'Маркетинг', img: 'marketing',  desc: 'Збільшує виручку поверхів і чайові в ліфті', pcts: [100, 200, 300], hours: [6, 12, 24, 48],
               price: (p, h) => Math.max(1, Math.round(p / 300 * h / 24 * 450)) },  // 300% на добу = 450 банкнот
  pr:        { name: 'Піар',      img: 'megaphone2', desc: 'Збільшує досвід за все в грі', pcts: [100, 200, 300], hours: [6, 12, 24, 48],
               price: (p, h) => Math.max(1, Math.round(p / 300 * h / 24 * 240)) },  // 300% на добу = 240 банкнот
  manager:   { name: 'Менеджер',  img: 'ch_2',       desc: 'Сам закуповує, вивантажує товари й збирає виручку, навіть коли тебе немає', hours: [24, 48, 72],
               price: (p, h) => ({ 24: 250, 48: 450, 72: 600 })[h] },
  lifter:    { name: 'Ліфтер',    img: 'ch_10',      desc: 'Сам возить гостей ліфтом', hours: [6, 12, 24],
               price: (p, h) => ({ 6: 60, 12: 100, 24: 170 })[h] },
};

const TECH_MAX = 15;
const TECH = [
  { id: 'taxi',     name: 'Таксі',                img: 't_taxi',      price: 1000, desc: 'Кожне таксі збільшує кількість безкоштовних банкнот у ліфті на 1 і додатково дає +1 000 досвіду за кожного гостя.',
    stat: n => [['банкнот у ліфті на день', '+' + n], ['досвіду за гостя', '+' + fmt(1000 * n)]] },
  { id: 'forklift', name: 'Автокар',              img: 't_forklift',  price: 1000, desc: 'Кожен автокар прискорює продаж усіх товарів на 1% і додатково дає +5 000 досвіду за кожен викладений товар.',
    stat: n => [['швидкість продажу', '+' + n + '%'], ['досвіду за викладку', '+' + fmt(5000 * n)]] },
  { id: 'armored',  name: 'Інкасаторська машина', img: 't_armored',   price: 2500, desc: 'Кожна машина збільшує зібрану виручку на 5%, а досвід від виручки на 10%.',
    stat: n => [['виручка', '+' + 5 * n + '%'], ['досвід від виручки', '+' + 10 * n + '%']] },
  { id: 'truck',    name: 'Фура',                 img: 't_truck',     price: 1000, desc: 'Кожна фура прискорює доставку всіх товарів на 1% і додатково дає +5 000 досвіду за кожен закуплений товар.',
    stat: n => [['швидкість доставки', '+' + n + '%'], ['досвіду за закупку', '+' + fmt(5000 * n)]] },
  { id: 'bus',      name: 'Автобус',              img: 't_bus',       price: 1000, desc: 'Кожен автобус збільшує кількість гостей у вестибюлі на 5 і додатково збільшує чайові на 5%.',
    stat: n => [['місць для гостей', '+' + 5 * n], ['чайові', '+' + 5 * n + '%']] },
  { id: 'excavator',name: 'Екскаватор',           img: 't_excavator', price: 1000, desc: 'Кожен екскаватор знижує вартість прискорення будівництва за банкноти на 3%.',
    stat: n => [['банкноти на будівництво', '−' + 3 * n + '%']] },
  { id: 'loader',   name: 'Навантажувач',         img: 't_loader',    price: 1000, desc: 'Кожен навантажувач знижує вартість будівництва поверхів за монети на 3%.',
    stat: n => [['монети на будівництво', '−' + 3 * n + '%']] },
  { id: 'crane',    name: 'Автокран',             img: 't_crane',     price: 1000, desc: 'Кожен автокран скорочує час будівництва поверхів на 3%.',
    stat: n => [['час будівництва', '−' + 3 * n + '%']] },
];

// Бізнес-імперія: кожен бізнес підіймає виручку або досвід певного типу поверхів
const EMPIRE_MAX = 40;   // 40 рівнів × 5% = 200%
const EMPIRE = [
  { id: 'farm',    name: 'Ферма',           img: 'bz_farm',     cat: 'food',    kind: 'rev' },
  { id: 'market',  name: 'Ринок',           img: 'bz_market',   cat: 'food',    kind: 'xp' },
  { id: 'hosp',    name: 'Медичний центр',  img: 'bz_hospital', cat: 'service', kind: 'rev' },
  { id: 'bank',    name: 'Банк',            img: 'bz_bank',     cat: 'service', kind: 'xp' },
  { id: 'casino',  name: 'Казино',          img: 'bz_casino',   cat: 'fun',     kind: 'rev' },
  { id: 'hotel',   name: 'Курорт',          img: 'bz_hotel',    cat: 'fun',     kind: 'xp' },
  { id: 'office',  name: 'Бізнес-центр',    img: 'bz_office',   cat: 'style',   kind: 'rev' },
  { id: 'mine',    name: 'Копальня',        img: 'bz_mine',     cat: 'style',   kind: 'xp' },
  { id: 'factory', name: 'Завод',           img: 'bz_factory',  cat: 'tech',    kind: 'rev' },
  { id: 'lab',     name: 'Лабораторія',     img: 'bz_lab',      cat: 'tech',    kind: 'xp' },
  { id: 'telecom', name: 'Телеком',         img: 'bz_telecom',  cat: 'lift',    kind: 'rev' },
  { id: 'eco',     name: 'Еко-парк',        img: 'bz_eco',      cat: 'lift',    kind: 'xp' },
];
const EMPIRE_STEP = 0.05;   // +5% за рівень
// Ціна рівня: [кількість, валюта] — 'b' банкноти, 'c' монети
const EMPIRE_COSTS = [[500,'c'],[1000,'c'],[2000,'c'],[4000,'c'],[50,'b'],[5000,'c'],[10000,'c'],[15000,'c'],[100,'b'],[15000,'c'],
  [30000,'c'],[50000,'c'],[200,'b'],[50000,'c'],[100000,'c'],[200000,'c'],[400,'b'],[200000,'c'],[300000,'c'],[400000,'c'],
  [1000,'b'],[500000,'c'],[600000,'c'],[700000,'c'],[2000,'b'],[700000,'c'],[800000,'c'],[900000,'c'],[5000,'b'],[1e6,'c'],
  [2e6,'c'],[3e6,'c'],[8000,'b'],[1e7,'c'],[2e7,'c'],[3e7,'c'],[10000,'b'],[1e8,'c'],[2e8,'c'],[5e9,'c']];

const CHESTS = [
  { id: 'wood',   name: "Дерев'яна",  icon: 'chest_wood',   price: 500, cur: 'coins', coins: [300, 900],    bucks: [0, 5],    xp: [20, 60],     bonus: 0.25, pcts: [100] },
  { id: 'blue',   name: 'Синя',       icon: 'chest_blue',   price: 60,  cur: 'bucks', coins: [800, 2500],   bucks: [5, 25],   xp: [60, 200],    bonus: 0.5,  pcts: [100, 200] },
  { id: 'purple', name: 'Фіолетова',  icon: 'chest_purple', price: 180, cur: 'bucks', coins: [3000, 7000],  bucks: [20, 70],  xp: [200, 600],   bonus: 0.8,  pcts: [100, 200, 300], resident: 0.3 },
  { id: 'red',    name: 'Легендарна', icon: 'chest_red',    price: 450, cur: 'bucks', coins: [9000, 20000], bucks: [60, 160], xp: [600, 1800],  bonus: 1,    pcts: [200, 300], resident: 1 },
];
// Бонуси зі скринь: піар / маркетинг / менеджер на 1–24 год
const CHEST_BONUS = { svcs: ['pr', 'marketing', 'manager'], hours: [1, 1, 2, 3, 3, 5, 7, 7, 12, 24] };
const EXCHANGE = [ [5, 1000, 'coins_stack'], [50, 10500, 'coins_heap'], [500, 110000, 'treasure'] ]; // 5 банкнот = 1000 монет, оптом вигідніше
const DAILY = [ { bucks: 25 }, { bucks: 40 }, { bucks: 75 }, { bucks: 120 }, { bucks: 150 }, { svc: 'manager', h: 24 }, { chest: 'purple' } ];

// Щоденні завдання — оновлюються щодня о 00:00
const DAILY_TASKS = [
  { id: 'rides',   name: 'Перевізник',       icon: 'elev_1',          text: n => `Розвези ліфтом ${n} гостей`,          n: l => 20 + l * 8 },
  { id: 'stocked', name: 'Оптові закупки',   icon: 'cart',            text: n => `Закупи ${n} товарів`,                 n: l => 8 + l * 4 },
  { id: 'movers',  name: 'Нові жителі',      icon: 'int_bedroom',     text: n => `Привези у вежу ${n} нових жителів`,   n: l => 2 + Math.floor(l / 2) },
  { id: 'unload',  name: 'Товар на вітрині', icon: 'boxes',           text: n => `Виклади ${n} товарів`,                n: l => 8 + l * 4 },
  { id: 'tips',    name: 'Легкі гроші',      icon: BUCK,              text: n => `Отримай ${n} банкнот чайових`,        n: l => 3 + Math.floor(l / 2) },
  { id: 'spend',   name: 'Інвестор',         icon: 'money_bag_green', text: n => `Витрать ${n} банкнот`,                n: l => 30 + l * 15, bucks: 30 },
  { id: 'cashed',  name: 'Інкасатор',        icon: 'coins_heap',      text: n => `Збери виручку з ${n} товарів`,        n: l => 8 + l * 4 },
  { id: 'liftcoins', name: 'Щедрі гості',    icon: 'coins_heap',      text: n => `Отримай ${fmt(n)} монет чайових у ліфті`, n: l => Math.round(300 * Math.pow(1.18, l - 1) / 10) * 10 },
  { id: 'xp',      name: 'Жага знань',       icon: 'star3',           text: n => `Набери ${fmt(n)} досвіду`,            n: l => Math.round(xpNeed(l) * 0.3) },
  { id: 'vips',    name: 'Червона доріжка',  icon: 'vip2',            text: n => `Розвези ${n} VIP-гостей`,             n: l => 3 + Math.floor(l / 4) },
  { id: 'coll',    name: 'Колекціонер дня',  icon: 'cards',           text: n => `Отримай ${n} частинок колекцій`,      n: l => Math.min(10, 3 + Math.floor(l / 8)) },
  { id: 'lotto',   name: 'Азарт',            icon: 'lt_2',            text: n => `Відкрий ${n} лотерейних білетів`,     n: l => 1 + Math.floor(l / 15) },
  { id: 'donate100',  name: 'Інвестиція',      icon: 'don_1', text: n => `Придбай ${fmt(n)} банкнот`, n: () => 100,  bucks: 50 },
  { id: 'donate600',  name: 'Великий внесок',  icon: 'don_4', text: n => `Придбай ${fmt(n)} банкнот`, n: () => 600,  bucks: 300 },
  { id: 'donate1000', name: 'Меценат',         icon: 'don_3', text: n => `Придбай ${fmt(n)} банкнот`, n: () => 1000, bucks: 750 },
  { id: 'evict',   name: 'До побачення',     icon: 'a_bye',           text: n => `Висели ${n} жителів`,                 n: () => 25 },
  { id: 'maze',    name: 'Шукач скарбів',    icon: 'mz_gold',         text: n => `Пройди лабіринт ${n} раз(и)`,          n: l => 1 + Math.floor(l / 10) },
];
// VIP-завдання: до 3 на день, складність росте з рівнем (l). stat — лічильник у S.stats, all — «виконати всі щоденні»
const VIP_TASKS = [
  { id: 'unload', icon: 'boxes',      stat: 'unloaded', text: n => `Виклади ${fmt(n)} товарів`,             n: l => 15 + l * 6 },
  { id: 'stock',  icon: 'cart',       stat: 'stocked',  text: n => `Закупи ${fmt(n)} товарів`,              n: l => 15 + l * 6 },
  { id: 'cash',   icon: 'coins_heap', stat: 'cashed',   text: n => `Збери виручку ${fmt(n)} разів`,         n: l => 12 + l * 5 },
  { id: 'earn',   icon: 'cash_big',   stat: 'earned',   text: n => `Збери ${fmt(n)} монет виручки`,         n: l => Math.round(2000 * Math.pow(1.3, l - 1) / 100) * 100 },
  { id: 'rides',  icon: 'elev_1',     stat: 'rides',    text: n => `Розвези ліфтом ${fmt(n)} гостей`,       n: l => 30 + l * 10 },
  { id: 'daily',  icon: 'clipboard',  all: true,        text: () => 'Виконай усі щоденні завдання',         n: () => 1 },
  { id: 'maze',   icon: 'mz_gold',    stat: 'mazes',    text: n => `Пройди лабіринт ${n} раз(и)`,            n: l => 1 + Math.floor(l / 8) },
];
const TASK_HOURS = 12; // VIP-завдання та завдання колекцій згорають через 12 год
const VIP_PER_DAY = 3;
const VIP_REWARD = l => ({ bucks: Math.min(40, 10 + l * 2), coins: 300 * l, xp: 60 * l, chest: l >= 10 ? 'purple' : 'blue' });
// Нагорода за кубок: 100 банкнот + монети + досвід + сам кубок
const CUP_BONUS = 0.02; // кожен кубок: +2% до виручки й досвіду назавжди
const CUP_REWARD = i => ({ bucks: 100, coins: Math.round(1500 * Math.pow(1.55, i) / 100) * 100, xp: Math.round(400 * Math.pow(1.45, i)) });


// Кубки: кожен має набір завдань. Виконай усі — забери кубок
const CUP_STATS = {
  revMin:   'Рекорд виручки за хвилину',
  revDay:   'Зібрати виручку за день',
  happy:    'Щасливі жителі',
  tips:     'Отримати банкнот чайових у ліфті',
  dailyDone:'Виконати щоденних завдань',
  liftLvl:  'Покращити ліфт до рівня L-',
  xpTotal:  'Набрати досвіду',
  trainings:'Навчити працівників',
  empireAll:'Покращити всі бізнеси до %',
  stars5:   'Покращити поверхів на 5 зірок',
  techTotal:'Купити техніки, шт.',
  vipTasks: 'Виконати завдань VIP-гостей',
  earned:   'Заробити монет у грі',
  bucksEarned: 'Заробити банкнот',
  biz:      'Відкрити бізнесів',
};
const TROPHIES = [
  { name: 'Золотий лавр',       bucks: 20,   tasks: [['revMin', 300], ['revDay', 5000], ['happy', 2]] },
  { name: 'Зоряний шпиль',         bucks: 30,   tasks: [['revMin', 1000], ['revDay', 30000], ['tips', 15], ['dailyDone', 10]] },
  { name: 'Крилата чаша',   bucks: 50,   tasks: [['revMin', 3000], ['revDay', 150000], ['happy', 5], ['liftLvl', 5], ['xpTotal', 50000]] },
  { name: 'Золотий м\'яч',      bucks: 75,   tasks: [['revMin', 6000], ['revDay', 500000], ['trainings', 10], ['empireAll', 10], ['biz', 15]] },
  { name: 'Сапфірова сфера',       bucks: 100,  tasks: [['revMin', 10000], ['revDay', 1.5e6], ['happy', 10], ['techTotal', 5], ['stars5', 5], ['vipTasks', 10]] },
  { name: 'Королівська чаша',      bucks: 150,  tasks: [['revMin', 15000], ['revDay', 4e6], ['trainings', 25], ['empireAll', 25], ['xpTotal', 1e6], ['techTotal', 10]] },
  { name: 'Зоряна спіраль',         bucks: 200,  tasks: [['revMin', 25000], ['revDay', 1e7], ['happy', 20], ['techTotal', 20], ['bucksEarned', 3000], ['stars5', 15]] },
  { name: 'Синій обеліск',      bucks: 250,  tasks: [['revMin', 40000], ['revDay', 2.5e7], ['dailyDone', 75], ['liftLvl', 12], ['techTotal', 30], ['empireAll', 50]] },
  { name: 'Чаша майстра',     bucks: 300,  tasks: [['earned', 1e9], ['trainings', 60], ['biz', 60], ['techTotal', 45], ['vipTasks', 50], ['liftLvl', 16]] },
  { name: 'Срібний титан',        bucks: 400,  tasks: [['revMin', 60000], ['stars5', 40], ['dailyDone', 150], ['xpTotal', 5e7], ['empireAll', 75]] },
  { name: 'Лавровий м\'яч',       bucks: 500,  tasks: [['revMin', 80000], ['earned', 5e9], ['happy', 40], ['vipTasks', 100], ['xpTotal', 1e8], ['biz', 100]] },
  { name: 'Червона зірка',        bucks: 600,  tasks: [['revMin', 100000], ['bucksEarned', 15000], ['trainings', 120], ['biz', 125], ['techTotal', 80], ['dailyDone', 300]] },
  { name: 'Кубок тріумфу',     bucks: 700,  tasks: [['earned', 2e10], ['revDay', 2e8], ['liftLvl', 20], ['empireAll', 100], ['stars5', 80]] },
  { name: 'Сапфіровий кристал',     bucks: 800,  tasks: [['revMin', 150000], ['revDay', 4e8], ['happy', 60], ['techTotal', 100], ['vipTasks', 200]] },
  { name: 'Золотий глобус', bucks: 900,  tasks: [['earned', 5e10], ['xpTotal', 1e9], ['biz', 150], ['empireAll', 125], ['trainings', 200]] },
  { name: 'Срібна комета',          bucks: 1000, tasks: [['revMin', 200000], ['revDay', 8e8], ['dailyDone', 500], ['stars5', 120]] },
  { name: 'Рубінова чаша',        bucks: 1200, tasks: [['earned', 1e11], ['techTotal', 120], ['happy', 80], ['vipTasks', 350], ['empireAll', 150]] },
  { name: 'Щит чемпіона',    bucks: 1500, tasks: [['revMin', 300000], ['biz', 175], ['stars5', 175], ['xpTotal', 1e10]] },
  { name: 'Нічна корона',        bucks: 2000, tasks: [['earned', 2e11], ['trainings', 350], ['empireAll', 175], ['bucksEarned', 50000], ['dailyDone', 800]] },
  { name: 'Золотий орел',         bucks: 2500, tasks: [['revMin', 500000], ['revDay', 3e9], ['happy', 120], ['vipTasks', 600], ['xpTotal', 5e10]] },
  { name: 'Зірка легенди',     bucks: 5000, tasks: [['earned', 1e12], ['empireAll', 200], ['trainings', 525], ['dailyDone', 1000]] },
];
// Завдання кубків трохи важчі: кількісні цілі ×1.5 (рівень ліфта, % імперії не змінюються)
TROPHIES.forEach(t => t.tasks.forEach(tk => { if (!['liftLvl', 'empireAll'].includes(tk[0])) { const v = tk[1] * 1.5; const m = Math.pow(10, Math.max(0, Math.floor(Math.log10(v)) - 1)); tk[1] = Math.round(v / m) * m; } }));

// Досягнення — по 5 ступенів
const ACH_REWARD = [5, 10, 20, 40, 80];
const ACHIEVEMENTS = [
  { name: 'Перевізник',        img: 'ach_deal',    stat: 'rides',     tiers: [50, 250, 1000, 5000, 20000],     text: 'Перевези гостей' },
  { name: 'Закупівельник',     img: 'ach_chest',   stat: 'stocked',   tiers: [25, 100, 500, 2000, 10000],      text: 'Закупи товари' },
  { name: 'Розвантажувач',     img: 'ach_wood',    stat: 'unloaded',  tiers: [25, 100, 500, 2000, 10000],      text: 'Виклади товари' },
  { name: 'Магнат',            img: 'ach_growth',  stat: 'earned',    tiers: [1e4, 1e5, 1e6, 1e7, 1e8],        text: 'Заробляй монети' },
  { name: 'Забудовник',        img: 'ach_royal',   stat: 'built',     tiers: [5, 15, 30, 60, 100],             text: 'Побудуй поверхи' },
  { name: 'Гостинність',       img: 'ach_shield',  stat: 'residents', tiers: [10, 25, 50, 100, 200],           text: 'Засели мешканців' },
  { name: 'Мрійник',           img: 'ach_star',    stat: 'dreams',    tiers: [3, 10, 25, 60, 120],             text: 'Влаштуй на роботу мрії' },
  { name: 'Модернізатор',      img: 'ach_wings',   stat: 'floorUps',  tiers: [5, 25, 75, 200, 500],            text: 'Покращ поверхи' },
  { name: 'VIP-сервіс',        img: 'ach_crown',   stat: 'vips',      tiers: [5, 25, 100, 300, 1000],          text: 'Обслужи VIP-гостей' },
  { name: 'Цілеспрямований',   img: 'ach_target',  stat: 'dailyDone', tiers: [5, 25, 75, 200, 500],            text: 'Виконай щоденні завдання' },
  { name: 'Колекціонер',       img: 'ach_cup',     stat: 'trophies',  tiers: [1, 3, 7, 12, 21],                text: 'Здобудь кубки' },
  { name: 'Банкір',            img: 'ach_crystal', stat: 'bucksEarned', tiers: [100, 500, 2000, 10000, 50000], text: 'Отримай банкноти' },
  { name: 'Наставник',         img: 'ach_swords',  stat: 'trainings', tiers: [3, 10, 30, 80, 200],             text: 'Навчи працівників' },
  { name: 'Інвестор',          img: 'ach_laurel',  stat: 'empire',    tiers: [3, 10, 30, 60, 120],             text: 'Розвивай бізнес-імперію' },
  { name: 'Постійний гість',   img: 'ach_time',    stat: 'logins',    tiers: [3, 7, 30, 90, 365],              text: 'Заходь щодня' },
  { name: 'Скарбошукач',       img: 'ach_map',     stat: 'chests',    tiers: [3, 10, 30, 100, 300],            text: 'Відкривай скрині' },
  { name: 'Мандрівник',        img: 'a_compass',   stat: 'mazes',     tiers: [1, 5, 20, 60, 150],              text: 'Пройди лабіринт' },
  { name: 'Щасливчик',         img: 'a_gem',       stat: 'lotto',     tiers: [5, 25, 100, 300, 1000],          text: 'Купи лотерейні білети' },
  { name: 'Збирач колекцій',   img: 'a_gold',      stat: 'collDone',  tiers: [1, 3, 10, 25, 60],               text: 'Обміняй колекції' },
  { name: 'До побачення',      img: 'a_bye',       stat: 'evicted',   tiers: [10, 50, 150, 400, 1000],         text: 'Висели жителів' },
  { name: 'Зоряний наставник', img: 'a_shield2',   stat: 'expertUps', tiers: [1, 3, 10, 25, 60],               text: 'Розвивай експертів зірками' },
];

const WEATHER = [
  { id: 'clear',  name: 'Ясно',   icon: 'cloud_sun',   clouds: ['cloud_sun', 'cloud1', 'cloud3'],            count: 7,  w: 3, bonus: { foodRev: 15 }, btxt: '+15% виручки продуктів' },
  { id: 'cloudy', name: 'Хмарно', icon: 'cloud2',      clouds: ['cloud1', 'cloud2', 'cloud3', 'cloud4'],     count: 14, w: 3, bonus: { xp: 10 }, btxt: '+10% досвіду' },
  { id: 'rain',   name: 'Дощ',    icon: 'cloud_rain',  clouds: ['cloud_rain', 'cloud3', 'cloud4'],           count: 12, w: 2, fall: 'rain', bonus: { guests: 40 }, btxt: '+40% гостей' },
  { id: 'storm',  name: 'Гроза',  icon: 'cloud_storm', clouds: ['cloud_storm', 'cloud_rain'],                count: 13, w: 1, fall: 'storm', bonus: { guests: 60 }, btxt: '+60% гостей' },
  { id: 'snow',   name: 'Сніг',   icon: 'snow',        clouds: ['cloud3', 'cloud4', 'cloud1'],               count: 10, w: 1.5, fall: 'snow', bonus: { tips: 25 }, btxt: '+25% чайових' },
];


// ===================================================================
//  Колекції: 8 колекцій по 8 предметів. Якість q (0..7) робить завдання важчими й нагороду більшою.
//  Картинки: images/icons/col_<колекція>_<1..8>.png (тимчасово — іконки товарів, доки немає images_9)
// ===================================================================
const COLL_QUALITY = [
  { name: 'Звичайна',    color: '#9aa8c8' },
  { name: 'Незвичайна',  color: '#5ad16a' },
  { name: 'Добротна',    color: '#3fc7c7' },
  { name: 'Рідкісна',    color: '#3a8bff' },
  { name: 'Цінна',       color: '#a46bff' },
  { name: 'Епічна',      color: '#ff5fb0' },
  { name: 'Легендарна',  color: '#ffb02e' },
  { name: 'Міфічна',     color: '#ff4b4b' },
];
const COLLECTIONS = [
  { id: 'sweet',  name: 'Солодка',   items: [['Торт','cake2'],['Тістечка','cookies'],['Цукерки','candies'],['Ріжок','icecream'],['Коктейль','milkshake'],['Пончик','donut'],['Шоколад','chocolates'],['Мед','honey']] },
  { id: 'morning',name: 'Ранкова',   items: [['Кава','coffee2'],['Чай','tea'],['Хліб','bread'],['Булочки','buns'],['Багет','baguette'],['Йогурт','yogurt'],['Сік','juice_box'],['Пиріг','pies']] },
  { id: 'sea',    name: 'Морська',   items: [['Креветки','shrimp'],['Риба на льоду','fish_ice'],['Суші','sushi2'],['Улов','fish'],['Салат','salad'],['Делікатеси','deli'],['Вино','wine'],['Коктейлі','cocktails']] },
  { id: 'work',   name: 'Майстерня', items: [['Валіза інструментів','toolbox'],['Ключ','tool'],['Шестерня','gear2'],['Швейна машина','sewing'],['Ножиці','scissors'],['Пральна машина','washer2'],['Принтер','printer2'],['Взуттєвий набір','shoe_repair']] },
  { id: 'fashion',name: 'Модна',     items: [['Костюм','suit2'],['Сорочка','shirt'],['Куртка','jacket'],['Кросівки','sneakers'],['Туфлі','heels'],['Помада','lipstick'],['Косметика','cosmetics'],['Манікюр','makeup']] },
  { id: 'money',  name: 'Ділова',    items: [['Вклад','bank2'],['Обмін','exchange'],['Мішок грошей','money_bag'],['Поліс','insurance'],['Угода','deal'],['Графік','chart'],['Лізинг','leasing'],['Договір','clipboard']] },
  { id: 'travel', name: 'Мандрівна', items: [['Тур','tour'],['Мапа','maps'],['Квитки','tickets'],['Камера','camera2'],['Фотонабір','photo_kit'],['Картина','painting'],['Позашляховик','suv_white'],['Посилка','courier']] },
  { id: 'star',   name: 'Зіркова',   items: [['Книги','books'],['Сертифікат','star_badge'],['Мегафон','megaphone2'],['Маркетинг','marketing'],['Реклама','ads'],['Курси','teaching'],['Зуб','tooth'],['Аптечка','medkit']] },
];
const COLL_BUCKS = [100, 150, 250, 400, 600, 850, 1000, 2000];
const COLL_REWARD = q => ({ bucks: COLL_BUCKS[q], coins: Math.round(3000 * Math.pow(1.8, q) / 100) * 100, xp: Math.round(500 * Math.pow(1.7, q)), chest: ['wood', 'wood', 'blue', 'blue', 'purple', 'purple', 'red', 'red'][q] });
const COLL_PER_DAY = 10;
// завдання для колекцій: ціль = base × (1 + 0.6·якість) × (1 + 0.08·рівень)
const COLL_TASKS = [
  { id: 'unload', icon: 'boxes',      stat: 'unloaded', base: 8,   text: n => `Виклади ${fmt(n)} товарів` },
  { id: 'stock',  icon: 'cart',       stat: 'stocked',  base: 8,   text: n => `Закупи ${fmt(n)} товарів` },
  { id: 'cash',   icon: 'coins_heap', stat: 'cashed',   base: 6,   text: n => `Збери виручку ${fmt(n)} разів` },
  { id: 'rides',  icon: 'elev_1',     stat: 'rides',    base: 15,  text: n => `Розвези ліфтом ${fmt(n)} гостей` },
  { id: 'earn',   icon: 'cash_big',   stat: 'earned',   base: 800, text: n => `Збери ${fmt(n)} монет виручки` },
  { id: 'vips',   icon: 'vip2',       stat: 'vips',     base: 1,   text: n => `Привези ${fmt(n)} VIP-гостей` },
  { id: 'maze',   icon: 'mz_gold',    stat: 'mazes',    base: 0.6, text: n => `Пройди лабіринт ${fmt(n)} раз(и)` },
];

// ===================================================================
//  Лабіринт: 10 залів по 3 двері. 1 ключ = відкрити одні двері.
//  У залах 1–9: одні двері — тупик (усе спочатку), двоє — прохідні (порожньо або знахідка).
//  Зал 10 — фінальний: усі три двері золоті й з нагородою.
// ===================================================================
const MAZE = {
  stages: 10,
  loot: [ // вага, тип, картинка відчинених дверей
    { w: 52, kind: 'none',  img: 'mz_corridor' },
    { w: 26, kind: 'coins', img: 'mz_coins' },
    { w: 6,  kind: 'bucks', img: 'mz_bucks' },
    { w: 13, kind: 'xp',    img: 'mz_chest' },
    { w: 3,  kind: 'bonus', img: 'mz_gold' },
  ],
  coins: l => Math.round(irnd(150, 450) * l * Math.pow(1.15, l - 1)),
  bucks: () => irnd(1, 5),
  xp: l => Math.round(Math.max(irnd(40, 120) * l, xpNeed(l) * rnd(.005, .015))),
  bonus: () => Math.random() < 0.35 ? { svc: 'manager', pct: 0, h: irnd(1, 5) } : { svc: Math.random() < .5 ? 'pr' : 'marketing', pct: pick([100, 200, 300]), h: irnd(1, 3) },
  final: l => ({ bucks: 10 + Math.floor(90 * Math.pow(Math.random(), 2.5)), xp: Math.round(Math.max(30 * l * l, xpNeed(l) * .05)), coins: Math.round(1500 * l * Math.pow(1.15, l - 1)) }),
  shop: { key1: 12, key10: 100, key25: 230, key50: 430 },
  skip: 100,   // пройти одразу до фінального залу за 100 ключів   // ціни в банкнотах: 1 ключ, 10 ключів
};
// Донат (поки тестовий режим: банкноти нараховуються без оплати)
const DONATE = [
  { bucks: 100,  uah: 17,  img: 'don_1' },
  { bucks: 300,  uah: 49,  img: 'don_2' },
  { bucks: 600,  uah: 95,  img: 'don_4' },
  { bucks: 1000, uah: 155, img: 'don_3', hot: true },
  { bucks: 2500, uah: 375, img: 'don_5' },
  { bucks: 6000, uah: 850, img: 'don_6', best: true },
];
const DONATE_TEST = true;

// Сертифікати будівництва (магазин → Вежа): одноразова знижка на наступний поверх
const CERTS = [ { pct: 20, price: 500 }, { pct: 50, price: 1000 } ];

// ===================================================================
//  Лотерея: білет миттєвої лотереї. Призи: банкноти (×ціна), монети, досвід, ключі, скрині, бонуси.
//  w — вага шансу; можна виграти більше, ніж коштує білет.
// ===================================================================
const LOTTERY = [
  { id: 'blue',    name: 'Зірковий',  price: 10,  img: 'lt_1', tk: 'tk_1', color: '#2a6fe0', chest: 'wood' },
  { id: 'green',   name: 'Удача',     price: 30,  img: 'lt_2', tk: 'tk_2', color: '#23a03a', chest: 'blue' },
  { id: 'vip',     name: 'VIP',       price: 50,  img: 'lt_3', tk: 'tk_3', color: '#7a3fd0', chest: 'purple' },
  { id: 'jackpot', name: 'Джекпот',   price: 100, img: 'lt_4', tk: 'tk_4', color: '#d0342c', chest: 'red' },
];
const LOTTO_PRIZES = [
  { w: 20, kind: 'bucks', x: 0.5 }, { w: 14, kind: 'bucks', x: 1 }, { w: 7, kind: 'bucks', x: 2 }, { w: 2.2, kind: 'bucks', x: 5 }, { w: 0.5, kind: 'bucks', x: 10, jackpot: true },
  { w: 18, kind: 'coins' }, { w: 13, kind: 'xp' }, { w: 9, kind: 'keys' }, { w: 6, kind: 'chest' }, { w: 8, kind: 'bonus' },
];

// Розвиток експертів зірками (сумується по рівнях): ціна в банкнотах, −% часу продажу, +% виручки, +% досвіду товару, де працює експерт
const EXPERT_UP = [
  { cost: 100,  sell: 1, rev: 10, xp: 15 },
  { cost: 500,  sell: 2, rev: 15, xp: 20 },
  { cost: 1000, sell: 5, rev: 30, xp: 45 },
];
// Машини на дорозі: картинка, довжина (м), куди дивиться капот на картинці
const CARS = [
  { img: 'car_sedan', len: 4.7, face: 'L' }, { img: 'car_suv', len: 4.9, face: 'L' }, { img: 'car_pickup', len: 5.6, face: 'L' },
  { img: 'car_sport', len: 4.8, face: 'R' }, { img: 'car_van', len: 5.9, face: 'L' }, { img: 'car_truck', len: 8.5, face: 'L' },
  { img: 'car_police', len: 5.1, face: 'L' }, { img: 'car_fire', len: 9.5, face: 'L' }, { img: 'car_gt', len: 4.7, face: 'R' }, { img: 'car_bus', len: 12, face: 'L' },
];

// ===================================================================
//  Вертолітний майданчик: VIP-гість прилітає раз на кілька годин зі своїм замовленням
// ===================================================================
const HELI = {
  every: [2.5 * 3600, 4 * 3600],      // інтервал прильоту, сек
  wait: 20 * 60,                      // скільки вертоліт чекає, поки гравець прийме замовлення
  time: 60 * 60,                      // час на виконання замовлення
  tasks: [
    { id: 'unload', stat: 'unloaded', icon: 'boxes',      text: n => `Виклади ${fmt(n)} товарів`,       n: l => 10 + l * 3 },
    { id: 'stock',  stat: 'stocked',  icon: 'cart',       text: n => `Закупи ${fmt(n)} товарів`,        n: l => 10 + l * 3 },
    { id: 'cash',   stat: 'cashed',   icon: 'coins_heap', text: n => `Збери виручку ${fmt(n)} разів`,   n: l => 8 + l * 2 },
    { id: 'rides',  stat: 'rides',    icon: 'elev_1',     text: n => `Розвези ${fmt(n)} гостей`,         n: l => 20 + l * 5 },
  ],
  reward: l => ({ bucks: irnd(20, 60), coins: 800 * l, xp: 120 * l, keys: irnd(3, 8) }),
};
// Мільйонер на дорозі: зупиняється біля вежі, якщо швидко забрати — банкноти
const ROAD_EVENT = { every: [240, 480], wait: 25, bucks: [5, 15] };
// Щаслива година: 15 хв на день, продажі й доставка вдвічі швидші
const HAPPY_HOUR = { minutes: 15, speed: 2 };
// Сезонний пропуск: 30 рівнів, 100 очок сезону на рівень
const PASS = { levels: 100, sp: 100, premium: 3000,
  src: { daily: 20, vip: 30, coll: 15, maze: 40, lotto: 5, heli: 50, mil: 10, rides5: 1 } };

// Загальні новини від адміністрації для всіх гравців (новіші — зверху). Пізніше вантажитимуться з сервера.
const NEWS = [];

// Подарунки між гравцями (ціна в банкнотах) і власні смайлики гри
const GIFTS = [
  { id: 'g1', name: 'Подарунок', price: 20 },
  { id: 'g2', name: 'Букет троянд', price: 30 },
  { id: 'g3', name: 'Цукерки-серце', price: 25 },
  { id: 'g4', name: 'Ведмедик', price: 35 },
  { id: 'g5', name: 'Автомобіль', price: 500 },
  { id: 'g6', name: 'Вілла', price: 1000 },
  { id: 'g7', name: 'Скарб монет', price: 150 },
  { id: 'g8', name: 'Смартфон', price: 300 },
  { id: 'g9', name: 'Ноутбук', price: 350 },
  { id: 'g10', name: 'Острів', price: 2000 },
  { id: 'g11', name: 'Корона', price: 400 },
  { id: 'g12', name: 'Діамант', price: 250 },
  { id: 'g13', name: 'Годинник', price: 200 },
  { id: 'g14', name: 'Гаманець', price: 60 },
  { id: 'g15', name: 'Геймпад', price: 80 },
  { id: 'g16', name: 'Шампанське', price: 50 },
  { id: 'g17', name: 'Шоколад', price: 30 },
  { id: 'g18', name: 'Лист кохання', price: 10 },
  { id: 'g19', name: 'Крилате серце', price: 40 },
  { id: 'g20', name: 'Котик', price: 45 },
  { id: 'g21', name: 'Квіткова коробка', price: 40 },
  { id: 'g22', name: 'Магічний куб', price: 120 },
  { id: 'g23', name: 'Єдиноріг', price: 70 },
  { id: 'g24', name: 'Спорткар', price: 800 },
  { id: 'g25', name: 'Книги', price: 25 },
  { id: 'g26', name: 'Кава', price: 10 },
  { id: 'g27', name: 'Скриня скарбів', price: 180 },
  { id: 'g28', name: 'Свічки', price: 20 },
  { id: 'g29', name: 'Шопінг', price: 60 },
  { id: 'g31', name: 'Вазон', price: 15 },
  { id: 'g32', name: 'Скриня самоцвітів', price: 160 },
  { id: 'g33', name: 'Кришталева скриня', price: 220 },
  { id: 'g34', name: 'Соняшники', price: 25 },
  { id: 'g35', name: 'Сукня', price: 90 },
  { id: 'g36', name: 'Фотокамера', price: 150 },
  { id: 'g37', name: 'Торт', price: 35 },
  { id: 'g38', name: 'Снігова куля', price: 40 },
  { id: 'g39', name: 'Кубок', price: 100 },
  { id: 'g41', name: 'Ігрове крісло', price: 120 },
  { id: 'g42', name: 'Рюкзак', price: 50 },
  { id: 'g43', name: 'Кошик', price: 30 },
  { id: 'g44', name: 'Літак', price: 1500 },
  { id: 'g45', name: 'Рожевий подарунок', price: 25 },
  { id: 'g46', name: 'Паспорт', price: 70 },
  { id: 'g47', name: 'Яхта', price: 1200 },
  { id: 'g48', name: 'Повітряна куля', price: 300 },
  { id: 'g49', name: 'Каблучка', price: 600 },
  { id: 'g50', name: 'Чорний подарунок', price: 100 },
];
const EMOJI = ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'e10', 'e11', 'e12', 'e13', 'e14', 'e15', 'e16', 'e17', 'e18', 'e19', 'e20', 'e21', 'e22', 'e23', 'e24', 'e25', 'e26', 'e27', 'e28', 'e29', 'e30', 'e31', 'e33', 'e34', 'e35', 'e37', 'e38', 'e40', 'e41', 'e43', 'e44', 'e45', 'e47', 'e48', 'e50'];
// шляхи до картинок подарунків і смайликів (у вбудованій версії можуть бути вшиті в sprites.js)
const GSRC = id => (window.SPRITES && SPRITES[id]) || 'images/gifts/' + id + '.png';
const ESRC = k => (window.SPRITES && SPRITES[k]) || 'images/emoji/' + k + '.png';
