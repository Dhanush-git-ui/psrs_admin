const axios = require('axios');

async function test() {
  try {
    const response = await axios.get('http://localhost:3000/api/products');
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers['content-type']);
    console.log('Data Type:', typeof response.data);
    console.log('Is Array:', Array.isArray(response.data));
    console.log('Data preview:', JSON.stringify(response.data).substring(0, 500));
  } catch (err) {
    console.error('Request failed:', err.message);
    if (err.response) {
      console.error('Response Status:', err.response.status);
      console.error('Response Body:', err.response.data);
    }
  }
}

test();
