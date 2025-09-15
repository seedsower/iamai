#!/bin/bash

# IAMAI DAO Deployment Script
# This script handles deployment to different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="development"
BUILD_FRONTEND=true
BUILD_BACKEND=true
RUN_TESTS=true
DEPLOY_CONTRACTS=false

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  -e, --environment ENV    Set environment (development|staging|production)"
    echo "  -f, --frontend-only      Build frontend only"
    echo "  -b, --backend-only       Build backend only"
    echo "  -t, --skip-tests         Skip running tests"
    echo "  -c, --deploy-contracts   Deploy smart contracts"
    echo "  -h, --help              Show this help message"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -f|--frontend-only)
            BUILD_BACKEND=false
            shift
            ;;
        -b|--backend-only)
            BUILD_FRONTEND=false
            shift
            ;;
        -t|--skip-tests)
            RUN_TESTS=false
            shift
            ;;
        -c|--deploy-contracts)
            DEPLOY_CONTRACTS=true
            shift
            ;;
        -h|--help)
            show_usage
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            ;;
    esac
done

print_status "Starting IAMAI DAO deployment for environment: $ENVIRONMENT"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Validate environment
if [[ "$ENVIRONMENT" != "development" && "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    print_error "Valid environments: development, staging, production"
    exit 1
fi

# Check if environment file exists
ENV_FILE=".env.$ENVIRONMENT"
if [[ ! -f "$ENV_FILE" ]]; then
    print_warning "Environment file $ENV_FILE not found. Using env.example as template."
    if [[ -f "env.example" ]]; then
        cp env.example "$ENV_FILE"
        print_warning "Please update $ENV_FILE with your configuration before proceeding."
        read -p "Press Enter to continue after updating the environment file..."
    else
        print_error "env.example file not found. Please create $ENV_FILE manually."
        exit 1
    fi
fi

# Load environment variables
export $(grep -v '^#' "$ENV_FILE" | xargs)

# Run tests if requested
if [[ "$RUN_TESTS" == true ]]; then
    print_status "Running tests..."
    
    # Backend tests
    if [[ "$BUILD_BACKEND" == true ]]; then
        print_status "Running backend tests..."
        cd backend
        npm test
        cd ..
    fi
    
    # Frontend tests
    if [[ "$BUILD_FRONTEND" == true ]]; then
        print_status "Running frontend tests..."
        npm test
    fi
    
    print_status "All tests passed!"
fi

# Deploy smart contracts if requested
if [[ "$DEPLOY_CONTRACTS" == true ]]; then
    print_status "Deploying smart contracts..."
    
    # Check if Anchor is installed
    if ! command -v anchor &> /dev/null; then
        print_error "Anchor is not installed. Please install Anchor CLI first."
        exit 1
    fi
    
    # Deploy contracts
    cd contracts
    anchor build
    anchor deploy
    cd ..
    
    print_status "Smart contracts deployed successfully!"
fi

# Build and deploy services
print_status "Building and deploying services..."

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose down

# Build images
if [[ "$BUILD_FRONTEND" == true ]]; then
    print_status "Building frontend image..."
    docker-compose build frontend
fi

if [[ "$BUILD_BACKEND" == true ]]; then
    print_status "Building backend image..."
    docker-compose build backend
fi

# Start services based on environment
case $ENVIRONMENT in
    development)
        print_status "Starting development environment..."
        docker-compose up -d postgres redis ipfs
        sleep 10  # Wait for databases to be ready
        docker-compose up -d backend
        sleep 5   # Wait for backend to be ready
        docker-compose up -d frontend nginx
        ;;
    staging)
        print_status "Starting staging environment..."
        docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d
        ;;
    production)
        print_status "Starting production environment..."
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
        ;;
esac

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 30

# Health checks
print_status "Performing health checks..."

# Check backend health
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    print_status "Backend is healthy"
else
    print_error "Backend health check failed"
    docker-compose logs backend
    exit 1
fi

# Check frontend (if built)
if [[ "$BUILD_FRONTEND" == true ]]; then
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_status "Frontend is healthy"
    else
        print_error "Frontend health check failed"
        docker-compose logs frontend
        exit 1
    fi
fi

# Show deployment summary
print_status "Deployment completed successfully!"
echo ""
echo "Services running:"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:3001"
echo "  Database: localhost:5432"
echo "  Redis: localhost:6379"
echo "  IPFS: http://localhost:8080"

if [[ "$ENVIRONMENT" != "development" ]]; then
    echo "  Prometheus: http://localhost:9090"
    echo "  Grafana: http://localhost:3001"
fi

echo ""
echo "To view logs: docker-compose logs [service-name]"
echo "To stop services: docker-compose down"
echo ""

print_status "IAMAI DAO deployment completed successfully!"
