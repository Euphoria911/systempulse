interface Props {
  values: number[];
  max?: number;
  color?: string;
  fill?: string;
  height?: number;
}

export function Sparkline({ values, max, color = "#0a0a0a", fill = "rgba(10,10,10,0.08)", height = 56 }: Props) {
  const width = 320;
  if (values.length < 2) {
    return (
      <svg
        className="sp-sparkline"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="chart"
      />
    );
  }
  const peak = max ?? Math.max(1, ...values);
  const step = width / Math.max(1, values.length - 1);
  const points = values
    .map((v, i) => `${(i * step).toFixed(2)},${(height - (v / peak) * height).toFixed(2)}`)
    .join(" ");
  const area = `${points} ${((values.length - 1) * step).toFixed(2)},${height} 0,${height}`;
  return (
    <svg
      className="sp-sparkline"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="chart"
    >
      <polyline points={area} fill={fill} stroke="none" />
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}
