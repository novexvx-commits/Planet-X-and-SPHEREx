/**
 * NASA SPHEREx Exploration Platform — Production Server
 * Express backend providing authentic SPHEREx data access, astrometric calculations,
 * and scientific processing services.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Enable Cross-Origin Resource Sharing for frontend access
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging in development
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`[SPHEREx API] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use('/api', apiRouter);

// Serve production static frontend if dist/ exists
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// Single-page application fallback (Express 5 compatible)
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('NASA SPHEREx Exploration Platform API Server Running.');
    }
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    error: 'Internal Scientific Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

/**
 * Start the Express HTTP server
 * @param {number} [port=PORT]
 * @param {string} [host=HOST]
 * @param {boolean} [exitOnError=true]
 * @returns {import('http').Server}
 */
export function startServer(port = PORT, host = HOST, exitOnError = true) {
  const server = app.listen(port, host, () => {
    console.log(`================================================================`);
    console.log(`🚀 NASA SPHEREx Exploration Platform Server Active`);
    console.log(`🛰️ Bound to: http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}`);
    console.log(`📡 Health Check: http://127.0.0.1:${port}/api/health`);
    console.log(`🔭 5 Authoritative Targets: http://127.0.0.1:${port}/api/targets`);
    console.log(`================================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`ℹ️ [SPHEREx Backend] Port ${port} is already bound / active.`);
    } else {
      console.error('\n❌ [SPHEREx Backend Error]', err.message);
    }
    if (exitOnError && err.code !== 'EADDRINUSE') {
      process.exit(1);
    }
  });

  return server;
}

// Auto-start server when executed directly (node server/server.js, npm run server, etc.)
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('server.js') ||
  process.argv[1].endsWith('server') ||
  process.argv[1].endsWith('index.js')
);

if (isDirectRun && process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app };
