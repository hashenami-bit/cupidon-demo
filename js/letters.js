// The five letter styles, each written in English, Uzbek and Russian. {name} becomes her name.
export const LETTERS = [
  { id: 'tender', label: 'Tender' },
  { id: 'poetic', label: 'Poetic' },
  { id: 'playful', label: 'Playful' },
  { id: 'honest', label: 'Honest' },
  { id: 'classic', label: 'Classic' }
];

const TEXT = {
  en: {
    tender: {
      greeting: 'My dear {name},',
      body: [
        'I started this letter many times. Every version began the same way, with you, and every version ended the same way too: with me smiling at the screen like a fool.',
        'You have a way of making ordinary days feel like something worth remembering. One short message from you can change the colour of my whole afternoon. Your laugh is my favourite sound, and I have noticed that I talk about you even when nobody asked.',
        'So I wanted to do something a little more special than just asking. I wanted you to open this slowly, and to know that someone was thinking about you the whole time he made it.',
        'There is one question waiting for you on the next page. Take your time. I already know my answer.'
      ],
      closing: 'Yours, with all my heart,'
    },
    poetic: {
      greeting: '{name},',
      body: [
        'If the evening had a name, I think it would be yours. It arrives softly, it lights up the whole city, and it makes everything look a little more beautiful than it did during the day.',
        'I have tried to find the right words for what you mean to me, and every word I found was too small. So instead of one big word, here are some small truths: I think of you when I wake up. I save little things to tell you. I look for your name first.',
        'They say the best moments are the ones we share. I would like to share one with you: a quiet table, a warm evening, your eyes across from mine, and time that forgets to hurry.',
        'Turn the page, my dear. The evening is waiting for you to choose it.'
      ],
      closing: 'Always yours,'
    },
    playful: {
      greeting: 'Dear {name},',
      body: [
        'This is an official letter. Very official. It had a wax seal, so you know it is serious.',
        'After a long and careful investigation, I have reached a conclusion: you are the best part of my day, my week, and quite possibly my whole year. The evidence is overwhelming. I smile at my phone. I practise what to say to you. I once missed my stop because I was thinking about you.',
        'The only reasonable solution is a date. With you. Soon. There will be good food, there will be bad jokes (mine), and there will be at least one moment when I forget what I was saying because you are looking at me.',
        'Please press Next. The committee (me) is nervously waiting for your answer.'
      ],
      closing: 'Hopefully yours,'
    },
    honest: {
      greeting: '{name},',
      body: [
        'I will say it simply: you matter to me.',
        'Not in a small way. In the way where your happiness has become part of my own. In the way where I notice how you like your tea, what makes you laugh, and what you are not saying when you are tired.',
        'I did not want to just text you “let’s go somewhere”. You deserve more than that. You deserve an evening that was planned for you, from the first step to the last, by someone who wants you to feel special.',
        'So here it is: my invitation, made with my own hands. All you have to do is choose.'
      ],
      closing: 'With love,'
    },
    classic: {
      greeting: 'My dearest {name},',
      body: [
        'It is not often, in these fast days, that one receives a real letter. I hope this one finds you well, and I hope it makes you smile the way you make me smile: often, and without warning.',
        'I have long admired you. Your kindness, your grace, the light way you carry yourself through the world. Being near you has become one of the quiet joys of my life, and I would be honoured to have more of your time.',
        'Therefore, I kindly request the pleasure of your company, on a day and at an hour of your choosing. The details, as you will see, are entirely in your hands.'
      ],
      closing: 'Yours sincerely and devotedly,'
    }
  },

  uz: {
    tender: {
      greeting: 'Azizam {name},',
      body: [
        'Bu maktubni ko‘p marta boshladim. Har safar u bir xil boshlanardi — sen bilan. Har safar bir xil tugardi ham: ekranga qarab, boladek jilmayib o‘tirardim.',
        'Sen oddiy kunlarni eslab qolgulik kunlarga aylantira olasan. Sendan kelgan bitta qisqa xabar butun kunimni o‘zgartirib yuboradi. Kulging men uchun eng yoqimli ovoz. Hech kim so‘ramasa ham, sen haqingda gapirayotganimni sezib qoldim.',
        'Shuning uchun shunchaki so‘rash emas, biroz o‘zgacha narsa qilgim keldi. Bu maktubni shoshilmasdan ochishingni va uni tayyorlagan odam butun vaqt davomida seni o‘ylaganini bilishingni xohladim.',
        'Keyingi sahifada seni bitta savol kutyapti. Shoshilma. Men o‘z javobimni allaqachon bilaman.'
      ],
      closing: 'Butun qalbim bilan seniki,'
    },
    poetic: {
      greeting: '{name},',
      body: [
        'Agar oqshomning ismi bo‘lganida, menimcha, u sening isming bo‘lardi. U sekin kirib keladi, butun shaharni yoritadi va hamma narsani kunduzgidan ham go‘zalroq qilib ko‘rsatadi.',
        'Sen men uchun kimligingni aytadigan so‘zlarni izladim, lekin topganlarimning hammasi juda kichik bo‘lib chiqdi. Shuning uchun bitta katta so‘z o‘rniga bir nechta kichik haqiqat: uyg‘onganimda seni o‘ylayman. Senga aytib berish uchun mayda narsalarni saqlab qo‘yaman. Birinchi bo‘lib sening isming qidiraman.',
        'Aytishlaricha, eng go‘zal lahzalar — baham ko‘rilganlari. Men sen bilan shunday bir lahzani baham ko‘rmoqchiman: sokin stol, iliq oqshom, qarshimda sening ko‘zlaring va shoshishni unutgan vaqt.',
        'Sahifani o‘gir, azizam. Oqshom sening tanlovingni kutyapti.'
      ],
      closing: 'Doim seniki,'
    },
    playful: {
      greeting: 'Aziz {name},',
      body: [
        'Bu rasmiy maktub. Juda rasmiy. Unda muhr bor edi, demak, hammasi jiddiy.',
        'Uzoq va sinchkov tergovdan so‘ng bir xulosaga keldim: sen kunimning, haftamning va, ehtimol, butun yilimning eng yaxshi qismisan. Dalillar yetarli. Telefonga qarab jilmayaman. Senga nima deyishimni oldindan mashq qilaman. Bir marta seni o‘ylab, bekatimdan o‘tib ketganman.',
        'Yagona to‘g‘ri yechim — uchrashuv. Sen bilan. Tez orada. Mazali taomlar bo‘ladi, yomon hazillar (meniki) bo‘ladi va kamida bir marta menga qarab turganing uchun nima demoqchi bo‘lganimni unutib qo‘yaman.',
        '“Keyingi” tugmasini bos. Hay’at (ya’ni men) javobingni hayajon bilan kutyapti.'
      ],
      closing: 'Umid bilan, seniki'
    },
    honest: {
      greeting: '{name},',
      body: [
        'Oddiy qilib aytaman: sen men uchun muhimsan.',
        'Ozgina emas. Sening baxting mening baxtimning bir qismiga aylangan darajada. Qanday choy yoqtirishingni, seni nima kuldirishini va charchaganingda nimani aytmayotganingni sezadigan darajada.',
        'Senga shunchaki “qayergadir boraylik” deb yozgim kelmadi. Sen bundan ko‘prog‘iga loyiqsan. Sen o‘zingni alohida his qilishingni istagan odam tomonidan, birinchi qadamdan oxirgisigacha sen uchun rejalashtirilgan oqshomga loyiqsan.',
        'Mana, bu mening o‘z qo‘lim bilan tayyorlagan taklifim. Senga faqat tanlash qoldi.'
      ],
      closing: 'Muhabbat bilan,'
    },
    classic: {
      greeting: 'Qadrdonim {name},',
      body: [
        'Bugungi shoshqin kunlarda haqiqiy maktub olish kamdan-kam uchraydi. Umid qilamanki, bu maktub seni yaxshi kayfiyatda topadi va sen meni qanday jilmaytirsang, seni ham shunday jilmaytiradi — tez-tez va kutilmaganda.',
        'Uzoq vaqtdan beri sendan hayratlanaman: mehribonliging, nafisliging, hayotda o‘zingni yengil tutishing. Yoningda bo‘lish hayotimning sokin quvonchlaridan biriga aylandi va sen bilan ko‘proq vaqt o‘tkazish men uchun sharaf bo‘lardi.',
        'Shu bois, sen tanlagan kun va soatda menga hamroh bo‘lishingni iltimos qilaman. Ko‘rib turganingdek, barcha tafsilotlar butunlay sening qo‘lingda.'
      ],
      closing: 'Samimiy va sadoqat bilan seniki,'
    }
  },

  ru: {
    tender: {
      greeting: 'Моя дорогая {name},',
      body: [
        'Я начинал это письмо много раз. Каждый вариант начинался одинаково — с тебя. И каждый заканчивался тоже одинаково: я сидел и улыбался экрану, как мальчишка.',
        'Ты умеешь превращать обычные дни в такие, которые хочется запомнить. Одно короткое сообщение от тебя может изменить весь мой день. Твой смех — мой любимый звук, и я заметил, что говорю о тебе, даже когда никто не спрашивает.',
        'Поэтому мне захотелось не просто спросить, а сделать что-то особенное. Хотелось, чтобы ты открывала это письмо не спеша и знала: всё это время кто-то думал о тебе.',
        'На следующей странице тебя ждёт один вопрос. Не торопись. Свой ответ я уже знаю.'
      ],
      closing: 'Твой, всем сердцем,'
    },
    poetic: {
      greeting: '{name},',
      body: [
        'Если бы у вечера было имя, мне кажется, это было бы твоё. Он приходит тихо, зажигает огни города и делает всё вокруг чуть красивее, чем было днём.',
        'Я пытался подобрать слова о том, что ты для меня значишь, и все они оказывались слишком маленькими. Поэтому вместо одного большого слова — несколько маленьких правд: я думаю о тебе, когда просыпаюсь. Я берегу мелочи, чтобы рассказать их тебе. Первым делом я ищу твоё имя.',
        'Говорят, лучшие мгновения — те, которыми делишься. Я хочу разделить одно такое мгновение с тобой: тихий столик, тёплый вечер, твои глаза напротив и время, которое забудет спешить.',
        'Переверни страницу, моя дорогая. Вечер ждёт, когда ты его выберешь.'
      ],
      closing: 'Всегда твой,'
    },
    playful: {
      greeting: 'Дорогая {name},',
      body: [
        'Это официальное письмо. Очень официальное. На нём была сургучная печать, так что всё серьёзно.',
        'После долгого и тщательного расследования я пришёл к выводу: ты — лучшая часть моего дня, моей недели и, возможно, всего года. Улик предостаточно. Я улыбаюсь телефону. Я репетирую, что тебе сказать. Однажды я проехал свою остановку, потому что думал о тебе.',
        'Единственное разумное решение — свидание. С тобой. Скоро. Будет вкусная еда, будут плохие шутки (мои) и хотя бы один момент, когда я забуду, что хотел сказать, потому что ты на меня смотришь.',
        'Нажми «Далее». Комиссия (то есть я) с волнением ждёт твоего ответа.'
      ],
      closing: 'С надеждой, твой'
    },
    honest: {
      greeting: '{name},',
      body: [
        'Скажу просто: ты для меня важна.',
        'И не чуть-чуть. А так, что твоё счастье стало частью моего. Так, что я замечаю, какой чай ты любишь, что тебя смешит и о чём ты молчишь, когда устала.',
        'Мне не хотелось просто написать «давай куда-нибудь сходим». Ты заслуживаешь большего. Ты заслуживаешь вечера, который от первого шага до последнего продуман для тебя тем, кто хочет, чтобы ты почувствовала себя особенной.',
        'Так что вот оно — моё приглашение, сделанное своими руками. Тебе осталось только выбрать.'
      ],
      closing: 'С любовью,'
    },
    classic: {
      greeting: 'Моя драгоценная {name},',
      body: [
        'В наше быстрое время не так часто получаешь настоящее письмо. Надеюсь, оно застанет тебя в хорошем настроении и заставит улыбнуться так же, как улыбаюсь я благодаря тебе — часто и без предупреждения.',
        'Я давно восхищаюсь тобой: твоей добротой, твоим изяществом, той лёгкостью, с которой ты идёшь по жизни. Быть рядом с тобой стало одной из тихих радостей моей жизни, и для меня было бы честью проводить с тобой больше времени.',
        'Поэтому я прошу подарить мне твоё общество — в день и час, которые выберешь ты. Все детали, как ты увидишь, полностью в твоих руках.'
      ],
      closing: 'Искренне и преданно твой,'
    }
  }
};

