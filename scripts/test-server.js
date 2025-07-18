const axios = require('axios');

async function testServer() {
  const baseURL = 'http://localhost:5001';
  
  console.log('🧪 Testing ShowStop ChatBot Server...');
  console.log('=====================================');
  
  try {
    // Test 1: Health check
    console.log('\n1️⃣ Testing health endpoint...');
    const healthResponse = await axios.get(`${baseURL}/api/health`);
    console.log('✅ Health check passed:', healthResponse.data);
    
    // Test 2: Auth test endpoint
    console.log('\n2️⃣ Testing auth endpoint...');
    const authResponse = await axios.get(`${baseURL}/api/auth/test`);
    console.log('✅ Auth test passed:', authResponse.data);
    
    // Test 3: Login endpoint
    console.log('\n3️⃣ Testing login endpoint...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      email: 'admin@showstop.com',
      password: 'password123'
    });
    console.log('✅ Login test passed:', {
      success: loginResponse.data.success,
      user: loginResponse.data.user?.email,
      hasToken: !!loginResponse.data.token
    });
    
    console.log('\n🎉 All tests passed! Server is working correctly.');
    console.log('\n📝 You can now:');
    console.log('   - Start the frontend: npm run client');
    console.log('   - Access the app at: http://localhost:3000');
    console.log('   - Login with: admin@showstop.com / password123');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 Troubleshooting:');
      console.log('   - Make sure the server is running: npm run server');
      console.log('   - Check if port 5000 is available');
      console.log('   - Verify no other process is using port 5000');
    } else if (error.response) {
      console.log('\n📊 Response details:');
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    }
  }
}

testServer(); 