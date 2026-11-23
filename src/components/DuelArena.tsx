import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpDown,
  CheckCircle2,
  Delete,
  Pause,
  SkipForward,
  Trophy,
  Volume2,
  VolumeX,
  AlertCircle,
} from 'lucide-react';
import {
  DifficultyLevel,
  EvaluationResult,
  Fraction,
  FractionQuestion,
  LEVEL_CONFIGS,
  evaluateAnswer,
  formatFractionText,
} from '../game/fractions';
import { soundEngine } from '../game/audio';
import { AvatarBadge } from './Avatars';
import { FractionDisplay } from './FractionDisplay';
import { PlayerProfile } from './PlayerSetup';

export interface DuelPlayerStats {
  score: number;
  streak: number;
  bestStreak: number;
  wins: number;
  wrongAttempts: number;
}

export interface DuelRoundRecord {
  question: FractionQuestion;
  winner: 1 | 2 | null;
  winningAnswer: Fraction | null;
}

interface PlayerInputState {
  num: string;
  den: string;
  activeField: 'num' | 'den';
  feedback: EvaluationResult | null;
  shake: boolean;
}

interface DuelArenaProps {
  level: DifficultyLevel;
  questions: FractionQuestion[];
  currentIndex: number;
  p1Profile: PlayerProfile | null;
  p2Profile: PlayerProfile | null;
  muted: boolean;
  isPaused: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onFinishDuel: (p1: DuelPlayerStats, p2: DuelPlayerStats, records: DuelRoundRecord[]) => void;
  onAdvanceIndex: (nextIndex: number) => void;
}

const P1_KEY_HINTS: Record<string, string> = {
  '1': 'Q',
  '2': 'W',
  '3': 'E',
  '4': 'A',
  '5': 'S',
  '6': 'D',
  '7': 'Z',
  '8': 'X',
  '9': 'C',
  '0': 'V',
};

const P1_CHAR_TO_DIGIT: Record<string, string> = {
  q: '1',
  w: '2',
  e: '3',
  a: '4',
  s: '5',
  d: '6',
  z: '7',
  x: '8',
  c: '9',
  v: '0',
};

const INITIAL_PLAYER_INPUT: PlayerInputState = {
  num: '',
  den: '',
  activeField: 'num',
  feedback: null,
  shake: false,
};

function renderCompactBar(num: number, den: number, fill: string, maxWholes: number) {
  const width = 260;
  const height = 22;
  const gap = 6;
  const totalWholes = Math.max(maxWholes, Math.ceil(num / den));
  const wholeW = (width - gap * (totalWholes - 1)) / totalWholes;
  const items = [];

  for (let w = 0; w < totalWholes; w++) {
    const startX = w * (wholeW + gap);
    const segW = wholeW / den;
    for (let i = 0; i < den; i++) {
      const filled = w * den + i < num;
      items.push(
        <rect
          key={`${w}-${i}`}
          x={startX + i * segW}
          y={1}
          width={segW}
          height={height - 2}
          fill={filled ? fill : '#1E293B'}
          stroke="#0F172A"
          strokeWidth={1.2}
          rx={1.5}
        />
      );
    }
    items.push(
      <rect
        key={`f-${w}`}
        x={startX}
        y={1}
        width={wholeW}
        height={height - 2}
        fill="none"
        stroke="#E2E8F0"
        strokeOpacity={0.4}
        strokeWidth={1.5}
        rx={2.5}
      />
    );
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-5" aria-hidden="true">
      {items}
    </svg>
  );
}

