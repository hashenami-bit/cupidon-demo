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

export function renderLetter(lang, styleId, name) {
  const byLang = TEXT[lang] || TEXT.en;
  const t = byLang[styleId] || byLang.tender;
  const fill = s => s.replaceAll('{name}', name);
  return { greeting: fill(t.greeting), body: t.body.map(fill), closing: t.closing };
}
