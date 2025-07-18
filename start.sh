#!/bin/bash

echo "🚀 Starting ShowStop ChatBot..."
echo "================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp env.example .env
    echo "📝 Please edit .env file and add your OpenAI API key"
    echo "   Required: OPENAI_API_KEY=your_openai_api_key_here"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing server dependencies..."
    npm install
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing client dependencies..."
    cd client && npm install && cd ..
fi

# Test database connection
echo "🔌 Testing database connection..."
node scripts/setup-database.js

# Start the application
echo "🎯 Starting ShowStop ChatBot..."
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo "   Login:    admin@showstop.com / password123"
echo ""
echo "Press Ctrl+C to stop the application"
echo "================================"

npm run dev 