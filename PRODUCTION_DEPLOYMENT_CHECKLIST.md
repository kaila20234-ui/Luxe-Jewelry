# Production Deployment Checklist

## Pre-Deployment Verification (1-2 days before)

### Code Quality & Security
- [ ] All tests passing locally: `npm test`
- [ ] No linting errors: `npm run lint` (or check CI/CD)
- [ ] Security audit clean: `npm audit`
- [ ] No console.log() statements in production code
- [ ] No hardcoded credentials in codebase
- [ ] Error handling implemented for all API endpoints
- [ ] SQL injection protection verified (parameterized queries)
- [ ] XSS protection enabled (input sanitization, helmet headers)
- [ ] CSRF protection configured
- [ ] Rate limiting configured on public endpoints
- [ ] API routes have proper authentication checks

### Documentation
- [ ] README.md updated with deployment instructions
- [ ] API documentation complete and accurate
- [ ] Database schema documented
- [ ] Environment variables documented in `.env.example`
- [ ] Troubleshooting guide written
- [ ] Runbook created for common issues

### Environment & Infrastructure
- [ ] Production server provisioned and tested
- [ ] SSL/HTTPS certificate obtained (Let's Encrypt free option available)
- [ ] Database backup strategy configured
- [ ] Redis configured and tested
- [ ] MongoDB replica set configured (for production)
- [ ] Monitoring & logging infrastructure ready
- [ ] Alerting configured for critical errors

---

## 48 Hours Before Deployment

### DNS & Domain Configuration
- [ ] Domain registrar confirmed
- [ ] DNS A record points to production server IP
- [ ] DNS TTL set to 300 seconds (for quick rollback if needed)
- [ ] SSL certificate provisioned and installed on server
- [ ] Test HTTPS connection: `curl https://yourdomain.com`
- [ ] Email/SMTP MX records configured (if using custom domain mail)

### GitHub Secrets Configuration
- [ ] DOCKER_USERNAME added to GitHub Secrets
- [ ] DOCKER_PASSWORD added to GitHub Secrets
- [ ] PROD_SERVER added to GitHub Secrets
- [ ] PROD_KEY (SSH private key) added to GitHub Secrets
- [ ] All secrets verified as "***" (hidden) in Actions logs
- [ ] Test secrets with manual GitHub Action run

### Server Preparation
- [ ] SSH access verified: `ssh -i key.pem user@server`
- [ ] Only necessary ports open (22, 80, 443)
- [ ] Firewall configured to block unauthorized access
- [ ] System updated: `sudo apt update && sudo apt upgrade`
- [ ] Docker installed and running: `docker --version`
- [ ] docker-compose installed: `docker-compose --version`
- [ ] Node.js available (if not containerized): `node --version`
- [ ] Create deployment user: `sudo useradd -m -s /bin/bash deploy`
- [ ] Configure sudo access for deploy user if needed
- [ ] Domain DNS fully propagated (check: `nslookup yourdomain.com`)

---

## 24 Hours Before Deployment

### Database Backup
- [ ] Full MongoDB backup performed and verified
- [ ] Backup stored in 2 locations (local + cloud storage)
- [ ] Restore process tested on staging
- [ ] Backup automation configured
- [ ] Backup retention policy documented (e.g., 30-day rolling backup)

### Rollback Plan
- [ ] Previous working version saved/tagged in git
- [ ] Rollback procedure documented
- [ ] Rollback tested on staging server
- [ ] Team trained on rollback process
- [ ] Communication plan for deployment issues

### Staging Environment Test
- [ ] Deploy to staging via CI/CD pipeline
- [ ] Full smoke tests on staging
- [ ] Performance tests on staging (load, response time)
- [ ] Test backup & restore process
- [ ] Database migration tested (if any schema changes)
- [ ] Email functionality tested
- [ ] Payment gateway tested (if applicable)
- [ ] Third-party API integrations tested

### Load & Performance
- [ ] Load test: `ab -n 1000 -c 50 http://staging.example.com/api/products`
- [ ] Response times acceptable: < 200ms for API endpoints
- [ ] Database connection pool configured
- [ ] Redis is warmed and functional
- [ ] Static assets compressed (minified CSS/JS)
- [ ] Images optimized for web
- [ ] CDN configured (if using)

---

## Deployment Day - Morning

### Final Pre-Deployment Checks
- [ ] Team communication channel open and ready
- [ ] Incident response team available
- [ ] All required team members online
- [ ] External dependencies status verified (payment APIs, email services, etc.)
- [ ] Monitoring dashboards open in separate window
- [ ] Database backups current and verified
- [ ] Server uptime status page ready to post updates

### Notifications
- [ ] Stakeholders notified of deployment window
- [ ] Status page updated: "Scheduled Maintenance - 2pm EST"
- [ ] Customer communication (if affected): maintenance window email sent
- [ ] Slack channel created for deployment: #deployment-prod

### Final Code Review
- [ ] Latest commit reviewed
- [ ] All PRs merged to main branch
- [ ] No uncommitted changes
- [ ] Version number bumped: `package.json` version updated
- [ ] CHANGELOG updated with deployment notes
- [ ] Git tag created: `git tag v2.0.0` (if major version)

---

## Deployment - Execution Phase

### Pre-Deployment Tasks (Before running deployment script)
- [ ] Last backup completed: `git log --oneline | head -1` (note current commit)
- [ ] Clear CI/CD cache if needed: GitHub Actions → Clear caches
- [ ] Health check endpoint accessible on staging

### Run Deployment
```bash
# Option 1: GitHub Actions (recommended)
1. Go to GitHub → Actions tab
2. Select "CI/CD Pipeline" workflow
3. Click "Run workflow" → select "main" branch
4. Monitor progress in Actions tab

# Option 2: Manual Deployment (if GitHub Actions fails)
ssh deploy@yourdomain.com
cd /app/siwes
docker-compose pull
docker-compose down
docker-compose up -d
# Verify: curl http://localhost:5000/api/health
```

### Monitor Deployment Progress
- [ ] Docker image build completes successfully
- [ ] Container starts without errors
- [ ] MongoDB connection successful: Check logs
- [ ] Redis cache initialized
- [ ] API endpoints responding to requests
- [ ] Health check endpoint returns ✅: `curl https://yourdomain.com/api/health`

### Post-Deployment Smoke Tests
- [ ] Homepage loads: `curl https://yourdomain.com`
- [ ] API is accessible: `curl https://yourdomain.com/api/products`
- [ ] Login functionality works (test with staging account)
- [ ] Create order flow works
- [ ] Admin dashboard accessible
- [ ] Search functionality works
- [ ] Images load correctly
- [ ] Styling/CSS applies properly
- [ ] CSS links are absolute paths in production (not relative)
- [ ] JavaScript errors in browser console: NONE
- [ ] Database queries performing well (< 100ms average)
- [ ] Cache is warming and serving requests

---

## Post-Deployment Monitoring (First Hour)

### Real-Time Monitoring
- [ ] Application Performance Monitoring (APM) dashboard open
  - Request success rate > 99.9%
  - Average response time < 200ms
  - Error rate < 0.1%
- [ ] Server metrics being monitored
  - CPU usage < 60%
  - Memory usage < 70%
  - Disk I/O normal
- [ ] Database performance
  - Query execution time < 100ms average
  - Connection pool healthy
  - No long-running queries
- [ ] Error logs being monitored
  - No authentication errors
  - No database connection errors
  - No out-of-memory errors

### Functional Testing (Every 5 minutes for first hour)
- [ ] Homepage loads without issues
- [ ] Product listing shows current data
- [ ] Search functionality returns results
- [ ] Shopping cart operations work
- [ ] Checkout process completes
- [ ] Admin dashboard loads
- [ ] Customer support system functional
- [ ] Real-time notifications working (if applicable)

### Alert Responses
- [ ] Any alerts from monitoring tools: Investigate immediately
- [ ] Any error in logs: Check stack trace and investigate
- [ ] Any user-reported issues: Create incident ticket
- [ ] Database issues: Check connection pool, check slow queries

### Communicate Status
- [ ] Update status page: "Deployment Successful"
- [ ] Notify stakeholders in Slack: ✅ Deployment complete
- [ ] Document any issues encountered and fixes applied

---

## Post-Deployment - Hours 2-8

### Extended Monitoring
- [ ] Verify system stability over several hours
- [ ] Response times remain consistent
- [ ] No memory leaks (memory usage stable)
- [ ] Database connections healthy
- [ ] Backup system working (if scheduled for post-deployment)
- [ ] Email notifications sending correctly

### Data Integrity Checks
- [ ] New data created in production correctly
- [ ] Database queries return expected results
- [ ] No data corruption from migration (if applicable)
- [ ] Reports and analytics working
- [ ] User sessions persisting correctly

### Performance Validation
- [ ] Peak hour traffic handled smoothly
- [ ] No degradation in response times
- [ ] Cache hit rates > 80%
- [ ] Redis working efficiently
- [ ] Market/business features functional

---

## Post-Deployment - Day 2-7

### Ongoing Monitoring
- [ ] Daily review of application logs
- [ ] Daily database backup verification
- [ ] Weekly security scan (if applicable)
- [ ] Weekly performance review

### User Feedback
- [ ] Monitor support tickets for deployment-related issues
- [ ] Check error tracking (Sentry, DataDog, etc.)
- [ ] Review user feedback on new features
- [ ] Performance feedback from users

### Cleanup & Documentation
- [ ] Archive staging database backup
- [ ] Update deployment history log
- [ ] Document any issues encountered and resolutions
- [ ] Update runbooks if processes changed
- [ ] Team retrospective meeting (if deployment had issues)

---

## Rollback Procedure (If Needed)

### When to Rollback
- Critical error affecting core functionality
- Database corruption
- Security vulnerability discovered
- Performance issues impacting users
- Data loss or integrity issues

### Rollback Steps
```bash
1. Notify all stakeholders immediately
2. Update status page: "Emergency Maintenance - Rolling Back"
3. SSH into production server:
   
   ssh deploy@yourdomain.com
   cd /app/siwes
   
4. Stop current deployment:
   docker-compose down
   
5. Checkout previous version:
   git checkout v1.9.9  # (previous working version)
   
6. Rebuild and restart:
   docker-compose pull
   docker-compose up -d
   
7. Verify rollback:
   curl https://yourdomain.com/api/health
   
8. Restore database from recent backup (if needed):
   mongorestore --uri="mongodb://..." /path/to/backup
   
9. Communicate status:
   Slack: "Rolled back to v1.9.9. Investigation ongoing."
```

### Post-Rollback
- [ ] Root cause analysis conducted
- [ ] Issue fixed in development/staging
- [ ] Retest thoroughly before re-deployment
- [ ] Document lessons learned

---

## Deployment Success Criteria

### ✅ Deployment is Successful if:
- [ ] Application accessible at yourdomain.com
- [ ] All API endpoints responding
- [ ] Database connected and working
- [ ] Redis cache operational
- [ ] No error rate spike (≤ 0.1%)
- [ ] Response times normal: < 200ms average
- [ ] All core features functional
- [ ] No critical errors in logs
- [ ] Users can login and use system
- [ ] Data integrity maintained

### ❌ Deployment FAILED if:
- [ ] Application not accessible
- [ ] Database connection failed
- [ ] Error rate > 5%
- [ ] Response times > 2 seconds
- [ ] Data corruption detected
- [ ] Security vulnerability discovered
- [ ] Critical functionality broken

---

## Deployment Checklist Sign-Off

- [ ] Release Manager: _________________________ Date: _______
- [ ] DevOps Engineer: ________________________ Date: _______
- [ ] QA Lead: ______________________________ Date: _______
- [ ] Product Owner: ________________________ Date: _______

---

## Helpful Commands

```bash
# Check application status
curl https://yourdomain.com/api/health

# View logs
docker-compose logs -f app

# Check database connection
docker-compose exec app mongo --eval "db.adminCommand('ping')"

# Check Redis connection
docker-compose exec redis redis-cli ping

# See active connections
docker-compose exec redis redis-cli CLIENT LIST

# Force deployment
git push origin main  # Triggers CI/CD automatically

# Manually restart service
docker-compose restart app

# Check file permissions on server
ls -la /app/siwes

# Check disk space
df -h

# Check CPU/Memory
top  # Press q to exit
free -h

# View network connections
netstat -tulpn | grep LISTEN
```

---

## Post-Deployment Incidents

### If something goes wrong:
1. **Don't panic** - You have a rollback plan
2. **Immediately rollback** if critical
3. **Investigate root cause** on staging/development
4. **Fix the issue** and test thoroughly
5. **Re-deploy** with caution
6. **Learn & improve** process based on failure

### Resources
- On-call phone: [Number]
- Incident channel: #incidents on Slack
- Escalation: @ops-lead in Slack
- Monitoring: [Dashboard URL]

---

**Deployment planned for**: _________________ Date & Time  
**Expected downtime**: _________________ (if any)  
**Estimated duration**: _________________ (30 mins - 2 hours)  
**Team lead**: _________________________  
**Version being deployed**: _________________________

---

**Created**: February 20, 2026  
**Last Updated**: February 20, 2026  
**Frequency**: For every production deployment
