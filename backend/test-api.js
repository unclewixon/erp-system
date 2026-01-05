// Comprehensive API Test Script
const BASE_URL = 'http://165.232.32.182/api';

let authToken = '';
let testResults = [];

const log = (status, endpoint, method, message) => {
  const result = { status, endpoint, method, message };
  testResults.push(result);
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚠';
  console.log(`${icon} [${method}] ${endpoint} - ${message}`);
};

const testEndpoint = async (method, endpoint, body = null, expectStatus = [200, 201]) => {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      },
    };
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json().catch(() => ({}));

    if (expectStatus.includes(response.status)) {
      log('PASS', endpoint, method, `Status ${response.status}`);
      return { success: true, data, status: response.status };
    } else {
      log('FAIL', endpoint, method, `Expected ${expectStatus.join('/')}, got ${response.status}: ${data.message || 'Unknown error'}`);
      return { success: false, data, status: response.status };
    }
  } catch (error) {
    log('FAIL', endpoint, method, `Error: ${error.message}`);
    return { success: false, error: error.message };
  }
};

const runTests = async () => {
  console.log('\n========================================');
  console.log('    ERP API COMPREHENSIVE TEST');
  console.log('========================================\n');

  // 1. AUTH ROUTES
  console.log('\n--- AUTH ROUTES ---');

  // Login as Super Admin
  const loginRes = await testEndpoint('POST', '/auth/login', {
    email: 'admin@erp.com',
    password: 'Admin@123'
  });

  if (loginRes.success && loginRes.data?.data?.token) {
    authToken = loginRes.data.data.token;
    log('PASS', '/auth/login', 'POST', 'Got auth token');
  } else {
    console.log('CRITICAL: Cannot proceed without auth token');
    console.log('Response:', JSON.stringify(loginRes.data, null, 2));
    return;
  }

  // Get profile
  await testEndpoint('GET', '/auth/me');

  // 2. ADMIN ROUTES
  console.log('\n--- ADMIN ROUTES ---');
  await testEndpoint('GET', '/admin/tenants');
  await testEndpoint('GET', '/admin/analytics');  // Fixed: was /admin/stats

  // 3. PLANS ROUTES
  console.log('\n--- PLANS ROUTES ---');
  await testEndpoint('GET', '/plans');
  await testEndpoint('GET', '/plans/features');

  // 4. GLOBAL SETTINGS
  console.log('\n--- GLOBAL SETTINGS ---');
  await testEndpoint('GET', '/global-settings');

  // 5. EMAIL SETTINGS
  console.log('\n--- EMAIL SETTINGS ---');
  await testEndpoint('GET', '/email-settings');

  // 6. WEBSITE CONTENT
  console.log('\n--- WEBSITE CONTENT ---');
  await testEndpoint('GET', '/website-content/home');  // Fixed: was /website-content

  // 7. LIVE CHAT
  console.log('\n--- LIVE CHAT ROUTES ---');
  await testEndpoint('GET', '/live-chat/admin/all');  // Fixed: was /live-chat/admin/chats
  await testEndpoint('GET', '/live-chat/admin/waiting-count');

  // 8. EMPLOYEES
  console.log('\n--- EMPLOYEE ROUTES ---');
  await testEndpoint('GET', '/employees');

  // 9. DEPARTMENTS
  console.log('\n--- DEPARTMENT ROUTES ---');
  await testEndpoint('GET', '/departments');

  // 10. BRANCHES
  console.log('\n--- BRANCH ROUTES ---');
  await testEndpoint('GET', '/branches');

  // 11. DESIGNATIONS
  console.log('\n--- DESIGNATION ROUTES ---');
  await testEndpoint('GET', '/designations');

  // 12. ATTENDANCE
  console.log('\n--- ATTENDANCE ROUTES ---');
  await testEndpoint('GET', '/attendance');
  await testEndpoint('GET', '/attendance/today');
  await testEndpoint('GET', '/attendance/my-history');

  // 13. LEAVES
  console.log('\n--- LEAVE ROUTES ---');
  await testEndpoint('GET', '/leaves/types');
  await testEndpoint('GET', '/leaves/balances/my');
  await testEndpoint('GET', '/leaves/requests/my');
  await testEndpoint('GET', '/leaves/requests');
  await testEndpoint('GET', '/leaves/requests/pending');
  await testEndpoint('GET', '/leaves/holidays');

  // 14. SHIFTS
  console.log('\n--- SHIFT ROUTES ---');
  await testEndpoint('GET', '/shifts');

  // 15. PAYROLL
  console.log('\n--- PAYROLL ROUTES ---');
  await testEndpoint('GET', '/payroll');
  await testEndpoint('GET', '/payroll/grades');  // Fixed: was /payroll/settings
  await testEndpoint('GET', '/payroll/payslips/my');

  // 16. PAYMENTS
  console.log('\n--- PAYMENT ROUTES ---');
  await testEndpoint('GET', '/payments/subscription');
  await testEndpoint('GET', '/payments/subscription/history');  // Fixed: was /payments/history
  await testEndpoint('GET', '/payments/settings');

  // 17. PERFORMANCE
  console.log('\n--- PERFORMANCE ROUTES ---');
  await testEndpoint('GET', '/performance/reviews');
  await testEndpoint('GET', '/performance/goals');

  // 18. TRAINING
  console.log('\n--- TRAINING ROUTES ---');
  await testEndpoint('GET', '/training/programs');

  // 19. RECRUITMENT
  console.log('\n--- RECRUITMENT ROUTES ---');
  await testEndpoint('GET', '/recruitment/jobs');
  await testEndpoint('GET', '/recruitment/applications');

  // 20. ASSETS
  console.log('\n--- ASSET ROUTES ---');
  await testEndpoint('GET', '/assets');
  await testEndpoint('GET', '/assets/categories');

  // 21. INVENTORY
  console.log('\n--- INVENTORY ROUTES ---');
  await testEndpoint('GET', '/inventory/warehouses');  // Fixed: was /inventory/items
  await testEndpoint('GET', '/inventory/categories');

  // 22. EXPENSES
  console.log('\n--- EXPENSE ROUTES ---');
  await testEndpoint('GET', '/expenses');
  await testEndpoint('GET', '/expenses/categories');

  // 23. INVOICES
  console.log('\n--- INVOICE ROUTES ---');
  await testEndpoint('GET', '/invoices');

  // 24. BILLS
  console.log('\n--- BILL ROUTES ---');
  await testEndpoint('GET', '/bills');

  // 25. LOANS
  console.log('\n--- LOAN ROUTES ---');
  await testEndpoint('GET', '/loans');
  await testEndpoint('GET', '/loans/my');

  // 26. BENEFITS
  console.log('\n--- BENEFIT ROUTES ---');
  await testEndpoint('GET', '/benefits');
  await testEndpoint('GET', '/benefits/my');

  // 27. REIMBURSEMENTS
  console.log('\n--- REIMBURSEMENT ROUTES ---');
  await testEndpoint('GET', '/reimbursements');
  await testEndpoint('GET', '/reimbursements/my');

  // 28. EVENTS
  console.log('\n--- EVENT ROUTES ---');
  await testEndpoint('GET', '/events');
  await testEndpoint('GET', '/events/calendar');

  // 29. COMMUNICATIONS
  console.log('\n--- COMMUNICATION ROUTES ---');
  await testEndpoint('GET', '/communications/announcements');

  // 30. TASKS
  console.log('\n--- TASK ROUTES ---');
  await testEndpoint('GET', '/tasks');
  await testEndpoint('GET', '/tasks/my');

  // 31. APPROVALS
  console.log('\n--- APPROVAL ROUTES ---');
  await testEndpoint('GET', '/approvals/chains');  // Fixed: was /approvals
  await testEndpoint('GET', '/approvals/requests/my-requests');

  // 32. ONBOARDING
  console.log('\n--- ONBOARDING ROUTES ---');
  await testEndpoint('GET', '/onboarding/templates');
  await testEndpoint('GET', '/onboarding/my');

  // 33. QUERIES
  console.log('\n--- QUERY ROUTES ---');
  await testEndpoint('GET', '/queries');
  await testEndpoint('GET', '/queries/my');

  // 34. WALLETS
  console.log('\n--- WALLET ROUTES ---');
  await testEndpoint('GET', '/wallets');  // Fixed: was /wallets/balance
  await testEndpoint('GET', '/wallets/fund-requests');
  await testEndpoint('GET', '/wallets/stats/summary');

  // 35. PROCUREMENT
  console.log('\n--- PROCUREMENT ROUTES ---');
  await testEndpoint('GET', '/procurement/requisitions');

  // 36. BOOKKEEPING
  console.log('\n--- BOOKKEEPING ROUTES ---');
  await testEndpoint('GET', '/bookkeeping/accounts');

  // 37. WORKFLOW ENGINE
  console.log('\n--- WORKFLOW ENGINE ROUTES ---');
  await testEndpoint('GET', '/workflow-engine/categories');  // Fixed: was /workflow-engine/definitions
  await testEndpoint('GET', '/workflow-engine/templates');

  // Print Summary
  console.log('\n========================================');
  console.log('           TEST SUMMARY');
  console.log('========================================');

  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;

  console.log(`Total Tests: ${testResults.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n--- FAILED TESTS ---');
    testResults.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ✗ [${r.method}] ${r.endpoint}: ${r.message}`);
    });
  }

  console.log('\n========================================\n');
};

runTests();
