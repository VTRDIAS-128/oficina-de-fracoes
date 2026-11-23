import { useState } from 'react';
import { ArrowLeft, Play, Users } from 'lucide-react';
import {
  DifficultyLevel,
  GameMode,
  LEVEL_CONFIGS,
  OperationMode,
} from '../game/fractions';
import { soundEngine } from '../game/audio';
import { AVATAR_OPTIONS, AvatarBadge, AvatarId } from './Avatars';

export interface PlayerProfile {
  name: string;
  avatarId: AvatarId;
  turma: string;
}

interface PlayerSetupProps {
  level: DifficultyLevel;
  operationMode: OperationMode;
  gameMode: GameMode;
  availableClasses: string[];
  initialTurma: string;
  initialProfile: PlayerProfile | null;
  initialP2Profile: PlayerProfile | null;
  onBack: () => void;
  onConfirm: (p1: PlayerProfile, p2?: PlayerProfile) => void;
}

export function PlayerSetup({
  level,
  operationMode,
  gameMode,
  availableClasses,
  initialTurma,
  initialProfile,
  initialP2Profile,
  onBack,
  onConfirm,
}: PlayerSetupProps) {
  const [name1, setName1] = useState(initialProfile?.name ?? '');
  const [avatar1, setAvatar1] = useState<AvatarId>(initialProfile?.avatarId ?? 'lobo');

  const [name2, setName2] = useState(initialP2Profile?.name ?? '');
  const [avatar2, setAvatar2] = useState<AvatarId>(initialP2Profile?.avatarId ?? 'aguia');

  const defaultTurma = initialTurma || initialProfile?.turma || availableClasses[0] || '6.º A';
  const [turma, setTurma] = useState(defaultTurma);
  const [customTurma, setCustomTurma] = useState('');
  const [useCustomTurma, setUseCustomTurma] = useState(
    Boolean(defaultTurma && !availableClasses.includes(defaultTurma))
  );

  const effectiveTurma = (useCustomTurma ? customTurma : turma).trim() || '6.º A';
  const isDuel = gameMode === 'duel';

  const isP1Valid = name1.trim().length >= 2;
  const isP2Valid = !isDuel || name2.trim().length >= 2;
  const canStart = isP1Valid && isP2Valid;

  const levelCfg = LEVEL_CONFIGS[level];
  const opLabel =
    operationMode === 'add' ? 'Adição' : operationMode === 'sub' ? 'Subtração' : 'Misto';
  const modeLabel =
    gameMode === 'time_attack'
      ? 'Time Attack'
      : gameMode === 'duel'
      ? 'Modo Duelo'
      : 'Prática Livre';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canStart) return;
    soundEngine.playSubdivide();
    const p1: PlayerProfile = {
      name: name1.trim(),
      avatarId: avatar1,
      turma: effectiveTurma,
    };
    if (isDuel) {
      const p2: PlayerProfile = {
        name: name2.trim(),
        avatarId: avatar2,
        turma: effectiveTurma,
      };
      onConfirm(p1, p2);
    } else {
      onConfirm(p1);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B1320] text-slate-100 flex items-center justify-center p-4 sm:p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl bg-[#111C2E] border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 animate-pop-settle"
      >
        {/* Top Navigation & Selected Level Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              onBack();
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Alterar Nível</span>
          </button>

          <div className="text-xs sm:text-sm text-slate-300 font-medium">
            Nível {level} · <strong className="text-white">{levelCfg.title}</strong> · {opLabel} ·{' '}
            <span className="text-sky-300">{modeLabel}</span>
          </div>
        </div>

        {/* Heading */}
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            {isDuel ? 'Ficha dos Jogadores' : 'Ficha do Aluno'}
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            {isDuel
              ? 'Escrevam os vossos nomes, escolham a turma e um logótipo para começar o duelo.'
              : 'Escreve o teu nome, indica a tua turma e escolhe um logótipo para aceder ao jogo.'}
          </p>
        </div>

        {/* Turma Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-300">
            Turma
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {availableClasses.map((cls) => {
              const active = !useCustomTurma && turma === cls;
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => {
                    soundEngine.playTap();
                    setUseCustomTurma(false);
                    setTurma(cls);
                  }}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    active
                      ? 'bg-sky-500 text-slate-950 border-sky-400'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {cls}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                setUseCustomTurma(true);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                useCustomTurma
                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                  : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
            >
              Outra turma
            </button>
          </div>
          {useCustomTurma && (
            <input
              type="text"
              value={customTurma}
              onChange={(e) => setCustomTurma(e.target.value)}
              maxLength={40}
              placeholder="Ex.: 6.º D"
              className="mt-1 w-full sm:w-64 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
            />
          )}
        </div>

        {/* Player 1 & Optional Player 2 Fields */}
        <div className={`grid gap-6 ${isDuel ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
          <PlayerIdentitySection
            title={isDuel ? 'Jogador 1 (Esquerda)' : 'O teu nome e logótipo'}
            accentClass={isDuel ? 'text-sky-300' : 'text-white'}
            name={name1}
            onChangeName={setName1}
            selectedAvatar={avatar1}
            onSelectAvatar={setAvatar1}
            autoFocus
            compact={isDuel}
          />

          {isDuel && (
            <PlayerIdentitySection
              title="Jogador 2 (Direita)"
              accentClass="text-amber-300"
              name={name2}
              onChangeName={setName2}
              selectedAvatar={avatar2}
              onSelectAvatar={setAvatar2}
              compact
            />
          )}
        </div>

        {/* Start Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <span className="text-xs text-slate-400">
            {canStart
              ? 'Tudo pronto! O teu resultado será registado no Top 10 deste nível.'
              : 'Preenche o nome (mínimo 2 letras) para desbloquear o jogo.'}
          </span>

          <button
            type="submit"
            disabled={!canStart}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 font-display font-bold text-base transition-colors cursor-pointer whitespace-nowrap"
          >
            {isDuel ? <Users className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            <span>Entrar no Jogo</span>
          </button>
        </div>
      </form>
    </div>
  );
}

function PlayerIdentitySection({
  title,
  accentClass,
  name,
  onChangeName,
  selectedAvatar,
  onSelectAvatar,
  autoFocus = false,
  compact = false,
}: {
  title: string;
  accentClass: string;
  name: string;
  onChangeName: (v: string) => void;
  selectedAvatar: AvatarId;
  onSelectAvatar: (id: AvatarId) => void;
  autoFocus?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <AvatarBadge avatarId={selectedAvatar} size="md" />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-bold ${accentClass}`}>{title}</div>
          <input
            type="text"
            value={name}
            onChange={(e) => onChangeName(e.target.value)}
            maxLength={40}
            autoFocus={autoFocus}
            placeholder="Escreve o teu primeiro e último nome..."
            className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-slate-400">
          Escolhe um logótipo (6.º ano)
        </span>
        <div
          className={`grid gap-2 ${
            compact ? 'grid-cols-5' : 'grid-cols-2 sm:grid-cols-5'
          }`}
        >
          {AVATAR_OPTIONS.map((opt) => {
            const active = selectedAvatar === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  onSelectAvatar(opt.id);
                }}
                className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  active
                    ? 'bg-slate-800 border-sky-400 ring-1 ring-sky-400/60'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-600'
                }`}
              >
                <AvatarBadge avatarId={opt.id} size="sm" />
                <span className="text-[11px] font-medium text-slate-200 truncate w-full text-center">
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
