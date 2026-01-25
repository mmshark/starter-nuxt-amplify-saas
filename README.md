# Nuxt Amplify SaaS Starter

A modern full-stack SaaS application built with Nuxt 4, AWS Amplify Gen2, and Nuxt UI Pro. This project provides a complete foundation for building scalable SaaS applications with authentication, dashboard, and AWS backend integration.

## 🏗️ Architecture

This is a **monorepo** containing:

### Applications
- **`apps/backend/`** - AWS Amplify Gen2 backend (Auth, API, Database)
- **`apps/saas/`** - Main SaaS dashboard application (Nuxt 4 SSR)
- **`apps/landing/`** - Marketing landing page (Nuxt 4 SSG)

### Nuxt Layers

**Foundation Layers** (Infrastructure & UI):
- **`layers/amplify/`** - AWS Amplify integration layer (GraphQL client + storage utilities)
- **`layers/uix/`** - UI foundation layer (Nuxt UI Pro + Tailwind + design system)
- **`layers/i18n/`** - Internationalization layer (multi-language support + formatting)

**Feature Layers** (Business Capabilities):
- **`layers/auth/`** - Authentication layer (AWS Cognito + middleware + session management)
- **`layers/billing/`** - Stripe billing integration (subscriptions + customer portal + webhooks)
- **`layers/workspaces/`** - Multi-tenant workspace management (team collaboration + invitations)
- **`layers/entitlements/`** - Authorization & RBAC (role-based access control + feature gating)

**Meta-Layer** (Complete Application Shell):
- **`layers/saas/`** - SaaS meta-layer (complete dashboard app composing all layers + navigation + layouts)

**Development Layers**:
- **`layers/debug/`** - Development debugging tools and utilities

**Layer Architecture**: Foundation → Feature Layers → Meta-Layer (SaaS)

## ✨ Features

- **🔐 Authentication**: Complete auth flow (signup, signin, password reset, email verification) with AWS Cognito
- **💳 Billing & Subscriptions**: Stripe integration with portal-first approach, subscription management, and webhooks
- **👥 Multi-Tenancy**: Workspace management with team collaboration, member invitations, and role-based access
- **🔐 Authorization**: RBAC system with role-based access control and feature entitlements
- **🌐 Internationalization**: Multi-language support with auto-formatting for dates/currency
- **📊 Dashboard**: Professional dashboard with SaaS meta-layer (layouts, navigation, pages out-of-the-box)
- **⚙️ Navigation System**: 3-layer configuration architecture (layer defaults + app customization + component consumption)
- **🎨 UI Components**: Built with Nuxt UI Pro (v4) for consistent, modern design
- **📱 Responsive**: Mobile-first design with adaptive layouts for all devices
- **⚡ Performance**: Optimized with Nuxt 4's latest performance improvements
- **🔧 Configuration-Driven**: Customize via `app.config.ts` without modifying layer code
- **🏗️ Modular Architecture**: Layer-based system (foundation → features → meta-layer) for scalable code
- **☁️ AWS Ready**: Full AWS Amplify Gen2 integration with Cognito, DynamoDB, and AppSync GraphQL
- **🛠️ Debug Tools**: Comprehensive development and debugging utilities
- **🌙 Dark Mode**: Full dark mode support via Nuxt UI theming
- **♿ Accessible**: WCAG 2.1 AA compliant components and pages

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** >= 18.0.0 (recommended: 18+ for Nuxt 4 compatibility)
- **pnpm** 10.13.1+ (installed automatically via corepack)
- **AWS CLI** configured with appropriate credentials
- **AWS Account** with Amplify access
- **Stripe Account** for billing integration (optional)

## 🔧 Setting up AWS Connection

Before you can deploy and run the backend, you need to connect your project to your AWS account.

### Step 1: AWS Account Setup

1. **Create an AWS Account** if you don't have one: https://aws.amazon.com/
2. **Ensure you have permissions** for the following AWS services:
   - AWS Amplify
   - Amazon Cognito
   - Amazon DynamoDB
   - AWS AppSync (GraphQL)
   - AWS Lambda

