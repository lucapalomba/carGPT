#!/bin/bash
# Production Restore Script

set -e

if [ -z "$1" ]; then
    echo "❌ Error: Please provide backup date"
    echo "Usage: ./scripts/restore-production.sh YYYYMMDD_HHMMSS"
    echo "Available backups:"
    ls -la /backup/ | grep backup | awk '{print $9}'
    exit 1
fi

BACKUP_DATE=$1
BACKUP_DIR="/backup"

echo "🔄 Starting CarGPT restore from backup: $BACKUP_DATE"

# Check if backup exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ Error: Backup directory not found: $BACKUP_DIR"
    exit 1
fi

# Stop all services
echo "⏹️  Stopping all services..."
npm run prod:down

# Restore configuration files
echo "📋 Restoring configuration files..."
if [ -f "$BACKUP_DIR/config_$BACKUP_DATE.tar.gz" ]; then
    tar xzf $BACKUP_DIR/config_$BACKUP_DATE.tar.gz
    echo "✅ Configuration restored"
else
    echo "⚠️  Configuration backup not found, skipping..."
fi

# Restore Docker volumes
echo "📦 Restoring Docker volumes..."

# Ollama data
if [ -f "$BACKUP_DIR/ollama_$BACKUP_DATE.tar.gz" ]; then
    echo "  - Restoring Ollama models..."
    docker run --rm -v ollama_data:/target -v $BACKUP_DIR:/backup alpine tar xzf /backup/ollama_$BACKUP_DATE.tar.gz -C /target
    echo "✅ Ollama data restored"
else
    echo "⚠️  Ollama backup not found, skipping..."
fi

# Seq data
if [ -f "$BACKUP_DIR/seq_$BACKUP_DATE.tar.gz" ]; then
    echo "  - Restoring Seq logs..."
    docker run --rm -v seq_data:/target -v $BACKUP_DIR:/backup alpine tar xzf /backup/seq_$BACKUP_DATE.tar.gz -C /target
    echo "✅ Seq data restored"
else
    echo "⚠️  Seq backup not found, skipping..."
fi

# PostgreSQL data
if [ -f "$BACKUP_DIR/postgres_$BACKUP_DATE.sql.gz" ]; then
    echo "  - Restoring PostgreSQL database..."
    # Start only database
    docker-compose -f docker-compose.prod.yml up -d db
    
    # Wait for database to be ready
    sleep 30
    
    # Restore database
    gunzip -c $BACKUP_DIR/postgres_$BACKUP_DATE.sql.gz | docker-compose -f docker-compose.prod.yml exec -T db psql -U langfuse -d langfuse
    echo "✅ PostgreSQL data restored"
else
    echo "⚠️  PostgreSQL backup not found, skipping..."
fi

# Redis data
if [ -f "$BACKUP_DIR/redis_$BACKUP_DATE.tar.gz" ]; then
    echo "  - Restoring Redis data..."
    docker run --rm -v redis_data:/target -v $BACKUP_DIR:/backup alpine tar xzf /backup/redis_$BACKUP_DATE.tar.gz -C /target
    echo "✅ Redis data restored"
else
    echo "⚠️  Redis backup not found, skipping..."
fi

# Start all services
echo "🚀 Starting all services..."
npm run prod:up

# Pull Ollama model if restored
if [ -f "$BACKUP_DIR/ollama_$BACKUP_DATE.tar.gz" ]; then
    echo "🤖 Pulling AI model..."
    sleep 30
    docker-compose -f docker-compose.prod.yml exec ollama ollama pull ministral-3:3b
fi

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 60

# Health checks
echo "🏥 Performing health checks..."
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

echo ""
echo "🎉 Restore completed!"
echo "==================="
echo "🌐 Application: https://$DOMAIN"
echo "📊 Seq Logs: https://$DOMAIN:5341"
echo "🔍 Langfuse: https://$DOMAIN:3000"
echo ""
echo "⚠️  Please verify all services are working correctly"