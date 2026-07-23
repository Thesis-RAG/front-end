const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

// Local dev and local production-preview builds must never fall back to the
// production API. Production hosting should provide VITE_API_BASE_URL explicitly.
const isLocalMode = import.meta.env.DEV || import.meta.env.MODE === "development";
const defaultApiBaseUrl = isLocalMode
  ? "http://localhost:8000"
  : "https://rolesawarerag.duckdns.org";

export const ENV = {
  API_BASE_URL: (configuredApiBaseUrl || defaultApiBaseUrl).replace(/\/+$/, ""),
};
