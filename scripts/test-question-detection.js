require('dotenv').config();
const ChatService = require('../server/services/chatService');

async function testQuestionDetection() {
  console.log('🧪 Testing Intelligent Question Type Detection with Claude...');
  console.log('===========================================================\n');

  const testQuestions = [
    "What is CTR in marketing?",
    "How to improve ad performance?",
    "Explain the concept of ROAS",
    "What are best practices for video ads?",
    "Show me top 10 performing campaigns",
    "What is our total spend this month?",
    "How to calculate ROAS?",
    "What is the average CTR across all campaigns?",
    "Tell me about video ad optimization",
    "Compare performance between different ad formats"
  ];

  for (let i = 0; i < testQuestions.length; i++) {
    const question = testQuestions[i];
    console.log(`${i + 1}️⃣ Testing: "${question}"`);
    
    try {
      const questionType = await ChatService.detectQuestionType(question);
      console.log(`   → Detected as: ${questionType.toUpperCase()}`);
    } catch (error) {
      console.log(`   → Error: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('🎉 Intelligent question detection test completed!');
}

// Run the test
testQuestionDetection().catch(console.error); 