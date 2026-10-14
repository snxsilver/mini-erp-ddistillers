import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { attachPersistence, store } from './app/store';
import { ToastProvider } from './components/ui/Toast';
import { AppRouter } from './routes/AppRouter';

attachPersistence(store);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);