/**
 * server.js
 * TrailSafe Express backend entry point.
 *
 * Start with:
 *   npm run dev   (development, auto-restarts with nodemon)
 *   npm start     (production)
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const weatherRoutes = require('./routes/weatherRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────

// CORS: allow requests from the Vite dev server and any production origin
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173', // Vite preview
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman) or from allowed origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin "${origin}" is not allowed.`));
      }
    },
    methods: ['GET'],
  })
);

app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api', weatherRoutes);

// ─── 404 catch-all ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ─── Global error handler ────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏔️  TrailSafe backend running on http://localhost:${PORT}`);
  console.log(`   Health check : http://localhost:${PORT}/api/health`);
  console.log(`   Weather API  : http://localhost:${PORT}/api/weather?location=tirumala\n`);
});
