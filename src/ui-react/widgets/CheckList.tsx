import type { TriggeredCheck } from '../types';

export interface CheckListProps {
  checks: TriggeredCheck[];
}

export function CheckList({ checks }: CheckListProps) {
  if (!checks.length) return null;
  return (
    <div className="check-list">
      {checks.map((check, index) => (
        <div key={index} className={`check ${check.level}`}>{check.text}</div>
      ))}
    </div>
  );
}
