const http = require('http');
http.get('http://localhost:3000/en/analytics/demo/instagram', (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data+=chunk);
  res.on('end', () => console.log('Length:', data.length));
}).on('error', console.error);
