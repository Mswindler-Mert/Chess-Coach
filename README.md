# ♞ Satranç Antrenörü (Chess Coach)

Chess.com oyunlarını çekip **Stockfish** ile analiz eden, **sık yaptığın hataları** bulan ve
bunlardan **kişisel alıştırmalar** (bulmaca, açılış, oyun sonu) üreten bir web uygulaması.

- Hesap veya giriş yok: Chess.com kullanıcı adını girmen yeterli.
- Türkçe ve İngilizce arayüz (üst menüdeki düğmeyle değişir). / Turkish and English UI.
- Her şey tarayıcında çalışır; oyunların ve analizlerin cihazında (IndexedDB) saklanır.
- Mobil uyumlu ve telefona uygulama olarak kurulabilir (PWA); kurulduktan sonra internet olmadan da
  analiz, bulmaca ve oyun sonu çalışır (yeni oyunları çekmek için internet gerekir).

> Durum: Erken sürüm; temel modüllerin hepsi çalışıyor. Yol haritası için [CLAUDE.md](CLAUDE.md) dosyasına bak.

**Canlı sürüm:** https://mswindler-mert.github.io/Chess-Coach/

### Telefona kurma

- **Android (Chrome):** siteyi aç → menü (⋮) → **Uygulamayı yükle** / **Ana ekrana ekle**.
- **iPhone (Safari):** siteyi aç → Paylaş → **Ana Ekrana Ekle**.

## Özellikler

| Modül                       | Ne yapar?                                                                       |
| --------------------------- | ------------------------------------------------------------------------------- |
| **Hatalarımdan bulmacalar** | Hata yaptığın pozisyonda en iyi hamleyi bulursun; aralıklı tekrarla pekiştirir. |
| **Açılış**                  | Oynadığın açılışlar, kazanma oranları ve açılış prensibi hataları.              |
| **Oyun sonu**               | Kaçırdığın kazanılmış oyun sonları ve temel müfredat (vezirle mat, Lucena…).    |
| **Panel**                   | Blunder trendi, hata dağılımı, reyting grafiği ve haftanın odak konusu.         |

## Geliştirme

Gereksinim: [Node.js](https://nodejs.org/) (LTS veya daha yeni).

```bash
npm install        # bağımlılıkları kur
npm run dev        # geliştirme sunucusu (http://localhost:5173/Chess-Coach/)
npm test           # Vitest testleri
npm run typecheck  # TypeScript tip kontrolü
npm run lint       # oxlint
npm run format     # Prettier ile biçimlendir
npm run build      # üretim derlemesi (dist/)
```

### Teknolojiler

React + TypeScript (strict) + Vite · Tailwind CSS · Vitest · oxlint + Prettier ·
`chess.js` · `react-chessboard` · Dexie (IndexedDB) · Stockfish 19 lite (WASM, Web Worker).

Stockfish dosyaları `npm run dev` / `npm run build` öncesinde `node_modules/stockfish` içinden
`public/stockfish/` klasörüne kopyalanır (`scripts/copy-engine.mjs`); bu klasör git'e girmez.

Uygulama ikonları (`public/*.png`) `scripts/make-icons.ps1` ile Windows'un kendi çizim kütüphanesinden
üretilir: `powershell -ExecutionPolicy Bypass -File scripts/make-icons.ps1`.

### Klasör yapısı

```
src/
  core/      # Saf TypeScript: API istemcisi, analiz, eğitim, açılış, oyun sonu
  engine/    # Stockfish Web Worker sarmalayıcısı
  db/        # IndexedDB şeması
  ui/        # React bileşenleri
  i18n/      # Arayüz metinleri (Türkçe)
tests/fixtures/  # Testler için örnek PGN'ler
```

### Yayın

`main` dalına her push'ta GitHub Actions testleri çalıştırır ve siteyi GitHub Pages'e yayınlar
(`.github/workflows/deploy.yml`).

## Lisans

[GPL-3.0](LICENSE). Uygulama, GPL-3.0 lisanslı [Stockfish](https://stockfishchess.org/) motorunu
içereceği için aynı lisansla dağıtılır.
