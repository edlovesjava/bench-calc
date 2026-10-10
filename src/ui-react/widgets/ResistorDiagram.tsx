import type { ResistorDiagram as ResistorDiagramData } from '../types';

export function ResistorDiagram({ diagram }: { diagram?: ResistorDiagramData | null }) {
  if (!diagram || diagram.kind !== 'resistors' || diagram.parts.length === 0) return null;

  const join = diagram.topology === 'parallel' ? ' in parallel with ' : ' in series with ';
  const ariaLabel = diagram.parts.map((part) => `${part.label} ${part.text}`).join(join)
    + (diagram.total ? `, giving ${diagram.total.text}` : '');
  const resistor = (x: number, y: number) => {
    const points = [[x, y], [x + 5, y - 8]];
    for (let index = 1; index <= 5; index += 1) {
      points.push([x + 5 + index * 10, y + (index % 2 ? 8 : -8)]);
    }
    points.push([x + 60, y]);
    const coordinates = points.map(([px, py]) => `${px},${py}`).join(' ');
    return <polyline className="wire" points={coordinates} />;
  };

  if (diagram.topology === 'series') {
    const cell = 120;
    const width = 40 + diagram.parts.length * cell;
    const y = 44;
    return (
      <figure className="diagram">
        <svg viewBox={`0 0 ${width} 120`} role="img" aria-label={ariaLabel}>
          <circle className="terminal" cx="16" cy={y} r="4" />
          <line className="wire" x1="20" y1={y} x2={width - 20} y2={y} />
          {diagram.parts.map((part, index) => {
            const x = 50 + index * cell;
            return (
              <g key={part.id}>
                <rect className="gap" x={x} y={y - 2} width="60" height="4" />
                {resistor(x, y)}
                <text className="part-label" x={x + 30} y={y - 18}>{part.label}</text>
                <text className="part-value" x={x + 30} y={y + 30}>{part.text}</text>
              </g>
            );
          })}
          <circle className="terminal" cx={width - 16} cy={y} r="4" />
          {diagram.total && <text className="part-total" x={width / 2} y="108">
            {diagram.total.label} = {diagram.total.text}
          </text>}
        </svg>
      </figure>
    );
  }

  const pitch = 72;
  const top = 40;
  const bottom = top + (diagram.parts.length - 1) * pitch;
  const mid = (top + bottom) / 2;
  const left = 50;
  const right = 230;
  const width = 280;
  const height = bottom + (diagram.total ? 76 : 44);
  return (
    <figure className="diagram">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        <line className="wire" x1={left} y1={top} x2={left} y2={bottom} />
        <line className="wire" x1={right} y1={top} x2={right} y2={bottom} />
        <circle className="terminal" cx="16" cy={mid} r="4" />
        <line className="wire" x1="20" y1={mid} x2={left} y2={mid} />
        <circle className="terminal" cx={width - 16} cy={mid} r="4" />
        <line className="wire" x1={right} y1={mid} x2={width - 20} y2={mid} />
        {diagram.parts.map((part, index) => {
          const y = top + index * pitch;
          const x = (left + right - 60) / 2;
          return (
            <g key={part.id}>
              <line className="wire" x1={left} y1={y} x2={x} y2={y} />
              <line className="wire" x1={x + 60} y1={y} x2={right} y2={y} />
              <rect className="gap" x={x} y={y - 2} width="60" height="4" />
              {resistor(x, y)}
              <text className="part-label" x={x + 30} y={y - 16}>{part.label}</text>
              <text className="part-value" x={x + 30} y={y + 28}>{part.text}</text>
            </g>
          );
        })}
        {diagram.total && <text className="part-total" x={width / 2} y={height - 12}>
          {diagram.total.label} = {diagram.total.text}
        </text>}
      </svg>
    </figure>
  );
}
