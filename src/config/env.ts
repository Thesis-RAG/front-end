const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

// Keep local development convenient while giving production builds a safe API default.
// Amplify should still provide VITE_API_BASE_URL explicitly in its environment settings.
const defaultApiBaseUrl = import.meta.env.DEV
  ? "http://localhost:8000"
  : "https://rolesawarerag.duckdns.org";

export const ENV = {
  API_BASE_URL: (configuredApiBaseUrl || defaultApiBaseUrl).replace(/\/+$/, ""),
};
