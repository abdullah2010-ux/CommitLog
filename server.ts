import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'commitlog-store.json');

const DEFAULT_STORE = {
  version: 2,
  updatedAt: new Date().toISOString(),
  targets: {
    dailySessionsGoal: 3,
    dailyMinutesGoal: 120,
    weeklyDaysGoal: 6,
  },
  sessions: [],
  journals: [],
};

function ensureStoreExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(DEFAULT_STORE, null, 2), 'utf-8');
  }
}

function readStore() {
  try {
    ensureStoreExists();
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      version: 2,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      targets: parsed.targets || DEFAULT_STORE.targets,
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      journals: Array.isArray(parsed.journals) ? parsed.journals : [],
    };
  } catch {
    return DEFAULT_STORE;
  }
}

function writeStore(data: Record<string, any> = {}) {
  ensureStoreExists();
  const current = readStore();
  const next = {
    version: 2,
    updatedAt: new Date().toISOString(),
    targets: data.targets ?? current.targets,
    sessions: Array.isArray(data.sessions) ? data.sessions : current.sessions,
    journals: Array.isArray(data.journals) ? data.journals : current.journals,
  };
  fs.writeFileSync(STORE_PATH, JSON.stringify(next, null, 2), 'utf-8');
  return next;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // API Routes for persistent daily progress storage
  app.get('/api/progress', (_req, res) => {
    const store = readStore();
    res.json(store);
  });

  app.put('/api/progress', (req, res) => {
    try {
      const updated = writeStore({
        targets: req.body?.targets,
        sessions: req.body?.sessions,
        journals: req.body?.journals,
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to persist progress data',
      });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CommitLog server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
