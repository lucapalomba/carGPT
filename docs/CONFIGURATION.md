# ⚙️ Configuration Reference

This guide explains all configuration options, environment variables, and their precedence in CarGPT.

## Configuration File Hierarchy

Configuration is loaded in this order (later options override earlier ones):

1. **Default values** in code
2. **Root `.env`** file (Docker environment)
3. **`apps/server/.env`** file (local development)
4. **Environment variables** (runtime override)
5. **Command line arguments** (npm scripts)

## Environment Variables

### Core Application

#### Google Services (Required)
```bash
# Google Custom Search API for car images
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_CX=your_google_search_engine_id_here
```

#### Session Management
```bash
# Secret for session encryption (generate with: openssl rand -base64 32)
SESSION_SECRET=your_strong_session_secret_here
```

### AI Service Configuration

#### Ollama Connection
```bash
# Local development (default)
OLLAMA_URL=http://localhost:11434

# Docker development
OLLAMA_URL=http://ollama:11434

# Custom Ollama instance
OLLAMA_URL=http://your-ollama-server:11434
```

#### Model Selection
```bash
# Default model for recommendations
OLLAMA_MODEL=mistral

# Vision model for image verification
VISION_MODEL=llava

# Fallback model if primary fails
FALLBACK_MODEL=phi3
```

### Vision & Image Processing

#### Confidence Thresholds
```bash
# Minimum confidence to accept car image (0.0-1.0)
VISION_MODEL_CONFIDENCE_THRESHOLD=0.8

# Maximum confidence allowed for text/overlays in images
VISION_TEXT_CONFIDENCE_THRESHOLD=0.2
```

#### Image Display
```bash
# Number of images to verify/show per car (max 10)
CAROUSEL_IMAGES_LENGTH=5
```

### Observability & Logging

#### Langfuse Integration
```bash
# Langfuse public key (optional)
LANGFUSE_PUBLIC_KEY=pk-lf-your-key-here

# Langfuse secret key (optional)
LANGFUSE_SECRET_KEY=sk-lf-your-secret-here

# Langfuse server URL
LANGFUSE_BASE_URL=https://cloud.langfuse.com

# Local Langfuse instance
LANGFUSE_BASE_URL=http://langfuse:3000
```

#### Seq Logging
```bash
# Seq server URL (Docker)
SEQ_URL=http://seq:5341

# Seq server URL (local)
SEQ_URL=http://localhost:5341
```

### Server Configuration

#### Port and Host
```bash
# Server port (local dev default)
PORT=3000

# Server port (Docker default)
PORT=3001

# Server host binding
HOST=0.0.0.0
```

#### Node Environment
```bash
# Development mode (default)
NODE_ENV=development

# Production mode
NODE_ENV=production

# Test mode
NODE_ENV=test
```

### Frontend Configuration

#### Vite Development
```typescript
// apps/web/vite.config.ts
export default defineConfig({
  server: {
    host: '0.0.0.0',           // Expose to network
    port: 5173,                 // Container port
    proxy: {
      '/api': 'http://server:3001'  // Backend proxy (Docker)
      // '/api': 'http://localhost:3000'  // Backend proxy (local)
    }
  }
})
```

#### Environment Variables (Frontend)
```bash
# API base URL (local)
VITE_API_URL=http://localhost:3000

# API base URL (Docker)
VITE_API_URL=http://localhost:3001

# Application title
VITE_APP_TITLE=CarGPT

# Feature flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true
```

## Configuration Files

### Root `.env` (Docker)
```bash
# Main environment file for Docker development
GOOGLE_API_KEY=your_key_here
GOOGLE_CX=your_cx_here
SESSION_SECRET=your_secret_here

# Optional observability
LANGFUSE_PUBLIC_KEY=pk-lf-xxx
LANGFUSE_SECRET_KEY=sk-lf-xxx
```

### `apps/server/.env` (Local Development)
```bash
# Local development environment
GOOGLE_API_KEY=your_key_here
GOOGLE_CX=your_cx_here
SESSION_SECRET=your_secret_here
OLLAMA_URL=http://localhost:11434
SEQ_URL=http://localhost:5341
PORT=3000
```

### `apps/server/.env.production` (Production)
```bash
# Production overrides
NODE_ENV=production
PORT=3001
OLLAMA_URL=http://ollama:11434
SEQ_URL=http://seq:5341
```

## Docker Configuration

