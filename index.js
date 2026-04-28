const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const fs = require('fs');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is running');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Web server started on ${PORT}`);
});

const groupId = "120363404677216164@g.us";

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

let data = {};
if (fs.existsSync('data.json')) {
  data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
} else {
  data = {
    "جوو": 0,
    "مظن": 3,
    "سيف": 18,
    "طاهر": 0,
    "حوده": 0
  };
}

function saveData() {
  fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
}

function formatData(title) {
  let text = `${title}\n\n`;
  for (const name in data) {
    text += `${name} ${data[name]}\n`;
  }
  return text;
}

function getNameAndValue(parts) {
  const name = parts[1];
  const value = parseInt(parts[2], 10);
  return { name, value };
}

client.on('qr', qr => {
  console.log(qr);
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Bot is ready!');
});

client.on('message', async (message) => {
  const msg = message.body.trim();

  if (msg === 'مساعدة') {
    return message.reply(
`🤖 تعليمات البوت:

📊 عرض العداد:
عداد

➕ إضافة شخص:
ضيف الاسم الرقم
مثال: ضيف احمد 5

✏️ تعديل رقم شخص:
خلي الاسم الرقم
مثال: خلي احمد 10

❌ تصفير شخص:
الاسم وقع
مثال: احمد وقع

🗑️ حذف شخص نهائيًا:
امسح الاسم
مثال: امسح احمد

⏰ كل يوم الساعة 12 هيزود +1 لكل شخص ويبعت النتيجة في الجروب`
    );
  }

  if (msg === 'عداد') {
    return message.reply(formatData('📊 الحالة الحالية:'));
  }

  if (msg.startsWith('ضيف ')) {
    const { name, value } = getNameAndValue(msg.split(' '));

    if (!name || Number.isNaN(value)) {
      return message.reply('❌ استخدم: ضيف الاسم الرقم');
    }

    data[name] = value;
    saveData();
    return message.reply(`✅ تم إضافة ${name} = ${value}`);
  }

  if (msg.startsWith('خلي ')) {
    const { name, value } = getNameAndValue(msg.split(' '));

    if (!name || Number.isNaN(value)) {
      return message.reply('❌ استخدم: خلي الاسم الرقم');
    }

    if (data[name] === undefined) {
      return message.reply('❌ الاسم مش موجود');
    }

    data[name] = value;
    saveData();
    return message.reply(`✏️ تم تعديل ${name} = ${value}`);
  }

  if (msg.startsWith('امسح ')) {
    const name = msg.split(' ')[1];

    if (!name || data[name] === undefined) {
      return message.reply('❌ الاسم مش موجود');
    }

    delete data[name];
    saveData();
    return message.reply(`🗑️ تم حذف ${name}`);
  }

  if (msg.endsWith('وقع')) {
    const name = msg.replace(/\s*وقع$/, '').trim();

    if (!name || data[name] === undefined) {
      return message.reply('❌ الاسم مش موجود');
    }

    data[name] = 0;
    saveData();
    return message.reply(`${name} رجع صفر ❌`);
  }
});

cron.schedule(
  '0 0 * * *',
  async () => {
    for (const name in data) {
      data[name] += 1;
    }

    saveData();

    try {
      const chat = await client.getChatById(groupId);
      await chat.sendMessage(formatData('📊 الحالة اليومية:'));
      console.log('Daily message sent');
    } catch (err) {
      console.error('Failed to send daily message:', err);
    }
  },
  { timezone: 'Africa/Cairo' }
);

client.initialize();