// Changes per mode, by paragraph number. Every ready-made letter asks her out (a date, an evening, "turn the page").
// "Only the letter" (none): those paragraphs are rewritten so nothing asks her out — he only says what he feels.
// "Only the dish" (dish): still a date, only the Classic ending mentions choosing a day, so that one changes.
const CHANGES = {
  en: {
    none: {
      tender: {
        2: 'So I did not want to say it in a quick message. I wanted you to open this slowly, and to know that someone was thinking about you the whole time he wrote it.',
        3: 'I don’t need anything in return. I only wanted you to know all of this. If you feel like answering, write to me: I will be waiting, smiling at the screen again.'
      },
      poetic: {
        2: 'They say the best moments are the ones we share. Every moment I have shared with you is still with me: your voice, your smile, and the way time forgets to hurry when you are near.',
        3: 'There is nothing to choose this time, my dear. Only these words, written for you alone. If they reach you, let me know.'
      },
      playful: {
        2: 'The committee has therefore decided to inform you officially: you are wonderful. This decision is final and cannot be appealed. Bad jokes (mine) will continue as usual.',
        3: 'No buttons to press this time. The committee (me) simply awaits your reply in our chat. Nervously, of course.'
      },
      honest: {
        2: 'I did not want to say it in a quick text between other messages. You deserve more than that. You deserve words that were written slowly, just for you, by someone who wants you to feel special.',
        3: 'So here it is: my letter, written with my own hands. You don’t have to decide anything now. I just didn’t want to keep it to myself any longer.'
      },
      classic: {
        1: 'I have long admired you. Your kindness, your grace, the light way you carry yourself through the world. Being near you has become one of the quiet joys of my life, and I wanted you to know it.',
        2: 'I ask for nothing in return. I only wished you to know how dearly you are thought of. Whenever you wish to reply, a single word from you will be enough.'
      }
    },
    dish: { classic: { 2: 'Therefore I kindly request the pleasure of your company over a meal of your choosing. The day we shall settle together.' } }
  },
  uz: {
    none: {
      tender: {
        2: 'Shuning uchun buni shoshilinch xabarda aytgim kelmadi. Bu maktubni shoshilmasdan ochishingni va uni yozgan odam butun vaqt davomida seni o‘ylaganini bilishingni xohladim.',
        3: 'Buning evaziga hech narsa so‘ramayman. Faqat bularning barchasini bilishingni istadim. Agar javob berging kelsa, menga yoz: yana ekranga qarab jilmayib kutib turaman.'
      },
      poetic: {
        2: 'Aytishlaricha, eng go‘zal lahzalar — baham ko‘rilganlari. Sen bilan baham ko‘rgan har bir lahza hali ham men bilan: ovozing, tabassuming va yoningda bo‘lganimda shoshishni unutadigan vaqt.',
        3: 'Bu safar hech narsa tanlash shart emas, azizam. Faqat shu so‘zlar, faqat sen uchun yozilgan. Agar ular senga yetib borgan bo‘lsa, menga xabar ber.'
      },
      playful: {
        2: 'Shu sababli hay’at senga rasman ma’lum qilishga qaror qildi: sen ajoyibsan. Bu qaror qat’iy va shikoyat qilinmaydi. Yomon hazillar (meniki) odatdagidek davom etadi.',
        3: 'Bu safar hech qanday tugma bosish shart emas. Hay’at (ya’ni men) javobingni yozishmamizda kutadi. Albatta, hayajon bilan.'
      },
      honest: {
        2: 'Buni boshqa xabarlar orasida shoshilinch yozgim kelmadi. Sen bundan ko‘prog‘iga loyiqsan. Sen o‘zingni alohida his qilishingni istagan odam tomonidan sekin, faqat sen uchun yozilgan so‘zlarga loyiqsan.',
        3: 'Mana, bu mening o‘z qo‘lim bilan yozgan maktubim. Hozir hech narsani hal qilishing shart emas. Shunchaki buni ichimda saqlab yurishni boshqa istamadim.'
      },
      classic: {
        1: 'Uzoq vaqtdan beri sendan hayratlanaman: mehribonliging, nafisliging, hayotda o‘zingni yengil tutishing. Yoningda bo‘lish hayotimning sokin quvonchlaridan biriga aylandi va buni bilishingni istadim.',
        2: 'Buning evaziga hech narsa so‘ramayman. Faqat qanchalik qadrli ekaningni bilishingni istadim. Javob berishni xohlasang, sendan bitta so‘z kifoya.'
      }
    },
    dish: { classic: { 2: 'Shu bois, o‘zing tanlagan taom ustida menga hamroh bo‘lishingni iltimos qilaman. Kunni esa birga kelishib olamiz.' } }
  },
  ru: {
    none: {
      tender: {
        2: 'Поэтому мне не хотелось говорить это в коротком сообщении. Хотелось, чтобы ты открывала это письмо не спеша и знала: всё время, пока я его писал, я думал о тебе.',
        3: 'Мне ничего не нужно взамен. Я просто хотел, чтобы ты всё это знала. Если захочешь ответить, напиши мне: я буду ждать и снова улыбаться экрану.'
      },
      poetic: {
        2: 'Говорят, лучшие мгновения — те, которыми делишься. Каждое мгновение, которое я разделил с тобой, всё ещё со мной: твой голос, твоя улыбка и время, которое забывает спешить, когда ты рядом.',
        3: 'В этот раз ничего не нужно выбирать, моя дорогая. Только эти слова, написанные для тебя одной. Если они дошли до тебя, дай мне знать.'
      },
      playful: {
        2: 'Поэтому комиссия решила официально сообщить тебе: ты замечательная. Решение окончательное и обжалованию не подлежит. Плохие шутки (мои) продолжатся в обычном режиме.',
        3: 'На этот раз никаких кнопок. Комиссия (то есть я) ждёт твоего ответа в нашем чате. Разумеется, с волнением.'
      },
      honest: {
        2: 'Мне не хотелось писать это наспех, между другими сообщениями. Ты заслуживаешь большего. Ты заслуживаешь слов, написанных не спеша и только для тебя тем, кто хочет, чтобы ты почувствовала себя особенной.',
        3: 'Так что вот оно — моё письмо, написанное своими руками. Тебе не нужно ничего решать прямо сейчас. Мне просто больше не хотелось держать это в себе.'
      },
      classic: {
        1: 'Я давно восхищаюсь тобой: твоей добротой, твоим изяществом, той лёгкостью, с которой ты идёшь по жизни. Быть рядом с тобой стало одной из тихих радостей моей жизни, и мне хотелось, чтобы ты это знала.',
        2: 'Я ничего не прошу взамен. Мне лишь хотелось, чтобы ты знала, как ты дорога. Если захочешь ответить, мне будет достаточно одного твоего слова.'
      }
    },
    dish: { classic: { 2: 'Поэтому я прошу подарить мне твоё общество за ужином, который выберешь ты. О дне мы договоримся вместе.' } }
  }
};

