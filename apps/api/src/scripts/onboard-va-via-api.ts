import axios from 'axios';

const BASE = 'https://revalidate-api.fly.dev/api/v1';
const email = 'va@example.com';
const password = process.argv[2] || 'Revalidate!234';

async function main() {
  try {
    console.log('Logging in as', email);
    const login = await axios.post(`${BASE}/auth/login`, { email, password }, { timeout: 15000 });
    if (!login.data || !login.data.success) {
      console.error('Login failed:', login.data || login.statusText);
      process.exitCode = 1;
      return;
    }
    const token = login.data.data.token;
    console.log('Got token');

    // Step 1: professional role
    console.log('Submitting onboarding step-1: professional_role=pharmacist');
    const s1 = await axios.post(`${BASE}/users/onboarding/step-1`, { professional_role: 'pharmacist' }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('Step1 response:', s1.data?.message || s1.status);

    // Step 3: professional details
    console.log('Submitting onboarding step-3');
    const step3payload = {
      gmc_registration_number: 'PHARM-12345',
      revalidation_date: '2027-01-01',
      work_setting: '4',
      scope_of_practice: 'Community',
      professional_registrations: 'Pharmacy Council',
      registration_reference_pin: 'PIN-9876',
    };

    const s3 = await axios.post(`${BASE}/users/onboarding/step-3`, step3payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('Step3 response:', s3.data?.message || s3.status);

    // Verify via /auth/me
    const me = await axios.get(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    console.log('Current user snapshot:', me.data?.data || me.data);
  } catch (err: any) {
    console.error('Failed during onboarding via API:', err?.response?.data || err?.message || err);
    process.exitCode = 1;
  }
}

main();
