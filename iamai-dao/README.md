This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# IAMAI DAO - Decentralized AI Model Marketplace

A comprehensive Web3 platform built on Solana that enables decentralized governance, token staking, and an AI model marketplace. IAMAI DAO empowers users to participate in governance decisions, stake tokens for rewards, and trade AI models in a decentralized environment.

## 🌟 Features

### Core Functionality
- **Token Management**: Purchase, transfer, and manage IAMAI tokens
- **Staking System**: Multi-tier staking with variable APY (5-20%)
- **Governance**: Create and vote on proposals with time-weighted voting power
- **AI Model Marketplace**: List, purchase, and rate AI models with IPFS storage
- **Wallet Integration**: Support for Phantom, Solflare, and other Solana wallets

### Technical Features
- **Solana Smart Contracts**: Built with Anchor framework
- **IPFS Integration**: Decentralized storage for AI models and metadata
- **Real-time Analytics**: Comprehensive platform statistics and metrics
- **Security**: JWT authentication, input validation, and rate limiting
- **Monitoring**: Prometheus, Grafana, and Loki for observability

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │  Smart Contracts│
│   (Next.js)     │◄──►│  (Node.js)      │◄──►│    (Solana)     │
│                 │    │                 │    │                 │
│ • Wallet UI     │    │ • REST API      │    │ • Token         │
│ • Staking UI    │    │ • Authentication│    │ • Staking       │
│ • Governance UI │    │ • Database      │    │ • Governance    │
│ • Marketplace   │    │ • IPFS Client   │    │ • Marketplace   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Infrastructure│
                    │                 │
                    │ • PostgreSQL    │
                    │ • Redis         │
                    │ • IPFS Node     │
                    │ • Monitoring    │
                    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Solana CLI
- Anchor CLI (for smart contracts)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/iamai-dao.git
cd iamai-dao
```

2. **Install dependencies**
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

3. **Setup environment variables**
```bash
cp env.example .env.development
# Edit .env.development with your configuration
```

4. **Start development environment**
```bash
./deploy.sh -e development
```

5. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- IPFS Gateway: http://localhost:8080

## 📖 Documentation

### Smart Contracts
- [Token Contract](./docs/contracts/token.md)
- [Staking Contract](./docs/contracts/staking.md)
- [Governance Contract](./docs/contracts/governance.md)
- [Marketplace Contract](./docs/contracts/marketplace.md)

### API Documentation
- [Authentication API](./docs/api/auth.md)
- [Token API](./docs/api/token.md)
- [Staking API](./docs/api/staking.md)
- [Governance API](./docs/api/governance.md)
- [Marketplace API](./docs/api/marketplace.md)
- [Analytics API](./docs/api/analytics.md)

### Frontend Components
- [Wallet Integration](./docs/frontend/wallet.md)
- [UI Components](./docs/frontend/components.md)
- [Hooks and State Management](./docs/frontend/hooks.md)

## 🔧 Development

### Running Tests
```bash
# Frontend tests
npm test

# Backend tests
cd backend
npm test

# Smart contract tests
cd contracts
anchor test
```

### Building for Production
```bash
# Build all services
./deploy.sh -e production

# Build specific components
./deploy.sh -f  # Frontend only
./deploy.sh -b  # Backend only
```

### Code Quality
```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Format code
npm run format
```

## 🌐 Deployment

### Development
```bash
./deploy.sh -e development
```

### Staging
```bash
./deploy.sh -e staging
```

### Production
```bash
./deploy.sh -e production -c  # Include contract deployment
```

### Environment Configuration
Create environment-specific files:
- `.env.development`
- `.env.staging`
- `.env.production`

## 📊 Monitoring

The platform includes comprehensive monitoring:

- **Prometheus**: Metrics collection (http://localhost:9090)
- **Grafana**: Dashboards and visualization (http://localhost:3001)
- **Loki**: Log aggregation
- **Health Checks**: Built-in health endpoints

## 🔐 Security

### Authentication
- Wallet-based authentication using message signing
- JWT tokens with configurable expiration
- Rate limiting on API endpoints

### Smart Contract Security
- Comprehensive input validation
- Access control mechanisms
- Emergency pause functionality
- Audit-ready code structure

### Infrastructure Security
- HTTPS/TLS encryption
- Security headers (CSP, HSTS, etc.)
- Input sanitization
- SQL injection prevention

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript/JavaScript best practices
- Write comprehensive tests
- Update documentation for new features
- Follow the existing code style

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` directory
- **Issues**: Open an issue on GitHub
- **Discord**: Join our community server
- **Email**: support@iamai-dao.com

## 🗺️ Roadmap

### Phase 1 (Current)
- ✅ Core platform functionality
- ✅ Smart contracts deployment
- ✅ Basic UI/UX
- ✅ Testing infrastructure

### Phase 2 (Q2 2024)
- [ ] Advanced governance features
- [ ] Mobile application
- [ ] Enhanced AI model validation
- [ ] Cross-chain integration

### Phase 3 (Q3 2024)
- [ ] DAO treasury management
- [ ] Advanced analytics
- [ ] Third-party integrations
- [ ] Scaling optimizations

## 🏆 Acknowledgments

- Solana Foundation for blockchain infrastructure
- Anchor framework for smart contract development
- IPFS for decentralized storage
- The open-source community for various tools and libraries

---

Built with ❤️ by the IAMAI DAO team Vercel