// ask = what she does after reading: 'full' (dish + day), 'dish' (only the dish) or 'none' (only the letter).
export function renderLetter(lang, styleId, name, ask = 'full') {
  const byLang = TEXT[lang] || TEXT.en;
  const id = byLang[styleId] ? styleId : 'tender';
  const t = byLang[id];
  const fill = s => s.replaceAll('{name}', () => name);   // a function, so $ signs in a name stay plain text
  const changes = (CHANGES[lang] || CHANGES.en)[ask]?.[id] || {};
  const body = t.body.map((p, i) => fill(changes[i] ?? p));
  return { greeting: fill(t.greeting), body, closing: t.closing };
}

// Handwriting he can pick for the letter text (CSS classes .font-<id>, files in css/fonts.css). The first is the default.
// "Need an idea?" for the secret envelope, in the letter's language (she reads it).
export const SECRET_IDEAS = {
  en: [
    'I have been smiling since the moment you said yes.',
    'Wear something comfy. The evening has a little surprise in it.',
    'Ten things I like about you won’t fit here. I’ll tell you in person.',
    'Kaptar knows a secret: I practised what to say to you three times.'
  ],
  uz: [
    '“Ha” deganingdan beri jilmayishdan to‘xtamayapman.',
    'Qulay kiyim kiy. Kechada kichkina syurpriz bor.',
    'Sendagi menga yoqadigan o‘nta narsa bu yerga sig‘maydi. Uchrashganda aytaman.',
    'Kaptar bir sirni biladi: senga nima deyishni uch marta mashq qildim.'
  ],
  ru: [
    'С того момента, как ты сказала «да», я не перестаю улыбаться.',
    'Надень что-нибудь удобное. В этом вечере будет маленький сюрприз.',
    'Десять вещей, которые мне в тебе нравятся, здесь не поместятся. Расскажу при встрече.',
    'Каптар знает секрет: я три раза репетировал, что тебе скажу.'
  ]
};

// His choices for her page, used by both sides (the first one is the default; old letters have none).
export const THEMES = ['classic', 'garden', 'night', 'atlas', 'blossom'];
export const OPENINGS = ['seal', 'dove', 'ribbon', 'mist'];

export const FONTS = ['marck', 'caveat', 'neucha'];
export const fontOf = id => (FONTS.includes(id) ? id : FONTS[0]);   // old letters and unknown values → default

// His own words: his text becomes the body (plain text only — callers use textContent, never HTML).
// The greeting and the closing line come from the "tender" style so the letter still ends nicely.
// No length limit on purpose: the only limit is the size of the whole locked letter (about 1 MB with the photos).
export function renderOwn(lang, name, text) {
  const base = renderLetter(lang, 'tender', name);
  const body = String(text || '').split(/\r?\n+/).map(p => p.trim()).filter(Boolean);
  return { greeting: base.greeting, body, closing: base.closing };
}
