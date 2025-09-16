# IAMAI DAO API Documentation

This document provides comprehensive API documentation for the IAMAI DAO backend services.

## Base URL
- Development: `http://localhost:3001/api`
- Staging: `https://staging-api.iamai-dao.com/api`
- Production: `https://api.iamai-dao.com/api`

## Authentication

### Overview
The API uses JWT (JSON Web Tokens) for authentication. Users authenticate by signing a message with their Solana wallet.

### Authentication Flow
1. Request challenge: `POST /auth/challenge`
2. Sign message with wallet
3. Submit signature: `POST /auth/authenticate`
4. Use returned JWT token in subsequent requests

### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Authentication Endpoints

### POST /auth/challenge
Generate authentication challenge for wallet.

**Request:**
```json
{
  "walletAddress": "string"
}
```

**Response:**
```json
{
  "success": true,
  "challenge": "string",
  "timestamp": 1234567890,
  "nonce": "string"
}
```

### POST /auth/authenticate
Authenticate with wallet signature.

**Request:**
```json
{
  "walletAddress": "string",
  "signature": "string",
  "message": "string",
  "timestamp": 1234567890
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token",
  "walletAddress": "string",
  "expiresIn": "24h"
}
```

### GET /auth/verify
Verify JWT token validity.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "valid": true,
  "user": {
    "walletAddress": "string",
    "username": "string",
    "createdAt": "2024-01-01T00:00:00Z",
    "lastLogin": "2024-01-01T00:00:00Z"
  }
}
```

## Token Endpoints

### GET /token/price
Get current token price.

**Response:**
```json
{
  "price": 0.1,
  "currency": "USD",
  "change24h": 5.2,
  "lastUpdated": "2024-01-01T00:00:00Z"
}
```

### GET /token/metrics
Get token metrics and statistics.

**Response:**
```json
{
  "totalSupply": "1000000000000000000",
  "circulatingSupply": "500000000000000000",
  "totalHolders": 1250,
  "totalTransactions": 5000,
  "volume24h": "10000000000000000",
  "marketCap": 50000000
}
```

### POST /token/purchase
Record token purchase transaction.

**Request:**
```json
{
  "walletAddress": "string",
  "amount": 1000000000,
  "solAmount": 0.1,
  "transactionHash": "string"
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": 123,
  "amount": 1000000000,
  "walletAddress": "string"
}
```

### GET /token/balance/:address
Get token balance for wallet address.

**Response:**
```json
{
  "walletAddress": "string",
  "balance": "1000000000",
  "balanceFormatted": "1.0",
  "lastUpdated": "2024-01-01T00:00:00Z"
}
```

## Staking Endpoints

### GET /staking/positions/:address
Get staking positions for wallet address.

**Response:**
```json
{
  "positions": [
    {
      "id": 1,
      "amount": "1000000000",
      "tier": "bronze",
      "apy": 5.0,
      "lockDuration": 30,
      "status": "active",
      "createdAt": "2024-01-01T00:00:00Z",
      "unlockDate": "2024-02-01T00:00:00Z"
    }
  ],
  "totalStaked": "1000000000",
  "totalRewards": "50000000"
}
```

### POST /staking/stake
Create new staking position.

**Request:**
```json
{
  "walletAddress": "string",
  "amount": 1000000000,
  "lockDuration": 30,
  "transactionHash": "string"
}
```

**Response:**
```json
{
  "success": true,
  "positionId": 1,
  "amount": 1000000000,
  "tier": "bronze",
  "apy": 5.0
}
```

### POST /staking/unstake
Unstake tokens from position.

**Request:**
```json
{
  "walletAddress": "string",
  "positionId": 1,
  "transactionHash": "string"
}
```

**Response:**
```json
{
  "success": true,
  "amount": 1000000000,
  "penalty": 50000000,
  "netAmount": 950000000
}
```

## Governance Endpoints

### GET /governance/proposals
Get all governance proposals.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status (active, passed, rejected, executed)

**Response:**
```json
{
  "proposals": [
    {
      "id": 1,
      "title": "Increase Staking Rewards",
      "description": "Proposal to increase staking rewards by 2%",
      "proposalType": "parameter",
      "proposerAddress": "string",
      "votingPower": "1000000000",
      "votesFor": "500000000",
      "votesAgainst": "200000000",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00Z",
      "votingEndsAt": "2024-01-08T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

### POST /governance/proposals
Create new governance proposal.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "title": "string",
  "description": "string",
  "proposalType": "parameter",
  "votingDuration": 7
}
```

**Response:**
```json
{
  "success": true,
  "proposalId": 1,
  "title": "string",
  "votingEndsAt": "2024-01-08T00:00:00Z"
}
```

### POST /governance/vote
Vote on a proposal.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "proposalId": 1,
  "support": true,
  "votingPower": "1000000000"
}
```

**Response:**
```json
{
  "success": true,
  "voteId": 1,
  "proposalId": 1,
  "support": true,
  "votingPower": "1000000000"
}
```

## Marketplace Endpoints

### GET /marketplace/models
Get AI models in marketplace.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `category` (optional): Filter by category
- `search` (optional): Search term

**Response:**
```json
{
  "models": [
    {
      "id": 1,
      "title": "GPT-Style Language Model",
      "description": "Advanced language model for text generation",
      "category": "nlp",
      "price": "100000000",
      "creatorAddress": "string",
      "ipfsHash": "QmHash123",
      "rating": 4.5,
      "salesCount": 25,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### POST /marketplace/models
List new AI model.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "title": "string",
  "description": "string",
  "category": "nlp",
  "price": "100000000",
  "ipfsHash": "string",
  "metadataHash": "string",
  "tags": ["ai", "nlp"]
}
```

**Response:**
```json
{
  "success": true,
  "modelId": 1,
  "title": "string",
  "ipfsHash": "string"
}
```

### POST /marketplace/purchase
Purchase AI model.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "modelId": 1,
  "transactionHash": "string"
}
```

**Response:**
```json
{
  "success": true,
  "purchaseId": 1,
  "modelId": 1,
  "accessGranted": true
}
```

## Analytics Endpoints

### GET /analytics/tvl
Get Total Value Locked statistics.

**Response:**
```json
{
  "totalStaked": "1000000000000000000",
  "governanceLocked": "100000000000000000",
  "totalTvl": "1100000000000000000",
  "tvlUsd": 110000000,
  "stakingTvlUsd": 100000000,
  "governanceTvlUsd": 10000000,
  "tokenPrice": 0.1,
  "lastUpdated": "2024-01-01T00:00:00Z"
}
```

### GET /analytics/volume
Get trading volume statistics.

**Query Parameters:**
- `period` (optional): Time period (1h, 24h, 7d, 30d)

**Response:**
```json
{
  "period": "24h",
  "tokenTransactions": 150,
  "tokenVolume": "50000000000000000",
  "solVolume": 5000.0,
  "marketplacePurchases": 25,
  "marketplaceVolume": "2500000000000000",
  "totalVolumeTokens": "52500000000000000",
  "lastUpdated": "2024-01-01T00:00:00Z"
}
```

### GET /analytics/user-stats
Get user statistics.

**Response:**
```json
{
  "activeUsers30d": 1250,
  "newUsers30d": 150,
  "stakingUsers": 800,
  "governanceUsers30d": 300,
  "marketplaceCreators": 50,
  "marketplaceBuyers30d": 200,
  "lastUpdated": "2024-01-01T00:00:00Z"
}
```

## User Management Endpoints

### GET /user/profile/:address
Get user profile.

**Response:**
```json
{
  "profile": {
    "walletAddress": "string",
    "username": "string",
    "email": "string",
    "avatarUrl": "string",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "stats": {
    "tokens": {
      "transactionCount": 10,
      "totalPurchased": "1000000000"
    },
    "staking": {
      "positionCount": 2,
      "totalStaked": "500000000",
      "totalRewards": "25000000"
    },
    "governance": {
      "proposalsCreated": 1,
      "votesCast": 5
    },
    "marketplace": {
      "modelsCreated": 2,
      "modelsPurchased": 3,
      "creatorRevenue": "200000000"
    }
  }
}
```

### PUT /user/profile/:address
Update user profile.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "username": "string",
  "email": "string",
  "avatarUrl": "string"
}
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "walletAddress": "string",
    "username": "string",
    "email": "string",
    "avatarUrl": "string",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

## IPFS Endpoints

### POST /ipfs/upload
Upload file to IPFS.

**Headers:** `Authorization: Bearer <token>`

**Request:** Multipart form data with file

**Response:**
```json
{
  "success": true,
  "hash": "QmHash123456789",
  "filename": "model.bin",
  "size": 1048576,
  "mimetype": "application/octet-stream",
  "gatewayUrl": "https://ipfs.io/ipfs/QmHash123456789",
  "pinned": true
}
```

### GET /ipfs/file/:hash
Get file information from IPFS.

**Response:**
```json
{
  "hash": "QmHash123456789",
  "filename": "model.bin",
  "mimetype": "application/octet-stream",
  "size": 1048576,
  "metadata": {},
  "pinned": true,
  "gatewayUrl": "https://ipfs.io/ipfs/QmHash123456789",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

## Error Responses

### Standard Error Format
```json
{
  "error": "Error message",
  "details": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

### Common Error Messages
- `"Wallet not connected"` - User wallet not connected
- `"Invalid wallet address"` - Malformed wallet address
- `"Insufficient balance"` - Not enough tokens for operation
- `"Token expired"` - JWT token has expired
- `"Rate limit exceeded"` - Too many requests

## Rate Limiting

### Limits by Endpoint Type
- **General API**: 100 requests per 15 minutes
- **Authentication**: 10 requests per 15 minutes
- **File Upload**: 20 requests per hour
- **Transactions**: 5 requests per minute
- **Search**: 30 requests per minute

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

## Pagination

### Query Parameters
- `page`: Page number (starts from 1)
- `limit`: Items per page (max 100)

### Response Format
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

## Webhooks (Future Feature)

### Event Types
- `token.purchased`
- `staking.created`
- `staking.unstaked`
- `governance.proposal_created`
- `governance.vote_cast`
- `marketplace.model_listed`
- `marketplace.model_purchased`

### Webhook Payload
```json
{
  "event": "token.purchased",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "walletAddress": "string",
    "amount": "1000000000",
    "transactionHash": "string"
  }
}
```

---

For more information, see the [deployment guide](./DEPLOYMENT.md) or contact the development team.
