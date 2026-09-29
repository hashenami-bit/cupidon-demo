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

const S = {
  en: {
    loading: 'Opening…',
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
    reread: 'Read the letter again',
    share: 'I wrote you a letter 💌'
  },
  uz: {
    loading: 'Ochilmoqda…',
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
    reread: 'Maktubni qayta o‘qish',
    share: 'Senga maktub yozdim 💌'
  },
  ru: {
    loading: 'Открываю…',
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
    reread: 'Перечитать письмо',
    share: 'Я написал тебе письмо 💌'
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
