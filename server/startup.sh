#!/bin/bash
set -e

echo "=== Azure App Service Startup Script ==="
echo "Current directory: $(pwd)"
echo "Date: $(date)"

# Install ImageMagick and Ghostscript (non-interactive)
echo "Installing ImageMagick and Ghostscript..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq 2>/dev/null || echo "apt-get update failed, continuing..."
apt-get install -y --no-install-recommends imagemagick ghostscript 2>/dev/null || echo "apt-get install failed, continuing..."

# Check installation status
echo "Checking installations..."
which convert && echo "ImageMagick: OK" || echo "ImageMagick: NOT FOUND"
which gs && echo "Ghostscript: OK" || echo "Ghostscript: NOT FOUND"

# Update ImageMagick policy to allow PDF processing
for POLICY_FILE in /etc/ImageMagick-6/policy.xml /etc/ImageMagick/policy.xml; do
    if [ -f "$POLICY_FILE" ]; then
        echo "Updating policy: $POLICY_FILE"
        sed -i 's/rights="none" pattern="PDF"/rights="read|write" pattern="PDF"/g' "$POLICY_FILE" 2>/dev/null || true
    fi
done

# Navigate to server directory
cd /home/site/wwwroot/server
echo "Working directory: $(pwd)"

# Install npm dependencies
echo "Installing npm dependencies..."
npm install --production --legacy-peer-deps 2>&1 || echo "npm install had warnings"

# Start the server
echo "Starting Node.js server..."
exec node server.js
