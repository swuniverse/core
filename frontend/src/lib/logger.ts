/**
 * Centralized logging utility for development
 * Enable/disable via VITE_DEBUG_LOGGING environment variable
 */

// @ts-ignore - Vite env is available at runtime
const isDebugEnabled = import.meta.env?.VITE_DEBUG_LOGGING === 'true';

export const logger = {
  debug: (...args: any[]) => {
    if (isDebugEnabled) {
      console.log('[DEBUG]', new Date().toISOString(), ...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isDebugEnabled) {
      console.info('[INFO]', new Date().toISOString(), ...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDebugEnabled) {
      console.warn('[WARN]', new Date().toISOString(), ...args);
    }
  },
  
  error: (...args: any[]) => {
    // Errors are always logged
    console.error('[ERROR]', new Date().toISOString(), ...args);
  },
  
  socket: (...args: any[]) => {
    if (isDebugEnabled) {
      console.log('[SOCKET]', new Date().toISOString(), ...args);
    }
  },
  
  api: (...args: any[]) => {
    if (isDebugEnabled) {
      console.log('[API]', new Date().toISOString(), ...args);
    }
  },
};

export default logger;
