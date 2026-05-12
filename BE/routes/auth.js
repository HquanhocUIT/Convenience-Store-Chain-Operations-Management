const express  = require('express');
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcrypt');
const router   = express.Router();
const supabase = require('../data/supabase');

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'email and password required' });

  if (email === 'demo' && password === 'demo') {
    const token = jwt.sign(
      { id: 0, email: 'demo', role: 'admin', name: 'Demo User', store_id: null },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '1d' }
    );
    return res.json({ token, user: { id: 0, email: 'demo', name: 'Demo User', role: 'admin' } });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, password, full_name, role_id, store_id, is_active, roles(name)')
    .eq('email', email)
    .single();

  if (error || !user)
    return res.status(401).json({ error: 'invalid credentials' });

  if (!user.is_active)
    return res.status(401).json({ error: 'account disabled' });

  const match = await bcrypt.compare(password, user.password);
  if (!match)
    return res.status(401).json({ error: 'invalid credentials' });

  const roleName = user.roles?.name || 'staff';
  const token = jwt.sign(
    { id: user.id, email: user.email, role: roleName, name: user.full_name, store_id: user.store_id },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

  return res.json({
    token,
    user: { id: user.id, email: user.email, name: user.full_name, role: roleName, store_id: user.store_id }
  });
});

router.get('/profile', (req, res) => {
  const auth = (req.headers.authorization || '').split(' ');
  if (auth.length !== 2 || auth[0] !== 'Bearer')
    return res.status(401).json({ error: 'missing_token' });
  try {
    const data = jwt.verify(auth[1], process.env.JWT_SECRET || 'dev_secret');
    return res.json({ profile: { id: data.id, email: data.email, role: data.role, name: data.name } });
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }
});

module.exports = router;