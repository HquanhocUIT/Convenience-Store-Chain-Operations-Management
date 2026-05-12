// backend/server.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => { console.log('=>', req.method, req.originalUrl); next(); });
app.use((req, res, next) => {
  if ((req.method === 'POST' || req.method === 'PUT') && !req.is('application/json'))
    return res.status(415).json({ error: 'Content-Type must be application/json' });
  next();
});

app.use('/api/auth',     require('./routes/auth'));
app.use('/api',          require('./routes/employees'));
app.use('/api',          require('./routes/inventory'));
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/sales',    require('./routes/sales'));
app.use('/api/branches', require('./routes/branches'));
app.use('/api',          require('./routes/api'));      // dashboard, stores — CUỐI CÙNG

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));
app.use((req, res) => res.status(404).json({ message: 'Endpoint not found' }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Internal server error' }); });

app.listen(PORT, () => {
  console.log('═══════════════════════════════════════');
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log(`📧 Login:  demo / demo`);
  console.log('═══════════════════════════════════════');
});
