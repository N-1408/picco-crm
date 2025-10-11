import TelegramBot from 'node-telegram-bot-api';
import { createClient } from '@supabase/supabase-js';

const token = process.env.TELEGRAM_BOT_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const webAppUrl = process.env.WEBAPP_URL || 'https://picco-crm.vercel.app';
const agentWebAppPath = process.env.AGENT_WEBAPP_PATH || '/frontend/agent';
const adminWebAppPath = process.env.ADMIN_WEBAPP_PATH || '/frontend/admin';

const supabase = createClient(supabaseUrl, supabaseKey);
const bot = new TelegramBot(token, { polling: false });
const sessions = new Map();

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
    if (telegramId) {
      url.searchParams.set('tg_id', telegramId);
    }
    return url.toString();
  } catch (error) {
    return base;
  }
}

function getWebAppKeyboard(telegramId) {
  return {
    inline_keyboard: [[
      { text: 'Agent paneli', web_app: { url: buildWebAppUrl(agentWebAppPath, telegramId) } },
      { text: 'Admin paneli', web_app: { url: buildWebAppUrl(adminWebAppPath, telegramId) } }
    ]]
  };
}

async function registerAgent(telegramId, name, phone) {
  const numericTelegramId = Number(telegramId);
  if (!Number.isFinite(numericTelegramId)) {
    throw new Error('Telegram ID raqam bo\'lishi kerak.');
  }
  let alreadyRegistered = false;
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', numericTelegramId)
    .maybeSingle();
  if (existing) alreadyRegistered = true;
  if (alreadyRegistered) return { alreadyRegistered: true };
  await supabase.from('users').insert({ telegram_id: numericTelegramId, name, phone, role: 'agent' });
  return { alreadyRegistered: false };
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).send('PICCO telegram bot is running');
    return;
  }
  if (req.method === 'POST') {
    try {
      await bot.processUpdate(req.body);
      res.status(200).end();
    } catch (error) {
      res.status(500).send(error.message);
    }
  } else {
    res.status(405).send('Method Not Allowed');
  }
}

// Bot webhook setup (run once in production)
if (process.env.VERCEL_URL) {
  bot.setWebHook(`https://${process.env.VERCEL_URL}/api/bot`);
}

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  sessions.set(chatId, { stage: 'awaiting_name', telegramId });
  await bot.sendMessage(chatId, 'Salom! PICCO agentlar paneliga xush kelibsiz.\nIltimos, to\'liq ism-familiyangizni kiriting.');
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const session = sessions.get(chatId);
  if (!session || msg.text?.startsWith('/')) return;
  if (session.stage === 'awaiting_name' && msg.text) {
    session.name = msg.text.trim();
    session.stage = 'awaiting_contact';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, 'Rahmat! Endi telefon raqamingizni yuboring.', {
      reply_markup: {
        keyboard: [[{ text: 'Telefon raqamni yuborish', request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
  }
});

bot.on('contact', async (msg) => {
  const chatId = msg.chat.id;
  const session = sessions.get(chatId);
  if (!session || session.stage !== 'awaiting_contact') return;
  try {
    const contactPhone = msg.contact.phone_number.startsWith('+')
      ? msg.contact.phone_number
      : `+${msg.contact.phone_number}`;
    const result = await registerAgent(session.telegramId, session.name, contactPhone);
    await bot.sendMessage(
      chatId,
      result.alreadyRegistered
        ? 'Siz avval ro\'yxatdan o\'tgansiz. PICCO agent paneli siz uchun ochiq.'
        : 'Tabriklaymiz! Siz muvaffaqiyatli ro\'yxatdan o\'tdingiz va endi PICCO kompaniyasining rasmiy agentisiz.',
      { reply_markup: { remove_keyboard: true } }
    );
    await bot.sendMessage(
      chatId,
      'Panelni tanlang:',
      { reply_markup: getWebAppKeyboard(session.telegramId) }
    );
  } catch (error) {
    await bot.sendMessage(chatId, `X ${error.message}`);
  } finally {
    sessions.delete(chatId);
  }
});