### Step 2: Install AWS CLI

Install the AWS Command Line Interface:

```bash
# macOS (using Homebrew)
brew install awscli

# macOS/Linux (using pip)
pip3 install awscli

# Windows (using MSI installer)
# Download from: https://aws.amazon.com/cli/
```

### Step 3: Configure AWS CLI

Configure your AWS credentials:

```bash
# Run the configuration command
aws configure

# You'll be prompted for:
# AWS Access Key ID: [Enter your access key]
# AWS Secret Access Key: [Enter your secret key]
# Default region name: [Enter your preferred region, e.g., us-east-1, eu-west-1]
# Default output format: [Press enter for default, or type 'json']
```

**To get your AWS credentials:**

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **IAM** → **Users** → **Your Username**
3. Go to **Security credentials** tab
4. Click **Create access key**
5. Choose **Command Line Interface (CLI)**
6. Copy the **Access Key ID** and **Secret Access Key**

### Step 4: Verify Connection

Test your AWS connection:

```bash
# This should return your account information
aws sts get-caller-identity
```

**Expected output:**
```json
{
    "UserId": "AIDACKCEVSQ6C2EXAMPLE",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

### Step 5: Optional - Project-Specific Configuration

For better organization, you can use AWS profiles:

```bash
# Configure a profile for this project
aws configure --profile my-saas-project

# Use the profile in commands
AWS_PROFILE=my-saas-project pnpm backend:sandbox:init
```

Or create a `.env.local` file in your project root:

```bash
# .env.local
AWS_PROFILE=my-saas-project
AWS_REGION=us-east-1
```

### Troubleshooting

**"Unable to locate credentials" error:**
- Make sure you ran `aws configure` and entered valid credentials
- Check that your access key has the necessary permissions

**"Access Denied" errors:**
- Your AWS user needs permissions for Amplify, Cognito, DynamoDB, and AppSync
- Contact your AWS administrator if working in an organization

**Region mismatch issues:**
- Ensure you're using the same region consistently
- Check your default region with: `aws configure get region`

**Invalid credentials:**
- Verify your access keys are correct and active
- You can regenerate keys in the AWS Console under IAM → Users

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

This section covers deploying the entire stack to AWS production environment. The architecture consists of three applications that deploy from the same Git repository:

- **Backend**: AWS Amplify Gen2 (Lambda, Cognito, DynamoDB, AppSync)
- **SaaS Dashboard**: Nuxt 4 SSR application
- **Landing Page**: Nuxt 4 SSG marketing site

### Prerequisites

Before deploying to production:

- ✅ AWS account with Amplify permissions configured
- ✅ Git repository pushed to GitHub, GitLab, or Bitbucket
- ✅ Stripe production account with API keys
- ✅ Domain names ready (optional)
- ✅ All development testing completed

### Deployment Overview

Each application uses its own `amplify.yml` configuration file to build the correct part of the monorepo from the same Git repository.

### Step 1: Deploy Backend (AWS Amplify Gen2)

#### Create Backend Amplify App

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click **"Create new app"** → **"Deploy from Git"**
3. **Connect Repository**:
   - Choose your Git provider (GitHub/GitLab/Bitbucket)
   - Select your repository
   - Authorize AWS Amplify access (if needed)
4. **Configure Build**:
   - **Branch**: `main` (or your production branch)
   - **Check "My app is a monorepo"** (root directory is `apps/backend`)
   - **App name**: `your-project-backend`
   - **Build settings**: Amplify will auto-detect `apps/backend/amplify.yml`
   - **Check "My monorepo uses Amplify Gen2 Backend"**
   - **Create and use a new service role**

#### Configure Backend Secrets

In the Amplify Console, go to **App Settings** → **Secrets** and add:

```bash
STRIPE_SECRET_KEY=sk_live_...    # Your Stripe production secret key
```

#### Deploy Backend

Click **"Save and deploy"**. The backend will deploy automatically using the configuration in `apps/backend/amplify.yml`.

**Deployment Process**:
- AWS resources (Cognito, DynamoDB, AppSync, Lambda) are created
- Post-confirmation trigger is deployed with billing integration
- GraphQL API and authentication are configured

### Step 2: Deploy SaaS Dashboard Application

#### Create SaaS Amplify App

1. In AWS Amplify Console, click **"Create new app"** → **"Deploy from Git"**
2. **Connect Repository**: Select the **same repository** as the backend
3. **Configure Build**:
   - **Branch**: `main` (same as backend)
   - **Check "My app is a monorepo"** (root directory is `apps/saas`)
   - **App name**: `your-project-saas`
   - **Build settings**: Amplify will auto-detect `apps/saas/amplify.yml`
   - **Check "My monorepo uses Amplify Gen2 Backend"**
   - **Select "Use an existing service role"** (the one created for backend)

#### Configure SaaS Secrets and Environment Variables

**In App Settings → Secrets, add:**

```bash
# Sensitive Stripe credentials
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**In App Settings → Environment Variables, add:**

