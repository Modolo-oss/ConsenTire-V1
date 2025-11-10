# ConsenTide Production Deployment Guide

## 🎯 Production Requirements

### 1. Infrastructure Requirements

#### Server Requirements

**Backend API:**
- CPU: 2+ cores
- RAM: 4GB minimum (8GB recommended)
- Storage: 50GB+ SSD
- Network: 100Mbps+
- Operating System: Ubuntu 20.04+ / Debian 11+ / CentOS 8+

**Frontend:**
- Static hosting (Vercel, Netlify, AWS S3 + CloudFront)
- Or server: 2GB RAM, 1 CPU core (if self-hosted)

**Metagraph Nodes:**
- CPU: 4+ cores
- RAM: 8GB+ (16GB recommended)
- Storage: 100GB+ SSD
- Network: 1Gbps recommended
- Constellation network connection

**Database:**
- PostgreSQL 14+ (recommended)
- Or MongoDB 5.0+
- Replication for high availability

#### Infrastructure Options

**Option 1: Cloud Native (Recommended)**
- **Frontend**: Vercel / Netlify
- **Backend**: AWS EC2 / GCP Compute Engine / Azure VM
- **Database**: AWS RDS / Google Cloud SQL / Azure Database
- **Storage**: AWS S3 / Google Cloud Storage / Azure Blob
- **CDN**: CloudFront / Cloud CDN / Azure CDN

**Option 2: Kubernetes**
- Container orchestration
- Auto-scaling
- Load balancing
- Service mesh (Istio)

**Option 3: Docker Compose**
- Single server deployment
- Good for small-scale production

### 2. Environment Configuration

#### Backend Environment Variables

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

# JWT Authentication
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=24h

# Encryption
ENCRYPTION_KEY=<256-bit-key>

# IPFS (if using)
IPFS_GATEWAY=https://ipfs.io
IPFS_API_URL=https://ipfs.example.com/api/v0

# Email Service (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@consentide.io
SMTP_PASSWORD=<app-password>
SMTP_FROM=noreply@consentide.io

# Monitoring
SENTRY_DSN=<sentry-dsn>
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=15m

# File Upload (if needed)
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/uploads

# El Paca Token
EL_PACA_CONTRACT_ADDRESS=<contract-address>
BLOCKCHAIN_RPC_URL=https://mainnet.constellationnetwork.io/rpc

# Webhooks
WEBHOOK_SECRET=<webhook-secret>
```

#### Frontend Environment Variables

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.consentide.io
NEXT_PUBLIC_APP_NAME=ConsenTide
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_SENTRY_DSN=<sentry-dsn>
```

### 3. Database Setup

#### PostgreSQL Schema

Create database and schema:

```sql
-- Create database
CREATE DATABASE consentire;
\c consentire;

-- Create users table
CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,
    email_hash VARCHAR(64) UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    did VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create controllers table
CREATE TABLE controllers (
    id VARCHAR(64) PRIMARY KEY,
    organization_name VARCHAR(255) NOT NULL,
    organization_id VARCHAR(255) UNIQUE NOT NULL,
    controller_hash VARCHAR(64) UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create consents table
CREATE TABLE consents (
    consent_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    controller_hash VARCHAR(64) NOT NULL,
    purpose_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL,
    lawful_basis VARCHAR(30) NOT NULL,
    data_categories TEXT[],
    granted_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP,
    last_accessed TIMESTAMP,
    hgtp_tx_hash VARCHAR(64),
    merkle_root VARCHAR(64),
    zk_proof JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (controller_hash) REFERENCES controllers(controller_hash)
);

-- Create audit_logs table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    action VARCHAR(50) NOT NULL,
    consent_id VARCHAR(64),
    controller_hash VARCHAR(64),
    user_id VARCHAR(64),
    details JSONB,
    hgtp_tx_hash VARCHAR(64)
);

-- Create governance_proposals table
CREATE TABLE governance_proposals (
    proposal_id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    proposed_changes JSONB NOT NULL,
    creator_signature TEXT NOT NULL,
    voting_deadline TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create votes table
CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    voter VARCHAR(64) NOT NULL,
    proposal_id VARCHAR(64) NOT NULL,
    choice VARCHAR(10) NOT NULL,
    voting_power BIGINT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (proposal_id) REFERENCES governance_proposals(proposal_id),
    UNIQUE(voter, proposal_id)
);

-- Create indexes
CREATE INDEX idx_consents_user_id ON consents(user_id);
CREATE INDEX idx_consents_controller_hash ON consents(controller_hash);
CREATE INDEX idx_consents_status ON consents(status);
CREATE INDEX idx_consents_granted_at ON consents(granted_at);
CREATE INDEX idx_audit_logs_consent_id ON audit_logs(consent_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_votes_proposal_id ON votes(proposal_id);
```

#### MongoDB Collections (Alternative)

If using MongoDB:

```javascript
// users collection
db.users.createIndex({ "id": 1 }, { unique: true });
db.users.createIndex({ "email_hash": 1 }, { unique: true });

// consents collection
db.consents.createIndex({ "consent_id": 1 }, { unique: true });
db.consents.createIndex({ "user_id": 1 });
db.consents.createIndex({ "controller_hash": 1 });
db.consents.createIndex({ "status": 1 });
db.consents.createIndex({ "granted_at": 1 });

// audit_logs collection
db.audit_logs.createIndex({ "timestamp": 1 });
db.audit_logs.createIndex({ "consent_id": 1 });
```

### 4. Security Checklist

