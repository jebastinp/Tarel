# Product Image Upload Setup

## Overview
Your Tarel platform now supports product image uploads using **Cloudinary** - a free cloud storage service. This is necessary because Render's free tier has ephemeral storage (files are deleted when the server restarts).

## How It Works

### 1. Upload Process
- Admin goes to **Products** page in admin dashboard
- Clicks "Add/Edit Product"
- Clicks "Upload file" button
- Selects an image (max 5MB)
- Image is uploaded to Cloudinary
- Image URL is automatically saved to the product

### 2. Storage
- Images are stored in Cloudinary cloud storage
- Folder: `tarel/products/`
- Images are automatically optimized (max 800x800px, quality: auto)
- Images are served via CDN (fast worldwide)

## Setup Instructions

### Step 1: Create Free Cloudinary Account

1. Go to https://cloudinary.com/users/register_free
2. Sign up for a free account (provides 25GB storage, 25GB bandwidth/month)
3. After signup, you'll see your dashboard

### Step 2: Get Your Credentials

On the Cloudinary dashboard, you'll see:
- **Cloud Name**: e.g., `dxxxxxxxx`
- **API Key**: e.g., `123456789012345`
- **API Secret**: Click "Show" to reveal, e.g., `abcdefghijklmnop`

### Step 3: Add Environment Variables to Render

1. Go to https://dashboard.render.com
2. Click your **tarel-backend** service
3. Click **Environment** tab
4. Click **Add Environment Variable** button
5. Add these 4 variables:

| Key | Value | Example |
|-----|-------|---------|
| `CLOUDINARY_CLOUD_NAME` | Your cloud name | `dxxxxxxxx` |
| `CLOUDINARY_API_KEY` | Your API key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Your API secret | `abcdefghijklmnop` |
| `USE_CLOUDINARY` | `true` | `true` |

6. Click **Save Changes**

### Step 4: Deploy Changes

The code changes are ready. Just commit and push:

```bash
cd /Users/jebastin/Documents/tarel
git add .
git commit -m "feat: add Cloudinary image storage"
git push origin main
```

Render will automatically redeploy (takes 2-3 minutes).

## Using Image Upload

### Adding Images to Products

1. Login to admin: https://tarel-admin.netlify.app/admin/login
2. Go to **Products** page
3. Click **Edit** on any product (or create new product)
4. Scroll to "Image URL" section
5. Click **Upload file** button
6. Select an image from your computer
7. Wait for upload (you'll see "Image uploaded and linked to this product")
8. Click **Save** to save the product
9. The image will now appear on the product!

### Image Requirements

- **Formats**: JPG, PNG, WEBP, GIF
- **Max Size**: 5 MB per image
- **Recommended**: Square images (e.g., 800x800px) work best
- **Auto-optimization**: Cloudinary will resize and compress images automatically

## Viewing Images

After uploading:
- **Admin Dashboard**: You'll see a preview thumbnail
- **User Frontend**: Images appear on product cards
- **Image URL**: Stored as `https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/...`

## Free Tier Limits

Cloudinary free account includes:
- **25 GB** storage
- **25 GB** bandwidth per month
- **25 credits** per month (transformations)
- Unlimited images

For a small fish shop, this is more than enough!

## Troubleshooting

### "Failed to upload to Cloudinary" Error
- Check that all 4 environment variables are set in Render
- Verify credentials are correct (no extra spaces)
- Make sure `USE_CLOUDINARY=true`

### Images Not Showing
- Check browser console for errors
- Verify image URL starts with `https://res.cloudinary.com`
- Check Cloudinary dashboard to see if image uploaded

### Old Images Don't Show
- Old images stored locally are lost when server restarted
- Re-upload images using the new Cloudinary system
- New images will persist forever

## Cost
- **Development**: FREE (local storage)
- **Production**: FREE (Cloudinary free tier)
- **Scaling**: If you exceed limits, Cloudinary has affordable paid plans starting at $99/year

---

**Ready to use!** Once you add the Cloudinary credentials and deploy, you can start uploading product images through the admin dashboard.
