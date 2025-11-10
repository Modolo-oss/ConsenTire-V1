# 🚀 Production Deployment Guide - ConsenTide

## ⚠️ CRITICAL: Production Database Setup Required

**BEFORE deploying**, you MUST create a production database in Replit:

### 1. Create Production Database

**IN REPLIT DEPLOYMENT SETTINGS:**

1. Go to your Replit workspace
2. Click **"Deployments"** tab  
3. Click **"Add PostgreSQL Database"**
4. Replit will automatically:
   - Create production PostgreSQL database
   - Set `DATABASE_URL` environment variable for production
   - Provide separate database from development

**⚠️ WARNING:** Without this step, deployment will fail with database connection errors.

---

### 2. Deploy to Production

```bash
# Click the "Deploy" button in Replit
# Deployment will automatically:
# 1. Build the application
# 2. Initialize database schema on first start
# 3. Start production servers
```

### 3. What Happens Automatically

The deployment process:

✅ **Builds the application** (`npm run build`)
  - Compiles backend TypeScript to JavaScript
  - Builds frontend Next.js static files
  - NO database connection during build (safe for deployment)

✅ **Initializes database on first runtime** (automatic)
  - Creates all tables when backend starts
  - Sets up indexes for performance
  - Idempotent (safe to run multiple times)

✅ **Starts production servers**
  - Backend API on port 3001
  - Frontend on port 5000

---

## 📋 Demo Credentials Setup

**⚠️ SECURITY WARNING:** Demo accounts are for hackathon evaluation only!

To create demo accounts in production, run manually via SSH:

```bash
# SSH into your deployment
cd backend
node dist/scripts/seedDemoAccounts.js
```

This creates:

| Role | Email | Password | Dashboard |
|------|-------|----------|-----------|
| **User** | user@consentire.io | password123 | `/dashboard` |
| **Controller** | org@consentire.io | password123 | `/compliance` |
| **Regulator** | regulator@consentire.io | password123 | `/regulator` |

**🔒 For Real Production:**
- Delete demo accounts after evaluation
- Change all default passwords
- Disable demo account creation script

---

## 🔧 Manual Database Setup (if needed)

If automatic setup fails, you can manually initialize:

```bash
# SSH into your deployment
# Run database initialization
node scripts/init-production-db.js

# Seed demo accounts
node scripts/seed-production.js
```

---

## ⚠️ Troubleshooting

### Error: "getaddrinfo EAI_AGAIN helium"

**Cause:** Production deployment trying to connect to development database

**Fix:**
1. Ensure production database is created in Deployment settings
2. Verify `DATABASE_URL` environment variable is set in production
3. Redeploy the application

### Error: "Database tables not found"

**Cause:** Database schema not initialized

**Fix:**
```bash
# Run initialization script
node scripts/init-production-db.js
```

### Error: "Login failed"

**Cause:** Demo accounts not seeded

**Fix:**
```bash
# Run seed script
node scripts/seed-production.js
```

---

## 🎯 Environment Variables

Production deployment requires:

```env
# Automatically set by Replit
DATABASE_URL=postgresql://...

# Set these in Deployment > Secrets
NODE_ENV=production
JWT_SECRET=<random-secret-key>
```

---

## 📊 Monitoring Production

Check production logs:
- Backend logs: View in Replit Deployments console
- Frontend logs: Browser DevTools console
- Database: Use Replit Database viewer

---

## 🔐 Security Checklist

Before going live:

- [ ] Change demo account passwords
- [ ] Set strong `JWT_SECRET`
- [ ] Enable SSL/TLS (Replit handles this)
- [ ] Review CORS allowed origins
- [ ] Enable rate limiting (already configured)
- [ ] Set up monitoring (Sentry recommended)

---

## 🌐 Custom Domain

To use custom domain (e.g., consentide.io):

1. Go to Deployment settings
2. Click "Add custom domain"
3. Follow DNS configuration instructions
4. Update `FRONTEND_URL` in backend environment variables

---

## 📈 Scaling

Replit Autoscale automatically handles:
- Load balancing
- Auto-scaling based on traffic
- Zero-downtime deployments
- SSL certificate management

---

## 💾 Database Backups

**Replit automatically backs up production database.**

To create manual backup:
```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

---

## 🎉 Deployment Complete!

Your ConsenTide platform is now live in production!

**Next Steps:**
1. Test all three demo accounts
2. Verify blockchain demo mode is active
3. Check GDPR compliance dashboards
4. Monitor application performance

**Support:**
- Check logs if any errors occur
- Ensure DATABASE_URL is set correctly
- Verify all tables were created successfully
