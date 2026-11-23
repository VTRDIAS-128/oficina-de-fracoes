export type OperationType = 'add' | 'sub';
export type OperationMode = 'add' | 'sub' | 'mixed';
export type GameMode = 'practice' | 'time_attack' | 'duel';
export type DifficultyLevel = 1 | 2 | 3 | 4;

export const TIME_LIMITS: Record<DifficultyLevel, number> = {
  1: 20,
  2: 25,
  3: 30,
  4: 35,
};

export function getTimeLimitForLevel(level: DifficultyLevel): number {
  return TIME_LIMITS[level];
}

export interface Fraction {
  num: number;
  den: number;
}

export interface FractionQuestion {
  id: string;
  left: Fraction;
  right: Fraction;
  op: OperationType;
  commonDen: number;
  rawResult: Fraction;
  simplifiedResult: Fraction;
  requiresCommonDen: boolean;
  isImproperResult: boolean;
  canSimplify: boolean;
}

export interface LevelConfig {
  level: DifficultyLevel;
  title: string;
  subtitle: string;
  ruleSummary: string;
  requireSimplified: boolean;
  pointsPerCorrect: number;
}

export const LEVEL_CONFIGS: Record<DifficultyLevel, LevelConfig> = {
  1: {
    level: 1,
    title: 'Iniciante',
    subtitle: 'Mesmo denominador',
    ruleSummary: 'Denominadores iguais: soma ou subtrai apenas os numeradores.',
    requireSimplified: false,
    pointsPerCorrect: 100,
  },
  2: {
    level: 2,
    title: 'Explorador',
    subtitle: 'Denominadores múltiplos',
    ruleSummary: 'Um denominador é múltiplo do outro. Converte uma fração equivalente.',
    requireSimplified: false,
    pointsPerCorrect: 150,
  },
  3: {
    level: 3,
    title: 'Mestre',
    subtitle: 'Denominadores diferentes',
    ruleSummary: 'Encontra o denominador comum (MMC) para igualar as duas frações.',
    requireSimplified: false,
    pointsPerCorrect: 200,
  },
  4: {
    level: 4,
    title: 'Desafio',
    subtitle: 'Impróprias e simplificação',
    ruleSummary: 'Resultados acima de 1 inteiro e fração final na forma irredutível.',
    requireSimplified: true,
    pointsPerCorrect: 250,
  },
};

export type MisconceptionType =
  | 'added_denominators'
  | 'subtracted_denominators'
  | 'wrong_operation'
  | 'forgot_scale_numerator'
  | 'needs_simplification'
  | 'zero_denominator'
  | 'calculation_slip';

export interface EvaluationResult {
  status: 'correct' | 'equivalent_unsimplified' | 'incorrect';
  misconception: MisconceptionType | null;
  title: string;
  message: string;
  simplificationTip?: string;
  steps: string[];
}

export interface QuestionAttempt {
  question: FractionQuestion;
  userAnswer: Fraction;
  correctOnFirstTry: boolean;
  attemptsCount: number;
  hintsUsed: number;
  timeSeconds: number;
  misconceptions: MisconceptionType[];
  finalCorrect: boolean;
  pointsEarned: number;
  speedBonus?: number;
  timedOut?: boolean;
}

export interface LevelBestStats {
  bestScore: number;
  bestAccuracy: number;
  roundsCompleted: number;
  bestTimeAttackScore?: number;
}

const STORAGE_KEY = 'oficina_fracoes_stats_v1';

export function loadSavedStats(): Partial<Record<DifficultyLevel, LevelBestStats>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Record<DifficultyLevel, LevelBestStats>>;
  } catch {
    return {};
  }
}

export function saveLevelStats(
  level: DifficultyLevel,
  score: number,
  accuracy: number,
  gameMode: GameMode = 'practice'
): Partial<Record<DifficultyLevel, LevelBestStats>> {
  const current = loadSavedStats();
  const prev = current[level];
  const updated: Partial<Record<DifficultyLevel, LevelBestStats>> = {
    ...current,
    [level]: {
      bestScore: Math.max(prev?.bestScore ?? 0, score),
      bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, accuracy),
      roundsCompleted: (prev?.roundsCompleted ?? 0) + 1,
      bestTimeAttackScore:
        gameMode === 'time_attack'
          ? Math.max(prev?.bestTimeAttackScore ?? 0, score)
          : prev?.bestTimeAttackScore,
    },
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }
  return updated;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

