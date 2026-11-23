import { FractionQuestion } from '../game/fractions';
import { soundEngine } from '../game/audio';

export type VisualMode = 'bars' | 'discs';

interface FractionVisualProps {
  question: FractionQuestion;
  visualMode: VisualMode;
  onChangeVisualMode: (mode: VisualMode) => void;
  subdivisionDen: number | null;
  onChangeSubdivision: (den: number | null) => void;
  showResultPreview: boolean;
}

function renderBarSVG(
  num: number,
  den: number,
  subdivideTo: number | null,
  fillColor: string,
  emptyColor: string,
  borderColor: string,
  maxWholes: number
) {
  const effectiveSub =
    subdivideTo && subdivideTo > den && subdivideTo % den === 0 ? subdivideTo : null;
  const totalWholes = Math.max(maxWholes, Math.ceil(num / den));
  const width = 420;
  const height = 44;
  const gapBetweenWholes = 8;
  const wholeWidth = (width - gapBetweenWholes * (totalWholes - 1)) / totalWholes;

  const rects = [];
  for (let w = 0; w < totalWholes; w++) {
    const startX = w * (wholeWidth + gapBetweenWholes);
    const segWidth = wholeWidth / den;

    for (let i = 0; i < den; i++) {
      const globalSliceIndex = w * den + i;
      const isFilled = globalSliceIndex < num;
      const x = startX + i * segWidth;

      rects.push(
        <rect
          key={`seg-${w}-${i}`}
          x={x}
          y={2}
          width={segWidth}
          height={height - 4}
          fill={isFilled ? fillColor : emptyColor}
          stroke={borderColor}
          strokeWidth={1.5}
          rx={2}
        />
      );
    }

    // Draw subdivision dashed lines if subdivided to a common multiple
    if (effectiveSub) {
      const factor = effectiveSub / den;
      const subWidth = wholeWidth / effectiveSub;
      for (let s = 1; s < effectiveSub; s++) {
        if (s % factor === 0) continue; // already a main border
        const sx = startX + s * subWidth;
        rects.push(
          <line
            key={`sub-${w}-${s}`}
            x1={sx}
            y1={4}
            x2={sx}
            y2={height - 4}
            stroke="#FAF9F6"
            strokeOpacity={0.75}
            strokeWidth={1.4}
            strokeDasharray="3 3"
          />
        );
      }
    }

    // Outer frame for each whole unit
    rects.push(
      <rect
        key={`frame-${w}`}
        x={startX}
        y={2}
        width={wholeWidth}
        height={height - 4}
        fill="none"
        stroke="#E2E8F0"
        strokeOpacity={0.55}
        strokeWidth={2}
        rx={4}
      />
    );
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-11 overflow-visible"
      role="img"
      aria-label={`Barra representando ${num} sobre ${den}`}
    >
      {rects}
    </svg>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function describeSector(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return ['M', cx, cy, 'L', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y, 'Z'].join(' ');
}

function renderDiscSVG(
  num: number,
  den: number,
  subdivideTo: number | null,
  fillColor: string,
  emptyColor: string,
  borderColor: string,
  maxWholes: number
) {
  const effectiveSub =
    subdivideTo && subdivideTo > den && subdivideTo % den === 0 ? subdivideTo : null;
  const totalWholes = Math.max(maxWholes, Math.ceil(num / den));
  const r = 42;
  const spacing = 104;
  const svgW = totalWholes === 1 ? 100 : 204;

  const discs = [];
  for (let w = 0; w < totalWholes; w++) {
    const cx = totalWholes === 1 ? 50 : 50 + w * spacing;
    const cy = 50;
    const angleStep = 360 / den;

    for (let i = 0; i < den; i++) {
      const globalSlice = w * den + i;
      const isFilled = globalSlice < num;
      const startA = i * angleStep;
      const endA = (i + 1) * angleStep;

      discs.push(
        <path
          key={`slice-${w}-${i}`}
          d={describeSector(cx, cy, r, startA, endA)}
          fill={isFilled ? fillColor : emptyColor}
          stroke={borderColor}
          strokeWidth={1.5}
        />
      );
    }

    if (effectiveSub) {
      const factor = effectiveSub / den;
      const subStep = 360 / effectiveSub;
      for (let s = 0; s < effectiveSub; s++) {
        if (s % factor === 0) continue;
        const pt = polarToCartesian(cx, cy, r, s * subStep);
        discs.push(
          <line
            key={`disc-sub-${w}-${s}`}
            x1={cx}
            y1={cy}
            x2={pt.x}
            y2={pt.y}
            stroke="#FAF9F6"
            strokeOpacity={0.75}
            strokeWidth={1.3}
            strokeDasharray="3 3"
          />
        );
      }
    }

    discs.push(
      <circle
        key={`ring-${w}`}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#E2E8F0"
        strokeOpacity={0.5}
        strokeWidth={2}
      />
    );
  }

  return (
    <svg
      viewBox={`0 0 ${svgW} 100`}
      className="h-24 w-auto mx-auto"
      role="img"
      aria-label={`Disco representando ${num} sobre ${den}`}
    >
      {discs}
    </svg>
  );
}

export function FractionVisual({
  question,
  visualMode,
  onChangeVisualMode,
  subdivisionDen,
  onChangeSubdivision,
  showResultPreview,
}: FractionVisualProps) {
  const { left, right, op, commonDen, rawResult, simplifiedResult } = question;
  const maxWholes = Math.max(
    Math.ceil(left.num / left.den),
    Math.ceil(right.num / right.den),
    question.isImproperResult ? 2 : 1
  );

  // Build helpful subdivision options when denominators differ
  const subdivisionOptions: number[] = [];
  if (question.requiresCommonDen) {
    subdivisionOptions.push(commonDen);
    if (commonDen * 2 <= 24) {
      subdivisionOptions.push(commonDen * 2);
    }
  }

  const leftValidSub =
    subdivisionDen && subdivisionDen % left.den === 0 ? subdivisionDen : null;
  const rightValidSub =
    subdivisionDen && subdivisionDen % right.den === 0 ? subdivisionDen : null;

  const leftEqNum = leftValidSub ? left.num * (leftValidSub / left.den) : null;
  const rightEqNum = rightValidSub ? right.num * (rightValidSub / right.den) : null;

  return (
    <div className="bg-[#111C2E] border border-slate-700/70 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-lg">
      {/* Header row of the visual workbench */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">
            Bancada Visual
          </h2>
          <p className="text-xs text-slate-400">
            {question.requiresCommonDen
              ? 'Usa a subdivisão para comparar partes do mesmo tamanho.'
              : 'Observa como as partes do mesmo tamanho se juntam ou retiram.'}
          </p>
        </div>

        {/* Toggle Bars vs Discs */}
        <div
          className="inline-flex items-center p-1 bg-slate-900/90 border border-slate-700/70 rounded-lg"
          role="group"
          aria-label="Modo de visualização"
        >
          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              onChangeVisualMode('bars');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              visualMode === 'bars'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Barras
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              onChangeVisualMode('discs');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              visualMode === 'discs'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Discos
          </button>
        </div>
      </div>

      {/* Visual representations */}
      {visualMode === 'bars' ? (
        <div className="flex flex-col gap-3.5">
          {/* Left Fraction Bar */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <span className="font-medium text-sky-300">
                1.ª Fração · <span className="font-math text-sm text-white">{left.num}/{left.den}</span>
              </span>
              {leftEqNum !== null && leftValidSub && (
                <span className="font-math text-sky-300 font-semibold">
                  = {leftEqNum}/{leftValidSub}
                </span>
              )}
            </div>
            {renderBarSVG(
              left.num,
              left.den,
              leftValidSub,
              '#0EA5E9',
              '#1E293B',
              '#0F172A',
              maxWholes
            )}
          </div>

          {/* Right Fraction Bar */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <span className="font-medium text-amber-300">
                2.ª Fração ({op === 'add' ? 'Adicionar +' : 'Subtrair −'}) ·{' '}
                <span className="font-math text-sm text-white">{right.num}/{right.den}</span>
              </span>
              {rightEqNum !== null && rightValidSub && (
                <span className="font-math text-amber-300 font-semibold">
                  = {rightEqNum}/{rightValidSub}
                </span>
              )}
            </div>
            {renderBarSVG(
              right.num,
              right.den,
              rightValidSub,
              '#F59E0B',
              '#1E293B',
              '#0F172A',
              maxWholes
            )}
          </div>

          {/* Result Preview Bar (shown after student answers or solves) */}
          {showResultPreview && (
            <div className="bg-emerald-950/35 border border-emerald-500/40 rounded-xl p-3 animate-pop-settle">
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <span className="font-semibold text-emerald-300">
                  Resultado Final
                </span>
                <span className="font-math text-sm text-emerald-200 font-bold">
                  {rawResult.num}/{rawResult.den}
                  {question.canSimplify &&
                    ` = ${simplifiedResult.num}/${simplifiedResult.den}`}
                </span>
              </div>
              {renderBarSVG(
                simplifiedResult.num,
                simplifiedResult.den,
                null,
                '#10B981',
                '#1E293B',
                '#0F172A',
                maxWholes
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-xs font-medium text-sky-300 mb-2">
              1.ª Fração: <span className="font-math text-white">{left.num}/{left.den}</span>
              {leftEqNum !== null && leftValidSub && (
                <span className="font-math text-sky-300"> = {leftEqNum}/{leftValidSub}</span>
              )}
            </div>
            {renderDiscSVG(
              left.num,
              left.den,
              leftValidSub,
              '#0EA5E9',
              '#1E293B',
              '#0F172A',
              1
            )}
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-xs font-medium text-amber-300 mb-2">
              2.ª Fração ({op === 'add' ? '+' : '−'}):{' '}
              <span className="font-math text-white">{right.num}/{right.den}</span>
              {rightEqNum !== null && rightValidSub && (
                <span className="font-math text-amber-300"> = {rightEqNum}/{rightValidSub}</span>
              )}
            </div>
            {renderDiscSVG(
              right.num,
              right.den,
              rightValidSub,
              '#F59E0B',
              '#1E293B',
              '#0F172A',
              1
            )}
          </div>

          {showResultPreview && (
            <div className="sm:col-span-2 bg-emerald-950/35 border border-emerald-500/40 rounded-xl p-3 text-center animate-pop-settle">
              <div className="text-xs font-semibold text-emerald-300 mb-2">
                Resultado:{' '}
                <span className="font-math text-white">
                  {simplifiedResult.num}/{simplifiedResult.den}
                </span>
              </div>
              {renderDiscSVG(
                simplifiedResult.num,
                simplifiedResult.den,
                null,
                '#10B981',
                '#1E293B',
                '#0F172A',
                question.isImproperResult ? 2 : 1
              )}
            </div>
          )}
        </div>
      )}

      {/* Interactive Subdivision Explorer (for different denominators) */}
      {question.requiresCommonDen && (
        <div className="pt-2 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-300">
            Subdividir partes para igualar denominadores:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                onChangeSubdivision(null);
              }}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                subdivisionDen === null
                  ? 'bg-slate-700 text-white border-slate-500'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
            >
              Original
            </button>
            {subdivisionOptions.map((denOpt) => (
              <button
                key={denOpt}
                type="button"
                onClick={() => {
                  soundEngine.playSubdivide();
                  onChangeSubdivision(denOpt);
                }}
                className={`px-3 py-1.5 text-xs font-math font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                  subdivisionDen === denOpt
                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                    : 'bg-slate-900 text-amber-300 border-slate-700 hover:border-amber-400/60'
                }`}
              >
                ÷ em {denOpt} partes
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
