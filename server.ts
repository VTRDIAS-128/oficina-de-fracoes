import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';

interface StoredRecord {
  id: string;
  playerName: string;
  avatarId: string;
  turma: string;
  level: 1 | 2 | 3 | 4;
  operationMode: 'add' | 'sub' | 'mixed';
  gameMode: 'practice' | 'time_attack' | 'duel';
  score: number;
  accuracy: number;
  bestStreak: number;
  avgTimeSeconds: number;
  hintsUsed: number;
  speedBonus: number;
  createdAt: string;
}

interface DataStore {
  classes: string[];
  records: StoredRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'records.json');
const DEFAULT_CLASSES = ['6º 8ª', '6º 9ª', '6º 10ª', '6º 11ª', '6º Ano'];

function readStore(): DataStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const initial: DataStore = { classes: [...DEFAULT_CLASSES], records: [] };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DataStore>;
    return {
      classes: Array.isArray(parsed.classes) ? parsed.classes : [...DEFAULT_CLASSES],
      records: Array.isArray(parsed.records) ? parsed.records : [],
    };
  } catch {
    return { classes: [...DEFAULT_CLASSES], records: [] };
  }
}

function writeStore(store: DataStore): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function sanitizeText(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[\r\n\t]+/g, ' ').trim().slice(0, maxLen);
}

