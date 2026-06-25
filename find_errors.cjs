const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory && f !== 'node_modules' && f !== '.git' && f !== 'dist') {
      walkDir(dirPath, callback);
    } else if (!isDirectory && (f.endsWith('.ts') || f.endsWith('.tsx'))) {
      callback(path.join(dir, f));
    }
  });
}

walkDir('.', function(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('console.error')) {
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('console.error(')) {
        console.log(`${filePath}:${i+1}: ${line.trim()}`);
      }
    });
  }
});
