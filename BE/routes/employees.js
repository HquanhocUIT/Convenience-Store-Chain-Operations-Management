// backend/routes/employees.js
const express  = require('express');
const router   = express.Router();
const { authenticate } = require('../middleware/auth');
const supabase = require('../data/supabase');

// GET /api/employees
router.get('/employees', authenticate, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  let query = supabase.from('employees').select('*, stores(name)').order('id');
  if (req.query.store_id) query = query.eq('store_id', req.query.store_id);
  const { data, error } = await query;
  if (error) return res.status(500).json({ message: error.message });
  // Thêm store_name từ join
  res.json(data.map(e => ({ ...e, store_name: e.stores?.name || e.store_name || null })));
});

// GET /api/employees/:id
router.get('/employees/:id', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('employees').select('*, stores(name)').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Employee not found' });
  res.json({ ...data, store_name: data.stores?.name || null });
});

// POST /api/employees
router.post('/employees', async (req, res) => {
  let { full_name, email, role, store_name, shift } = req.body;
  if (!full_name || !role)
    return res.status(400).json({ message: 'Thiếu full_name hoặc role' });

  role = role.toLowerCase();
  if (!['manager','staff','cashier'].includes(role))
    return res.status(400).json({ message: 'Role phải là manager, staff hoặc cashier' });

  if (!email || !email.trim())
    email = full_name.replace(/\s+/g, '.').toLowerCase() + '@cschain.vn';

  // Tìm store_id
  let store_id = null;
  if (store_name) {
    const { data: store } = await supabase
      .from('stores').select('id').ilike('name', store_name).single();
    if (store) store_id = store.id;
  }

  const { data, error } = await supabase
    .from('employees')
    .insert([{ email, full_name, role, store_id, shift: (shift || 'morning').toLowerCase(), is_active: true }])
    .select('*, stores(name)').single();

  if (error) {
    if (error.code === '23505') return res.status(400).json({ message: 'Email đã tồn tại' });
    return res.status(500).json({ message: error.message });
  }
  res.status(201).json({ message: 'Thêm thành công', employee: { ...data, store_name: data.stores?.name || store_name || null } });
});

// PUT /api/employees/:id
router.put('/employees/:id', authenticate, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { full_name, email, role, store_name, shift, is_active } = req.body;
  const updates = {};
  if (full_name  !== undefined) updates.full_name = full_name;
  if (email      !== undefined) updates.email     = email;
  if (role       !== undefined) updates.role      = role.toLowerCase();
  if (shift      !== undefined) updates.shift     = shift.toLowerCase();
  if (is_active  !== undefined) updates.is_active = is_active;
  if (store_name !== undefined) {
    const { data: store } = await supabase.from('stores').select('id').ilike('name', store_name).single();
    updates.store_id = store ? store.id : null;
  }

  const { data, error } = await supabase
    .from('employees').update(updates).eq('id', req.params.id).select('*, stores(name)').single();
  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: 'Cập nhật thành công', employee: { ...data, store_name: data.stores?.name || null } });
});

// DELETE /api/employees/:id
router.delete('/employees/:id', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('employees').update({ is_active: false }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: 'Đã vô hiệu hóa', employee: data });
});

module.exports = router;
