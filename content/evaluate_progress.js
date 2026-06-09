const fs = require('fs');
const path = require('path');

const baseDir = "C:\\Users\\user\\Documents\\open-iruma\\00.open-iruma";
const commFolder = path.join(baseDir, "06_市議会議員通信簿");
const membersFolder = path.join(baseDir, "01_議員名鑑_Members");

// ─── Step 1: Extract ONLY concrete policy pledges from manifesto ───────────────
// A "concrete pledge" MUST:
//   (A) Start with a recognized policy bullet symbol (◎, ●, ▶, ✔, ■)
//   (B) OR be a short, specific noun-phrase that directly follows ● or ▶ bullets
//       with explicit policy language
//
// Slogans/rhetoric to EXCLUDE:
//   - No policy symbol, and is < 20 chars with no concrete policy keyword
//   - Contains politician's name
//   - Is a campaign slogan (キャッチコピー的)
//
// Policy keywords that indicate a concrete pledge:
const policyKeywords = [
    "無償化", "無料", "設置", "整備", "廃止", "撤回", "見直し", "拡充", "強化", "推進",
    "充実", "改善", "支援", "確保", "導入", "実現", "設立", "維持", "増便", "活用",
    "解決", "取り組み", "対策", "促進", "創設", "削減", "引き下げ", "再開", "延長",
    "構築", "開発", "防止", "保護", "改革", "育成", "配備", "交付", "適正化", "拡大",
    "グラウンド", "エアコン", "給食費", "保育料", "学童保育", "国保税", "てぃーろーど",
    "市民会館", "分館", "統廃合", "公民館", "ワゴン"
];

const symbolRegex = /^[◎●▶✔■◆]/;

function isConcretePolicy(line) {
    const cleaned = line.replace(/^[◎●▶✔■◆・\*\-\s]+/, '').trim();
    
    // Must be substantive (at least 8 chars)
    if (cleaned.length < 8) return false;
    
    // Case A: Starts with policy bullet
    if (symbolRegex.test(line.trim())) {
        // Even among symboled lines, filter out pure slogans like "◎道路等の補修・修繕を適宜届けていきます！"
        // is fine, but something like "◎元気な入間市！" is not - check for policy keywords or length
        const hasPolicyWord = policyKeywords.some(kw => cleaned.includes(kw));
        if (hasPolicyWord) return true;
        // If no policy keyword but long enough with noun context, keep it if > 15 chars
        if (cleaned.length > 15) return true;
    }
    
    // Case B: Lines that have policy keywords but no bullet (explicit policy nouns)
    // e.g. "給食費は無料に！" or "国保税・介護保険料引き下げ"
    const hasPolicyWord = policyKeywords.some(kw => cleaned.includes(kw));
    if (hasPolicyWord && cleaned.length >= 8) return true;
    
    return false;
}

// ─── Step 2: NLP for question-manifesto overlap ─────────────────────────────
const stopWords = new Set(["について", "の", "と", "や", "を", "に", "は", "が", "で",
    "する", "推進", "充実", "整備", "対策", "改善", "向けた", "ゼロ", "・", "/", "、", "。", "！"]);

function extractKeywords(text) {
    let cleaned = text.replace(/[◎✔▶■●◆・]/g, '').trim();
    // Split on common Japanese particles/particles
    let parts = cleaned.split(/[\sのやとをにはがで、。！]+/);
    let keywords = [];
    parts.forEach(p => {
        let word = p.replace(/[（）()「」『』　]/g, '').trim();
        if (word.length >= 2 && !stopWords.has(word)) {
            keywords.push(word);
        }
    });
    return keywords;
}

// ─── Step 3: Process all members ─────────────────────────────────────────────
const memberFiles = fs.readdirSync(membersFolder).filter(f => f.endsWith('.md') && !f.startsWith('1.'));
const commFiles = fs.readdirSync(commFolder).filter(f => f.match(/^\d{2}_通信簿_.*?\.md$/));

// We need to find the minimum remaining count across all members with data
// so we can set a uniform cap
let memberResults = {};

