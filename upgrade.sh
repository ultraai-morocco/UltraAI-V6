#!/data/data/com.termux/files/usr/bin/bash

set -e

cd ~/UltraAI

VERSION="$1"

backup() {
  echo "📦 إنشاء نسخة احتياطية..."
  mkdir -p backups
  zip -rq backups/UltraAI_$(date +%Y%m%d_%H%M%S).zip \
    public server package.json package-lock.json
}

restart_server() {
  echo "🚀 إعادة تشغيل السيرفر..."
  pkill node 2>/dev/null || true
  nohup node server/server.js >/dev/null 2>&1 &
  sleep 2
}

case "$VERSION" in
  v2)
    backup
    echo "⚡ UltraAI V2"
    restart_server
    echo "✅ UltraAI V2 Ready"
    ;;

  *)
    echo "طريقة الاستعمال:"
    echo "./upgrade.sh v2"
    exit 1
    ;;
esac
