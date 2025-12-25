# Logging System

Das Projekt hat jetzt ein zentrales Logging-System für Entwicklung und Debugging.

## Aktivierung

### Frontend
In `.env.development` oder `.env.local`:
```
VITE_DEBUG_LOGGING=true
```

### Backend
In `.env`:
```
DEBUG_LOGGING=true
```

## Verwendung

### Frontend
```typescript
import logger from '../lib/logger';

logger.debug('Debug-Nachricht', data);
logger.info('Info-Nachricht', data);
logger.warn('Warnung', data);
logger.error('Fehler', error); // Wird IMMER geloggt
logger.socket('Socket Event', data);
logger.api('API Call', request);
```

### Backend
```typescript
import logger from '../lib/logger';

logger.debug('Debug-Nachricht', data);
logger.info('Info-Nachricht', data);
logger.warn('Warnung', data);
logger.error('Fehler', error); // Wird IMMER geloggt
logger.socket('Socket Event', data);
logger.api('API Call', request);
logger.db('Database Query', query);
logger.tick('Tick System', tickNumber);
```

## Logging-Bereiche

### Bereits implementiert:
- ✅ Socket Verbindungen (Connect/Disconnect)
- ✅ Socket Cleanup und Duplikate
- ✅ Building Completion Events
- ✅ Resource Updates
- ✅ Tick System (Start/Stop/Schedule)

### Weitere kritische Bereiche die geloggt werden können:
- API Requests/Responses
- Datenbankabfragen
- Authentication (Login/Logout/Register)
- Fehler und Exceptions
- Performance-kritische Operationen

## Hinweise

- **Fehler** (`logger.error()`) werden **IMMER** geloggt, unabhängig von DEBUG_LOGGING
- Alle anderen Logs werden nur bei `DEBUG_LOGGING=true` ausgegeben
- Timestamps werden automatisch hinzugefügt
- Format: `[LEVEL] ISO-Timestamp message data`
