#!/bin/bash
# Production Deployment Script

set -e

echo "🚀 CarGPT Production Deployment"
echo "================================"

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Please copy .env.production.example to .env.production and configure it."
    exit 1
fi

# Load production environment
source .env.production

# Validate required variables
if [ -z "$DOMAIN" ] || [ -z "$SESSION_SECRET" ] || [ -z "$GOOGLE_API_KEY" ]; then
    echo "❌ Error: Required environment variables not set!"
    echo "Please ensure DOMAIN, SESSION_SECRET, and GOOGLE_API_KEY are set in .env.production"
    exit 1
fi

echo "✅ Environment configuration loaded"
echo "🌐 Domain: $DOMAIN"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    exit 1
fi

echo "✅ Docker is running"

# Setup SSL
echo "🔐 Setting up SSL certificates..."
./scripts/setup-ssl.sh

# Pull latest changes (optional)
read -p "📥 Pull latest changes from git? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Pulling latest changes..."
    git pull origin main
fi

# Build and deploy
echo "🏗️  Building production containers..."
npm run prod:build

echo "🚢 Deploying production containers..."
npm run prod:up

# Pull Ollama model
echo "🤖 Pulling AI model..."
docker-compose -f docker-compose.prod.yml exec ollama ollama pull ministral-3:3b

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Health checks
echo "🏥 Performing health checks..."

# Check if services are responding
if curl -f https://$DOMAIN/health >/dev/null 2>&1; then
    echo "✅ Frontend is healthy"
else
    echo "❌ Frontend health check failed"
fi

if curl -f https://$DOMAIN/api/health >/dev/null 2>&1; then
    echo "✅ Backend API is healthy"
else
    echo "❌ Backend API health check failed"
fi

# Display deployment info
echo ""
echo "🎉 Deployment Complete!"
echo "======================="
echo "🌐 Application: https://$DOMAIN"
echo "📊 Seq Logs: https://$DOMAIN:5341"
echo "🔍 Langfuse: https://$DOMAIN:3000"
echo ""
echo "📝 Useful Commands:"
echo "  - View logs: npm run prod:logs"
echo "  - Stop app: npm run prod:down"
echo "  - Access shell: npm run prod:shell"
echo "  - Renew SSL: npm run prod:ssl-renew"
echo ""
echo "🔧 Remember to set up SSL renewal cron job:"
echo "  crontab -e"
echo "  Add: 30 3 * * * /path/to/your/project/scripts/renew-ssl.sh"