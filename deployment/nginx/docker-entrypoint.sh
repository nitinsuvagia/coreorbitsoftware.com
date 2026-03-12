#!/bin/sh
set -e

# -------------------------------------------------------
# Nginx Docker Entrypoint
# Generates a self-signed SSL cert if none exists, then
# starts nginx. This prevents nginx from refusing to start
# because the Let's Encrypt cert hasn't been provisioned yet.
# Real certs (e.g. from Let's Encrypt) placed in the mounted
# /etc/nginx/ssl/ directory will be used automatically on
# any subsequent restart.
# -------------------------------------------------------

SSL_DIR="/etc/nginx/ssl"
CERT_FILE="$SSL_DIR/fullchain.pem"
KEY_FILE="$SSL_DIR/privkey.pem"

mkdir -p "$SSL_DIR"

if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    echo "[nginx-entrypoint] SSL certs not found — generating self-signed fallback..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$KEY_FILE" \
        -out "$CERT_FILE" \
        -subj "/CN=coreorbitsoftware.com" 2>&1
    echo "[nginx-entrypoint] Self-signed SSL certs generated at $SSL_DIR"
else
    echo "[nginx-entrypoint] SSL certs found at $SSL_DIR"
fi

echo "[nginx-entrypoint] Starting nginx..."
exec nginx -g 'daemon off;'
