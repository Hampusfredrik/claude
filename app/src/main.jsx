import { createRoot } from 'react-dom/client';
import LogicHost from './LogicHost.jsx';
import NotebookLogic from './logic/NotebookLogic.js';
import App from './ui/App.jsx';
// Same order as before: the runtime created the pseudo-class sheet before the helmet styles.
import './styles/pseudo.css';
import './styles/fonts.css';
import './styles/global.css';
import './styles/book.css';

createRoot(document.getElementById('dc-root')).render(
  <LogicHost logic={NotebookLogic} template={App} showGrid={true} />
);
