// Everything she sees, in three languages. {name}, {from}, {hint} etc. are filled in.
// His pages' words are in i18n-app.js.
import { APP } from './i18n-app.js';

export const LANGS = [
  { id: 'uz', label: 'O‘zbekcha' },
  { id: 'ru', label: 'Русский' },
  { id: 'en', label: 'English' }
];
export const validLang = l => LANGS.some(x => x.id === l);

// Before the letter is loaded we don't know its language, so guess from the browser.
export function guessLang() {
  const n = (navigator.language || 'en').toLowerCase();
  return n.startsWith('ru') ? 'ru' : n.startsWith('uz') ? 'uz' : 'en';
}

export const S = {
  en: {
    loading: 'Opening…',
    tooFast: 'Too many tries in a short time. Wait a minute and try again.',
    pictureHint: 'Your invitation picture. If it didn’t download, press and hold it (or right-click) and choose Save image.',
    close: 'Close',
    notReadyTitle: 'Not sent yet',
    notReadyText: 'This letter isn’t ready yet. Ask the person who wrote it to finish sending it.',
    wrongLeft: 'That code doesn’t open this letter. {n} tries left before a short pause.',
    paused: 'Too many wrong codes. Try again in {m} min.',
    lockedHard: 'This letter is locked after too many wrong codes. Ask him to unlock it.',
    netFail: 'Couldn’t reach the server. Check your internet connection and try again.',
    alreadyAnswered: 'You already answered this letter.',
    checking: 'Checking…',
    missingTitle: 'Letter not found',
    missingText: 'This link is incomplete or the letter was deleted. Ask the person who sent it to send the link again.',
    needHttps: 'This page needs a secure (https) link to open the letter. Ask for the link again.',
    pinTitle: 'A letter for you',
    pinLabel: 'Type the 4-digit code to open it.',
    hint: 'Hint: {hint}',
    to: 'To',
    pressMe: 'Press me',
    openHint: 'Break the seal to read it.',
    next: 'Next',
    dear: 'Dear {name},',
    dishesQ: 'What would you like to eat on our date?',
    dishesTap: 'Tap the one you like most.',
    chosen: 'chosen',
    withLoveShort: 'with love',
    dateKicker: 'Lovely choice',
    dateQ: 'When shall we go?',
    dateHelp: 'Choose a day, then a time.',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    time: 'Time',
    dayFirst: 'Choose a day first.',
    daytime: 'Daytime',
    evening: 'Evening',
    noDay: 'No day chosen yet',
    dayNoTime: '{day}, now choose a time',
    dayTime: '{day} at {time}',
    done: 'Done',
    sending: 'Sending…',
    sendFail: 'Your answer didn’t send. Check your internet connection and press Done again.',
    changeDish: 'Change the dish',
    invTitle: 'Invitation',
    invLine: 'you are invited to a date on',
    invLineNoDate: 'you are invited to a date',
    daySoon: 'We will pick the day together.',
    ourPhoto: 'A photo of us',
    readEnd: '{from} wrote this just for you. You can answer him in your chat.',
    photoZoom: 'View photo full screen',
    photoPrev: 'Previous photo',
    photoNext: 'Next photo',
    digitN: 'Digit {n}',
    timePassed: 'That time has just passed. Please pick another one.',
    linkIncomplete: 'This link is not complete. Ask him to send you the whole link again.',
    when: '{weekday} at {time}',
    atPlace: 'at {place}',
    takeYou: 'I’ll take you there myself.',
    pickUp: 'I’ll pick you up and we’ll go together.',
    openMaps: 'Open in Maps',
    sign: 'With love, {from}',
    save: 'Save invitation',
    making: 'Making the picture…',
    saveFail: 'The picture didn’t save. Take a screenshot of this page instead.',
    finalNote: '{from} already has your answer. Save the invitation to keep it.',
    askQ: 'Will you go on a date with me?',
    askYes: 'Yes', askNo: 'No',
    no1: 'Oops! Kaptar flew off with “No”.',
    no2: 'He did it again. Kaptar really hopes for a yes.',
    no3: 'Kaptar said no to “No”! Yes in {n}…',
    yesTitle: 'Really? Yes?!',
    yesText: 'Kaptar can hardly believe it. Now let’s plan our date.',
    yesGo: 'Yes, really!',
    doveHint: 'Kaptar brought you a letter. Tap him to take it.', doveBtn: 'Take the letter from Kaptar',
    ribbonHint: 'Untie the silk ribbon to open it.', ribbonBtn: 'Untie the ribbon',
    mistHint: 'The window is misty. Wipe it with your finger.', mistSkip: 'Open without wiping',
    secretOpen: 'A secret envelope for you. Tap to open it.',
    stepOf: 'Step {n} of {total}',
    countTitle: 'Until our date',
    countNow: 'It’s time. See you there!',
    cdDays: 'days', cdHours: 'hours', cdMinutes: 'minutes', cdSeconds: 'seconds',
    addCal: 'Add it to your calendar',
    calGoogle: 'Google Calendar',
    calFile: 'iPhone and others (.ics)',
    calEvent: 'Date with {from}',
    calFileFail: 'If the calendar file didn’t download, use Google Calendar or save the invitation instead.',
    reread: 'Read the letter again',
    share: 'I wrote you a letter 💌',
    footNav: 'Site links',
    footNote: 'Every letter is locked on the writer’s phone before it is sent. We cannot read it.',
    footPrivacy: 'Privacy policy',
    footSupport: 'Support in Telegram',
    footWrite: 'Write your own letter',
    footHome: 'Maktubim home page',
    privacyTitle: 'Privacy policy — Maktubim'
  },
  uz: {
    loading: 'Ochilmoqda…',
    tooFast: 'Qisqa vaqtda juda ko‘p urinish. Bir daqiqa kutib, qayta urinib ko‘r.',
    pictureHint: 'Taklifnoma rasmi. Agar yuklanmagan bo‘lsa, rasmni bosib turing (yoki sichqonchaning o‘ng tugmasi) va “Rasmni saqlash”ni tanlang.',
    close: 'Yopish',
    notReadyTitle: 'Hali yuborilmagan',
    notReadyText: 'Bu maktub hali tayyor emas. Uni yozgan odamdan yuborishni yakunlashini so‘ra.',
    wrongLeft: 'Bu kod maktubni ochmadi. Qisqa tanaffusgacha {n} ta urinish qoldi.',
    paused: 'Juda ko‘p noto‘g‘ri kod. {m} daqiqadan so‘ng qayta urinib ko‘r.',
    lockedHard: 'Juda ko‘p noto‘g‘ri kod kiritilgani uchun maktub qulflandi. Undan qulfni ochishni so‘ra.',
    netFail: 'Serverga ulanib bo‘lmadi. Internetni tekshirib, qayta urinib ko‘r.',
    alreadyAnswered: 'Sen bu maktubga allaqachon javob bergansan.',
    checking: 'Tekshirilmoqda…',
    missingTitle: 'Maktub topilmadi',
    missingText: 'Havola to‘liq emas yoki maktub o‘chirilgan. Yuborgan odamdan havolani qayta so‘ra.',
    needHttps: 'Maktubni ochish uchun xavfsiz (https) havola kerak. Havolani qayta so‘ra.',
    pinTitle: 'Sen uchun maktub',
    pinLabel: 'Ochish uchun 4 xonali kodni kirit.',
    hint: 'Ishora: {hint}',
    to: 'Kimga',
    pressMe: 'Meni bos',
    openHint: 'O‘qish uchun muhrni sindir.',
    next: 'Keyingi',
    dear: 'Aziz {name},',
    dishesQ: 'Uchrashuvimizda nima yeyishni xohlaysan?',
    dishesTap: 'Eng yoqqanini tanla.',
    chosen: 'tanlandi',
    withLoveShort: 'sevgi bilan',
    dateKicker: 'Ajoyib tanlov',
    dateQ: 'Qachon boramiz?',
    dateHelp: 'Avval kunni, keyin vaqtni tanla.',
    prevMonth: 'Oldingi oy',
    nextMonth: 'Keyingi oy',
    time: 'Vaqt',
    dayFirst: 'Avval kunni tanla.',
    daytime: 'Kunduzi',
    evening: 'Kechqurun',
    noDay: 'Kun hali tanlanmagan',
    dayNoTime: '{day}, endi vaqtni tanla',
    dayTime: '{day}, soat {time}',
    done: 'Tayyor',
    sending: 'Yuborilmoqda…',
    sendFail: 'Javobing yuborilmadi. Internetni tekshirib, “Tayyor”ni yana bos.',
    changeDish: 'Taomni o‘zgartirish',
    invTitle: 'Taklifnoma',
    invLine: 'seni uchrashuvga taklif qilaman',
    invLineNoDate: 'seni uchrashuvga taklif qilaman',
    daySoon: 'Kunni birga tanlaymiz.',
    ourPhoto: 'Ikkimizning suratimiz',
    readEnd: '{from} buni faqat sen uchun yozdi. Javobni unga yozishmada aytishing mumkin.',
    photoZoom: 'Suratni to‘liq ekranda ko‘rish',
    photoPrev: 'Oldingi surat',
    photoNext: 'Keyingi surat',
    digitN: '{n}-raqam',
    timePassed: 'Bu vaqt o‘tib ketdi. Iltimos, boshqasini tanla.',
    linkIncomplete: 'Bu havola to‘liq emas. Undan havolani butunligicha qayta yuborishini so‘ra.',
    when: '{weekday}, soat {time}',
    atPlace: 'Joy: {place}',
    takeYou: 'Seni o‘zim olib boraman.',
    pickUp: 'Seni o‘zim olib ketaman, birga boramiz.',
    openMaps: 'Xaritada ochish',
    sign: 'Sevgi bilan, {from}',
    save: 'Taklifnomani saqlash',
    making: 'Rasm tayyorlanmoqda…',
    saveFail: 'Rasm saqlanmadi. Buning o‘rniga ekranni suratga ol.',
    finalNote: '{from} javobingni oldi. Taklifnomani esdalik uchun saqlab qo‘y.',
    askQ: 'Men bilan uchrashuvga borasanmi?',
    askYes: 'Ha', askNo: 'Yo‘q',
    no1: 'Voy! Kaptar “Yo‘q”ni olib uchib ketdi.',
    no2: 'Yana olib qochdi. Kaptar “Ha” deyishingni juda kutyapti.',
    no3: 'Kaptar “Yo‘q”ga yo‘q dedi! {n} soniyadan keyin “Ha”…',
    yesTitle: 'Rostdanmi? Ha?!',
    yesText: 'Kaptar o‘z ko‘zlariga ishonmayapti. Endi uchrashuvni rejalashtiramiz.',
    yesGo: 'Ha, rostdan!',
    doveHint: 'Kaptar senga maktub olib keldi. Olish uchun unga bos.', doveBtn: 'Maktubni Kaptardan olish',
    ribbonHint: 'Ochish uchun ipak tasmani yech.', ribbonBtn: 'Tasmani yechish',
    mistHint: 'Oyna terlab qolgan. Barmog‘ing bilan art.', mistSkip: 'Artmasdan ochish',
    secretOpen: 'Senga sirli konvert. Ochish uchun bos.',
    stepOf: '{n}-qadam, jami {total}',
    countTitle: 'Uchrashuvimizgacha',
    countNow: 'Vaqti keldi. Ko‘rishguncha!',
    cdDays: 'kun', cdHours: 'soat', cdMinutes: 'daqiqa', cdSeconds: 'soniya',
    addCal: 'Kalendaringga qo‘shib qo‘y',
    calGoogle: 'Google Kalendar',
    calFile: 'iPhone va boshqalar (.ics)',
    calEvent: '{from} bilan uchrashuv',
    calFileFail: 'Kalendar fayli yuklanmagan bo‘lsa, Google Kalendardan foydalan yoki taklifnomani saqlab qo‘y.',
    reread: 'Maktubni qayta o‘qish',
    share: 'Senga maktub yozdim 💌',
    footNav: 'Sayt havolalari',
    footNote: 'Har bir maktub yuborilishidan oldin yozgan odamning telefonida qulflanadi. Biz uni o‘qiy olmaymiz.',
    footPrivacy: 'Maxfiylik siyosati',
    footSupport: 'Telegramda yordam',
    footWrite: 'O‘z maktubingizni yozing',
    footHome: 'Maktubim bosh sahifasi',
    privacyTitle: 'Maxfiylik siyosati — Maktubim'
  },
  ru: {
    loading: 'Открываю…',
    tooFast: 'Слишком много попыток за короткое время. Подожди минуту и попробуй снова.',
    pictureHint: 'Картинка приглашения. Если она не скачалась, нажмите на неё и удерживайте (или правый клик) и выберите «Сохранить изображение».',
    close: 'Закрыть',
    notReadyTitle: 'Ещё не отправлено',
    notReadyText: 'Это письмо ещё не готово. Попроси автора закончить отправку.',
    wrongLeft: 'Этот код не открывает письмо. До короткой паузы осталось попыток: {n}.',
    paused: 'Слишком много неверных кодов. Попробуй через {m} мин.',
    lockedHard: 'Письмо заблокировано из-за слишком многих неверных кодов. Попроси его разблокировать.',
    netFail: 'Не удалось связаться с сервером. Проверь интернет и попробуй снова.',
    alreadyAnswered: 'Ты уже ответила на это письмо.',
    checking: 'Проверяю…',
    missingTitle: 'Письмо не найдено',
    missingText: 'Ссылка неполная или письмо удалено. Попроси отправителя прислать ссылку ещё раз.',
    needHttps: 'Чтобы открыть письмо, нужна защищённая (https) ссылка. Попроси прислать её ещё раз.',
    pinTitle: 'Письмо для тебя',
    pinLabel: 'Введи 4-значный код, чтобы открыть его.',
    hint: 'Подсказка: {hint}',
    to: 'Кому',
    pressMe: 'Нажми меня',
    openHint: 'Сломай печать, чтобы прочитать.',
    next: 'Далее',
    dear: 'Дорогая {name},',
    dishesQ: 'Что бы ты хотела попробовать на нашем свидании?',
    dishesTap: 'Выбери то, что нравится больше всего.',
    chosen: 'выбрано',
    withLoveShort: 'с любовью',
    dateKicker: 'Прекрасный выбор',
    dateQ: 'Когда пойдём?',
    dateHelp: 'Выбери день, потом время.',
    prevMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
    time: 'Время',
    dayFirst: 'Сначала выбери день.',
    daytime: 'Днём',
    evening: 'Вечером',
    noDay: 'День ещё не выбран',
    dayNoTime: '{day}, теперь выбери время',
    dayTime: '{day} в {time}',
    done: 'Готово',
    sending: 'Отправляю…',
    sendFail: 'Ответ не отправился. Проверь интернет и нажми «Готово» ещё раз.',
    changeDish: 'Изменить блюдо',
    invTitle: 'Приглашение',
    invLine: 'приглашаю тебя на свидание',
    invLineNoDate: 'приглашаю тебя на свидание',
    daySoon: 'День выберем вместе.',
    ourPhoto: 'Наше фото',
    readEnd: '{from} написал это только для тебя. Ответить ему можно в вашем чате.',
    photoZoom: 'Открыть фото на весь экран',
    photoPrev: 'Предыдущее фото',
    photoNext: 'Следующее фото',
    digitN: 'Цифра {n}',
    timePassed: 'Это время уже прошло. Выбери, пожалуйста, другое.',
    linkIncomplete: 'Ссылка неполная. Попроси его прислать всю ссылку ещё раз.',
    when: '{weekday}, в {time}',
    atPlace: 'Место: {place}',
    takeYou: 'Я сам тебя туда отвезу.',
    pickUp: 'Я заеду за тобой, и мы поедем вместе.',
    openMaps: 'Открыть на карте',
    sign: 'С любовью, {from}',
    save: 'Сохранить приглашение',
    making: 'Готовлю картинку…',
    saveFail: 'Картинка не сохранилась. Сделай скриншот этой страницы.',
    finalNote: '{from} уже получил твой ответ. Сохрани приглашение на память.',
    askQ: 'Пойдёшь со мной на свидание?',
    askYes: 'Да', askNo: 'Нет',
    no1: 'Ой! Каптар унёс «Нет».',
    no2: 'Опять унёс. Каптар очень надеется на «Да».',
    no3: 'Каптар сказал «нет» слову «Нет»! «Да» через {n}…',
    yesTitle: 'Правда? Да?!',
    yesText: 'Каптар не верит своему счастью. Теперь спланируем свидание.',
    yesGo: 'Да, правда!',
    doveHint: 'Каптар принёс тебе письмо. Нажми на него, чтобы взять.', doveBtn: 'Взять письмо у Каптара',
    ribbonHint: 'Развяжи шёлковую ленту, чтобы открыть.', ribbonBtn: 'Развязать ленту',
    mistHint: 'Окно запотело. Протри его пальцем.', mistSkip: 'Открыть без протирания',
    secretOpen: 'Для тебя секретный конверт. Нажми, чтобы открыть.',
    stepOf: 'Шаг {n} из {total}',
    countTitle: 'До нашего свидания',
    countNow: 'Время пришло. До встречи!',
    cdDays: 'дней', cdHours: 'часов', cdMinutes: 'минут', cdSeconds: 'секунд',
    addCal: 'Добавь в свой календарь',
    calGoogle: 'Google Календарь',
    calFile: 'iPhone и другие (.ics)',
    calEvent: 'Свидание ({from})',
    calFileFail: 'Если файл календаря не скачался, используй Google Календарь или сохрани приглашение.',
    reread: 'Перечитать письмо',
    share: 'Я написал тебе письмо 💌',
    footNav: 'Ссылки сайта',
    footNote: 'Каждое письмо запирается на телефоне автора ещё до отправки. Мы не можем его прочитать.',
    footPrivacy: 'Политика конфиденциальности',
    footSupport: 'Поддержка в Telegram',
    footWrite: 'Написать своё письмо',
    footHome: 'Главная страница Maktubim',
    privacyTitle: 'Политика конфиденциальности — Maktubim'
  }
};

