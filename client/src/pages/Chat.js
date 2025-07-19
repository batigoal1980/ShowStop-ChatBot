import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Code, BarChart3, Loader2, ChevronRight } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import DataTable from '../components/DataTable';
import AssetGrid from '../components/AssetGrid';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);





  const sendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setFollowUpQuestions([]); // Clear previous follow-up questions
    setLoading(true);

    try {
      const response = await axios.post('/api/chat/message', {
        message: messageText
      });

      if (response.data.success) {
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: response.data.explanation,
          data: response.data.data,
          sqlQuery: response.data.sqlQuery,
          columns: response.data.columns,
          rowCount: response.data.rowCount,
          assetUrls: response.data.assetUrls || [],
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, botMessage]);
        
        // Generate follow-up questions based on the user's message and conversation context
        const followUps = generateFollowUpQuestions(messageText, response.data.data, messages);
        setFollowUpQuestions(followUps);
        
        toast.success('Query executed successfully!');
      } else {
        const errorMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: response.data.message || 'Sorry, I couldn\'t process your request.',
          error: true,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, errorMessage]);
        toast.error('Failed to process query');
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Sorry, I encountered an error. Please try again.',
        error: true,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorMessage]);
      toast.error('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const generateFollowUpQuestions = (lastMessage, data, allMessages) => {
    const questions = [];
    const messageLower = lastMessage.toLowerCase();
    
    // Analyze the data returned to understand what we're working with
    const dataAnalysis = analyzeData(data, lastMessage);
    
    // Check if this is about videos
    if (messageLower.includes('video') || messageLower.includes('videos') || dataAnalysis.hasVideos) {
      if (dataAnalysis.hasVideoTypes) {
        questions.push("Compare video performance across different ad types");
      }
      if (dataAnalysis.hasHighImpressions) {
        questions.push("Show me videos with highest engagement rate (CTR)");
      } else {
        questions.push("Show me top 10 performing videos by impressions");
      }
      if (dataAnalysis.hasLowROAS) {
        questions.push("Show me videos with ROAS above 2.0");
      } else {
        questions.push("Which video ads have the highest conversion rate?");
      }
    }
    
    // Check if this is about images
    if (messageLower.includes('image') || messageLower.includes('images') || messageLower.includes('photo') || dataAnalysis.hasImages) {
      if (dataAnalysis.hasImageTypes) {
        questions.push("Compare image performance by ad format");
      }
      if (dataAnalysis.hasHighCTR) {
        questions.push("Show me images with highest conversion rate");
      } else {
        questions.push("Show me top 10 performing images by CTR");
      }
      questions.push("Which image ads have the highest ROAS?");
    }
    
    // Check if this is about specific metrics
    if (messageLower.includes('roas') || messageLower.includes('return') || dataAnalysis.metric === 'roas') {
      if (dataAnalysis.hasLowROAS) {
        questions.push("Show me assets with ROAS above 3.0");
      } else {
        questions.push("Compare ROAS across different ad types");
      }
      questions.push("Which creatives have the highest revenue per dollar spent?");
    }
    
    if (messageLower.includes('ctr') || messageLower.includes('click') || dataAnalysis.metric === 'ctr') {
      if (dataAnalysis.hasLowCTR) {
        questions.push("Show me assets with CTR above 2%");
      } else {
        questions.push("Compare CTR across different platforms");
      }
      questions.push("Which creatives have the highest engagement rates?");
    }
    
    if (messageLower.includes('impression') || messageLower.includes('reach') || dataAnalysis.metric === 'impressions') {
      if (dataAnalysis.hasLowImpressions) {
        questions.push("Show me assets with highest impressions");
      } else {
        questions.push("Compare impression performance by ad type");
      }
      questions.push("Which creatives have the best reach?");
    }
    
    // Check if this is about specific time periods
    if (messageLower.includes('july') || messageLower.includes('2025')) {
      questions.push("Show me top performing videos in August 2025");
      questions.push("Compare July vs August performance");
    }
    
    // Check if this is about campaigns
    if (messageLower.includes('campaign') || dataAnalysis.hasCampaigns) {
      questions.push("Show me the best performing campaign creatives");
      questions.push("Compare creative performance within campaigns");
    }
    
    // Add creative-specific questions based on data context
    if (dataAnalysis.hasVideos && !dataAnalysis.hasImages) {
      questions.push("Show me top performing images for comparison");
    }
    if (dataAnalysis.hasImages && !dataAnalysis.hasVideos) {
      questions.push("Show me top performing videos for comparison");
    }
    
    // Add platform-specific questions if we detect platform data
    if (dataAnalysis.hasPlatforms) {
      questions.push("Compare performance across different platforms");
    }
    
    // Add time-based questions if we have date data
    if (dataAnalysis.hasDates) {
      questions.push("Show me performance trends over time");
    }
    
    // Add general creative questions if no specific ones were added
    if (questions.length === 0) {
      questions.push(
        "Show me top performing video ads",
        "Show me top performing image ads",
        "Compare creative performance across platforms"
      );
    }
    
    return questions.slice(0, 3); // Return max 3 questions
  };

  const analyzeData = (data, lastMessage) => {
    if (!data || data.length === 0) {
      return {
        hasVideos: false,
        hasImages: false,
        hasVideoTypes: false,
        hasImageTypes: false,
        hasCampaigns: false,
        hasPlatforms: false,
        hasDates: false,
        hasHighImpressions: false,
        hasLowImpressions: false,
        hasHighCTR: false,
        hasLowCTR: false,
        hasHighROAS: false,
        hasLowROAS: false,
        metric: null
      };
    }

    const analysis = {
      hasVideos: false,
      hasImages: false,
      hasVideoTypes: false,
      hasImageTypes: false,
      hasCampaigns: false,
      hasPlatforms: false,
      hasDates: false,
      hasHighImpressions: false,
      hasLowImpressions: false,
      hasHighCTR: false,
      hasLowCTR: false,
      hasHighROAS: false,
      hasLowROAS: false,
      metric: null
    };

    // Analyze each row
    data.forEach(row => {
      Object.entries(row).forEach(([key, value]) => {
        const keyLower = key.toLowerCase();
        const valueStr = String(value).toLowerCase();

        // Check for video content
        if (valueStr.includes('/dwnld/video/') || valueStr.includes('video')) {
          analysis.hasVideos = true;
        }

        // Check for image content
        if (valueStr.match(/\.(jpg|jpeg|png|gif|webp)/i) || valueStr.includes('image')) {
          analysis.hasImages = true;
        }

        // Check for video types
        if (keyLower.includes('video_ad_type') || keyLower.includes('video_type')) {
          analysis.hasVideoTypes = true;
        }

        // Check for image types
        if (keyLower.includes('f_ad_type') || keyLower.includes('image_type')) {
          analysis.hasImageTypes = true;
        }

        // Check for campaigns
        if (keyLower.includes('campaign') || keyLower.includes('ad_name')) {
          analysis.hasCampaigns = true;
        }

        // Check for platforms
        if (keyLower.includes('platform') || keyLower.includes('account')) {
          analysis.hasPlatforms = true;
        }

        // Check for dates
        if (keyLower.includes('date') || keyLower.includes('created')) {
          analysis.hasDates = true;
        }

        // Analyze metrics
        if (keyLower.includes('impression')) {
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            if (numValue > 1000000) analysis.hasHighImpressions = true;
            if (numValue < 10000) analysis.hasLowImpressions = true;
          }
        }

        if (keyLower.includes('ctr')) {
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            if (numValue > 2.0) analysis.hasHighCTR = true;
            if (numValue < 0.5) analysis.hasLowCTR = true;
          }
        }

        if (keyLower.includes('roas')) {
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            if (numValue > 3.0) analysis.hasHighROAS = true;
            if (numValue < 1.0) analysis.hasLowROAS = true;
          }
        }
      });
    });

    // Determine the primary metric being analyzed
    if (lastMessage) {
      const messageLower = lastMessage.toLowerCase();
      if (messageLower.includes('roas') || messageLower.includes('return')) {
        analysis.metric = 'roas';
      } else if (messageLower.includes('ctr') || messageLower.includes('click')) {
        analysis.metric = 'ctr';
      } else if (messageLower.includes('impression') || messageLower.includes('reach')) {
        analysis.metric = 'impressions';
      }
    }

    return analysis;
  };

  const formatSQL = (sql) => {
    return sql
      .replace(/SELECT/gi, '\nSELECT')
      .replace(/FROM/gi, '\nFROM')
      .replace(/WHERE/gi, '\nWHERE')
      .replace(/GROUP BY/gi, '\nGROUP BY')
      .replace(/ORDER BY/gi, '\nORDER BY')
      .replace(/LIMIT/gi, '\nLIMIT')
      .replace(/JOIN/gi, '\nJOIN');
  };





  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ShowStop ChatBot</h1>
            <p className="text-gray-600">Ask questions about your marketing data in natural language</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Chat Interface */}
        <div className="w-full">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[600px] flex flex-col">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to ShowStop ChatBot!</h3>
                  <p className="text-gray-600 mb-4">Ask me anything about your marketing data:</p>
                  <div className="grid grid-cols-1 gap-2 max-w-md mx-auto">
                    <button
                      onClick={() => sendMessage("Show me top performing campaigns this month")}
                      className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                    >
                      Show me top performing campaigns this month
                    </button>
                    <button
                      onClick={() => sendMessage("What's our total spend across all platforms?")}
                      className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                    >
                      What's our total spend across all platforms?
                    </button>
                    <button
                      onClick={() => sendMessage("Compare performance between different ad formats")}
                      className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                    >
                      Compare performance between different ad formats
                    </button>
                    <button
                      onClick={() => sendMessage("Show me top 5 performing videos (highest ROAS) in July 2025")}
                      className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                    >
                      Show me top 5 performing videos (highest ROAS) in July 2025
                    </button>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl rounded-lg px-4 py-3 ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : message.error
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {message.type === 'bot' && (
                        <Bot className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                      )}
                      {message.type === 'user' && (
                        <User className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm">{message.content}</p>
                        
                        {/* SQL Query Display */}
                        {message.sqlQuery && (
                          <div className="mt-3 p-3 bg-gray-800 rounded text-green-400 text-xs font-mono overflow-x-auto">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-gray-400">Generated SQL:</span>
                              <Code className="h-4 w-4" />
                            </div>
                            <pre>{formatSQL(message.sqlQuery)}</pre>
                          </div>
                        )}

                        {/* Data Results */}
                        {message.data && message.data.length > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-500">
                                {message.rowCount} results
                              </span>
                              <BarChart3 className="h-4 w-4 text-gray-500" />
                            </div>
                            <DataTable data={message.data} columns={message.columns} />
                          </div>
                        )}

                        {/* Asset Grid */}
                        {message.assetUrls && message.assetUrls.length > 0 && (
                          <AssetGrid 
                            assets={message.assetUrls}
                            title="Ad Assets with Performance"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-5 w-5 text-gray-500 animate-spin" />
                      <span className="text-sm text-gray-600">Processing your question...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="border-t border-gray-200 p-4">
              <form onSubmit={handleSubmit} className="flex space-x-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your marketing data..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Send</span>
                </button>
              </form>
              
              {/* Follow-up Questions */}
              {followUpQuestions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <ChevronRight className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Follow-up questions:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {followUpQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => sendMessage(question)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-xs font-medium transition-colors border border-blue-200"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat; 