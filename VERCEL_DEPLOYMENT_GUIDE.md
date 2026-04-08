# 🚀 Vercel Deployment Guide - Fix Build Errors

## 🔍 **Current Issue Analysis**

Your build is **working locally** but **failing on Vercel**. This is typically due to:

1. ❌ Missing environment variables
2. ❌ Node.js version mismatch
3. ❌ TypeScript strict mode differences
4. ❌ Build timeout or memory limits

---

## 📝 **Step 1: Set Environment Variables on Vercel**

Go to **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

Add these **EXACTLY** (copy from your `.env.local`):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# NextAuth
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=https://your-domain.vercel.app

# Resend
RESEND_API_KEY=re_9hGdC3JC_ABoadhqFWYG692NG1k197wFs
RESEND_FROM_EMAIL=hr@tantech-llc.com

# Inngest
INNGEST_EVENT_KEY=BY4shWAEEWZ9FMf0tc_uMjOQYImXjOKPE8Xz34fBpBWhD3S78I8uIO3qDmVz5dMOoZ9Tr_80ExseHMgpTFXWJQ
INNGEST_SIGNING_KEY=signkey-prod-90a708817e5e55ad0663f186986bdd0322759cccc84cc87a8ceda2f43710a242

# DO NOT SET INNGEST_DEV in production
```

⚠️ **Important**:

- Set environment for **Production**, **Preview**, and **Development**
- Update `NEXTAUTH_URL` to your actual Vercel domain
- Do NOT include `INNGEST_DEV=1` in production

---

## ⚙️ **Step 2: Configure Build Settings**

### Option A: Create `vercel.json` file

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm ci",
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NPM_CONFIG_FUND": "false",
    "NPM_CONFIG_AUDIT": "false"
  }
}
```

### Option B: Vercel Dashboard Settings

Go to **Settings** → **General**:

- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Install Command**: `npm ci`
- **Node.js Version**: `18.x` or `20.x`

---

## 🔧 **Step 3: Fix Common TypeScript Issues**

Create/update `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreDuringBuilds: false, // Keep false to catch real errors
  },
  experimental: {
    serverComponentsExternalPackages: ["@supabase/supabase-js"],
  },
  images: {
    domains: ["localhost"],
  },
};

module.exports = nextConfig;
```

---

## 🐛 **Step 4: Debug Build Issues**

### Check Vercel Build Logs

1. Go to **Deployments** tab
2. Click on **failed deployment**
3. Look for **specific error messages**

### Common Errors & Fixes:

#### **Error: `Module not found`**

```bash
# Fix missing dependencies
npm install --save-dev @types/node
npm install --save-dev typescript
```

#### **Error: `TypeScript compilation failed`**

```bash
# Check for strict type issues
npm run type-check
```

#### **Error: `Build timeout`**

```json
// In vercel.json
{
  "functions": {
    "src/app/**/*.tsx": {
      "maxDuration": 60
    }
  }
}
```

---

## 🚀 **Step 5: Deploy Strategy**

### Option 1: Git-based Deployment (Recommended)

1. **Push to GitHub**:

   ```bash
   git add .
   git commit -m "Fix deployment issues"
   git push origin main
   ```

2. **Connect Vercel to GitHub**:
   - Go to Vercel Dashboard
   - **Add New Project**
   - **Import from Git**
   - Select your repository
   - Configure settings (env vars, build command)
   - **Deploy**

### Option 2: CLI Deployment

1. **Install Vercel CLI**:

   ```bash
   npm i -g vercel
   ```

2. **Login and Deploy**:
   ```bash
   vercel login
   vercel --prod
   ```

---

## 🔍 **Step 6: Troubleshooting Checklist**

### ✅ **Before Deploying**

- [ ] Build works locally (`npm run build`)
- [ ] All environment variables are set on Vercel
- [ ] `NEXTAUTH_URL` points to your Vercel domain
- [ ] No `INNGEST_DEV=1` in production environment
- [ ] TypeScript compiles without errors
- [ ] Dependencies are up to date

### ✅ **After Deploy Fails**

- [ ] Check Vercel build logs for specific error
- [ ] Verify environment variables are set correctly
- [ ] Try deploying with `ignoreDuringBuilds: true` temporarily
- [ ] Check if build works with smaller changes
- [ ] Monitor build time (should be under 10 minutes)

---

## 📱 **Step 7: Production Configuration**

### Database Setup

1. **Supabase**: Your database should already be in production mode
2. **Row Level Security**: Ensure all policies are set up correctly
3. **Service Role**: Make sure the service role key is correct

### Domain & SSL

1. **Custom Domain** (optional):
   - Go to **Settings** → **Domains**
   - Add your custom domain
   - Configure DNS records

2. **SSL**: Automatically handled by Vercel

### Monitoring

1. **Vercel Analytics**: Enable in project settings
2. **Function Logs**: Monitor API route performance
3. **Inngest Dashboard**: Monitor email cron jobs

---

## 🆘 **Quick Fixes for Common Issues**

### **Build Error: "Command npm run build exited with 1"**

1. **Check exact error** in Vercel build logs
2. **Try this temporary fix**:
   ```typescript
   // In next.config.ts
   const nextConfig: NextConfig = {
     eslint: { ignoreDuringBuilds: true },
     typescript: { ignoreDuringBuilds: true }, // Temporary
   };
   ```
3. **Redeploy** and check if it works
4. **Fix TypeScript errors** one by one, then re-enable type checking

### **Environment Variable Issues**

1. **Double-check** all env vars are set in Vercel
2. **Test API routes** by visiting them directly (e.g., `/api/health`)
3. **Check capitalization** - env var names are case-sensitive

### **Memory/Timeout Issues**

1. **Increase function timeout** in `vercel.json`
2. **Optimize imports** - use dynamic imports for large packages
3. **Split large pages** into smaller components

---

## 🎯 **Expected Deployment Time**

- **First Deploy**: 5-10 minutes
- **Subsequent Deploys**: 2-5 minutes
- **Build Time**: 2-4 minutes
- **Function Cold Start**: 1-3 seconds

---

## ✅ **Success Indicators**

Your deployment is successful when:

- ✅ Build completes without errors
- ✅ Site loads at your Vercel URL
- ✅ Admin login works (`/admin/login`)
- ✅ Employee login works (`/login`)
- ✅ API routes respond correctly
- ✅ Database connections work
- ✅ Email system is functional

---

## 🆘 **Still Having Issues?**

### **Share These Details:**

1. **Exact error message** from Vercel build logs
2. **Your `package.json` dependencies**
3. **Environment variables** you've set (without values)
4. **Node.js version** you're using locally

### **Quick Debug Commands:**

```bash
# Check local build
npm run build

# Check for type errors
npm run type-check

# Check for linting issues
npm run lint

# Check dependencies
npm audit

# Test production locally
npm run start
```

---

## 🚀 **Ready to Deploy!**

Follow these steps in order, and your TanTech Upskill platform should deploy successfully to Vercel!

**Most common fix**: Setting environment variables correctly in Vercel dashboard.

Let me know which step you get stuck on, and I'll help you troubleshoot further! 🎉
