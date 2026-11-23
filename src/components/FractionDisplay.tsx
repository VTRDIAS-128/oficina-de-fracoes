interface FractionDisplayProps {
  num: number | string;
  den: number | string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  colorClass?: string;
  className?: string;
}

export function FractionDisplay({
  num,
  den,
  size = 'md',
  colorClass = 'text-slate-100',
  className = '',
}: FractionDisplayProps) {
  const sizeStyles = {
    sm: { text: 'text-sm', bar: 'my-0.5 h-[1.5px] min-w-[1.25rem]' },
    md: { text: 'text-lg', bar: 'my-1 h-[2px] min-w-[1.75rem]' },
    lg: { text: 'text-2xl sm:text-3xl', bar: 'my-1.5 h-[2.5px] min-w-[2.5rem]' },
    xl: { text: 'text-3xl sm:text-4xl font-bold', bar: 'my-2 h-[3px] min-w-[3.25rem]' },
  }[size];

  return (
    <span
      className={`inline-flex flex-col items-center justify-center font-math leading-none select-none ${colorClass} ${className}`}
    >
      <span className={`${sizeStyles.text} px-1`}>{num}</span>
      <span className={`w-full bg-current rounded-full opacity-80 ${sizeStyles.bar}`} />
      <span className={`${sizeStyles.text} px-1`}>{den}</span>
    </span>
  );
}