#### SSL/TLS Certificates
- [ ] HTTPS enabled for all services
- [ ] SSL certificates (Let's Encrypt or commercial)
- [ ] Certificate auto-renewal configured
- [ ] HSTS headers enabled

#### Authentication & Authorization
- [ ] JWT tokens with secure signing
- [ ] Token expiration configured
- [ ] Refresh token rotation
- [ ] Rate limiting enabled
- [ ] CORS properly configured

#### Data Security
- [ ] Database encryption at rest
- [ ] Database connection SSL
- [ ] Sensitive data encryption (AES-256)
- [ ] Environment variables secured
- [ ] Secrets management (AWS Secrets Manager, HashiCorp Vault)

#### Application Security
- [ ] Helmet.js configured (security headers)
- [ ] Input validation (Zod)
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Regular security updates

### 5. Monitoring & Logging

#### Required Tools

**Application Monitoring:**
- Sentry (error tracking)
- New Relic / Datadog / Prometheus
- Uptime monitoring (Pingdom, UptimeRobot)

**Logging:**
- Centralized logging (ELK Stack, Loki, CloudWatch Logs)
- Log rotation configured
- Log retention policy (30+ days)

**Metrics:**
- API response times
- Error rates
- Database query performance
- Server resource usage
- Request/response sizes

### 6. CI/CD Pipeline

#### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: cd shared && npm run build
      - run: cd backend && npm run build
      - run: cd frontend && npm run build

  deploy-backend:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          # Your deployment script

  deploy-frontend:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        run: |
          # Vercel deployment
```

### 7. Production Checklist

#### Pre-Deployment

- [ ] All tests passing
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] SSL certificates obtained
- [ ] Backup strategy defined
- [ ] Disaster recovery plan ready
- [ ] Monitoring tools configured
- [ ] Logging setup complete

#### Deployment Steps

1. **Database Setup**
   ```bash
   # Run migrations
   npm run db:migrate
   
   # Seed initial data (if needed)
   npm run db:seed
   ```

2. **Build Application**
   ```bash
   # Build shared types
   cd shared && npm run build
   
   # Build backend
   cd ../backend && npm run build
   
   # Build frontend
   cd ../frontend && npm run build
   ```

3. **Deploy Services**
   ```bash
   # Deploy backend (Docker example)
   docker build -t consentire-backend ./backend
   docker run -d --env-file .env.production consentire-backend
   
   # Deploy frontend (Vercel)
   vercel --prod
   ```

4. **Verify Deployment**
   - [ ] Health checks passing
   - [ ] API endpoints responding
   - [ ] Frontend loading correctly
   - [ ] Database connections working
   - [ ] HGTP integration functioning

#### Post-Deployment

- [ ] Smoke tests executed
- [ ] Monitoring alerts configured
- [ ] Backup verified
- [ ] Documentation updated
- [ ] Team notified
- [ ] Rollback plan ready

### 8. Performance Optimization

#### Backend
- [ ] Enable compression (gzip)
- [ ] Database query optimization
- [ ] Connection pooling
- [ ] Caching (Redis) for frequently accessed data
- [ ] CDN for static assets

#### Frontend
- [ ] Code splitting
- [ ] Image optimization
- [ ] Lazy loading
- [ ] Service worker (PWA)
- [ ] CDN for assets

### 9. Backup & Disaster Recovery

#### Backup Strategy

**Database Backups:**
- Daily full backups
- Hourly incremental backups
- Retention: 30+ days
- Off-site backup storage

**Application Backups:**
- Configuration files
- Environment variables (encrypted)
- Uploaded files (if any)

**Recovery Plan:**
- RTO (Recovery Time Objective): < 4 hours
- RPO (Recovery Point Objective): < 1 hour
- Regular disaster recovery drills

### 10. Scalability Considerations

#### Horizontal Scaling
- [ ] Load balancer configured
- [ ] Multiple backend instances
- [ ] Database read replicas
- [ ] Session storage (Redis)
- [ ] Stateless application design

#### Vertical Scaling
- [ ] Auto-scaling policies
- [ ] Resource monitoring
- [ ] Performance bottlenecks identified

### 11. Cost Estimation

**Monthly Costs (Example):**
- **Frontend**: $0-20 (Vercel free tier or small plan)
- **Backend Server**: $50-200 (AWS EC2, GCP Compute)
- **Database**: $50-300 (RDS/Cloud SQL)
- **Storage**: $10-50 (S3/Cloud Storage)
- **CDN**: $20-100 (CloudFront/Cloud CDN)
- **Monitoring**: $0-50 (Free tier or small plan)
- **Total**: ~$130-720/month (depending on usage)

### 12. Compliance & Legal

#### GDPR Compliance
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie policy (if applicable)
- [ ] Data processing agreements
- [ ] DPO (Data Protection Officer) assigned

#### Technical Compliance
- [ ] Security audit completed
- [ ] Penetration testing done
- [ ] Code signing certificates
- [ ] API documentation complete

## 🚀 Quick Production Deployment

### Using Docker Compose (Simplified)

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: consentire
      POSTGRES_USER: consentire_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PASSWORD=${DB_PASSWORD}
    depends_on:
      - postgres
    restart: always

  frontend:
    build: ./frontend
    ports:
      - "80:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://api.consentide.io
    depends_on:
      - backend
    restart: always

volumes:
  postgres_data:
```

Deploy:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 📞 Support

For production deployment assistance:
- Review this guide thoroughly
- Test in staging environment first
- Have rollback plan ready
- Monitor closely after deployment

---

**Ready for production deployment!** 🚀
