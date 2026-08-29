const express = require('express');
const cors = require('cors');
const { initDatabase, getDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Inicializar banco antes de subir o servidor ──────────────
initDatabase().then(() => {
  app.use('/api/players', require('./routes/players'));
  app.use('/api/matches', require('./routes/matches'));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.listen(PORT, () => {
    console.log(`\n🏐 Volleyball API → http://localhost:${PORT}`);
    console.log(`   Docs:   http://localhost:${PORT}/api/health\n`);
  });
}).catch(err => {
  console.error('Erro ao inicializar banco:', err);
  process.exit(1);
});