export function simplifyFraction(f: Fraction): Fraction {
  if (f.den === 0) return f;
  const divisor = gcd(f.num, f.den);
  const sign = f.den < 0 ? -1 : 1;
  return {
    num: (f.num / divisor) * sign,
    den: Math.abs(f.den / divisor),
  };
}

export function areEquivalent(a: Fraction, b: Fraction): boolean {
  if (a.den === 0 || b.den === 0) return false;
  return a.num * b.den === b.num * a.den;
}

export function isIrreducible(f: Fraction): boolean {
  if (f.den <= 0) return false;
  return gcd(f.num, f.den) === 1;
}

export function formatFractionText(f: Fraction): string {
  return `${f.num}/${f.den}`;
}

function buildQuestion(left: Fraction, right: Fraction, op: OperationType, index: number): FractionQuestion {
  const commonDen = lcm(left.den, right.den);
  const leftScaled = left.num * (commonDen / left.den);
  const rightScaled = right.num * (commonDen / right.den);
  const rawNum = op === 'add' ? leftScaled + rightScaled : leftScaled - rightScaled;
  const rawResult: Fraction = { num: rawNum, den: commonDen };
  const simplifiedResult = simplifyFraction(rawResult);

  return {
    id: `q-${index}-${left.num}-${left.den}-${op}-${right.num}-${right.den}`,
    left,
    right,
    op,
    commonDen,
    rawResult,
    simplifiedResult,
    requiresCommonDen: left.den !== right.den,
    isImproperResult: simplifiedResult.num > simplifiedResult.den,
    canSimplify: rawResult.den !== simplifiedResult.den || rawResult.num !== simplifiedResult.num,
  };
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateCandidate(level: DifficultyLevel, op: OperationType, index: number): FractionQuestion {
  if (level === 1) {
    const den = pickRandom([3, 4, 5, 6, 8]);
    if (op === 'add') {
      const a = randomInt(1, den - 2);
      const b = randomInt(1, den - a);
      return buildQuestion({ num: a, den }, { num: b, den }, 'add', index);
    } else {
      const a = randomInt(2, den - 1);
      const b = randomInt(1, a - 1);
      return buildQuestion({ num: a, den }, { num: b, den }, 'sub', index);
    }
  }

  if (level === 2) {
    const pairs: [number, number][] = [
      [2, 4],
      [2, 6],
      [2, 8],
      [3, 6],
      [3, 9],
      [4, 8],
      [5, 10],
    ];
    for (let attempt = 0; attempt < 40; attempt++) {
      const [smallD, largeD] = pickRandom(pairs);
      const swapOrder = Math.random() < 0.5;
      const d1 = swapOrder ? largeD : smallD;
      const d2 = swapOrder ? smallD : largeD;
      const a = randomInt(1, d1 - 1);
      const b = randomInt(1, d2 - 1);
      if (gcd(a, d1) !== 1 && d1 > 4) continue;
      const valA = a / d1;
      const valB = b / d2;
      if (op === 'add' && valA + valB <= 1.0001) {
        return buildQuestion({ num: a, den: d1 }, { num: b, den: d2 }, 'add', index);
      }
      if (op === 'sub' && valA - valB > 0.0001) {
        return buildQuestion({ num: a, den: d1 }, { num: b, den: d2 }, 'sub', index);
      }
    }
    return op === 'add'
      ? buildQuestion({ num: 1, den: 2 }, { num: 1, den: 4 }, 'add', index)
      : buildQuestion({ num: 3, den: 4 }, { num: 1, den: 2 }, 'sub', index);
  }

  if (level === 3) {
    const pairs: [number, number][] = [
      [2, 3],
      [2, 5],
      [3, 4],
      [3, 5],
      [4, 5],
      [4, 6],
      [5, 6],
      [3, 8],
    ];
    for (let attempt = 0; attempt < 60; attempt++) {
      const [p1, p2] = pickRandom(pairs);
      const swap = Math.random() < 0.5;
      const d1 = swap ? p2 : p1;
      const d2 = swap ? p1 : p2;
      const a = randomInt(1, d1 - 1);
      const b = randomInt(1, d2 - 1);
      if (gcd(a, d1) !== 1 || gcd(b, d2) !== 1) continue;
      const valA = a / d1;
      const valB = b / d2;
      if (op === 'add' && valA + valB <= 1.0001) {
        return buildQuestion({ num: a, den: d1 }, { num: b, den: d2 }, 'add', index);
      }
      if (op === 'sub' && valA - valB > 0.0001) {
        return buildQuestion({ num: a, den: d1 }, { num: b, den: d2 }, 'sub', index);
      }
    }
    return op === 'add'
      ? buildQuestion({ num: 1, den: 3 }, { num: 1, den: 4 }, 'add', index)
      : buildQuestion({ num: 2, den: 3 }, { num: 1, den: 4 }, 'sub', index);
  }

  // Level 4: Improper results (> 1) & simplification required
  const pairs4: [number, number][] = [
    [3, 4],
    [4, 6],
    [5, 6],
    [3, 5],
    [4, 8],
    [6, 8],
    [4, 10],
    [3, 6],
    [4, 5],
  ];
  for (let attempt = 0; attempt < 80; attempt++) {
    const [p1, p2] = pickRandom(pairs4);
    const swap = Math.random() < 0.5;
    const d1 = swap ? p2 : p1;
    const d2 = swap ? p1 : p2;

    if (op === 'add') {
      const a = randomInt(Math.max(1, Math.floor(d1 * 0.5)), d1 - 1);
      const b = randomInt(Math.max(1, Math.floor(d2 * 0.5)), d2 - 1);
      if (gcd(a, d1) !== 1 || gcd(b, d2) !== 1) continue;
      const q = buildQuestion({ num: a, den: d1 }, { num: b, den: d2 }, 'add', index);
      if (q.isImproperResult || q.canSimplify) {
        return q;
      }
    } else {
      // Subtraction starting from improper or leading to simplification
      const a = randomInt(d1 + 1, d1 + Math.max(2, Math.floor(d1 * 0.75)));
      const b = randomInt(1, d2 - 1);
      if (gcd(a, d1) !== 1 || gcd(b, d2) !== 1) continue;
      if (a / d1 - b / d2 <= 0.05) continue;
      const q = buildQuestion({ num: a, den: d1 }, { num: b, den: d2 }, 'sub', index);
      if (q.isImproperResult || q.canSimplify) {
        return q;
      }
    }
  }
  return op === 'add'
    ? buildQuestion({ num: 3, den: 4 }, { num: 5, den: 6 }, 'add', index)
    : buildQuestion({ num: 7, den: 6 }, { num: 1, den: 4 }, 'sub', index);
}

export function generateRoundQuestions(
  level: DifficultyLevel,
  mode: OperationMode,
  count = 8
): FractionQuestion[] {
  const questions: FractionQuestion[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < count; i++) {
    const op: OperationType =
      mode === 'mixed' ? (i % 2 === 0 ? 'add' : 'sub') : mode;

    let chosen: FractionQuestion | null = null;
    for (let retry = 0; retry < 30; retry++) {
      const candidate = generateCandidate(level, op, i);
      const sig = `${candidate.left.num}/${candidate.left.den}${candidate.op}${candidate.right.num}/${candidate.right.den}`;
      if (!seen.has(sig)) {
        seen.add(sig);
        chosen = candidate;
        break;
      }
    }
    if (!chosen) {
      chosen = generateCandidate(level, op, i);
    }
    questions.push(chosen);
  }

  // Shuffle mixed order slightly while keeping balanced mix
  if (mode === 'mixed') {
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
  }

  return questions;
}

export function getHintsForQuestion(q: FractionQuestion): [string, string, string] {
  const { left, right, op, commonDen, rawResult, simplifiedResult } = q;
  const opWord = op === 'add' ? 'soma' : 'subtrai';
  const leftScaled = left.num * (commonDen / left.den);
  const rightScaled = right.num * (commonDen / right.den);

  if (!q.requiresCommonDen) {
    const hint1 = `Os denominadores já são iguais (${commonDen}). Mantém o denominador ${commonDen} na resposta.`;
    const hint2 = `Agora ${opWord} apenas os numeradores: ${left.num} ${op === 'add' ? '+' : '−'} ${right.num}.`;
    const hint3 = q.canSimplify
      ? `O resultado é ${rawResult.num}/${rawResult.den}, que simplificado dá ${simplifiedResult.num}/${simplifiedResult.den}.`
      : `Calcula ${left.num} ${op === 'add' ? '+' : '−'} ${right.num} = ${rawResult.num} sobre ${commonDen}.`;
    return [hint1, hint2, hint3];
  }

  const hint1 = `Encontra um denominador comum para ${left.den} e ${right.den}: o menor múltiplo comum é ${commonDen}.`;
  const hint2 = `Converte para denominador ${commonDen}: ${left.num}/${left.den} = ${leftScaled}/${commonDen} e ${right.num}/${right.den} = ${rightScaled}/${commonDen}.`;
  const hint3 = q.canSimplify
    ? `${op === 'add' ? 'Soma' : 'Subtrai'} os numeradores (${leftScaled} ${op === 'add' ? '+' : '−'} ${rightScaled} = ${rawResult.num}) → ${rawResult.num}/${commonDen} (simplifica para ${simplifiedResult.num}/${simplifiedResult.den}).`
    : `${op === 'add' ? 'Soma' : 'Subtrai'} os numeradores: ${leftScaled} ${op === 'add' ? '+' : '−'} ${rightScaled} = ${rawResult.num}, mantendo ${commonDen}.`;

  return [hint1, hint2, hint3];
}

export function getStepByStepSolution(q: FractionQuestion): string[] {
  const { left, right, op, commonDen, rawResult, simplifiedResult } = q;
  const opSymbol = op === 'add' ? '+' : '−';
  const leftScaled = left.num * (commonDen / left.den);
  const rightScaled = right.num * (commonDen / right.den);
  const steps: string[] = [];

  if (q.requiresCommonDen) {
    steps.push(
      `1. Igualar os denominadores (MMC de ${left.den} e ${right.den} = ${commonDen}): ${left.num}/${left.den} = ${leftScaled}/${commonDen} e ${right.num}/${right.den} = ${rightScaled}/${commonDen}.`
    );
    steps.push(
      `2. Operar os numeradores: ${leftScaled} ${opSymbol} ${rightScaled} = ${rawResult.num}, mantendo o denominador ${commonDen} → ${rawResult.num}/${commonDen}.`
    );
  } else {
    steps.push(
      `1. Os denominadores são iguais (${commonDen}), por isso mantém-se o ${commonDen}.`
    );
    steps.push(
      `2. Operar os numeradores: ${left.num} ${opSymbol} ${right.num} = ${rawResult.num} → ${rawResult.num}/${commonDen}.`
    );
  }

  if (q.canSimplify) {
    const div = gcd(rawResult.num, rawResult.den);
    steps.push(
      `3. Simplificar dividindo por ${div}: ${rawResult.num}/${rawResult.den} = ${simplifiedResult.num}/${simplifiedResult.den}.`
    );
  }

  return steps;
}

export function evaluateAnswer(
  q: FractionQuestion,
  userAnswer: Fraction,
  level: DifficultyLevel
): EvaluationResult {
  const steps = getStepByStepSolution(q);
  const config = LEVEL_CONFIGS[level];

  if (userAnswer.den === 0) {
    return {
      status: 'incorrect',
      misconception: 'zero_denominator',
      title: 'Denominador não pode ser zero',
      message: 'O denominador indica em quantas partes o inteiro está dividido, por isso nunca pode ser 0.',
      steps,
    };
  }

  const isCorrectValue = areEquivalent(userAnswer, q.simplifiedResult);

  if (isCorrectValue) {
    const simplified = isIrreducible(userAnswer);
    if (config.requireSimplified && !simplified) {
      const div = gcd(userAnswer.num, userAnswer.den);
      return {
        status: 'equivalent_unsimplified',
        misconception: 'needs_simplification',
        title: 'Quase lá! Falta simplificar',
        message: `${userAnswer.num}/${userAnswer.den} tem o valor certo, mas no nível Desafio deves escrever a fração irredutível. Divide o numerador e o denominador por ${div}!`,
        steps,
      };
    }

    const simplificationTip =
      !simplified && q.canSimplify
        ? `Dica extra: ${userAnswer.num}/${userAnswer.den} também pode ser simplificada para ${q.simplifiedResult.num}/${q.simplifiedResult.den}.`
        : undefined;

    return {
      status: 'correct',
      misconception: null,
      title: simplified ? 'Excelente!' : 'Correto!',
      message:
        q.isImproperResult
          ? `Muito bem! ${userAnswer.num}/${userAnswer.den} é uma fração imprópria (maior que 1 inteiro).`
          : `Acertaste em cheio: ${q.left.num}/${q.left.den} ${q.op === 'add' ? '+' : '−'} ${q.right.num}/${q.right.den} = ${userAnswer.num}/${userAnswer.den}.`,
      simplificationTip,
      steps,
    };
  }

  // Misconception detection
  const { left, right, op, commonDen } = q;

  // 1. Added or subtracted denominators directly
  if (
    op === 'add' &&
    userAnswer.num === left.num + right.num &&
    userAnswer.den === left.den + right.den
  ) {
    return {
      status: 'incorrect',
      misconception: 'added_denominators',
      title: 'Atenção aos denominadores!',
      message:
        'Somaste os denominadores em baixo, mas os denominadores não se somam. Igualamos o tamanho das partes primeiro e somamos só os numeradores.',
      steps,
    };
  }

  if (
    op === 'sub' &&
    left.den !== right.den &&
    userAnswer.den === Math.abs(left.den - right.den)
  ) {
    return {
      status: 'incorrect',
      misconception: 'subtracted_denominators',
      title: 'Atenção aos denominadores!',
      message:
        'Não se subtraem os denominadores! Encontra primeiro o denominador comum e subtrai apenas os numeradores.',
      steps,
    };
  }

  // 2. Wrong operation (added instead of subtracted or vice versa)
  const oppositeOp: OperationType = op === 'add' ? 'sub' : 'add';
  const leftScaled = left.num * (commonDen / left.den);
  const rightScaled = right.num * (commonDen / right.den);
  const oppositeNum = oppositeOp === 'add' ? leftScaled + rightScaled : leftScaled - rightScaled;
  if (oppositeNum > 0 && areEquivalent(userAnswer, { num: oppositeNum, den: commonDen })) {
    return {
      status: 'incorrect',
      misconception: 'wrong_operation',
      title: 'Verifica o sinal da operação!',
      message:
        op === 'add'
          ? 'Fizeste uma subtração, mas esta operação pede uma adição (+).'
          : 'Fizeste uma adição, mas esta operação pede uma subtração (−).',
      steps,
    };
  }

  // 3. Forgot to scale numerators after finding common denominator
  const unscaledOpNum = op === 'add' ? left.num + right.num : left.num - right.num;
  if (
    q.requiresCommonDen &&
    userAnswer.den === commonDen &&
    userAnswer.num === unscaledOpNum
  ) {
    return {
      status: 'incorrect',
      misconception: 'forgot_scale_numerator',
      title: 'Falta ajustar os numeradores!',
      message: `Mudaste o denominador para ${commonDen}, mas esqueceste-te de multiplicar os numeradores pelo mesmo fator antes de ${op === 'add' ? 'somar' : 'subtrair'}.`,
      steps,
    };
  }

  // 4. Generic calculation slip
  return {
    status: 'incorrect',
    misconception: 'calculation_slip',
    title: 'Ainda não é desta',
    message: `A tua resposta foi ${userAnswer.num}/${userAnswer.den}, mas o resultado correto é ${q.simplifiedResult.num}/${q.simplifiedResult.den}. Observa os passos abaixo e o modelo visual!`,
    steps,
  };
}
