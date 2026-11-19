# Satranç Antrenörü — Proje Rehberi

Bu dosya Claude Code için proje hafızasıdır. Her oturumda önce bunu oku.

## Amaç

Chess.com oyunlarımı çekip Stockfish ile analiz eden, **sık yaptığım hataları** bulan ve bunlardan
**kişisel alıştırmalar** (bulmaca, açılış, oyun sonu) üreten bir web uygulaması.

- Kullanıcı: ~300 reyting, Chess.com'da oynuyor. Analiz edilecek ana oyunlar **uzun tempolu** (rapid / daily).
  Bullet (1+0) ve blitz oyunları varsayılan olarak filtrelenir (ayardan açılabilir).
- Hedef: Hızlı reyting artışı. 300 seviyesinde en büyük kazanç **taş asmamak ve asılan taşı görmek**,
  bu yüzden öncelik her zaman bu.
- Arkadaşlarla paylaşılacak: Herkes kendi Chess.com kullanıcı adını girer, hesap/giriş yok.
- İleride mobil sürüm: Baştan mobil uyumlu (responsive) tasarla, önce PWA, sonra gerekirse Capacitor.
- Açık kaynak olarak GitHub'da yayınlanacak.

## Teknoloji Seçimleri

| Alan | Seçim | Not |
|---|---|---|
| Arayüz | React + TypeScript (strict) + Vite | Sunucu yok, tamamen tarayıcıda çalışır |
| Stil | Tailwind CSS | Mobil öncelikli |
| Satranç kuralları | `chess.js` | PGN okuma, hamle doğrulama, FEN |
| Tahta | `react-chessboard` | MIT lisanslı |
| Motor | Stockfish (WASM, `stockfish` npm paketi) | **Web Worker** içinde çalışır, arayüzü dondurmaz |
| Veri saklama | IndexedDB (`dexie`) | localStorage oyunlar için çok küçük |
| Test | Vitest | Analiz mantığı mutlaka test edilir |
| Yayın | Vercel veya GitHub Pages | Ücretsiz, sunucu gerektirmez |
| Mobil (sonra) | `vite-plugin-pwa`, gerekirse Capacitor | Aynı kod tabanı |

**Lisans:** Stockfish GPL-3.0. Uygulama Stockfish'i dağıttığı için repo lisansı **GPL-3.0** olmalı.

## Veri Kaynağı: Chess.com Public API

- Arşiv listesi: `GET https://api.chess.com/pub/player/{username}/games/archives`
  döner: `{ "archives": ["https://api.chess.com/pub/player/{u}/games/2026/11", ...] }`
