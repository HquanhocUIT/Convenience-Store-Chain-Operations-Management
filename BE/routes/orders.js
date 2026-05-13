// backend/routes/orders.js
const express  = require('express');
const router   = express.Router();
const { authenticate } = require('../middleware/auth');
const supabase = require('../data/supabase');

// GET /api/orders
router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, products(name)), stores(name)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// POST /api/orders — tạo đơn hàng, trừ stock
router.post('/', authenticate, async (req, res) => {
  const { items, store_id } = req.body || {};
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'items array required' });
  if (!store_id)
    return res.status(400).json({ error: 'store_id required' });

  let total_amount = 0;
  const enriched = [];

  for (const it of items) {
    const { data: p, error } = await supabase
      .from('products').select('id, name, price').eq('id', it.product_id).single();
    if (error || !p)
      return res.status(400).json({ error: `Không tìm thấy sản phẩm ID ${it.product_id}` });

    // Kiểm tra inventory theo store
    const { data: inv } = await supabase
      .from('inventory')
      .select('current_stock, id')
      .eq('product_id', it.product_id)
      .eq('store_id', store_id)
      .single();

    if (!inv || inv.current_stock < it.quantity)
      return res.status(400).json({ error: `${p.name}: không đủ tồn kho (còn ${inv?.current_stock || 0})` });

    total_amount += Number(p.price) * it.quantity;
    enriched.push({
      product_id: p.id,
      name: p.name,
      quantity: it.quantity,
      unit_price: Number(p.price),
      inv_id: inv.id,
      inv_stock: inv.current_stock,
    });
  }

  // Tạo order
  const { data: order, error: oErr } = await supabase
    .from('orders')
    .insert([{ store_id: parseInt(store_id), total_amount, status: 'completed', created_by: req.user?.id || null }])
    .select().single();
  if (oErr) return res.status(500).json({ message: oErr.message });

  // Insert order_items + trừ inventory
  for (const it of enriched) {
    await supabase.from('order_items').insert([{
      order_id: order.id, product_id: it.product_id,
      quantity: it.quantity, unit_price: it.unit_price,
    }]);
    await supabase.from('inventory')
      .update({ current_stock: it.inv_stock - it.quantity, updated_at: new Date().toISOString() })
      .eq('id', it.inv_id);
  }

  res.status(201).json({ ...order, total_amount });
});

module.exports = router;
