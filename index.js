const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const fs = require('fs');
const express = require('express');

const app = express();
app.get('/', (req, res) => {
  res.send("Bot is running");
});
app.listen(3000, () => {
  console.log("Web server started");
});

const client = new Client({
  authStrategy: new LocalAuth()
});

const groupId = "120363404677216164@g.us";

// تحميل البيانات
let data = {};
if (fs.existsSync('data.json')) {
  data = JSON.parse(fs.readFileSync('data.json'));
} else {
  data = {
    "جوو": 0,
    "مظن": 3,
    "سيف": 18,
    "طاهر": 0,
    "حوده": 0
  };
}

// حفظ البيانات
function saveData() {
  fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
}

// فورمات
function formatData(title) {
  let text = `${title}\n\n`;
  for (let name in data) {
    text += `${name} ${data[name]}\n`;
  }
  return text;
}

// QR
client.on('qr', qr => {
  console.log(qr); // مهم للسيرفر
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Bot is ready!');
});

// استقبال الرسائل
client.on('message', async message => {
  const msg = message.body.trim();

  // مساعدة
  if (msg === "مساعدة") {
    return message.reply(
`🤖 تعليمات البوت:

📊 عرض:
عداد

➕ إضافة:
ضيف احمد 5

✏️ تعديل:
خلي احمد 10

❌ تصفير:
احمد وقع

🗑️ حذف:
امسح احمد

⏰ كل يوم الساعة 12 بيزود +1 لكل شخص`
    );
  }

  // عرض
  if (msg === "عداد") {
    return message.reply(formatData("📊 الحالة الحالية:"));
  }

  // إضافة
  if (msg.startsWith("ضيف ")) {
    const parts = msg.split(" ");
    const name = parts[1];
    const value = parseInt(parts[2]);

    if (!name || isNaN(value)) {
      return message.reply("❌ استخدم: ضيف الاسم الرقم");
    }

    data[name] = value;
    saveData();

    return message.reply(`✅ تم إضافة ${name} = ${value}`);
  }

  // حذف
  if (msg.startsWith("امسح ")) {
    const name = msg.split(" ")[1];

    if (data[name] === undefined) {
      return message.reply("❌ الاسم مش موجود");
    }

    delete data[name];
    saveData();

    return message.reply(`🗑️ تم حذف ${name}`);
  }

  // تعديل
  if (msg.startsWith("خلي ")) {
    const parts = msg.split(" ");
    const name = parts[1];
    const value = parseInt(parts[2]);

    if (!name || isNaN(value)) {
      return message.reply("❌ استخدم: خلي الاسم الرقم");
    }

    if (data[name] === undefined) {
      return message.reply("❌ الاسم مش موجود");
    }

    data[name] = value;
    saveData();

    return message.reply(`✏️ تم تعديل ${name} = ${value}`);
  }

  // وقع
  if (msg.includes("وقع")) {
    const name = msg.split(" ")[0];

    if (data[name] !== undefined) {
      data[name] = 0;
      saveData();

      return message.reply(`${name} رجع صفر ❌`);
    }
  }
});

// كل يوم الساعة 12
cron.schedule('0 0 * * *', async () => {
  for (let name in data) {
    data[name]++;
  }

  saveData();

  const chat = await client.getChatById(groupId);
  chat.sendMessage(formatData("📊 الحالة اليومية:"));

  console.log("Daily message sent");
});

client.initialize();