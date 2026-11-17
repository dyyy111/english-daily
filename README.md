# English Daily — 私人英文聽力複習 PWA

## 功能
- 每天自動安排 1 個新單元與到期複習（預設五階段：1、3、7、14、30 天）
- 針對複習評分：困難（明日再複習）、普通（進入下一階段）、簡單（延長下一次間隔）
- 已經學過一部分：設定下一個新學單元，並批次加入舊單元的複習
- 當日完成、14 天排程、離線 App 介面、JSON 備份及還原
- 匯入影片標題與網址（每行 `標題<TAB>https://youtube.com/watch?v=...`，也可只貼 URL 或 JSON）

## 播放清單資料限制
預設 50 個暫定編號，**並非已核對的 YouTube 影片清單**。可從設定頁匯入實際影片資料。清單網址：https://www.youtube.com/playlist?list=PLOB7G19x6JpPcNiPj7llUNQPrtbbcpVVN

## 部署方式（GitHub Pages）
1. 在 GitHub 建立公開 repository（例如 `english-daily`）。
2. 上傳此資料夾內所有檔案到 repository 根目錄（不要只上傳 ZIP）。
3. Settings → Pages → Build and deployment → Deploy from a branch → main / (root) → Save。
4. 待 GitHub Pages 網站啟用，Safari 開啟 `https://你的帳號.github.io/english-daily/`。
5. Safari「分享」→「加入主畫面」。

亦可使用其他提供 HTTPS 的靜態網站平台部署。無需後端、帳號或 Apple Developer 年費。部署到公開 GitHub Pages 時，**原始程式可公開，手機上的 localStorage 學習紀錄不會自動上傳到 GitHub**。

## 注意
- YouTube 影片播放需連網；離線能力僅涵蓋 App 介面與已儲存學習紀錄。
- 此版本不提供關閉 App 後的系統推播，需開啟 App 查看今日任務。
- 單日新單元在第一次開啟 App 時配置；錯過的日期不自動補配新單元。複習逾期會保留。
- 「完成新學」代表當日學習片段已完成，不一定代表整段 30 題全做完。
- 更換裝置不會同步，務必定期匯出 JSON 備份。
