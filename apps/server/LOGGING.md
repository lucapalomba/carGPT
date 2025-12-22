# Logging Guide

CarGPT uses a centralized logging system based on [Winston](https://github.com/winstonjs/winston) and [Morgan](https://github.com/expressjs/morgan).

## Log Structure

Logs are stored in the `apps/server/logs/` directory and are automatically rotated daily.

- `combined-YYYY-MM-DD.log`: All logs across all levels (info, debug, warn, error).
- `error-YYYY-MM-DD.log`: Only logs with the `error` level.

In **Development**, logs are also colorized and streamed to the console for easier debugging.

## Log Levels

- `error`: Unexpected failures, system errors, or external service outages (e.g., Ollama unreachable).
- `warn`: Expected client-side errors (4xx), validation failures, or minor issues.
- `info`: Key lifecycle events (server start, configuration loads) and significant successful operations.
- `debug`: Detailed information for development, including API request payloads, LLM responses, and internal state changes.

## Structured Logging

Logs are formatted as JSON on disk to allow for easy integration with log management tools (e.g., ELK stack, Datadog).

Example log entry:
```json
{
  "level": "info",
  "message": "Car search request received",
  "requirements": "I need a fast electric car",
  "sessionId": "abc-123",
  "service": "cargpt-api",
  "environment": "development",
  "timestamp": "2025-12-23 10:00:00"
}
```

## Prompt Logging

For AI observability, the **complete compiled prompt** (all system messages, history, and user input) is logged at the `debug` level before being sent to Ollama. This can be found in the `combined` log files or in the console when `LOG_LEVEL=debug` is set.

## Request Correlation

Every request is assigned a unique `X-Request-ID` header. This ID is included in all logs associated with that request, allowing you to trace the entire lifecycle of a single user interaction across different services.

Always use the central logger instead of `console.log`:

```typescript
import logger from '../utils/logger.js';

logger.info('User started a new search', { userId: '123' });
logger.error('Failed to connect to database', { error: err.message, stack: err.stack });
```

## 🌍 Environment Differences

| Feature | Development | Production |
|---------|-------------|------------|
| **Log Format** | Colorized Console | Structured JSON |
| **Log Level** | `debug` (default) | `info` (recommended) |
| **Swagger UI** | Enabled (`/api-docs`) | Disabled |
| **Debug APIs** | Enabled (`/api/get-conversations`) | Disabled |
| **Error Detail** | Includes stack traces | Error message only |
