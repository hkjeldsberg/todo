/** Fitting-room curtains and rail, drawn behind and beside the avatar. */
export function Curtains() {
  const folds = (x: number, flip: boolean) => (
    <g transform={flip ? `translate(${x} 0) scale(-1 1)` : `translate(${x} 0)`}>
      <path d="M0 10 L64 10 Q50 120 58 230 Q30 250 0 250 Z" fill="#e8467c" />
      {[12, 26, 40].map((fx) => (
        <path key={fx} d={`M${fx} 12 Q${fx - 4} 130 ${fx + 2} 246`} stroke="#c93d7c" strokeWidth={3} fill="none" opacity={0.6} />
      ))}
      <path d="M44 120 Q62 128 58 140" stroke="#ffd23f" strokeWidth={4} fill="none" strokeLinecap="round" />
    </g>
  );
  return (
    <svg viewBox="0 0 400 250" preserveAspectRatio="none" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
      <rect x={0} y={4} width={400} height={6} rx={3} fill="#3d2140" />
      {folds(0, false)}
      {folds(400, true)}
    </svg>
  );
}
