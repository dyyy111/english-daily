# English Daily v4 — Supabase 自動同步版

私人使用的 TOEIC Listening PWA，內建由使用者提供 CSV 核對的 TOEIC 01～50 影片連結，**不含介紹影片**。

## 主要功能

- 1 個新單元／天；複習階段 +1、+3、+7、+14、+30 天。
- 「困難」重回 +1 天；可在單元頁手動重置任意已學單元（+30 天結束也可以重來）。
- 今日完成可以取消並恢復該次完成前的進度。
- 預設第 1～5 集學過；2026/11/17 已複習 1、2；下一新學單元為 6。若已有舊版紀錄，會優先保留舊版本機資料。
- 本機儲存、JSON 匯出／還原、Supabase Email 登入與跨裝置同步。
- 版本檢查：如果其他裝置修改了雲端資料，自動同步會暫停並要求使用者選擇下載或上傳，避免無聲覆蓋。

## 1. 建立 Supabase 專案

1. 開啟 https://supabase.com/dashboard，建立帳號並點 **New project**。
2. 選擇自己的 Organization，輸入專案名稱（如 `english-daily`）、自訂資料庫密碼、選擇 Region，建立專案。
3. 在 **SQL Editor → New query**，貼上 `supabase-setup.sql` 全部內容並按 **Run**。會建立 `learning_state` 資料表、Row Level Security (RLS) 和版本檢查函式。
4. 在 **Project Settings / Connect / API Keys** 找到 **Project URL** 與 **Publishable key**（`sb_publishable_...`）。**不要使用 Secret key (`sb_secret_...`) 或 legacy `service_role` key。**
5. 在 **Authentication → Providers → Email** 確認 Email 登入已啟用。預設啟用 email confirmation 時，註冊後需收驗證信。
6. 在 **Authentication → URL Configuration** 設定 Site URL 為 `https://你的GitHub帳號.github.io/english-daily/`，也可以加到 Redirect URLs（依帳號驗證連結需求）。

## 2. 上傳至 GitHub Pages

1. 解壓縮 ZIP，**上傳檔案本身到 repository 的最外層**：`index.html`, `app.js`, `cloud.js`, `playlist.js`, `supabase-config.js`, `supabase-setup.sql`, `sw.js`, `manifest.webmanifest`, icon PNG, README.md。
2. GitHub Repository → **Settings → Pages** → Source `Deploy from a branch`，Branch `main`，Folder `/ (root)` → Save。
3. 開啟 `https://你的GitHub帳號.github.io/english-daily/`。
4. iPhone Safari → 分享 → **加入主畫面**。

## 3. 設定登入和同步

1. 打開 App → **設定** → **Supabase 雲端同步**。
2. 展開 **設定 Supabase**，填入 Project URL 與 Publishable key → **儲存設定並連線**。這兩個是公開用途的設定，可安全放到前端（需要 RLS 保護資料），**密碼不可放 GitHub**。
3. 在 App 用 Email + 密碼註冊，若收驗證信就先驗證再登入。
4. 首次雲端沒有紀錄時，App 會自動上傳本機進度。
5. 如果雲端已有紀錄且不同，App 會暫停自動同步，讓你先 **匯出備份**，再選 **下載雲端紀錄** 或 **上傳本機紀錄**。
6. 之後每次完成、取消、評分、重置等會儲存到 localStorage，並在有網路時自動同步。

若不想每台設備都重新輸入 Project URL／Publishable key，可以編輯 `supabase-config.js`，寫入你自己的公開設定後提交到 GitHub。**不要提交帳號密碼或 Secret key**。

## 限制與資料安全

- App 優先在本機寫入。沒網路、Supabase 服務中斷時本機依然可使用，網路恢復且登入狀態有效時會嘗試同步；需留意錯誤訊息。
- 多裝置離線同時編輯時不能自動合併單元紀錄；為避免資料遺失，會提示衝突並讓使用者手動選擇整份資料。覆蓋前一定要下載 JSON 備份。
- 不保證 Safari 清除網站資料後能保留未同步修改。建議定期匯出 JSON 到 iCloud Drive。
- 使用 Email 密碼登入，密碼由 Supabase Auth 管理，App 不另外儲存登入密碼。
- GitHub Pages 只負責公開託管 App 程式，個人學習紀錄寫入個人 Supabase 專案，資料列由 RLS 限定登入使用者。
- 影片播放仍需網路；離線僅可使用快取 App 介面與本機紀錄；不包含系統推播。
- 需要 Supabase 專案自己的公開 URL 與 key 才能實際測試雲端連線；本次沒有存取你的 Supabase 專案。
