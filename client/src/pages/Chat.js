import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Code, BarChart3, Sparkles, Loader2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import DataTable from '../components/DataTable';
import Chart from '../components/Chart';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      const response = await axios.get('/api/chat/suggestions');
      if (response.data.success) {
        setSuggestions(response.data.suggestions);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

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
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, botMessage]);
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

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[600px] flex flex-col">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to ShowStop ChatBot!</h3>
                  <p className="text-gray-600 mb-4">Ask me anything about your marketing data:</p>
                  <div className="grid grid-cols-1 gap-2 max-w-md mx-auto">
                    {suggestions.slice(0, 4).map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
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
            </div>
          </div>
        </div>

        {/* Suggestions Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">Quick Questions</h3>
            </div>
            
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors border border-gray-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Example Queries:</h4>
              <div className="space-y-2 text-xs text-gray-600">
                <p>• "Show me top performing campaigns"</p>
                <p>• "Compare Meta vs TikTok performance"</p>
                <p>• "What's our ROAS trend?"</p>
                <p>• "Which ads have highest CTR?"</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat; 