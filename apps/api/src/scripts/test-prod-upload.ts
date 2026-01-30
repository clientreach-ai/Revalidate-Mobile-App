import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';

const BASE_URL = 'https://revalidate-api.fly.dev';
const credentials = {
    email: 'dawit.dev.gg@gmail.com',
    password: 'yordanos'
};

async function testUpload() {
    try {
        console.log(`Authenticating as ${credentials.email}...`);
        const loginRes = await axios.post(`${BASE_URL}/api/v1/auth/login`, credentials);

        if (!loginRes.data.success) {
            console.error('Login failed:', loginRes.data);
            return;
        }

        const token = loginRes.data.data.token;
        console.log('Login successful. Uploading test image...');

        const form = new FormData();
        const filePath = path.join(process.cwd(), 'test_image.jpg');
        form.append('file', fs.createReadStream(filePath));
        form.append('title', 'Production Test Image');
        form.append('category', 'general');

        const uploadRes = await axios.post(`${BASE_URL}/api/v1/documents/upload`, form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });

        if (uploadRes.data.success) {
            console.log('✅ SUCCESS: Image uploaded successfully!');
            console.log('Returned Data:', uploadRes.data.data);

            const fileUrl = uploadRes.data.data.document;
            if (fileUrl) {
                console.log(`Verifying URL access: ${fileUrl}`);
                const verifyRes = await axios.head(fileUrl);
                if (verifyRes.status === 200) {
                    console.log('✅ SUCCESS: Image URL is accessible!');
                } else {
                    console.error(`❌ FAILURE: URL returned status ${verifyRes.status}`);
                }
            } else {
                console.error('❌ FAILURE: No document URL returned in response');
            }
        } else {
            console.error('❌ FAILURE: Upload API returned success: false', uploadRes.data);
        }

    } catch (error: any) {
        console.error('❌ FAILURE Error:', error.response?.data || error.message);
    }
}

testUpload();
