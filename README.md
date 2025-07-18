# ShowStop ChatBot 🚀

A powerful AI-driven chatbot for marketing analytics that connects with Meta Ads, TikTok Ads, and Google Ads data, featuring natural language to SQL translation and rich dashboard visualizations.

## ✨ Features

- **🤖 AI-Powered Chat Interface** - Ask creative questions in natural language
- **🔗 Multi-Platform Data Integration** - Meta Ads, TikTok Ads, Google Ads
- **📊 Rich Dashboard Visualizations** - Interactive charts and analytics
- **🗣️ Natural Language to SQL** - AI translates questions to database queries
- **📈 Real-time Analytics** - Live data updates and insights
- **🎨 Modern UI/UX** - Beautiful, responsive interface
- **🔒 Secure Authentication** - JWT-based user management
- **⚡ MCP Data Layer** - Model Context Protocol for data abstraction

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   Dashboard     │◄──►│   Server        │◄──►│   PostgreSQL    │
│   Chat UI       │    │   MCP Layer     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Marketing     │
                       │   APIs          │
                       │   • Meta Ads    │
                       │   • TikTok Ads  │
                       │   • Google Ads  │
                       └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+ (already configured)
- OpenAI API key (for natural language processing)

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd ShowStop-ChatBot
   npm run install-all
   ```

2. **Get OpenAI API Key**
   - Visit: https://platform.openai.com/api-keys
   - Create a new API key
   - Copy the key

3. **Environment Setup**
   ```bash
   cp env.example .env
   # Edit .env and add your OpenAI API key:
   # OPENAI_API_KEY=your_actual_api_key_here
   ```

4. **Database Setup**
   ```bash
   npm run setup-db
   ```

5. **Start Development**
   ```bash
   npm run dev
   ```

6. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001
   - Login: admin / showstop2025

## 🔧 Configuration

### Required Inputs

**You only need to provide ONE input:**

1. **OpenAI API Key** (Required for natural language to SQL translation)
   - Get your API key from: https://platform.openai.com/api-keys
   - Add it to the `.env` file: `OPENAI_API_KEY=your_actual_api_key_here`

### Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/showstop

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# OpenAI API (REQUIRED for natural language to SQL translation)
OPENAI_API_KEY=your_openai_api_key_here

# JWT Secret
JWT_SECRET=your_jwt_secret_key
```

## 📊 Data Schema

The system stores marketing data in PostgreSQL with the following key tables:

- `campaigns` - Campaign metadata
- `ads` - Ad creative information
- `performance_metrics` - Daily performance data
- `audience_insights` - Audience demographics
- `conversions` - Conversion tracking
- `users` - User management

## 🤖 Chatbot Features

### Natural Language Processing
- "Show me top performing campaigns this month"
- "Which ads have the highest CTR?"
- "Compare Meta vs TikTok performance"
- "What's our ROAS trend over the last quarter?"

### SQL Translation
The AI automatically translates natural language queries to optimized SQL:

```sql
-- User: "Show me campaigns with ROAS > 2.0"
SELECT 
    c.campaign_name,
    c.platform,
    AVG(p.roas) as avg_roas
FROM campaigns c
JOIN performance_metrics p ON c.id = p.campaign_id
WHERE p.roas > 2.0
GROUP BY c.id, c.campaign_name, c.platform
ORDER BY avg_roas DESC;
```

## 📈 Dashboard Features

- **Real-time Metrics** - Live performance indicators
- **Interactive Charts** - D3.js powered visualizations
- **Cross-Platform Comparison** - Unified view across all platforms
- **Custom Reports** - Build and save custom analytics
- **Export Capabilities** - PDF, CSV, Excel exports

## 🔌 Data Integration

### PostgreSQL Database
- Direct connection to your marketing data
- Real-time query execution
- Campaign performance data
- Ad creative insights
- Audience demographics
- Conversion tracking
- Cross-platform analytics

## 🛠️ Development

### Project Structure
```
ShowStop-ChatBot/
├── server/                 # Backend API
│   ├── index.js           # Main server file
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── models/            # Database models
│   └── middleware/        # Custom middleware
├── client/                # Frontend React app
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── utils/         # Utility functions
├── scripts/               # Database setup scripts
└── docs/                  # Documentation
```

### Available Scripts
- `npm run dev` - Start development servers
- `npm run build` - Build for production
- `npm run setup-db` - Initialize database
- `npm test` - Run tests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation in `/docs`

---

**ShowStop ChatBot** - Transforming marketing data into actionable insights with AI-powered analytics. 🚀 