```bash
# Public Stripe configuration
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Site Configuration
NUXT_PUBLIC_SITE_URL=https://your-saas-domain.com

# Backend Reference (if needed)
BACKEND_APP_ID=your-backend-app-id
```

#### Deploy SaaS App

Click **"Save and deploy"**. The SaaS application will build and deploy automatically.

### Step 3: Deploy Landing Page

#### Create Landing Amplify App

1. In AWS Amplify Console, click **"Create new app"** → **"Deploy from Git"**
2. **Connect Repository**: Select the **same repository** again
3. **Configure Build**:
   - **Branch**: `main` (same branch)
   - **Check "My app is a monorepo"** (root directory is `apps/landing`)
   - **App name**: `your-project-landing`
   - **Build settings**: Amplify will auto-detect `apps/landing/amplify.yml`
   - **Check "My monorepo uses Amplify Gen2 Backend"**
   - **Select "Use an existing service role"** (the one created for backend)

#### Configure Landing Environment Variables

In **App Settings** → **Environment Variables**, add:

```bash
# Site Configuration
NUXT_PUBLIC_SITE_URL=https://your-landing-domain.com

# Backend Reference (if needed)
BACKEND_APP_ID=your-backend-app-id
```

#### Deploy Landing App

Click **"Save and deploy"**. The landing page will build and deploy as a static site.

### Step 4: Post-Deployment Configuration

#### Configure Stripe Webhooks

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. **Endpoint URL**: `https://your-saas-domain.com/api/billing/webhook`
4. **Events to send**:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. **Copy webhook secret** and update `STRIPE_WEBHOOK_SECRET` environment variable

#### Setup Custom Domains (Optional)

For each Amplify app:

1. Go to **Domain Management** in the app settings
2. Click **"Add domain"**
3. **Configure DNS**:
   - **AWS Route 53**: Automatic configuration
   - **External DNS**: Add provided CNAME records
4. **SSL Certificate**: Automatically provisioned by AWS

**Recommended domains**:
- Backend: Not needed (API access only)
- SaaS: `app.yourdomain.com` or `dashboard.yourdomain.com`
- Landing: `yourdomain.com` or `www.yourdomain.com`

### Step 5: Verification & Testing

#### Backend Verification

