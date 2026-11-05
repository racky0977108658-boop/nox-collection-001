# NOX 互動 3D 作品集模板

給品牌或創作者的靜態展廳。改 `config.js` 就能換名稱、短句、作品、聯絡與主題。沒有建置步驟，整個 `template/` 資料夾可直接放到 GitHub Pages。

展示頁（此倉庫已從 `main` 根目錄開啟 GitHub Pages，合併後）：

https://racky0977108658-boop.github.io/nox-collection-001/template/

## 客製

只編輯 [config.js](config.js)。

| 欄位 | 作用 |
|---|---|
| `name` `tagline` `location` | 名稱、標題後綴、頁尾地點 |
| `theme` | `atelier` 暗色展廳、暖金；`void` 冷光、桌機左文右景 |
| `showThemeToggle` | 交給客戶時設 `false`，拿掉主題切換 |
| `colors` | 留空用主題預設。可填 `ink` `bone` `accent` `accentSoft` |
| `hero` | 首屏眉題、標題、導言、按鈕。`form` 是占位雕塑，`model` 是 GLB |
| `works` | 作品。見下方優先順序 |
| `about` `contact` `worksIntro` | 關於、聯絡、作品區標題 |

作品舞台的優先順序：

1. 有 `model`：點開才下載 `.glb`，載入前先顯示 `form`
2. 沒有 `model`、有 `form`：程序雕塑。封面仍可用 `image`
3. `model` 與 `form` 都空、有 `image`：把圖片立在台上
4. 都沒有：依序使用預設雕塑

`form` 可以是 `monolith`、`vessel`、`crystal`、`knot`、`rings`。

路徑都相對 `index.html`，例如 `assets/cover.jpg`、`assets/piece.glb`。圖片請放同網域，或確認對方允許跨域，否則卡片看得到、舞台貼圖會失敗。

標題想換行，在 `hero.title` 裡寫 `\n`。

## 本機預覽

在 `template` 目錄啟動靜態伺服器後開網址。不要直接用檔案總管點 `index.html`，瀏覽器會擋住模組。

```bash
python3 -m http.server 8080
```

然後打開 `http://127.0.0.1:8080/`。

預覽參數：

| 網址 | 效果 |
|---|---|
| `?theme=void` | 強制冷光主題 |
| `?theme=atelier` | 強制展廳主題 |
| `?lite=1` | 平面模式，不啟動 WebGL |

## 部署到 GitHub Pages

1. 把整個 `template` 資料夾放進倉庫（這個倉庫已經放好）。
2. 倉庫 Settings → Pages → Branch：`main`，資料夾 `/ (root)`。
3. 網站位在 `https://<帳號>.github.io/<倉庫>/template/`。
4. 若要讓模板成為網站首頁，把 `template` 裡的檔案移到倉庫根目錄，網址就不再帶 `/template/`。此倉庫根目錄目前是雕塑展廳案例，不要覆蓋。

## 手機與效能

- 手機改成上圖下文，避免標題蓋住雕塑。桌機的展廳主題則是全幅舞台、文字在左下。
- 只有一個 WebGL 畫布。離開首屏或切到背景分頁會停止重繪。
- 手機像素比大約封頂 1.15，桌機大約 1.75。低階裝置關閉抗鋸齒與浮塵。
- GLB 在點開該作品時才下載。
- 記憶體約 2GB 以下、瀏覽器開啟省流量，或網址加 `?lite=1`，改為平面剪影。沒有 WebGL 時同樣如此。
- 系統若要求減少動態，就不會自轉、漂浮或揚塵，仍可用拖曳旋轉。

## 授權與素材

`vendor/` 是 [Three.js](https://github.com/mrdoob/three.js) r160，MIT，檔案開頭保留著作權聲明。請一併交付，不要刪掉。

範例封面 SVG 與 `assets/sample-prism.glb` 是這份模板自己做的占位，可隨模板再散布。正式使用請換成你的圖片與模型。

沒有使用這個倉庫的 `statue.glb`，也沒有嵌入 Spline 場景。`nox-assets` 與 `nox-grand-atelier` 這次讀不到，所以沒有取用其中的模型或畫面。你自己的 GLB、貼圖、字體若有授權限制，請先確認可以再散布。

此模板只保證一般 glTF / GLB。用 Draco 或 Meshopt 壓縮的檔案需要額外解碼器，預設載入器沒有附上。

字體使用系統的蘋方、宋體，並從 Google Fonts 補 Newsreader 與 Noto Sans TC。字體載不到時會退回系統字。

## 交給客戶之前

- `showThemeToggle` 設為 `false`
- 換掉 `hello@example.com` 與範例作品
- 若不用占位棱晶，刪掉 `assets/sample-prism.glb` 並清掉對應的 `model`
- 用自己的手機與桌機各走一遍：首屏、點作品、返回、聯絡連結
