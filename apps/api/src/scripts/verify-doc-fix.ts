import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const API_VERSION = '/api/v1';

async function verifyDocuments() {
    console.log('--- Verifying Documents API ---');
    try {
        // Note: This requires a valid token if testing a real instance.
        // For now, we are just checking if the code structure is correct.
        // If we want to run this against a live server, we'd need to login first.

        console.log('Note: To run this test against a live server, set VALID_TOKEN env var.');
        const token = process.env.VALID_TOKEN;

        if (!token) {
            console.log('Skipping live test - no token provided.');
            return;
        }

        const response = await axios.get(`${BASE_URL}${API_VERSION}/documents`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
            const documents = response.data.data;
            console.log(`Found ${documents.length} documents.`);

            const missingDocument = documents.filter((d: any) => !d.document);
            if (missingDocument.length > 0) {
                console.error(`❌ FAILURE: ${missingDocument.length} documents are missing the "document" field.`);
            } else {
                console.log('✅ SUCCESS: All documents have the "document" field.');
                if (documents.length > 0) {
                    console.log('Sample document:', documents[0]);
                }
            }
        } else {
            console.error('❌ FAILURE: API returned success: false');
        }
    } catch (error: any) {
        console.error('❌ FAILURE: Error calling API:', error.response?.data || error.message);
    }
}

verifyDocuments();
