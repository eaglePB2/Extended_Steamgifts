<center><img src="./img/logo.png" /></center>

# Extended Steamgifts (EaglePB2 Refactored Edition)

A lightweight and high-performance userscript for SteamGifts. It eliminates DOM reflow and scroll loops, providing smooth infinite scrolling, real-time win chance calculations, giveaway filtering, and an enhanced Markdown comment toolbar.

[中文](./README_CN.md)

### Original Authors
* Nandee (Programmer)
* Pele (Tester)

---

## Features
* **Win Chances**: Display entry odds and win probability for every giveaway.
* **Infinite Scrolling**: Seamless page loading without manual pagination.
* **Fixed Header**: Sticky navigation bar for quick access anywhere on the page.
* **Scroll to Top**: One-click button to jump back to the top.
* **Point Auto-Refresh**: Automatically updates your points every 60 seconds.
* **Hide Entered Giveaways**: Clean up lists by hiding giveaways you have already joined.
* **Enhanced Comment Editor**: Quick Markdown formatting toolbar for comments and descriptions.
* **Image Auto-Display**: Automatic expansion and preview for embedded images.
* And more features to explore!

---

## Installation Guide (Tampermonkey)

### 1. Prerequisites
Make sure the **Tampermonkey** extension is installed on your browser:
- [Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/)
- [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

---

### 2. Install the Script

#### Method A: Manual Installation (Recommended)
1. Click the **Tampermonkey icon** in your browser toolbar.
2. Select **"Create a new script..."**.
3. Clear all default template code inside the editor.
4. Copy the entire content of `Extended_Steamgifts.user.js` from this repository and paste it into the editor.
5. Press **`Ctrl + S`** (or **`Cmd + S`** on macOS), or click **File -> Save**.

#### Method B: One-Click URL Installation
1. Open the script file in your GitHub repository and click the **"Raw"** button (or navigate directly to the Raw URL).
2. Tampermonkey will prompt an installation tab automatically.
3. Click **"Install"**.

---

### 3. Important Notes
- **Disable Older Versions**: If you have an older version of the ESG userscript installed, make sure to **remove or disable** it in your Tampermonkey dashboard to prevent race conditions and duplicate DOM modifications.
- **Verification**: Go to [SteamGifts](https://www.steamgifts.com/). If you see the **ESG dropdown menu** on the left side of the header and win chances displayed on giveaways, the script is working properly.

---

## Configuration
Customize script settings directly on SteamGifts:
- Click **ESG -> Options** in the top navigation bar.
- Or visit: `https://www.steamgifts.com/account/profile/sync#esg_options`
