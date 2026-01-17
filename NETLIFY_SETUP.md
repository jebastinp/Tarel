# Netlify Deployment Setup

## Two Separate Netlify Sites

### USER SITE (extraordinary-biscotti-66a562.netlify.app)
- **Source**: `frontend/` folder (Next.js app)
- **Config**: Uses `netlify.toml` (default)
- **Build Command**: `npm run build`
- **Publish Directory**: `frontend/.next`

### ADMIN SITE (magical-swan-a42f1b.netlify.app)
- **Source**: `admin-dashboard/` folder (Vite app)
- **Config**: Should use `netlify-admin.toml`
- **Build Command**: `npm run build`
- **Publish Directory**: `admin-dashboard/dist`

## Setup Instructions for Admin Site

Go to Netlify Dashboard → Admin Site (magical-swan-a42f1b) → Site Configuration → Build & Deploy:

1. **Base directory**: `admin-dashboard`
2. **Build command**: `npm run build`
3. **Publish directory**: `admin-dashboard/dist`
4. **Environment variables**:
   - `VITE_API_BASE`: `https://tarel-backend.onrender.com/api`

Alternatively, you can specify the config file:
- In **Build settings**, under **Advanced**, add:
  - **Config file path**: `netlify-admin.toml`

## Note
Since both sites deploy from the same repository, each site needs to be configured differently in the Netlify UI to use the correct base directory and build settings.
