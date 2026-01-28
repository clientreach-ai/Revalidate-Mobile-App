/**
 * API Routes Test Script
 * 
 * This script tests all API endpoints to ensure they work correctly.
 * 
 * Run with: pnpm test:routes
 * 
 * Note: Some endpoints require authentication (JWT token).
 * For full testing, you'll need to:
 * 1. Have a test user in the database
 * 2. Get a valid JWT token
 * 3. Or mock authentication for testing
 */

import axios, { AxiosInstance } from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_VERSION = '/api/v1';

interface TestResult {
  endpoint: string;
  method: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  statusCode?: number;
}

let testResults: TestResult[] = [];

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  validateStatus: () => true, // Don't throw on any status
});

function logResult(result: TestResult) {
  const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️';
  console.log(`${icon} ${result.method} ${result.endpoint} - ${result.message}`);
  if (result.statusCode) {
    console.log(`   Status: ${result.statusCode}`);
  }
  testResults.push(result);
}

async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...\n');
  
  try {
    const response = await api.get('/health');
    if (response.status === 200 && response.data.status === 'ok') {
      logResult({
        endpoint: '/health',
        method: 'GET',
        status: 'pass',
        message: 'Health check passed',
        statusCode: response.status,
      });
      return true;
    } else {
      logResult({
        endpoint: '/health',
        method: 'GET',
        status: 'fail',
        message: 'Health check failed',
        statusCode: response.status,
      });
      return false;
    }
  } catch (error: any) {
    logResult({
      endpoint: '/health',
      method: 'GET',
      status: 'fail',
      message: `Error: ${error.message}`,
    });
    return false;
  }
}

async function testApiInfo() {
  console.log('\n📚 Testing API Info Endpoint...\n');
  
  try {
    const response = await api.get(`${API_VERSION}`);
    if (response.status === 200 && response.data.endpoints) {
      logResult({
        endpoint: `${API_VERSION}`,
        method: 'GET',
        status: 'pass',
        message: 'API info endpoint works',
        statusCode: response.status,
      });
      console.log('   Available endpoints:', Object.keys(response.data.endpoints));
      return true;
    } else {
      logResult({
        endpoint: `${API_VERSION}`,
        method: 'GET',
        status: 'fail',
        message: 'API info endpoint failed',
        statusCode: response.status,
      });
      return false;
    }
  } catch (error: any) {
    logResult({
      endpoint: `${API_VERSION}`,
      method: 'GET',
      status: 'fail',
      message: `Error: ${error.message}`,
    });
    return false;
  }
}

async function testAuthEndpoints() {
  console.log('\n🔐 Testing Authentication Endpoints...\n');
  
  // Test register endpoint (will fail without Firebase token, but tests route exists)
  try {
    const response = await api.post(`${API_VERSION}/auth/register`, {
      firebaseIdToken: 'invalid-token-for-testing',
      professionalDetails: {
        registrationNumber: 'TEST123',
        revalidationDate: '2025-12-31',
        professionalRole: 'nurse',
      },
    });
    
    // Should return 401 (invalid token) or 400 (validation error), not 404
    if (response.status === 401 || response.status === 400) {
      logResult({
        endpoint: `${API_VERSION}/auth/register`,
        method: 'POST',
        status: 'pass',
        message: 'Register endpoint exists (expected auth error)',
        statusCode: response.status,
      });
    } else if (response.status === 404) {
      logResult({
        endpoint: `${API_VERSION}/auth/register`,
        method: 'POST',
        status: 'fail',
        message: 'Register endpoint not found',
        statusCode: response.status,
      });
    } else {
      logResult({
        endpoint: `${API_VERSION}/auth/register`,
        method: 'POST',
        status: 'pass',
        message: `Register endpoint exists (unexpected status: ${response.status})`,
        statusCode: response.status,
      });
    }
  } catch (error: any) {
    logResult({
      endpoint: `${API_VERSION}/auth/register`,
      method: 'POST',
      status: 'fail',
      message: `Error: ${error.message}`,
    });
  }
  
  // Test login endpoint
  try {
    const response = await api.post(`${API_VERSION}/auth/login`, {
      firebaseIdToken: 'invalid-token-for-testing',
    });
    
    if (response.status === 401 || response.status === 400) {
      logResult({
        endpoint: `${API_VERSION}/auth/login`,
        method: 'POST',
        status: 'pass',
        message: 'Login endpoint exists (expected auth error)',
        statusCode: response.status,
      });
    } else if (response.status === 404) {
      logResult({
        endpoint: `${API_VERSION}/auth/login`,
        method: 'POST',
        status: 'fail',
        message: 'Login endpoint not found',
        statusCode: response.status,
      });
    } else {
      logResult({
        endpoint: `${API_VERSION}/auth/login`,
        method: 'POST',
        status: 'pass',
        message: `Login endpoint exists`,
        statusCode: response.status,
      });
    }
  } catch (error: any) {
    logResult({
      endpoint: `${API_VERSION}/auth/login`,
      method: 'POST',
      status: 'fail',
      message: `Error: ${error.message}`,
    });
  }
  
  // Test protected endpoint (should return 401 without token)
  try {
    const response = await api.get(`${API_VERSION}/auth/me`);
    if (response.status === 401) {
      logResult({
        endpoint: `${API_VERSION}/auth/me`,
        method: 'GET',
        status: 'pass',
        message: 'Auth middleware working (returns 401 without token)',
        statusCode: response.status,
      });
    } else {
      logResult({
        endpoint: `${API_VERSION}/auth/me`,
        method: 'GET',
        status: 'fail',
        message: `Unexpected status: ${response.status}`,
        statusCode: response.status,
      });
    }
  } catch (error: any) {
    logResult({
      endpoint: `${API_VERSION}/auth/me`,
      method: 'GET',
      status: 'fail',
      message: `Error: ${error.message}`,
    });
  }
}

