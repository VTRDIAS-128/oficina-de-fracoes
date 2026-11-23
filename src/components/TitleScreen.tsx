import { Volume2, VolumeX, Play, Timer, BookOpen, Users, GraduationCap, Eye, EyeOff } from 'lucide-react';
import {
  DifficultyLevel,
  GameMode,
  LEVEL_CONFIGS,
  LevelBestStats,
  OperationMode,
  TIME_LIMITS,
} from '../game/fractions';
import { soundEngine } from '../game/audio';

interface TitleScreenProps {
  selectedLevel: DifficultyLevel;
  onSelectLevel: (level: DifficultyLevel) => void;
  selectedMode: OperationMode;
  onSelectMode: (mode: OperationMode) => void;
  gameMode: GameMode;
  onSelectGameMode: (mode: GameMode) => void;
  savedStats: Partial<Record<DifficultyLevel, LevelBestStats>>;
  activeTurma: string;
  isStudentView: boolean;
  isPreviewMode: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onProceedToSetup: (level: DifficultyLevel) => void;
  onOpenTeacherPanel: () => void;
  onEnterStudentPreview: () => void;
  onExitStudentPreview: () => void;
}

const BACKDROP_URL =
  '/src/assets/images/fraction_atelier_backdrop_1795275151668.jpg';

const MODES: { id: OperationMode; label: string; symbol: string }[] = [
  { id: 'add', label: 'Adição', symbol: '+' },
  { id: 'sub', label: 'Subtração', symbol: '−' },
  { id: 'mixed', label: 'Misto', symbol: '±' },
];

