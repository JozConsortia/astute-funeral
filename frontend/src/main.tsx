import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MetaProvider } from './lib/meta';
import './styles/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <MetaProvider>
          <App />
        </MetaProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
