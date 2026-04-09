#!/bin/bash

# Manual Payment Config Sync Script for Deskive
# This script syncs Deskive's Stripe payment configuration to Fluxez using direct API calls
# Run this when payment configuration sync fails during startup

set -e  # Exit on error

echo "======================================"
echo "🚀 Deskive Payment Config Sync"
echo "======================================"
echo ""

# Load environment variables from .env.production
if [ -f "backend/.env.production" ]; then
    echo "📁 Loading environment from backend/.env.production"
    export $(cat backend/.env.production | grep -v '^#' | xargs)
elif [ -f ".env.production" ]; then
    echo "📁 Loading environment from .env.production"
    export $(cat .env.production | grep -v '^#' | xargs)
else
    echo "❌ ERROR: .env.production file not found!"
    exit 1
fi

echo ""

# Check required variables
if [ -z "$FLUXEZ_API_KEY" ]; then
    echo "❌ ERROR: FLUXEZ_API_KEY is not set!"
    exit 1
fi

if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "❌ ERROR: STRIPE_SECRET_KEY is not set!"
    exit 1
fi

if [ -z "$STRIPE_PUBLISHABLE_KEY" ]; then
    echo "❌ ERROR: STRIPE_PUBLISHABLE_KEY is not set!"
    exit 1
fi

if [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
    echo "❌ ERROR: STRIPE_WEBHOOK_SECRET is not set!"
    exit 1
fi

echo "✅ Service key found: ${FLUXEZ_API_KEY:0:20}..."
echo "✅ Publishable key found: ${STRIPE_PUBLISHABLE_KEY:0:20}..."
echo "✅ Secret key found: ${STRIPE_SECRET_KEY:0:15}..."
echo "✅ Webhook secret found: ${STRIPE_WEBHOOK_SECRET:0:15}..."
echo ""

# Fluxez API URL
API_URL="https://api.fluxez.com/api/v1"
echo "🌐 API URL: $API_URL"
echo ""

# Prepare payment config JSON
PRICE_IDS=$(cat <<EOF
[
  "$STRIPE_PRICE_ID_STARTER_MONTHLY",
  "$STRIPE_PRICE_ID_STARTER_YEARLY",
  "$STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY",
  "$STRIPE_PRICE_ID_PROFESSIONAL_YEARLY",
  "$STRIPE_PRICE_ID_ENTERPRISE_MONTHLY",
  "$STRIPE_PRICE_ID_ENTERPRISE_YEARLY"
]
EOF
)

CONFIG_JSON=$(cat <<EOF
{
  "stripePublishableKey": "$STRIPE_PUBLISHABLE_KEY",
  "stripeSecretKey": "$STRIPE_SECRET_KEY",
  "stripeWebhookSecret": "$STRIPE_WEBHOOK_SECRET",
  "priceIds": $PRICE_IDS
}
EOF
)

echo "📋 Payment configuration:"
echo "  - Price IDs: 6 configured"
echo "    1. $STRIPE_PRICE_ID_STARTER_MONTHLY"
echo "    2. $STRIPE_PRICE_ID_STARTER_YEARLY"
echo "    3. $STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY"
echo "    4. $STRIPE_PRICE_ID_PROFESSIONAL_YEARLY"
echo "    5. $STRIPE_PRICE_ID_ENTERPRISE_MONTHLY"
echo "    6. $STRIPE_PRICE_ID_ENTERPRISE_YEARLY"
echo ""

# Try to get existing config
echo "🔍 Checking for existing payment config..."
HTTP_CODE=$(curl -s -o /tmp/get_config_response.json -w "%{http_code}" \
  -X GET "$API_URL/tenant-payment/config" \
  -H "x-api-key: $FLUXEZ_API_KEY" \
  -H "Content-Type: application/json")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Found existing config, updating..."
    echo ""

    # Update existing config
    RESPONSE=$(curl -X PUT "$API_URL/tenant-payment/config" \
      -H "x-api-key: $FLUXEZ_API_KEY" \
      -H "Content-Type: application/json" \
      -d "$CONFIG_JSON" \
      -s)

    echo "$RESPONSE" | jq '.'
    echo ""
    echo "✅ Payment config updated successfully!"

elif [ "$HTTP_CODE" = "404" ]; then
    echo "⚠️  No existing config found, creating new one..."
    echo ""

    # Create new config
    RESPONSE=$(curl -X POST "$API_URL/tenant-payment/config" \
      -H "x-api-key: $FLUXEZ_API_KEY" \
      -H "Content-Type: application/json" \
      -d "$CONFIG_JSON" \
      -s)

    echo "$RESPONSE" | jq '.'
    echo ""
    echo "✅ Payment config created successfully!"

else
    echo "❌ Unexpected HTTP status: $HTTP_CODE"
    echo "Response:"
    cat /tmp/get_config_response.json | jq '.' || cat /tmp/get_config_response.json
    exit 1
fi

echo ""
echo "🎉 Payment configuration sync completed!"
echo "✅ Deskive is now ready to process payments through Fluxez"
echo ""
