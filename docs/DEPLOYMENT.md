# Deployment Guide

This guide covers deploying CarGPT to various environments.

## Table of Contents

1. [Local Development](#local-development)
2. [Production Server (Linux)](#production-server-linux)
3. [Docker Deployment](#docker-deployment)
4. [Reverse Proxy Setup](#reverse-proxy-setup)
5. [Security Considerations](#security-considerations)

---

## Local Development

Already covered in main README.md. Quick recap:

```bash
# Install Ollama and model
ollama pull ministral

# Start Ollama
ollama serve

# Start development
npm install
npm run dev
```

---

## Production Server (Linux)

### Prerequisites

- Ubuntu 20.04+ or similar Linux distribution
- Node.js 18+
- Ollama installed
- Root or sudo access

### Step 1: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version

# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull model
ollama pull ministral
```

### Step 2: Setup Application

```bash
# Create app directory
sudo mkdir -p /var/www/cargpt
sudo chown $USER:$USER /var/www/cargpt

# Clone or copy your application
cd /var/www/cargpt
# ... copy your files here

# Install dependencies
npm install --production

# Create environment file
cat > .env << EOF
PORT=3000
SESSION_SECRET=$(openssl rand -base64 32)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=ministral
NODE_ENV=production
EOF
```

### Step 3: Setup Systemd Service

Create Ollama service:

```bash
sudo nano /etc/systemd/system/ollama.service
```

```ini
[Unit]
Description=Ollama Service
After=network.target

[Service]
Type=simple
User=ollama
Group=ollama
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Create CarGPT service:

```bash
sudo nano /etc/systemd/system/cargpt.service
```

```ini
[Unit]
Description=CarGPT Application
After=network.target ollama.service
Requires=ollama.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/cargpt
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=cargpt

[Install]
WantedBy=multi-user.target
```

Enable and start services:

```bash
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl enable cargpt
sudo systemctl start ollama
sudo systemctl start cargpt

# Check status
sudo systemctl status ollama
sudo systemctl status cargpt
```

---

## Docker Deployment

### Dockerfile

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

# Install Ollama
RUN apk add --no-cache curl bash
RUN curl -fsSL https://ollama.ai/install.sh | sh

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Start script
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
```

### Docker Entrypoint

Create `docker-entrypoint.sh`:

```bash
#!/bin/bash
set -e

# Start Ollama in background
ollama serve &

# Wait for Ollama to be ready
sleep 5

# Pull model if not exists
ollama pull ministral

# Start Node.js app
exec npm run start -w server
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  cargpt:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - SESSION_SECRET=${SESSION_SECRET}
      - SEQ_URL=http://seq:5341
  
  seq:
    image: datalust/seq:latest
    ports:
      - "5341:80"
    environment:
      - ACCEPT_EULA=Y
    restart: unless-stopped
      - OLLAMA_URL=http://localhost:11434
      - OLLAMA_MODEL=ministral
    volumes:
      - ollama_data:/root/.ollama
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  ollama_data:
```

### Build and Run

```bash
# Build
docker-compose build

# Run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## Reverse Proxy Setup

### Nginx

Install Nginx:

```bash
sudo apt install nginx
```

Create config:

```bash
sudo nano /etc/nginx/sites-available/cargpt
```

```nginx
server {
    listen 80;
    server_name cargpt.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name cargpt.yourdomain.com;

    # SSL certificates (use certbot)
    ssl_certificate /etc/letsencrypt/live/cargpt.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cargpt.yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts for Ollama responses
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

# Logging
    access_log /var/log/nginx/cargpt-access.log;
    error_log /var/log/nginx/cargpt-error.log;
    
    # Seq Logging (if using Seq)
    location /seq {
        proxy_pass http://localhost:5341;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/cargpt /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Get SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d cargpt.yourdomain.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

### Caddy (Alternative - Simpler)

Install Caddy:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

Create Caddyfile:

```bash
sudo nano /etc/caddy/Caddyfile
```

```caddy
cargpt.yourdomain.com {
    reverse_proxy localhost:3000
    
    # Automatic HTTPS!
    encode gzip
    
    # Security headers
    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
    }
}
```

Reload Caddy:

```bash
sudo systemctl reload caddy
```

---

## Security Considerations

### Environment Variables

Never commit `.env` file. Use environment variables:

```bash
# In production
export SESSION_SECRET=$(openssl rand -base64 32)
export NODE_ENV=production
```

### Firewall

```bash
# Allow only necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### Rate Limiting (Optional)

Add to server.js:

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### Monitoring

Setup PM2 for process management:

```bash
npm install -g pm2

# Start with PM2
pm2 start server.js --name cargpt

# Setup startup script
pm2 startup
pm2 save

# Monitor
pm2 status
pm2 logs cargpt
pm2 monit
```

---

## Troubleshooting

### Ollama Not Starting

```bash
# Check logs
sudo journalctl -u ollama -f

# Verify installation
which ollama
ollama --version

# Test manually
ollama serve
```

### Application Not Accessible

```bash
# Check if running
sudo systemctl status cargpt

# Check logs
sudo journalctl -u cargpt -f

# Check port
sudo netstat -tulpn | grep 3000

# Test locally
curl http://localhost:3000/api/health
```

### SSL Certificate Issues

```bash
# Check certificate
sudo certbot certificates

# Renew manually
sudo certbot renew --force-renewal

# Check Nginx config
sudo nginx -t
```

---

## Performance Tuning

### Ollama Optimization

```bash
# Use GPU if available (NVIDIA)
# Ollama automatically uses GPU if detected

# Check GPU usage
nvidia-smi
```

### Node.js Optimization

```javascript
// In server.js - increase limits if needed
app.use(express.json({ limit: '10mb' }));
```

### Nginx Caching (Optional)

```nginx
# Add to nginx config
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;

location / {
    proxy_cache my_cache;
    proxy_cache_valid 200 60m;
    # ... rest of config
}
```

---

For more help, see [CONTRIBUTING.md](../CONTRIBUTING.md) or open an issue on GitHub.
