const fs = require('fs');
let text = fs.readFileSync('services/geminiService.ts', 'utf8');

const badStr = "const errStr = `${error?.message || \"\"} ${error?.status || \"\"} ${error?.code || \"\"} ${error?.statusCode || \"\"} ${JSON.stringify(error)}`;";

const lines = text.split('\n');
const fixedLines = lines.map(line => {
  if (line.trim() === badStr) {
    return line; // keep it if it's the standalone assignment
  }
  // Line 290
  if (line.includes('真实场景还原')) {
    return line.split(badStr).join('`');
  }
  // Line 311, 353, 795
  if (line.includes('if (char ===') || line.includes('const match = repaired.match') || line.includes('fate_log_markdown:')) {
    return line.split(badStr).join('\\');
  }
  return line;
});

// Now we apply the correct replacement on lines 611, 769, 838 which were missed because they had `const errStr = ...` without JSON.stringify
const oldStr = "const errStr = `${error?.message || \"\"} ${error?.status || \"\"} ${error?.code || \"\"} ${error?.statusCode || \"\"}`;";
const newStr = badStr;

let finalText = fixedLines.join('\n');
finalText = finalText.split(oldStr).join(newStr);

fs.writeFileSync('services/geminiService.ts', finalText);

// Same for valuationOriented faceService
let face = fs.readFileSync('valuationOriented/services/faceService.ts', 'utf8');
face = face.split('if(JSON.stringify(error).includes("429")||error?.status===429){console.warn("Gemini API Quota Error:", error);}else{console.error("Gemini API Error:", error);}').join('console.error("Gemini API Error:", error);'); // reset first to be safe
face = face.split('console.error("Gemini API Error:", error);').join('if (JSON.stringify(error).includes("429") || error?.status === 429) { console.warn("Gemini API Quota Error:", error); } else { console.error("Gemini API Error:", error); }');
fs.writeFileSync('valuationOriented/services/faceService.ts', face);

// Smooth Sailing
let aiText = fs.readFileSync('SmoothSailingToday/services/ai.ts', 'utf8');
aiText = aiText.split('console.error("AI Analysis Failed:", error);').join('if (JSON.stringify(error).includes("429") || error?.status === 429) { console.warn("AI Analysis Quota Error:", error); } else { console.error("AI Analysis Failed:", error); }');
// Also AI analysis in SmoothSailingToday Family Motto
aiText = aiText.split('console.error("Family Motto Generation Failed", e);').join('if (JSON.stringify(e).includes("429") || e?.status === 429) { console.warn("Family Motto Quota Error:", e); } else { console.error("Family Motto Generation Failed", e); }');
// Also Emergency Search
aiText = aiText.split('console.error("Emergency Search Failed", e);').join('if (JSON.stringify(e).includes("429") || e?.status === 429) { console.warn("Emergency Search Quota Error:", e); } else { console.error("Emergency Search Failed", e); }');
// Also Role Deeds
aiText = aiText.split('console.error("Role Deeds Generation Failed, using fallback:", e);').join('if (JSON.stringify(e).includes("429") || e?.status === 429) { console.warn("Role Deeds Quota Error:", e); } else { console.error("Role Deeds Generation Failed, using fallback:", e); }');

fs.writeFileSync('SmoothSailingToday/services/ai.ts', aiText);

console.log("Fixed!");
