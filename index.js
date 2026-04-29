const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const express = require('express');

process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', err => {
  console.error('UNHANDLED REJECTION:', err);
});

const app = express();
const PORT = process.env.PORT || 3000;

// ================= CONFIG =================
const groupId = "120363404677216164@g.us";

const adminList = [
  "236408589541460@lid",
  "163457898942709@lid",
  "53812064706671@lid"
];

// ================= FILES =================
const publicDir = path.join(__dirname, 'public');
const qrPath = path.join(publicDir, 'qr.png');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// ================= WEB =================
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>WhatsApp Bot</title></head>
      <body style="font-family: Arial; padding: 20px;">
        <h2>Bot is running ✅</h2>
        <p>QR status:</p>
        <p><a href="/qr" target="_blank">Open QR page</a></p>
      </body>
    </html>
  `);
});

app.get('/qr', (req, res) => {
  if (!fs.existsSync(qrPath)) {
    return res.status(404).send('QR not ready yet');
  }

  res.send(`
    <html>
      <head><title>WhatsApp QR</title></head>
      <body style="font-family: Arial; padding: 20px; text-align: center;">
        <h2>Scan this QR from WhatsApp</h2>
        <img src="/qr.png?ts=${Date.now()}" style="max-width: 420px; width: 100%; border: 1px solid #ddd;" />
      </body>
    </html>
  `);
});

app.get('/qr.png', (req, res) => {
  if (!fs.existsSync(qrPath)) {
    return res.status(404).send('QR not ready yet');
  }

  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(qrPath);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server started on port ${PORT}`);
});

// ================= CLIENT =================
const isProduction = process.env.NODE_ENV === 'production';
const chromePath = process.env.CHROME_PATH;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: isProduction ? chromePath : undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  }
});

// ================= DATA =================
let data = {};
try {
  if (fs.existsSync('data.json')) {
    data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
    console.log('Data loaded:', data);
  } else {
    data = {
      "جوو": 60,
      "طاهر": 0,
      "حوده": 0,
      "ابوطيز": 0
    };
    saveData();
    console.log('Default data created');
  }
} catch (err) {
  console.error('DATA ERROR:', err);
  data = {};
}

// ================= FUNCTIONS =================
function saveData() {
  fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
}

function getToday() {
  return new Intl.DateTimeFormat('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Africa/Cairo'
  }).format(new Date());
}

function formatData(title) {
  let text = `${title}\n📅 ${getToday()}\n`;
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);

  for (const [name, value] of sorted) {
    text += `• ${name}: ${value}\n`;
  }

  return text.trim();
}

function getSenderId(message) {
  return message.author || message.from;
}

function isAdmin(message) {
  const sender = getSenderId(message);
  const result = adminList.includes(sender);
  console.log('Sender:', sender, '| Is admin:', result);
  return result;
}

// ================= EVENTS =================
client.on('qr', async (qr) => {
  try {
    await QRCode.toFile(qrPath, qr, {
      type: 'png',
      width: 420,
      margin: 2,
      errorCorrectionLevel: 'M'
    });

    console.log('📱 QR image generated.');

    const baseUrl =
      process.env.RAILWAY_STATIC_URL ||
      (process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : null);

    if (baseUrl) {
      console.log('🌐 Open this link:', baseUrl + '/qr');
    } else {
      console.log(`🌐 Local: http://localhost:${PORT}/qr`);
    }

  } catch (err) {
    console.error('❌ QR ERROR:', err);
  }
});

client.on('ready', async () => {
  console.log('✅ Bot is ready!');

  try {
    const test = await client.sendMessage(groupId, '✅ البوت اشتغل');
    console.log('✅ Startup test sent:', test?.id?._serialized || 'unknown');
  } catch (err) {
    console.error('❌ Startup test failed:', err);
  }
});

client.on('auth_failure', msg => {
  console.error('❌ Auth failure:', msg);
});

client.on('disconnected', reason => {
  console.warn('⚠️ Disconnected:', reason);
});

