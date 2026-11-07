# Deployment Guide

## Production Deployment for SIWES Jewelry E-Commerce Platform

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Environment Setup](#environment-setup)
4. [Database Deployment](#database-deployment)
5. [Application Deployment](#application-deployment)
6. [Security Hardening](#security-hardening)
7. [Monitoring & Logging](#monitoring--logging)
8. [Troubleshooting](#troubleshooting)
9. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required
- Node.js v16+ or v18+
- MongoDB 4.4+
- Redis 6.0+ (optional but recommended for caching)
- Git
- PM2 (for process management)
- Nginx (reverse proxy)
- SSL/TLS certificates

### Access Requirements
- Paystack account (payment processing)
- Email service provider account (SendGrid, AWS SES, etc.)
- Cloud hosting account (AWS, DigitalOcean, Heroku, etc.)
- Domain name and DNS access

---

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (`npm test`)
- [ ] Code reviewed and approved
- [ ] No console.logs in production code
- [ ] Environment variables configured
- [ ] Security dependencies updated (`npm audit`)
- [ ] Build process successful

### Security
- [ ] SSL/TLS certificates obtained
- [ ] Firewall rules configured
- [ ] Database credentials rotated
- [ ] API keys secured in environment variables
- [ ] CORS whitelist configured
- [ ] Rate limiting enabled

### Database
- [ ] Backup strategy in place
- [ ] Database indexes created
- [ ] Migration scripts tested
- [ ] Database replicas configured
- [ ] Monitoring alerts set up

### Infrastructure
- [ ] Server resources adequate (CPU, RAM, disk)
- [ ] Load balancing configured
- [ ] Auto-scaling rules set up
- [ ] Monitoring tools installed
- [ ] Log aggregation configured

---

## Environment Setup

### 1. Create Production `.env` File

```bash
# Create secure environment file
sudo touch /etc/jewelry/.env
sudo chmod 600 /etc/jewelry/.env
```

```env
# Application
NODE_ENV=production
PORT=5000
BASE_URL=https://api.jewelry.local

# Database
MONGO_URI=[MongoDB URI redacted; configure MONGO_URI via environment variables]
MONGO_OPTIONS=retryWrites=true&w=majority

# JWT
JWT_SECRET=your_very_secure_jwt_secret_key_here_minimum_32_characters
JWT_EXPIRE=24h

# Admin Credentials
SITE_ADMIN_USER=admin@jewelry.local
SITE_ADMIN_PASS=very_secure_admin_password
SITE_ADMIN_PASS_HASH=$2b$10$... # bcrypt hash

# Paystack
PAYSTACK_PUBLIC_KEY=pk_live_...
PAYSTACK_SECRET_KEY=sk_live_...

# Email Service
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=sg_...
EMAIL_FROM=noreply@jewelry.local

# Security
ALLOWED_ORIGINS=https://jewelry.local,https://www.jewelry.local
CSRF_SECRET=your_csrf_secret
SESSION_SECRET=your_session_secret

# Caching (Redis)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/jewelry/app.log

# SSL/TLS
SSL_KEY_PATH=/etc/jewelry/ssl/private.key
SSL_CERT_PATH=/etc/jewelry/ssl/certificate.crt
```

### 2. Install Global Dependencies

```bash
sudo npm install -g pm2
sudo npm install -g forever
```

### 3. Create Application Directory

```bash
sudo mkdir -p /opt/jewelry
sudo chown -R appuser:appuser /opt/jewelry
cd /opt/jewelry
```

---

## Database Deployment

### MongoDB Atlas Setup

1. **Create Cluster**
   ```
   - Go to MongoDB Atlas
   - Create M10+ cluster for production
   - Enable encryption at rest
   - Enable backups (daily)
   - Configure IP whitelist
   ```

2. **Create Database User**
   ```
   - Create dedicated database user
   - Use strong password (32+ characters)
   - Assign minimal required roles
   ```

3. **Initialize Database**
   ```bash
   # Connect and run migrations
   node migrate.js --env production
   ```

4. **Create Indexes**
   ```bash
   node scripts/create-indexes.js
   ```

5. **Enable Replication** (for high availability)
   ```
   - Configure 3-node replica set
   - Enable automatic failover
   - Set up monitoring
   ```

### Database Backup Strategy

```bash
# Daily backup script (/opt/jewelry/backup.sh)
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="$MONGO_URI" --out=/backups/mongodb_$DATE
tar -czf /backups/mongodb_$DATE.tar.gz /backups/mongodb_$DATE
rm -rf /backups/mongodb_$DATE
```

---

## Application Deployment

### 1. Clone Repository

```bash
cd /opt/jewelry
git clone https://github.com/yourusername/jewelry-ecommerce.git .
```

### 2. Install Dependencies

```bash
npm install --production
npm run build # if applicable
```

### 3. Configure PM2

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'jewelry-api',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/jewelry/error.log',
    out_file: '/var/log/jewelry/output.log',
    log_file: '/var/log/jewelry/combined.log',
    time_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    max_restarts: 10,
    min_uptime: '10s',
    listen_timeout: 3000,
    kill_timeout: 5000
  }]
};
```

### 4. Start Application with PM2

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 5. Verify Deployment

```bash
pm2 logs jewelry-api
pm2 status
curl http://localhost:5000/health
```

---

## Security Hardening

### 1. Nginx Configuration

Create `/etc/nginx/sites-available/jewelry`:

```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name api.jewelry.local www.jewelry.local;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name api.jewelry.local;

    # SSL Configuration
    ssl_certificate /etc/jewelry/ssl/certificate.crt;
    ssl_certificate_key /etc/jewelry/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

    location /api/auth/ {
        limit_req zone=auth burst=10 nodelay;
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        limit_req zone=api burst=50 nodelay;
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        limit_req zone=general burst=20 nodelay;
        proxy_pass http://localhost:3000; # Frontend
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/jewelry /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2. Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
```

### 3. Fail2Ban Setup

```bash
sudo apt-get install fail2ban

# Create /etc/fail2ban/jail.local
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true
port = http,https
```

### 4. Database Security

```bash
# MongoDB - disable unauthenticated access
# Set up IP whitelist
# Enable encryption at rest and in transit
# Use separate admin and application users
```

---

## Monitoring & Logging

### 1. PM2 Monitoring

```bash
# Install PM2 Plus
pm2 install pm2-auto-pull
pm2 install pm2-logrotate
pm2 save
```

### 2. Application Metrics

```bash
# Install monitoring dependencies
npm install prometheus-client newrelic datadog-browser-rum
```

### 3. Log Aggregation

Setup with ELK Stack:

```bash
# Elasticsearch
docker run -d -p 9200:9200 docker.elastic.co/elasticsearch/elasticsearch:8.0.0

# Kibana
docker run -d -p 5601:5601 docker.elastic.co/kibana/kibana:8.0.0

# Beats for log shipping
filebeat config: /etc/filebeat/filebeat.yml
```

### 4. Health Check Endpoint

Add to `server.js`:

```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    mongodb: db.connection.readyState
  });
});
```

Monitor with:

```bash
curl -I https://api.jewelry.local/health
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs jewelry-api --err

