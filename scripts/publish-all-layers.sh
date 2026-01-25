#!/bin/bash

# Publishes all layers in dependency order to GitHub Packages
# Usage: ./scripts/publish-all-layers.sh [version-type]
# Example: ./scripts/publish-all-layers.sh minor

set -e

VERSION_TYPE=${1:-patch}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 Publishing All Layers to GitHub Packages${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Version bump: ${YELLOW}$VERSION_TYPE${NC}"
echo ""

# Layers in dependency order (respecting peer dependencies)
# Foundation layers first (no dependencies)
# Then feature layers (depend on foundation)
# Finally meta-layer (depends on all)
LAYERS=(
  "amplify"      # Foundation: No dependencies
  "uix"          # Foundation: No dependencies
  "i18n"         # Foundation: No dependencies
  "auth"         # Feature: Depends on amplify
  "billing"      # Feature: Depends on amplify, auth
  "workspaces"   # Feature: Depends on amplify, auth
  "entitlements" # Feature: Depends on amplify, auth
  "debug"        # Development: No dependencies
  "saas"         # Meta-layer: Depends on ALL above
)

FAILED_LAYERS=()
SUCCESS_COUNT=0
TOTAL_COUNT=${#LAYERS[@]}

for layer in "${LAYERS[@]}"; do
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}📦 Publishing: ${layer}${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  if ./scripts/publish-layer.sh "$layer" "$VERSION_TYPE"; then
    echo -e "${GREEN}✅ Success: $layer${NC}"
    ((SUCCESS_COUNT++))
  else
    echo -e "${RED}❌ Failed: $layer${NC}"
    FAILED_LAYERS+=("$layer")
  fi

  # Small delay to avoid potential rate limiting
  sleep 2
done

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Publishing Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Total layers: ${TOTAL_COUNT}"
echo -e "${GREEN}Successful: ${SUCCESS_COUNT}${NC}"
echo -e "${RED}Failed: ${#FAILED_LAYERS[@]}${NC}"

if [ ${#FAILED_LAYERS[@]} -eq 0 ]; then
  echo -e "\n${GREEN}✨ All layers published successfully!${NC}"
  echo ""
  echo "📝 Next steps:"
  echo -e "   1. Commit version changes:"
  echo -e "      ${YELLOW}git add layers/*/package.json${NC}"
  echo -e "      ${YELLOW}git commit -m \"chore: release layers v${VERSION_TYPE}\"${NC}"
  echo ""
  echo -e "   2. Create tags for each layer:"
  for layer in "${LAYERS[@]}"; do
    VERSION=$(node -p "require('./layers/${layer}/package.json').version" 2>/dev/null || echo "unknown")
    if [ "$VERSION" != "unknown" ]; then
      echo -e "      ${YELLOW}git tag ${layer}/v${VERSION}${NC}"
    fi
  done
  echo ""
  echo -e "   3. Push changes:"
  echo -e "      ${YELLOW}git push && git push --tags${NC}"
  echo ""
  echo "🔗 View packages: https://github.com/mmshark/starter-nuxt-amplify-saas/packages"
  exit 0
else
  echo -e "\n${RED}❌ Failed layers: ${FAILED_LAYERS[*]}${NC}"
  echo ""
  echo "Please fix the errors and try again."
  exit 1
fi
