# 🐳 Docker Development Guide

This guide shows how to run CarGPT entirely in Docker containers, making development more consistent and portable.

## Quick Start with Docker

### 1. Prerequisites

- Docker Desktop installed
- Docker Compose installed (usually comes with Docker Desktop)

### 2. Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your actual values
# Required: GOOGLE_API_KEY, GOOGLE_CX, SESSION_SECRET
# Optional: LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY
```

### 3. Start All Services

```bash
# Start complete application stack
npm run docker:dev
```

This will start:
- **Frontend**: http://localhost:5174 (note: port 5174 for containerized dev)
- **Backend**: http://localhost:3001
- **Ollama**: http://localhost:11434
- **Seq**: http://localhost:5341 (logging)
- **Langfuse**: http://localhost:3000 (observability)
- **PostgreSQL**: http://localhost:5432 (for Langfuse)

### 4. Pull Ollama Model

```bash
# Pull the required Mistral model
docker-compose exec ollama ollama pull mistral
# Or using npm script:
npm run ollama:pull mistral
```

### 5. Access the Application

Open your browser and go to **http://localhost:5174**

## Docker Commands Reference

```bash
# Build all containers
npm run docker:build

# Start all services in background
npm run docker:up

# Start everything (infrastructure + app)
npm run docker:dev

# View logs
npm run docker:logs

# Stop all services
npm run docker:down

# Access server container shell
npm run docker:shell

# Pull additional Ollama models
docker-compose exec ollama ollama pull <model-name>
```

## Development vs Production Modes

### Development Mode (Hot Reload)
```bash
# Uses docker-compose.dev.yml
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Features:
- **Hot reload** for both frontend and backend
- **Volume mounts** for live code changes
- **Source maps** and debugging enabled
- **Development logging** with console output

### Production Mode
```bash
# Uses docker-compose.yml only
docker-compose up --build
```

Features:
- **Optimized builds** (minified, compressed)
- **No source maps**
- **Production logging** to Seq only
- **Better performance** for production-like testing

## Services Overview

| Service | Port | Description |
|---------|------|-------------|
| **web** | 5174 | React frontend (Docker host port → container port 5173) |
| **server** | 3001 | Express backend API |
| **ollama** | 11434 | AI service for language models |
| **seq** | 5341 | Centralized logging |
| **langfuse** | 3000 | LLM observability |
| **db** | 5432 | PostgreSQL for Langfuse |

## Data Persistence

The following volumes persist data between container restarts:
- `ollama_data`: Downloaded AI models
- `seq_data`: Log storage
- `postgres_data`: Langfuse database

## GPU Acceleration (Optional)

If you have an NVIDIA GPU, you can enable GPU acceleration:

1. Install NVIDIA Container Toolkit
2. Uncomment the GPU section in `docker-compose.dev.yml` under the `ollama` service
3. Restart: `npm run docker:down && npm run docker:dev`

## Troubleshooting

### Port Conflicts
If ports are already in use:
```bash
# Stop existing services
docker-compose down

# Or change ports in docker-compose.yml
```

### Permission Issues
On Linux/Mac, you might need:
```bash
# Fix volume permissions
sudo chown -R $USER:$USER .
```

### Build Issues
```bash
# Rebuild from scratch
docker-compose down
docker system prune -f
npm run docker:build
```

### Network Connectivity Issues
```bash
# Check if containers can communicate
docker-compose exec server ping ollama
docker-compose exec web ping server

# Check port exposure
docker-compose ps
```

### Vite Development Server Issues
If you see "Network: use --host to expose" in web container logs:
- The Vite config already includes `host: '0.0.0.0'`
- Restart containers: `npm run docker:down && npm run docker:dev`

### AI Service Not Available
If backend shows "AI service not available":
1. Ensure Ollama is running: `docker-compose ps ollama`
2. Pull required model: `docker-compose exec ollama ollama pull mistral`
3. Check connectivity: `docker-compose exec server curl http://ollama:11434/api/tags`

### Container Logs
```bash
# View logs for specific service
docker-compose logs web
docker-compose logs server
docker-compose logs ollama

# Follow logs in real-time
docker-compose logs -f server
```

## Environment Configuration

### Docker Compose Variables (.env)
```bash
# Required for car images
GOOGLE_API_KEY=your_google_api_key
GOOGLE_CX=your_google_cx

# Required for session management
SESSION_SECRET=your_strong_secret

# Optional observability
LANGFUSE_PUBLIC_KEY=your_langfuse_key
LANGFUSE_SECRET_KEY=your_langfuse_secret
```

### Server Environment (apps/server/.env)
```bash
# Points to containerized services
OLLAMA_URL=http://ollama:11434
SEQ_URL=http://seq:5341

# Use container networking
PORT=3001
```

## Development Workflow

1. **Make code changes** → Auto-reload in containers
2. **View logs** → `npm run docker:logs`
3. **Debug API** → Check http://localhost:3001/api-docs
4. **Monitor logs** → Check http://localhost:5341 (Seq)
5. **Access shell** → `npm run docker:shell`

## Migration from Local Development

If you were running locally before:

1. **Stop local Ollama**: `pkill ollama` (if running)
2. **Update .env**: Change `OLLAMA_URL` to `http://ollama:11434`
3. **Clear old logs**: Remove `apps/server/logs/` directory
4. **Start with Docker**: `npm run docker:dev`