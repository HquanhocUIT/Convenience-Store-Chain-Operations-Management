// backend/routes/api.js
const express  = require('express');
const router   = express.Router();
const { authenticate } = require('../middleware/auth');
const supabase = require('../data/supabase');

// GET /api/stores — dropdown
router.get('/stores', async (req, res) => {
  const { data, error } = await supabase.from('stores').select('id, name').eq('is_active', true).order('id');
  if (error) return res.status(500).json({ message: error.message });
  res.json({ stores: data });
});

// GET /api/dashboard — KPI thực từ Supabase
router.get('/dashboard', authenticate, async (req, res) => {
  const now        = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenAgo   = new Date(now); sevenAgo.setDate(now.getDate() - 6);

  const [storesRes, productsRes, todayOrdersRes, weeklyRes, invRes] = await Promise.all([
    supabase.from('stores').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', todayStart).eq('status', 'completed'),
    supabase.from('orders').select('total_amount, created_at').gte('created_at', sevenAgo.toISOString()).eq('status', 'completed'),
    // low stock: inventory rows where current_stock <= stock_threshold của product
    supabase.from('inventory').select('product_id, current_stock, products(stock_threshold)'),
  ]);

  // Tính low stock (tổng stock mỗi product < threshold)
  const stockMap = {};
  for (const row of invRes.data || []) {
    stockMap[row.product_id] = (stockMap[row.product_id] || 0) + row.current_stock;
  }
  const thresholdMap = {};
  for (const row of invRes.data || []) {
    if (row.products) thresholdMap[row.product_id] = row.products.stock_threshold;
  }
  const lowStockCount = Object.keys(stockMap).filter(pid => stockMap[pid] <= (thresholdMap[pid] || 10)).length;

  // Build weekly_sales
  const days  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dayMap = {};
  for (let i = 6; i >= 0; i--) {
    const d   = new Date(now); d.setDate(now.getDate() - i);
    const key = d.toISOString().split('T')[0];
    dayMap[key] = { date: days[d.getDay()], revenue: 0 };
  }
  for (const o of weeklyRes.data || []) {
    const key = o.created_at.split('T')[0];
    if (dayMap[key]) dayMap[key].revenue += Number(o.total_amount);
  }

  res.json({
    totalStores:        storesRes.count        || 0,
    totalProducts:      productsRes.count      || 0,
    lowStockCount,
    today_orders_count: todayOrdersRes.count   || 0,
    weekly_sales:       Object.values(dayMap),
  });
});

// GET /api/me
router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

module.exports = router;
