#!/bin/sh
# Frontend Docker Entrypoint - Inject environment variables at runtime

set -e

# Default values
VITE_API_URL="${VITE_API_URL:-https://swholo.net}"
VITE_ASSET_BASE_URL="${VITE_ASSET_BASE_URL:-https://swholonet.github.io/assets}"

echo "🚀 Frontend starting..."
echo "VITE_API_URL: $VITE_API_URL"
echo "VITE_ASSET_BASE_URL: $VITE_ASSET_BASE_URL"

# Create a runtime config file that the app will load
cat > /app/dist/config.js << EOF
window.__RUNTIME_CONFIG__ = {
  VITE_API_URL: '$VITE_API_URL',
  VITE_ASSET_BASE_URL: '$VITE_ASSET_BASE_URL'
};
EOF

echo "✅ Runtime config injected"

# Start the server
exec serve -s dist -l 3000
