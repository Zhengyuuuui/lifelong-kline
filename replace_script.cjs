const fs = require('fs');
let content = fs.readFileSync('services/geminiService.ts', 'utf8');
content = content.replace(/const errStr = \`\\\$\\{error\?\\.message \\|\\| ""\\} \\\$\\{error\?\\.status \\|\\| ""\\} \\\$\\{error\?\\.code \\|\\| ""\\} \\\$\\{error\?\\.statusCode \\|\\| ""\\}\`;/g, 'const errStr = `${error?.message || ""} ${error?.status || ""} ${error?.code || ""} ${error?.statusCode || ""} ${JSON.stringify(error)}`;');
fs.writeFileSync('services/geminiService.ts', content);

let faceContent = fs.readFileSync('valuationOriented/services/faceService.ts', 'utf8');
faceContent = faceContent.replace(/console\.error\("Gemini API Error:", error\);/g, 'if(JSON.stringify(error).includes("429")||error?.status===429){console.warn("Gemini API Quota Error:", error);}else{console.error("Gemini API Error:", error);}');
fs.writeFileSync('valuationOriented/services/faceService.ts', faceContent);

console.log("Done");
