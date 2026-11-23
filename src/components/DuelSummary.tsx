import { Trophy, RotateCcw, Home, Check } from 'lucide-react';
import {
  DifficultyLevel,
  LEVEL_CONFIGS,
  OperationMode,
  formatFractionText,
} from '../game/fractions';
import { AvatarBadge } from './Avatars';
import { DuelPlayerStats, DuelRoundRecord } from './DuelArena';
import { PlayerProfile } from './PlayerSetup';
import { Top10Leaderboard } from './Top10Leaderboard';

interface DuelSummaryProps {
  level: DifficultyLevel;
  mode: OperationMode;
  p1: DuelPlayerStats;
  p2: DuelPlayerStats;
  p1Profile: PlayerProfile | null;
  p2Profile: PlayerProfile | null;
  savedRecordId: string | null;
  leaderboardRefreshKey: number;
  isPreviewMode?: boolean;
  records: DuelRoundRecord[];
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export function DuelSummary({
  level,
  mode,
  p1,
  p2,
  p1Profile,
  p2Profile,
  savedRecordId,
  leaderboardRefreshKey,
  isPreviewMode = false,
  records,
  onPlayAgain,
  onBackToMenu,
}: DuelSummaryProps) {
  const modeLabel = mode === 'add' ? 'Adição' : mode === 'sub' ? 'Subtração' : 'Misto';
  const winner =
    p1.score > p2.score ? 1 : p2.score > p1.score ? 2 : p1.wins > p2.wins ? 1 : p2.wins > p1.wins ? 2 : 0;

  const p1Name = p1Profile?.name || 'Jogador 1';
  const p2Name = p2Profile?.name || 'Jogador 2';

  const headline =
    winner === 1
      ? `Vitória de ${p1Name}!`
      : winner === 2
      ? `Vitória de ${p2Name}!`
      : 'Empate Técnico!';

  const headlineColor =
    winner === 1 ? 'text-sky-400' : winner === 2 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="min-h-screen w-full bg-[#0B1320] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-3xl bg-[#111C2E] border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 animate-pop-settle">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <div className="text-xs font-medium text-slate-400">
              Resultado do Modo Duelo · Nível {level} ({LEVEL_CONFIGS[level].title}) · {modeLabel}
              {p1Profile?.turma ? ` · Turma ${p1Profile.turma}` : ''}
            </div>
            <h1 className={`font-display text-2xl sm:text-3xl font-extrabold mt-1 ${headlineColor}`}>
              {headline}
            </h1>
            {isPreviewMode && (
              <p className="text-xs text-amber-300 mt-1">
                Pré-visualização de Modo Aluno · Este resultado de teste não foi guardado nos registos oficiais da turma.
              </p>
            )}
          </div>
          <Trophy className="w-10 h-10 text-amber-400 shrink-0" />
        </div>

        {/* Head-to-Head Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PlayerSummaryCard
            name={p1Name}
            avatarId={p1Profile?.avatarId ?? 'lobo'}
            stats={p1}
            isWinner={winner === 1}
            accent="sky"
          />
          <PlayerSummaryCard
            name={p2Name}
            avatarId={p2Profile?.avatarId ?? 'aguia'}
            stats={p2}
            isWinner={winner === 2}
            accent="amber"
          />
        </div>

        {/* Top 10 Melhores Jogadores */}
        <Top10Leaderboard
          level={level}
          turma={p1Profile?.turma}
          highlightRecordId={savedRecordId}
          refreshKey={leaderboardRefreshKey}
        />

        {/* Round Log */}
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-slate-200">Resumo das Questões</h2>
          <div className="max-h-52 overflow-y-auto flex flex-col gap-2 pr-1">
            {records.map((rec, idx) => {
              const q = rec.question;
              const opSym = q.op === 'add' ? '+' : '−';
              return (
                <div
                  key={q.id}
                  className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-lg bg-slate-900/70 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-math text-slate-400">#{idx + 1}</span>
                    <span className="font-math text-sm text-white">
                      {formatFractionText(q.left)} {opSym} {formatFractionText(q.right)} ={' '}
                      <strong className="text-emerald-300">
                        {formatFractionText(q.simplifiedResult)}
                      </strong>
                    </span>
                  </div>
                  <div className="font-math font-semibold">
                    {rec.winner === 1 ? (
                      <span className="text-sky-300 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> {p1Name}
                      </span>
                    ) : rec.winner === 2 ? (
                      <span className="text-amber-300 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> {p2Name}
                      </span>
                    ) : (
                      <span className="text-slate-500">Saltada</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onBackToMenu}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Voltar ao Menu</span>
          </button>

          <button
            type="button"
            onClick={onPlayAgain}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Desforra (Jogar Novamente)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayerSummaryCard({
  name,
  avatarId,
  stats,
  isWinner,
  accent,
}: {
  name: string;
  avatarId: string;
  stats: DuelPlayerStats;
  isWinner: boolean;
  accent: 'sky' | 'amber';
}) {
  const titleColor = accent === 'sky' ? 'text-sky-300' : 'text-amber-300';
  const borderColor = isWinner
    ? 'border-emerald-400/70 bg-emerald-950/20'
    : 'border-slate-800 bg-slate-900/70';

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 ${borderColor}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <AvatarBadge avatarId={avatarId} size="sm" />
          <span className={`font-display text-lg font-bold truncate ${titleColor}`}>
            {name}
          </span>
        </div>
        {isWinner && (
          <span className="text-xs font-semibold text-emerald-300 shrink-0">Vencedor</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        <div>
          <div className="text-slate-400">Pontuação</div>
          <div className="font-math text-xl font-bold text-white">{stats.score}</div>
        </div>
        <div>
          <div className="text-slate-400">Questões ganhas</div>
          <div className="font-math text-xl font-bold text-emerald-300">{stats.wins}</div>
        </div>
        <div>
          <div className="text-slate-400">Melhor sequência</div>
          <div className="font-math text-base font-bold text-slate-200">{stats.bestStreak}</div>
        </div>
        <div>
          <div className="text-slate-400">Erros</div>
          <div className="font-math text-base font-bold text-rose-300">{stats.wrongAttempts}</div>
        </div>
      </div>
    </div>
  );
}
