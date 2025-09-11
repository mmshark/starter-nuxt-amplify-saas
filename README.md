# Nuxt Amplify SaaS Starter

A modern full-stack SaaS application built with Nuxt 4, AWS Amplify Gen2, and Nuxt UI Pro. This project provides a complete foundation for building scalable SaaS applications with authentication, dashboard, and AWS backend integration.

## 🏗️ Architecture

This is a **monorepo** containing:

### Applications
- **`apps/backend/`** - AWS Amplify Gen2 backend (Auth, API, Database)
- **`apps/saas/`** - Main SaaS dashboard application (Nuxt 4 SSR)
- **`apps/landing/`** - Marketing landing page (Nuxt 4 SSG)

### Nuxt Layers
- **`layers/uix/`** - UI foundation layer (Nuxt UI Pro + Tailwind + design system)
- **`layers/amplify/`** - AWS Amplify integration layer (GraphQL client + storage)
- **`layers/auth/`** - Authentication layer (AWS Cognito + middleware + components)
- **`layers/billing/`** - Stripe billing integration (subscriptions + webhooks + API)
- **`layers/i18n/`** - Internationalization layer (multi-language support + formatting)
- **`layers/debug/`** - Development debugging tools and utilities

**Layer Dependencies**: `uix` → `amplify` → `auth` → `billing` → `debug` → `i18n`

## ✨ Features

- **🔐 Authentication**: Complete auth flow (signup, signin, password reset) with AWS Cognito
- **💳 Billing & Subscriptions**: Stripe integration with subscription management and customer portal
- **🌐 Internationalization**: Multi-language support with auto-formatting for dates/currency
- **📊 Dashboard**: Professional dashboard interface with collapsible sidebar and dark mode
- **🎨 UI Components**: Built with Nuxt UI Pro for consistent, beautiful design
- **📱 Responsive**: Mobile-first design that works on all devices
- **⚡ Performance**: Optimized with Nuxt 4's latest performance improvements
- **🔧 Configurable**: Easy-to-customize navigation, theming, and billing plans
- **🏗️ Modular Architecture**: Layer-based system for scalable, maintainable code
- **☁️ AWS Ready**: Full AWS Amplify integration with DynamoDB and GraphQL API
- **🛠️ Debug Tools**: Comprehensive development and debugging utilities

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** >= 18.0.0 (recommended: 18+ for Nuxt 4 compatibility)
- **pnpm** 10.13.1+ (installed automatically via corepack)
- **AWS CLI** configured with appropriate credentials
- **AWS Account** with Amplify access
- **Stripe Account** for billing integration (optional)

## 🚀 Local Development Setup

### Step 1: Clone and Install

```bash
git clone <your-repo-url>
cd starter-nuxt-amplify-saas

# Enable corepack for pnpm
corepack enable

# Install all dependencies
pnpm install
```

### Step 2: Initialize AWS Amplify Sandbox

The sandbox creates a temporary AWS environment for development:

```bash
# Initialize and deploy the backend to AWS sandbox
pnpm backend:sandbox:init
```

This command will:
- Deploy AWS resources (Cognito, DynamoDB, AppSync) to your AWS account
- Create a sandbox environment isolated from production
- Generate `amplify_outputs.json` with connection details

### Step 3: Generate Amplify Configuration

```bash
# Generate Amplify outputs for frontend
pnpm amplify:sandbox:generate-outputs

# Generate GraphQL client code and types
pnpm amplify:sandbox:generate-graphql-client-code
```

### Step 4: Start Development Server

```bash
# Start the SaaS application
pnpm saas:dev

# OR start the landing page
pnpm landing:dev
```

Your applications will be available at:
- **SaaS Dashboard**: http://localhost:3000
- **Landing Page**: http://localhost:3001

### Step 5: Test Authentication

1. Navigate to http://localhost:3000
2. Click "Sign Up" to create a test account
3. Complete the email verification process
4. Sign in and explore the dashboard

### Step 6: Configure Stripe Integration (Optional)

If you want to test billing functionality:

#### A. Setup Stripe Account

