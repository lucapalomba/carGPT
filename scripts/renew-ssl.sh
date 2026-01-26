#!/bin/bash
# SSL Renewal Script - Let's Encrypt Automatic Renewal

set -e

DOMAIN=${DOMAIN:-localhost}

echo "Checking SSL certificate renewal for domain: $DOMAIN"

# Check if domain is resolvable (Let's Encrypt only)
if ! nslookup $DOMAIN >/dev/null 2>&1; then
    echo "Domain $DOMAIN is not resolvable. Skipping renewal (using self-signed cert)."
    exit 0
fi

# Renew certificate
certbot renew --nginx --quiet

# Copy renewed certificates to nginx/ssl
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/cert.pem
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/key.pem
    
    # Set correct permissions
    chmod 600 nginx/ssl/key.pem
    chmod 644 nginx/ssl/cert.pem
    
    echo "SSL certificates renewed successfully!"
    echo "Reloading nginx..."
    docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
else
    echo "No renewal needed for $DOMAIN"
fi

echo "SSL renewal check completed."