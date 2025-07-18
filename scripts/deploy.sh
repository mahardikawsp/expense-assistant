#!/bin/bash
# Production deployment script for Expense Assistant

set -e # Exit on error

# Display execution steps
echo "Starting deployment process..."

# Check if required environment variables are set
if [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ] || [ -z "$DB_NAME" ]; then
  echo "Error: Database environment variables not set"
  exit 1
fi

if [ -z "$NEXTAUTH_SECRET_VALUE" ]; then
  echo "Error: NEXTAUTH_SECRET_VALUE not set"
  exit 1
fi

# Install dependencies
echo "Installing dependencies..."
pnpm install --frozen-lockfile

# Generate Prisma client
echo "Generating Prisma client..."
pnpm prisma:generate

# Run database migrations
echo "Running database migrations..."
pnpm prisma migrate deploy

# Build the application
echo "Building the application..."
pnpm build

# Run tests
echo "Running tests..."
pnpm test --run

# Start the application
echo "Starting the application..."
pnpm start