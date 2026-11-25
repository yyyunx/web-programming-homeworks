# 網頁程式設計課程作品集

保留各作業原有介面、程式與功能，以入口首頁串連日常工具、互動遊戲、開放資料與語音學習。

**作品集首頁：<https://yyyunx.github.io/web-programming-homeworks/>**

## 作品與正式 Demo（建議學習順序：由淺入深）

依各作品實際程式的互動狀態、資料處理、繪圖與外部 API／裝置整合複雜度排序。這是建議的學習順序，相近作品的難度會隨個人經驗而不同。

| 順序 | 作品 | 功能 | 技術與實作重點 | Demo |
| ---: | --- | --- | --- | --- |
| 1 | Fresh Pomodoro  | 可調專注／休息時間、暫停／繼續、重置、音效與分享設定 | 原生 HTML／CSS／JavaScript、計時器、Web Audio API、URLSearchParams | [開啟](https://yyyunx.github.io/web-programming-homeworks/fresh-pomodoro/) |
| 2 | To-do List  | 任務、分類、優先級、子任務與 JSON 匯入匯出 | Tailwind CSS、localStorage、File API | [開啟](https://yyyunx.github.io/web-programming-homeworks/to-do-list/) |
| 3 | Sticky Notes  | 彩色便利貼、搜尋、拖曳與網格排列 | Tailwind CSS、滑鼠／觸控拖曳事件、localStorage | [開啟](https://yyyunx.github.io/web-programming-homeworks/sticky-notes/) |
| 4 | Information Board  | 當季農產與狗狗認養資訊、月份與關鍵字篩選 | Fetch API、農業部開放資料、資料正規化與備援 | [開啟](https://yyyunx.github.io/web-programming-homeworks/information-board/) |
| 5 | Cow Game  | 貪食蛇式闖關、鍵盤／觸控操作與最高分 | Canvas 2D、遊戲迴圈與碰撞、Web Audio API、localStorage | [開啟](https://yyyunx.github.io/web-programming-homeworks/cow-game/) |
| 6 | English Listening & Speaking | 100 個單字與片語、聽力、口說與學習報告 | Web Speech API、語音權限／錯誤處理、localStorage、CSV | [開啟](https://yyyunx.github.io/web-programming-homeworks/english-listening-speaking/) |
| 7 | Real-time AQI Map  | 測站地圖、搜尋、AQI 篩選與定位 | Leaflet、OpenStreetMap／CARTO、Geolocation、環境部資料與 Actions 快照 | [開啟](https://yyyunx.github.io/web-programming-homeworks/real-time-aqi-map/) |
| 8 | Cow Run  | 姿勢辨識、三跑道閃避與手動控制 | TensorFlow.js、Teachable Machine Pose、MediaDevices、即時推論與遊戲迴圈 | [開啟](https://yyyunx.github.io/web-programming-homeworks/cow-run/) |

從番茄鐘的 DOM 操作與計時開始，依序增加資料保存、拖曳、非同步 API、Canvas 遊戲迴圈，再整合語音、地圖／定位，最後進入 AI 模型與鏡頭的即時互動。

## 結構與本機開啟

每個作業都有自己的 `index.html`。首頁使用原生 HTML／CSS，沒有建置依賴。

```text
index.html
fresh-pomodoro/index.html
to-do-list/index.html
sticky-notes/index.html
information-board/index.html
cow-game/index.html
english-listening-speaking/index.html
real-time-aqi-map/index.html
cow-run/index.html
docs/source-history.json
```

```sh
python3 scripts/build_site.py
python3 -m http.server 8000 --directory _site
# 開啟 http://localhost:8000/（建置需網路以取得官方 AQI）
```

## Git 歷史與來源保護

八個來源的預設 `main` 分支以 **git subtree add、不使用 --squash** 匯入。所有原始提交的 SHA、作者、日期及父提交關係保留，來源歷史是整合後 `main` 的祖先。匯入基準與提交數記錄於 [source-history.json](docs/source-history.json)。原始提交在匯入前的路徑仍位於歷史根目錄；要檢視舊檔案可從對應的原始 SHA 查看。

| 來源 Repository | 原始 main 提交數 |
| --- | ---: |
| [yyyunx/Fresh-Pomodoro](https://github.com/yyyunx/Fresh-Pomodoro) | 3 |
| [yyyunx/to-do-list](https://github.com/yyyunx/to-do-list) | 1 |
| [yyyunx/sticky-notes](https://github.com/yyyunx/sticky-notes) | 1 |
| [yyyunx/information-board](https://github.com/yyyunx/information-board) | 1 |
| [yyyunx/cow-game](https://github.com/yyyunx/cow-game) | 2 |
| [yyyunx/english-listening-speaking](https://github.com/yyyunx/english-listening-speaking) | 1 |
| [yyyunx/Real-time-AQI-Map](https://github.com/yyyunx/Real-time-AQI-Map) | 3 |
| [yyyunx/cow-run](https://github.com/yyyunx/cow-run) | 5 |

合計 17 筆原始提交（原有七份作業 14 筆，Fresh-Pomodoro 3 筆），另有初始化、subtree 合併與整合修正提交。來源 Repo、分支、舊 Pages 與舊網址均不變；本專案只寫入新的 `web-programming-homeworks`。

## GitHub Pages 部署

使用 **GitHub Actions**（Settings → Pages → Source: GitHub Actions），工作流程為 [pages.yml](.github/workflows/pages.yml)。推送 `main`、手動執行及每小時第 17 分會觸發部署。建置程式只複製首頁與八個作業到 `_site`，並從環境部官方資料集的公開預覽端點取得 AQI，產生同網域 `real-time-aqi-map/data/aqi.json`，不需要 API key。

原作 AQI key 已失效；改在建置時擷取資料，避免官方 CORS 限制，地圖與篩選介面保留。每個小時的排程可能被 GitHub 延遲；頁面顯示來源、完整資料時間與超過 3 小時的警示。重新整理按鈕重新讀取最近部署的資料快照，無法使上游資料提早更新。若官方來源擷取失敗，workflow 會失敗並保留上次成功的網站，不會部署示範資料冒充即時資料。

站內 Demo 與資料檔使用相對路徑，可在專案 Pages 子目錄執行。保留 `.nojekyll`。

## 瀏覽器功能與資料

- Fresh Pomodoro 的工作／休息分鐘數可經 URL 參數分享（例如 `fresh-pomodoro/?work=25&break=5`）。此版本的設定與完成次數不寫入 localStorage，重新整理會重新開始；音效使用 Web Audio API。
- Cow Run 的模型、TensorFlow.js 與 PoseNet 需要網路；鏡頭需要 HTTPS／localhost 與使用者授權。仍提供手動按鈕和鍵盤控制。
- English 的語音合成依裝置語音引擎；語音辨識建議使用 Chrome／Edge，需麥克風授權與瀏覽器的外部辨識服務。
- AQI 及農業資訊依賴外部 API；備用資料僅為示範，不代表即時數據或真實認養現況。地圖圖磚由 OpenStreetMap／CARTO 提供。Information Board 原作只有資訊卡片，沒有地圖。
- To-do、Sticky Notes、Cow Game 最高分及英文練習紀錄使用不同的 localStorage key，互不覆寫。GitHub Pages 同一個網域的所有子路徑共用 localStorage；舊站在同一瀏覽器的資料可直接讀取，不會因搬到子目錄而消失。原本 key 保持不變，舊站與新站仍會共用相應資料。瀏覽器不同、無痕模式或清除網站資料都會影響保存。
- 部分原作使用 Tailwind CDN、Font Awesome、Google Fonts 或 Phosphor Icons，需要網路。

## 測試與已知限制

部署完成後的實測紀錄會記錄在 [測試報告](docs/TESTING.md)，明確區分正式站台測試、模擬裝置、外部服務與未驗證項目。

## 重跑驗收

```sh
npm ci
npx playwright install chromium
BASE_URL=https://yyyunx.github.io/web-programming-homeworks/ npm test
BASE_URL=https://yyyunx.github.io/web-programming-homeworks/ node scripts/edge-cases.cjs
```

若使用系統 Chromium，可設定 `BROWSER_EXECUTABLE=/path/to/chromium`。結果與截圖預設存入 `test-results/`，測試使用隔離的瀏覽器 Context，不會清除一般使用者的資料。主驗收會使用 Chromium 模擬攝影機與模擬地理位置，故無法證明真實人體姿勢辨識準確度。`edge-cases.cjs` 的語音回傳及斷網情境使用 mock，實際音訊及遠端語音辨識服務需另行人工確認。

AQI 中文測站名稱採用環境部 [AQX_P_07](https://data.moenv.gov.tw/dataset/detail/AQX_P_07) 的官方測站基本資料，擷取基準與對照保存在 `scripts/aqi-station-names.json`；未列入該名錄的新測站保留官方預覽端點的名稱。
