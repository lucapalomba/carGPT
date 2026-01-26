# 🌐 Networking Troubleshooting Guide

This guide covers common networking issues you might encounter when running CarGPT, especially with Docker development.

## Port Mapping Overview

### Local Development
```
Frontend:  localhost:5173  → Vite dev server
Backend:   localhost:3000  → Express server
API Docs:  localhost:3000/api-docs
```

### Docker Development
```
Frontend:  localhost:5174  → container:5173 (Vite dev server)
Backend:   localhost:3001  → container:3001 (Express server)
API Docs:  localhost:3001/api-docs
Ollama:    localhost:11434 → container:11434
Seq:       localhost:5341  → container:5341
Langfuse:   localhost:3000  → container:3000
```

## Common Issues & Solutions

### 1. "Port already in use" Error

**Problem**: Another process is using the required port.

**Solutions**:
```bash
# Find what's using the port (Windows)
netstat -ano | findstr :5174

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Or use different ports by editing docker-compose.dev.yml
```

### 2. "Network: use --host to expose" (Vite Error)

**Problem**: Vite dev server isn't exposed to the Docker network.

**Solution**: The Vite config should include:
```typescript
// apps/web/vite.config.ts
export default defineConfig({
  server: {
    host: '0.0.0.0',  // This line is required
    proxy: {
      '/api': 'http://server:3001'  // Use service name, not localhost
    }
  }
})
```

**Fix**: Restart containers after updating config:
```bash
npm run docker:down
npm run docker:dev
```

### 3. "AI service not available" or Connection Refused

**Problem**: Backend can't connect to Ollama service.

**Diagnostics**:
```bash
# Check if Ollama container is running
docker-compose ps ollama

# Test connectivity from server container
docker-compose exec server ping ollama
docker-compose exec server curl http://ollama:11434/api/tags

# Check Ollama logs
docker-compose logs ollama
```

**Solutions**:
```bash
# Ensure Ollama is running
docker-compose up -d ollama

# Pull required model
docker-compose exec ollama ollama pull mistral

# Check server environment variables
docker-compose exec server env | grep OLLAMA
```

### 4. Container Communication Issues

**Problem**: Services can't communicate with each other.

**Diagnostics**:
```bash
# Check Docker network
docker network ls
docker network inspect cargpt_default

# Test service-to-service communication
docker-compose exec web ping server
docker-compose exec server ping ollama
docker-compose exec server ping seq
```

**Solution**: Ensure all services use the same Docker network (default behavior with docker-compose).

### 5. Frontend Can't Reach Backend API

**Problem**: API calls fail from the browser.

**Common Causes**:
- Wrong port in API calls
- CORS configuration issues
- Proxy configuration problems

**Diagnostics**:
```bash
# Check backend is accessible
curl http://localhost:3001/api/health

# Check Vite proxy configuration
cat apps/web/vite.config.ts

# Check browser network tab for actual requests
```

**Solution**: Vite proxy should redirect `/api` to `http://server:3001` (service name, not localhost).

## Docker Network Debugging

### View Network Configuration
```bash
# List all networks
docker network ls

# Inspect CarGPT network
docker network inspect cargpt_default

# View container connections
docker-compose ps
```

### Container Network Isolation
```bash
# Enter container shell
docker-compose exec server sh

# Test from inside container
curl http://ollama:11434/api/tags
ping seq
ping server
```

### Port Exposure Verification
```bash
# Check which ports are exposed
docker-compose ps

# Check port bindings
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

## Environment-Specific Network Configs

### Development (docker-compose.dev.yml)
```yaml
services:
  web:
    ports:
      - "5174:5173"  # host:container
  server:
    ports:
      - "3001:3001"
    environment:
      - OLLAMA_URL=http://ollama:11434  # Use service name
      - SEQ_URL=http://seq:5341
```

### Production (docker-compose.prod.yml)
```yaml
services:
  web:
    # No direct port exposure - goes through nginx
  server:
    # Internal only - nginx handles external traffic
```

## Host vs Container Networking

### Key Concepts
- **Host Port**: What you access from your machine (e.g., localhost:5174)
- **Container Port**: What the service listens on inside container (e.g., 5173)
- **Service Name**: How containers communicate internally (e.g., `http://server:3001`)

### Communication Patterns
```bash
# From host to container
curl http://localhost:5174  # → web container

# From container to container
curl http://server:3001     # → server container (use service name)
curl http://ollama:11434    # → ollama container
```

## Troubleshooting Checklist

### Initial Setup Issues
- [ ] Docker Desktop is running
- [ ] No other apps using ports 3001, 5174, 11434
- [ ] Environment variables are set correctly
- [ ] Required models are pulled: `docker-compose exec ollama ollama list`

### Runtime Issues
- [ ] All containers running: `docker-compose ps`
- [ ] Container health: `docker-compose ps` (look for "healthy" status)
- [ ] Network connectivity: `docker-compose exec server ping ollama`
- [ ] Log errors: `npm run docker:logs`

### API Issues
- [ ] Backend accessible: `curl http://localhost:3001/api/health`
- [ ] Frontend accessible: `curl http://localhost:5174`
- [ ] API docs accessible: `curl http://localhost:3001/api-docs`
- [ ] Browser network tab shows successful API calls

## Getting Help

### Log Analysis
```bash
# View all logs
npm run docker:logs

# Follow specific service logs
docker-compose logs -f server
docker-compose logs -f web
docker-compose logs -f ollama
```

### Common Error Patterns
- `ECONNREFUSED`: Service not running or wrong port
- `ENOTFOUND`: Wrong service name in container communication
- `timeout`: Network connectivity issues
- `use --host to expose`: Vite host configuration issue

### Reset Procedures
```bash
# Full reset (last resort)
docker-compose down -v  # Remove volumes
docker system prune -f  # Clean up
npm run docker:dev      # Fresh start
```

## Performance Tips

### Network Optimization
- Use Docker's internal network for service-to-service communication
- Avoid unnecessary port exposures in production
- Consider using nginx reverse proxy for production

### Development Tips
- Mount volumes for hot reload instead of rebuilding
- Use `--follow` flag for log monitoring
- Keep Docker Desktop updated for latest networking features