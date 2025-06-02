#!/bin/bash

# Complete Domain Setup - Run after domain verification
echo "🔄 Completing trueshuffleradio.com domain setup..."

DOMAIN="trueshuffleradio.com"
SERVICE_NAME="true-shuffle-radio"
REGION="us-central1"

echo "1️⃣ Checking domain verification status..."
VERIFIED_DOMAINS=$(gcloud domains list-user-verified --format="value(domain)" 2>/dev/null)

if echo "$VERIFIED_DOMAINS" | grep -q "$DOMAIN"; then
    echo "✅ Domain $DOMAIN is verified!"
    
    echo "2️⃣ Creating domain mapping..."
    gcloud beta run domain-mappings create \
        --service $SERVICE_NAME \
        --domain $DOMAIN \
        --region $REGION
    
    echo "3️⃣ Getting DNS configuration..."
    echo "Add these A records to your Ionos DNS:"
    gcloud beta run domain-mappings describe $DOMAIN \
        --region $REGION \
        --format="table(spec.routeName, status.resourceRecords[].rrdata)"
    
    echo ""
    echo "✅ Domain setup complete!"
    echo "🌐 Your app will be accessible at: https://$DOMAIN"
    echo "⚠️  Don't forget to update Spotify redirect URI!"
    
else
    echo "❌ Domain $DOMAIN is not verified yet."
    echo "📝 Please complete these steps first:"
    echo "1. Go to https://search.google.com/search-console"
    echo "2. Add property for domain: $DOMAIN"
    echo "3. Add the provided TXT record to Ionos DNS"
    echo "4. Wait for verification (5-15 minutes)"
    echo "5. Run this script again"
fi 