// backend/routes/sales.js
// Schema: orders.total_amount, orders.status, orders.created_by
const express  = require('express');
const router   = express.Router();
const { authenticate } = require('../middleware/auth');
const supabase = require('../data/supabase');

function fmtDate(d) { return new Date(d).toISOString().split('T')[0]; }

// GET /api/sales?period=daily|weekly|monthly
router.get('/', authenticate, async (req, res) => {
  const period = (req.query.period || 'daily').toLowerCase();
  const now    = new Date();
  let fromDate;

  if (period === 'monthly')     { fromDate = new Date(now.getFullYear(), now.getMonth() - 2, 1); }
  else if (period === 'weekly') { fromDate = new Date(now); fromDate.setDate(now.getDate() - 27); }
  else                          { fromDate = new Date(now); fromDate.setDate(now.getDate() - 6); }

  const { data: orders, error } = await supabase
    .from('orders')
    .select('total_amount, created_at')
    .eq('status', 'completed')
    .gte('created_at', fromDate.toISOString())
    .order('created_at');

  if (error) return res.status(500).json({ message: error.message });

  if (period === 'daily') {
    const map = {};
    for (let i = 6; i >= 0; i--) {
      const d   = new Date(now); d.setDate(now.getDate() - i);
      const key = fmtDate(d);
      map[key]  = { date: key, revenue: 0, order_count: 0 };
    }
    for (const o of orders) {
      const key = fmtDate(o.created_at);
      if (map[key]) { map[key].revenue += Number(o.total_amount); map[key].order_count++; }
    }
    return res.json(Object.values(map));
  }

  if (period === 'weekly') {
    const weeks = [];
    for (let w = 3; w >= 0; w--) {
      const end   = new Date(now); end.setDate(now.getDate() - w * 7);
      const start = new Date(end); start.setDate(end.getDate() - 6);
      const wo    = orders.filter(o => { const d = new Date(o.created_at); return d >= start && d <= end; });
      weeks.push({ date: `W${4 - w}`, start: fmtDate(start), end: fmtDate(end), revenue: wo.reduce((s, o) => s + Number(o.total_amount), 0), order_count: wo.length });
    }
    return res.json(weeks);
  }

  // monthly
  const months = [];
  for (let m = 2; m >= 0; m--) {
    const d  = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const mo = d.getMonth(); const yr = d.getFullYear();
    const mo_orders = orders.filter(o => { const od = new Date(o.created_at); return od.getFullYear() === yr && od.getMonth() === mo; });
    months.push({ date: `${yr}-${String(mo + 1).padStart(2, '0')}`, month: `${yr}-${String(mo + 1).padStart(2, '0')}`, revenue: mo_orders.reduce((s, o) => s + Number(o.total_amount), 0), order_count: mo_orders.length });
  }
  return res.json(months);
});

module.exports = router;
