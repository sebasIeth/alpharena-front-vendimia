#!/bin/bash
set -e

# ── Config ─────────────────────────────────────────────────
VPS_HOST="root@187.77.47.112"
VPS_PASSWORD="45359800@aaA"
REMOTE_DIR="/root/alpharena-front"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 AlphArena Frontend — Deploy to VPS"
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
  echo "📦 Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "✅ Docker installed"
else
  echo "✅ Docker already installed: $(docker --version)"
fi

if ! command -v docker compose &>/dev/null && ! docker compose version &>/dev/null 2>&1; then
  echo "📦 Installing Docker Compose plugin..."
  apt-get update && apt-get install -y docker-compose-plugin
  echo "✅ Docker Compose installed"
else
  echo "✅ Docker Compose ready"
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

# ── 4. Copy .env.prod as .env (docker-compose reads .env for build args)
echo ""
echo "📋 Setting up .env from .env.prod..."
eval $SSH_CMD $VPS_HOST "cp $REMOTE_DIR/.env.prod $REMOTE_DIR/.env"

# ── 5. Build & deploy with Docker Compose ─────────────────
echo ""
echo "🐳 Building and deploying..."
eval $SSH_CMD $VPS_HOST << REMOTE_DEPLOY
cd $REMOTE_DIR
docker compose down || true
docker compose up -d --build
echo ""
echo "⏳ Waiting for container to start..."
sleep 5
docker compose ps
echo ""
if docker compose ps | grep -qE "(running|Up)"; then
  echo "✅ AlphArena Frontend deployed successfully!"
  echo "🌐 http://187.77.47.112:3000"
else
  echo "❌ Container not running. Logs:"
  docker compose logs --tail 30
  exit 1
fi
REMOTE_DEPLOY

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deploy complete!"
echo "🌐 Frontend: http://187.77.47.112:3000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
