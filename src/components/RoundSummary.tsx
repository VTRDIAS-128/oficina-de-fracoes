import { useState } from 'react';
import { Award, RotateCcw, ArrowRight, Home, ChevronDown, ChevronUp, Check, X, Timer } from 'lucide-react';
import {
  DifficultyLevel,
  GameMode,
  LEVEL_CONFIGS,
  MisconceptionType,
  OperationMode,
  QuestionAttempt,
  formatFractionText,
} from '../game/fractions';
import { AvatarBadge } from './Avatars';
import { PlayerProfile } from './PlayerSetup';
import { Top10Leaderboard } from './Top10Leaderboard';

interface RoundSummaryProps {
  level: DifficultyLevel;
  mode: OperationMode;
  gameMode: GameMode;
  score: number;
  bestStreak: number;
  attempts: QuestionAttempt[];
  playerProfile: PlayerProfile | null;
  savedRecordId: string | null;
  leaderboardRefreshKey: number;
  isPreviewMode?: boolean;
  onPlayAgain: () => void;
  onNextLevel: () => void;
  onBackToMenu: () => void;
}

function getTutorAdvice(
  attempts: QuestionAttempt[],
  accuracy: number,
  level: DifficultyLevel
): string {
  const counts: Partial<Record<MisconceptionType, number>> = {};
  let totalHints = 0;
  for (const a of attempts) {
    totalHints += a.hintsUsed;
    for (const m of a.misconceptions) {
      counts[m] = (counts[m] ?? 0) + 1;
    }
  }

  if ((counts.added_denominators ?? 0) >= 1 || (counts.subtracted_denominators ?? 0) >= 1) {
    return 'Regra de ouro a recordar: nunca se somam nem se subtraem os denominadores! Usa a Bancada Visual para dividir as barras até terem o mesmo tamanho de partes e opera apenas nos numeradores.';
  }
  if ((counts.forgot_scale_numerator ?? 0) >= 1) {
    return 'Encontraste bem o denominador comum, mas lembra-te: se multiplicas o denominador por um número, tens de multiplicar o numerador pelo mesmo número para manter a fração equivalente.';
  }
  if ((counts.wrong_operation ?? 0) >= 1) {
    return 'Atenção redobrada ao sinal (+ ou −) no modo misto! Confirma sempre se a questão pede para juntar ou retirar antes de calcular.';
  }
  if ((counts.needs_simplification ?? 0) >= 1) {
    return 'Estás a calcular corretamente o valor, só falta dar o toque final da simplificação: procura um divisor comum ao numerador e ao denominador (como 2, 3 ou 5).';
  }
  if (accuracy >= 85 && level < 4) {
    return `Desempenho notável no nível ${LEVEL_CONFIGS[level].title}! Já dominas esta etapa — experimenta avançar para o nível ${LEVEL_CONFIGS[(level + 1) as DifficultyLevel].title}.`;
  }
  if (accuracy >= 85 && level === 4) {
    return 'Domínio completo das frações! Conseguiste operar com denominadores diferentes, frações impróprias e simplificação com elevada precisão.';
  }
  if (totalHints >= 5) {
    return 'Usaste várias dicas nesta ronda — ótimo para consolidar o método! Experimenta jogar outra ronda tentando usar menos dicas para testar a tua autonomia.';
  }
  const timeouts = attempts.filter((a) => a.timedOut).length;
  if (timeouts >= 2) {
    return 'O relógio apertou em algumas questões! Experimenta praticar no modo Prática Livre para ganhar agilidade no denominador comum e volta ao Time Attack para bater o teu recorde.';
  }
  return 'Bom esforço! Continua a usar a divisão visual das barras para confirmar o tamanho das partes antes de fechar a resposta.';
}

