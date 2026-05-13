// backend/routes/inventory.js
const express  = require('express');
const router   = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const supabase = require('../data/supabase');

function computeStatus(current_stock, threshold) {
  if (current_stock <= 0)         return 'critical';
  if (current_stock <= threshold) return 'low';
  return 'ok';
}

// GET /api/products?store_id=1
router.get('/products', authenticate, async (req, res) => {
  const { data: products, error: pErr } = await supabase
    .from('products').select('*').order('id');
  if (pErr) return res.status(500).json({ message: pErr.message });

  // Lấy inventory — nếu có store_id thì lọc theo store đó
  let invQuery = supabase.from('inventory').select('product_id, current_stock');
  if (req.query.store_id) {
    invQuery = invQuery.eq('store_id', parseInt(req.query.store_id));
  }
  const { data: inv, error: iErr } = await invQuery;
  if (iErr) return res.status(500).json({ message: iErr.message });

  const stockMap = {};
  for (const row of inv || []) {
    stockMap[row.product_id] = (stockMap[row.product_id] || 0) + row.current_stock;
  }

  const result = products.map(p => ({
    ...p,
    current_stock: stockMap[p.id] || 0,
    threshold: p.stock_threshold,
    status: computeStatus(stockMap[p.id] || 0, p.stock_threshold),
  }));
  res.json(result);
});

// GET /api/products/:id
router.get('/products/:id', authenticate, async (req, res) => {
  const { data: p, error } = await supabase
    .from('products').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ message: 'Product not found' });

  const { data: inv } = await supabase
    .from('inventory').select('current_stock').eq('product_id', req.params.id);
  const total = (inv || []).reduce((s, r) => s + r.current_stock, 0);
  res.json({ ...p, current_stock: total, threshold: p.stock_threshold, status: computeStatus(total, p.stock_threshold) });
});

// POST /api/products
router.post('/products', authenticate, requireAdmin, async (req, res) => {
  const { name, category, price, current_stock, threshold } = req.body;
  if (!name) return res.status(400).json({ message: 'Thiếu tên sản phẩm' });

  const { data: p, error } = await supabase
    .from('products')
    .insert([{ name, category: category || 'Uncategorized', price: parseInt(price) || 0, stock_threshold: parseInt(threshold) || 10 }])
    .select().single();
  if (error) return res.status(500).json({ message: error.message });

  if (parseInt(current_stock) > 0) {
    await supabase.from('inventory').insert([{ product_id: p.id, store_id: 1, current_stock: parseInt(current_stock) }]);
  }

  res.status(201).json({ message: 'Thêm thành công', product: { ...p, current_stock: parseInt(current_stock) || 0, threshold: p.stock_threshold, status: computeStatus(parseInt(current_stock) || 0, p.stock_threshold) } });
});

// PUT /api/products/:id
router.put('/products/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, category, price, threshold, current_stock } = req.body;
  const updates = {};
  if (name      !== undefined) updates.name            = name;
  if (category  !== undefined) updates.category        = category;
  if (price     !== undefined) updates.price           = parseInt(price);
  if (threshold !== undefined) updates.stock_threshold = parseInt(threshold);

  const { data: p, error } = await supabase
    .from('products').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ message: error.message });

  const { data: inv } = await supabase.from('inventory').select('current_stock').eq('product_id', req.params.id);
  const total = (inv || []).reduce((s, r) => s + r.current_stock, 0);
  res.json({ message: 'Cập nhật thành công', product: { ...p, current_stock: total, threshold: p.stock_threshold, status: computeStatus(total, p.stock_threshold) } });
});

// PUT /api/products/:id/stock — RESTOCK
router.put('/products/:id/stock', authenticate, async (req, res) => {
  const { quantity, store_id } = req.body;
  if (quantity === undefined || isNaN(quantity))
    return res.status(400).json({ message: 'Thiếu số lượng' });

  const productId = parseInt(req.params.id);
  const qty       = parseInt(quantity);
  const sid       = store_id ? parseInt(store_id) : 1;

  // Tìm inventory row theo store
  const { data: invRow } = await supabase
    .from('inventory').select('*').eq('product_id', productId).eq('store_id', sid).single();

  if (invRow) {
    const newStock = Math.max(0, invRow.current_stock + qty);
    await supabase.from('inventory')
      .update({ current_stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', invRow.id);
  } else {
    await supabase.from('inventory').insert([{ product_id: productId, store_id: sid, current_stock: Math.max(0, qty) }]);
  }

  const { data: p } = await supabase.from('products').select('*').eq('id', productId).single();
  const { data: allInv } = await supabase.from('inventory').select('current_stock').eq('product_id', productId);
  const total = (allInv || []).reduce((s, r) => s + r.current_stock, 0);
  res.json({ message: 'Cập nhật kho thành công', product: { ...p, current_stock: total, threshold: p.stock_threshold, status: computeStatus(total, p.stock_threshold) } });
});

// GET /api/inventory/alerts
router.get('/inventory/alerts', authenticate, async (req, res) => {
  const { data: products } = await supabase.from('products').select('*');
  const { data: inv }      = await supabase.from('inventory').select('product_id, current_stock');

  const stockMap = {};
  for (const row of inv || []) stockMap[row.product_id] = (stockMap[row.product_id] || 0) + row.current_stock;

  const alerts = (products || [])
    .map(p => ({ ...p, current_stock: stockMap[p.id] || 0, threshold: p.stock_threshold, status: computeStatus(stockMap[p.id] || 0, p.stock_threshold) }))
    .filter(p => p.status !== 'ok');
  res.json({ alerts, count: alerts.length });
});

module.exports = router;
