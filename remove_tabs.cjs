const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'components/InsightCardList.tsx');
let content = fs.readFileSync(p, 'utf8');
const lines = content.split('\n');

// Find start of tabs.map
const startIndex = lines.findIndex(l => l.includes('{tabs.map((tab) => {'));
// Find end of tabs.map
const endIndex = lines.findIndex((l, i) => i > startIndex && l.trim() === '})}');

if (startIndex !== -1 && endIndex !== -1) {
    lines.splice(startIndex, endIndex - startIndex + 1);
    fs.writeFileSync(p, lines.join('\n'));
    console.log("Success");
} else {
    console.log("Failed to find boundaries", startIndex, endIndex);
}
