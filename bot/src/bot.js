import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config({ path: '.env' });

const token = process.env.TELEGRAM_BOT_TOKEN;
const backendBaseUrl = process.env.BACKEND_BASE_URL || 'http://localhost:4000/api';
const webAppUrl = process.env.WEBAPP_URL || 'https://picco-mini-app.example.com';
const agentWebAppPath = process.env.AGENT_WEBAPP_PATH || '/pages/agent/dashboard.html';
const adminWebAppPath = process.env.ADMIN_WEBAPP_PATH || '/pages/admin/login.html';
const webhookUrlEnv = process.env.TELEGRAM_WEBHOOK_URL;
const webhookPathEnv = process.env.TELEGRAM_WEBHOOK_PATH;
const usePolling = process.env.USE_POLLING === 'true' || (!webhookUrlEnv && !webhookPathEnv);

if (!token) {
  throw new Error('Missing TELEGRAM_BOT_TOKEN in environment');
}

const bot = new TelegramBot(token, { polling: false });
const sessions = new Map();

const keyboards = {
  contact: {
    keyboard: [[{ text: '📞 Telefon raqamni yuborish', request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true
  }
};

function joinUrl(base, path) {
  if (!path) return base;
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function buildWebAppUrl(path, telegramId) {
  const base = joinUrl(webAppUrl, path);
  try {
    const url = new URL(base);
    url.searchParams.set('api', backendBaseUrl);
    if (telegramId) {
      url.searchParams.set('tg_id', telegramId);
    }
    return url.toString();
  } catch (error) {
    return base;
  }
}

function getWebAppKeyboard(telegramId) {
  const agentUrl = buildWebAppUrl(agentWebAppPath, telegramId);
  const adminUrl = buildWebAppUrl(adminWebAppPath, telegramId);
  return {
    inline_keyboard: [[
      { text: '🧾 Agent Paneli', web_app: { url: agentUrl } },
      { text: '🛠 Admin Paneli', web_app: { url: adminUrl } }
    ]]
  };
}

async function registerAgent(telegramId, name, phone) {
  const url = `${backendBaseUrl}/auth/register`;
  return axios.post(url, {
    telegramId,
    name,
    phone
  });
}

function resetSession(chatId) {
  sessions.delete(chatId);
}

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  sessions.set(chatId, { stage: 'awaiting_name', telegramId });

  const welcome = [
    'Salom! PICCO agentlar paneliga xush kelibsiz.',
    'Iltimos, to\'liq ism-familiyangizni kiriting.'
  ].join('\n');

  await bot.sendMessage(chatId, welcome);
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const session = sessions.get(chatId);

  // ignore if no active session or message is contact (handled separately)
  if (!session || msg.text?.startsWith('/')) {
    return;
  }

  if (session.stage === 'awaiting_name' && msg.text) {
    session.name = msg.text.trim();
    session.stage = 'awaiting_contact';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, 'Rahmat! Endi telefon raqamingizni yuboring.', {
      reply_markup: keyboards.contact
    });
  }
});

bot.on('contact', async (msg) => {
  const chatId = msg.chat.id;
  const session = sessions.get(chatId);

  if (!session || session.stage !== 'awaiting_contact') {
    return;
  }

  try {
    const contactPhone = msg.contact.phone_number.startsWith('+')
      ? msg.contact.phone_number
      : `+${msg.contact.phone_number}`;

    await registerAgent(session.telegramId, session.name, contactPhone);

    await bot.sendMessage(
      chatId,
      'Tabriklaymiz 🎉! Siz muvaffaqiyatli ro\'yxatdan o\'tdingiz va endi PICCO kompaniyasining rasmiy agentisiz.',
      { reply_markup: { remove_keyboard: true } }
    );

    await bot.sendMessage(
      chatId,
      'Panelni tanlang:',
      { reply_markup: getWebAppKeyboard(session.telegramId) }
    );
  } catch (error) {
    const message = error.response?.data?.error ?? 'Xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko\'ring.';
    await bot.sendMessage(chatId, `❌ ${message}`);
  } finally {
    resetSession(chatId);
  }
});

bot.on('callback_query', async (query) => {
  if (query.data === 'help') {
    await bot.answerCallbackQuery(query.id, { text: 'Yordam uchun support@picco.uz ga yozing.' });
  }
});

bot.on('polling_error', (error) => {
  // eslint-disable-next-line no-console
  console.error('Polling error:', error.message);
});

bot.on('webhook_error', (error) => {
  // eslint-disable-next-line no-console
  console.error('Webhook error:', error.message);
});

async function start() {
  if (usePolling) {
    await bot.startPolling();
    // eslint-disable-next-line no-console
    console.log('Bot started in polling mode');
    return;
  }

  const app = express();
  app.use(express.json());

  const defaultPath = `/webhook/${token}`;
  const webhookPath = webhookPathEnv || defaultPath;
  const baseWebhookUrl = webhookUrlEnv
    || process.env.WEBHOOK_BASE_URL
    || process.env.RENDER_EXTERNAL_URL
    || '';

  if (!baseWebhookUrl) {
    throw new Error('Missing TELEGRAM_WEBHOOK_URL or WEBHOOK_BASE_URL environment variable');
  }

  const normalizedBase = baseWebhookUrl.endsWith('/')
    ? baseWebhookUrl.slice(0, -1)
    : baseWebhookUrl;
  const normalizedPath = webhookPath.startsWith('/')
    ? webhookPath
    : `/${webhookPath}`;
  const fullWebhookUrl = `${normalizedBase}${normalizedPath}`;

  await bot.setWebHook(fullWebhookUrl);

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post(normalizedPath, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Webhook server listening on port ${PORT}`);
  });
}

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start bot:', error);
  process.exit(1);
});
