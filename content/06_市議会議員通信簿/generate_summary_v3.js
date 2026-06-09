const fs = require('fs');
const path = require('path');

const baseDir = "C:\\Users\\user\\Documents\\open-iruma\\00.open-iruma";
const folder = path.join(baseDir, "06_市議会議員通信簿");
const membersFolder = path.join(baseDir, "01_議員名鑑_Members");

// 1. Get all current members
const memberFiles = fs.readdirSync(membersFolder).filter(f => f.endsWith('.md') && !f.startsWith('1.'));
const members = memberFiles.map(f => {
    let pureName = f.replace('.md', '');
    return {
        fileName: f,
        pureName: pureName,
        displayName: pureName.replace(/([あ-んア-ン])([あ-んア-ン])/g, '$1 $2') // naive formatting, not critical since we use pureName mainly
    };
});

// 2. Read all communication books
const commFiles = fs.readdirSync(folder).filter(f => f.match(/^\d{2}_通信簿_.*?\.md$/));

let results = [];

members.forEach(member => {
    // Find matching communication book
    let matchedFile = commFiles.find(cf => cf.includes(member.pureName));
    
    let count = 0;
    let themes = [];
    let cats = [];
    let link = "-";
    
    if (matchedFile) {
        let content = fs.readFileSync(path.join(folder, matchedFile), 'utf-8');
        let isZero = content.includes("一般質問の登壇実績はありません") || !content.includes("**テーマ:");
        
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
        // User requested link format: [[./03_通信簿_安道佳子]]
        link = `[[./${matchedFile.replace('.md', '')}]]`;
    } else {
        // No communication book exists for this member
        // Link to their member profile instead
        link = `[[../01_議員名鑑_Members/${member.pureName}]]`;
    }

    // Determine display name formatting with space
    // Let's read the frontmatter member_name if possible to get the exact spaced name
    let memberContent = fs.readFileSync(path.join(membersFolder, member.fileName), 'utf-8');
    let nameMatch = memberContent.match(/member_name:\s*"(.*?)"/);
    let displayName = nameMatch ? nameMatch[1] : member.pureName;

    results.push({
        Name: displayName,
        QuestionCount: count,
        Themes: themes,
        Categories: [...new Set(cats)],
        Link: link
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

    markdown += `| **${item.Name}** | ${item.QuestionCount}回 | ${themeStr} | ${catStr} | ${item.Link} |\n`;
});

markdown += `

> [!NOTE] 評価・分析について
> こちらの通信簿一覧は、単なる「質問の多さ」ではなく「どのようなテーマに注力しているか」「どのようなカテゴリで活動しているか」の可視化を主目的としています。各議員の個別通信簿ページにて、より詳細なAIによる発言内容の分類と評価をご確認いただけます。
`;

fs.writeFileSync(path.join(folder, "2025年度_市議会議員通信簿.md"), markdown, 'utf-8');
console.log("Summary properly generated mapping all active members.");
