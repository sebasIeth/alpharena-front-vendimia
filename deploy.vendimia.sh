#!/bin/bash
set -e

# ── Config ─────────────────────────────────────────────────────────────────
# Deploy the Base-migrated frontend on a DIFFERENT port/path so it coexists
# with the legacy Solana version.
VPS_HOST="root@72.62.176.85"
VPS_PASSWORD="45359800@aaA"
REMOTE_DIR="/root/alpharena-front-vendimia"
COMPOSE_FILE="docker-compose.vendimia.yml"
PORT=3010
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 AlphArena Frontend (vendimia) — Deploy to VPS (port $PORT)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Check sshpass ───────────────────────────────────────
if ! command -v sshpass &>/dev/null; then
  echo "📦 Installing sshpass..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew install hudochenkov/sshpass/sshpass
  else
    sudo apt-get install -y sshpass
  fi
fi

SSH_CMD="sshpass -p '$VPS_PASSWORD' ssh -o StrictHostKeyChecking=no"
SCP_CMD="sshpass -p '$VPS_PASSWORD' rsync -avz --progress"

# ── 2. Install Docker on VPS if needed ─────────────────────
echo ""
echo "🔧 Checking Docker on VPS..."
eval $SSH_CMD $VPS_HOST << 'REMOTE_SCRIPT'
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi
if ! command -v docker compose &>/dev/null && ! docker compose version &>/dev/null 2>&1; then
  apt-get update && apt-get install -y docker-compose-plugin
fi
REMOTE_SCRIPT

# ── 3. Sync project files to VPS ──────────────────────────
echo ""
echo "📂 Syncing files to VPS..."
eval $SCP_CMD \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '.idea' \
  --exclude '.claude' \
  --exclude '.env.local' \
  --exclude '.env.dev' \
  "$PROJECT_DIR/" "$VPS_HOST:$REMOTE_DIR/"

# ── 4. Copy .env.prod.vendimia as .env (docker-compose reads .env for build args)
echo ""
echo "📋 Setting up .env from .env.prod.vendimia..."
eval $SSH_CMD $VPS_HOST "cp $REMOTE_DIR/.env.prod.vendimia $REMOTE_DIR/.env"

# ── 5. Build & deploy with Docker Compose ─────────────────
echo ""
echo "🐳 Building and deploying..."
eval $SSH_CMD $VPS_HOST << REMOTE_DEPLOY
cd $REMOTE_DIR
docker compose -f $COMPOSE_FILE down || true
docker compose -f $COMPOSE_FILE up -d --build
echo ""
echo "⏳ Waiting for container to start..."
sleep 5
docker compose -f $COMPOSE_FILE ps
echo ""
if docker compose -f $COMPOSE_FILE ps | grep -qE "(running|Up)"; then
  echo "✅ AlphArena Frontend (vendimia) deployed successfully!"
  echo "🌐 http://72.62.176.85:$PORT"
else
  echo "❌ Container not running. Logs:"
  docker compose -f $COMPOSE_FILE logs --tail 30
  exit 1
fi
REMOTE_DEPLOY

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deploy complete!"
echo "🌐 Frontend (vendimia): http://72.62.176.85:$PORT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