### Development Override (`docker-compose.dev.yml`)
```yaml
services:
  web:
    ports:
      - "5174:5173"           # Host:Container mapping
    environment:
      - NODE_ENV=development
      - VITE_API_URL=http://localhost:3001
    volumes:
      - ./apps/web/src:/app/src   # Hot reload
      - ./apps/web/public:/app/public
  
  server:
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - OLLAMA_URL=http://ollama:11434
      - SEQ_URL=http://seq:5341
    volumes:
      - ./apps/server/src:/app/src
      - ./apps/server/.env:/app/.env
```

### Production (`docker-compose.prod.yml`)
```yaml
services:
  web:
    build:
      args:
        - NODE_ENV=production
    # No port exposure (nginx handles it)
  
  server:
    environment:
      - NODE_ENV=production
      - OLLAMA_URL=http://ollama:11434
      - SEQ_URL=http://seq:5341
    # No volume mounts (production build)
```

## Feature Flags

### Development Features
```bash
# Enable Swagger API documentation
ENABLE_SWAGGER=true

# Enable debug logging
DEBUG=true

# Enable request/response logging
LOG_REQUESTS=true

# Enable Langfuse tracing
ENABLE_LANGFUSE=true
```

### Production Features
```bash
# Disable Swagger in production
ENABLE_SWAGGER=false

# Error-level logging only
DEBUG=false

# Enable observability
ENABLE_LANGFUSE=true
```

## Security Configuration

### Session Management
```bash
# Strong session secret (generate: openssl rand -base64 32)
SESSION_SECRET=32-character-random-string

# Session timeout (minutes)
SESSION_TIMEOUT=1440  # 24 hours

# Secure cookies (production only)
SECURE_COOKIES=true
```

### CORS Configuration
```bash
# Allowed origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://localhost:5174

# Allow credentials
CORS_CREDENTIALS=true
```

## Performance Tuning

### AI Service Optimization
```bash
# Request timeout (seconds)
OLLAMA_TIMEOUT=30

# Maximum concurrent requests
OLLAMA_MAX_CONCURRENT=3

# Retry attempts
OLLAMA_RETRY_ATTEMPTS=3
```

### Cache Configuration
```bash
# Response cache TTL (seconds)
CACHE_TTL=300

# Enable response caching
ENABLE_CACHE=true

# Cache size (items)
CACHE_SIZE=100
```

## Validation & Defaults

### Required Variables Validation
The application will fail to start if these are missing:
- `GOOGLE_API_KEY`
- `GOOGLE_CX`
- `SESSION_SECRET`

### Default Values
```bash
# Applied if not specified
OLLAMA_MODEL=mistral
VISION_MODEL=llava
VISION_MODEL_CONFIDENCE_THRESHOLD=0.8
VISION_TEXT_CONFIDENCE_THRESHOLD=0.2
CAROUSEL_IMAGES_LENGTH=5
PORT=3000
HOST=localhost
NODE_ENV=development
```

## Environment Detection

### Automatic Detection
```bash
# Docker environment
if [ -f /.dockerenv ]; then
    OLLAMA_URL=http://ollama:11434
    SEQ_URL=http://seq:5341
fi

# Production environment
if [ "$NODE_ENV" = "production" ]; then
    PORT=3001
    ENABLE_SWAGGER=false
fi
```

## Testing Configuration

### Test Environment
```bash
# Test database
TEST_DATABASE_URL=sqlite::memory:

# Mock external services
MOCK_GOOGLE_API=true
MOCK_OLLAMA=true

# Disable observability in tests
ENABLE_LANGFUSE=false
```

## Troubleshooting Configuration

### Common Issues

#### Port Conflicts
```bash
# Check what's using the port
netstat -tulpn | grep :3001

# Change port in .env
PORT=3002
```

#### Service Connection Issues
```bash
# Test connectivity
curl http://localhost:11434/api/tags
curl http://ollama:11434/api/tags  # From container
```

#### Missing Variables
```bash
# Check loaded variables
docker-compose exec server env | grep GOOGLE
docker-compose exec server env | grep OLLAMA
```

## Best Practices

### Security
- Use `.env.example` as template, never commit actual `.env`
- Generate strong secrets for production
- Rotate API keys regularly
- Use different keys for dev/prod

### Performance
- Adjust timeouts based on your hardware
- Enable caching in production
- Monitor Langfuse for optimization opportunities

### Development
- Use environment-specific `.env` files
- Document custom variables
- Test with different configurations

### Production
- Never expose secrets in logs
- Use environment-specific feature flags
- Monitor configuration changes

## Migration Guide

### From Local to Docker
1. Copy local variables to root `.env`
2. Change service URLs to use service names
3. Update port mappings
4. Test connectivity with `docker-compose exec`

### From Development to Production
1. Set `NODE_ENV=production`
2. Disable debug features
3. Use production API endpoints
4. Enable monitoring and observability