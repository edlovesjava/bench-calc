import { useState } from 'react';
import { Sidebar } from './widgets/Sidebar';
import { calculators } from './calculators/definitions';
import { OhmView } from './calculators/OhmView';
import { LedResistorView } from './calculators/LedResistorView';
import { DividerView } from './calculators/DividerView';
import { RegulatorView } from './calculators/RegulatorView';
import { DiodeView } from './calculators/DiodeView';
import { EseriesView } from './calculators/EseriesView';

export function App() {
  const [activeId, setActiveId] = useState(calculators[0].id);

  // Every view is mounted at once and hidden with CSS, not conditionally
  // rendered, so switching calculators doesn't lose in-progress edits in the
  // other one — matches the old app.js behavior, where field state lived in
  // a module-level object keyed by calculator id rather than component state.
  return (
    <div className="shell">
      <Sidebar calculators={calculators} activeId={activeId} onSelect={setActiveId} />
      <main className="main">
        <div style={{ display: activeId === 'ohm' ? 'block' : 'none' }}><OhmView /></div>
        <div style={{ display: activeId === 'led-resistor' ? 'block' : 'none' }}><LedResistorView /></div>
        <div style={{ display: activeId === 'divider' ? 'block' : 'none' }}><DividerView /></div>
        <div style={{ display: activeId === 'regulator' ? 'block' : 'none' }}><RegulatorView /></div>
        <div style={{ display: activeId === 'diode' ? 'block' : 'none' }}><DiodeView /></div>
        <div style={{ display: activeId === 'eseries' ? 'block' : 'none' }}><EseriesView /></div>
      </main>
    </div>
  );
}