export function DuelArena({
  level,
  questions,
  currentIndex,
  p1Profile,
  p2Profile,
  muted,
  isPaused,
  onToggleMute,
  onPause,
  onFinishDuel,
  onAdvanceIndex,
}: DuelArenaProps) {
  const [p1Stats, setP1Stats] = useState<DuelPlayerStats>({
    score: 0,
    streak: 0,
    bestStreak: 0,
    wins: 0,
    wrongAttempts: 0,
  });
  const [p2Stats, setP2Stats] = useState<DuelPlayerStats>({
    score: 0,
    streak: 0,
    bestStreak: 0,
    wins: 0,
    wrongAttempts: 0,
  });

  const [p1Input, setP1Input] = useState<PlayerInputState>(INITIAL_PLAYER_INPUT);
  const [p2Input, setP2Input] = useState<PlayerInputState>(INITIAL_PLAYER_INPUT);
  const [roundWinner, setRoundWinner] = useState<1 | 2 | 'skipped' | null>(null);
  const [records, setRecords] = useState<DuelRoundRecord[]>([]);

  const currentQuestion = questions[currentIndex];
  const levelCfg = LEVEL_CONFIGS[level];

  const resetInputs = useCallback(() => {
    setP1Input(INITIAL_PLAYER_INPUT);
    setP2Input(INITIAL_PLAYER_INPUT);
    setRoundWinner(null);
  }, []);

  const handleNext = useCallback(() => {
    if (!currentQuestion) return;
    soundEngine.playTap();
    if (currentIndex + 1 >= questions.length) {
      soundEngine.playVictory();
      onFinishDuel(p1Stats, p2Stats, records);
    } else {
      resetInputs();
      onAdvanceIndex(currentIndex + 1);
    }
  }, [currentIndex, currentQuestion, onAdvanceIndex, onFinishDuel, p1Stats, p2Stats, questions.length, records, resetInputs]);

  const handleSkipQuestion = useCallback(() => {
    if (!currentQuestion || roundWinner !== null) return;
    soundEngine.playWarning();
    setRoundWinner('skipped');
    setRecords((prev) => [
      ...prev,
      { question: currentQuestion, winner: null, winningAnswer: null },
    ]);
  }, [currentQuestion, roundWinner]);

  const updatePlayerInput = useCallback(
    (player: 1 | 2, updater: (prev: PlayerInputState) => PlayerInputState) => {
      if (player === 1) setP1Input(updater);
      else setP2Input(updater);
    },
    []
  );

  const handleDigit = useCallback(
    (player: 1 | 2, digit: string) => {
      if (roundWinner !== null) return;
      soundEngine.playTap();
      updatePlayerInput(player, (prev) => {
        if (prev.activeField === 'num') {
          const nextNum = prev.num.length >= 3 ? prev.num : prev.num === '0' ? digit : prev.num + digit;
          return { ...prev, num: nextNum };
        }
        const nextDen = prev.den.length >= 3 ? prev.den : prev.den === '0' ? digit : prev.den + digit;
        return { ...prev, den: nextDen };
      });
    },
    [roundWinner, updatePlayerInput]
  );

  const handleBackspace = useCallback(
    (player: 1 | 2) => {
      if (roundWinner !== null) return;
      soundEngine.playTap();
      updatePlayerInput(player, (prev) => ({
        ...prev,
        num: prev.activeField === 'num' ? prev.num.slice(0, -1) : prev.num,
        den: prev.activeField === 'den' ? prev.den.slice(0, -1) : prev.den,
      }));
    },
    [roundWinner, updatePlayerInput]
  );

  const handleToggleField = useCallback(
    (player: 1 | 2) => {
      if (roundWinner !== null) return;
      soundEngine.playTap();
      updatePlayerInput(player, (prev) => ({
        ...prev,
        activeField: prev.activeField === 'num' ? 'den' : 'num',
      }));
    },
    [roundWinner, updatePlayerInput]
  );

  const handleSubmit = useCallback(
    (player: 1 | 2) => {
      if (!currentQuestion) return;

      if (roundWinner !== null) {
        handleNext();
        return;
      }

      const input = player === 1 ? p1Input : p2Input;
      if (input.num === '' || input.den === '') {
        soundEngine.playWarning();
        updatePlayerInput(player, (prev) => ({
          ...prev,
          activeField: prev.num === '' ? 'num' : 'den',
          shake: true,
        }));
        setTimeout(() => {
          updatePlayerInput(player, (prev) => ({ ...prev, shake: false }));
        }, 240);
        return;
      }

      const answer: Fraction = {
        num: parseInt(input.num, 10),
        den: parseInt(input.den, 10),
      };
      const result = evaluateAnswer(currentQuestion, answer, level);

      if (result.status === 'correct') {
        const setStats = player === 1 ? setP1Stats : setP2Stats;
        const currentStats = player === 1 ? p1Stats : p2Stats;
        const nextStreak = currentStats.streak + 1;
        const streakBonus = nextStreak >= 2 ? (nextStreak - 1) * 20 : 0;
        const earned = levelCfg.pointsPerCorrect + streakBonus;

        setStats((prev) => ({
          ...prev,
          score: prev.score + earned,
          streak: nextStreak,
          bestStreak: Math.max(prev.bestStreak, nextStreak),
          wins: prev.wins + 1,
        }));

        // Reset other player's streak cleanly on loss of round
        const setOtherStats = player === 1 ? setP2Stats : setP1Stats;
        setOtherStats((prev) => ({ ...prev, streak: 0 }));

        updatePlayerInput(player, (prev) => ({
          ...prev,
          feedback: {
            ...result,
            title: `Ponto para Jogador ${player}! (+${earned} pts)`,
          },
        }));

        setRoundWinner(player);
        setRecords((prev) => [
          ...prev,
          { question: currentQuestion, winner: player, winningAnswer: answer },
        ]);
        soundEngine.playCorrect(nextStreak);
        return;
      }

      // Equivalent unsimplified or incorrect — let this player retry without disrupting the opponent!
      soundEngine.playError();
      if (result.status === 'incorrect') {
        const setStats = player === 1 ? setP1Stats : setP2Stats;
        setStats((prev) => ({
          ...prev,
          streak: 0,
          wrongAttempts: prev.wrongAttempts + 1,
        }));
      }

      updatePlayerInput(player, (prev) => ({
        ...prev,
        num: '',
        den: '',
        activeField: 'num',
        feedback: result,
        shake: true,
      }));
      setTimeout(() => {
        updatePlayerInput(player, (prev) => ({ ...prev, shake: false }));
      }, 240);
    },
    [
      currentQuestion,
      handleNext,
      level,
      levelCfg.pointsPerCorrect,
      p1Input,
      p1Stats,
      p2Input,
      p2Stats,
      roundWinner,
      updatePlayerInput,
    ]
  );

  // Split Keyboard Handler for Simultaneous 2-Player Input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isPaused) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onPause();
        return;
      }

      // If round already won, Space or Enter advances to next question
      if (roundWinner !== null) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleNext();
        }
        return;
      }

      const lower = e.key.toLowerCase();

      // Player 1 (Left Half of Keyboard)
      if (P1_CHAR_TO_DIGIT[lower]) {
        e.preventDefault();
        handleDigit(1, P1_CHAR_TO_DIGIT[lower]);
        return;
      }
      if (lower === 'f' || e.key === 'Tab') {
        e.preventDefault();
        handleToggleField(1);
        return;
      }
      if (lower === 'r') {
        e.preventDefault();
        handleBackspace(1);
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        handleSubmit(1);
        return;
      }

      // Player 2 (Right Half / Digits / Numpad / Arrows)
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(2, e.key);
        return;
      }
      if (e.key === '/' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleToggleField(2);
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace(2);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(2);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleBackspace, handleDigit, handleNext, handleSubmit, handleToggleField, isPaused, onPause, roundWinner]);

  if (!currentQuestion) return null;

  const progressPercent = ((currentIndex + (roundWinner ? 1 : 0)) / questions.length) * 100;
  const opSymbol = currentQuestion.op === 'add' ? '+' : '−';
  const maxWholes = Math.max(
    Math.ceil(currentQuestion.left.num / currentQuestion.left.den),
    Math.ceil(currentQuestion.right.num / currentQuestion.right.den),
    currentQuestion.isImproperResult ? 2 : 1
  );

  const p1Name = p1Profile?.name || 'Jogador 1';
  const p2Name = p2Profile?.name || 'Jogador 2';

  return (
    <div className="min-h-screen w-full bg-[#0B1320] text-slate-100 flex flex-col">
      {/* Top Progress Bar */}
      <div className="w-full h-1 bg-slate-800">
        <div
          className="h-full bg-emerald-400 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Split HUD Header */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-3 pb-2 grid grid-cols-3 items-center gap-2 pointer-events-none">
        {/* Player 1 HUD (Left) */}
        <div className="flex items-center gap-2.5 sm:gap-4 justify-start min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <AvatarBadge avatarId={p1Profile?.avatarId ?? 'lobo'} size="xs" />
            <span className="font-display font-bold text-sm sm:text-base text-sky-300 truncate">
              {p1Name}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs sm:text-sm shrink-0">
            <span className="text-slate-400">
              Pts: <strong className="font-math text-white">{p1Stats.score}</strong>
            </span>
            <span className="text-slate-400 hidden sm:inline">
              Vitórias: <strong className="font-math text-sky-300">{p1Stats.wins}</strong>
            </span>
          </div>
        </div>

        {/* Center Match Metadata & Controls */}
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <span className="font-math text-xs sm:text-sm font-semibold text-slate-200 whitespace-nowrap">
            Duelo · {currentIndex + 1}/{questions.length}
          </span>
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={onToggleMute}
              className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/70 text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label={muted ? 'Ativar som' : 'Silenciar som'}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
            </button>
            <button
              type="button"
              onClick={onPause}
              className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/70 text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Pausa"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Player 2 HUD (Right) */}
        <div className="flex items-center gap-2.5 sm:gap-4 justify-end min-w-0">
          <div className="flex items-center gap-3 text-xs sm:text-sm shrink-0">
            <span className="text-slate-400 hidden sm:inline">
              Vitórias: <strong className="font-math text-amber-300">{p2Stats.wins}</strong>
            </span>
            <span className="text-slate-400">
              Pts: <strong className="font-math text-white">{p2Stats.score}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-display font-bold text-sm sm:text-base text-amber-300 truncate">
              {p2Name}
            </span>
            <AvatarBadge avatarId={p2Profile?.avatarId ?? 'aguia'} size="xs" />
          </div>
        </div>
      </header>

      {/* Shared Central Problem Banner */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-2">
        <div className="bg-[#111C2E] border border-slate-700/80 rounded-2xl px-4 py-3 sm:px-6 sm:py-4 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-lg">
          {/* Shared Equation */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-xs font-medium text-slate-400 hidden sm:block mr-1">
              Nível {level} · {levelCfg.title}
            </div>
            <FractionDisplay
              num={currentQuestion.left.num}
              den={currentQuestion.left.den}
              size="lg"
              colorClass="text-sky-300"
            />
            <span className="font-math text-2xl sm:text-3xl font-bold text-slate-200">
              {opSymbol}
            </span>
            <FractionDisplay
              num={currentQuestion.right.num}
              den={currentQuestion.right.den}
              size="lg"
              colorClass="text-amber-300"
            />
            <span className="font-math text-2xl sm:text-3xl font-bold text-slate-300">=</span>
            {roundWinner !== null ? (
              <FractionDisplay
                num={currentQuestion.simplifiedResult.num}
                den={currentQuestion.simplifiedResult.den}
                size="lg"
                colorClass="text-emerald-400"
              />
            ) : (
              <span className="font-math text-2xl font-bold text-slate-500 px-2">? / ?</span>
            )}
          </div>

          {/* Shared Compact Visual Bars */}
          <div className="w-full max-w-md grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-math text-sky-300">
                {formatFractionText(currentQuestion.left)}
              </span>
              {renderCompactBar(currentQuestion.left.num, currentQuestion.left.den, '#0EA5E9', maxWholes)}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-math text-amber-300">
                {formatFractionText(currentQuestion.right)}
              </span>
              {renderCompactBar(currentQuestion.right.num, currentQuestion.right.den, '#F59E0B', maxWholes)}
            </div>
          </div>

          {/* Round Winner / Skip Action */}
          <div className="flex items-center gap-2 shrink-0">
            {roundWinner !== null ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm inline-flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap animate-pop-settle"
              >
                <Trophy className="w-4 h-4" />
                <span>
                  {currentIndex + 1 >= questions.length ? 'Ver Vencedor' : 'Próxima (Espaço / Enter)'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSkipQuestion}
                className="px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Saltar</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Split 2-Player Simultaneous Arena */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-5 pt-2 flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PLAYER 1 PANEL (LEFT) */}
        <PlayerDuelDeck
          player={1}
          playerName={p1Name}
          avatarId={p1Profile?.avatarId ?? 'lobo'}
          accent="sky"
          input={p1Input}
          stats={p1Stats}
          roundWinner={roundWinner}
          keyHints={P1_KEY_HINTS}
          toggleKeyHint="F / Tab"
          deleteKeyHint="R"
          submitKeyHint="Espaço"
          onSelectField={(field) =>
            updatePlayerInput(1, (prev) => ({ ...prev, activeField: field }))
          }
          onDigit={(d) => handleDigit(1, d)}
          onBackspace={() => handleBackspace(1)}
          onToggleField={() => handleToggleField(1)}
          onSubmit={() => handleSubmit(1)}
        />

        {/* PLAYER 2 PANEL (RIGHT) */}
        <PlayerDuelDeck
          player={2}
          playerName={p2Name}
          avatarId={p2Profile?.avatarId ?? 'aguia'}
          accent="amber"
          input={p2Input}
          stats={p2Stats}
          roundWinner={roundWinner}
          toggleKeyHint="/ ou ↑↓"
          deleteKeyHint="⌫"
          submitKeyHint="Enter"
          onSelectField={(field) =>
            updatePlayerInput(2, (prev) => ({ ...prev, activeField: field }))
          }
          onDigit={(d) => handleDigit(2, d)}
          onBackspace={() => handleBackspace(2)}
          onToggleField={() => handleToggleField(2)}
          onSubmit={() => handleSubmit(2)}
        />
      </main>
    </div>
  );
}

interface PlayerDuelDeckProps {
  player: 1 | 2;
  playerName: string;
  avatarId: string;
  accent: 'sky' | 'amber';
  input: PlayerInputState;
  stats: DuelPlayerStats;
  roundWinner: 1 | 2 | 'skipped' | null;
  keyHints?: Record<string, string>;
  toggleKeyHint: string;
  deleteKeyHint: string;
  submitKeyHint: string;
  onSelectField: (field: 'num' | 'den') => void;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onToggleField: () => void;
  onSubmit: () => void;
}

function PlayerDuelDeck({
  player,
  playerName,
  avatarId,
  accent,
  input,
  stats,
  roundWinner,
  keyHints,
  toggleKeyHint,
  deleteKeyHint,
  submitKeyHint,
  onSelectField,
  onDigit,
  onBackspace,
  onToggleField,
  onSubmit,
}: PlayerDuelDeckProps) {
  const isWinner = roundWinner === player;
  const isRoundOver = roundWinner !== null;

  const borderClass = isWinner
    ? 'border-emerald-400 ring-2 ring-emerald-400/30'
    : accent === 'sky'
    ? 'border-sky-500/40'
    : 'border-amber-500/40';

  const activeFieldRing =
    accent === 'sky'
      ? 'border-sky-400 ring-2 ring-sky-400/30'
      : 'border-amber-400 ring-2 ring-amber-400/30';

  const headerColor = accent === 'sky' ? 'text-sky-300' : 'text-amber-300';
  const submitBg =
    accent === 'sky'
      ? 'bg-sky-500 hover:bg-sky-400 text-slate-950'
      : 'bg-amber-400 hover:bg-amber-300 text-slate-950';

  return (
    <section
      className={`bg-[#111C2E] border rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-lg transition-colors ${borderClass} ${
        input.shake ? 'animate-gentle-shake' : ''
      }`}
    >
      {/* Player Deck Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <AvatarBadge avatarId={avatarId} size="xs" />
          <h2 className={`font-display text-lg font-bold truncate ${headerColor}`}>
            {playerName}
          </h2>
          <span className="text-xs font-math text-slate-400 shrink-0">
            · Sequência {stats.streak}
          </span>
        </div>
        <span className="text-xs text-slate-400">
          {player === 1 ? 'Teclado Esquerdo' : 'Teclado Direito / Numpad'}
        </span>
      </div>

      {/* Fraction Input Box */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl py-3 px-4 flex items-center justify-center gap-4">
        <div className="inline-flex flex-col items-center gap-1.5">
          <button
            type="button"
            disabled={isRoundOver}
            onClick={() => onSelectField('num')}
            className={`min-w-[3.5rem] h-11 px-2 rounded-lg font-math text-2xl font-bold flex items-center justify-center border-2 transition-colors cursor-pointer ${
              input.activeField === 'num' && !isRoundOver
                ? `bg-slate-800 text-white ${activeFieldRing}`
                : 'bg-slate-950/70 border-slate-700 text-slate-200'
            }`}
          >
            {input.num || <span className="text-slate-600">?</span>}
          </button>
          <span className="w-14 h-[2.5px] bg-slate-200 rounded-full" />
          <button
            type="button"
            disabled={isRoundOver}
            onClick={() => onSelectField('den')}
            className={`min-w-[3.5rem] h-11 px-2 rounded-lg font-math text-2xl font-bold flex items-center justify-center border-2 transition-colors cursor-pointer ${
              input.activeField === 'den' && !isRoundOver
                ? `bg-slate-800 text-white ${activeFieldRing}`
                : 'bg-slate-950/70 border-slate-700 text-slate-200'
            }`}
          >
            {input.den || <span className="text-slate-600">?</span>}
          </button>
        </div>

        {/* Inline Feedback Summary */}
        <div className="flex-1 min-w-0">
          {isWinner ? (
            <div className="flex items-start gap-2 text-emerald-300 animate-pop-settle">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold">{input.feedback?.title}</div>
                <p className="text-xs text-emerald-200/90">
                  Resposta rápida e certeira!
                </p>
              </div>
            </div>
          ) : roundWinner !== null ? (
            <div className="text-xs text-slate-400">
              {roundWinner === 'skipped'
                ? 'Questão saltada.'
                : `O Jogador ${roundWinner} respondeu primeiro!`}
            </div>
          ) : input.feedback ? (
            <div className="flex items-start gap-2 text-rose-300 animate-pop-settle">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold">{input.feedback.title}</div>
                <p className="text-xs text-rose-200/90 leading-snug">
                  {input.feedback.message}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 leading-relaxed">
              Insere o numerador e o denominador e confirma para ganhar o ponto.
            </div>
          )}
        </div>
      </div>

      {/* Split Numeric Keypad with Physical Keycap Badges */}
      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            disabled={isRoundOver}
            onClick={() => onDigit(digit)}
            className="relative h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 disabled:opacity-45 active:scale-[0.97] border border-slate-700/80 font-math text-lg font-bold text-white transition-all cursor-pointer flex items-center justify-center"
          >
            <span>{digit}</span>
            {keyHints?.[digit] && (
              <span className="absolute top-1 right-1.5 text-[10px] font-math text-slate-400">
                {keyHints[digit]}
              </span>
            )}
          </button>
        ))}

        <button
          type="button"
          disabled={isRoundOver}
          onClick={onToggleField}
          className="h-11 rounded-xl bg-slate-800/70 hover:bg-slate-700 disabled:opacity-45 border border-slate-700/80 text-[11px] font-semibold text-slate-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>{toggleKeyHint}</span>
        </button>

        <button
          type="button"
          disabled={isRoundOver}
          onClick={() => onDigit('0')}
          className="relative h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 disabled:opacity-45 active:scale-[0.97] border border-slate-700/80 font-math text-lg font-bold text-white transition-all cursor-pointer flex items-center justify-center"
        >
          <span>0</span>
          {keyHints?.['0'] && (
            <span className="absolute top-1 right-1.5 text-[10px] font-math text-slate-400">
              {keyHints['0']}
            </span>
          )}
        </button>

        <button
          type="button"
          disabled={isRoundOver}
          onClick={onBackspace}
          className="h-11 rounded-xl bg-slate-800/70 hover:bg-slate-700 disabled:opacity-45 border border-slate-700/80 text-xs font-semibold text-slate-300 flex items-center justify-center gap-1 cursor-pointer transition-colors"
          aria-label={`Apagar dígito Jogador ${player}`}
        >
          <Delete className="w-4 h-4" />
          <span>{deleteKeyHint}</span>
        </button>
      </div>

      {/* Player Submit CTA */}
      <button
        type="button"
        disabled={isRoundOver}
        onClick={onSubmit}
        className={`w-full h-11 rounded-xl font-display font-bold text-sm transition-all cursor-pointer disabled:opacity-45 ${submitBg}`}
      >
        Confirmar ({submitKeyHint})
      </button>
    </section>
  );
}
