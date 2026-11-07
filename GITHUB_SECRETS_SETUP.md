# GitHub Secrets Configuration Guide

## Overview
This guide provides step-by-step instructions to configure GitHub repository secrets for the Luxe Jewelry CI/CD pipeline.

**Important**: GitHub Secrets are encrypted environment variables that store sensitive data (API keys, passwords, SSH keys) securely. They are never displayed in logs or visible to unauthorized users.

---

## Required Secrets for CI/CD Pipeline

### Security-Critical Secrets
| Secret | Purpose | Example | Required |
|--------|---------|---------|----------|
| `DOCKER_USERNAME` | Docker Hub authentication | `your_username` | ✅ Yes |
| `DOCKER_PASSWORD` | Docker Hub authentication | `dckr_pat_xxxxx` | ✅ Yes |
| `SNYK_TOKEN` | Security vulnerability scanning | `snyk_token_xxxxx` | ⏳ Recommended |
| `STAGING_SERVER` | Staging deployment host | `staging.example.com` | ✅ For staging |
| `STAGING_KEY` | SSH private key for staging | `[Private key content removed; store it only in GitHub Secrets.]

Public Key:
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDx... your-machine@hostname
```

#### 4.2 For Staging Environment

**Setup on Staging Server**:
```bash
# SSH into your staging server
ssh user@staging.example.com

# Add the public key to authorized_keys
echo "ssh-rsa AAAAB3NzaC... " >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Verify deployment user can pull and restart services
sudo usermod -aG docker deploy_user  # (if using Docker)
```

**Add Secrets to GitHub**:
```bash
1. Click "New repository secret"
2. Name: STAGING_SERVER
3. Secret: staging.example.com
4. Click "Add secret"

5. Click "New repository secret"
2. Name: STAGING_KEY
3. Secret: (Paste entire private key, including BEGIN/END lines)
4. Click "Add secret"
```

#### 4.3 For Production Environment

**Setup on Production Server**:
```bash
# Generate a DIFFERENT key pair for production (best practice)
ssh-keygen -t rsa -b 4096 -f ~/.ssh/github-deploy-key-prod -N ""

# SSH into your production server
ssh user@api.luxejewelry.com

# Add the public key
echo "ssh-rsa AAAAB3NzaC... " >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Restrict deploy user permissions (least privilege)
sudo usermod -aG docker deploy_user
# (optionally create restricted user for deployment)
```

**Add Secrets to GitHub**:
```bash
1. Click "New repository secret"
2. Name: PROD_SERVER
3. Secret: api.luxejewelry.com
4. Click "Add secret"

5. Click "New repository secret"
2. Name: PROD_KEY
3. Secret: (Paste production private key)
4. Click "Add secret"
```

---

## Security Best Practices

### ✅ DO:
- ✅ Use separate SSH keys for staging and production
- ✅ Give SSH deploy user minimal required permissions
- ✅ Rotate secrets every 6 months
- ✅ Use strong passphrases for SSH keys
- ✅ Store SSH key backup in secure location (password manager)
- ✅ Regularly audit GitHub Actions logs for suspicious activity
- ✅ Use short-lived tokens when possible

### ❌ DON'T:
- ❌ Share secrets in commit messages, emails, or Slack
- ❌ Use the same key for multiple environments
- ❌ Store secrets in `.env` files in the repo
- ❌ Use tokens in code or logs
- ❌ Give GitHub Actions secrets to unauthorized users
- ❌ Commit private keys to the repository
- ❌ Use default/weak passwords

---

## Verify Secrets Are Working

### 1. **Check GitHub Actions Logs**
```bash
1. Go to "Actions" tab in your GitHub repo
2. Click the latest workflow run
3. Verify no "Access Denied" errors
4. Check that secrets show as "***" (hidden) in logs
```

### 2. **Manual Docker Build Test**
```bash
# This will test if Docker login works
docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin ${{ secrets.DOCKER_PASSWORD }}

# Or locally:
docker login
# Enter username and token when prompted
```

### 3. **SSH Connection Test** (before full deployment)
```bash
# Test staging connection
ssh -i ~/.ssh/github-deploy-key user@staging.example.com "whoami"

# Test production connection (if possible)
ssh -i ~/.ssh/github-deploy-key-prod user@api.luxejewelry.com "whoami"
```

---

## CI/CD Workflow Triggers

Once secrets are configured, the CI/CD pipeline will automatically:

### **On `develop` branch push**:
1. ✅ Run tests and linting
2. ✅ Scan for exposed secrets
3. ✅ Build Docker image
4. ✅ Push to Docker Hub
5. ✅ **Auto-deploy to staging** (using STAGING_SERVER & STAGING_KEY)

### **On `main` branch push**:
1. ✅ Run tests and linting
2. ✅ Scan for exposed secrets
3. ✅ Build Docker image
4. ✅ Push to Docker Hub
5. ✅ Create release tag
6. ✅ **Auto-deploy to production** (using PROD_SERVER & PROD_KEY)

---

## Troubleshooting

### Problem: "Secret is not allowed to be used here"
**Solution**: Secrets are only available in jobs, not in workflow triggers. Use `${{ secrets.SECRET_NAME }}` in script sections, not in `if:` conditions at job level.

### Problem: Docker Login Fails
**Solution**: 
- Verify DOCKER_PASSWORD is an access token, not your password
- Check token hasn't expired
- Ensure username is correct

### Problem: SSH Connection Denied
**Solution**:
- Verify SSH key was added to server's `~/.ssh/authorized_keys`
- Check file permissions: `chmod 600 authorized_keys`
- Test locally first: `ssh -i key user@host "whoami"`

### Problem: Secrets Not Available in Job
**Solution**:
- Secrets are org-scoped or repo-scoped only
- Job needs permission to use secrets
- Check workflow YAML has access configured

---

## Next Steps After Setup

1. **Test the pipeline**:
   ```bash
   git commit -m "Test CI/CD setup" --allow-empty
   git push origin develop
   # Check GitHub Actions tab for results
   ```

2. **Monitor deployments**:
   - Go to "Actions" tab
   - Watch the workflow run
   - Verify artifact is created

3. **Check deployed application**:
   ```bash
   # For staging
   curl https://staging.example.com/api/health
   
   # For production  
   curl https://api.luxejewelry.com/api/health
   ```

4. **Setup monitoring alerts** (optional):
   - Add Slack notifications to CI/CD
   - Setup PagerDuty for deployment failures
   - Enable GitHub branch protections

---

## Secret Rotation Schedule

| Secret | Rotation Schedule | Last Rotated |
|--------|------------------|--------------|
| DOCKER_PASSWORD | Every 6 months | - |
| SNYK_TOKEN | Every 12 months | - |
| STAGING_KEY | Every 6 months | - |
| PROD_KEY | Every 3 months | - |

**Rotation Process**:
1. Generate new secret/token
2. Update GitHub Secrets
3. Update server authorized_keys (if SSH key)
4. Verify pipeline works with new secret
5. Deactivate old secret after 24 hours

---

## Additional Resources

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Docker Hub Access Tokens](https://docs.docker.com/docker-hub/access-tokens/)
- [SSH Key Best Practices](https://github.blog/2023-03-09-ssh-key-formats-and-you/)
- [Snyk Security Scanning](https://snyk.io/learn/)

---

## Support & Questions

For help with secrets configuration:
- GitHub Docs: https://docs.github.com/en/actions
- Snyk Support: https://support.snyk.io/
- Docker Support: https://forums.docker.com/

**Created**: February 20, 2026  
**Status**: ✅ Complete
