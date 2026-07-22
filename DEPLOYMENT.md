# Deployment Guide

This guide will help you deploy your Bestway Jobs application to production.

## Prerequisites

- GitHub repository with your code
- Supabase project set up
- Environment variables configured

## Option 1: Vercel (Recommended)

### Step 1: Prepare Your Repository

1. Push your code to GitHub
2. Ensure your `.env` file is in `.gitignore` (it should be by default)

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with your GitHub account
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will automatically detect it's a Vite project

### Step 3: Configure Environment Variables

In your Vercel project dashboard:

1. Go to Settings → Environment Variables
2. Add these variables:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Step 4: Update Supabase Settings

1. Go to your Supabase dashboard
2. Navigate to Authentication → Settings
3. Add your Vercel domain to "Redirect URLs":
   - `https://your-app-name.vercel.app`

### Step 5: Deploy

1. Click "Deploy" in Vercel
2. Wait for the build to complete
3. Your app will be live at `https://your-app-name.vercel.app`

## Option 2: Netlify

### Step 1: Build Settings

1. Go to [netlify.com](https://netlify.com)
2. Connect your GitHub repository
3. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

### Step 2: Environment Variables

1. Go to Site settings → Environment variables
2. Add your Supabase variables

### Step 3: Deploy

1. Trigger a deploy
2. Your app will be live at `https://your-app-name.netlify.app`

## Option 3: Railway

### Step 1: Connect Repository

1. Go to [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Railway will auto-detect the Vite project

### Step 2: Environment Variables

1. Go to Variables tab
2. Add your Supabase environment variables

### Step 3: Deploy

1. Railway will automatically deploy
2. Your app will be live at `https://your-app-name.railway.app`

## Post-Deployment Checklist

- [ ] Test authentication flow
- [ ] Verify database connections
- [ ] Test job creation/editing/deletion
- [ ] Check responsive design on mobile
- [ ] Verify all environment variables are set
- [ ] Test with different user accounts

## Custom Domain (Optional)

### Vercel
1. Go to your project settings
2. Add your custom domain
3. Update DNS records as instructed
4. Update Supabase redirect URLs

### Netlify
1. Go to Domain settings
2. Add custom domain
3. Configure DNS
4. Update Supabase redirect URLs

## Troubleshooting

### Common Issues

1. **Authentication not working**
   - Check redirect URLs in Supabase
   - Verify environment variables are set

2. **Database connection errors**
   - Verify Supabase URL and key
   - Check RLS policies

3. **Build failures**
   - Check for TypeScript errors
   - Verify all dependencies are installed

### Getting Help

- Check the browser console for errors
- Review Vercel/Netlify build logs
- Check Supabase logs in the dashboard

## Performance Optimization

1. **Enable caching** in your hosting platform
2. **Use CDN** for static assets
3. **Optimize images** before uploading
4. **Enable compression** in your hosting settings

## Security Considerations

1. **Never commit** `.env` files
2. **Use HTTPS** in production
3. **Regularly update** dependencies
4. **Monitor** your Supabase usage
5. **Set up** proper RLS policies

## Monitoring

1. **Set up** error tracking (Sentry, LogRocket)
2. **Monitor** performance metrics
3. **Track** user analytics
4. **Set up** uptime monitoring

Your Bestway Jobs application is now ready for production! 🚀
