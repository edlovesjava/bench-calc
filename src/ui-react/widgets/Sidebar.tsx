import type { CalculatorDefinition } from '../types';

export interface SidebarProps {
  calculators: CalculatorDefinition[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function Sidebar({ calculators, activeId, onSelect }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="eyebrow">Ed's bench</div>
        <h1>Bench Calculators</h1>
      </div>
      <div className="calculator-list">
        {calculators.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`calc-button ${item.id === activeId ? 'active' : ''}`}
            onClick={() => onSelect(item.id)}
          >
            {item.title}
          </button>
        ))}
      </div>
    </aside>
  );
}
