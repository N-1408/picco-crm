import { Parser as Json2csvParser } from 'json2csv';
import { getSupabase } from '../services/supabaseClient.js';

const supabase = getSupabase();

function formatMonth(dateString) {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export async function getAdminStats(req, res, next) {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('user_id, quantity, created_at, products(name, price), users(name)');
    if (error) throw error;

    const agentSalesMap = new Map();
    const productMap = new Map();
    const monthMap = new Map();

    for (const order of orders) {
      const revenue = order.quantity * (order.products?.price ?? 0);
      if (order.users) {
        const current = agentSalesMap.get(order.user_id) ?? { agentName: order.users.name, totalQuantity: 0, totalRevenue: 0 };
        current.totalQuantity += order.quantity;
        current.totalRevenue += revenue;
        agentSalesMap.set(order.user_id, current);
      }

      if (order.products) {
        const current = productMap.get(order.products.name) ?? { productName: order.products.name, totalQuantity: 0, totalRevenue: 0 };
        current.totalQuantity += order.quantity;
        current.totalRevenue += revenue;
        productMap.set(order.products.name, current);
      }

      const monthKey = formatMonth(order.created_at);
      const monthCurrent = monthMap.get(monthKey) ?? { month: monthKey, totalQuantity: 0, totalRevenue: 0 };
      monthCurrent.totalQuantity += order.quantity;
      monthCurrent.totalRevenue += revenue;
      monthMap.set(monthKey, monthCurrent);
    }

    res.json({
      agentSales: Array.from(agentSalesMap.values()),
      productShare: Array.from(productMap.values()),
      monthlySales: Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month))
    });
  } catch (error) {
    next(error);
  }
}

export async function exportStats(req, res, next) {
  try {
    const format = req.query.format ?? 'excel';
    const { data, error } = await supabase
      .from('orders')
      .select('created_at, quantity, products(name, price), users(name)');
    if (error) throw error;

    if (format === 'pdf') {
      res.json({ message: 'PDF export is represented as JSON payload in prototype', orders: data });
    } else {
      const parser = new Json2csvParser({
        fields: [
          { label: 'Date', value: 'created_at' },
          { label: 'Quantity', value: 'quantity' },
          { label: 'Product', value: 'products.name' },
          { label: 'Unit Price', value: 'products.price' },
          { label: 'Agent', value: 'users.name' }
        ]
      });
      const csv = parser.parse(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=stats.csv');
      res.send(csv);
    }
  } catch (error) {
    next(error);
  }
}

export async function getAgentStats(req, res, next) {
  try {
    const { userId } = req.params;

    const { data: orders, error } = await supabase
      .from('orders')
      .select('quantity, created_at, products(name, price)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalQuantity = orders.reduce((sum, order) => sum + order.quantity, 0);
    const totalRevenue = orders.reduce((sum, order) => sum + order.quantity * (order.products?.price ?? 0), 0);

    const monthly = new Map();
    for (const order of orders) {
      const month = formatMonth(order.created_at);
      const current = monthly.get(month) ?? { month, totalQuantity: 0, totalRevenue: 0 };
      const revenue = order.quantity * (order.products?.price ?? 0);
      current.totalQuantity += order.quantity;
      current.totalRevenue += revenue;
      monthly.set(month, current);
    }

    res.json({
      totals: {
        totalQuantity,
        totalRevenue
      },
      monthly: Array.from(monthly.values()).sort((a, b) => a.month.localeCompare(b.month)),
      recentOrders: orders.slice(0, 10)
    });
  } catch (error) {
    next(error);
  }
}
