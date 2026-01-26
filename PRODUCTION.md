# Production Deployment Guide

This guide covers deploying CarGPT to production environments using Docker containers.

## Table of Contents

1. [Quick Production Deploy](#quick-production-deploy)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [SSL/HTTPS Setup](#sslhttps-setup)
5. [Production Deployment](#production-deployment)
6. [Backup & Recovery](#backup--recovery)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Security Hardening](#security-hardening)
9. [Troubleshooting](#troubleshooting)

---

## Quick Production Deploy

Ready to deploy to production? Run this single command:

```bash
# 1. Configure environment
cp .env.production.example .env.production
# Edit .env.production with your domain, API keys, etc.

# 2. Deploy!
./scripts/deploy-production.sh
```

This script will handle SSL setup, container building, deployment, and health checks automatically.

---

## Prerequisites

### Server Requirements
- **CPU**: 4+ cores recommended (for AI processing)
- **RAM**: 8GB+ minimum, 16GB+ recommended
- **Storage**: 50GB+ SSD storage
- **OS**: Ubuntu 20.04+ / Debian 10+ / CentOS 8+
- **Docker**: 20.10+ with Docker Compose
- **Domain**: Custom domain with DNS A record pointing to server

### Software Requirements
```bash
# Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Certbot (for SSL)
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Install AWS CLI (optional, for backup)
sudo apt install -y awscli
```

---

## Environment Configuration

### 1. Domain Setup
Ensure your domain DNS A record points to your server IP:

```bash
# Check DNS propagation
nslookup yourdomain.com
```

### 2. Environment Variables
Copy and configure production environment:

```bash
cp .env.production.example .env.production
```

**Required Variables:**
```bash
# Domain Configuration
DOMAIN=yourdomain.com
SSL_EMAIL=admin@yourdomain.com

# API Keys
GOOGLE_API_KEY=your_google_api_key
GOOGLE_CX=your_google_cx
SESSION_SECRET=your_very_strong_session_secret
```

**Optional but Recommended:**
```bash
# Seq Logging
SEQ_ADMIN_USERNAME=admin
SEQ_ADMIN_PASSWORDHASH=your_hashed_password

# Langfuse Observability
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
LANGFUSE_SECRET_KEY=your_langfuse_secret_key
LANGFUSE_DB_PASSWORD=your_strong_db_password
```

### 3. Generate Secure Passwords
```bash
# Generate Seq admin password hash
docker run --rm datalust/seq config hash

# Generate strong session secret
openssl rand -base64 32
```

---

## SSL/HTTPS Setup

### Automatic SSL with Let's Encrypt
The deployment script will automatically set up SSL certificates:

```bash
# For resolvable domains (production)
./scripts/setup-ssl.sh

# This will:
# - Generate Let's Encrypt certificate
# - Configure nginx with HTTPS
# - Set up auto-renewal
```

### Self-Signed Certificate (Development)
If your domain isn't resolvable yet:

```bash
# The script will automatically generate self-signed certs
./scripts/setup-ssl.sh

# ⚠️ Browser warnings will appear - for development only
```

### SSL Certificate Renewal
Set up automatic renewal:

```bash
# Add to crontab
crontab -e

# Add this line (renews daily at 3:30 AM)
30 3 * * * /path/to/your/project/scripts/renew-ssl.sh >> /var/log/ssl-renewal.log 2>&1
```

---

## Production Deployment

### Method 1: Automated Deployment (Recommended)
```bash
./scripts/deploy-production.sh
```

**What this script does:**
1. Validates environment configuration
2. Sets up SSL certificates
3. Builds production containers
4. Deploys all services
5. Pulls AI model
6. Performs health checks
7. Displays access information

### Method 2: Manual Deployment
```bash
# 1. Setup SSL
./scripts/setup-ssl.sh

# 2. Build containers
npm run prod:build

# 3. Deploy services
npm run prod:up

# 4. Pull AI model
docker-compose -f docker-compose.prod.yml exec ollama ollama pull ministral-3:3b

# 5. Check health
curl https://yourdomain.com/health
curl https://yourdomain.com/api/health
```

### Accessing Production Services
After deployment, access your services at:

- **Main Application**: https://yourdomain.com
- **API Documentation**: https://yourdomain.com/api-docs
- **Seq Logging**: https://yourdomain.com:5341
- **Langfuse**: https://yourdomain.com:3000

---

## Backup & Recovery

### Automated Backups
```bash
# Run backup manually
./scripts/backup-production.sh

# Set up automated daily backups (2 AM)
crontab -e
0 2 * * * /path/to/your/project/scripts/backup-production.sh
```

### Backup Contents
- **Ollama Data**: Downloaded AI models
- **Seq Data**: Application logs
- **PostgreSQL**: Langfuse database
- **Redis**: Cache data
- **Configuration**: All config files

### Recovery from Backup
```bash
# Restore from specific backup
./scripts/restore-production.sh 20240125_143000

# This will:
# - Stop all services
# - Restore Docker volumes
# - Restore database
# - Restart services
# - Verify health
```

### Cloud Backup Storage
Configure AWS S3 backup in `.env.production`:

```bash
BACKUP_S3_BUCKET=your-backup-bucket
BACKUP_S3_REGION=us-east-1
BACKUP_RETENTION_DAYS=30
```

---

## Monitoring & Maintenance

### Health Monitoring
```bash
# Check service health
curl https://yourdomain.com/health

# View logs
npm run prod:logs

# Individual service logs
docker-compose -f docker-compose.prod.yml logs -f server
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### Performance Monitoring
Access monitoring dashboards:
- **Seq Logs**: https://yourdomain.com:5341
- **Langfuse Analytics**: https://yourdomain.com:3000

### Regular Maintenance Tasks

#### Weekly
```bash
# Update Docker images
docker-compose -f docker-compose.prod.yml pull

# Restart with new images
npm run prod:down && npm run prod:up
```

#### Monthly
```bash
# Clean unused Docker resources
docker system prune -f

# Check SSL certificate expiry
openssl x509 -in nginx/ssl/cert.pem -noout -dates
```

---

## Security Hardening

### Network Security
The production setup includes:
- **Internal networks**: Services communicate internally
- **Firewall rules**: Only necessary ports exposed
- **Rate limiting**: API endpoints protected
- **SSL/TLS**: HTTPS enforced with modern ciphers

### Application Security
```bash
# Verify security headers
curl -I https://yourdomain.com

# Expected headers:
# X-Frame-Options: SAMEORIGIN
# X-XSS-Protection: 1; mode=block
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=31536000
```

### Access Control
```bash
# Restrict access to monitoring tools (optional)
# Edit nginx/conf.d/default.conf
location / {
    allow 192.168.1.0/24;  # Your office IP
    deny all;
}
```

### Database Security
- **Strong passwords**: Required for PostgreSQL
- **Network isolation**: Database not exposed externally
- **Regular backups**: Automated with encryption

---

## Troubleshooting

### Common Issues

#### SSL Certificate Problems
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Renew certificate manually
./scripts/renew-ssl.sh
```

#### Service Not Starting
```bash
# Check logs
npm run prod:logs

# Check individual service
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs service_name
```

#### Performance Issues
```bash
# Check resource usage
docker stats

# Check nginx errors
docker-compose -f docker-compose.prod.yml logs nginx

# Check server errors
docker-compose -f docker-compose.prod.yml logs server
```

#### Memory Issues with Ollama
```bash
# Check available memory
free -h

# Restart Ollama service
docker-compose -f docker-compose.prod.yml restart ollama
```

### Emergency Procedures

#### Full Service Restart
```bash
npm run prod:down
sleep 10
npm run prod:up
```

#### Restore from Backup
```bash
# Find latest backup
ls -la /backup/ | grep backup

# Restore
./scripts/restore-production.sh 20240125_143000
```

#### Reset to Clean State
```bash
# WARNING: This deletes all data!
docker-compose -f docker-compose.prod.yml down -v
docker system prune -a -f
# Then redeploy
./scripts/deploy-production.sh
```

### Getting Help

1. **Check logs**: `npm run prod:logs`
2. **Verify health**: Access `/health` endpoint
3. **Check monitoring**: Seq and Langfuse dashboards
4. **Review configuration**: `.env.production` file
5. **Restart services**: `npm run prod:down && npm run prod:up`

---

## Production Checklist

Before going live, verify:

- [ ] Domain DNS configured and resolving
- [ ] SSL certificates valid and auto-renewal set
- [ ] All environment variables configured
- [ ] AI models downloaded successfully
- [ ] Health checks passing
- [ ] Backup strategy implemented
- [ ] Monitoring dashboards accessible
- [ ] Security headers present
- [ ] Rate limiting configured
- [ ] Log rotation configured
- [ ] Emergency procedures documented

---

**🎉 Your CarGPT application is now production-ready!**

For additional support, check the [Docker Development Guide](DOCKER.md) or open an issue on GitHub.