```bash
# Check backend deployment status
aws amplify get-app --app-id your-backend-app-id --region your-region

# Test GraphQL API (replace with your API endpoint)
curl -X POST https://your-api-id.appsync-api.region.amazonaws.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

#### SaaS App Verification

1. **Authentication Flow**:
   - Navigate to your SaaS domain
   - Test user registration and email verification
   - Confirm post-confirmation trigger creates free plan
   - Test login and dashboard access

2. **Billing Integration**:
   - Test Stripe Customer Portal access
   - Verify plan switching functionality
   - Confirm webhook delivery in Stripe Dashboard

#### Landing Page Verification

1. Navigate to landing domain
2. Verify static site generation and performance
3. Test any contact forms or lead capture

### Secrets and Environment Variables Reference

#### Backend App Configuration

**Secrets:**
```bash
STRIPE_SECRET_KEY=sk_live_...           # Required for billing
```

#### SaaS App Configuration

**Secrets:**
```bash
STRIPE_SECRET_KEY=sk_live_...           # Server-side billing operations
STRIPE_WEBHOOK_SECRET=whsec_...         # Webhook signature verification
```

**Environment Variables:**
```bash
STRIPE_PUBLISHABLE_KEY=pk_live_...      # Client-side Stripe integration (public)
NUXT_PUBLIC_SITE_URL=https://app.yourdomain.com  # Public site URL
```

#### Landing App Environment Variables
```bash
NUXT_PUBLIC_SITE_URL=https://yourdomain.com  # Public site URL
```

### Deployment Troubleshooting

#### Common Issues

**Build Failures**:
- Check build logs in Amplify Console
- Verify all environment variables are set
- Ensure monorepo dependencies are correctly configured

**Backend Connection Issues**:
- Verify backend has deployed successfully first
- Check that `apps/saas/amplify.yml` generates outputs correctly
- Confirm GraphQL client code is generated

**Billing Integration Issues**:
- Verify all Stripe environment variables are production keys
- Check webhook endpoint is accessible
- Confirm webhook secret matches Stripe dashboard

**Performance Issues**:
- Landing page: Consider enabling caching in CloudFront
- SaaS app: Monitor performance with AWS X-Ray integration
- Database: Review DynamoDB capacity settings

### Continuous Deployment

Once configured, deployments happen automatically:

1. **Push to Git** → All three apps rebuild automatically
2. **Backend Changes** → Only backend redeploys (optimized)
3. **Frontend Changes** → Frontend apps rebuild with latest backend config
4. **Environment Variables** → Can be updated without redeployment

This setup provides a fully automated, scalable, and maintainable production deployment for your SaaS application.

## ⚡ AWS Amplify Gen2 Deployment Configuration

**Important**: These are critical configuration steps to ensure successful deployment with this monorepo structure and Nuxt 4.0.0.

### Backend Deployment Configuration

When deploying the **Backend** application (`apps/backend/`):

1. **✅ Enable "My monorepo uses Amplify Gen2 Backend"** checkbox
2. **✅ Select "Create and use a new service role"**
   - This creates the necessary IAM role with proper permissions
   - The role will be used for backend resource management
   - Grant permissions for CloudFormation, Cognito, DynamoDB, AppSync

### Frontend Deployment Configuration

When deploying **SaaS** (`apps/saas/`) or **Landing** (`apps/landing/`) applications:

1. **✅ Enable "My monorepo uses Amplify Gen2 Backend"** checkbox
2. **✅ Select "Use an existing service role"**
   - Choose the service role created during backend deployment
   - This ensures consistent permissions across all apps
   - Allows frontend apps to access backend configuration

### Node.js Version Override (Required)

**Critical**: Both SaaS and Landing apps require Node.js 22 to resolve native module binding issues.

In each frontend app's build configuration:

1. Go to **App Settings** → **Build settings** → **Advanced settings**
2. Under **Package version overrides**, add:
   ```
   Package: Node
   Version: 22
   ```

**Why Node.js 22 is required**:
- Nuxt 4.0.0 uses `oxc-parser` for JavaScript/TypeScript parsing
- `oxc-parser` requires Node.js 20+ for proper native binding support
- Node.js 22 provides the most stable native module compatibility
- Resolves `Cannot find module '@oxc-parser/binding-linux-x64-gnu'` errors

### Service Role Sharing

The same service role created for the backend should be used across all apps in the monorepo:

```
Backend App:     Create new service role (e.g., "AmplifyServiceRole-MyProject")
SaaS App:        Use existing role → "AmplifyServiceRole-MyProject"
Landing App:     Use existing role → "AmplifyServiceRole-MyProject"
```

This ensures:
- Consistent permissions across the entire stack
- Proper access to CloudFormation resources
- Successful `amplify:generate-outputs` command execution
- Seamless integration between backend and frontend apps

### Troubleshooting Deployment Issues

**CloudFormation Permission Errors**:
- Verify the service role has `cloudformation:GetTemplateSummary` permissions
- Ensure all apps use the same service role created for the backend
- Check that "My monorepo uses Amplify Gen2 Backend" is enabled

**oxc-parser Native Binding Errors**:
- Confirm Node.js version override is set to 22
- Clear build cache and retry deployment
- Verify the override is applied to the correct app (SaaS/Landing)

**Backend Association Issues**:
- Ensure backend deploys successfully before frontend apps
- Verify `BACKEND_APP_ID` environment variable is set correctly
- Check that the service role has access to the backend resources

## 📦 Using Published Layers in Your Project

All layers in this repository are published as npm packages to GitHub Packages, allowing you to use them in your own Nuxt projects without copying code.

### Quick Start

```bash
# Install the complete SaaS meta-layer (includes all dependencies)
pnpm add -D @mmshark/saas-layer

