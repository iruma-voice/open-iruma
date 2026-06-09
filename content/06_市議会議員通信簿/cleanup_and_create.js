const fs = require('fs');
const path = require('path');

const folder = "C:\\Users\\user\\Documents\\open-iruma\\00.open-iruma\\06_市議会議員通信簿";
const membersFolder = "C:\\Users\\user\\Documents\\open-iruma\\00.open-iruma\\01_議員名鑑_Members";

// 1. Remove boilerplate from existing communication books
const files = fs.readdirSync(folder).filter(f => f.match(/^\d{2}_通信簿_.*?\.md$/));

let stringToRemove1 = "、フェーズ2の運用フローに基づき、対象期間に行われた全4回の一般質問を「1名分の通信簿データ」としてAI処理（要約・構造化・タグ付け）した結果のサンプルです。";
let stringToRemove2 = "1年間の議員の活動量と注力テーマが一覧で把握できるボリューム感となります。";

files.forEach(file => {
    let filePath = path.join(folder, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Replace with empty string. We can also use regex to remove any extra newlines
    let regex = /、フェーズ2の運用フローに基づき[\s\S]*?ボリューム感となります。/g;
    
    if (content.match(regex) || content.includes(stringToRemove1)) {
        content = content.replace(regex, "");
        content = content.replace(stringToRemove1, "");
        content = content.replace(stringToRemove2, "");
        
        // Clean up possible triple empty lines left behind
        content = content.replace(/\n{3,}/g, "\n\n");
        
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Cleaned up boilerplate in ${file}`);
    }
});

// 2. Identify missing active members and create their files
const memberFiles = fs.readdirSync(membersFolder).filter(f => f.endsWith('.md') && !f.startsWith('1.'));
const members = memberFiles.map(f => f.replace('.md', ''));

let nextId = 24; // We have up to 23

members.forEach(member => {
    // Check if communication book exists
    let exists = files.some(f => f.includes(member));
    if (!exists) {
        let newFileName = `${nextId.toString().padStart(2, '0')}_通信簿_${member}.md`;
        let newFilePath = path.join(folder, newFileName);
        
        let template = `---
title: "通信簿：${member}"
tags:
  - type/通信簿
  - year/2025-2026
---
# 市議会議員通信簿：個別データ
**対象議員:** [[../01_議員名鑑_Members/${member}|${member} 議員]]
**対象期間:** 2025年6月〜2026年3月（過去1年分）

※本期間における一般質問の登壇実績はありません。
（議長・副議長等の役職就任、あるいは改選等により一般質問を行わない立場にあった可能性を含みます）

---
`;
        fs.writeFileSync(newFilePath, template, 'utf-8');
        console.log(`Created new communication book for missing member: ${newFileName}`);
        nextId++;
    }
});

console.log("Process complete.");