1. Create a [Stripe account](https://stripe.com) if you don't have one
2. Install [Stripe CLI](https://stripe.com/docs/stripe-cli):
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Or download from https://github.com/stripe/stripe-cli/releases
   ```
3. Login to your Stripe account:
   ```bash
   stripe login
   ```

#### B. Configure Environment Variables

Create a `.env` file in `apps/saas/`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

# Optional: Stripe Webhook Endpoint Secret (for webhooks)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

#### C. Sync Billing Plans to Stripe

The application includes predefined billing plans that need to be synchronized with your Stripe account:

```bash
# Dry run to see what will be created
pnpm billing:stripe:dry-run

# Actually create products and prices in Stripe
pnpm billing:stripe:sync
```

This will:
- Create products in Stripe for each plan (Free, Pro, Enterprise)
- Generate price objects for subscriptions
- Update `apps/saas/app/billing-plans.json` with the new Stripe price IDs

#### D. Test Billing (Optional)

1. Start webhook listener in a separate terminal:
   ```bash
   pnpm billing:stripe:listen
   ```
2. Access the debug page at http://localhost:3000/debug
3. Use the Billing section to test subscription flows

### 🛠️ Development and Debug Tools

Access comprehensive debugging tools at http://localhost:3000/debug:

- **Authentication Debug**: View user state, session info, and test auth flows
- **Billing Debug**: Test subscription creation, portal access, and payment flows
- **API Testing**: Test backend endpoints and GraphQL operations
- **Environment Inspection**: View configuration and runtime information

### 🧹 Cleanup Sandbox

When you're done developing:

```bash
pnpm backend:sandbox:delete
```

## 🌐 Production Deployment

### Method 1: AWS Amplify Console (Recommended)

#### Step 1: Create Amplify App for Backend

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click "Create new app" → "Deploy without Git provider"
3. Give it a name like `your-project-backend`
4. Note the **App ID** (you'll need it later)

#### Step 2: Deploy Backend

```bash
# Set environment variables
export AWS_BRANCH=main  # or your deployment branch
export AWS_APP_ID=your-amplify-backend-app-id

# Deploy backend to production
cd apps/backend
pnpm run deploy
```

#### Step 3: Create Amplify App for Frontend

1. In AWS Amplify Console, click "Create new app" → "Deploy from Git"
2. Connect your Git repository
3. Select your main branch
4. **Build settings**: Amplify will auto-detect the `amplify.yml` in `apps/saas/`
5. **Environment variables**: Set any required variables (see below)
6. Deploy the app

#### Step 4: Configure Environment Variables

In your Amplify frontend app settings, add:

```bash
# Required for build process
AWS_BRANCH=main
BACKEND_APP_ID=your-amplify-backend-app-id

# Optional: Custom domain settings
NUXT_PUBLIC_SITE_URL=https://your-domain.com
```

### Method 2: Manual Build & Deploy

If you prefer manual deployment:

```bash
# Build the application
cd apps/saas
pnpm run build

# Deploy the .amplify-hosting directory to your hosting provider
# The build output will be in .amplify-hosting/
```

## 📚 Documentation

This project includes comprehensive documentation for developers and AI agents:

### Core Documentation
- **[AGENTS.md](AGENTS.md)** - Complete guide for AI agents and developers working with this repository
- **Project README** - This file, for project overview and setup

### Layer-Specific Documentation
Each layer includes detailed documentation with specific implementation details:

| Layer | Documentation | Purpose |
|-------|--------------|---------|
| **UIX** | [layers/uix/README.md](layers/uix/README.md) | UI foundation, design system, Nuxt UI Pro integration |
| **Amplify** | [layers/amplify/README.md](layers/amplify/README.md) | AWS integration, GraphQL client, storage utilities |
| **Auth** | [layers/auth/README.md](layers/auth/README.md) | Authentication system, AWS Cognito, middleware |
| **Billing** | [layers/billing/README.md](layers/billing/README.md) | Stripe integration, subscriptions, payment processing |
| **I18n** | [layers/i18n/README.md](layers/i18n/README.md) | Internationalization, translations, formatting |
| **Debug** | [layers/debug/README.md](layers/debug/README.md) | Development tools, debugging utilities |

### When to Use Each Documentation
- **Quick Reference**: Use this README for setup and overview
- **Development Guidance**: Use AGENTS.md for architectural decisions and patterns
- **Implementation Details**: Use layer READMEs for specific component usage and API details
- **Troubleshooting**: Check layer-specific READMEs for detailed troubleshooting

## ⚙️ Configuration

### Dashboard Menu Configuration

Customize the navigation menu in `apps/saas/app/app.config.ts`:

```typescript
export default defineAppConfig({
  ui: {
    sidebar: {
      main: [
        // Main navigation group
        [{
          label: 'Dashboard',
          icon: 'i-lucide-home',
          to: '/dashboard'
        }, {
          label: 'Analytics',
          icon: 'i-lucide-bar-chart',
          to: '/analytics',
          badge: 'New'
        }],
        // Settings group with children
        [{
          label: 'Settings',
          icon: 'i-lucide-settings',
          children: [{
            label: 'Profile',
            to: '/settings/profile'
          }, {
            label: 'Billing',
            to: '/settings/billing',
            badge: 'Pro'
          }, {
            label: 'Team',
            to: '/settings/team'
          }]
        }],
        // External links
        [{
          label: 'Help & Support',
          icon: 'i-lucide-help-circle',
          to: 'https://your-support-url.com',
          target: '_blank'
        }]
      ]
    }
  }
})
```

**Navigation Features**:
- **Icons**: Use Lucide icons with `i-lucide-[name]` format
- **Badges**: Add badges to highlight new features or plan requirements
- **Groups**: Separate navigation items into logical groups (arrays within main array)
- **Children**: Create expandable submenus with nested navigation
- **External Links**: Link to external resources with `target: '_blank'`

### Theme Configuration

Customize colors and themes in `layers/uix/app.config.ts`:

```typescript
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      gray: 'slate'
    }
  }
})
```

### Billing Plans Configuration

Billing plans are defined in `apps/saas/app/billing-plans.json`:

```json
[
  {
    "id": "free",
    "name": "Free",
    "description": "Perfect for getting started",
    "price": 0,
    "interval": "month",
    "stripePriceId": "",
    "features": [
      "1 project",
      "1 team member",
      "1GB storage",
      "Basic support"
    ],
    "limits": {
      "projects": 1,
      "users": 1,
      "storage": "1GB",
      "apiRequests": 1000
    }
  }
]
```

To add or modify plans:
1. Edit `apps/saas/app/billing-plans.json`
2. Run `pnpm billing:stripe:sync` to update Stripe
3. Restart your development server

### AWS Backend Configuration

Backend resources are defined in:
- **Authentication**: `apps/backend/amplify/auth/resource.ts`
- **Database**: `apps/backend/amplify/data/resource.ts`
- **Main config**: `apps/backend/amplify/backend.ts`

## 🛠️ Available Scripts

From the project root:

```bash
# Backend commands
pnpm backend:sandbox:init        # Initialize development sandbox
pnpm backend:sandbox:delete      # Delete development sandbox

