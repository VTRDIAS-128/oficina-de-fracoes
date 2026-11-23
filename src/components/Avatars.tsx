export type AvatarId =
  | 'lobo'
  | 'aguia'
  | 'raposa'
  | 'coruja'
  | 'tubarao'
  | 'tigre'
  | 'dragao'
  | 'lince'
  | 'foguetao'
  | 'bussola';

export interface AvatarOption {
  id: AvatarId;
  label: string;
  bgClass: string;
  accentHex: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'lobo', label: 'Lobo', bgClass: 'bg-sky-500/15 border-sky-400/50', accentHex: '#38BDF8' },
  { id: 'aguia', label: 'Águia', bgClass: 'bg-amber-500/15 border-amber-400/50', accentHex: '#FBBF24' },
  { id: 'raposa', label: 'Raposa', bgClass: 'bg-orange-500/15 border-orange-400/50', accentHex: '#FB923C' },
  { id: 'coruja', label: 'Coruja', bgClass: 'bg-indigo-500/15 border-indigo-400/50', accentHex: '#818CF8' },
  { id: 'tubarao', label: 'Tubarão', bgClass: 'bg-cyan-500/15 border-cyan-400/50', accentHex: '#22D3EE' },
  { id: 'tigre', label: 'Tigre', bgClass: 'bg-yellow-500/15 border-yellow-400/50', accentHex: '#FACC15' },
  { id: 'dragao', label: 'Dragão', bgClass: 'bg-emerald-500/15 border-emerald-400/50', accentHex: '#34D399' },
  { id: 'lince', label: 'Lince', bgClass: 'bg-violet-500/15 border-violet-400/50', accentHex: '#A78BFA' },
  { id: 'foguetao', label: 'Foguetão', bgClass: 'bg-rose-500/15 border-rose-400/50', accentHex: '#FB7185' },
  { id: 'bussola', label: 'Bússola', bgClass: 'bg-teal-500/15 border-teal-400/50', accentHex: '#2DD4BF' },
];

export function getAvatarMeta(id: string): AvatarOption {
  return AVATAR_OPTIONS.find((a) => a.id === id) ?? AVATAR_OPTIONS[0];
}

function AvatarGlyph({ id, color }: { id: AvatarId; color: string }) {
  switch (id) {
    case 'lobo':
      return (
        <g stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M9 10L12 5L16 9H24L28 5L31 10L29 22L20 33L11 22L9 10Z" fill={color} fillOpacity="0.16" />
          <path d="M14 17L17 19M26 17L23 19M18 26L20 28L22 26" />
        </g>
      );
    case 'aguia':
      return (
        <g stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M6 14L15 11L20 7L25 11L34 14L28 21L20 32L12 21L6 14Z" fill={color} fillOpacity="0.16" />
          <path d="M16 17L20 22L24 17M20 22V27" />
        </g>
      );
    case 'raposa':
      return (
        <g stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M9 8L16 13H24L31 8L30 21L20 32L10 21L9 8Z" fill={color} fillOpacity="0.18" />
          <circle cx="15.5" cy="19" r="1.3" fill={color} />
          <circle cx="24.5" cy="19" r="1.3" fill={color} />
          <path d="M18 26H22" />
        </g>
      );
    case 'coruja':
      return (
        <g stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M10 11L15 8L20 11L25 8L30 11V24C30 29 25 32 20 32C15 32 10 29 10 24V11Z" fill={color} fillOpacity="0.16" />
          <circle cx="15.5" cy="18" r="3" />
          <circle cx="24.5" cy="18" r="3" />
          <path d="M19 22L20 25L21 22" />
        </g>
      );
    case 'tubarao':
      return (
        <g stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M8 26C10 18 15 10 23 7C21 14 23 18 32 21L27 28H10L8 26Z" fill={color} fillOpacity="0.18" />
          <path d="M14 23H24M19 16L21 18" />
        </g>
      );
    case 'tigre':
      return (
        <g stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M9 12C9 8 13 7 16 9H24C27 7 31 8 31 12L29 25L20 32L11 25L9 12Z" fill={color} fillOpacity="0.16" />
          <path d="M13 13L16 15M27 13L24 15M15 19H17M23 19H25M17 25L20 27L23 25" />
        </g>
      );
    case 'dragao':
      return (
        <g stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M12 7L17 12L20 8L23 12L28 7L30 19L24 31L20 28L16 31L10 19L12 7Z" fill={color} fillOpacity="0.18" />
          <path d="M15 18L18 20M25 18L22 20" />
        </g>
      );
    case 'lince':
      return (
        <g stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M10 6L15 12H25L30 6L29 22L20 32L11 22L10 6Z" fill={color} fillOpacity="0.16" />
          <path d="M10 6V11M30 6V11M15 19L17.5 18M25 19L22.5 18M18 25H22" />
        </g>
      );
    case 'foguetao':
      return (
        <g stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M20 6C24 10 26 16 26 23L20 28L14 23C14 16 16 10 20 6Z" fill={color} fillOpacity="0.18" />
          <path d="M14 20L9 25L14 26M26 20L31 25L26 26M18 30L20 34L22 30" />
          <circle cx="20" cy="16" r="2.2" />
        </g>
      );
    case 'bussola':
      return (
        <g stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <circle cx="20" cy="20" r="12" fill={color} fillOpacity="0.14" />
          <polygon points="20,11 23,20 20,29 17,20" fill={color} fillOpacity="0.35" />
          <circle cx="20" cy="20" r="1.5" fill={color} />
        </g>
      );
  }
}

export function AvatarBadge({
  avatarId,
  size = 'md',
  className = '',
}: {
  avatarId: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const meta = getAvatarMeta(avatarId);
  const dims = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-14 h-14',
  }[size];

  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl border shrink-0 ${meta.bgClass} ${dims} ${className}`}
      title={meta.label}
    >
      <svg viewBox="0 0 40 40" className="w-4/5 h-4/5" aria-hidden="true">
        <AvatarGlyph id={meta.id} color={meta.accentHex} />
      </svg>
    </span>
  );
}
