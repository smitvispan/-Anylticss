const http = require('http');
http.get('http://localhost:3000/en/analytics/demo/instagram', (res) => {
  let data = '';
  res.on('data', chunk => data+=chunk);
  res.on('end', () => console.log(data.length));
}).on('error', console.error);
