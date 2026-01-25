#!/bin/bash

# Verifies that all layers are correctly configured for publishing
# Usage: ./scripts/verify-layers.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 Verifying Layer Configurations${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

LAYERS=("amplify" "uix" "i18n" "auth" "billing" "workspaces" "entitlements" "saas" "debug")
ERRORS=0
WARNINGS=0

for layer in "${LAYERS[@]}"; do
  echo -e "${BLUE}Checking ${layer}...${NC}"

  LAYER_PATH="layers/$layer"

  # Check directory exists
  if [ ! -d "$LAYER_PATH" ]; then
    echo -e "  ${RED}❌ Directory not found${NC}"
    ((ERRORS++))
    continue
  fi

  # Check package.json
  if [ ! -f "$LAYER_PATH/package.json" ]; then
    echo -e "  ${RED}❌ package.json missing${NC}"
    ((ERRORS++))
  else
    echo -e "  ${GREEN}✅ package.json exists${NC}"

    # Verify package name
    PACKAGE_NAME=$(node -p "require('./$LAYER_PATH/package.json').name" 2>/dev/null)
    if [[ $PACKAGE_NAME == "@mmshark/${layer}-layer" ]]; then
      echo -e "  ${GREEN}✅ Package name correct: $PACKAGE_NAME${NC}"
    else
      echo -e "  ${RED}❌ Package name incorrect: $PACKAGE_NAME (expected: @mmshark/${layer}-layer)${NC}"
      ((ERRORS++))
    fi

    # Verify version
    VERSION=$(node -p "require('./$LAYER_PATH/package.json').version" 2>/dev/null)
    if [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+ ]]; then
      echo -e "  ${GREEN}✅ Valid version: $VERSION${NC}"
    else
      echo -e "  ${RED}❌ Invalid version: $VERSION${NC}"
      ((ERRORS++))
    fi

    # Verify publishConfig
    PUBLISH_CONFIG=$(node -p "JSON.stringify(require('./$LAYER_PATH/package.json').publishConfig || {})" 2>/dev/null)
    if [[ $PUBLISH_CONFIG == *"npm.pkg.github.com"* ]]; then
      echo -e "  ${GREEN}✅ publishConfig configured${NC}"
    else
      echo -e "  ${RED}❌ publishConfig missing or incorrect${NC}"
      ((ERRORS++))
    fi
  fi

  # Check nuxt.config.ts
  if [ ! -f "$LAYER_PATH/nuxt.config.ts" ]; then
    echo -e "  ${YELLOW}⚠️  nuxt.config.ts missing${NC}"
    ((WARNINGS++))
  else
    echo -e "  ${GREEN}✅ nuxt.config.ts exists${NC}"
  fi

  # Check README.md
  if [ ! -f "$LAYER_PATH/README.md" ]; then
    echo -e "  ${YELLOW}⚠️  README.md missing (recommended)${NC}"
    ((WARNINGS++))
  else
    echo -e "  ${GREEN}✅ README.md exists${NC}"
  fi

  echo ""
done

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Verification Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Layers checked: ${#LAYERS[@]}"
echo -e "${RED}Errors: $ERRORS${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✨ All layers are correctly configured!${NC}"
  echo ""
  echo "📝 Next steps:"
  echo "   1. Configure GitHub authentication:"
  echo "      echo '@mmshark:registry=https://npm.pkg.github.com' >> ~/.npmrc"
  echo "      echo '//npm.pkg.github.com/:_authToken=\${GITHUB_TOKEN}' >> ~/.npmrc"
  echo ""
  echo "   2. Set your GitHub token:"
  echo "      export GITHUB_TOKEN=your_github_token_here"
  echo ""
  echo "   3. Publish a single layer:"
  echo "      ./scripts/publish-layer.sh auth patch"
  echo ""
  echo "   4. Or publish all layers:"
  echo "      ./scripts/publish-all-layers.sh patch"
  exit 0
else
  echo -e "${RED}❌ Found $ERRORS error(s) and $WARNINGS warning(s)${NC}"
  echo ""
  echo "Please fix the errors before publishing."
  if [ $WARNINGS -gt 0 ]; then
    echo "Warnings should also be addressed for better documentation."
  fi
  exit 1
fi
