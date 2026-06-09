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
    
    // Extract Manifesto Block
    let manifesto = [];
    let manifestoMatch = memberContent.match(/## 📋 選挙公報・公約([\s\S]*?)(?:\n## |$)/);
    if (manifestoMatch) {
        let block = manifestoMatch[1].replace(/!\[\[.*?\]\]/g, '').trim();
        let lines = block.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('---'));
        manifesto = lines;
    }

    // Find comm book
    let commFiles = fs.readdirSync(commFolder).filter(f => f.match(/^\d{2}_通信簿_.*?\.md$/));
    let matchedFile = commFiles.find(cf => cf.includes(pureName));
    
    let themes = [];
    let responses = [];
    if (matchedFile) {
        let commContent = fs.readFileSync(path.join(commFolder, matchedFile), 'utf-8');
        let themeMatches = [...commContent.matchAll(/\*\*テーマ:\s*(.*?)\*\*/g)];
        themes = themeMatches.map(m => m[1].trim());
        
        let responseMatches = [...commContent.matchAll(/③市側の回答方針([\s\S]*?)(?:---|\*|$)/g)];
        responses = responseMatches.map(m => m[1].trim());
    }

    extraction[pureName] = {
        manifesto: manifesto,
        questions: themes,
        responses: responses.slice(0, themes.length) // match themes to responses
    };
});

fs.writeFileSync(path.join(baseDir, "extraction2.json"), JSON.stringify(extraction, null, 2), 'utf-8');
console.log("Extraction 2 complete.");
