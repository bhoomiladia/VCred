const fs = require('fs');
fetch('http://localhost:3000/api/verify/search?q=0x123')
.then(res => res.json())
.then(console.log)
.catch(console.error);