export function TitleScreen({
  selectedLevel,
  onSelectLevel,
  selectedMode,
  onSelectMode,
  gameMode,
  onSelectGameMode,
  savedStats,
  activeTurma,
  isStudentView,
  isPreviewMode,
  muted,
  onToggleMute,
  onProceedToSetup,
  onOpenTeacherPanel,
  onEnterStudentPreview,
  onExitStudentPreview,
}: TitleScreenProps) {
  const levels: DifficultyLevel[] = [1, 2, 3, 4];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#09101D] flex flex-col justify-between">
      {/* Illustrated Key-Art Backdrop with CSS fallback */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0F1B2E] via-[#0B1320] to-[#1A1410]" aria-hidden="true">
        <img
          src={BACKDROP_URL}
          alt="Bancada de madeira e lousa com blocos geométricos de frações"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-right opacity-85"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        {/* Measured scrim keeping left/center high contrast while showing wooden fraction pieces on right */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#09101D]/95 via-[#09101D]/84 to-[#09101D]/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09101D]/90 via-transparent to-[#09101D]/45" />
      </div>

      {/* Top right controls: Teacher Panel / Student Preview & Audio */}
      <div className="relative z-10 flex flex-wrap items-center justify-end gap-2.5 px-6 pt-5 pointer-events-none">
        {!isStudentView && (
          <>
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                onEnterStudentPreview();
              }}
              className="pointer-events-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900/85 border border-slate-700/80 text-xs font-semibold text-emerald-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Eye className="w-4 h-4" />
              <span>Ver como Aluno</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                onOpenTeacherPanel();
              }}
              className="pointer-events-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900/85 border border-slate-700/80 text-xs font-semibold text-sky-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Painel do Professor · Turmas</span>
            </button>
          </>
        )}

        {isPreviewMode && (
          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              onExitStudentPreview();
            }}
            className="pointer-events-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500/15 border border-amber-400/60 text-xs font-semibold text-amber-200 hover:bg-amber-500/25 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <EyeOff className="w-4 h-4" />
            <span>Sair do Modo Aluno</span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleMute}
          className="pointer-events-auto inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/70 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          aria-label={muted ? 'Ativar som' : 'Silenciar som'}
        >
          {muted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          <span>{muted ? 'Som desligado' : 'Som ligado'}</span>
        </button>
      </div>

      {/* Main Title Content positioned over calm left/center negative space */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex-1 flex items-center">
        <div className="w-full max-w-2xl flex flex-col gap-6">
          {/* Bespoke SVG Title Lockup */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <svg
                width="52"
                height="52"
                viewBox="0 0 52 52"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0"
                aria-hidden="true"
              >
                <rect width="52" height="52" rx="12" fill="#132238" stroke="#334155" strokeWidth="1.5" />
                <rect x="12" y="11" width="28" height="10" rx="3" fill="#0EA5E9" />
                <line x1="10" y1="26" x2="42" y2="26" stroke="#F8FAFC" strokeWidth="2.5" strokeLinecap="round" />
                <rect x="12" y="31" width="13" height="10" rx="3" fill="#F59E0B" />
                <rect x="27" y="31" width="13" height="10" rx="3" fill="#10B981" />
              </svg>
              <div>
                <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white [text-wrap:balance]">
                  Oficina das Frações
                </h1>
              </div>
            </div>
            <p className="text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed">
              Aprende a adicionar e subtrair frações passo a passo com barras e discos visuais interativos.
            </p>
          </div>

          {/* Operation Mode & Game Mode Selectors */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-2 flex-1 min-w-[240px]">
              <span className="text-xs font-medium text-slate-400">
                Operação
              </span>
              <div
                className="inline-flex w-full p-1 bg-slate-900/90 border border-slate-700/80 rounded-xl gap-1"
                role="group"
                aria-label="Tipo de operação"
              >
                {MODES.map((m) => {
                  const active = selectedMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playTap();
                        onSelectMode(m.id);
                      }}
                      className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 ${
                        active
                          ? 'bg-amber-400 text-slate-950 shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                      }`}
                    >
                      <span className="font-math text-base leading-none">{m.symbol}</span>
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2 flex-1 min-w-[240px]">
              <span className="text-xs font-medium text-slate-400">
                Ritmo de jogo
              </span>
              <div
                className="inline-flex w-full p-1 bg-slate-900/90 border border-slate-700/80 rounded-xl gap-1"
                role="group"
                aria-label="Modo de jogo"
              >
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTap();
                    onSelectGameMode('practice');
                  }}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 ${
                    gameMode === 'practice'
                      ? 'bg-sky-400 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>Prática Livre</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTap();
                    onSelectGameMode('time_attack');
                  }}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 ${
                    gameMode === 'time_attack'
                      ? 'bg-rose-400 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <Timer className="w-4 h-4 shrink-0" />
                  <span>Time Attack</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTap();
                    onSelectGameMode('duel');
                  }}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 ${
                    gameMode === 'duel'
                      ? 'bg-emerald-400 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Modo Duelo</span>
                </button>
              </div>
            </div>
          </div>

          {/* Difficulty Levels Grid */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-slate-400">
              {gameMode === 'time_attack'
                ? 'Clica num nível para identificar-te e iniciar · Temporizador e bónus de rapidez'
                : gameMode === 'duel'
                ? 'Clica num nível para registar Jogador 1 e Jogador 2 · J1: Q–V + Espaço · J2: 0–9 + Enter'
                : 'Clica no nível que queres praticar (8 questões por ronda)'}
              {activeTurma ? ` · Turma: ${activeTurma}` : ''}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {levels.map((lvl) => {
                const cfg = LEVEL_CONFIGS[lvl];
                const isSelected = selectedLevel === lvl;
                const best = savedStats[lvl];
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      soundEngine.playTap();
                      onSelectLevel(lvl);
                      onProceedToSetup(lvl);
                    }}
                    className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-slate-800/95 border-sky-400 ring-1 ring-sky-400/60'
                        : 'bg-slate-900/80 border-slate-700/70 hover:border-sky-400/60 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-display text-base font-bold text-white">
                        {lvl}. {cfg.title}
                      </span>
                      <span className="text-xs font-math text-amber-300 whitespace-nowrap">
                        {cfg.pointsPerCorrect} pts
                        {gameMode === 'time_attack' ? ` · ${TIME_LIMITS[lvl]}s` : ''}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-sky-300">
                      {cfg.subtitle}
                    </div>
                    <p className="text-xs text-slate-400 leading-snug">
                      {cfg.ruleSummary}
                    </p>
                    {best && (
                      <div className="pt-1 text-[11px] font-math text-emerald-300/90">
                        Melhor: {best.bestAccuracy}% ·{' '}
                        {gameMode === 'time_attack' && best.bestTimeAttackScore
                          ? `Time Attack ${best.bestTimeAttackScore} pts`
                          : `${best.bestScore} pts`}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Start Action */}
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <button
              type="button"
              onClick={() => {
                soundEngine.playSubdivide();
                onProceedToSetup(selectedLevel);
              }}
              className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-display font-bold text-lg transition-all cursor-pointer shadow-lg shadow-emerald-950/50 whitespace-nowrap"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Escolher Nível {selectedLevel} e Identificar-se</span>
            </button>
          </div>
        </div>
      </main>

      {/* Single flat control-hint line */}
      <footer className="relative z-10 px-6 pb-5">
        <p className="max-w-6xl mx-auto text-xs text-slate-400">
          Clica ou usa o teclado · Números 0–9 para responder · Tab alterna numerador e denominador · Enter confirma · H pede dica
        </p>
      </footer>
    </div>
  );
}
