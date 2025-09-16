# IAMAI DAO Development Guide

## Overview
IAMAI DAO is a comprehensive decentralized autonomous organization built on Solana, featuring token management, staking, governance, and marketplace functionality.

## Project Structure
```
iamai-dao/
├── contracts/           # Rust smart contracts
│   ├── token/          # IAMAI token contract
│   ├── staking/        # Staking rewards contract
│   ├── governance/     # DAO governance contract
│   └── marketplace/    # NFT marketplace contract
├── src/                # Next.js frontend
├── backend/            # Node.js API server
├── docs/               # Documentation
└── monitoring/         # Prometheus/Grafana configs
```

## Prerequisites

### Required Software
- Node.js 18+ and npm/yarn
- Rust 1.70+
- Solana CLI 1.16+
- Anchor Framework 0.29+
- Docker & Docker Compose
- PostgreSQL 14+
- Redis 6+

### Installation Commands
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.16.0/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Install Node dependencies
npm install
```

## Smart Contract Development

### Program IDs
- Token: `ZfdsRp1fLCJJkqMmyfNst8nc85RDoCZq9bQbT2Cd3QQ`
- Staking: `Fa3w7XNsTzTqrJY1mUZ8QaorpDgMXqTWkYdtFn6GxjdP`
- Governance: `5kzjdRm4pHrTrqpijSB8QYE8tN9yCnmbHw49iX3DXc9y`
- Marketplace: `CDg2vpzshYKscaXa42PvP4PCKShWj6etDoyda86Fz47y`

### Build & Deploy
```bash
# Build all contracts
anchor build

# Test contracts
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to localnet
solana-test-validator &
anchor deploy --provider.cluster localnet
```

## Frontend Development

### Environment Setup
1. Copy `env.example` to `.env.local`
2. Update environment variables as needed
3. Install dependencies: `npm install`

### Development Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Run tests
npm test
```

### Key Features
- Wallet integration (Phantom, Solflare)
- Token staking with multiple tiers
- DAO governance voting
- NFT marketplace
- Real-time analytics dashboard

## Backend API

### Setup
```bash
cd backend
npm install
```

### Database Setup
```bash
# Create database
createdb iamai_dao

# Run migrations (when implemented)
npm run migrate
```

### API Endpoints
- `/api/auth` - Authentication
- `/api/tokens` - Token operations
- `/api/staking` - Staking management
- `/api/governance` - Proposal management
- `/api/marketplace` - NFT trading
- `/api/analytics` - Platform metrics

## Testing

### Smart Contracts
```bash
anchor test
```

### Frontend
```bash
npm test
npm run test:e2e
```

### Backend
```bash
cd backend
npm test
```

## Deployment

### Development
```bash
# Start all services
docker-compose up -d

# Or start individually
npm run dev              # Frontend
cd backend && npm start  # Backend
solana-test-validator    # Local Solana cluster
```

### Production
```bash
# Build and deploy
./deploy.sh

# Or use Docker
docker-compose -f docker-compose.prod.yml up -d
```

## Monitoring

### Prometheus Metrics
- Available at `http://localhost:9090`
- Monitors API performance, blockchain interactions

### Grafana Dashboards
- Available at `http://localhost:3000`
- Visualizes platform metrics and user activity

### Logs
- Application logs via Loki
- Centralized logging with Promtail

## Security Considerations

1. **Smart Contracts**
   - All contracts use Anchor framework security features
   - Proper access controls and validation
   - Overflow protection enabled

2. **Frontend**
   - Environment variables for sensitive data
   - Wallet connection security
   - Input validation and sanitization

3. **Backend**
   - JWT authentication
   - Rate limiting
   - CORS configuration
   - SQL injection protection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper tests
4. Submit a pull request

## Troubleshooting

### Common Issues

**Anchor build fails:**
```bash
# Ensure overflow-checks is enabled in Cargo.toml
[profile.release]
overflow-checks = true
```

**Wallet connection issues:**
- Ensure wallet extension is installed
- Check network configuration (devnet/mainnet)
- Verify RPC endpoint accessibility

**Database connection errors:**
- Check PostgreSQL is running
- Verify connection string in .env
- Ensure database exists

## Resources

- [Solana Documentation](https://docs.solana.com/)
- [Anchor Framework](https://www.anchor-lang.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Project Repository](https://github.com/seedsower/iamai.git)
