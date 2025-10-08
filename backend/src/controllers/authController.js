import { getSupabase } from '../services/supabaseClient.js';
import { comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';

const supabase = getSupabase();

export async function registerAgent(req, res, next) {
  try {
    const { telegramId, name, phone } = req.body;
    if (!telegramId || !name || !phone) {
      return res.status(400).json({ error: 'telegramId, name and phone are required' });
    }

    const numericTelegramId = Number(telegramId);
    if (!Number.isFinite(numericTelegramId)) {
      return res.status(400).json({ error: 'telegramId must be a number' });
    }

    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', numericTelegramId)
      .maybeSingle();

    if (selectError) {
      selectError.status = selectError.status ?? 500;
      return next(selectError);
    }

    if (existingUser) {
      return res.status(200).json({ message: 'User already registered' });
    }

    const { error: insertError } = await supabase.from('users').insert({
      telegram_id: numericTelegramId,
      name,
      phone,
      role: 'agent'
    });

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(200).json({ message: 'User already registered' });
      }
      if (insertError.code === 'PGRST301' || insertError.status === 401) {
        return res.status(500).json({ error: 'Supabase service role key is invalid or missing required insert permissions.' });
      }
      insertError.status = insertError.status ?? 500;
      return next(insertError);
    }

    return res.status(201).json({ message: 'Agent registered successfully' });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('registerAgent error:', error);
    return next(error);
  }
}

export async function loginAdmin(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const { data: admin, error: selectError } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (selectError) throw selectError;

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await comparePassword(password, admin.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken({
      id: admin.id,
      username: admin.username,
      role: admin.username.toLowerCase() === 'admin' ? 'super-admin' : 'admin'
    });

    return res.json({ token });
  } catch (error) {
    return next(error);
  }
}

export async function getAgentByTelegram(req, res, next) {
  try {
    const { telegramId } = req.params;
    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId is required' });
    }

    const numericTelegramId = Number(telegramId);
    if (!Number.isFinite(numericTelegramId)) {
      return res.status(400).json({ error: 'telegramId must be a number' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, phone, role, created_at')
      .eq('telegram_id', numericTelegramId)
      .maybeSingle();

    if (error) throw error;
    if (!user) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    return res.json({ user });
  } catch (error) {
    return next(error);
  }
}
