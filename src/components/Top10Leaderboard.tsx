import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { DifficultyLevel, LEVEL_CONFIGS } from '../game/fractions';
import { GameRecord, fetchLeaderboard } from '../game/recordsApi';
import { AvatarBadge } from './Avatars';

interface Top10LeaderboardProps {
  level: DifficultyLevel;
  turma?: string;
  highlightRecordId?: string | null;
  refreshKey?: number;
}

export function Top10Leaderboard({
  level,
  turma,
  highlightRecordId,
  refreshKey = 0,
}: Top10LeaderboardProps) {
  const [scope, setScope] = useState<'all' | 'turma'>(turma ? 'turma' : 'all');
  const [entries, setEntries] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLeaderboard(level, scope === 'turma' ? turma : undefined).then((data) => {
      if (!cancelled) {
        setEntries(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [level, scope, turma, refreshKey]);

  return (
    <div className="bg-slate-900/75 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
          <h2 className="text-sm font-semibold text-white">
            Top 10 Melhores Jogadores · Nível {level} ({LEVEL_CONFIGS[level].title})
          </h2>
        </div>

        {turma && (
          <div className="inline-flex p-0.5 bg-slate-950 border border-slate-800 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setScope('turma')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                scope === 'turma' ? 'bg-sky-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Turma {turma}
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                scope === 'all' ? 'bg-sky-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Geral
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-4 text-center text-xs text-slate-400">
          A carregar classificação...
        </div>
      ) : entries.length === 0 ? (
        <div className="py-4 text-center text-xs text-slate-400">
          Ainda não há registos neste nível. És o primeiro!
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {entries.map((entry, idx) => {
            const isCurrent = highlightRecordId && entry.id === highlightRecordId;
            const rankColor =
              idx === 0
                ? 'text-amber-300'
                : idx === 1
                ? 'text-slate-200'
                : idx === 2
                ? 'text-orange-300'
                : 'text-slate-500';
            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-xs ${
                  isCurrent
                    ? 'bg-emerald-950/40 border-emerald-500/60'
                    : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`font-math font-bold w-6 text-center shrink-0 ${rankColor}`}>
                    #{idx + 1}
                  </span>
                  <AvatarBadge avatarId={entry.avatarId} size="xs" />
                  <div className="min-w-0">
                    <span className="font-semibold text-white truncate block">
                      {entry.playerName}
                      {isCurrent ? ' (Tu)' : ''}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {entry.turma} · {entry.accuracy}% precisão
                    </span>
                  </div>
                </div>
                <div className="font-math font-bold text-sm text-amber-300 shrink-0">
                  {entry.score} pts
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
