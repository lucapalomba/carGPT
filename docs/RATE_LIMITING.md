# Rate Limiting Guide

This document describes the rate limiting implementation for the CarGPT API.

## Overview

Rate limiting protects the API from abuse, prevents DDoS attacks, and ensures fair resource distribution. The implementation uses `express-rate-limit` and `express-slow-down` middleware with a request queue for Ollama operations.

## Rate Limits by Endpoint

> **Note**: Some endpoints listed below are planned for future implementation. The rate limiters are pre-configured and will be applied when those endpoints are added.

| Endpoint | Limit | Window | Description |
|----------|-------|--------|-------------|
| `/api/find-cars` | 10 | 15 min | Expensive AI operation |
| `/api/refine-search` | 15 | 15 min | Expensive AI operation |
| `/api/compare-cars` | 20 | 15 min | Moderate AI operation (planned) |
| `/api/get-alternatives` | 20 | 15 min | Moderate AI operation (planned) |
| `/api/ask-about-car` | 30 | 15 min | Light AI operation (planned) |
| `/api/reset-conversation` | 50 | 15 min | Conversation management |
| `/api/health` | 100 | 1 min | Health checks |
| Global | 100 | 15 min | Overall API protection |

## Response Headers

When rate limited, the API returns standard rate limit headers:

```
RateLimit-Limit: 10
RateLimit-Remaining: 0
RateLimit-Reset: 2024-12-19T11:00:00Z
Retry-After: 900
```

## HTTP 429 Response

```json
{
  "success": false,
  "error": "Too many AI requests. Please wait before searching again.",
  "retryAfter": "15 minutes",
  "tip": "Try refining your existing results instead of starting new searches."
}
```

## Ollama Request Queue

To prevent Ollama overload, expensive AI operations are queued:

- **Concurrency**: Maximum 3 concurrent requests to Ollama
- **Queue Size**: Maximum 20 queued requests
- **Timeout**: 60 seconds per request

When the queue is full, the API returns HTTP 503:

```json
{
  "success": false,
  "error": "Server is busy processing requests. Please try again in a moment.",
  "retryAfter": "30 seconds"
}
```

## Slow Down Middleware

The API implements gradual response delay (express-slow-down) to further protect against abuse:

- Starts slowing down after 5 requests
- Adds 100ms delay per request after the limit
- Maximum delay: 2 seconds

## Configuration

Rate limits are configured via environment variables:

### Global Settings
| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_ENABLED` | `true` | Enable/disable rate limiting |

### Per-Endpoint Limits
| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_GLOBAL_WINDOW_MS` | 900000 | Global window (ms) |
| `RATE_LIMIT_GLOBAL_MAX` | 100 | Global max requests |
| `RATE_LIMIT_FIND_CARS_WINDOW_MS` | 900000 | find-cars window (ms) |
| `RATE_LIMIT_FIND_CARS_MAX` | 10 | find-cars max requests |
| `RATE_LIMIT_REFINE_SEARCH_WINDOW_MS` | 900000 | refine-search window (ms) |
| `RATE_LIMIT_REFINE_SEARCH_MAX` | 15 | refine-search max requests |
| `RATE_LIMIT_COMPARE_CARS_WINDOW_MS` | 900000 | compare-cars window (ms) |
| `RATE_LIMIT_COMPARE_CARS_MAX` | 20 | compare-cars max requests |
| `RATE_LIMIT_GET_ALTERNATIVES_WINDOW_MS` | 900000 | get-alternatives window (ms) |
| `RATE_LIMIT_GET_ALTERNATIVES_MAX` | 20 | get-alternatives max requests |
| `RATE_LIMIT_ASK_ABOUT_CAR_WINDOW_MS` | 900000 | ask-about-car window (ms) |
| `RATE_LIMIT_ASK_ABOUT_CAR_MAX` | 30 | ask-about-car max requests |
| `RATE_LIMIT_CONVERSATION_WINDOW_MS` | 900000 | conversation window (ms) |
| `RATE_LIMIT_CONVERSATION_MAX` | 50 | conversation max requests |
| `RATE_LIMIT_HEALTH_WINDOW_MS` | 60000 | health window (ms) |
| `RATE_LIMIT_HEALTH_MAX` | 100 | health max requests |

### Slow Down Settings
| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_SLOW_DOWN_WINDOW_MS` | 900000 | Slow down window (ms) |
| `RATE_LIMIT_SLOW_DOWN_DELAY_AFTER` | 5 | Start slowing after N requests |
| `RATE_LIMIT_SLOW_DOWN_MAX_DELAY_MS` | 2000 | Maximum delay (ms) |

### Ollama Queue Settings
| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_QUEUE_CONCURRENCY` | 3 | Max concurrent requests |
| `OLLAMA_QUEUE_TIMEOUT` | 60000 | Request timeout (ms) |
| `OLLAMA_QUEUE_MAX_SIZE` | 20 | Max queued requests |

## Frontend Integration

The frontend automatically handles rate limit errors:

1. Displays a toast notification with the error message
2. Shows retry information when available
3. Displays tips for avoiding rate limits

Example error handling is in `apps/web/src/utils/errorHandler.ts`.

## Files

- `apps/server/src/middleware/rateLimiter.ts` - Rate limiting middleware
- `apps/server/src/middleware/requestQueue.ts` - Ollama request queue
- `apps/server/src/config/index.ts` - Rate limit configuration
- `apps/web/src/utils/errorHandler.ts` - Frontend error handling