function sanitizeCsvCell(value: string | number): string {
  const str = String(value);
  const neutralized = /^[=+\-@]/.test(str) ? `'${str}` : str;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '64kb' }));

  // List registered turmas (classes)
  app.get('/api/classes', (_req, res) => {
    const store = readStore();
    res.json(store.classes);
  });

  // Add a new turma (class)
  app.post('/api/classes', (req, res) => {
    const name = sanitizeText(req.body?.name, 40);
    if (!name || name.length < 1) {
      res.status(400).json({ error: 'Nome da turma inválido.' });
      return;
    }
    const store = readStore();
    if (!store.classes.some((c) => c.toLowerCase() === name.toLowerCase())) {
      store.classes.push(name);
      writeStore(store);
    }
    res.status(201).json(store.classes);
  });

  // Delete a turma (class) and optionally its records
  app.delete('/api/classes/:name', (req, res) => {
    const name = sanitizeText(req.params.name, 40);
    if (!name) {
      res.status(400).json({ error: 'Nome da turma inválido.' });
      return;
    }
    const deleteRecords = req.query.deleteRecords === 'true';
    const store = readStore();
    store.classes = store.classes.filter((c) => c.toLowerCase() !== name.toLowerCase());
    if (deleteRecords) {
      store.records = store.records.filter((r) => r.turma.toLowerCase() !== name.toLowerCase());
    }
    writeStore(store);
    res.json(store.classes);
  });

  // Save a completed game record
  app.post('/api/records', (req, res) => {
    const body = req.body ?? {};
    const playerName = sanitizeText(body.playerName, 40);
    const avatarId = sanitizeText(body.avatarId, 24) || 'lobo';
    const turma = sanitizeText(body.turma, 40) || 'Geral';
    const level = Number(body.level);
    const operationMode = body.operationMode;
    const gameMode = body.gameMode;
    const score = Number(body.score);
    const accuracy = Number(body.accuracy);
    const bestStreak = Number(body.bestStreak ?? 0);
    const avgTimeSeconds = Number(body.avgTimeSeconds ?? 0);
    const hintsUsed = Number(body.hintsUsed ?? 0);
    const speedBonus = Number(body.speedBonus ?? 0);

    if (
      playerName.length < 1 ||
      ![1, 2, 3, 4].includes(level) ||
      !['add', 'sub', 'mixed'].includes(operationMode) ||
      !['practice', 'time_attack', 'duel'].includes(gameMode) ||
      !Number.isFinite(score) ||
      score < 0 ||
      score > 100000 ||
      !Number.isFinite(accuracy) ||
      accuracy < 0 ||
      accuracy > 100
    ) {
      res.status(400).json({ error: 'Dados de registo inválidos.' });
      return;
    }

    const record: StoredRecord = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      playerName,
      avatarId,
      turma,
      level: level as 1 | 2 | 3 | 4,
      operationMode,
      gameMode,
      score: Math.round(score),
      accuracy: Math.round(accuracy),
      bestStreak: Math.max(0, Math.round(bestStreak)),
      avgTimeSeconds: Math.max(0, Math.round(avgTimeSeconds * 10) / 10),
      hintsUsed: Math.max(0, Math.round(hintsUsed)),
      speedBonus: Math.max(0, Math.round(speedBonus)),
      createdAt: new Date().toISOString(),
    };

    const store = readStore();
    store.records.unshift(record);
    if (turma !== 'Geral' && !store.classes.some((c) => c.toLowerCase() === turma.toLowerCase())) {
      store.classes.push(turma);
    }
    // Keep up to 2000 most recent records
    store.records = store.records.slice(0, 2000);
    writeStore(store);

    res.status(201).json(record);
  });

  // Top 10 leaderboard by level (and optional turma filter)
  app.get('/api/leaderboard', (req, res) => {
    const level = Number(req.query.level);
    const turma = sanitizeText(req.query.turma, 40);
    const store = readStore();

    const filtered = store.records.filter((r) => {
      if ([1, 2, 3, 4].includes(level) && r.level !== level) return false;
      if (turma && turma !== 'all' && r.turma.toLowerCase() !== turma.toLowerCase()) return false;
      return true;
    });

    const top10 = filtered
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        return a.avgTimeSeconds - b.avgTimeSeconds;
      })
      .slice(0, 10);

    res.json(top10);
  });

  // All student records for Teacher Dashboard
  app.get('/api/records', (req, res) => {
    const turma = sanitizeText(req.query.turma, 40);
    const level = Number(req.query.level);
    const store = readStore();

    const filtered = store.records.filter((r) => {
      if (turma && turma !== 'all' && r.turma.toLowerCase() !== turma.toLowerCase()) return false;
      if ([1, 2, 3, 4].includes(level) && r.level !== level) return false;
      return true;
    });

    res.json(filtered);
  });

  // Export records as CSV for Excel / Google Sheets
  app.get('/api/export.csv', (req, res) => {
    const turma = sanitizeText(req.query.turma, 40);
    const store = readStore();
    const filtered = store.records.filter((r) => {
      if (turma && turma !== 'all' && r.turma.toLowerCase() !== turma.toLowerCase()) return false;
      return true;
    });

    const header = [
      'Data',
      'Aluno',
      'Turma',
      'Nível',
      'Modo',
      'Operação',
      'Pontuação',
      'Precisão (%)',
      'Melhor Sequência',
      'Tempo Médio (s)',
      'Dicas Usadas',
      'Bónus Rapidez',
    ].join(',');

    const rows = filtered.map((r) =>
      [
        sanitizeCsvCell(r.createdAt),
        sanitizeCsvCell(r.playerName),
        sanitizeCsvCell(r.turma),
        sanitizeCsvCell(r.level),
        sanitizeCsvCell(r.gameMode),
        sanitizeCsvCell(r.operationMode),
        sanitizeCsvCell(r.score),
        sanitizeCsvCell(r.accuracy),
        sanitizeCsvCell(r.bestStreak),
        sanitizeCsvCell(r.avgTimeSeconds),
        sanitizeCsvCell(r.hintsUsed),
        sanitizeCsvCell(r.speedBonus),
      ].join(',')
    );

    const csv = '\uFEFF' + [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="registos_oficina_fracoes.csv"');
    res.send(csv);
  });

  if (process.env.NODE_ENV !== 'production') {
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    if (hmrDisabled) {
      app.get('/@vite/client', (_req, res) => {
        res.type('application/javascript').send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    style.remove();
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url) { return url; }
export class ErrorOverlay extends HTMLElement {}
`);
      });
    }

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ...(hmrDisabled ? { hmr: false, ws: false } : { ws: { server: httpServer } }),
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
