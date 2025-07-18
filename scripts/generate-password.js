const bcrypt = require('bcryptjs');

async function generatePasswordHash() {
  const password = 'showstop2025';
  const saltRounds = 10;
  
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Password:', password);
    console.log('Hash:', hash);
    
    // Test the hash
    const isValid = await bcrypt.compare(password, hash);
    console.log('Hash is valid:', isValid);
    
    return hash;
  } catch (error) {
    console.error('Error generating hash:', error);
  }
}

generatePasswordHash(); 