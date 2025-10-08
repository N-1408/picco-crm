import { getSupabase } from '../services/supabaseClient.js';

const supabase = getSupabase();

export async function createOrder(req, res, next) {
  try {
    const { userId, productId, storeId, quantity } = req.body;
    if (!userId || !productId || !storeId || !quantity) {
      return res.status(400).json({ error: 'userId, productId, storeId, quantity are required' });
    }
    if (quantity <= 0) {
      return res.status(400).json({ error: 'quantity must be greater than zero' });
    }

    const [{ data: user, error: userError }, { data: product, error: productError }, { data: store, error: storeError }] = await Promise.all([
      supabase.from('users').select('id').eq('id', userId).maybeSingle(),
      supabase.from('products').select('id, stock').eq('id', productId).maybeSingle(),
      supabase.from('stores').select('id, agent_id').eq('id', storeId).maybeSingle()
    ]);

    if (userError) throw userError;
    if (productError) throw productError;
    if (storeError) throw storeError;

    if (!user) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    if (store.agent_id && store.agent_id !== userId) {
      return res.status(403).json({ error: 'Store is assigned to another agent' });
    }

    const { error } = await supabase.from('orders').insert({
      user_id: userId,
      product_id: productId,
      store_id: storeId,
      quantity
    });

    if (error) throw error;

    if (product.stock != null) {
      const { error: stockError } = await supabase
        .from('products')
        .update({ stock: Math.max(product.stock - quantity, 0) })
        .eq('id', productId);
      if (stockError) throw stockError;
    }

    return res.status(201).json({ message: 'Order created successfully' });
  } catch (error) {
    return next(error);
  }
}

export async function getAgentOrders(req, res, next) {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('orders')
      .select('id, quantity, created_at, products(name, price), stores(name, address)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ orders: data });
  } catch (error) {
    return next(error);
  }
}

export async function getAgentStores(req, res, next) {
  try {
    const { agentId } = req.params;
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('agent_id', agentId);

    if (error) throw error;

    return res.json({ stores: data });
  } catch (error) {
    return next(error);
  }
}

export async function listProducts(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, description, stock')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.json({ products: data });
  } catch (error) {
    return next(error);
  }
}

export async function createStore(req, res, next) {
  try {
    const { name, phone, address, location, agentId } = req.body;
    if (!name || !agentId) {
      return res.status(400).json({ error: 'name and agentId are required' });
    }

    const { data: agent, error: agentError } = await supabase
      .from('users')
      .select('id')
      .eq('id', agentId)
      .maybeSingle();
    if (agentError) throw agentError;
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { error } = await supabase.from('stores').insert({
      name,
      phone,
      address,
      location,
      agent_id: agentId
    });

    if (error) throw error;

    return res.status(201).json({ message: 'Store created' });
  } catch (error) {
    return next(error);
  }
}

export async function getAgentStats(req, res, next) {
  try {
    const { userId } = req.params;

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, quantity, created_at, products(name, price), stores(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totals = orders.reduce(
      (acc, order) => {
        acc.totalQuantity += order.quantity;
        acc.totalRevenue += order.quantity * (order.products?.price ?? 0);
        return acc;
      },
      { totalQuantity: 0, totalRevenue: 0 }
    );

    const monthlyMap = new Map();
    orders.forEach((order) => {
      const created = new Date(order.created_at);
      const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
      const revenue = order.quantity * (order.products?.price ?? 0);
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + revenue);
    });

    const monthly = Array.from(monthlyMap.entries())
      .map(([month, totalRevenue]) => ({ month, totalRevenue }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return res.json({
      totals,
      monthly,
      recentOrders: orders.slice(0, 10),
      orders
    });
  } catch (error) {
    return next(error);
  }
}
