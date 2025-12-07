#!/bin/bash

echo "=== Starting Azure App Service Startup Script ==="

# Install ImageMagick and Ghostscript for PDF processing
echo "Installing ImageMagick and Ghostscript..."
apt-get update -qq
apt-get install -y -qq imagemagick ghostscript libgs-dev > /dev/null 2>&1

# Check installation
if command -v convert &> /dev/null; then
    echo "ImageMagick installed successfully: $(convert --version | head -1)"
else
    echo "WARNING: ImageMagick installation failed"
fi

if command -v gs &> /dev/null; then
    echo "Ghostscript installed successfully: $(gs --version)"
else
    echo "WARNING: Ghostscript installation failed"
fi

# Update ImageMagick policy to allow PDF processing
POLICY_FILE="/etc/ImageMagick-6/policy.xml"
if [ -f "$POLICY_FILE" ]; then
    echo "Updating ImageMagick policy for PDF support..."
    # Remove PDF restrictions
    sed -i 's/<policy domain="coder" rights="none" pattern="PDF" \/>/<policy domain="coder" rights="read|write" pattern="PDF" \/>/g' "$POLICY_FILE" 2>/dev/null || true
    # Also try the pattern with single quotes
    sed -i "s/<policy domain=\"coder\" rights=\"none\" pattern=\"PDF\" \/>/<policy domain=\"coder\" rights=\"read|write\" pattern=\"PDF\" \/>/g" "$POLICY_FILE" 2>/dev/null || true
    echo "ImageMagick policy updated"
fi

# Alternative policy file location
POLICY_FILE_ALT="/etc/ImageMagick/policy.xml"
if [ -f "$POLICY_FILE_ALT" ]; then
    echo "Updating alternative ImageMagick policy..."
    sed -i 's/<policy domain="coder" rights="none" pattern="PDF" \/>/<policy domain="coder" rights="read|write" pattern="PDF" \/>/g' "$POLICY_FILE_ALT" 2>/dev/null || true
fi

# Navigate to server directory
cd /home/site/wwwroot/server

# Install npm dependencies if needed
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo "Installing npm dependencies..."
    npm install --production
else
    echo "Node modules already installed"
fi

# Start the Node.js server
echo "Starting Node.js server..."
exec node server.js
