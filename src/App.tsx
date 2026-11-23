import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Delete,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  AlertCircle,
  Home,
  ArrowUpDown,
  Timer,
} from 'lucide-react';
import {
  DifficultyLevel,
  EvaluationResult,
  FractionQuestion,
  GameMode,
  LEVEL_CONFIGS,
  LevelBestStats,
  MisconceptionType,
  OperationMode,
  QuestionAttempt,
  evaluateAnswer,
  generateRoundQuestions,
  getHintsForQuestion,
  getStepByStepSolution,
  getTimeLimitForLevel,
  loadSavedStats,
  saveLevelStats,
} from './game/fractions';
import { soundEngine } from './game/audio';
import { fetchClasses, saveGameRecord } from './game/recordsApi';
import { AvatarBadge } from './components/Avatars';
import { FractionDisplay } from './components/FractionDisplay';
import { FractionVisual, VisualMode } from './components/FractionVisual';
import { TitleScreen } from './components/TitleScreen';
import { PlayerProfile, PlayerSetup } from './components/PlayerSetup';
import { RoundSummary } from './components/RoundSummary';
import { DuelArena, DuelPlayerStats, DuelRoundRecord } from './components/DuelArena';
import { DuelSummary } from './components/DuelSummary';
import { TeacherPanel } from './components/TeacherPanel';

type GameState = 'TITLE_MENU' | 'PLAYER_SETUP' | 'PLAYING' | 'PAUSED' | 'ROUND_SUMMARY';
type ActiveField = 'num' | 'den';