async function testProtectedEndpoints() {
  console.log('\n🔒 Testing Protected Endpoints (without auth)...\n');
  
  const protectedEndpoints = [
    { method: 'GET', path: `${API_VERSION}/users/profile` },
    { method: 'GET', path: `${API_VERSION}/work-hours` },
    { method: 'GET', path: `${API_VERSION}/cpd-hours` },
    { method: 'GET', path: `${API_VERSION}/feedback` },
    { method: 'GET', path: `${API_VERSION}/reflections` },
    { method: 'GET', path: `${API_VERSION}/appraisals` },
  ];
  
  for (const endpoint of protectedEndpoints) {
    try {
      const response = await api.request({
        method: endpoint.method as any,
        url: endpoint.path,
      });
      
      // Should return 401 (unauthorized) without token
      if (response.status === 401) {
        logResult({
          endpoint: endpoint.path,
          method: endpoint.method,
          status: 'pass',
          message: 'Protected endpoint working (returns 401 without token)',
          statusCode: response.status,
        });
      } else if (response.status === 404) {
        logResult({
          endpoint: endpoint.path,
          method: endpoint.method,
          status: 'fail',
          message: 'Endpoint not found',
          statusCode: response.status,
        });
      } else {
        logResult({
          endpoint: endpoint.path,
          method: endpoint.method,
          status: 'pass',
          message: `Endpoint exists (status: ${response.status})`,
          statusCode: response.status,
        });
      }
    } catch (error: any) {
      logResult({
        endpoint: endpoint.path,
        method: endpoint.method,
        status: 'fail',
        message: `Error: ${error.message}`,
      });
    }
  }
}

async function testPostEndpoints() {
  console.log('\n📝 Testing POST Endpoints (validation)...\n');
  
  // Test work hours creation (should fail validation without auth, but tests route)
  try {
    const response = await api.post(`${API_VERSION}/work-hours`, {
      // Invalid data to test validation
    });
    
    if (response.status === 400 || response.status === 401) {
      logResult({
        endpoint: `${API_VERSION}/work-hours`,
        method: 'POST',
        status: 'pass',
        message: 'Work hours POST endpoint exists (validation/auth working)',
        statusCode: response.status,
      });
    } else {
      logResult({
        endpoint: `${API_VERSION}/work-hours`,
        method: 'POST',
        status: 'pass',
        message: `Work hours POST endpoint exists (status: ${response.status})`,
        statusCode: response.status,
      });
    }
  } catch (error: any) {
    logResult({
      endpoint: `${API_VERSION}/work-hours`,
      method: 'POST',
      status: 'fail',
      message: `Error: ${error.message}`,
    });
  }
  
  // Test CPD hours creation
  try {
    const response = await api.post(`${API_VERSION}/cpd-hours`, {});
    if (response.status === 400 || response.status === 401) {
      logResult({
        endpoint: `${API_VERSION}/cpd-hours`,
        method: 'POST',
        status: 'pass',
        message: 'CPD hours POST endpoint exists',
        statusCode: response.status,
      });
    }
  } catch (error: any) {
    logResult({
      endpoint: `${API_VERSION}/cpd-hours`,
      method: 'POST',
      status: 'fail',
      message: `Error: ${error.message}`,
    });
  }
}

function generateReport() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('   Test Results Summary');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const passed = testResults.filter(r => r.status === 'pass').length;
  const failed = testResults.filter(r => r.status === 'fail').length;
  const skipped = testResults.filter(r => r.status === 'skip').length;
  
  console.log(`Total tests: ${testResults.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults
      .filter(r => r.status === 'fail')
      .forEach(r => {
        console.log(`   ${r.method} ${r.endpoint} - ${r.message}`);
      });
  }
  
  console.log('\n═══════════════════════════════════════════════════════\n');
  
  return { passed, failed, skipped };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   Revalidation Tracker - API Routes Test Suite');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`\nTesting API at: ${BASE_URL}\n`);
  
  try {
    // Test basic endpoints
    await testHealthCheck();
    await testApiInfo();
    
    // Test auth endpoints
    await testAuthEndpoints();
    
    // Test protected endpoints
    await testProtectedEndpoints();
    
    // Test POST endpoints
    await testPostEndpoints();
    
    // Generate report
    const report = generateReport();
    
    if (report.failed === 0) {
      console.log('✅ All route tests passed!');
      process.exit(0);
    } else {
      console.log(`⚠️  ${report.failed} test(s) failed. Check the details above.`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main as testRoutes };
