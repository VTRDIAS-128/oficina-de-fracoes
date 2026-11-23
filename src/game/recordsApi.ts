import { DifficultyLevel, GameMode, OperationMode } from './fractions';

export interface GameRecordInput {
  playerName: string;
  avatarId: string;
  turma: string;
  level: DifficultyLevel;
  operationMode: OperationMode;
  gameMode: GameMode;
  score: number;
  accuracy: number;
  bestStreak: number;
  avgTimeSeconds: number;
  hintsUsed: number;
  speedBonus: number;
}

export interface GameRecord extends GameRecordInput {
  id: string;
  createdAt: string;
}

const LOCAL_RECORDS_KEY = 'oficina_fracoes_records_v1';
const LOCAL_CLASSES_KEY = 'oficina_fracoes_classes_v1';

const DEFAULT_CLASSES = ['6.º A', '6.º B', '6.º C'];

function readLocalRecords(): GameRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_RECORDS_KEY);
    return raw ? (JSON.parse(raw) as GameRecord[]) : [];
  } catch {
    return [];
  }
}

function writeLocalRecords(records: GameRecord[]) {
  try {
    localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(records.slice(0, 500)));
  } catch {
    // Ignore storage quota issues
  }
}

export async function saveGameRecord(input: GameRecordInput): Promise<GameRecord> {
  const localFallback: GameRecord = {
    ...input,
    id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };

  try {
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (res.ok) {
      const saved = (await res.json()) as GameRecord;
      const existing = readLocalRecords();
      writeLocalRecords([saved, ...existing]);
      return saved;
    }
  } catch {
    // Fall back to local persistence
  }

  const existing = readLocalRecords();
  writeLocalRecords([localFallback, ...existing]);
  return localFallback;
}

export async function fetchLeaderboard(
  level: DifficultyLevel,
  turma?: string
): Promise<GameRecord[]> {
  try {
    const params = new URLSearchParams({ level: String(level) });
    if (turma && turma.trim() !== '') {
      params.set('turma', turma.trim());
    }
    const res = await fetch(`/api/leaderboard?${params.toString()}`);
    if (res.ok) {
      return (await res.json()) as GameRecord[];
    }
  } catch {
    // Fall back to local records
  }

  const local = readLocalRecords().filter((r) => {
    if (r.level !== level) return false;
    if (turma && turma.trim() !== '' && r.turma.toLowerCase() !== turma.trim().toLowerCase()) {
      return false;
    }
    return true;
  });

  return local
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return a.avgTimeSeconds - b.avgTimeSeconds;
    })
    .slice(0, 10);
}

export async function fetchAllRecords(turma?: string, level?: DifficultyLevel | 'all'): Promise<GameRecord[]> {
  try {
    const params = new URLSearchParams();
    if (turma && turma !== 'all') params.set('turma', turma);
    if (level && level !== 'all') params.set('level', String(level));
    const res = await fetch(`/api/records?${params.toString()}`);
    if (res.ok) {
      return (await res.json()) as GameRecord[];
    }
  } catch {
    // Fall back to local
  }

  return readLocalRecords().filter((r) => {
    if (turma && turma !== 'all' && r.turma !== turma) return false;
    if (level && level !== 'all' && r.level !== level) return false;
    return true;
  });
}

export async function fetchClasses(): Promise<string[]> {
  try {
    const res = await fetch('/api/classes');
    if (res.ok) {
      const list = (await res.json()) as string[];
      if (Array.isArray(list)) return list;
    }
  } catch {
    // Fall back to local
  }

  try {
    const raw = localStorage.getItem(LOCAL_CLASSES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore
  }
  return DEFAULT_CLASSES;
}

export async function addClass(name: string): Promise<string[]> {
  const clean = name.trim().slice(0, 40);
  if (!clean) return fetchClasses();

  try {
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: clean }),
    });
    if (res.ok) {
      return (await res.json()) as string[];
    }
  } catch {
    // Local fallback
  }

  const current = await fetchClasses();
  const next = Array.from(new Set([...current, clean]));
  try {
    localStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  return next;
}

export async function deleteClass(name: string, deleteRecords = false): Promise<string[]> {
  const clean = name.trim();
  if (!clean) return fetchClasses();

  try {
    const params = new URLSearchParams();
    if (deleteRecords) params.set('deleteRecords', 'true');
    const qs = params.toString();
    const res = await fetch(`/api/classes/${encodeURIComponent(clean)}${qs ? `?${qs}` : ''}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const next = (await res.json()) as string[];
      try {
        localStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(next));
        if (deleteRecords) {
          const remaining = readLocalRecords().filter(
            (r) => r.turma.toLowerCase() !== clean.toLowerCase()
          );
          writeLocalRecords(remaining);
        }
      } catch {
        // Ignore
      }
      return next;
    }
  } catch {
    // Local fallback
  }

  const current = await fetchClasses();
  const next = current.filter((c) => c.toLowerCase() !== clean.toLowerCase());
  try {
    localStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(next));
    if (deleteRecords) {
      const remaining = readLocalRecords().filter(
        (r) => r.turma.toLowerCase() !== clean.toLowerCase()
      );
      writeLocalRecords(remaining);
    }
  } catch {
    // Ignore
  }
  return next;
}

export function buildTurmaShareUrl(turma: string, level?: DifficultyLevel): string {
  const url = new URL(window.location.origin);
  url.searchParams.set('turma', turma);
  if (level) {
    url.searchParams.set('nivel', String(level));
  }
  return url.toString();
}

export function buildClassroomShareLink(turma: string, level?: DifficultyLevel): string {
  const gameUrl = buildTurmaShareUrl(turma, level);
  const title = `Oficina das Frações — Turma ${turma}`;
  const classroom = new URL('https://classroom.google.com/share');
  classroom.searchParams.set('url', gameUrl);
  classroom.searchParams.set('title', title);
  return classroom.toString();
}

export function getExportCsvUrl(turma?: string): string {
  const params = new URLSearchParams();
  if (turma && turma !== 'all') params.set('turma', turma);
  const qs = params.toString();
  return qs ? `/api/export.csv?${qs}` : '/api/export.csv';
}