client.on('message', async (message) => {
  try {
    if (message.from !== groupId) return;

    const raw = message.body;
    if (!raw) return;

    const msg = raw.replace(/@\d+/g, '').trim();
    const msgLower = msg.toLowerCase();

    console.log('📩 MSG from', getSenderId(message), ':', msg);

    const send = async (text) => {
      try {
        const sent = await client.sendMessage(message.from, text);
        console.log('✅ Sent to group:', sent?.id?._serialized || message.from);
      } catch (err) {
        console.error('❌ Send error:', err);
      }
    };

    // ===== أوامر للكل =====
    if (msgLower.includes('عداد')) {
      return send(formatData('📊 الحالة الحالية:'));
    }

    if (msgLower.includes('مساعدة')) {
      const adminHelp = isAdmin(message)
        ? `

🔐 أوامر الأدمن:
➕ ضيف [الاسم] [الرقم] — إضافة شخص جديد
✏️ خلي [الاسم] [الرقم] — تعديل سكور شخص
🗑️ امسح [الاسم] — حذف شخص
↩️ [الاسم] وقع — رجوع لصفر`
        : '';

      return send(`🤖 أوامر البوت:

📊 عداد — عرض الأرقام الحالية
🆘 مساعدة — عرض الأوامر${adminHelp}`);
    }

    // ===== أوامر الأدمن بس =====
    if (msgLower.startsWith('ضيف ')) {
      if (!isAdmin(message)) {
        return send('🚫 الأمر ده للأدمن بس!');
      }

      const parts = msg.split(' ').filter(Boolean);
      const name = parts[1];
      const value = parseInt(parts[2], 10);

      if (!name || isNaN(value)) {
        return send('❌ استخدم: ضيف [الاسم] [الرقم]\nمثال: ضيف أحمد 5');
      }

      data[name] = value;
      saveData();
      return send(`✅ تم إضافة ${name} برقم ${value}`);
    }

    if (msgLower.startsWith('خلي ')) {
      if (!isAdmin(message)) {
        return send('🚫 الأمر ده للأدمن بس!');
      }

      const parts = msg.split(' ').filter(Boolean);
      const name = parts[1];
      const value = parseInt(parts[2], 10);

      if (!name || isNaN(value)) {
        return send('❌ استخدم: خلي [الاسم] [الرقم]\nمثال: خلي أحمد 10');
      }

      if (data[name] === undefined) {
        return send(`❌ "${name}" مش موجود في القايمة`);
      }

      data[name] = value;
      saveData();
      return send(`✏️ تم تعديل ${name} → ${value}`);
    }

    if (msgLower.startsWith('امسح ')) {
      if (!isAdmin(message)) {
        return send('🚫 الأمر ده للأدمن بس!');
      }

      const name = msg.split(' ').slice(1).join(' ').trim();

      if (!name || data[name] === undefined) {
        return send(`❌ "${name}" مش موجود في القايمة`);
      }

      delete data[name];
      saveData();
      return send(`🗑️ تم حذف ${name}`);
    }

    if (msg.endsWith('وقع')) {
      if (!isAdmin(message)) {
        return send('🚫 الأمر ده للأدمن بس!');
      }

      const name = msg.replace(/وقع$/, '').trim();

      if (!name || data[name] === undefined) {
        return send(`❌ "${name}" مش موجود في القايمة`);
      }

      data[name] = 0;
      saveData();
      return send(`↩️ ${name} رجع لصفر`);
    }

  } catch (err) {
    console.error('❌ MESSAGE ERROR:', err);
  }
});

// ================= DAILY CRON =================
cron.schedule(
  '0 0 * * *',
  async () => {
    try {
      console.log('⏰ Running daily cron...');

      for (const name in data) {
        data[name]++;
      }

      saveData();

      await client.sendMessage(groupId, formatData('📊 الحالة اليومية:'));

      console.log('✅ Daily message sent');
    } catch (err) {
      console.error('❌ CRON ERROR:', err);
    }
  },
  { timezone: 'Africa/Cairo' }
);

// ================= START =================
console.log('🚀 Starting bot...');
client.initialize();