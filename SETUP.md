# ShowStop ChatBot Setup Guide

## 🎯 What You Need to Provide

**Only ONE input is required:**

### 1. OpenAI API Key
- **Purpose**: Powers the natural language to SQL translation
- **Cost**: ~$0.01-0.10 per query (very affordable)
- **How to get it**:
  1. Go to https://platform.openai.com/api-keys
  2. Sign up/login to OpenAI
  3. Click "Create new secret key"
  4. Copy the key (starts with `sk-`)

## 🚀 Quick Setup (3 minutes)

### Step 1: Install Dependencies
```bash
npm run install-all
```

### Step 2: Add Your OpenAI API Key
```bash
cp env.example .env
```
Then edit `.env` and replace:
```
OPENAI_API_KEY=your_openai_api_key_here
```
with your actual API key:
```
OPENAI_API_KEY=sk-your-actual-key-here
```

### Step 3: Test Database Connection
```bash
npm run setup-db
```

### Step 4: Start the Application
```bash
npm run dev
```

### Step 5: Access the App
- **URL**: http://localhost:3000
- **Backend**: http://localhost:5001
- **Login**: admin / showstop2025

## ✅ What's Already Configured

- ✅ **PostgreSQL Database**: Connected to your `dev_adinsight` database
- ✅ **Authentication**: Simple login system ready
- ✅ **UI/UX**: Modern, responsive interface
- ✅ **API Endpoints**: All backend routes configured
- ✅ **Security**: JWT tokens, rate limiting, input validation

## 🧪 Test It Out

Once running, try these example queries in the chat:

1. "Show me top performing campaigns"
2. "Which ads have the highest CTR?"
3. "What's our total spend this month?"
4. "Compare performance between platforms"

## 🔧 Troubleshooting

### Database Connection Issues
- The app connects to: `34.74.141.9:58832/dev_adinsight`
- If connection fails, check network connectivity

### OpenAI API Issues
- Ensure your API key is correct
- Check your OpenAI account has credits
- Verify the key starts with `sk-`

### Port Issues
- Frontend runs on port 3000
- Backend runs on port 5000
- Make sure these ports are available

## 💰 Cost Estimate

- **OpenAI API**: ~$0.01-0.10 per query
- **Database**: Your existing PostgreSQL instance
- **Hosting**: Local development (free)

For 100 queries per day: ~$1-10/month 