memberFiles.forEach(memberFile => {
    const name = memberFile.replace('.md', '');
    const memberContent = fs.readFileSync(path.join(membersFolder, memberFile), 'utf-8');
    
    // Get raw manifesto block
    let manifestoBlock = '';
    const manifestoMatch = memberContent.match(/## 📋 選挙公報・公約([\s\S]*?)(?:\n## |$)/);
    if (manifestoMatch) {
        manifestoBlock = manifestoMatch[1].replace(/!\[\[.*?\]\]/g, '');
    }

    // Extract ONLY concrete policy pledges
    const rawLines = manifestoBlock.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('---'));
    const concretePolicies = rawLines.filter(isConcretePolicy);

    // Get questions from matching comm book
    const matchedFile = commFiles.find(cf => cf.includes(name));
    let questions = [];
    if (matchedFile) {
        const commContent = fs.readFileSync(path.join(commFolder, matchedFile), 'utf-8');
        const themeMatches = [...commContent.matchAll(/\*\*テーマ:\s*(.*?)\*\*/g)];
        questions = themeMatches.map(m => m[1].trim());
    }

    // Build question keywords
    const questionKeywords = new Set();
    questions.forEach(q => extractKeywords(q).forEach(kw => questionKeywords.add(kw)));

    // Categorize each concrete policy
    let progressed = [];
    let remaining = [];
    concretePolicies.forEach(policy => {
        const pKeywords = extractKeywords(policy);
        const hasOverlap = pKeywords.some(kw => {
            for (let qkw of questionKeywords) {
                if (qkw.length >= 3 && (qkw.includes(kw) || kw.includes(qkw))) return true;
            }
            return false;
        });
        const simpleMatch = questions.some(q => {
            return pKeywords.some(kw => kw.length >= 4 && q.includes(kw));
        });

        const displayText = policy.replace(/^[◎●▶✔■◆・\s]+/, '').trim();
        
        if (hasOverlap || simpleMatch) {
            progressed.push(displayText);
        } else {
            remaining.push(displayText);
        }
    });

    memberResults[name] = { progressed, remaining, questions, matchedFile };
});

// ─── Step 4: Set display cap ─────────────────────────────────────────────────
// We show ALL concrete policy items per member (no artificial cap).
// This is more honest: members with many pledges are fully tracked,
// and members with few pledges naturally have fewer items.
// The note in the section explains this to the reader.
const MAX_REMAINING = 999; // no limit - show all remaining
console.log('Showing all remaining pledges per member (no artificial cap).');

// ─── Step 5: Update each communication book ──────────────────────────────────
for (let name in memberResults) {
    const { progressed, remaining, matchedFile } = memberResults[name];
    if (!matchedFile) continue;

    const filePath = path.join(commFolder, matchedFile);
    let content = fs.readFileSync(filePath, 'utf-8');

    const total = progressed.length + remaining.length;
    const progressRate = total > 0 ? Math.round((progressed.length / total) * 100) : 0;

    // Update frontmatter properties
    const fmUpdate = (prop, val) => {
        if (content.includes(`${prop}:`)) {
            content = content.replace(new RegExp(`${prop}:.*$`, 'm'), `${prop}: ${val}`);
        } else {
            content = content.replace(/^---\s*$/m, `---\n${prop}: ${val}`);
        }
    };
    fmUpdate('progress_rate', progressRate);
    fmUpdate('manifesto_total', total);
    fmUpdate('manifesto_progressed', progressed.length);
    fmUpdate('manifesto_remaining', remaining.length);

    // Build checklist
    let progressedLines = progressed.map(p => `- [x] ${p}`);
    let remainingLines = remaining.map(r => `- [ ] ${r}`);

    const newSection = `## 🎯 公約の進捗トラッキング
**選挙公報・公約の進捗率:** ${total > 0 ? progressRate + '%' : 'データなし'} （具体的公約${total}項目のうち、一般質問で取り上げ・進展があったもの: ${progressed.length}項目）

### 📋 公約チェックリスト（進捗状況）
- ✅ チェック済み = 一般質問で取り上げた・進展が確認できた公約
- ⬜ 未チェック = 未着手または進展が確認できていない公約
（※選挙公報から抽出した具体的な政策公約のみを対象としています）

${progressedLines.join('\n')}${progressedLines.length > 0 ? '\n' : ''}${remainingLines.join('\n')}
`;

    if (content.includes('## 🎯 公約の進捗トラッキング')) {
        content = content.replace(/## 🎯 公約の進捗トラッキング[\s\S]*?(?=---|## 1\.)/, newSection + '\n');
    }

    content = content.replace(/\n{3,}/g, '\n\n');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated: ${matchedFile} | progress=${progressRate}% | pledges=${total} (done=${progressed.length}, remaining=${remaining.length})`);
}

console.log('\n完了: 公約トラッキングの再構築が完了しました。');
