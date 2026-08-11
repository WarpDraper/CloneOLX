MASTER PROMPT: FIX ALL ERRORS, AUTOMATED TRANSLATION API, AND RUN AUTONOMOUS BROWSER TESTING LOOP

Please execute the following bug fixes, translation feature, and autonomous test-and-fix sequence across the codebase:

1. AUTOMATIC BILINGUAL TRANSLATION INTEGRATION (UKR / ENG)
- Issue: The language switcher button exists in the UI, but actual dynamic translation is missing.
- Implementation:
  - Connect a translation service (e.g. `i18next` with `i18next-browser-languagedetector` / LibreTranslate API / Google Translate API wrapper).
  - Store key-value locale dictionaries for dynamic UI components or integrate an automatic API translator for dynamic product content.
  - Wire the existing language toggle button in `Header.tsx` to switch state between `uk` and `en`.
  - Ensure all main page sections, navigation links, buttons, and user status texts reflect the chosen language smoothly.

2. AUTONOMOUS BROWSER TESTING & SELF-HEALING LOOP
- Check if the dev server (`npm run dev` / `dotnet run`) is running, or start it.
- Launch a browser automation instance (Playwright / Puppeteer / Browser actions).
- Automatically crawl all main routes (`/`, `/catalog`, `/settings`, `/profile`, `/chat`, `/admin`).
- Click through buttons, forms, advert cards, language switcher, and navigation links to trigger real network requests.
- Intercept console errors, 400 Bad Requests, or 404 status codes, and automatically fix the underlying code until all views render clean with zero console errors.

3. FIX ADVERT NEGATIVE IDS & 400 BAD REQUESTS
- Fix requests to `/api/Advert/get/-2182` and `/api/Account/favorites/add/-2182`.
- Ensure `ProductCard` and `AdvertDetailsPage` strictly pass valid positive advert IDs before calling API endpoints.

4. FIX LOCATION GUID DISPLAY IN PROFILE
- Fix `UserProfilePage` / `SettingsPage` showing raw settlement GUIDs (e.g. `e71ab70b-4b33-11e4-ab6d-005056801329`).
- Properly map settlement GUIDs to human-readable city names (e.g., "м. Київ" / "м. Луцьк") for display and editing.

5. FIX RECAPTCHA CORB SCRIPT LOADING
- Fix `Response was blocked by CORB` when fetching `api.js?render=...`.
- Ensure Google reCAPTCHA script loads asynchronously with valid site key execution and passes the token cleanly to `/account/login` & `/account/register`.

6. FIX "WRITE TO SELLER" & CHAT CREATION
- Ensure clicking "Написати продавцю":
  - Redirects guests to `/login`.
  - Obtains valid `sellerId` and `advertId`.
  - Creates/opens the chat thread with the seller without API errors.

7. FIX ADD TO FAVORITES & HEART BUTTON
- Ensure clicking the heart icon triggers `POST /api/Account/favorites/add/{id}` / `DELETE /api/Account/favorites/remove/{id}` correctly and optimistically updates UI state.

8. AUTO SCROLL TO TOP ON ROUTE CHANGE
- Add a `ScrollToTop` listener / effect in `App.tsx` or `AdvertPage` executing `window.scrollTo(0, 0)` on route change so opening an advert always scrolls back to the top of the page.

9. FIX IMAGE 404 & SIGNALR ABORT REJECTIONS
- Use `ImageWithFallback` component for avatar and product image loads to handle missing media cleanly.
- Gracefully handle `AbortError` cancellation in `useChatHub` and `usePresenceHub`.

Keep responses concise and brief.