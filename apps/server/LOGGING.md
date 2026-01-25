# Logging Guide

CarGPT uses a centralized logging system based on [Winston](https://github.com/winstonjs/winston) and [Morgan](https://github.com/expressjs/morgan).

## Log Structure

Logs are sent to **Seq** (https://datalust.co/seq) for centralized logging and analysis. Seq provides a web interface for viewing, filtering, and searching logs.

- **Seq UI**: Available at `http://localhost:5341` when running Docker Compose
- **Log Levels**: Configurable via `LOG_LEVEL` environment variable (default: `debug` in development, `info` in production)
- **Structured JSON**: All logs are formatted as JSON for better searchability and analysis

In **Development**, logs are also colorized and streamed to the console for easier debugging.

## Log Levels

- `error`: Unexpected failures, system errors, or external service outages (e.g., Ollama unreachable).
- `warn`: Expected client-side errors (4xx), validation failures, or minor issues.
- `info`: Key lifecycle events (server start, configuration loads) and significant successful operations.
- `debug`: Detailed information for development, including API request payloads, LLM responses, and internal state changes.

## Structured Logging

Logs are formatted as structured JSON and sent to Seq, providing powerful search and analysis capabilities. Seq automatically indexes log properties, allowing you to filter by any field.

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

For AI observability, the **complete compiled prompt** (all system messages, history, and user input) is logged at the `debug` level before being sent to Ollama. These detailed prompts can be viewed in Seq when `LOG_LEVEL=debug` is set.

## Request Correlation

Every request is assigned a unique `X-Request-ID` header. This ID is included in all logs associated with that request, allowing you to trace the entire lifecycle of a single user interaction across different services.

## LLM Vision Observability

For visibility into the image filtering process, logs related to Ollama Vision are prefixed with `[Vision]`. These logs include:
- **Image Fetching**: Tracks when an image is fetched and its base64 size.
- **Verification Results**: Clearly shows whether a car model match was found (✅) or not (❌) for specific image URLs.
- **Filtering Logic**: Logs the specific car description and year being verified.

Example vision log:
```text
info: [Vision] Checking if image contains 2024 Toyota Camry... {"imageUrl": "..."}
info: [Vision] ✅ Match found: This image is a 2024 Toyota Camry {"imageUrl": "..."}
```

Always use the central logger instead of `console.log`:

```typescript
import logger from '../utils/logger.js';

logger.info('User started a new search', { userId: '123' });
logger.error('Failed to connect to database', { error: err.message, stack: err.stack });
```

## Seq Setup

### Starting Seq

```bash
# Start Seq service only
docker-compose up seq

# Or start all services including Seq
docker-compose up
```

### Accessing Logs

1. Open `http://localhost:5341` in your browser
2. Use the powerful search interface to filter logs
3. Filter by properties like `@level`, `service`, `environment`, or custom fields
4. Create alerts and dashboards for monitoring

### Configuration

Seq is configured via environment variables:

```bash
# Seq server URL (default: http://localhost:5341)
SEQ_URL=http://localhost:5341

# Optional API key for authentication
SEQ_API_KEY=your_api_key_here
```

## 🌍 Environment Differences

| Feature | Development | Production |
|---------|-------------|------------|
| **Log Format** | Colorized Console + Seq | Seq only |
| **Log Level** | `debug` (default) | `info` (recommended) |
| **Log Storage** | Seq + Console | Seq only |
| **Swagger UI** | Enabled (`/api-docs`) | Disabled |
| **Debug APIs** | Enabled (`/api/get-conversations`) | Disabled |
| **Error Detail** | Includes stack traces | Error message only |
