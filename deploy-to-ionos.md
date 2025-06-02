# 🚀 True Shuffle IONOS Deployment Guide
## Domain: trueshuffleradio.com

## ✅ Current Status
- [x] Algorithm v3 with strict artist exclusion implemented
- [x] Mobile responsive design completed  
- [x] All code committed to main branch
- [x] Dependencies installed and ready
- [x] Domain configuration updated (trueshuffleradio.com)
- [ ] Spotify app settings update pending
- [ ] IONOS deployment pending

## 📋 Pre-Deployment Checklist

### Step 1: Update Spotify App Settings ⭐ REQUIRED FIRST
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications/69889249cd33426ab241d33713e55fad)
2. Click "Edit Settings"
3. Update **Redirect URIs** to:
   ```
   https://trueshuffleradio.com/callback
   ```
4. **Switch from Development Mode to Production** (Quota Extension Request)
5. Save changes

### Step 2: Configure Production Environment ✅ READY
```bash
# Environment file already configured for trueshuffleradio.com
cp env.production .env

# Production URLs configured:
REDIRECT_URI=https://trueshuffleradio.com/callback
FRONTEND_URL=https://trueshuffleradio.com
CORS_ORIGIN=https://trueshuffleradio.com
```

### Step 3: Build Production Assets
```bash
# Build minified CSS (if needed)
npx tailwindcss -i ./public/tailwind.css -o ./public/styles.css --minify
```

### Step 4: Create Deployment Package
```bash
# Create a clean deployment folder
mkdir ../true-shuffle-deploy
cp -r . ../true-shuffle-deploy/
cd ../true-shuffle-deploy/

# Remove development files
rm -rf node_modules
rm -rf .git
rm .env
rm public/app.js.backup 2>/dev/null || true

# Install production dependencies only
npm install --production
```

## 🌐 IONOS Hosting Setup

### Option A: Node.js Hosting (Recommended)
1. **Upload Files:**
   - Upload entire project folder to your IONOS Node.js hosting root
   - Ensure `server.js` is in the root directory

2. **Set Environment Variables in IONOS Control Panel:**
   ```
   SPOTIFY_CLIENT_ID=69889249cd33426ab241d33713e55fad
   SPOTIFY_CLIENT_SECRET=c5af1fce82de4e098a3224abe002d597
   REDIRECT_URI=https://trueshuffleradio.com/callback
   FRONTEND_URL=https://trueshuffleradio.com
   NODE_ENV=production
   PORT=3000
   SESSION_SECRET=trueshuffle_radio_v3_production_secure_key_2024_randomized
   CORS_ORIGIN=https://trueshuffleradio.com
   ```

3. **Install Dependencies:**
   ```bash
   npm install --production
   ```

4. **Start Application:**
   ```bash
   npm start
   ```

### Option B: Shared Hosting with Node.js Support
1. Upload files to `htdocs` or web root
2. Configure Node.js in IONOS panel:
   - Entry point: `server.js`
   - Node.js version: Latest LTS
3. Set environment variables in hosting panel

## 🔧 Domain & SSL Configuration

### DNS Settings
1. **A Record:** Point trueshuffleradio.com to IONOS server IP
2. **CNAME (if using subdomain):** Point subdomain to main domain
3. **Wait for propagation** (can take up to 24 hours)

### SSL Certificate
1. **Enable SSL in IONOS panel** (usually automatic with Let's Encrypt)
2. **Force HTTPS redirect** in hosting settings
3. **Test HTTPS access:** `https://trueshuffleradio.com`

## �� Testing Checklist

### Pre-Launch Testing
- [ ] Domain resolves correctly (trueshuffleradio.com)
- [ ] HTTPS is working
- [ ] Spotify login redirects properly to /callback
- [ ] All shuffle modes function
- [ ] Mobile responsive design works
- [ ] "Heard on True Shuffle" playlist creation
- [ ] Artist exclusion algorithm working

### Post-Launch Monitoring
- [ ] Set up uptime monitoring
- [ ] Monitor error logs
- [ ] Test from different devices/browsers
- [ ] Verify analytics (if implemented)

## 🚨 Troubleshooting

### Common Issues:
1. **"Redirect URI mismatch"**
   - Update Spotify app settings with exact production URL
   - Ensure HTTPS is used: https://trueshuffleradio.com/callback

2. **App not starting**
   - Check Node.js version compatibility
   - Verify environment variables are set
   - Check IONOS logs for errors

3. **Static files not loading**
   - Ensure `public/` folder is uploaded
   - Check file permissions
   - Verify hosting configuration

### Support Resources:
- IONOS Node.js Documentation
- Spotify Web API Documentation  
- True Shuffle GitHub Issues (if applicable)

## 🎉 Launch Strategy

### Soft Launch (Week 1)
1. Deploy and test privately
2. Share with friends for beta testing
3. Gather feedback and fix issues

### Public Launch (Week 2+)
1. Announce on social media
2. Submit to music communities
3. Consider ProductHunt launch

---

**Ready for trueshuffleradio.com deployment!** 🚀

Next steps:
1. Update Spotify app settings
2. Create deployment package
3. Upload to IONOS webspace 