# Or install individual layers
pnpm add -D @mmshark/amplify-layer
pnpm add -D @mmshark/auth-layer
pnpm add -D @mmshark/billing-layer
```

### Authentication Setup

Configure npm to authenticate with GitHub Packages:

```bash
# Add to ~/.npmrc
echo "@mmshark:registry=https://npm.pkg.github.com" >> ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> ~/.npmrc
```

You'll need a GitHub Personal Access Token with `read:packages` scope. [Generate one here](https://github.com/settings/tokens).

### Configuration in Your Project

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@mmshark/saas-layer'  // Complete SaaS application shell
  ],

  // Or compose individual layers
  extends: [
    '@mmshark/amplify-layer',
    '@mmshark/uix-layer',
    '@mmshark/auth-layer',
  ]
})
```

For detailed installation instructions, available layers, and usage examples, see [Using Published Layers Guide](doc/guides/using-published-layers.md).

## 📚 Documentation

This project includes comprehensive documentation for developers and AI agents:

### Core Documentation
- **[AGENTS.md](AGENTS.md)** - Complete guide for AI agents and developers working with this repository
- **Project README** - This file, for project overview and setup
- **[Using Published Layers](doc/guides/using-published-layers.md)** - Guide for consuming layers in external projects

### Layer-Specific Documentation
Each layer includes detailed documentation with specific implementation details:

| Layer | Documentation | Purpose |
|-------|--------------|---------|
| **SaaS** | [layers/saas/README.md](layers/saas/README.md) | Meta-layer composing complete SaaS application shell |
| **Amplify** | [layers/amplify/README.md](layers/amplify/README.md) | AWS integration, GraphQL client, storage utilities |
| **UIX** | [layers/uix/README.md](layers/uix/README.md) | UI foundation, design system, Nuxt UI Pro integration |
| **Auth** | [layers/auth/README.md](layers/auth/README.md) | Authentication system, AWS Cognito, middleware, session management |
| **Billing** | [layers/billing/README.md](layers/billing/README.md) | Stripe integration, subscriptions, portal-first approach |
| **Workspaces** | [layers/workspaces/README.md](layers/workspaces/README.md) | Multi-tenant workspace management, team collaboration |
| **Entitlements** | [layers/entitlements/README.md](layers/entitlements/README.md) | Authorization, RBAC, feature gating |
| **I18n** | [layers/i18n/README.md](layers/i18n/README.md) | Internationalization, translations, formatting |
| **Debug** | [layers/debug/README.md](layers/debug/README.md) | Development tools, debugging utilities |

### When to Use Each Documentation
- **Quick Reference**: Use this README for setup and overview
- **Using Published Layers**: See the [published layers guide](doc/guides/using-published-layers.md) for consuming layers externally
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
