# Persyaratan Production ConsenTide

## 📋 Ringkasan Kebutuhan Production

Dokumen ini menjelaskan semua yang diperlukan untuk deployment ConsenTide ke production.

## 🖥️ 1. Infrastruktur & Server

### Minimum Requirements

**Backend API Server:**
- **CPU**: 2+ cores (4+ recommended)
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**: 50GB+ SSD
- **Network**: 100Mbps+
- **OS**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+

**Frontend:**
- Static hosting (Vercel/Netlify) - Gratis/Terjangkau
- Atau server sendiri: 2GB RAM, 1 CPU core

**Database Server:**
- **PostgreSQL 14+** (Recommended)
- Atau **MongoDB 5.0+**
- **Storage**: 100GB+ SSD (tergantung data)
- Replication untuk high availability

**Metagraph Nodes** (Jika self-hosted):
- **CPU**: 4+ cores
- **RAM**: 8GB+ (16GB recommended)
- **Storage**: 100GB+ SSD
- **Network**: 1Gbps
- Koneksi ke Constellation network

### Opsi Deployment

**Opsi 1: Cloud Native (Recommended)**
- Frontend: Vercel (Free tier) atau Netlify
- Backend: AWS EC2 / DigitalOcean Droplet / Linode
- Database: AWS RDS / DigitalOcean Managed Database
- Storage: AWS S3 / Google Cloud Storage

**Opsi 2: Docker Compose** (Single Server)
- Semua services dalam 1 server
- Cocok untuk small-medium scale
- Termurah untuk mulai

**Opsi 3: Kubernetes** (Large Scale)
- Auto-scaling
- Load balancing otomatis
- Lebih kompleks tapi sangat scalable

## 🔐 2. Security & SSL

### Yang Dibutuhkan:

1. **SSL Certificate**
   - Let's Encrypt (Gratis) atau Commercial
   - Auto-renewal configuration
   - HTTPS enabled untuk semua services

2. **Secrets Management**
   - Environment variables secure
   - JWT secret yang kuat
   - Database password encrypted
   - API keys di secrets manager (AWS Secrets Manager/Vault)

3. **Security Headers**
   - Helmet.js configured
   - CORS properly set
   - Rate limiting enabled
   - Input validation (Zod)

## 💾 3. Database Setup

### PostgreSQL Schema

Harus dibuat database dan tables berikut:

- `users` - Data pengguna
- `controllers` - Data organisasi
- `consents` - Consent records
- `audit_logs` - Audit trails
- `governance_proposals` - Governance proposals
- `votes` - Voting records

**Indexes penting:**
- `consent_id` (unique)
- `user_id`
- `controller_hash`
- `status`
- `granted_at`

### Backup Strategy

- **Full backup**: Harian
- **Incremental backup**: Per jam
- **Retention**: 30+ hari
- **Off-site storage**: AWS S3 / Google Cloud Storage

## 🔧 4. Environment Variables

### Backend (.env.production)

```env
# Server
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://consentide.io

# Database
DB_HOST=postgres.example.com
DB_PORT=5432
DB_NAME=consentire
DB_USER=consentire_user
DB_PASSWORD=<secure-password>
DB_SSL=true

# HGTP / Constellation
HGTP_ENDPOINT=https://mainnet.constellationnetwork.io
NETWORK_ID=mainnet
HGTP_API_KEY=<your-api-key>

# JWT
JWT_SECRET=<strong-random-secret-256-bit>
JWT_EXPIRES_IN=24h

# Encryption
ENCRYPTION_KEY=<256-bit-key>

# Monitoring
SENTRY_DSN=<sentry-dsn>
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=15m
```

