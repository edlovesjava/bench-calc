export interface HeadlineProps {
  label: string;
  value: string;
}

export function Headline({ label, value }: HeadlineProps) {
  return (
    <div className="headline">
      <div className="headline-label">{label}</div>
      <div className="headline-value">{value}</div>
    </div>
  );
}