- Aylık oyunlar: her arşiv URL'si `{ "games": [...] }` döner. Önemli alanlar:
  `pgn`, `time_class` (bullet/blitz/rapid/daily), `time_control`, `end_time`, `rated`,
  `white`/`black` (`username`, `rating`, `result`), `eco` (açılış URL'si), `uuid`.
- PGN içinde `{[%clk 0:09:58]}` saat bilgisi var, hamle başı süre kullanımı buradan hesaplanır.
- **İstekleri sırayla at, paralel atma** (paralel istekler 429 hatası alabilir). Çekilen ayları önbelleğe al,
  sadece yeni ayları ve içinde bulunulan ayı tekrar çek.
- Kullanıcı adı küçük harfe çevrilerek kullanılır.

## Mimari

```
src/
  core/            # Saf TypeScript, React'ten bağımsız, test edilir
    api/           # Chess.com istemcisi
    analysis/      # Değerlendirme, hata sınıflandırma, evre tespiti, motif etiketleme
    training/      # Bulmaca üretimi, aralıklı tekrar (spaced repetition)
    openings/      # Açılış istatistikleri ve prensip kontrolleri
    endgames/      # Oyun sonu pozisyonları ve müfredat
  engine/          # Stockfish Web Worker sarmalayıcısı (UCI protokolü)
  db/              # Dexie şeması ve sorgular
  ui/              # React bileşenleri ve sayfalar
  i18n/            # Arayüz metinleri (Türkçe öncelikli, İngilizce sonra)
tests/fixtures/    # Testler için örnek PGN'ler
```

Kural: Satranç ve analiz mantığı **`src/core` içinde saf fonksiyonlar** olarak yazılır, arayüz sadece onları çağırır.
Bu hem test etmeyi kolaylaştırır hem de mobil sürüme geçişte kodu yeniden kullanmayı sağlar.

## Analiz Mantığı

1. **Değerlendirme:** Her hamleden önceki ve sonraki pozisyon Stockfish ile değerlendirilir
   (başlangıç: derinlik 12–14 veya hamle başı sabit süre, ayardan değişebilir).
2. **Kazanma yüzdesine çevir:** `win% = 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)`
   (mat skorları ±100% kabul edilir). Hata büyüklüğü centipawn yerine win% düşüşüyle ölçülür,
   böylece +8'den +6'ya düşmek hata sayılmaz.
3. **Sınıflandırma** (hamleyi yapan tarafın win% kaybına göre, eşikler ayarlanabilir sabitler):
   - Hatalı hamle (inaccuracy): ≥ 10 puan
   - Hata (mistake): ≥ 20 puan
   - Blunder: ≥ 30 puan
4. **Oyun evresi:**
   - Açılış: ilk 12 hamle (24 yarım hamle)
   - Oyun sonu: her iki tarafın piyon dışı toplam materyali ≤ 26 (at/fil=3, kale=5, vezir=9)
   - Arası: orta oyun
5. **Motif etiketleri** (öncelik sırasıyla):
   1. `asili-tas`: Hamleden sonra rakibin en iyi cevabı karşılıksız taş kazanıyor
      (motorun ilk 2–4 yarım hamlelik varyantında materyal ≥ 2 puan düşüyor)
   2. `bedava-tasi-almadi`: Rakip taş astı ama alınmadı
   3. `mati-kacirdi` / `mata-dustu`: Mat skorlu pozisyonlar
   4. `kazanilmis-oyunu-kacirdi`: win% ≥ 80'den ≤ 50'ye düştü
   5. Sonra: çatal, şiş, açmaz tespiti (v2)
6. **Zaman baskısı:** Hata yapıldığında kalan süre, toplam sürenin %10'unun altındaysa `zaman-baskisi` etiketi.

Analiz sonuçları IndexedDB'ye kaydedilir; aynı oyun iki kez analiz edilmez.

## Eğitim Modülleri

### 1. Hatalarımdan Bulmacalar
- Hata yapılmadan önceki pozisyon gösterilir: "Burada en iyi hamleyi bul."
- Motorun en iyi hamlesi ya da ona çok yakın (≤ 5 win% fark) hamleler doğru kabul edilir.
- Yanlışta: doğru hamle ve oyunda yapılan hamlenin neden kötü olduğu (motor varyantı) gösterilir.
- **Aralıklı tekrar (Leitner kutuları):** doğru → sonraki kutu (1, 3, 7, 14, 30 gün), yanlış → kutu 1.
- Filtre: motif, evre, renk, tarih.

### 2. Açılış
- Hangi açılışları oynadığım, beyaz ve siyahla kazanma oranları (`eco` alanından).
- İlk 10 hamlede yaptığım hatalardan tekrar alıştırması: "Bu pozisyonda ne oynamalıydın?"
- **Prensip kontrolleri** (300 seviyesi için ezberden daha önemli): erken vezir çıkışı,
  geç rok / hiç rok yapmamak, açılışta aynı taşı tekrar oynamak, kenar piyonu hamleleri, gelişmemiş taşlar.
  Her oyun için uyarı listesi ve toplam istatistik.

### 3. Oyun Sonu
- **Kendi oyunlarımdan:** Kazanılmış oyun sonunu kaçırdığım pozisyonlardan Stockfish'e karşı
  tekrar oynama ("bunu kazan").
- **Temel müfredat** (sabit FEN listesi, Stockfish'e karşı oynanır):
  vezirle mat, kaleyle mat, iki kaleyle mat, karşılık (opposition), kare kuralı, Lucena, Philidor.
- Başarı: hedef sonuca (mat / kazanç / beraberlik) belli hamle sayısı içinde ulaşmak.

### 4. Panel (Dashboard)
- Oyun başına ortalama blunder sayısı ve zaman içindeki trendi
- Hata dağılımı: evreye göre, motife göre, renge göre
- Reyting grafiği (rapid)
- "Bu haftanın odak konusu": en sık hata motifi + ilgili alıştırmaya kısayol

## Yol Haritası

Her aşama ayrı bir dal (branch) ve küçük commit'lerle yapılır. Bir aşama bitmeden diğerine geçme.

- [ ] **M0 – Kurulum:** Vite + React + TS + Tailwind, ESLint/Prettier, Vitest, GitHub repo, README, GPL-3.0 lisansı, ilk yayın
- [ ] **M1 – Oyunları çek:** Kullanıcı adı girişi, arşivleri sırayla çekme, IndexedDB, tempo filtresi, oyun listesi, oyunu tahtada izleme
- [ ] **M2 – Analiz motoru:** Stockfish worker, hamle başı değerlendirme, win%, sınıflandırma, evre tespiti, ilerleme çubuğu, testler
- [ ] **M3 – Hatalarımdan bulmacalar:** Bulmaca ekranı + aralıklı tekrar
- [ ] **M4 – Panel:** İstatistikler ve grafikler
- [ ] **M5 – Motif etiketleme:** asili-tas, bedava-tasi-almadi, mat, kazanılmış oyunu kaçırma, zaman baskısı
- [ ] **M6 – Açılış modülü**
- [ ] **M7 – Oyun sonu modülü**
- [ ] **M8 – PWA ve mobil cilalama:** Kurulabilir uygulama, dokunmatik tahta, çevrimdışı çalışma
- [ ] **Sonra:** Lichess desteği, İngilizce arayüz, Capacitor ile Android uygulaması, motif tespitinin genişletilmesi

## Çalışma Kuralları (Claude Code için)

- Kod ve değişken isimleri İngilizce, arayüz metinleri Türkçe (`src/i18n` üzerinden).
- `src/core` içindeki her yeni fonksiyon için Vitest testi yaz; `tests/fixtures` içindeki gerçek PGN'leri kullan.
- Bir işi bitirince: testleri çalıştır, tip kontrolü yap (`tsc --noEmit`), sonra commit at.
  Commit mesajları kısa ve açıklayıcı olsun.
- Büyük bir değişiklikten önce planı kısaca anlat ve onay bekle.
- Bağımlılık eklemeden önce neden gerektiğini söyle, mümkünse az bağımlılıkla çöz.
- Stockfish çağrıları asla ana thread'de çalışmaz.
- Bu dosyadaki yol haritasını, aşama bittikçe güncelle (kutuyu işaretle, önemli kararları aşağıya not et).

## Karar Notları

(Geliştirme sırasında alınan önemli kararlar buraya eklenir.)

### M0 – Kurulum (2026-11-19)
- **Sürümler:** React 19, Vite 8, TypeScript 7, Tailwind CSS v4, Vitest 5.
- **Lint: ESLint yerine oxlint.** `typescript-eslint` henüz TypeScript 7'yi desteklemiyor (peer: `<6.1`).
  Vite'ın güncel şablonu da oxlint kullanıyor, tek paket. Ayarlar `.oxlintrc.json` içinde.
  İleride ESLint gerekirse TS 6'ya inmek ya da typescript-eslint desteğini beklemek gerekir.
- **Prettier:** noktalı virgül yok, tek tırnak, 100 sütun (`.prettierrc.json`). CLAUDE.md biçimlendirilmez.
- **Tailwind v4:** config dosyası yok; `src/index.css` içinde `@import 'tailwindcss'`, `@tailwindcss/vite` eklentisi.
- **TS ayarları:** `strict` + `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`.
  Tip kontrolü: `npm run typecheck` (`tsc -b --noEmit`, tüm proje referanslarını kontrol eder).
- **Testler:** Vitest node ortamında (jsdom yok). Test dosyaları kodun yanında `*.test.ts`,
  örnek PGN'ler `tests/fixtures/` içinde.
- **i18n:** Kütüphane yok; `src/i18n/tr.ts` sözlüğü + tipli `t(key, params)` fonksiyonu (`{name}` yer tutucuları).
- **Yayın:** GitHub Pages, GitHub Actions ile (`.github/workflows/deploy.yml`). PR'larda sadece kontroller
  çalışır, `main` push'unda yayınlanır. Vite `base: '/Chess-Coach/'` (repo adı değişirse güncelle).
  Adres: https://mswindler-mert.github.io/Chess-Coach/
- **Komutlar:** `dev`, `build`, `preview`, `typecheck`, `lint`, `format`, `format:check`, `test`, `test:watch`.
