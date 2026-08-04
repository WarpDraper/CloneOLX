import { APP_ENV } from "../env";

// Startup diagnostics. The actual RTK Query base query (with request/response/error
// logging) lives in utils/createBaseQuery.ts and is shared by every *Service.ts slice —
// this module doesn't duplicate that setup, it just prints the one-time startup banner.
// Imported once for its side effect from main.tsx.
console.log("App initialized. API Base URL:", APP_ENV.API_BASE_URL);
