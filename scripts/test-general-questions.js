require('dotenv').config();
const ChatService = require('../server/services/chatService');

async function testGeneralQuestions() {
  console.log('🧪 Testing General Questions with Claude...');
  console.log('=====================================\n');

  const testQuestions = [
    "What is CTR in marketing?",
    "How to improve ad performance?",
    "Explain the concept of ROAS",
    "What are best practices for video ads?",
    "Show me top 10 performing campaigns" // This should use SQL
  ];

  for (let i = 0; i < testQuestions.length; i++) {
    const question = testQuestions[i];
    console.log(`${i + 1}️⃣ Testing: "${question}"`);
    
    try {
      const result = await ChatService.processChatMessage(question, {
        userAgent: 'test-script',
        ipAddress: '127.0.0.1'
      });
      
      if (result.success) {
        console.log(`✅ Success!`);
        console.log(`📝 Question Type: ${result.isGeneralQuestion ? 'General Knowledge' : 'SQL Analysis'}`);
        console.log(`📊 Response: ${result.explanation.substring(0, 200)}...`);
        console.log(`⏱️  Execution Time: ${result.executionTime}ms`);
      } else {
        console.log(`❌ Failed: ${result.error}`);
      }
    } catch (error) {
      console.log(`💥 Error: ${error.message}`);
    }
    
    console.log('---\n');
  }
  
  console.log('🎉 General questions test completed!');
}

// Run the test
testGeneralQuestions().catch(console.error); 