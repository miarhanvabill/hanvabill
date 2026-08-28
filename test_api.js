const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/loyalty/customer?id=4904',
  method: 'GET'
}, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(res.statusCode);
    console.log(data);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});
req.end();