# Verify environment variables
env | grep MONGO_URI

# Check port availability
lsof -i :5000

# Restart application
pm2 restart jewelry-api
pm2 restart jewelry-api --update-env
```

### Database Connection Issues

```bash
# Test MongoDB connection
mongosh "[MongoDB URI redacted; configure MONGO_URI via environment variables] --username admin

# Check connection string
echo $MONGO_URI

# Verify IP whitelist in MongoDB Atlas
```

### Performance Issues

```bash
# Check memory usage
pm2 monit

# Check CPU usage
top -p $(pgrep -f 'node.*server.js')

# Check database performance
db.currentOp() # MongoDB

# Check Redis memory
redis-cli INFO memory
```

### SSL/TLS Certificate Issues

```bash
# Check certificate expiration
openssl x509 -enddate -noout -in /etc/jewelry/ssl/certificate.crt

# Renew with Let's Encrypt
sudo certbot renew --nginx

# Check certificate chain
openssl s_client -connect api.jewelry.local:443
```

---

## Rollback Procedures

### Quick Rollback

```bash
# If recent deployment fails:
git log --oneline | head -10
git revert HEAD
npm install
pm2 restart jewelry-api
```

### Database Rollback

```bash
# From backup
mongorestore --uri="$MONGO_URI" /backups/mongodb_backup_date/
```

### Version Rollback

```bash
# Use PM2 versioning
pm2 save
git checkout v1.0.0  # specific version tag
npm install
pm2 restart jewelry-api --update-env
```

---

## Maintenance Tasks

### Weekly
- [ ] Review error logs
- [ ] Check database size
- [ ] Monitor API response times
- [ ] Review failed transactions

### Monthly
- [ ] Update dependencies (`npm update`)
- [ ] Security audit (`npm audit`)
- [ ] Database optimization
- [ ] Review and rotate logs

### Quarterly
- [ ] Performance testing
- [ ] Security scanning
- [ ] Database maintenance
- [ ] Disaster recovery drill

---

## Production Checklist

- [ ] SSL/TLS configured
- [ ] Environment variables set
- [ ] Database backups working
- [ ] Monitoring alerts active
- [ ] Rate limiting enabled
- [ ] CORS configured
- [ ] Logging aggregated
- [ ] Health checks passing
- [ ] Load balancing working
- [ ] Auto-scaling configured
- [ ] Failover tested
- [ ] Documentation updated

---

## Support

For deployment issues:
- Email: devops@jewelry.local
- Slack: #deployment-support
- Documentation: https://docs.jewelry.local/deployment

---

**Last Updated**: December 24, 2025  
**Version**: 1.0.0
