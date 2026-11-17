# English Daily v11 — 2026-11-17

## v11 更新
- 全部 50 部片名統一為 TOEIC Listening 01–50（不含介紹影片），包括既存雲端、本機資料的顯示名稱。影片 URL、單元 ID、完成進度及複習日期均維持原樣。
- 移除單元卡片次行的 #1 · 等編號前綴。
- 完全移除「📅 排程」分頁與其計算／呈現程式。
- 移除「批次標記以前學過的單元」及該按鈕事件；保留「套用我的 1～5 集進度」與起始單元設定。
- 保留每日指派上限、複習優先／新片優先、+1/+3/+7/+14/+30、完成撤銷、週期重置、卡片點影片及 Supabase 雲端同步。
- 程式快取改 v11，頁首顯示 v11 方便確認版本。

## GitHub Pages 更新
1. 更新前到 App 設定匯出一次 JSON 備份。
2. 解壓縮 ZIP，把裡面的所有檔案**直接上傳到 GitHub repository 根目錄**，覆蓋舊檔，不要上傳 ZIP 或多包一層資料夾。
3. Commit changes，等 GitHub Pages 部署完成，重新載入 `https://dyyy111.github.io/english-daily/?v=11`。
4. 如仍見舊版，使用 Safari 私密分頁核對；iPhone 主畫面 PWA 可能仍有舊快取。

## 儲存與安全
個人學習紀錄預設保存在 localStorage；完成 Supabase 連線／登入且同步成功後會自動備份。不要把 JSON 個人紀錄、secret/service_role key、密碼上傳公開 GitHub。

## 檔案
index.html, app.js, playlist.js, cloud.js, supabase-config.js, sw.js, manifest.webmanifest, icon PNG, supabase-setup.sql, README.md。
