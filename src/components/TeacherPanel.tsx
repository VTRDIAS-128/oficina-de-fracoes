import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Plus,
  Trash2,
  Users,
  X,
  BarChart3,
  Eye,
} from 'lucide-react';
import { DifficultyLevel, LEVEL_CONFIGS } from '../game/fractions';
import {
  GameRecord,
  addClass,
  buildClassroomShareLink,
  buildTurmaShareUrl,
  deleteClass,
  fetchAllRecords,
  fetchClasses,
  getExportCsvUrl,
} from '../game/recordsApi';
import { AvatarBadge } from './Avatars';

interface TeacherPanelProps {
  onClose: () => void;
  onClassesUpdated: (classes: string[]) => void;
  onTestAsStudent: (turma: string, suggestedLevel?: DifficultyLevel) => void;
}

export function TeacherPanel({ onClose, onClassesUpdated, onTestAsStudent }: TeacherPanelProps) {
  const [activeTab, setActiveTab] = useState<'records' | 'share'>('records');
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedTurma, setSelectedTurma] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<DifficultyLevel | 'all'>('all');
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [newClassName, setNewClassName] = useState('');
  const [shareLevel, setShareLevel] = useState<DifficultyLevel | undefined>(undefined);
  const [copiedTurma, setCopiedTurma] = useState<string | null>(null);
  const [confirmDeleteTurma, setConfirmDeleteTurma] = useState<string | null>(null);
  const [deleteClassRecords, setDeleteClassRecords] = useState(false);

  useEffect(() => {
    fetchClasses().then((list) => {
      setClasses(list);
      onClassesUpdated(list);
    });
  }, [onClassesUpdated]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAllRecords(selectedTurma, selectedLevel).then((data) => {
      if (!cancelled) {
        setRecords(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedTurma, selectedLevel]);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newClassName.trim();
    if (!clean) return;
    const updated = await addClass(clean);
    setClasses(updated);
    onClassesUpdated(updated);
    setNewClassName('');
  };

  const handleConfirmDeleteClass = async (cls: string) => {
    const updated = await deleteClass(cls, deleteClassRecords);
    setClasses(updated);
    onClassesUpdated(updated);
    if (selectedTurma.toLowerCase() === cls.toLowerCase()) {
      setSelectedTurma('all');
    } else if (deleteClassRecords) {
      fetchAllRecords(selectedTurma, selectedLevel).then(setRecords);
    }
    setConfirmDeleteTurma(null);
    setDeleteClassRecords(false);
  };

  const handleCopyLink = async (turma: string) => {
    const link = buildTurmaShareUrl(turma, shareLevel);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedTurma(turma);
      setTimeout(() => setCopiedTurma(null), 2000);
    } catch {
      // Clipboard blocked in some contexts
    }
  };

  const uniqueStudents = new Set(records.map((r) => `${r.turma}:${r.playerName.toLowerCase()}`)).size;
  const avgAccuracy =
    records.length > 0
      ? Math.round(records.reduce((sum, r) => sum + r.accuracy, 0) / records.length)
      : 0;
  const topScore = records.length > 0 ? Math.max(...records.map((r) => r.score)) : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Painel do Professor"
    >
      <div className="w-full max-w-5xl max-h-[90vh] bg-[#111C2E] border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-pop-settle">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              Painel do Professor · Turmas e Registos
            </h2>
            <p className="text-xs text-slate-400">
              Acompanha os resultados dos alunos por turma e partilha o jogo no Google Classroom.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
            aria-label="Fechar painel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('records')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-t-lg border-b-2 transition-colors cursor-pointer inline-flex items-center gap-2 ${
              activeTab === 'records'
                ? 'border-sky-400 text-sky-300 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Registos por Turma</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('share')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-t-lg border-b-2 transition-colors cursor-pointer inline-flex items-center gap-2 ${
              activeTab === 'share'
                ? 'border-emerald-400 text-emerald-300 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Turmas & Google Classroom</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          {activeTab === 'records' ? (
            <>
              {/* Filters & Export */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedTurma}
                    onChange={(e) => setSelectedTurma(e.target.value)}
                    aria-label="Filtrar por turma"
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-medium text-white focus:outline-none focus:border-sky-400"
                  >
                    <option value="all">Todas as turmas</option>
                    {classes.map((c) => (
                      <option key={c} value={c}>
                        Turma {c}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedLevel === 'all' ? 'all' : String(selectedLevel)}
                    onChange={(e) =>
                      setSelectedLevel(
                        e.target.value === 'all' ? 'all' : (Number(e.target.value) as DifficultyLevel)
                      )
                    }
                    aria-label="Filtrar por nível"
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-medium text-white focus:outline-none focus:border-sky-400"
                  >
                    <option value="all">Todos os níveis</option>
                    {[1, 2, 3, 4].map((l) => (
                      <option key={l} value={l}>
                        Nível {l} · {LEVEL_CONFIGS[l as DifficultyLevel].title}
                      </option>
                    ))}
                  </select>
                </div>

                <a
                  href={getExportCsvUrl(selectedTurma)}
                  download
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar CSV (Excel / Sheets)</span>
                </a>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-xs text-slate-400">Partidas registadas</div>
                  <div className="font-math text-xl font-bold text-white mt-0.5">{records.length}</div>
                </div>
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-xs text-slate-400">Alunos distintos</div>
                  <div className="font-math text-xl font-bold text-sky-300 mt-0.5">{uniqueStudents}</div>
                </div>
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-xs text-slate-400">Precisão média</div>
                  <div className="font-math text-xl font-bold text-emerald-300 mt-0.5">{avgAccuracy}%</div>
                </div>
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-xs text-slate-400">Pontuação máxima</div>
                  <div className="font-math text-xl font-bold text-amber-300 mt-0.5">{topScore}</div>
                </div>
              </div>

              {/* Records Table */}
              {loading ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  A carregar registos...
                </div>
              ) : records.length === 0 ? (
                <div className="py-10 text-center bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-slate-400">
                  Ainda não existem jogos registados para este filtro. Partilha o link da turma para os alunos começarem a jogar!
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                        <th className="py-2.5 px-3 font-semibold">Aluno</th>
                        <th className="py-2.5 px-3 font-semibold">Turma</th>
                        <th className="py-2.5 px-3 font-semibold">Nível</th>
                        <th className="py-2.5 px-3 font-semibold">Modo</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Pontos</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Precisão</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Tempo Médio</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {records.map((rec) => {
                        const modeLabel =
                          rec.gameMode === 'time_attack'
                            ? 'Time Attack'
                            : rec.gameMode === 'duel'
                            ? 'Duelo'
                            : 'Prática';
                        const dateStr = new Date(rec.createdAt).toLocaleDateString('pt-PT', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        return (
                          <tr key={rec.id} className="hover:bg-slate-900/40">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <AvatarBadge avatarId={rec.avatarId} size="xs" />
                                <span className="font-semibold text-white">{rec.playerName}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-sky-300 font-medium">{rec.turma}</td>
                            <td className="py-2.5 px-3 text-slate-300">
                              {rec.level}. {LEVEL_CONFIGS[rec.level].title}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">{modeLabel}</td>
                            <td className="py-2.5 px-3 text-right font-math font-bold text-amber-300">
                              {rec.score}
                            </td>
                            <td className="py-2.5 px-3 text-right font-math text-emerald-300">
                              {rec.accuracy}%
                            </td>
                            <td className="py-2.5 px-3 text-right font-math text-slate-300">
                              {rec.avgTimeSeconds}s
                            </td>
                            <td className="py-2.5 px-3 text-right font-math text-slate-400 whitespace-nowrap">
                              {dateStr}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Create New Turma */}
              <form onSubmit={handleAddClass} className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  maxLength={40}
                  placeholder="Nova turma (ex.: 6.º D)"
                  className="flex-1 min-w-[200px] px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-sm font-bold cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Turma</span>
                </button>
              </form>

              {/* Optional Default Level in Link */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span>Nível sugerido no link de partilha:</span>
                <select
                  value={shareLevel ? String(shareLevel) : 'any'}
                  onChange={(e) =>
                    setShareLevel(
                      e.target.value === 'any'
                        ? undefined
                        : (Number(e.target.value) as DifficultyLevel)
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="any">Aluno escolhe o nível</option>
                  {[1, 2, 3, 4].map((l) => (
                    <option key={l} value={l}>
                      Abrir direto no Nível {l} ({LEVEL_CONFIGS[l as DifficultyLevel].title})
                    </option>
                  ))}
                </select>
              </div>

              {/* Class List with Share to Google Classroom & Delete */}
              {classes.length === 0 ? (
                <div className="py-8 text-center bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-slate-400">
                  Ainda não existem turmas criadas. Adiciona uma turma acima para gerar links para o Google Classroom.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {classes.map((cls) => {
                    const isCopied = copiedTurma === cls;
                    const isConfirmingDelete = confirmDeleteTurma === cls;
                    return (
                      <div
                        key={cls}
                        className="bg-slate-900/75 border border-slate-800 rounded-xl p-4 flex flex-col gap-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display text-base font-bold text-white">
                            Turma {cls}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                              ?turma={encodeURIComponent(cls)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteTurma(isConfirmingDelete ? null : cls);
                                setDeleteClassRecords(false);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/70 border border-slate-700 hover:border-rose-500/60 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                              title={`Apagar turma ${cls}`}
                              aria-label={`Apagar turma ${cls}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {isConfirmingDelete ? (
                          <div className="bg-rose-950/35 border border-rose-500/40 rounded-lg p-3 flex flex-col gap-2.5 animate-pop-settle">
                            <p className="text-xs text-rose-100 font-medium">
                              Apagar a turma <strong>{cls}</strong> da lista?
                            </p>
                            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={deleteClassRecords}
                                onChange={(e) => setDeleteClassRecords(e.target.checked)}
                                className="rounded border-slate-600 bg-slate-900 text-rose-500"
                              />
                              <span>Apagar também os registos de jogos desta turma</span>
                            </label>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmDeleteTurma(null);
                                  setDeleteClassRecords(false);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleConfirmDeleteClass(cls)}
                                className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-bold cursor-pointer"
                              >
                                Confirmar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              href={buildClassroomShareLink(cls, shareLevel)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Partilhar no Google Classroom</span>
                            </a>

                            <button
                              type="button"
                              onClick={() => handleCopyLink(cls)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer transition-colors whitespace-nowrap"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-300">Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copiar Link</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => onTestAsStudent(cls, shareLevel)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-sky-300 hover:text-white cursor-pointer transition-colors whitespace-nowrap"
                              title={`Testar a aplicação exatamente como um aluno da turma ${cls}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Testar como Aluno</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="text-xs text-slate-400 leading-relaxed">
                Cada link preenche automaticamente a turma na ficha do aluno. Quando os alunos terminam uma ronda através do link partilhado no Google Classroom, os resultados ficam guardados no painel <strong>Registos por Turma</strong> e no ranking <strong>Top 10</strong>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
