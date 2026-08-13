import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import './services/api'; // startup banner + shared RTK Query logging (side effect only)
import './i18n'; // bilingual UKR/ENG setup (side effect only) — see Header.tsx language toggle
// NOTE: the background picsum.photos advert/category image prefetch queue
// (./services/imagePrefetcher) has been removed — the app must never fetch or generate
// dynamic images at runtime, only render explicit backend/seeder-provided image paths.
import './index.css';
import App from './App.tsx';
import { GoogleOAuthProvider } from '@react-oauth/google';

// @react-oauth/google's GoogleOAuthProvider throws synchronously ("Missing required parameter
// client_id") if clientId is falsy — an empty VITE_GOOGLE_CLIENT_ID would crash the whole app on
// boot, not just the Google button. Fall back to a non-functional placeholder instead;
// GoogleAuthButton separately checks the real env var and disables itself so it never actually
// calls into the SDK with this placeholder.
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id.apps.googleusercontent.com';

// NOTE: GoogleReCaptchaProvider is intentionally NOT mounted here anymore. It used to wrap the
// whole app, which meant every route — not just /login and /register, the only two pages that
// actually call executeRecaptcha() — fetched https://www.google.com/recaptcha/api.js on load.
// It's now scoped locally to LoginPage/RegisterPage (see those files) so the script (and any
// failure loading it, e.g. an unauthorized-domain 400 the browser reports as
// net::ERR_BLOCKED_BY_ORB) only ever touches the two pages that need it.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <Provider store={store}>
          <GoogleOAuthProvider clientId={googleClientId}>
              <BrowserRouter>
              <App />
          </BrowserRouter>
          </GoogleOAuthProvider>
      </Provider>
  </StrictMode>,
)
