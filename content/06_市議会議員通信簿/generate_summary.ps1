$folder = "C:\Users\user\Documents\open-iruma\00.open-iruma\06_市議会議員通信簿"
$jsonFile = "$folder\temp_summary.json"
$data = Get-Content -Path $jsonFile -Raw -Encoding UTF8 | ConvertFrom-Json

$markdown = @"
---
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
"@

foreach ($item in $data) {
    # Clean up name
    $name = $item.Name -replace "（.*?）","" -replace "議員","" -replace "　"," "
    $name = $name.Trim()
    
    $link = "[[./$($item.FileName -replace '\.md','')|個別通信簿]]"
    
    # Process themes to make them readable (first 2, then "など")
    $themeArray = $item.Themes -split " / "
    $themeStr = ""
    if ($themeArray.Length -gt 2) {
        $themeStr = "$($themeArray[0])<br>$($themeArray[1])<br>など"
    } else {
        $themeStr = $themeArray -join "<br>"
    }
    
    # Process categories (unique ones)
    $catMatches = [regex]::Matches($item.Categories, "`(.*?)`")
    $uniqueCats = @()
    foreach ($m in $catMatches) {
        $val = $m.Groups[1].Value
        if ($uniqueCats -notcontains $val) {
            $uniqueCats += $val
        }
    }
    $catStr = ""
    foreach ($c in $uniqueCats) {
        $catStr += "`\`$c`\` "
    }
    $catStr = $catStr.Trim()

    $markdown += "`n| **$name** | $($item.QuestionCount)回 | $themeStr | $catStr | $link |"
}

$markdown += @"

> [!NOTE] 評価・分析について
> こちらの通信簿一覧は、単なる「質問の多さ」ではなく「どのようなテーマに注力しているか」「どのようなカテゴリで活動しているか」の可視化を主目的としています。各議員の個別通信簿ページにて、より詳細なAIによる発言内容の分類と評価をご確認いただけます。
"@

[IO.File]::WriteAllText("$folder\2025年度_市議会議員通信簿.md", $markdown, [Text.Encoding]::UTF8)
Remove-Item $jsonFile
