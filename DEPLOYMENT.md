# ShowStop ChatBot - Deployment Guide

Your ShowStop ChatBot is now ready for deployment! Here are several deployment options:

## 🚀 Quick Deploy Options

### 1. Heroku (Recommended for beginners)

**Prerequisites:**
- Heroku account
- Heroku CLI installed
- Git repository

**Steps:**
```bash
# Login to Heroku
heroku login

# Create new Heroku app
heroku create your-showstop-chatbot

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set ANTHROPIC_API_KEY=your_api_key_here
heroku config:set JWT_SECRET=your_jwt_secret_here

# Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main

# Open the app
heroku open
```

### 2. Railway (Alternative to Heroku)

**Steps:**
1. Go to [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Set environment variables in Railway dashboard
4. Deploy automatically

### 3. Render (Free tier available)

**Steps:**
1. Go to [render.com](https://render.com)
2. Connect your GitHub repository
3. Choose "Web Service"
4. Set build command: `npm run build:prod`
5. Set start command: `npm run start:prod`
6. Add environment variables

### 4. Docker Deployment

**Local Docker:**
```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build and run manually
docker build -t showstop-chatbot .
docker run -p 5001:5001 -e ANTHROPIC_API_KEY=your_key showstop-chatbot
```

**Docker on cloud platforms:**
- **Google Cloud Run**
- **AWS ECS**
- **Azure Container Instances**

### 5. VPS Deployment (DigitalOcean, AWS EC2, etc.)

**Steps:**
```bash
# On your VPS
git clone your-repository
cd ShowStop-ChatBot
npm run build:prod
npm run start:prod

# Or use PM2 for process management
npm install -g pm2
pm2 start server/index.js --name "showstop-chatbot"
pm2 startup
pm2 save
```

## 🔧 Environment Variables

Make sure to set these environment variables in your deployment platform:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://admin:gHzAsyen7HFpmc6b@34.74.141.9:58832/prod_ad_insights
ANTHROPIC_API_KEY=your_anthropic_api_key_here
JWT_SECRET=your_super_secret_jwt_key_here
```

## 📊 Database

Your app is already configured to use the existing PostgreSQL database at:
`postgresql://admin:gHzAsyen7HFpmc6b@34.74.141.9:58832/prod_ad_insights`

## 🔍 Health Check

After deployment, test your app with:
```
https://your-app-url.com/api/health
```

## 🛠️ Troubleshooting

### Common Issues:

1. **Build fails**: Make sure all dependencies are installed
2. **Database connection**: Verify DATABASE_URL is correct
3. **API errors**: Check ANTHROPIC_API_KEY is set
4. **Port issues**: Ensure PORT environment variable is set

### Logs:
- **Heroku**: `heroku logs --tail`
- **Railway**: View logs in dashboard
- **Docker**: `docker logs container_name`

## 🎯 Recommended Deployment

For a production app, I recommend:
1. **Heroku** for simplicity and reliability
2. **Railway** as a Heroku alternative
3. **Docker + VPS** for full control

Choose based on your needs:
- **Quick deployment**: Heroku/Railway
- **Cost optimization**: VPS with Docker
- **Enterprise**: AWS/GCP with container orchestration

## 🚀 Next Steps

1. Choose your deployment platform
2. Set up environment variables
3. Deploy and test
4. Set up custom domain (optional)
5. Configure SSL certificates
6. Set up monitoring and logging

Your ShowStop ChatBot is ready to go live! 🎉 