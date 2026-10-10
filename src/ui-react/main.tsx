import { createRoot } from 'react-dom/client';
import { App } from './App';
import '../style.css';

const container = document.getElementById('app');
if (!container) throw new Error('missing #app root element');
createRoot(container).render(<App />);