const DATES = {
  en: {
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    short: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
  },
  uz: {
    months: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'],
    days: ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'],
    short: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']
  },
  ru: {
    months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
    days: ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'],
    short: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  }
};

export function tr(lang, key, vars = {}) {
  const s = S[lang]?.[key] ?? APP[lang]?.[key] ?? S.en[key] ?? APP.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}
export const dates = lang => DATES[lang] || DATES.en;
export const dayName = (lang, date) => dates(lang).days[(date.getDay() + 6) % 7];
export const monthYear = (lang, date) => `${dates(lang).months[date.getMonth()]} ${date.getFullYear()}`;

// Fills every [data-t] (text), [data-t-ph] (placeholder) and [data-t-label] (aria-label) inside root.
export function applyI18n(lang, root = document) {
  root.querySelectorAll('[data-t]').forEach(e => (e.textContent = tr(lang, e.dataset.t)));
  root.querySelectorAll('[data-t-ph]').forEach(e => (e.placeholder = tr(lang, e.dataset.tPh)));
  root.querySelectorAll('[data-t-label]').forEach(e => e.setAttribute('aria-label', tr(lang, e.dataset.tLabel)));
}

// Interface language remembered in this browser (separate keys for his and her pages).
export function savedLang(storeKey) {
  try { const l = localStorage.getItem(storeKey); return validLang(l) ? l : null; } catch { return null; }
}
export function saveLang(storeKey, lang) {
  try { localStorage.setItem(storeKey, lang); } catch { /* private mode */ }
}

// The small UZ / RU / EN switch. onChange(lang) runs when a new language is picked.
export function langSwitch(box, current, onChange) {
  box.classList.add('lang-switch');
  box.setAttribute('role', 'group');
  box.innerHTML = '';
  const buttons = LANGS.map(l => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = l.id.toUpperCase();
    b.title = l.label;
    b.lang = l.id;
    b.addEventListener('click', () => { set(l.id); onChange(l.id); });
    box.append(b);
    return b;
  });
  const set = lang => {
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.lang === lang)));
    box.setAttribute('aria-label', tr(lang, 'uiLang'));
  };
  set(current);
  return { set };
}
