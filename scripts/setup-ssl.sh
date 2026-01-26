#!/bin/bash
# SSL Setup Script - Let's Encrypt Automatic SSL

set -e

DOMAIN=${DOMAIN:-localhost}
SSL_EMAIL=${SSL_EMAIL:-admin@localhost}

echo "Setting up SSL for domain: $DOMAIN"
echo "Email for SSL notifications: $SSL_EMAIL"

# Check if domain is resolvable
if ! nslookup $DOMAIN >/dev/null 2>&1; then
    echo "Warning: Domain $DOMAIN is not resolvable. Using self-signed certificate."
    generate_self_signed=true
else
    generate_self_signed=false
fi

# Create SSL directory
mkdir -p nginx/ssl

if [ "$generate_self_signed" = true ]; then
    echo "Generating self-signed SSL certificate..."
    
    # Generate private key
    openssl genrsa -out nginx/ssl/key.pem 2048
    
    # Generate certificate signing request
    openssl req -new -key nginx/ssl/key.pem -out nginx/ssl/csr.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
    
    # Generate self-signed certificate
    openssl x509 -req -days 365 -in nginx/ssl/csr.pem \
        -signkey nginx/ssl/key.pem -out nginx/ssl/cert.pem
    
    echo "Self-signed certificate generated."
    echo "⚠️  Browsers will show security warnings. Use for development only."
    
else
    echo "Domain is resolvable. Setting up Let's Encrypt SSL..."
    
    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        echo "Installing certbot..."
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    fi
    
    # Generate Let's Encrypt certificate
    certbot certonly --standalone \
        --email $SSL_EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN \
        --nginx
    
    # Copy certificates to nginx/ssl
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/cert.pem
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/key.pem
    
    echo "Let's Encrypt certificate generated successfully!"
fi

# Set correct permissions
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem

echo "SSL setup completed!"
echo "Certificates location:"
echo "  - Certificate: nginx/ssl/cert.pem"
echo "  - Private Key: nginx/ssl/key.pem"