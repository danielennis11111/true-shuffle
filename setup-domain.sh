#!/bin/bash

# True Shuffle Radio - Domain Setup Script
# This script sets up trueshuffleradio.com to work with Cloud Run

echo "🌐 Setting up trueshuffleradio.com for Cloud Run"
echo "================================================"

# Variables
DOMAIN="trueshuffleradio.com"
SERVICE_NAME="true-shuffle-radio"
REGION="us-central1"
PROJECT_ID="true-shuffle-radio"

echo "📋 Configuration:"
echo "  Domain: $DOMAIN"
echo "  Service: $SERVICE_NAME"
echo "  Region: $REGION"
echo "  Project: $PROJECT_ID"
echo ""

# Step 1: Get the current Cloud Run service URL
echo "🔍 Getting Cloud Run service information..."
CLOUD_RUN_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")
echo "  Cloud Run URL: $CLOUD_RUN_URL"
echo ""

# Step 2: Manual domain verification instructions
echo "⚠️  MANUAL STEP REQUIRED: Domain Verification"
echo "=============================================="
echo "You need to verify domain ownership with Google. Here's how:"
echo ""
echo "1. Go to Google Search Console: https://search.google.com/search-console"
echo "2. Add property for 'Domain' type: $DOMAIN"
echo "3. Google will provide a DNS TXT record to add to your domain"
echo "4. Add this TXT record to your Ionos DNS settings"
echo "5. Wait for verification (usually 5-15 minutes)"
echo ""

# Step 3: Ionos DNS Configuration Instructions
echo "📍 IONOS DNS Configuration Required"
echo "=================================="
echo "In your Ionos control panel, add these DNS records:"
echo ""
echo "For www subdomain:"
echo "  Type: CNAME"
echo "  Name: www"
echo "  Value: ghs.googlehosted.com"
echo "  TTL: 3600"
echo ""
echo "For root domain (after domain mapping is created):"
echo "  Type: A"
echo "  Name: @"
echo "  Value: [Will be provided after domain mapping]"
echo ""

# Step 4: Create domain mapping (will need to run after verification)
echo "🔗 Domain Mapping Command (run after verification):"
echo "================================================="
echo "gcloud beta run domain-mappings create \\"
echo "  --service $SERVICE_NAME \\"
echo "  --domain $DOMAIN \\"
echo "  --region $REGION"
echo ""

# Step 5: Update environment variables
echo "🔧 Updating Cloud Run environment variables..."
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --set-env-vars "SPOTIFY_CLIENT_ID=69889249cd33426ab241d33713e55fad,SPOTIFY_CLIENT_SECRET=c5af1fce82de4e098a3224abe002d597,NODE_ENV=production,REDIRECT_URI=https://$DOMAIN/callback,FRONTEND_URL=https://$DOMAIN,CORS_ORIGIN=https://$DOMAIN"

echo "✅ Environment variables updated!"
echo ""

echo "📝 Next Steps:"
echo "=============="
echo "1. Complete domain verification in Google Search Console"
echo "2. Add DNS records in Ionos control panel"
echo "3. Run the domain mapping command above"
echo "4. Update Spotify app redirect URI to: https://$DOMAIN/callback"
echo ""

echo "🎯 Your app will be accessible at: https://$DOMAIN"
echo "⏱️  DNS propagation may take up to 48 hours" 