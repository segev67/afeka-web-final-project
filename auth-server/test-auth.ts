/**
 * ===========================================
 * AUTH TESTING SCRIPT
 * ===========================================
 * 
 * Quick script to test authentication endpoints.
 * Run: npm run test:auth
 * 
 * DEFENSE NOTE:
 * - This demonstrates how the auth flow works
 * - Shows JWT token structure
 * - Useful for understanding the authentication process
 */

const BASE_URL = 'http://localhost:4000';

// Test user credentials
const testUser = {
  username: 'testuser',
  email: 'test@test.com',
  password: 'password123'
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testRegister() {
  log('cyan', '\n📝 Testing Registration...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });

    const data = await response.json();

    if (response.ok) {
      log('green', '✅ Registration successful!');
      console.log('User:', data.data.user);
      console.log('Access Token (first 50 chars):', data.data.accessToken.substring(0, 50) + '...');
      return data.data.accessToken;
    } else {
      log('yellow', '⚠️  Registration failed (user might already exist)');
      console.log('Message:', data.message);
      return null;
    }
  } catch (error) {
    log('red', '❌ Error during registration');
    console.error(error);
    return null;
  }
}

async function testLogin() {
  log('cyan', '\n🔐 Testing Login...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      log('green', '✅ Login successful!');
      console.log('User:', data.data.user);
      console.log('Access Token (first 50 chars):', data.data.accessToken.substring(0, 50) + '...');
      return data.data.accessToken;
    } else {
      log('red', '❌ Login failed');
      console.log('Message:', data.message);
      return null;
    }
  } catch (error) {
    log('red', '❌ Error during login');
    console.error(error);
    return null;
  }
}

async function testVerify(token: string) {
  log('cyan', '\n🔍 Testing Token Verification...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      log('green', '✅ Token is valid!');
      console.log('Decoded user data:', data.data.user);
      return true;
    } else {
      log('red', '❌ Token verification failed');
      console.log('Message:', data.message);
      return false;
    }
  } catch (error) {
    log('red', '❌ Error during verification');
    console.error(error);
    return false;
  }
}

async function decodeJWT(token: string) {
  log('cyan', '\n🔬 Decoding JWT Token...');
  
  try {
    // JWT structure: header.payload.signature
    const parts = token.split('.');
    
    if (parts.length !== 3) {
      log('red', '❌ Invalid JWT structure');
      return;
    }

    // Decode payload (second part)
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    );

    log('green', '✅ JWT Decoded Successfully!');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    // Check expiration
    if (payload.exp) {
      const expirationDate = new Date(payload.exp * 1000);
      const now = new Date();
      const minutesUntilExpiry = Math.floor((expirationDate.getTime() - now.getTime()) / 1000 / 60);
      
      console.log(`\nToken expires: ${expirationDate.toLocaleString()}`);
      console.log(`Time until expiry: ${minutesUntilExpiry} minutes`);
    }
  } catch (error) {
    log('red', '❌ Error decoding JWT');
    console.error(error);
  }
}

async function runTests() {
  log('blue', '\n========================================');
  log('blue', '   AUTH SERVER TESTING SUITE');
  log('blue', '========================================\n');

  log('yellow', `Testing with user: ${testUser.email}`);
  log('yellow', `Auth server: ${BASE_URL}\n`);

  // Test 1: Register
  let token = await testRegister();

  // Test 2: Login (in case registration failed because user exists)
  if (!token) {
    token = await testLogin();
  }

  if (!token) {
    log('red', '\n❌ Could not obtain access token. Tests aborted.');
    return;
  }

  // Test 3: Decode JWT
  await decodeJWT(token);

  // Test 4: Verify token
  await testVerify(token);

  log('blue', '\n========================================');
  log('green', '   ALL TESTS COMPLETED!');
  log('blue', '========================================\n');

  log('yellow', '💡 Tip: Use this token in your frontend or API tests:');
  console.log(`\nAuthorization: Bearer ${token}\n`);
}

// Run tests
runTests().catch(console.error);
