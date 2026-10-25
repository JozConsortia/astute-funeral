import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { MetaProvider } from './lib/meta';
import { applyStoredTextSize } from './lib/textSize';
import './styles/styles.css';

applyStoredTextSize();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MetaProvider>
        <App />
      </MetaProvider>
    </BrowserRouter>
  </StrictMode>,
);
