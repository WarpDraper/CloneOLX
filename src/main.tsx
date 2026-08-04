import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import './services/api'; // startup banner + shared RTK Query logging (side effect only)
import './services/imagePrefetcher'; // background advert/category image prefetch queue (side effect only)
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
