import { getSupabase } from '../services/supabaseClient.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { ensureSuperAdmin } from '../services/bootstrap.js';

const supabase = getSupabase();

export async function listProducts(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ products: data });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req, res, next) {
  try {
    const { name, description, price, stock } = req.body;
    if (!name || price == null) {
      return res.status(400).json({ error: 'name and price are required' });
    }
    const { error } = await supabase.from('products').insert({
      name,
      description,
      price,
      stock
    });
    if (error) throw error;
    res.status(201).json({ message: 'Product created' });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, price, stock } = req.body;
    const { error } = await supabase.from('products').update({
      name,
      description,
      price,
      stock
    }).eq('id', id);
    if (error) throw error;
    res.json({ message: 'Product updated' });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
}

export async function createStoreAdmin(req, res, next) {
  try {
    const { name, phone, address, location, agentId } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (agentId) {
      const { data: agent, error: agentError } = await supabase
        .from('users')
        .select('id')
        .eq('id', agentId)
        .maybeSingle();
      if (agentError) throw agentError;
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
    }
    const { error } = await supabase.from('stores').insert({
      name,
      phone,
      address,
      location,
      agent_id: agentId ?? null
    });
    if (error) throw error;
    res.status(201).json({ message: 'Store created' });
  } catch (error) {
    next(error);
  }
}

export async function listStores(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('*, users(name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ stores: data });
  } catch (error) {
    next(error);
  }
}

export async function updateStore(req, res, next) {
  try {
    const { id } = req.params;
    const { name, phone, address, location, agentId } = req.body;
    if (agentId) {
      const { data: agent, error: agentError } = await supabase
        .from('users')
        .select('id')
        .eq('id', agentId)
        .maybeSingle();
      if (agentError) throw agentError;
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
    }
    const { error } = await supabase
      .from('stores')
      .update({
        name,
        phone,
        address,
        location,
        agent_id: agentId ?? null
      })
      .eq('id', id);
    if (error) throw error;
    res.json({ message: 'Store updated' });
  } catch (error) {
    next(error);
  }
}

export async function deleteStore(req, res, next) {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('stores').delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'Store deleted' });
  } catch (error) {
    next(error);
  }
}

export async function listAgents(req, res, next) {
  try {
    const [{ data: agents, error: agentsError }, { data: orders, error: ordersError }] = await Promise.all([
      supabase
      .from('users')
      .select('id, telegram_id, name, phone, created_at'),
      supabase
        .from('orders')
        .select('user_id, quantity, products(price)')
    ]);

    if (agentsError) throw agentsError;
    if (ordersError) throw ordersError;

    const stats = orders.reduce((map, order) => {
      const entry = map.get(order.user_id) ?? { totalQuantity: 0, totalRevenue: 0 };
      entry.totalQuantity += order.quantity;
      entry.totalRevenue += order.quantity * (order.products?.price ?? 0);
      map.set(order.user_id, entry);
      return map;
    }, new Map());

    const enrichedAgents = agents.map((agent) => ({
      ...agent,
      stats: stats.get(agent.id) ?? { totalQuantity: 0, totalRevenue: 0 }
    }));

    res.json({ agents: enrichedAgents });
  } catch (error) {
    next(error);
  }
}

export async function addAdmin(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    const passwordHash = await hashPassword(password);
    const { error } = await supabase.from('admins').insert({
      username,
      password_hash: passwordHash
    });
    if (error) throw error;
    res.status(201).json({ message: 'Admin created' });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { username } = req.user;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }
    const { data: admin, error: selectError } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .maybeSingle();
    if (selectError) throw selectError;
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    const isValid = await comparePassword(currentPassword, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const { error } = await supabase
      .from('admins')
      .update({ password_hash: await hashPassword(newPassword) })
      .eq('id', admin.id);
    if (error) throw error;
    res.json({ message: 'Password updated' });
  } catch (error) {
    next(error);
  }
}

export async function resetDatabase(req, res, next) {
  try {
    const tables = ['orders', 'stores', 'products', 'users', 'admins'];

    for (const table of tables) {
      const { error } = await supabase.from(table).delete().neq('id', null);
      if (error) throw error;
    }

    await ensureSuperAdmin();

    res.json({ message: 'All data cleared' });
  } catch (error) {
    next(error);
  }
}
