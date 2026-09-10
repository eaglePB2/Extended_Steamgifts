<center><img src="./img/logo.png" \></center>

# Extended Steamgifts (老鷹重構版)

輕量、高效的 SteamGifts 增強腳本。消除 DOM 重繪死循環，提供流暢的無限滾動、實時幾率計算、抽獎條件過濾及 Markdown 評論工具列。

原作者團隊
* Nandee ( Programmer )
* Pele ( Tester )

---

## 附加功能
* 展示每個游戲的抽獎概率
* 無限滾動（不需要點額外的頁面）
* 固定header，可以隨時點擊前往你要去的地方
* 一鍵回歸最上面
* 每60秒自動刷新你的點數
* 隱藏加入過的抽獎游戲
* 更好的評論編輯欄
* 自動展示圖片
* 還有更多功能等著你來探索！

## 快速安裝指南 (Tampermonkey)

### 1. 安裝環境前提
確保你的瀏覽器已安裝 **Tampermonkey（篡改猴）** 擴充功能：
- [Chrome 商店](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- [Firefox 附加元件](https://addons.mozilla.org/firefox/addon/tampermonkey/)
- [Edge 載入項](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

---

### 2. 安裝腳本

#### 方法 A：手動安裝（最直接）
1. 點擊瀏覽器工具列上的 **Tampermonkey 圖示**。
2. 選擇 **「新增腳本」 (Create a new script...)**。
3. 清空編輯器中的所有預設代碼。
4. 將本倉庫的 `Extended_Steamgifts.user.js` 全部代碼複製並貼上到編輯器中。
5. 按快捷鍵 **`Ctrl + S`** (macOS 為 **`Cmd + S`**) 或點擊選單列的 **「檔案」 -> 「儲存」**。

#### 方法 B：URL 一鍵安裝（若已推送到 GitHub）
1. 在 GitHub 倉庫中打開腳本文件，點擊 **「Raw」** 按鈕（或直接訪問 Raw 鏈接）。
2. Tampermonkey 會自動攔截並彈出安裝確認介面。
3. 點擊 **「安裝」 (Install)** 即可。

---

### 3. 注意事項（避免衝突）
- **關閉舊版**：如果你之前安裝過舊版 ESG 腳本，請在 Tampermonkey 管理面板中將舊腳本**刪除或禁用**，避免多個腳本搶佔同一 DOM 節點。
- **生效驗證**：打開 [SteamGifts 首頁](https://www.steamgifts.com/)，導航欄左側出現 **ESG 下拉選單** 且抽獎列表顯示機率即代表安裝成功。

---

## 功能設定
安裝完成後，可直接在網站內調整功能：
- 點擊頂部導航欄的 **ESG -> Options**。
- 或前往 `https://www.steamgifts.com/account/profile/sync#esg_options`。
