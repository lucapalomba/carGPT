#!/bin/bash
# Production Backup Script

set -e

BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="cargpt_backup_$DATE"

echo "💾 Starting CarGPT backup..."

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup Docker volumes
echo "📦 Backing up Docker volumes..."

# Ollama data
echo "  - Backing up Ollama models..."
docker run --rm -v ollama_data:/source -v $BACKUP_DIR:/backup alpine tar czf /backup/ollama_$DATE.tar.gz -C /source .

# Seq data
echo "  - Backing up Seq logs..."
docker run --rm -v seq_data:/source -v $BACKUP_DIR:/backup alpine tar czf /backup/seq_$DATE.tar.gz -C /source .

# PostgreSQL data
echo "  - Backing up PostgreSQL database..."
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U langfuse langfuse | gzip > $BACKUP_DIR/postgres_$DATE.sql.gz

# Redis data
echo "  - Backing up Redis data..."
docker run --rm -v redis_data:/source -v $BACKUP_DIR:/backup alpine tar czf /backup/redis_$DATE.tar.gz -C /source .

# Backup configuration files
echo "📋 Backing up configuration..."
tar czf $BACKUP_DIR/config_$DATE.tar.gz \
    docker-compose.prod.yml \
    .env.production \
    nginx/ \
    scripts/

# Create backup manifest
cat > $BACKUP_DIR/manifest_$DATE.txt << EOF
CarGPT Backup Manifest
====================
Backup Date: $(date)
Domain: $DOMAIN
Server: $(hostname)

Contents:
- ollama_$DATE.tar.gz: Ollama AI models
- seq_$DATE.tar.gz: Seq logging data
- postgres_$DATE.sql.gz: PostgreSQL database
- redis_$DATE.tar.gz: Redis cache data
- config_$DATE.tar.gz: Configuration files

Restoration:
1. Stop all services: npm run prod:down
2. Extract configuration: tar xzf config_$DATE.tar.gz
3. Restore volumes (use restore script)
4. Start services: npm run prod:up
EOF

echo "✅ Backup completed!"
echo "📁 Backup location: $BACKUP_DIR"
echo "📋 Created manifest: $BACKUP_DIR/manifest_$DATE.txt"

# Optional: Upload to S3 (if AWS credentials are configured)
if command -v aws &> /dev/null && [ ! -z "$BACKUP_S3_BUCKET" ]; then
    echo "☁️  Uploading backup to S3..."
    aws s3 cp $BACKUP_DIR/ s3://$BACKUP_S3_BUCKET/backups/ --recursive
    echo "✅ Backup uploaded to S3"
fi

# Cleanup old backups (keep last 30 days)
if [ ! -z "$BACKUP_RETENTION_DAYS" ]; then
    echo "🧹 Cleaning up old backups (older than $BACKUP_RETENTION_DAYS days)..."
    find $BACKUP_DIR -name "*backup*" -mtime +$BACKUP_RETENTION_DAYS -delete
    echo "✅ Cleanup completed"
fi