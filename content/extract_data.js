const fs = require('fs');
const path = require('path');

const baseDir = "C:\\Users\\user\\Documents\\open-iruma\\00.open-iruma";
const membersFolder = path.join(baseDir, "01_議員名鑑_Members");
const commFolder = path.join(baseDir, "06_市議会議員通信簿");

const memberFiles = fs.readdirSync(membersFolder).filter(f => f.endsWith('.md') && !f.startsWith('1.'));

let extraction = {};

memberFiles.forEach(file => {
    let pureName = file.replace('.md', '');
    let memberContent = fs.readFileSync(path.join(membersFolder, file), 'utf-8');
    
    // Extract Manifesto
    let manifesto = [];
    let manifestoMatch = memberContent.match(/## 📋 選挙公報・公約([\s\S]*?)(?:---|$)/);
    if (manifestoMatch) {
        let lines = manifestoMatch[1].split('\n');
        lines.forEach(line => {
            line = line.trim();
            if (line.startsWith('*') || line.startsWith('●') || line.startsWith('-')) {
                manifesto.push(line.replace(/^[*●-]\s*/, '').replace(/\[cite.*?\]/, '').replace(/!\[\[.*?\]\]/, '').trim());
            } else if (line.match(/^[\u4e00-\u9faf]/)) {
                // sometimes it's just text
                // manifesto.push(line);
            }
        });
    }

    // Find comm book
    let commFiles = fs.readdirSync(commFolder).filter(f => f.match(/^\d{2}_通信簿_.*?\.md$/));
    let matchedFile = commFiles.find(cf => cf.includes(pureName));
    
    let themes = [];
    if (matchedFile) {
        let commContent = fs.readFileSync(path.join(commFolder, matchedFile), 'utf-8');
        let themeMatches = [...commContent.matchAll(/\*\*テーマ:\s*(.*?)\*\*/g)];
        themes = themeMatches.map(m => m[1].trim());
    }

    extraction[pureName] = {
        manifesto: manifesto.filter(x => x),
        questions: themes
    };
});

fs.writeFileSync(path.join(baseDir, "extraction.json"), JSON.stringify(extraction, null, 2), 'utf-8');
console.log("Extraction complete.");
