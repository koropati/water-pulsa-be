// Create public/swagger directory
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const swaggerDir = path.join(publicDir, 'swagger');

// Create public directory if it doesn't exist
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
  console.log('Created public directory');
}

// Create swagger directory if it doesn't exist
if (!fs.existsSync(swaggerDir)) {
  fs.mkdirSync(swaggerDir);
  console.log('Created public/swagger directory');
}

// Create a placeholder logo only if it doesn't exist
const logoPath = path.join(swaggerDir, 'logo.png');
if (!fs.existsSync(logoPath)) {
  const logoData = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" viewBox="0 0 200 60">
      <rect width="200" height="60" fill="#ffffff"/>
      <text x="20" y="40" font-family="Arial" font-size="28" font-weight="bold" fill="#002850">Sipelayar API</text>
    </svg>`;

  fs.writeFileSync(logoPath, logoData);
  console.log('Created placeholder logo');
}

console.log('Setup completed successfully');