const QUESTIONS_PER_ROUND = 8;

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [selectedLevel, setSelectedLevel] = useState<DifficultyLevel>(1);
  const [selectedMode, setSelectedMode] = useState<OperationMode>('mixed');
  const [gameMode, setGameMode] = useState<GameMode>('practice');
  const [savedStats, setSavedStats] = useState<Partial<Record<DifficultyLevel, LevelBestStats>>>(() =>
    loadSavedStats()
  );
  const [muted, setMuted] = useState(false);

  // Active round state
  const [questions, setQuestions] = useState<FractionQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [attemptsHistory, setAttemptsHistory] = useState<QuestionAttempt[]>([]);

  // Active question interaction state
  const [numInput, setNumInput] = useState('');
  const [denInput, setDenInput] = useState('');
  const [activeField, setActiveField] = useState<ActiveField>('num');
  const [visualMode, setVisualMode] = useState<VisualMode>('bars');
  const [subdivisionDen, setSubdivisionDen] = useState<number | null>(null);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [currentTryCount, setCurrentTryCount] = useState(0);
  const [currentMisconceptions, setCurrentMisconceptions] = useState<MisconceptionType[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [questionResolved, setQuestionResolved] = useState(false);
  const [shakeBoard, setShakeBoard] = useState(false);

  // Time Attack timer state
  const [timeLeftMs, setTimeLeftMs] = useState<number>(() => getTimeLimitForLevel(1) * 1000);
  const [lastSpeedBonus, setLastSpeedBonus] = useState<number>(0);
  const lastTickSecRef = useRef<number | null>(null);

  // Duel Mode state
  const [duelKey, setDuelKey] = useState(0);
  const [duelResult, setDuelResult] = useState<{
    p1: DuelPlayerStats;
    p2: DuelPlayerStats;
    records: DuelRoundRecord[];
  } | null>(null);

  // Student Profile & Teacher / Classroom Integration
  const [availableClasses, setAvailableClasses] = useState<string[]>(['6.º A', '6.º B', '6.º C']);
  const [urlTurma, setUrlTurma] = useState<string>('');
  const [studentPreview, setStudentPreview] = useState<boolean>(false);
  const [previewTurma, setPreviewTurma] = useState<string>('');
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [p2Profile, setP2Profile] = useState<PlayerProfile | null>(null);
  const [showTeacherPanel, setShowTeacherPanel] = useState(false);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const [leaderboardRefreshKey, setLeaderboardRefreshKey] = useState(0);

  const questionStartRef = useRef<number>(Date.now());

  useEffect(() => {
    fetchClasses().then(setAvailableClasses);
    const params = new URLSearchParams(window.location.search);
    const turmaParam = params.get('turma')?.trim() ?? '';
    const nivelParam = Number(params.get('nivel'));
    if (turmaParam) {
      setUrlTurma(turmaParam);
    }
    if ([1, 2, 3, 4].includes(nivelParam)) {
      setSelectedLevel(nivelParam as DifficultyLevel);
    }
  }, []);

  const currentQuestion: FractionQuestion | undefined = questions[currentIndex];

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const resetQuestionState = useCallback((lvl: DifficultyLevel) => {
    setNumInput('');
    setDenInput('');
    setActiveField('num');
    setSubdivisionDen(null);
    setHintsRevealed(0);
    setCurrentTryCount(0);
    setCurrentMisconceptions([]);
    setEvaluation(null);
    setQuestionResolved(false);
    setShakeBoard(false);
    setLastSpeedBonus(0);
    const limitMs = getTimeLimitForLevel(lvl) * 1000;
    setTimeLeftMs(limitMs);
    lastTickSecRef.current = getTimeLimitForLevel(lvl);
    questionStartRef.current = Date.now();
  }, []);

  const startRound = useCallback(
    (level: DifficultyLevel, mode: OperationMode) => {
      const generated = generateRoundQuestions(level, mode, QUESTIONS_PER_ROUND);
      setQuestions(generated);
      setCurrentIndex(0);
      setScore(0);
      setStreak(0);
      setBestStreak(0);
      setAttemptsHistory([]);
      setDuelResult(null);
      setDuelKey((k) => k + 1);
      resetQuestionState(level);
      setGameState('PLAYING');
    },
    [resetQuestionState]
  );

  const handleDigitInput = useCallback(
    (digit: string) => {
      if (questionResolved) return;
      soundEngine.playTap();
      if (activeField === 'num') {
        setNumInput((prev) => (prev.length >= 3 ? prev : prev === '0' ? digit : prev + digit));
      } else {
        setDenInput((prev) => (prev.length >= 3 ? prev : prev === '0' ? digit : prev + digit));
      }
    },
    [activeField, questionResolved]
  );

  const handleBackspace = useCallback(() => {
    if (questionResolved) return;
    soundEngine.playTap();
    if (activeField === 'num') {
      setNumInput((prev) => prev.slice(0, -1));
    } else {
      setDenInput((prev) => prev.slice(0, -1));
    }
  }, [activeField, questionResolved]);

  const handleToggleField = useCallback(() => {
    if (questionResolved) return;
    soundEngine.playTap();
    setActiveField((prev) => (prev === 'num' ? 'den' : 'num'));
  }, [questionResolved]);

  const handleRequestHint = useCallback(() => {
    if (!currentQuestion || questionResolved || hintsRevealed >= 3) return;
    soundEngine.playHint();
    const nextTier = hintsRevealed + 1;
    setHintsRevealed(nextTier);
    if (nextTier >= 2 && currentQuestion.requiresCommonDen) {
      setSubdivisionDen(currentQuestion.commonDen);
    }
  }, [currentQuestion, hintsRevealed, questionResolved]);

  const handleTimeout = useCallback(() => {
    if (!currentQuestion || questionResolved) return;
    const limitSec = getTimeLimitForLevel(selectedLevel);
    soundEngine.playError();
    setStreak(0);
    setQuestionResolved(true);
    setShakeBoard(true);
    setTimeout(() => setShakeBoard(false), 240);

    if (currentQuestion.requiresCommonDen) {
      setSubdivisionDen(currentQuestion.commonDen);
    }

    setEvaluation({
      status: 'incorrect',
      misconception: null,
      title: 'Tempo esgotado!',
      message: `O tempo terminou antes de confirmares a resposta. A fração correta é ${currentQuestion.simplifiedResult.num}/${currentQuestion.simplifiedResult.den}. Observa os passos abaixo!`,
      steps: getStepByStepSolution(currentQuestion),
    });

    setAttemptsHistory((prev) => [
      ...prev,
      {
        question: currentQuestion,
        userAnswer: { num: 0, den: 1 },
        correctOnFirstTry: false,
        attemptsCount: currentTryCount,
        hintsUsed: hintsRevealed,
        timeSeconds: limitSec,
        misconceptions: currentMisconceptions,
        finalCorrect: false,
        pointsEarned: 0,
        speedBonus: 0,
        timedOut: true,
      },
    ]);
  }, [currentMisconceptions, currentQuestion, currentTryCount, hintsRevealed, questionResolved, selectedLevel]);

  // Countdown loop for Time Attack mode
  useEffect(() => {
    if (gameState !== 'PLAYING' || gameMode !== 'time_attack' || questionResolved || !currentQuestion) {
      return;
    }

    let lastFrame = Date.now();
    const interval = window.setInterval(() => {
      const now = Date.now();
      const dt = now - lastFrame;
      lastFrame = now;

      setTimeLeftMs((prev) => {
        const next = Math.max(0, prev - dt);
        const sec = Math.ceil(next / 1000);
        if (sec > 0 && sec <= 5 && lastTickSecRef.current !== sec) {
          lastTickSecRef.current = sec;
          soundEngine.playTimerTick();
        }
        return next;
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [currentQuestion, gameMode, gameState, questionResolved]);

  // Trigger timeout handler when timeLeftMs hits 0
  useEffect(() => {
    if (
      gameState === 'PLAYING' &&
      gameMode === 'time_attack' &&
      !questionResolved &&
      timeLeftMs <= 0
    ) {
      handleTimeout();
    }
  }, [gameMode, gameState, handleTimeout, questionResolved, timeLeftMs]);

  const handleNextQuestion = useCallback(() => {
    soundEngine.playTap();
    if (currentIndex + 1 >= questions.length) {
      // Round complete
      const firstTryCorrect = attemptsHistory.filter((a) => a.correctOnFirstTry).length;
      const accuracy =
        questions.length > 0 ? Math.round((firstTryCorrect / questions.length) * 100) : 0;

      if (!studentPreview) {
        const updated = saveLevelStats(selectedLevel, score, accuracy, gameMode);
        setSavedStats(updated);

        const avgTime =
          attemptsHistory.length > 0
            ? attemptsHistory.reduce((s, a) => s + a.timeSeconds, 0) / attemptsHistory.length
            : 0;
        const totalHints = attemptsHistory.reduce((s, a) => s + a.hintsUsed, 0);
        const totalSpeed = attemptsHistory.reduce((s, a) => s + (a.speedBonus ?? 0), 0);

        if (playerProfile) {
          saveGameRecord({
            playerName: playerProfile.name,
            avatarId: playerProfile.avatarId,
            turma: playerProfile.turma,
            level: selectedLevel,
            operationMode: selectedMode,
            gameMode,
            score,
            accuracy,
            bestStreak,
            avgTimeSeconds: avgTime,
            hintsUsed: totalHints,
            speedBonus: totalSpeed,
          }).then((saved) => {
            setSavedRecordId(saved.id);
            setLeaderboardRefreshKey((k) => k + 1);
          });
        }
      }

      soundEngine.playVictory();
      setGameState('ROUND_SUMMARY');
    } else {
      setCurrentIndex((prev) => prev + 1);
      resetQuestionState(selectedLevel);
    }
  }, [
    attemptsHistory,
    bestStreak,
    currentIndex,
    gameMode,
    playerProfile,
    questions.length,
    resetQuestionState,
    score,
    selectedLevel,
    selectedMode,
    studentPreview,
  ]);

  const handleSubmitAnswer = useCallback(() => {
    if (!currentQuestion) return;

    if (questionResolved) {
      handleNextQuestion();
      return;
    }

    if (numInput === '' || denInput === '') {
      setShakeBoard(true);
      setTimeout(() => setShakeBoard(false), 240);
      if (numInput === '') setActiveField('num');
      else setActiveField('den');
      soundEngine.playWarning();
      return;
    }

    const parsedNum = parseInt(numInput, 10);
    const parsedDen = parseInt(denInput, 10);
    const userAnswer = { num: parsedNum, den: parsedDen };
    const result = evaluateAnswer(currentQuestion, userAnswer, selectedLevel);
    const nextTryCount = currentTryCount + 1;
    setCurrentTryCount(nextTryCount);
    setEvaluation(result);

    if (result.status === 'correct') {
      const elapsedSec = Math.max(1, (Date.now() - questionStartRef.current) / 1000);
      const isFirstTry = nextTryCount === 1;
      const newStreak = isFirstTry ? streak + 1 : 0;
      const nextBestStreak = Math.max(bestStreak, newStreak);

      const basePoints = LEVEL_CONFIGS[selectedLevel].pointsPerCorrect;
      const hintPenalty = hintsRevealed * 25;
      const retryMultiplier = isFirstTry ? 1 : 0.5;
      const streakBonus = isFirstTry && newStreak >= 2 ? (newStreak - 1) * 20 : 0;

      const totalLimitMs = getTimeLimitForLevel(selectedLevel) * 1000;
      const speedBonus =
        gameMode === 'time_attack'
          ? Math.max(10, Math.round((timeLeftMs / totalLimitMs) * 100 * retryMultiplier))
          : 0;

      const earned =
        Math.max(25, Math.round((basePoints - hintPenalty) * retryMultiplier) + streakBonus) +
        speedBonus;

      setLastSpeedBonus(speedBonus);
      setScore((prev) => prev + earned);
      setStreak(newStreak);
      setBestStreak(nextBestStreak);
      setQuestionResolved(true);
      soundEngine.playCorrect(newStreak || 1);

      if (currentQuestion.requiresCommonDen) {
        setSubdivisionDen(currentQuestion.commonDen);
      }

      setAttemptsHistory((prev) => [
        ...prev,
        {
          question: currentQuestion,
          userAnswer,
          correctOnFirstTry: isFirstTry,
          attemptsCount: nextTryCount,
          hintsUsed: hintsRevealed,
          timeSeconds: elapsedSec,
          misconceptions: currentMisconceptions,
          finalCorrect: true,
          pointsEarned: earned,
          speedBonus,
        },
      ]);
      return;
    }

    if (result.status === 'equivalent_unsimplified') {
      // Allow immediate retry to simplify without resetting or losing
      if (result.misconception) {
        setCurrentMisconceptions((prev) => [...prev, result.misconception!]);
      }
      soundEngine.playWarning();
      setShakeBoard(true);
      setTimeout(() => setShakeBoard(false), 240);
      setNumInput('');
      setDenInput('');
      setActiveField('num');
      return;
    }

    // Incorrect
    soundEngine.playError();
    setStreak(0);
    setShakeBoard(true);
    setTimeout(() => setShakeBoard(false), 240);

    const updatedMisconceptions = result.misconception
      ? [...currentMisconceptions, result.misconception]
      : currentMisconceptions;
    setCurrentMisconceptions(updatedMisconceptions);

    // After 2 failed attempts on the same question, reveal solution and mark resolved so student learns and moves on smoothly
    if (nextTryCount >= 2) {
      const elapsedSec = Math.max(1, (Date.now() - questionStartRef.current) / 1000);
      setQuestionResolved(true);
      if (currentQuestion.requiresCommonDen) {
        setSubdivisionDen(currentQuestion.commonDen);
      }
      setAttemptsHistory((prev) => [
        ...prev,
        {
          question: currentQuestion,
          userAnswer,
          correctOnFirstTry: false,
          attemptsCount: nextTryCount,
          hintsUsed: hintsRevealed,
          timeSeconds: elapsedSec,
          misconceptions: updatedMisconceptions,
          finalCorrect: false,
          pointsEarned: 0,
        },
      ]);
    } else {
      // First wrong attempt: let student try once more after reading the misconception feedback!
      setNumInput('');
      setDenInput('');
      setActiveField('num');
    }
  }, [
    bestStreak,
    currentMisconceptions,
    currentQuestion,
    currentTryCount,
    denInput,
    gameMode,
    handleNextQuestion,
    hintsRevealed,
    numInput,
    questionResolved,
    selectedLevel,
    streak,
    timeLeftMs,
  ]);

  // Global Keyboard Navigation & Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showTeacherPanel) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowTeacherPanel(false);
        }
        return;
      }

      if (gameState === 'TITLE_MENU') {
        if (e.key === 'Enter' || e.key === ' ') {
          // Only trigger setup if user isn't pressing space/enter on a specific option button
          const tag = (e.target as HTMLElement | null)?.tagName;
          if (tag !== 'BUTTON') {
            e.preventDefault();
            soundEngine.playTap();
            setGameState('PLAYER_SETUP');
          }
        }
        return;
      }

      if (gameState === 'PAUSED') {
        if (e.key === 'Escape') {
          e.preventDefault();
          setGameState('PLAYING');
        }
        return;
      }

      if (gameState === 'PLAYING' && gameMode !== 'duel') {
        if (e.key === 'Escape') {
          e.preventDefault();
          setGameState('PAUSED');
          return;
        }
        if (/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          handleDigitInput(e.key);
          return;
        }
        if (e.key === 'Backspace') {
          e.preventDefault();
          handleBackspace();
          return;
        }
        if (e.key === 'Tab' || e.key === '/' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          handleToggleField();
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSubmitAnswer();
          return;
        }
        if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          handleRequestHint();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    gameMode,
    gameState,
    handleBackspace,
    handleDigitInput,
    handleRequestHint,
    handleSubmitAnswer,
    handleToggleField,
    selectedLevel,
    selectedMode,
    showTeacherPanel,
    startRound,
  ]);

  const effectiveInitialTurma = previewTurma || urlTurma;
  const isStudentView = Boolean(urlTurma) || studentPreview;

  if (gameState === 'TITLE_MENU') {
    return (
      <>
        <TitleScreen
          selectedLevel={selectedLevel}
          onSelectLevel={setSelectedLevel}
          selectedMode={selectedMode}
          onSelectMode={setSelectedMode}
          gameMode={gameMode}
          onSelectGameMode={setGameMode}
          savedStats={savedStats}
          activeTurma={effectiveInitialTurma || playerProfile?.turma || ''}
          isStudentView={isStudentView}
          isPreviewMode={studentPreview}
          muted={muted}
          onToggleMute={toggleMute}
          onProceedToSetup={(lvl) => {
            setSelectedLevel(lvl);
            setGameState('PLAYER_SETUP');
          }}
          onOpenTeacherPanel={() => setShowTeacherPanel(true)}
          onEnterStudentPreview={() => {
            setPreviewTurma('');
            setStudentPreview(true);
          }}
          onExitStudentPreview={() => {
            setStudentPreview(false);
            setPreviewTurma('');
          }}
        />
        {showTeacherPanel && !urlTurma && (
          <TeacherPanel
            onClose={() => setShowTeacherPanel(false)}
            onClassesUpdated={setAvailableClasses}
            onTestAsStudent={(turma, suggestedLevel) => {
              setShowTeacherPanel(false);
              setPreviewTurma(turma);
              if (suggestedLevel) {
                setSelectedLevel(suggestedLevel);
              }
              setStudentPreview(true);
            }}
          />
        )}
      </>
    );
  }

  if (gameState === 'PLAYER_SETUP') {
    return (
      <PlayerSetup
        level={selectedLevel}
        operationMode={selectedMode}
        gameMode={gameMode}
        availableClasses={availableClasses}
        initialTurma={effectiveInitialTurma}
        initialProfile={playerProfile}
        initialP2Profile={p2Profile}
        onBack={() => setGameState('TITLE_MENU')}
        onConfirm={(p1, p2) => {
          setPlayerProfile(p1);
          if (p2) setP2Profile(p2);
          setSavedRecordId(null);
          startRound(selectedLevel, selectedMode);
        }}
      />
    );
  }

  if (gameState === 'ROUND_SUMMARY') {
    if (gameMode === 'duel' && duelResult) {
      return (
        <DuelSummary
          level={selectedLevel}
          mode={selectedMode}
          p1={duelResult.p1}
          p2={duelResult.p2}
          p1Profile={playerProfile}
          p2Profile={p2Profile}
          savedRecordId={savedRecordId}
          leaderboardRefreshKey={leaderboardRefreshKey}
          isPreviewMode={studentPreview}
          records={duelResult.records}
          onPlayAgain={() => startRound(selectedLevel, selectedMode)}
          onBackToMenu={() => setGameState('TITLE_MENU')}
        />
      );
    }

    return (
      <RoundSummary
        level={selectedLevel}
        mode={selectedMode}
        gameMode={gameMode}
        score={score}
        bestStreak={bestStreak}
        attempts={attemptsHistory}
        playerProfile={playerProfile}
        savedRecordId={savedRecordId}
        leaderboardRefreshKey={leaderboardRefreshKey}
        isPreviewMode={studentPreview}
        onPlayAgain={() => startRound(selectedLevel, selectedMode)}
        onNextLevel={() => {
          const nextLvl = Math.min(4, selectedLevel + 1) as DifficultyLevel;
          setSelectedLevel(nextLvl);
          setSavedRecordId(null);
          startRound(nextLvl, selectedMode);
        }}
        onBackToMenu={() => setGameState('TITLE_MENU')}
      />
    );
  }

  if (!currentQuestion) return null;

  const levelCfg = LEVEL_CONFIGS[selectedLevel];

  const pauseModal = gameState === 'PAUSED' && (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Jogo em Pausa"
    >
      <div className="w-full max-w-sm bg-[#111C2E] border border-slate-700 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl animate-pop-settle">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-white">Jogo em Pausa</h2>
          <p className="text-xs text-slate-400 mt-1">
            Nível {selectedLevel} ({levelCfg.title}) · Questão {currentIndex + 1} de {questions.length}
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => setGameState('PLAYING')}
            className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Retomar</span>
          </button>

          <button
            type="button"
            onClick={() => startRound(selectedLevel, selectedMode)}
            className="w-full h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reiniciar Ronda</span>
          </button>

          <button
            type="button"
            onClick={() => setGameState('TITLE_MENU')}
            className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-sm inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Voltar ao Menu</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (gameMode === 'duel') {
    return (
      <>
        <DuelArena
          key={duelKey}
          level={selectedLevel}
          questions={questions}
          currentIndex={currentIndex}
          p1Profile={playerProfile}
          p2Profile={p2Profile}
          muted={muted}
          isPaused={gameState === 'PAUSED'}
          onToggleMute={toggleMute}
          onPause={() => setGameState('PAUSED')}
          onAdvanceIndex={setCurrentIndex}
          onFinishDuel={(p1, p2, records) => {
            setDuelResult({ p1, p2, records });
            const totalQ = records.length || QUESTIONS_PER_ROUND;
            const p1Acc = Math.round((p1.wins / totalQ) * 100);
            const p2Acc = Math.round((p2.wins / totalQ) * 100);

            const saves: Promise<{ id: string }>[] = [];
            if (!studentPreview && playerProfile) {
              saves.push(
                saveGameRecord({
                  playerName: playerProfile.name,
                  avatarId: playerProfile.avatarId,
                  turma: playerProfile.turma,
                  level: selectedLevel,
                  operationMode: selectedMode,
                  gameMode: 'duel',
                  score: p1.score,
                  accuracy: p1Acc,
                  bestStreak: p1.bestStreak,
                  avgTimeSeconds: 0,
                  hintsUsed: 0,
                  speedBonus: 0,
                })
              );
            }
            if (!studentPreview && p2Profile) {
              saves.push(
                saveGameRecord({
                  playerName: p2Profile.name,
                  avatarId: p2Profile.avatarId,
                  turma: p2Profile.turma,
                  level: selectedLevel,
                  operationMode: selectedMode,
                  gameMode: 'duel',
                  score: p2.score,
                  accuracy: p2Acc,
                  bestStreak: p2.bestStreak,
                  avgTimeSeconds: 0,
                  hintsUsed: 0,
                  speedBonus: 0,
                })
              );
            }
            if (saves.length > 0) {
              Promise.all(saves).then((res) => {
                const winnerIdx = p2.score > p1.score && res[1] ? 1 : 0;
                setSavedRecordId(res[winnerIdx]?.id ?? null);
                setLeaderboardRefreshKey((k) => k + 1);
              });
            }
            setGameState('ROUND_SUMMARY');
          }}
        />
        {pauseModal}
      </>
    );
  }

  const hints = getHintsForQuestion(currentQuestion);
  const progressPercent = ((currentIndex + (questionResolved ? 1 : 0)) / questions.length) * 100;
  const opSymbol = currentQuestion.op === 'add' ? '+' : '−';

  // Time Attack visual countdown calculations
  const totalLimitSec = getTimeLimitForLevel(selectedLevel);
  const totalLimitMs = totalLimitSec * 1000;
  const timeLeftSec = Math.ceil(timeLeftMs / 1000);
  const timerRatio = Math.max(0, Math.min(1, timeLeftMs / totalLimitMs));
  const ringRadius = 11;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - timerRatio);
  const isTimerUrgent = gameMode === 'time_attack' && timeLeftSec <= 5 && !questionResolved;
  const isTimerWarn = gameMode === 'time_attack' && timeLeftSec <= 10 && timeLeftSec > 5 && !questionResolved;

  return (
    <div className="min-h-screen w-full bg-[#0B1320] text-slate-100 flex flex-col">
      {/* Subtle Top Progress Line */}
      <div className="w-full h-1 bg-slate-800">
        <div
          className="h-full bg-emerald-400 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Unobstructed Top Perimeter HUD */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-2 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-300">
          {playerProfile && (
            <div className="flex items-center gap-2 pr-1">
              <AvatarBadge avatarId={playerProfile.avatarId} size="xs" />
              <span className="font-semibold text-white truncate max-w-[140px]">
                {playerProfile.name}
              </span>
              <span className="text-slate-500 hidden sm:inline" aria-hidden="true">·</span>
              <span className="text-slate-400 hidden sm:inline">{playerProfile.turma}</span>
              <span className="text-slate-600" aria-hidden="true">/</span>
            </div>
          )}
          <span className="font-display font-bold text-white">
            Nível {selectedLevel} · {levelCfg.title}
          </span>
          <span className="text-slate-500" aria-hidden="true">/</span>
          <span className="font-math text-sky-300 font-semibold">
            Questão {currentIndex + 1} de {questions.length}
          </span>
          {gameMode === 'time_attack' && (
            <>
              <span className="text-slate-500 hidden sm:inline" aria-hidden="true">/</span>
              <span className="text-rose-300 font-medium hidden sm:inline">Time Attack</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          {/* Time Attack Visual Countdown Counter */}
          {gameMode === 'time_attack' && (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors ${
                isTimerUrgent
                  ? 'bg-rose-950/70 border-rose-500 text-rose-200'
                  : isTimerWarn
                  ? 'bg-amber-950/60 border-amber-500/70 text-amber-200'
                  : 'bg-slate-900/90 border-slate-700 text-slate-100'
              }`}
              role="timer"
              aria-live="polite"
              aria-label={`Tempo restante: ${timeLeftSec} segundos`}
            >
              <svg width="28" height="28" viewBox="0 0 28 28" className="-rotate-90 shrink-0" aria-hidden="true">
                <circle
                  cx="14"
                  cy="14"
                  r={ringRadius}
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity={0.2}
                  strokeWidth="3"
                />
                <circle
                  cx="14"
                  cy="14"
                  r={ringRadius}
                  fill="none"
                  stroke={isTimerUrgent ? '#FB7185' : isTimerWarn ? '#FBBF24' : '#38BDF8'}
                  strokeWidth="3"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="flex items-center gap-1.5">
                <Timer
                  className={`w-4 h-4 shrink-0 ${
                    isTimerUrgent ? 'text-rose-400' : isTimerWarn ? 'text-amber-400' : 'text-sky-400'
                  }`}
                />
                <span className="font-math text-base font-bold tabular-nums min-w-[2.25rem]">
                  {String(timeLeftSec).padStart(2, '0')}s
                </span>
                {isTimerUrgent && (
                  <span className="text-[11px] font-semibold text-rose-300 hidden md:inline">
                    Rápido!
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs sm:text-sm">
            <span className="text-slate-400">
              Pontos:{' '}
              <strong className="font-math text-amber-300 text-base">{score}</strong>
            </span>
            <span className="text-slate-400 hidden sm:inline">
              Sequência:{' '}
              <strong className="font-math text-emerald-300 text-base">{streak}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={toggleMute}
              className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/70 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              aria-label={muted ? 'Ativar som' : 'Silenciar som'}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
            </button>
            <button
              type="button"
              onClick={() => setGameState('PAUSED')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/70 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pausa</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Playfield */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Zone: Interactive Visual Workbench (7 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          <FractionVisual
            question={currentQuestion}
            visualMode={visualMode}
            onChangeVisualMode={setVisualMode}
            subdivisionDen={subdivisionDen}
            onChangeSubdivision={setSubdivisionDen}
            showResultPreview={questionResolved}
          />

          {/* Progressive 3-Tier Hints Panel */}
          {hintsRevealed > 0 && (
            <div className="bg-[#111C2E] border border-amber-500/40 rounded-2xl p-4 flex flex-col gap-2 animate-pop-settle">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4" />
                  <span>Dicas ({hintsRevealed}/3)</span>
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {hints.slice(0, hintsRevealed).map((h, i) => (
                  <p key={i} className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    <span className="font-math text-amber-300 font-semibold">{i + 1}.</span> {h}
                  </p>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Right Zone: Equation & Input Deck (5 cols) */}
        <section
          className={`lg:col-span-5 bg-[#111C2E] border border-slate-700/70 rounded-2xl p-5 flex flex-col gap-5 shadow-lg ${
            shakeBoard ? 'animate-gentle-shake' : ''
          }`}
        >
          {/* Operation Header */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-400">
              {currentQuestion.op === 'add' ? 'Adição de Frações' : 'Subtração de Frações'}
              {levelCfg.requireSimplified ? ' · Simplifica a resposta' : ''}
            </span>
            <button
              type="button"
              onClick={handleRequestHint}
              disabled={questionResolved || hintsRevealed >= 3}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-amber-300 border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Dica ({hintsRevealed}/3)</span>
            </button>
          </div>

          {/* Large Mathematical Equation */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl py-5 px-4 flex items-center justify-center gap-3 sm:gap-5">
            <FractionDisplay
              num={currentQuestion.left.num}
              den={currentQuestion.left.den}
              size="xl"
              colorClass="text-sky-300"
            />
            <span className="font-math text-3xl sm:text-4xl font-bold text-slate-200">
              {opSymbol}
            </span>
            <FractionDisplay
              num={currentQuestion.right.num}
              den={currentQuestion.right.den}
              size="xl"
              colorClass="text-amber-300"
            />
            <span className="font-math text-3xl sm:text-4xl font-bold text-slate-300">=</span>

            {/* Interactive Fraction Answer Box */}
            {questionResolved ? (
              <FractionDisplay
                num={currentQuestion.simplifiedResult.num}
                den={currentQuestion.simplifiedResult.den}
                size="xl"
                colorClass="text-emerald-400"
              />
            ) : (
              <div className="inline-flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTap();
                    setActiveField('num');
                  }}
                  aria-label="Campo do numerador"
                  className={`min-w-[3.75rem] h-12 px-2 rounded-lg font-math text-2xl sm:text-3xl font-bold flex items-center justify-center border-2 transition-colors cursor-pointer ${
                    activeField === 'num'
                      ? 'bg-slate-800 border-sky-400 text-white ring-2 ring-sky-400/30'
                      : 'bg-slate-950/70 border-slate-700 text-slate-200 hover:border-slate-500'
                  }`}
                >
                  {numInput || <span className="text-slate-600">?</span>}
                </button>
                <span className="w-16 h-[3px] bg-slate-200 rounded-full" />
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTap();
                    setActiveField('den');
                  }}
                  aria-label="Campo do denominador"
                  className={`min-w-[3.75rem] h-12 px-2 rounded-lg font-math text-2xl sm:text-3xl font-bold flex items-center justify-center border-2 transition-colors cursor-pointer ${
                    activeField === 'den'
                      ? 'bg-slate-800 border-sky-400 text-white ring-2 ring-sky-400/30'
                      : 'bg-slate-950/70 border-slate-700 text-slate-200 hover:border-slate-500'
                  }`}
                >
                  {denInput || <span className="text-slate-600">?</span>}
                </button>
              </div>
            )}
          </div>

          {/* Evaluation / Diagnostic Feedback Banner */}
          {evaluation && (
            <div
              className={`rounded-xl p-4 border animate-pop-settle flex flex-col gap-2 ${
                evaluation.status === 'correct'
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100'
                  : evaluation.status === 'equivalent_unsimplified'
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-100'
                  : 'bg-rose-950/40 border-rose-500/50 text-rose-100'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {evaluation.status === 'correct' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle
                    className={`w-5 h-5 shrink-0 mt-0.5 ${
                      evaluation.status === 'equivalent_unsimplified'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  />
                )}
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold">{evaluation.title}</span>
                    {evaluation.status === 'correct' && lastSpeedBonus > 0 && (
                      <span className="text-xs font-math font-semibold text-amber-300">
                        · +{lastSpeedBonus} rapidez
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed opacity-95">
                    {evaluation.message}
                  </p>
                  {evaluation.simplificationTip && (
                    <p className="text-xs text-emerald-300 font-medium pt-0.5">
                      {evaluation.simplificationTip}
                    </p>
                  )}
                </div>
              </div>

              {/* Show full step-by-step resolution once question is resolved */}
              {questionResolved && (
                <div className="pt-2 mt-1 border-t border-white/10 flex flex-col gap-1">
                  <span className="text-xs font-semibold opacity-85">
                    Resolução passo a passo
                  </span>
                  {evaluation.steps.map((step, i) => (
                    <p key={i} className="text-xs leading-snug opacity-90">
                      {step}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Touch-Friendly Numeric Keypad (>= 44px touch targets) or Next Button */}
          {!questionResolved ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleDigitInput(digit)}
                    className="h-12 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:scale-[0.97] border border-slate-700/80 font-math text-lg font-bold text-white transition-all cursor-pointer"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleToggleField}
                  className="h-12 rounded-xl bg-slate-800/70 hover:bg-slate-700 border border-slate-700/80 text-xs font-semibold text-sky-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Alternar entre Numerador e Denominador (Tab)"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  <span>{activeField === 'num' ? 'Ir p/ Den' : 'Ir p/ Num'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDigitInput('0')}
                  className="h-12 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:scale-[0.97] border border-slate-700/80 font-math text-lg font-bold text-white transition-all cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  aria-label="Apagar dígito"
                  className="h-12 rounded-xl bg-slate-800/70 hover:bg-slate-700 border border-slate-700/80 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleSubmitAnswer}
                className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-display font-bold text-base transition-all cursor-pointer shadow-md"
              >
                Verificar Resposta
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              className="w-full h-12 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-[0.99] text-slate-950 font-display font-bold text-base inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <span>
                {currentIndex + 1 >= questions.length
                  ? 'Ver Relatório de Desempenho'
                  : 'Próxima Questão'}
              </span>
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </section>
      </main>

      {/* Pause Modal */}
      {pauseModal}
    </div>
  );
}
