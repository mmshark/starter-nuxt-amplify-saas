#!/bin/bash

# Script to publish a single layer to GitHub Packages
# Usage: ./scripts/publish-layer.sh <layer-name> [version-type]
# Example: ./scripts/publish-layer.sh auth minor

set -e

LAYER_NAME=$1
VERSION_TYPE=${2:-patch}  # patch, minor, major, prerelease

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

if [ -z "$LAYER_NAME" ]; then
  echo -e "${RED}❌ Error: Layer name required${NC}"
  echo "Usage: ./scripts/publish-layer.sh <layer-name> [version-type]"
  echo "Example: ./scripts/publish-layer.sh auth minor"
  echo ""
  echo "Available layers: amplify, uix, i18n, auth, billing, workspaces, entitlements, saas, debug"
  echo "Version types: patch, minor, major, prerelease"
  exit 1
fi

LAYER_PATH="layers/$LAYER_NAME"

if [ ! -d "$LAYER_PATH" ]; then
  echo -e "${RED}❌ Error: Layer directory not found: $LAYER_PATH${NC}"
  exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 Publishing Layer${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Layer: ${GREEN}$LAYER_NAME${NC}"
echo -e "Path: $LAYER_PATH"
echo -e "Version bump: ${YELLOW}$VERSION_TYPE${NC}"
echo ""

cd "$LAYER_PATH"

# Verify package.json exists
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Error: package.json not found in $LAYER_PATH${NC}"
  echo "Run: node scripts/generate-layer-packages.js"
  exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "Current version: ${YELLOW}$CURRENT_VERSION${NC}"

# Update version manually using Node.js (avoids workspace protocol issues)
echo -e "\n⬆️  Bumping version (${VERSION_TYPE})..."
NEW_VERSION=$(node -e "
const fs = require('fs');
const pkg = require('./package.json');

function incVersion(version, type) {
  const parts = version.split('.').map(Number);
  if (type === 'major') {
    return (parts[0] + 1) + '.0.0';
  } else if (type === 'minor') {
    return parts[0] + '.' + (parts[1] + 1) + '.0';
  } else if (type === 'patch') {
    return parts[0] + '.' + parts[1] + '.' + (parts[2] + 1);
  } else {
    return type; // Assume explicit version
  }
}

const newVersion = incVersion(pkg.version, '$VERSION_TYPE');
pkg.version = newVersion;
fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log(newVersion);
")

echo -e "New version: ${GREEN}$NEW_VERSION${NC}"

# Publish to GitHub Packages
echo -e "\n🚀 Publishing to GitHub Packages..."
# Use pnpm publish which handles workspace protocol correctly
if pnpm publish --no-git-checks; then
  echo -e "\n${GREEN}✅ Successfully published @mmshark/${LAYER_NAME}-layer@${NEW_VERSION}${NC}"
else
  echo -e "\n${RED}❌ Failed to publish ${LAYER_NAME}${NC}"
  # Revert version change
  echo -e "${YELLOW}⏪ Reverting version change...${NC}"
  node -e "
const fs = require('fs');
const pkg = require('./package.json');
pkg.version = '$CURRENT_VERSION';
fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
"
  cd ../..
  exit 1
fi

cd ../..

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Publication Complete${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📝 Remember to commit the version change:"
echo -e "   ${YELLOW}git add layers/${LAYER_NAME}/package.json${NC}"
echo -e "   ${YELLOW}git commit -m \"chore(${LAYER_NAME}): release v${NEW_VERSION}\"${NC}"
echo -e "   ${YELLOW}git tag ${LAYER_NAME}/v${NEW_VERSION}${NC}"
echo -e "   ${YELLOW}git push && git push --tags${NC}"
echo ""
echo "🔗 View package: https://github.com/mmshark/starter-nuxt-amplify-saas/packages"
