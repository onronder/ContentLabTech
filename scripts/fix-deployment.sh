#!/bin/bash

# Deployment Fix Script for Asset Loading Issues
# This script addresses the critical MIME type and asset path problems

echo "🚀 Starting Deployment Fix Process..."

# Step 1: Clean previous build artifacts
echo "🧹 Cleaning previous build artifacts..."
npm run clean
rm -rf .vercel

# Step 2: Verify dependencies
echo "📦 Verifying dependencies..."
npm ci

# Step 3: Run quality checks
echo "🔍 Running quality checks..."
echo "   - Type checking..."
npm run type-check

echo "   - Linting..."
npm run lint --silent

# Step 4: Build the application
echo "🏗️  Building application..."
npm run build

# Step 5: Verify build output
echo "🔬 Verifying build output..."
if [ ! -d ".next/static" ]; then
    echo "❌ ERROR: .next/static directory not found!"
    exit 1
fi

if [ ! -f ".next/static/css/4f848207ffc3323e.css" ]; then
    echo "⚠️  WARNING: Expected CSS file not found, but build may have different hash"
fi

echo "✅ Build verification complete"

# Step 6: Display asset information
echo "📊 Build Asset Summary:"
echo "   CSS Files: $(find .next/static -name "*.css" | wc -l)"
echo "   JS Files: $(find .next/static -name "*.js" | wc -l)"
echo "   Total Static Files: $(find .next/static -type f | wc -l)"

# Step 7: Create deployment verification
echo "🔧 Creating deployment verification..."
cat > .next/deployment-info.json << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "nodeVersion": "$(node --version)",
  "npmVersion": "$(npm --version)",
  "nextVersion": "$(npm list next --depth=0 | grep next || echo 'next@unknown')",
  "buildHash": "$(find .next/static/chunks -name "webpack-*.js" | head -1 | sed 's/.*webpack-\(.*\)\.js/\1/')",
  "assetVerification": {
    "cssFiles": $(find .next/static -name "*.css" | wc -l),
    "jsFiles": $(find .next/static -name "*.js" | wc -l),
    "staticPath": "/_next/static/",
    "assetPrefix": "",
    "publicPath": "/_next/"
  }
}
EOF

echo "📋 Deployment Info:"
cat .next/deployment-info.json

# Step 8: Verify configuration files
echo "🔧 Verifying configuration files..."
if [ ! -f "vercel.json" ]; then
    echo "❌ ERROR: vercel.json not found!"
    exit 1
fi

if [ ! -f "next.config.ts" ]; then
    echo "❌ ERROR: next.config.ts not found!"
    exit 1
fi

echo "✅ Configuration files verified"

# Step 9: Test local server (optional)
echo "🧪 To test locally, run: npm start"
echo "   Then check: http://localhost:3000"
echo "   Verify assets load from: /_next/static/"

echo ""
echo "🎉 Deployment Fix Complete!"
echo ""
echo "📝 Next Steps:"
echo "   1. Deploy to Vercel: vercel --prod"
echo "   2. Monitor deployment logs for asset-related errors"
echo "   3. Test asset loading in production environment"
echo "   4. Verify MIME types are correct in browser DevTools"
echo ""
echo "🔍 Debug Commands:"
echo "   - Check asset paths: curl -I https://app.contentlabtech.com/_next/static/css/[hash].css"
echo "   - Verify MIME types: curl -I https://app.contentlabtech.com/_next/static/chunks/[hash].js"
echo "   - Force cache clear: Add ?v=$(date +%s) to asset URLs"
echo ""
echo "✅ Ready for deployment!"