# Security Policy

## Supported Versions

Currently supported versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in CarGPT, please follow these steps:

### 1. **Do Not** Open a Public Issue

Security vulnerabilities should not be disclosed publicly until they have been addressed.

### 2. Report Privately

Please report security vulnerabilities by:
- Opening a GitHub Security Advisory in this repository
- Or emailing the maintainers directly (if contact info is available)

### 3. Include Details

When reporting, please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### 4. Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: Within 7 days
  - High: Within 14 days
  - Medium: Within 30 days
  - Low: Next regular release

## Security Considerations

### Known Security Aspects

#### 1. Local AI Model (Ollama)
- **✅ Secure**: All data processed locally
- **✅ Private**: No data sent to external services
- **⚠️ Note**: Ensure Ollama is configured to only accept local connections

#### 2. Session Management
- Sessions stored in memory (not persistent)
- Sessions expire after 1 hour
- No sensitive user data stored
- Session secret should be changed in production

#### 3. Input Validation
- User input is sanitized before processing
- No SQL injection risk (no database)
- XSS protection through proper escaping

#### 4. Dependencies
- Regular `npm audit` checks recommended
- Keep dependencies updated
- No known vulnerabilities in current dependencies

### Best Practices for Deployment

#### Development
```bash
# Use example environment
cp .env.example .env

# Default session secret is fine for development
```

#### Production
```bash
# Generate strong session secret
SESSION_SECRET=$(openssl rand -base64 32)

# Update .env
echo "SESSION_SECRET=$SESSION_SECRET" >> .env

# Use environment variables, not .env file
export SESSION_SECRET="your-strong-secret-here"
```

#### Network Security

**Development** (default):
```javascript
// Ollama on localhost only
OLLAMA_URL=http://localhost:11434
```

**Production** (if deploying publicly):
- Use HTTPS (add TLS/SSL)
- Implement rate limiting
- Add authentication if needed
- Configure CORS appropriately
- Use a reverse proxy (nginx, Caddy)

#### Recommended: Reverse Proxy Setup

```nginx
# nginx example
server {
    listen 443 ssl http2;
    server_name cargpt.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Potential Security Risks

#### Low Risk
- **Session hijacking**: Sessions are short-lived (1 hour) and memory-only
- **DoS via large inputs**: Input length should be limited (consider adding max length)
- **Memory exhaustion**: Implement conversation limits per session

#### Mitigations Implemented
- ✅ Input validation
- ✅ Session expiration
- ✅ No persistent storage of user data
- ✅ Local AI processing (no external APIs)
- ✅ CORS configured
- ✅ No authentication required (public tool)

#### Not Yet Implemented
- ⚠️ Rate limiting per IP
- ⚠️ Request size limits
- ⚠️ HTTPS enforcement
- ⚠️ Content Security Policy headers

## Security Updates

Security updates will be released as patch versions (e.g., 1.0.1, 1.0.2).

Subscribe to releases to be notified of security updates.

## Disclosure Policy

- Vulnerabilities will be disclosed publicly after a fix is released
- Credit will be given to reporters (unless they prefer to remain anonymous)
- A security advisory will be published with details and mitigation steps

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Note**: CarGPT is designed as a local development tool. For production deployments, additional security hardening is recommended.
