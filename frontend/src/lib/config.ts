// API Configuration
// Support for runtime config injection via window.__RUNTIME_CONFIG__
const runtimeConfig = (globalThis as any).__RUNTIME_CONFIG__;
export const API_BASE_URL = runtimeConfig?.VITE_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';