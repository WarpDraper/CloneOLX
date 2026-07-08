import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import './index.css';
import App from './App.tsx';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <Provider store={store}>
          <GoogleReCaptchaProvider reCaptchaKey={recaptchaSiteKey}>
              <BrowserRouter>
              <App />
          </BrowserRouter>
          </GoogleReCaptchaProvider>
      </Provider>
  </StrictMode>,
)
