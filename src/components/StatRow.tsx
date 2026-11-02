interface Props {
  label: string;
  value: string;
}

export function StatRow({ label, value }: Props) {
  return (
    <div className="sp-row sp-row--between">
      <span className="sp-label">{label}</span>
      <span className="sp-value">{value}</span>
    </div>
  );
}
