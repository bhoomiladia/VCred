const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

async function upload() {
  const filePaths = ["./public/vcred-nft-logo.png", "./public/vcred-nft-logo.svg"].filter(p => fs.existsSync(p));
  if (filePaths.length === 0) {
    console.log("No logo file found");
    return;
  }
  const filePath = filePaths[0];
  const fileStream = fs.createReadStream(filePath);
  
  const FormData = require('form-data');
  const data = new FormData();
  data.append('file', fileStream);
  
  try {
    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PINATA_JWT}`
      },
      body: data
    });
    const result = await res.json();
    console.log("RESULT_CID:", result.IpfsHash);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
upload();
