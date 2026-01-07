#!/bin/sh
# Entrypoint script for backend container
# Constructs DATABASE_URL from POSTGRES_PASSWORD to ensure synchronization

set -e

# URL encode function
urlencode() {
    local string="$1"
    local encoded=""
    local i
    
    for i in $(seq 0 $((${#string} - 1))); do
        local c="${string:$i:1}"
        case "$c" in
            [-_.~a-zA-Z0-9]) echo -n "$c" ;;
            *) printf "%%%02x" "'$c" ;;
        esac
    done
}

echo "================================"
echo "🚀 Backend Entrypoint"
echo "================================"

# Debug: Show environment variables
echo ""
echo "Environment Variables:"
echo "  NODE_ENV: $NODE_ENV"
echo "  PORT: $PORT"
echo "  DATABASE_URL: ${DATABASE_URL:-(not set)}"
echo "  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:+(set)}"
echo "  POSTGRES_HOST: ${POSTGRES_HOST:-postgres}"
echo ""

# If DATABASE_URL is already set, use it (prefer explicit over constructed)
if [ -n "$DATABASE_URL" ]; then
    echo "✅ Using provided DATABASE_URL"
else
    # Try to construct from POSTGRES_PASSWORD
    if [ -n "$POSTGRES_PASSWORD" ]; then
        # Use environment variables for host/port or defaults
        POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
        POSTGRES_PORT="${POSTGRES_PORT:-5432}"
        
        ENCODED_PASSWORD=$(urlencode "$POSTGRES_PASSWORD")
        export DATABASE_URL="postgresql://postgres:${ENCODED_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/swholo_game?schema=public"
        echo "✅ DATABASE_URL constructed from POSTGRES_PASSWORD"
        echo "   postgresql://postgres:***@${POSTGRES_HOST}:${POSTGRES_PORT}/swholo_game?schema=public"
    else
        echo "❌ ERROR: Neither DATABASE_URL nor POSTGRES_PASSWORD is set!"
        echo ""
        echo "Please ensure .env.production is properly loaded with:"
        echo "  - DATABASE_URL or"
        echo "  - POSTGRES_PASSWORD"
        exit 1
    fi
fi

echo ""
echo "================================"
echo "Applying Migrations"
echo "================================"

# Run migrations and start the app
if npx prisma migrate deploy; then
    echo "✅ Migrations applied successfully"
else
    echo "⚠️  Migrations failed or already applied"
fi

echo ""
echo "================================"
echo "Starting Backend Server"
echo "================================"

exec node dist/index.js
