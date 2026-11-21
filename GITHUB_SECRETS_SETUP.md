# GitHub Actions and Vercel Deployment

## Overview

GitHub Actions runs tests and security checks. Vercel handles application
deployment through its Git integration, independently of the Actions workflow.

## GitHub Actions secrets

The workflow does not require Docker Hub or SSH deployment secrets.
`SNYK_TOKEN` is optional; the Snyk scan continues without it.

## Vercel deployment

Connect the GitHub repository to the Vercel project in the Vercel dashboard.
Vercel deploys pushes according to that project's Git deployment settings.
Check the Vercel project deployments page for the deployment result; a
GitHub Actions workflow result reports only tests and security checks.

## Security

- Never commit credentials or paste them into chat or logs.
- Store application secrets in Vercel's project environment-variable settings.
- Use GitHub Actions secrets only for integrations that the workflow actually
  uses.
