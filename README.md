# CPS Arcade v1.1

手機橫向優先的 CPS1/CPS2 網頁街機模擬器 MVP。

## 已內建 ROM
- `roms/tk2j.zip` — 三國志2 / Warriors of Fate
- `roms/sf2j.zip` — 快打旋風 / Street Fighter II
- `roms/knights.zip` — 圓桌武士 / Knights of the Round

## 執行
必須透過 HTTP/HTTPS 執行（Service Worker / PWA / WebRTC 不支援直接 file://）。

```bash
python -m http.server 8080
```

開啟 `http://localhost:8080`。

## 架構
- EmulatorJS stable CDN + CPS1 core
- 自製多點觸控 overlay
- Floating joystick（18px deadzone / 72px outer radius / 70ms direction buffer）
- A+B 專用組合鍵 + 30ms simultaneous press normalization
- PeerJS 4碼房間 MVP：按鍵同步 + WebRTC 語音
- PWA 安裝提示（Android install prompt / iOS 加入主畫面提示）

> GitHub Pages 為靜態主機。PeerJS 公共 signaling 適合 MVP 測試；正式商用多人建議改成自建 signaling / relay / state sync。