export function RoundSummary({
  level,
  mode,
  gameMode,
  score,
  bestStreak,
  attempts,
  playerProfile,
  savedRecordId,
  leaderboardRefreshKey,
  isPreviewMode = false,
  onPlayAgain,
  onNextLevel,
  onBackToMenu,
}: RoundSummaryProps) {
  const [showReview, setShowReview] = useState(false);

  const total = attempts.length;
  const firstTryCount = attempts.filter((a) => a.correctOnFirstTry).length;
  const finalCorrectCount = attempts.filter((a) => a.finalCorrect).length;
  const accuracy = total > 0 ? Math.round((firstTryCount / total) * 100) : 0;
  const avgTime =
    total > 0
      ? (attempts.reduce((sum, a) => sum + a.timeSeconds, 0) / total).toFixed(1)
      : '0.0';

  const addAttempts = attempts.filter((a) => a.question.op === 'add');
  const subAttempts = attempts.filter((a) => a.question.op === 'sub');
  const diffDenAttempts = attempts.filter((a) => a.question.requiresCommonDen);
  const sameDenAttempts = attempts.filter((a) => !a.question.requiresCommonDen);

  const calcRate = (list: QuestionAttempt[]) =>
    list.length > 0
      ? Math.round((list.filter((a) => a.correctOnFirstTry).length / list.length) * 100)
      : null;

  const addRate = calcRate(addAttempts);
  const subRate = calcRate(subAttempts);
  const sameDenRate = calcRate(sameDenAttempts);
  const diffDenRate = calcRate(diffDenAttempts);

  const rating =
    accuracy >= 90
      ? { label: 'Mestre das Frações', stars: 3, accent: 'text-emerald-400' }
      : accuracy >= 70
      ? { label: 'Excelente Progresso', stars: 2, accent: 'text-sky-400' }
      : accuracy >= 50
      ? { label: 'Bom Treino', stars: 1, accent: 'text-amber-400' }
      : { label: 'Em Evolução', stars: 1, accent: 'text-amber-300' };

  const advice = getTutorAdvice(attempts, accuracy, level);
  const canAdvance = level < 4 && accuracy >= 60;
  const modeLabel = mode === 'add' ? 'Adição' : mode === 'sub' ? 'Subtração' : 'Misto';
  const totalSpeedBonus = attempts.reduce((sum, a) => sum + (a.speedBonus ?? 0), 0);

  return (
    <div className="min-h-screen w-full bg-[#0B1320] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-3xl bg-[#111C2E] border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 animate-pop-settle">
        {/* Header Summary */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="flex items-start gap-3.5">
            {playerProfile && (
              <AvatarBadge avatarId={playerProfile.avatarId} size="lg" className="mt-0.5" />
            )}
            <div className="flex flex-col gap-1">
              <div className="text-xs font-medium text-slate-400">
                {playerProfile ? `${playerProfile.name} · Turma ${playerProfile.turma} · ` : ''}
                Nível {level} ({LEVEL_CONFIGS[level].title}) · {modeLabel}
                {gameMode === 'time_attack' ? ' · Time Attack' : ''}
              </div>
              <h1 className={`font-display text-2xl sm:text-3xl font-extrabold ${rating.accent}`}>
                {rating.label}
              </h1>
              <p className="text-sm text-slate-300">
                Acertaste {firstTryCount} de {total} à primeira tentativa ({finalCorrectCount} resolvidas no total).
                {gameMode === 'time_attack' && totalSpeedBonus > 0
                  ? ` Ganhaste +${totalSpeedBonus} pts de bónus de rapidez!`
                  : ''}
              </p>
              {isPreviewMode && (
                <p className="text-xs text-amber-300 pt-0.5">
                  Pré-visualização de Modo Aluno · Este resultado de teste não foi guardado nos registos oficiais da turma.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5" aria-label={`${rating.stars} de 3 estrelas`}>
            {[1, 2, 3].map((s) => (
              <Award
                key={s}
                className={`w-7 h-7 ${
                  s <= rating.stars ? 'text-amber-400 fill-amber-400/20' : 'text-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 4 KPI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs text-slate-400">Precisão (1.ª tent.)</div>
            <div className="font-math text-2xl font-bold text-white mt-0.5">{accuracy}%</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs text-slate-400">Pontuação</div>
            <div className="font-math text-2xl font-bold text-amber-300 mt-0.5">{score}</div>
          </div>
          {gameMode === 'time_attack' ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <Timer className="w-3.5 h-3.5 text-rose-400" />
                <span>Bónus Rapidez</span>
              </div>
              <div className="font-math text-2xl font-bold text-rose-300 mt-0.5">+{totalSpeedBonus}</div>
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400">Melhor Sequência</div>
              <div className="font-math text-2xl font-bold text-emerald-300 mt-0.5">{bestStreak}</div>
            </div>
          )}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs text-slate-400">Tempo Médio</div>
            <div className="font-math text-2xl font-bold text-sky-300 mt-0.5">{avgTime}s</div>
          </div>
        </div>

        {/* Skill Breakdown Bars */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-200">
            Análise por Competência
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {addRate !== null && (
              <SkillBar label={`Adição (${addAttempts.length} questões)`} percent={addRate} color="bg-sky-400" />
            )}
            {subRate !== null && (
              <SkillBar label={`Subtração (${subAttempts.length} questões)`} percent={subRate} color="bg-amber-400" />
            )}
            {sameDenRate !== null && (
              <SkillBar label="Mesmo denominador" percent={sameDenRate} color="bg-emerald-400" />
            )}
            {diffDenRate !== null && (
              <SkillBar label="Denominadores diferentes" percent={diffDenRate} color="bg-indigo-400" />
            )}
          </div>
        </div>

        {/* Personalized Pedagogical Advice */}
        <div className="bg-slate-900/90 border border-sky-500/30 rounded-xl p-4">
          <div className="text-xs font-semibold text-sky-300 mb-1">
            Feedback Personalizado
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">
            {advice}
          </p>
        </div>

        {/* Top 10 Melhores Jogadores */}
        <Top10Leaderboard
          level={level}
          turma={playerProfile?.turma}
          highlightRecordId={savedRecordId}
          refreshKey={leaderboardRefreshKey}
        />

        {/* Expandable Question Review */}
        <div>
          <button
            type="button"
            onClick={() => setShowReview((v) => !v)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
          >
            {showReview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span>{showReview ? 'Ocultar revisão das questões' : 'Ver revisão detalhada das questões'}</span>
          </button>

          {showReview && (
            <div className="mt-3 max-h-56 overflow-y-auto flex flex-col gap-2 pr-1">
              {attempts.map((a, idx) => {
                const q = a.question;
                const opSym = q.op === 'add' ? '+' : '−';
                return (
                  <div
                    key={q.id}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-slate-900/70 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      {a.correctOnFirstTry ? (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="text-slate-400 font-math">#{idx + 1}</span>
                      <span className="font-math text-sm text-white">
                        {formatFractionText(q.left)} {opSym} {formatFractionText(q.right)} ={' '}
                        <strong className="text-emerald-300">
                          {formatFractionText(q.simplifiedResult)}
                        </strong>
                      </span>
                    </div>
                    <div className="text-slate-400 font-math whitespace-nowrap">
                      {a.timedOut
                        ? 'Tempo esgotado'
                        : a.correctOnFirstTry
                        ? '1.ª tentativa'
                        : `Tua resposta: ${formatFractionText(a.userAnswer)}`}
                      {a.speedBonus ? ` · +${a.speedBonus} rapidez` : ''}
                      {a.hintsUsed > 0 ? ` · ${a.hintsUsed} dica(s)` : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onBackToMenu}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Home className="w-4 h-4" />
            <span>Mudar Nível</span>
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onPlayAgain}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-sm font-bold transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Jogar Novamente</span>
            </button>

            {canAdvance && (
              <button
                type="button"
                onClick={onNextLevel}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Nível Seguinte</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SkillBar({
  label,
  percent,
  color,
}: {
  label: string;
  percent: number;
  color: string;
}) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-300 font-medium">{label}</span>
        <span className="font-math font-bold text-white">{percent}%</span>
      </div>
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-transform duration-300 origin-left ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
