# 正式站台驗收報告

測試時間：2026-11-23 11:14–11:15（Asia/Taipei）。

測試站台：<https://yyyunx.github.io/web-programming-homeworks/>

應用程式受測版本：`7a3a700`。此後的報告提交只更新文件、測試程式、證據及截圖，應用 HTML 與建置程式不變。

## 部署與網址

Public Repository：<https://github.com/yyyunx/web-programming-homeworks>。GitHub Pages Source 設為 GitHub Actions；HTTPS 強制開啟。

- [.github/workflows/pages.yml](../.github/workflows/pages.yml) 於 `main` push、手動執行、每小時第 17 分執行。
- [受測版本的成功部署](https://github.com/yyyunx/web-programming-homeworks/actions/runs/45104675224)。
- 首頁與七個作業全部 HTTP 200；部署後亦比對 HTML SHA-256 與本機檔案。參見 [URL 證據](verification/live-urls.json)。
- AQI 建置擷取環境部公開預覽資料，產生同站 JSON，無需新增 API key；本次實測 84 個測站，正式快照的資料時間為 2026/11/23 11:00:00（臺北時間）。資料時間由官方 payload 決定，頁面顯示完整臺北時間與資料過舊警示。排程觸發可能被 GitHub 延遲；已實測 push 觸發的建置、擷取與部署成功，未等待未來每一次排程。

## 正式站台瀏覽器驗收

使用 Playwright + Chromium 156，獨立 Browser Context，桌面 1440 × 1000、手機模擬 390 × 844 與 320 × 844。未跳過 TLS 驗證；測試環境使用既有代理 CA 信任。

| 驗收項目 | 結果 |
| --- | --- |
| Homepage: seven independent project links | 通過 |
| To-do: create/edit/subtask/complete/search/export/import/delete/persistence | 通過 |
| Sticky Notes: add/edit/color/drag/search/grid/delete/persistence | 通過 |
| Cow Game: movement/pause/grass/score/collision/restart/high-score persistence | 通過 |
| Cow Run: real AI model/manual controls/game/synthetic-camera inference/stop | 通過 |
| Information Board: official data/month/search/source dialog/refresh | 通過 |
| AQI: official snapshot/map tiles/search/filter/popup/layer switching/geolocation | 通過 |
| English: listening answers/library/search/CSV/learning-record persistence/native speech capability | 通過 |
| Storage isolation on shared origin | 通過 |
| Responsive layouts and touch controls: 390px | 通過 |
| Responsive layouts and touch controls: 320px | 通過 |

共 11 組驗收通過。未捕捉到未處理的 JavaScript 例外；未發現合併造成的 CSS、JS 或本地資源路徑錯誤。地圖縮放、定位或切換底圖時，部分不再需要的圖磚請求被瀏覽器取消（`ERR_ABORTED`），未出現 HTTP 404／500。另以加強版檢查確認 CARTO 圖磚實際解碼載入成功，見 [底圖驗證](verification/carto-tiles.json)。完整結果與網路觀測見 [browser-results.json](verification/browser-results.json)。

- To-do：新增、編輯、分類／優先級、子任務、完成狀態、重新整理後保存與顯示、搜尋、刪除、JSON 匯出與匯入。
- Sticky Notes：新增、內容編輯、變色、滑鼠拖曳、網格、搜尋、刪除、重新整理後保存、手機新增便利貼。
- Cow Game：開始、暫停、方向鍵、吃草、得分、碰撞結束、重開與最高分保存；手機使用觸控按鈕。吃草測試以 fixture 將草放在下一格，其餘遊戲迴圈照常運作。
- Cow Run：真實 Teachable Machine 模型、metadata、weights 與 PoseNet 載入，模型 labels 為 right／mid／left；實際執行推論，手動換道、鍵盤換道、開始遊戲、關閉串流均通過。攝影機使用 Chromium synthetic camera，影像 640 × 480。
- Information Board：農業部官方農產與認養端點均實際成功，月份、搜尋、來源說明及重新載入認養資料通過。農產約 3,963 筆、狗狗 100 筆（上游內容可變動）。原作沒有地圖功能，保留其資訊卡片設計。
- AQI：同站官方快照、84 個測站 marker、實際 OSM 圖磚、搜尋、AQI 篩選、測站 popup、CARTO 底圖切換與定位 marker；定位使用模擬臺北座標。
- English：正確作答、回饋、單字庫 100 筆、搜尋、CSV 匯出與學習紀錄重新整理後保存。
- LocalStorage：待辦、便利貼、遊戲最高分及英文紀錄共存，key 不衝突。保留原 key，故同一 yyyunx.github.io 網域的舊站與新站會共用對應資料；測試使用隔離 Context，未接觸使用者一般瀏覽器的資料。

## 權限、語音與故障情境

| 檢查 | 結果 |
| --- | --- |
| Native camera denied: clear error without crashing | 通過 |
| Native speech recognition: permission/service failure is displayed | 通過 |
| Mock speech: utterance parameters, recognition result scoring and persistence | 通過 |
| Mock network failure: Board demo labels and broken-image fallback | 通過 |
| Mock AQI failure: explicitly marked demonstration data | 通過 |

共 5 組通過，證據見 [edge-cases.json](verification/edge-cases.json)。

- 原生相機拒絕授權與原生 SpeechRecognition 拒絕授權均顯示可理解的提示。
- 使用 mock 檢查 SpeechSynthesisUtterance 的文字、en-US 與速率，以及語音辨識文字回傳後的評分和保存。這不是實際音訊測試。
- 強制中斷農業 API、圖片及 AQI JSON 請求，驗證圖片降級不產生語法錯誤，示範資料有明確標示。這些屬於模擬故障測試。

## 明確尚未驗證

1. 真實鏡頭裝置與真人左／中／右姿勢的辨識準確度、不同光線及不同硬體。模型載入、推論管線與模擬視訊串流已測。
2. 真實麥克風收音、瀏覽器雲端語音辨識服務及可聽見的發音。測試環境 SpeechSynthesis API 存在，但可用 voices 為 0；無法宣稱已聽到語音。需在有語音引擎的 Chrome／Edge 裝置完成最後人工驗證。
3. 實體 iOS／Android 裝置、Safari／Firefox 及真實 GPS；本次手機驗證為 Chromium viewport 與 touch 模擬。

除上述真實裝置與外部語音服務驗證外，未留有本次自動測試已知的實作缺陷。外部 API、CDN、圖磚及官方公開預覽端點仍是執行時或建置時的依賴；擷取失敗時 Actions 不會取代既有成功部署，資料過舊會在頁面標示。

## Git 歷史與來源保護

- 七個來源以未 squash 的 `git subtree add` 匯入，全部 14 筆原始提交的 SHA、作者、日期與父子關係保留。
- 每個來源 HEAD 均驗證是新 main 的祖先；全部原始提交均可達，原始樹內容不變。另從遠端新 Repo 做 fresh clone，再次確認 14 筆歷史可達。
- [來源 SHA 清單](source-history.json)、[逐提交驗證](verification/history-check.json)、[遠端 clone 驗證](verification/remote-history.json)。
- 七個來源的 refs、Pages URL、部署來源、HTTPS 與其他 Pages 設定，與工作開始時比對完全一致。參見 [來源保護結果](verification/source-protection.json)。未對來源 Repository 發出寫入、刪除、封存、改名或停用 Pages 操作。

## 本次修正

- 重新整理後未渲染 To-do 已保存資料。
- Cow Game 固定畫布在手機超出畫面、方向鍵造成頁面捲動。
- Sticky Notes 手機便利貼被裁切、預設排列與窄螢幕工具列。
- Information Board 的失效 TransList 端點、農產欄位／月份解析、animal_kind 大小寫、逾時後備援請求共用已取消 signal，以及 SVG 圖片 fallback 的 HTML 引號錯誤。搜尋文字亦做 HTML escape。
- AQI 舊 API key 失效及官方 CORS 限制：改以 Actions 建置官方資料快照，加入可見的資料時間、來源及示範／過舊狀態。

## 畫面證據

[桌面首頁](screenshots/home-desktop.png) · [390px 手機首頁](screenshots/home-mobile-390.png) · [320px 便利貼](screenshots/sticky-notes-mobile-320.png) · [手機 AQI 地圖](screenshots/real-time-aqi-map-mobile-390.png)

測試重跑指令見 [README](../README.md#重跑驗收)。
