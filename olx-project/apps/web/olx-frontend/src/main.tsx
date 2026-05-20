import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import './index.css';
import App from './App.tsx';
import { I18nProvider } from "@lingui/react";
import { initI18n } from "./i18n";
import {i18n} from "@lingui/core";

initI18n.then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
          <Provider store={store}>
              <BrowserRouter>
                  <I18nProvider i18n={i18n}>
                        <App />
                    </I18nProvider>
              </BrowserRouter>
          </Provider>
      </StrictMode>,
    )
})
