import { useState } from 'react';
import { eng, seriesNames, seriesValues } from '../engine';

const DEFAULT_SERIES = seriesNames.includes('E24') ? 'E24' : seriesNames[0];

export interface SeriesPickerProps {
  unit: string;
  onPick: (value: number) => void;
}

export function SeriesPicker({ unit, onPick }: SeriesPickerProps) {
  const [mode, setMode] = useState(DEFAULT_SERIES);

  return (
    <>
      <select
        className="quick-entry"
        aria-label="Choose series"
        value={mode}
        onChange={(event) => setMode(event.target.value)}
      >
        {seriesNames.map((name) => (
          <option key={name} value={name}>{name} values</option>
        ))}
      </select>
      <select
        className="quick-entry"
        aria-label="Choose standard value"
        value=""
        onChange={(event) => {
          if (event.target.value) onPick(Number(event.target.value));
        }}
      >
        <option value="">Choose standard value</option>
        {seriesValues(mode).map((value) => (
          <option key={value} value={value}>{eng(value, unit)}</option>
        ))}
      </select>
    </>
  );
}