# Generate Amplify configuration
pnpm amplify:sandbox:generate-outputs           # Generate outputs for sandbox
pnpm amplify:sandbox:generate-graphql-client-code  # Generate GraphQL types
pnpm amplify:generate-outputs                   # Generate outputs for production
pnpm amplify:generate-graphql-client-code       # Generate GraphQL types for production

# Frontend development
pnpm saas:dev                    # Start SaaS app development
pnpm saas:build                  # Build SaaS app for production  
pnpm saas:typecheck              # Run TypeScript type checking
pnpm landing:dev                 # Start landing page development

# Billing & Stripe integration
pnpm billing:stripe:sync         # Sync billing plans to Stripe
pnpm billing:stripe:dry-run      # Preview what will be synced (no changes)
pnpm billing:stripe:listen       # Listen for Stripe webhooks
```

From individual apps:

```bash
# In apps/saas/
pnpm dev                         # Development server
pnpm build                       # Production build
pnpm preview                     # Preview production build

# In apps/backend/
pnpm sandbox:init                # Initialize sandbox
pnpm deploy                      # Deploy to production
```

## 🔧 Troubleshooting

### Common Issues

**"Cannot read properties of undefined (reading 'navigation')"**
- Make sure `app.config.ts` is in the correct location: `apps/saas/app/app.config.ts`
- Restart your development server after config changes
- Check the navigation structure follows the correct format (see Configuration section)

**AWS Authentication Errors**
- Ensure your AWS CLI is configured: `aws configure`
- Check that your AWS credentials have Amplify permissions
- Verify the `amplify_outputs.json` is generated and up-to-date
- For detailed auth troubleshooting, see [layers/auth/README.md](layers/auth/README.md)

**Build Failures**
- Clear node_modules: `rm -rf node_modules && pnpm install`
- Clear Nuxt cache: `pnpm nuxt cleanup`
- Regenerate Amplify files: `pnpm amplify:sandbox:generate-outputs`
- Run type checking: `pnpm saas:typecheck`
- For layer-specific build issues, check respective layer README

**Deployment Issues**
- Ensure environment variables are set correctly
- Check that the backend is deployed before the frontend
- Verify the `amplify.yml` build configuration
- For AWS deployment specifics, see [layers/amplify/README.md](layers/amplify/README.md)

**Stripe Integration Issues**
- Verify Stripe API keys are correctly set in `.env`
- Check that you're using test keys for development
- Ensure products exist in Stripe: `pnpm billing:stripe:sync`
- For webhooks: Check that webhook listener is running: `pnpm billing:stripe:listen`
- Verify Stripe CLI is installed and logged in: `stripe login`
- For detailed billing troubleshooting, see [layers/billing/README.md](layers/billing/README.md)

**UI/Component Issues**
- Check Nuxt UI Pro documentation: https://ui.nuxt.com/pro
- For design system issues, see [layers/uix/README.md](layers/uix/README.md)
- Use debug tools at `/debug` for component state inspection

### Debug Tools and Resources

- **Debug Page**: Access http://localhost:3000/debug for comprehensive debugging tools
- **Layer Documentation**: Check specific layer README files for detailed troubleshooting
- **AGENTS.md**: Reference for architectural decisions and development patterns

### Environment Variables Reference

**Backend Deployment:**
- `AWS_BRANCH` - Git branch name (e.g., 'main')
- `AWS_APP_ID` - Amplify backend app ID

**Frontend Build:**
- `BACKEND_APP_ID` - Reference to backend app
- `NUXT_PUBLIC_SITE_URL` - Your site URL (optional)

**Stripe Integration:**
- `STRIPE_SECRET_KEY` - Stripe secret key (server-side)
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (client-side)
- `STRIPE_WEBHOOK_SECRET` - Webhook endpoint secret (optional)

## 📚 Learn More

- [Nuxt 4 Documentation](https://nuxt.com/docs)
- [AWS Amplify Gen2 Documentation](https://docs.amplify.aws/)
- [Nuxt UI Pro Documentation](https://ui.nuxt.com/pro)
- [AWS Amplify Console](https://console.aws.amazon.com/amplify/)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see the LICENSE file for details.
