const fs = require('fs');
const path = require('path');

const baseDir = "C:\\Users\\user\\Documents\\open-iruma\\00.open-iruma";
const folder = path.join(baseDir, "06_市議会議員通信簿");
const membersFolder = path.join(baseDir, "01_議員名鑑_Members");

// Get all current members by checking files in 01_議員名鑑_Members
const memberFiles = fs.readdirSync(membersFolder).filter(f => f.endsWith('.md'));
const validMemberNames = memberFiles.map(f => f.replace('.md', ''));

const files = fs.readdirSync(folder).filter(f => f.match(/^\d{2}_通信簿_.*?\.md$/));

let results = [];

files.forEach(file => {
    let content = fs.readFileSync(path.join(folder, file), 'utf-8');
    
    // Extract name
    let nameMatch = content.match(/\*\*対象議員:\*\* \[\[.*?\|(.*?)\]\]/);
    let name = nameMatch ? nameMatch[1].replace(/（.*?）/g, "").replace(/議員/g, "").replace(/　/g, " ").trim() : file.replace(/^\d{2}_通信簿_/, "").replace(".md", "");
    
    // Check if name is in the valid members list
    // The name in memberFiles is without spaces, e.g. "佐藤匡.md"
    // So we can check against `name.replace(/\s+/g, '')`
    let pureName = name.replace(/\s+/g, '');
    let isCurrentMember = validMemberNames.some(vName => vName === pureName);
    
    // Some names might have different variations.
    // E.g., name is "古仲 リカ", validMemberNames is "古仲リカ"
    // "双木 小百合" -> "双木小百合"
    if (!isCurrentMember) {
        // Let's also check if any validMemberName is a substring or matches the pureName
        return; // Skip if not a current member
    }
    
    // Check if zero count
    let isZero = content.includes("一般質問の登壇実績はありません") || !content.includes("**テーマ:");
    
    let count = 0;
    let themes = [];
    let cats = [];
    
    if (!isZero) {
        let themeMatches = [...content.matchAll(/\*\*テーマ:\s*(.*?)\*\*/g)];
        count = themeMatches.length;
        themes = themeMatches.map(m => m[1].trim());
        
        let catMatches = [...content.matchAll(/\* カテゴリ:\s*(.*?)(\r|\n)/g)];
        catMatches.forEach(m => {
            let tags = [...m[1].matchAll(/`(.*?)`/g)].map(t => t[1]);
            cats.push(...tags);
        });
    }

    results.push({
        FileName: file,
        Name: name,
        QuestionCount: count,
        Themes: themes,
        Categories: [...new Set(cats)]
    });
});

let markdown = `---
title: "2025年度 市議会議員通信簿一覧"
tags:
  - type/通信簿
  - year/2025-2026
---

# 2025年度 市議会議員通信簿一覧

対象期間: 2025年6月〜2026年3月（直近1年間の全4定例会）
各議員の1年間の一般質問（発言）回数と、主に取り組んだテーマ・カテゴリを一覧化しています。

| 議員名 | 年間質問回数 | 主な質問・発言テーマ | 注力カテゴリ | 詳細リンク |
| :--- | :---: | :--- | :--- | :--- |
`;

results.forEach(item => {
    let link = `[[./${item.FileName.replace('.md', '')}|個別通信簿]]`;
    
    let themeStr = "（登壇なし）";
    if (item.QuestionCount > 0) {
        if (item.Themes.length > 2) {
            themeStr = `${item.Themes[0]}<br>${item.Themes[1]}<br>など`;
        } else {
            themeStr = item.Themes.join("<br>");
        }
    }
    
    let catStr = "-";
    if (item.Categories.length > 0) {
        catStr = item.Categories.map(c => `\`${c}\``).join(" ");
    }

    markdown += `| **${item.Name}** | ${item.QuestionCount}回 | ${themeStr} | ${catStr} | ${link} |\n`;
});

markdown += `

> [!NOTE] 評価・分析について
> こちらの通信簿一覧は、単なる「質問の多さ」ではなく「どのようなテーマに注力しているか」「どのようなカテゴリで活動しているか」の可視化を主目的としています。各議員の個別通信簿ページにて、より詳細なAIによる発言内容の分類と評価をご確認いただけます。
`;

fs.writeFileSync(path.join(folder, "2025年度_市議会議員通信簿.md"), markdown, 'utf-8');
console.log("Summary properly generated: Only active members included.");
