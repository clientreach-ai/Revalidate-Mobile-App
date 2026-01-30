import axios from 'axios';

const BASE_URL = 'https://revalidate-api.fly.dev';
const credentials = {
    email: 'dawit.dev.gg@gmail.com',
    password: 'yordanos'
};

async function fetchUserImages() {
    try {
        console.log(`Authenticating as ${credentials.email}...`);
        const loginRes = await axios.post(`${BASE_URL}/api/v1/auth/login`, credentials);

        if (!loginRes.data.success) {
            console.error('Login failed:', loginRes.data);
            return;
        }

        const token = loginRes.data.data.token;
        console.log('Login successful. Fetching documents...');

        const docsRes = await axios.get(`${BASE_URL}/api/v1/documents?limit=1000`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!docsRes.data.success) {
            console.error('Failed to fetch documents:', docsRes.data);
            return;
        }

        const documents = docsRes.data.data;
        const images = documents.filter((doc: any) => {
            const isImg = (doc.type && doc.type.includes('image')) ||
                (doc.name && doc.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i)) ||
                (doc.document && doc.document.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i));
            return isImg;
        });

        console.log(`Found ${images.length} images:`);
        images.forEach((img: any, index: number) => {
            console.log(`${index + 1}. ${img.name || 'Unnamed'}`);
            console.log(`   ID: ${img.id}`);
            console.log(`   URL: ${img.document || 'No URL'}`);
            console.log(`   Created At: ${img.created_at}`);
            console.log('---');
        });

    } catch (error: any) {
        console.error('Error:', error.response?.data || error.message);
    }
}

fetchUserImages();
