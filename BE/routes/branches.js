// backend/routes/branches.js
const express  = require('express');
const router   = express.Router();
const { authenticate } = require('../middleware/auth');
const supabase = require('../data/supabase');

// GET /api/branches
router.get('/', authenticate, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('id');
  if (error) return res.status(500).json({ message: error.message });

  // Lấy manager name từ users riêng
  const managerIds = data.map(s => s.manager_id).filter(Boolean);
  let managerMap = {};
  if (managerIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', managerIds);
    if (users) users.forEach(u => { managerMap[u.id] = u.full_name; });
  }

  const result = data.map(s => ({
    ...s,
    manager: managerMap[s.manager_id] || '—',
    status: s.is_active ? 'active' : 'inactive',
  }));
  res.json(result);
});

// GET /api/branches/:id
router.get('/:id', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('stores').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ message: 'Branch not found' });
  res.json({ ...data, status: data.is_active ? 'active' : 'inactive' });
});

// POST /api/branches
router.post('/', authenticate, async (req, res) => {
  const { name, address, manager } = req.body;
  if (!name || !address || !manager)
    return res.status(400).json({ message: 'Required: name, address, manager' });

  const { data, error } = await supabase
    .from('stores')
    .insert([{ name, address, is_active: true }])
    .select().single();

  if (error) {
    if (error.code === '23505') return res.status(400).json({ message: 'Branch name already exists' });
    return res.status(500).json({ message: error.message });
  }
  res.status(201).json({ message: 'Branch created successfully', branch: { ...data, manager, status: 'active' } });
});

// PUT /api/branches/:id
router.put('/:id', authenticate, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { name, address, status } = req.body;
  const updates = {};
  if (name    !== undefined) updates.name      = name;
  if (address !== undefined) updates.address   = address;
  if (status  !== undefined) updates.is_active = status === 'active';

  const { data, error } = await supabase
    .from('stores').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: 'Branch updated', branch: { ...data, status: data.is_active ? 'active' : 'inactive' } });
});

// DELETE /api/branches/:id
router.delete('/:id', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('stores').update({ is_active: false }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: 'Branch disabled', branch: { ...data, status: 'inactive' } });
});

module.exports = router;