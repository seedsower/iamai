# IAMAI DAO Deployment Guide

This guide provides comprehensive instructions for deploying the IAMAI DAO platform across different environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Local Development](#local-development)
4. [Staging Deployment](#staging-deployment)
5. [Production Deployment](#production-deployment)
6. [Smart Contract Deployment](#smart-contract-deployment)
7. [Monitoring Setup](#monitoring-setup)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **OS**: Linux/macOS/Windows with WSL2
- **Node.js**: Version 18 or higher
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Memory**: Minimum 8GB RAM (16GB recommended)
- **Storage**: Minimum 50GB free space

### Required Tools
```bash
# Install Node.js (using nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.16.0/install)"

# Install Anchor CLI
npm install -g @coral-xyz/anchor-cli
```

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/iamai-dao.git
cd iamai-dao
```

### 2. Environment Variables
Create environment files for each deployment stage:

```bash
# Development environment
cp env.example .env.development

# Staging environment
cp env.example .env.staging

# Production environment
cp env.example .env.production
```

### 3. Configure Environment Variables

#### Development (.env.development)
```bash
# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com

# Database
DB_HOST=localhost
DB_NAME=iamai_dao_dev
DB_USER=postgres
DB_PASSWORD=dev_password

# Security
JWT_SECRET=dev-jwt-secret-key
```

#### Production (.env.production)
```bash
# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_RPC_ENDPOINT=https://api.mainnet-beta.solana.com

# Database (use secure credentials)
DB_HOST=your-production-db-host
DB_NAME=iamai_dao
DB_USER=iamai_user
DB_PASSWORD=secure-production-password

# Security (use strong secrets)
JWT_SECRET=your-super-secure-jwt-secret-256-bit-key
```

## Local Development

### Quick Start
```bash
# Install dependencies
npm install
cd backend && npm install && cd ..

# Start development environment
./deploy.sh -e development

# Access services
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
# Database: localhost:5432
# Redis: localhost:6379
# IPFS: http://localhost:8080
```

### Manual Setup (Alternative)
```bash
# Start infrastructure services
docker-compose up -d postgres redis ipfs

# Wait for services to be ready
sleep 10

# Start backend
cd backend
npm run dev &
cd ..

# Start frontend
npm run dev
```

### Development Workflow
1. Make code changes
2. Tests run automatically (if configured)
3. Hot reload updates the application
4. Use browser dev tools for debugging

## Staging Deployment

### 1. Prepare Staging Environment
```bash
# Create staging configuration
cp .env.development .env.staging

# Update staging-specific values
nano .env.staging
```

### 2. Deploy to Staging
```bash
# Deploy with staging configuration
./deploy.sh -e staging

# Verify deployment
curl http://staging-domain.com/health
```

### 3. Staging Testing
```bash
# Run integration tests against staging
npm run test:integration:staging

# Run end-to-end tests
npm run test:e2e:staging
```

## Production Deployment

### 1. Pre-deployment Checklist
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Environment variables configured
- [ ] SSL certificates ready
- [ ] Database backups configured
- [ ] Monitoring setup verified

### 2. Smart Contract Deployment
```bash
# Deploy contracts to mainnet
./deploy.sh -e production -c

# Verify contract deployment
anchor verify <program-id>
```

### 3. Application Deployment
```bash
# Deploy application
./deploy.sh -e production

# Verify all services
docker-compose ps
```

### 4. Post-deployment Verification
```bash
# Health checks
curl https://your-domain.com/health
curl https://your-domain.com/api/health

# Smoke tests
npm run test:smoke:production
```

## Smart Contract Deployment

### 1. Prepare Contracts
```bash
cd contracts

# Build contracts
anchor build

# Run tests
anchor test
```

### 2. Deploy to Devnet
```bash
# Configure for devnet
solana config set --url devnet

# Deploy
anchor deploy

# Verify deployment
anchor verify <program-id>
```

### 3. Deploy to Mainnet
```bash
# Configure for mainnet
solana config set --url mainnet-beta

# Ensure sufficient SOL for deployment
solana balance

# Deploy with verification
anchor deploy --provider.cluster mainnet

# Update program IDs in environment
```

### 4. Update Frontend Configuration
```bash
# Update contract addresses in environment files
NEXT_PUBLIC_TOKEN_PROGRAM_ID=<deployed-token-program-id>
NEXT_PUBLIC_STAKING_PROGRAM_ID=<deployed-staking-program-id>
NEXT_PUBLIC_GOVERNANCE_PROGRAM_ID=<deployed-governance-program-id>
NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID=<deployed-marketplace-program-id>
```

## Monitoring Setup

### 1. Prometheus Configuration
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'iamai-backend'
    static_configs:
      - targets: ['backend:3001']
```

### 2. Grafana Dashboards
```bash
# Import pre-configured dashboards
docker-compose exec grafana grafana-cli plugins install grafana-piechart-panel
```

### 3. Alerting Setup
```yaml
# Configure alerts for critical metrics
# - High error rates
# - Database connection issues
# - Memory/CPU usage
# - Transaction failures
```

## SSL/TLS Configuration

### 1. Obtain SSL Certificates
```bash
# Using Let's Encrypt
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
```

### 2. Configure Nginx
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
}
```

## Database Management

### 1. Backup Strategy
```bash
# Automated daily backups
0 2 * * * pg_dump iamai_dao > /backups/iamai_dao_$(date +\%Y\%m\%d).sql
```

### 2. Migration Management
```bash
# Run migrations
cd backend
npm run migrate

# Rollback if needed
npm run migrate:rollback
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check database status
docker-compose logs postgres

# Verify connection
docker-compose exec postgres psql -U postgres -d iamai_dao
```

#### 2. Smart Contract Deployment Failed
```bash
# Check Solana network status
solana cluster-version

# Verify wallet balance
solana balance

# Check program logs
solana logs <program-id>
```

#### 3. Frontend Build Failed
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

#### 4. IPFS Connection Issues
```bash
# Check IPFS node status
docker-compose logs ipfs

# Verify IPFS API
curl http://localhost:5001/api/v0/version
```

### Performance Optimization

#### 1. Database Optimization
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_token_transactions_wallet ON token_transactions(wallet_address);
CREATE INDEX idx_staking_positions_status ON staking_positions(status);
```

#### 2. Redis Caching
```bash
# Monitor cache hit rate
redis-cli info stats | grep keyspace
```

#### 3. Frontend Optimization
```bash
# Analyze bundle size
npm run analyze

# Optimize images
npm run optimize-images
```

## Security Considerations

### 1. Environment Security
- Use strong, unique passwords
- Rotate JWT secrets regularly
- Enable database encryption
- Use VPN for database access

### 2. Application Security
- Regular dependency updates
- Security headers configuration
- Input validation and sanitization
- Rate limiting implementation

### 3. Infrastructure Security
- Firewall configuration
- Regular security patches
- Access logging and monitoring
- Backup encryption

## Maintenance

### 1. Regular Tasks
- Monitor system resources
- Review application logs
- Update dependencies
- Backup verification
- Security patches

### 2. Monitoring Checklist
- [ ] Application health checks
- [ ] Database performance
- [ ] Smart contract interactions
- [ ] IPFS node status
- [ ] SSL certificate expiration

### 3. Scaling Considerations
- Load balancer configuration
- Database read replicas
- CDN for static assets
- Horizontal scaling strategies

---

For additional support, refer to the main README.md or contact the development team.