### Frontend (.env.production)

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.consentide.io
NEXT_PUBLIC_APP_NAME=ConsenTide
```

## 📊 5. Monitoring & Logging

### Yang Dibutuhkan:

1. **Error Tracking**
   - Sentry (Free tier tersedia)
   - Atau Rollbar / Bugsnag

2. **Application Monitoring**
   - New Relic / Datadog / Prometheus
   - Uptime monitoring (UptimeRobot / Pingdom)

3. **Logging**
   - Centralized logging (ELK Stack / Loki)
   - Log rotation
   - Retention policy (30+ hari)

4. **Metrics**
   - API response times
   - Error rates
   - Database performance
   - Server resources

## 🚀 6. CI/CD Pipeline

### Yang Dibutuhkan:

- **GitHub Actions** / GitLab CI / Jenkins
- Automated testing
- Automated deployment
- Rollback procedure

### Contoh GitHub Actions

Lihat `.github/workflows/deploy.yml` untuk contoh.

## 🐳 7. Docker Configuration

### File-file yang Dibutuhkan:

1. **Dockerfile.backend** ✅ (Sudah ada di `docker/`)
2. **Dockerfile.frontend** ✅ (Sudah ada di `docker/`)
3. **docker-compose.prod.yml** ✅ (Sudah ada di `docker/`)
4. **nginx.conf** ✅ (Sudah ada di `docker/`)

## 📈 8. Performance Optimization

### Backend:
- Connection pooling
- Caching (Redis)
- Query optimization
- Gzip compression

### Frontend:
- Code splitting
- Image optimization
- CDN untuk static assets
- Lazy loading

## 💰 9. Cost Estimation

### Perkiraan Biaya Bulanan:

**Small Scale** (~1000 users):
- Frontend (Vercel): **Gratis** (Free tier)
- Backend (DigitalOcean 4GB): **$24/month**
- Database (Managed PostgreSQL): **$15/month**
- SSL: **Gratis** (Let's Encrypt)
- **Total: ~$39/month**

**Medium Scale** (~10,000 users):
- Frontend (Vercel Pro): **$20/month**
- Backend (AWS EC2 t3.medium): **$50/month**
- Database (AWS RDS db.t3.small): **$60/month**
- CDN (CloudFlare): **$20/month**
- Monitoring (Sentry Free tier): **Gratis**
- **Total: ~$150/month**

**Large Scale** (~100,000+ users):
- Frontend (Vercel Enterprise): **$200+/month**
- Backend (Kubernetes cluster): **$300+/month**
- Database (RDS Multi-AZ): **$200+/month**
- CDN & Storage: **$100+/month**
- Monitoring (Datadog): **$150+/month**
- **Total: ~$950+/month**

## ✅ 10. Production Checklist

### Pre-Deployment:
- [ ] Semua tests passing
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] SSL certificates obtained
- [ ] Backup strategy defined
- [ ] Monitoring configured

### Deployment:
- [ ] Infrastructure provisioned
- [ ] Database setup & migrations
- [ ] Application deployed
- [ ] Health checks passing
- [ ] Smoke tests executed

### Post-Deployment:
- [ ] Monitoring alerts verified
- [ ] Logs reviewed
- [ ] Team notified
- [ ] Documentation updated

## 🔄 11. Deployment Steps

### Quick Deployment (Docker Compose):

```bash
# 1. Setup environment
cp .env.example .env.production
# Edit .env.production dengan nilai production

# 2. Build dan deploy
docker-compose -f docker/docker-compose.prod.yml up -d

# 3. Run migrations (jika ada)
npm run db:migrate

# 4. Verify
curl http://localhost:3001/health
```

### Detailed Deployment:

Lihat `docs/PRODUCTION.md` untuk panduan lengkap.

## 🛠️ 12. Tools & Services

### Required:
- **Node.js 18+**
- **PostgreSQL 14+** atau **MongoDB 5.0+**
- **Docker** & **Docker Compose**
- **Nginx** (untuk reverse proxy)
- **SSL Certificate** (Let's Encrypt)

### Recommended:
- **GitHub Actions** (CI/CD)
- **Sentry** (Error tracking)
- **Datadog/New Relic** (Monitoring)
- **UptimeRobot** (Uptime monitoring)
- **CloudFlare** (CDN & DDoS protection)

## 📚 13. Documentation

### Yang Sudah Tersedia:
- ✅ **PRODUCTION.md** - Panduan lengkap production
- ✅ **PRODUCTION_CHECKLIST.md** - Checklist deployment
- ✅ **API.md** - API documentation
- ✅ **ARCHITECTURE.md** - System architecture
- ✅ **SETUP.md** - Setup guide

## 🚨 14. Rollback Procedure

Jika ada masalah:

```bash
# Rollback deployment
docker-compose -f docker/docker-compose.prod.yml down
git revert HEAD
docker-compose -f docker/docker-compose.prod.yml up -d

# Restore database
pg_restore -d consentire backup.dump
```

## 📞 15. Support & Maintenance

### Yang Dibutuhkan:
- **On-call engineer** schedule
- **Incident response plan**
- **Regular security updates**
- **Performance monitoring**
- **Backup verification**

## 🎯 Ringkasan

**Yang WAJIB untuk production:**
1. ✅ Server/Infrastructure
2. ✅ Database (PostgreSQL/MongoDB)
3. ✅ SSL Certificates
4. ✅ Environment Variables
5. ✅ Monitoring Tools
6. ✅ Backup Strategy
7. ✅ Security Configuration
8. ✅ Docker Configuration (sudah ada)
9. ✅ Deployment Script (sudah ada)

**Estimasi Setup Time:**
- Infrastructure: 2-4 jam
- Database Setup: 1-2 jam
- Deployment: 1-2 jam
- Configuration & Testing: 2-4 jam
- **Total: 6-12 jam**

**Estimasi Biaya Bulanan Minimum:**
- **~$39-150/month** (tergantung scale)

## 🚀 Next Steps

1. Baca **PRODUCTION.md** untuk detail lengkap
2. Gunakan **PRODUCTION_CHECKLIST.md** sebagai guide
3. Setup infrastructure
4. Configure environment variables
5. Run deployment script
6. Verify dan monitor

---

**Siap untuk production deployment!** 🚀

Untuk pertanyaan atau bantuan, lihat dokumentasi di folder `docs/`.
