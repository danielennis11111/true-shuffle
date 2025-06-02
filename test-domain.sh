#!/bin/bash

echo "🧪 Testing trueshuffleradio.com domain status..."
echo "=============================================="

echo "1️⃣ DNS A Records:"
dig trueshuffleradio.com A +short

echo ""
echo "2️⃣ HTTP Test:"
curl -I http://trueshuffleradio.com/ 2>/dev/null | head -2 || echo "HTTP failed"

echo ""
echo "3️⃣ HTTPS Test:"
curl -I https://trueshuffleradio.com/ 2>/dev/null | head -2 || echo "HTTPS not ready yet"

echo ""
echo "4️⃣ Cloud Run URL (should work):"
curl -I https://true-shuffle-radio-981361502634.us-central1.run.app/ 2>/dev/null | head -2

echo ""
echo "📋 Expected when ready:"
echo "- HTTP should redirect to HTTPS (301/302)"
echo "- HTTPS should return 200 OK"
echo "- All 4 A records should be visible" 