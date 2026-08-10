#!/data/data/com.termux/files/usr/bin/bash

set -e

cd ~/UltraAI

echo "📦 إنشاء نسخة احتياطية..."

mkdir -p backups

zip -rq backups/UltraAI_$(date +%Y%m%d_%H%M%S).zip \
public server package.json package-lock.json

echo "🧹 تنظيف..."

find . -name "*.tmp" -delete

echo "📂 إنشاء المجلدات..."

mkdir -p server/data
mkdir -p public/assets

touch server/data/conversations.json

if [ ! -s server/data/conversations.json ]; then
echo "[]" > server/data/conversations.json
fi

echo "🚀 إعادة تشغيل السيرفر..."

pkill node 2>/dev/null || true

nohup node server/server.js >/dev/null 2>&1 &

sleep 2

echo ""
echo "==============================="
echo "✅ UltraAI Upgrade Finished"
echo "==============================="
