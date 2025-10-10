import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import express from 'express';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env' });

const token = process.env.TELEGRAM_BOT_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const webAppUrl = process.env.WEBAPP_URL || 'https://picco-mini-app.example.com';
const agentWebAppPath = process.env.AGENT_WEBAPP_PATH || '/pages/agent/dashboard.html';
const adminWebAppPath = process.env.ADMIN_WEBAPP_PATH || '/pages/admin/login.html';
const webhookUrlEnv = process.env.TELEGRAM_WEBHOOK_URL;
const webhookPathEnv = process.env.TELEGRAM_WEBHOOK_PATH;
const usePolling = process.env.USE_POLLING === 'true' || (!webhookUrlEnv && !webhookPathEnv);
const PORT = process.env.PORT || 8080;

if (!token) {
  throw new Error('Missing TELEGRAM_BOT_TOKEN in environment');
}

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const bot = new TelegramBot(token, { polling: false });
const sessions = new Map();

const keyboards = {
  contact: {
    keyboard: [[{ text: 'Telefon raqamni yuborish', request_contact: true }]],
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

  const { data: existing, error: selectError } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', numericTelegramId)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message ?? 'Agentni tekshirishda xatolik yuz berdi.');
  }

  if (existing) {
    return { alreadyRegistered: true };
  }

  const { error: insertError } = await supabase.from('users').insert({
    telegram_id: numericTelegramId,
    name,
    phone,
    role: 'agent'
  });

  if (insertError) {
    if (insertError.code === '23505') {
      return { alreadyRegistered: true };
    }
    throw new Error(insertError.message ?? 'Agentni ro\'yxatga qo\'shishda xatolik yuz berdi.');
  }

  return { alreadyRegistered: false };
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
    const message = error.message ?? 'Xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko\'ring.';
    // eslint-disable-next-line no-console
    console.error('Agent registration failed:', error);
    await bot.sendMessage(chatId, `X ${message}`);
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

async function startBot() {
  const app = express();
  app.use(express.json());

  app.get('/', (req, res) => {
    res.type('text/plain').send('PICCO telegram bot is running');
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', mode: usePolling ? 'polling' : 'webhook' });
  });

  if (usePolling) {
    await bot.deleteWebHook({ drop_pending_updates: false });
    await bot.startPolling();
    // eslint-disable-next-line no-console
    console.log('Bot started in polling mode');
  } else {
    const defaultPath = `/webhook/${token}`;
    let webhookPath = webhookPathEnv || defaultPath;
    let baseWebhookUrl = process.env.WEBHOOK_BASE_URL || process.env.RENDER_EXTERNAL_URL || '';

    if (webhookUrlEnv) {
      try {
        const parsed = new URL(webhookUrlEnv);
        baseWebhookUrl = `${parsed.protocol}//${parsed.host}`;
        if (!webhookPathEnv) {
          webhookPath = parsed.pathname && parsed.pathname !== '/'
            ? parsed.pathname
            : defaultPath;
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Invalid TELEGRAM_WEBHOOK_URL provided, falling back to base URL variables');
      }
    }

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

    try {
      await bot.setWebHook(fullWebhookUrl, { drop_pending_updates: true });

      app.post(normalizedPath, (req, res) => {
        bot.processUpdate(req.body);
        res.sendStatus(200);
      });

      // eslint-disable-next-line no-console
      console.log(`Webhook set to ${fullWebhookUrl}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to set webhook, falling back to polling mode:', error.message);
      await bot.deleteWebHook({ drop_pending_updates: false });
      await bot.startPolling();
      // eslint-disable-next-line no-console
      console.log('Bot started in polling mode (fallback)');
    }
  }

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Bot service listening on port ${PORT}`);
  });
}

startBot().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start bot:', error);
  process.exit(1);
});
