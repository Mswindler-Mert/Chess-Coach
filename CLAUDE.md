# Satranç Antrenörü — Proje Rehberi

Bu dosya Claude Code için proje hafızasıdır. Her oturumda önce bunu oku.

## Amaç

Chess.com oyunlarımı çekip Stockfish ile analiz eden, **sık yaptığım hataları** bulan ve bunlardan
**kişisel alıştırmalar** (bulmaca, açılış, oyun sonu) üreten bir web uygulaması.

- Kullanıcı: ~300 reyting, Chess.com'da oynuyor. Analiz edilecek ana oyunlar **rapid ve blitz**.
  Bullet ve daily varsayılan olarak kapalıdır; tempo düğmeleriyle açılabilir, seçim kaydedilir.
  Tarih aralığı (Son 30 gün / Son 3 ay / Tümü) varsayılan olarak **Son 30 gün**; seçim kaydedilir.
  **Analiz sadece hem tempo filtresine hem tarih aralığına uyan oyunlara uygulanır.**
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
    api/           # Chess.com istemcisi ve senkronizasyon planı
    games/         # Oyun modeli, PGN tekrar oynatma, saatler, tempo filtresi
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

- [x] **M0 – Kurulum:** Vite + React + TS + Tailwind, ESLint/Prettier (→ oxlint/Prettier, bkz. Karar Notları), Vitest, GitHub repo, README, GPL-3.0 lisansı, ilk yayın
- [x] **M1 – Oyunları çek:** Kullanıcı adı girişi, arşivleri sırayla çekme, IndexedDB, tempo filtresi, oyun listesi, oyunu tahtada izleme
- [x] **M2 – Analiz motoru:** Stockfish worker, hamle başı değerlendirme, win%, sınıflandırma, evre tespiti, ilerleme çubuğu, testler
- [x] **M3 – Hatalarımdan bulmacalar:** Bulmaca ekranı + aralıklı tekrar
- [x] **M4 – Panel:** İstatistikler ve grafikler
- [x] **M5 – Motif etiketleme:** asili-tas, bedava-tasi-almadi, mat, kazanılmış oyunu kaçırma, zaman baskısı
- [x] **M6 – Açılış modülü**
- [x] **M7 – Oyun sonu modülü**
- [x] **M8 – PWA ve mobil cilalama:** Kurulabilir uygulama, dokunmatik tahta, çevrimdışı çalışma
- [ ] **Sonra:** (ayrıntılı plan: ROADMAP.md) ~~Lichess desteği~~ (yapıldı, R6), ~~İngilizce arayüz~~ (yapıldı), Capacitor ile Android uygulaması, motif tespitinin genişletilmesi (çatal, açmaz ve şiş yapıldı; sıradaki fikirler: çifte saldırı, aşırı yüklü taş)

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
- **İlk yayın tamam (2026-11-19):** Site https://mswindler-mert.github.io/Chess-Coach/ adresinde açılıyor.
  Repo public. Pages kaynağı "GitHub Actions". Yeni repoda Actions'ın elle etkinleştirilmesi gerekti.
- **Git kimliği:** Commit e-postası GitHub noreply adresi (`70340171+Mswindler-Mert@users.noreply.github.com`),
  hem global hem proje ayarında. Kişisel e-posta commit'lere girmemeli. Geçmişte kalan eski adres yüzünden
  repo silinip temiz geçmişle yeniden açıldı.
- **Dal akışı:** Her aşama kendi dalında (`m0-setup`, `m1-...`) yapılır, bitince `main`'e fast-forward
  ile birleştirilir. `main`'e push yayını tetikler.

### M1 – Oyunları çek (2026-11-20)
- **Yeni bağımlılıklar:** `chess.js` (PGN → pozisyonlar), `react-chessboard` v5 (`options` prop'u alır),
  `dexie`. Router/state kütüphanesi yok.
- **Senkronizasyon (`core/api/sync.ts`):** `planSync` bir ayı, hiç çekilmemişse ya da son çekim ay
  bitmeden yapıldıysa yeniden çeker (ay sonu UTC). Aylar en yeniden eskiye, **tek tek** çekilir; her ay
  gelir gelmez kaydedilir. 429'da 2 sn'den başlayan, iki katına çıkan bekleme ile 3 kez yeniden denenir.
  `fetch`, `sleep`, `now` ve depolama parametre olarak verilir (testler internete çıkmaz).
- **Aynı anda tek senkronizasyon:** `db/games.ts` kullanıcı başına çalışan senkronizasyonu paylaşır
  (React StrictMode efektleri iki kez çalıştırsa da istekler paralel gitmez).
- **Sadece standart satranç saklanır:** `rules !== 'chess'` (Chess960, odds chess…) atlanır;
  odds chess farklı başlangıç pozisyonuyla başlar ve analiz için yanıltıcı olur.
- **Oyun modeli (`core/games/model.ts`):** Kullanıcının bakış açısından: `userColor`, `outcome`
  (win/loss/draw), `resultCode` (kullanıcının ham kodu), `endReason` (kaybedenin kodu ya da beraberlik
  kodu). `plies` TCN uzunluğundan (2 karakter = 1 yarım hamle) hesaplanır, PGN listede parse edilmez.
  Açılış adı `eco` URL'sinden; `.../openings/Undefined` → açılış yok.
- **Daily oyunlarda `[%clk]`** o hamle için kalan gün içi süredir, oyun saati değil. İzleyicide gösterilmez;
  M5'teki `zaman-baskisi` etiketi daily oyunları atlamalı.
- **Saklanan veri değişirse:** `normalizeGame` değişince eski kayıtlar kendiliğinden güncellenmez
  (bitmiş aylar yeniden çekilmez). Böyle bir değişiklikte Dexie sürümünü artırıp `archives` tablosunu
  temizleyen bir `upgrade` yaz, böylece her şey yeniden çekilir.
- **Yönlendirme:** Hash tabanlı (`#/`, `#/u/:kullanici`, `#/u/:kullanici/game/:id`), GitHub Pages'te
  ek ayar gerektirmez.
- **Test yapısı:** `tests/helpers.ts` fixture'ları okur; Node tipleri için ayrı `tsconfig.test.json`
  (uygulama kodu tarayıcı tipleriyle kalır). Fixture'lar `mswindler07`'nin gerçek oyunları.
- **Kullanıcının oyun dağılımı (2026-11):** 1236 bullet, 616 blitz, 22 rapid, 5 daily.

### Varsayılan tempo filtresi değişti (2026-11-20)
- **Varsayılan: blitz + rapid** (`DEFAULT_TIME_CLASSES`, `core/games/filter.ts`). Rapid + daily sadece
  27 oyun veriyordu, analiz için çok az. Bullet öğrenmek için fazla hızlı; daily'nin `[%clk]` değeri gerçek
  oyun saati değil. İkisi de düğmeyle açılabilir.
- **Seçim kaydedilir:** `settings` tablosundaki `timeClasses` anahtarı. Daha önce düğmeye basmış biri kendi
  seçimini korur; varsayılan sadece kayıt yoksa kullanılır.
- **Analiz kapsamı = filtre:** M2'de analiz kuyruğu, oyun listesindeki aynı tempo seçimini kullanır.
  Filtreye sonradan eklenen tempoların oyunları kuyruğa eklenir; kapatılan tempoların mevcut analizleri
  silinmez, sadece gösterilmez.

### M2 – Analiz motoru (2026-11-21)
- **Motor:** `stockfish` 19 npm paketinin **lite, tek iş parçacıklı** sürümü (~1.8 MB WASM).
  Çok iş parçacıklı sürüm COOP/COEP başlıkları istiyor, GitHub Pages veremiyor; tam sürüm ~94 MB.
  `scripts/copy-engine.mjs` dosyaları `predev`/`prebuild`'de `public/stockfish/` içine kopyalar
  (git'e girmez). Worker adresi `${BASE_URL}stockfish/stockfish.js`; `.wasm` aynı ada bakar.
- **Katmanlar:** `engine/uci.ts` (saf UCI ayrıştırma), `engine/engine.ts` (`UciEngine`: komut kuyruğu,
  `init`/`newGame`/`evaluate`; taşıyıcı arayüzü sayesinde testte Node'daki gerçek Stockfish ile çalışır),
  `engine/worker.ts` (tarayıcıda Web Worker), `engine/runner.ts` (arka plan kuyruğu, tekil `analysisRunner`).
- **Skorlar hamle sırası gelen tarafın açısından saklanır** (UCI'nin verdiği gibi). `mate 0` = sırası gelen
  mat olmuş. Beyaz açısına çevirme sadece gösterimde (`core/analysis/display.ts`, `formatScore`).
- **Pozisyon gönderimi:** `position fen <başlangıç> moves …` ile; motor tekrarları görür. Mat/pat/yetersiz
  materyal pozisyonları motora sorulmaz (`terminalEval`). N hamlelik oyunda N+1 pozisyon, her biri bir kez.
- **Sınıflandırma:** motorun en iyi hamlesi her zaman `best` (sığ aramada kayıp > 0 görünse bile);
  diğerleri win% kaybına göre `good` / `inaccuracy` / `mistake` / `blunder` (`CLASS_THRESHOLDS`).
- **Evre:** hamlenin oynandığı pozisyona göre. İlk 24 yarım hamle her zaman açılış (erken toplu
  değişimler oyun sonu sayılmaz); sonra her iki tarafın **toplam** piyon dışı materyali ≤ 26 ise oyun sonu.
- **Kayıt:** Dexie sürüm 2, `analyses` tablosu (`gameId` anahtar). Kayıtta `engine`, `depth`, `version`
  (`ANALYSIS_VERSION`) tutulur; format değişirse sürümü artır. Derinlik ayarı `settings.analysisDepth`
  (10/12/14/16, varsayılan 12). Derinlik değişince eski analizler yeniden yapılmaz.
- **Kuyruk:** her oyundan önce listeyi yeniden planlar (`planAnalysisQueue`): filtredeki tempolar,
  analiz edilmemiş, en yeniden eskiye. Filtre değişikliği bir sonraki oyunda geçerli olur. Duraklatınca
  yarım kalan oyun kaydedilmez. Oyun sayfasındaki "Bu oyunu analiz et" o oyunu öne alır ve kuyruk
  ardından devam eder; filtrede kapalı tempodaki oyun için düğme yerine uyarı çıkar.
- **Hız (2026-11, masaüstü):** derinlik 12'de oyun başı ~1 sn; 638 blitz+rapid oyunun tamamı ~10–15 dk.
- **Bilinen eksikler:** değerlendirme grafiği yok (M4), tahtada en iyi hamle oku yok (M3'te bulmacada),
  kuyruk sekme kapanınca durur. (R3 ile analiz artık kendiliğinden başlıyor; bkz. R3.)

### Tarih aralığı filtresi (2026-11-21)
- **Seçenekler:** Son 30 gün / Son 3 ay / Tümü (`DateRange`: `'30d' | '90d' | 'all'`, `core/games/filter.ts`).
  "Son 3 ay" takvim ayı değil, **90 gün**. Sınır dahil: `endTime >= now - gün × 24 sa`.
  Varsayılan `'30d'` (`DEFAULT_DATE_RANGE`): güncel seviyeyi en iyi son oyunlar gösterir.
- **Kayıt:** `settings` tablosunda `dateRange` anahtarı; geçersiz/eksik değerde varsayılan kullanılır.
- **Ortak filtre:** `GameFilter = { timeClasses, dateRange }`, `applyGameFilter(games, filter, now)` ve
  `db/games.ts`'teki `getGameFilter()`. **M3 bulmacaları ve M4 paneli de aynı filtreyi
  (tempo + tarih aralığı) kullanacak**; kendi filtrelerini yazmasınlar, `getGameFilter`/`applyGameFilter`'ı çağırsınlar.
- **Analiz kuyruğu:** `planAnalysisQueue(games, analyzed, filter, now, priorityId)`; aralık dışındaki
  oyunlar kuyruğa girmez. Aralığı daraltmak mevcut analizleri silmez. Oyun sayfasında aralık dışı oyun için
  "Bu oyunu analiz et" yerine aralığı genişletme uyarısı çıkar.
- **`now`:** saf fonksiyonlara parametre olarak verilir (testler sabit tarih kullanır). Oyun listesi sayfa
  açılışındaki zamanı kullanır; kuyruk her oyundan önce `Date.now()` alır.
- **Az oyun uyarısı:** aralık "Tümü" değilken listede 1–9 oyun varsa (`FEW_GAMES_THRESHOLD = 10`)
  "Bu aralıkta az oyun var…" uyarısı çıkar. 0 oyunda boş liste mesajı zaten aralığı genişletmeyi önerir.
- **Tempo düğmelerindeki sayılar** seçili tarih aralığındaki oyunları sayar.

### M3 – Hatalarımdan bulmacalar (2026-11-21)
- **Kaynak:** kullanıcının kendi `mistake` ve `blunder` hamleleri (`PUZZLE_CLASSES`); inaccuracy 300 seviyesi
  için fazla ince. Bulmaca = hatadan önceki pozisyon, çözüm = analizdeki motorun en iyi hamlesi.
  Rakibin hataları bulmaca olmaz (M5'teki `bedava-tasi-almadi` için ayrıca ele alınacak).
- **Bulmacalar saklanmaz,** her açılışta analizlerden yeniden üretilir (`db/puzzles.ts` → `loadPuzzles`,
  saf kısım `core/training/puzzles.ts` → `generatePuzzles`). Kimlik `${gameId}:${ply}`, kalıcı.
  Ortak filtre (tempo + tarih aralığı, `applyGameFilter`) hangi oyunlardan bulmaca çıkacağını belirler.
  Çok oyunda ("Tümü" + yüzlerce analiz) yavaşlarsa bulmacaları analizle birlikte saklamayı düşün.
- **Cevap kontrolü:** motorun hamlesi anında doğru. Başka hamle Stockfish'e (analiz derinliğiyle) sorulur;
  en iyi hamlenin win%'inden en fazla `ACCEPT_MARGIN` (5) puan düşükse doğru (`checkAnswer`, `engine/judge.ts`).
  Mat eden hamle motora sorulmadan doğru (`terminalEval`). Terfi her zaman vezire.
- **Tek motor:** `engine/shared.ts` → `getSharedEngine()`; analiz kuyruğu ve bulmaca kontrolü aynı worker'ı
  kullanır (UCI kuyruğu sayesinde kontrol en fazla bir pozisyon bekler). Başlatma hatası önbelleğe alınmaz.
- **Leitner (`core/training/leitner.ts`):** kutular 1–5, aralıklar 1/3/7/14/30 gün. Yeni bulmaca doğruysa
  kutu 1'e; doğru → bir üst kutu (en fazla 5); yanlış veya "Çözümü göster" → kutu 1. Sıra: vadesi gelen
  tekrarlar (en çok geciken önce), sonra yeni bulmacalar (en yeni oyun önce, oyun içinde hamle sırasıyla).
  Dexie sürüm 3, `puzzleProgress` tablosu (`puzzleId` anahtar).
- **Ekran (`#/u/:kullanıcı/puzzles`):** sürükle-bırak ve tıkla-tıkla (mobil için) hamle; yanlışta doğru hamle
  yeşil, denenen kırmızı okla; oyundaki hamle ve rakibin en iyi cevabı (4 yarım hamle) yazılır.
  Evre ve renk filtresi (kaydedilmez; motif filtresi M5'te). "Oyunda gör" oyunu hata hamlesinde açar:
  oyun adresine isteğe bağlı yarım hamle eklendi (`#/u/:kullanıcı/game/:id/:ply`).
- **Bilinen:** Dexie sürümü yükselince eski sürümün açık olduğu başka bir sekme yükseltmeyi bekletebilir
  (geliştirmede HMR sonrası "hazırlanıyor"da kaldı, sayfa yenileyince düzeldi).

### M4 – Panel (2026-11-21)
- **Kapsam:** ortak filtre (tempo + tarih aralığı). İstatistikler sadece analiz edilmiş oyunlardan; reyting
  grafiği filtredeki tüm puanlı oyunlardan. Saf hesaplar `core/stats/dashboard.ts`, yükleme `db/dashboard.ts`,
  ekran `#/u/:kullanıcı/dashboard` (oyun listesinde "Panel" düğmesi).
- **"Hata" sayımı:** evre/renk dağılımı ve odak konusu `mistake` + `blunder` sayar (bulmacalarla aynı);
  inaccuracy sadece ortalama kutusunda.
- **Trend:** oyun başına blunder; 30 gün / 3 ay için haftalık (Pazartesi, UTC), "Tümü" için aylık. Sadece oyun
  olan dönemler gösterilir.
- **Reyting:** filtredeki tempolardan puanlı oyunu olanlar arasında seçilir; varsayılan en çok oynanan
  (`mainTimeClass`). CLAUDE.md "rapid" diyor ama kullanıcı çoğunlukla blitz oynuyor, bu yüzden seçilebilir.
- **Odak konusu:** son 7 günde en çok hata + blunder olan evre (yoksa tüm aralık). Kısayol bulmacaları o evre
  seçili açar: bulmaca adresine isteğe bağlı `focus` eklendi (`#/u/:kullanıcı/puzzles/:focus`).
  M5'te motif gelince odak konusu motife dönecek.
- **Grafikler (`ui/charts.tsx`):** bağımlılık yok, elle SVG. Tek seri rengi `#059669` (dataviz doğrulayıcısı,
  koyu yüzey `#0f172a`: açıklık bandı + kontrast geçti). Sütun: ≤ 24 px, üstü 4 px yuvarlak; çizgi 2 px + hafif
  alan; fareyle/dokunmayla ipucu; her grafikte "Tablo olarak göster". Kap genişliği < 520 px ise çizim 360
  birim genişlikte (yazılar telefonda okunur kalsın). Eksen değerleri `core/stats/ticks.ts` (`niceTicks`).

### M5 – Motif etiketleme (2026-11-21)
- **Kod adları İngilizce, arayüz Türkçe** (`core/analysis/motifs.ts`, `MOTIFS` öncelik sırasıyla):
  `hanging-piece` (asili-tas), `missed-free-piece` (bedava-tasi-almadi), `missed-mate` (mati-kacirdi),
  `walked-into-mate` (mata-dustu), `blew-winning-position` (kazanilmis-oyunu-kacirdi),
  `time-pressure` (zaman-baskisi). Bir hamlenin birden çok motifi olabilir; ilki "ana" motif.
- **Saklanmaz, analizden hesaplanır** (`tagGame(game, replay, analysis)`): analiz kayıtlarında her pozisyonun
  motor varyantı (pv) zaten var, yeniden analiz gerekmedi, `ANALYSIS_VERSION` değişmedi.
- **Sadece inaccuracy ve daha kötü hamleler** etiketlenir (iki taraf için de).
- **Kurallar:** materyal P=1, N=B=3, R=5, Q=9; varyantın ilk 4 yarım hamlesine bakılır, çift sayıda yarım
  hamlede ölçülür (geri alma sayılsın; tek yarım hamlelik varyantta 1). Eşik ±2 (`MATERIAL_SWING`), yani
  piyon kaybı asılı taş sayılmaz.
  - asılı taş: hamleden sonraki pozisyonun varyantında hamleyi yapan ≥ 2 kaybediyor.
  - bedava taş: en iyi hamle bir alış, oynanan hamle farklı ve en iyi varyant ≥ 2 kazandırıyor.
  - mat kaçtı: önce zorlayıcı mat vardı, sonra yok. Mata düşme: sonra rakibin zorlayıcı matı var (önceden
    zaten mat yemiyorken).
  - kazanılmış oyun: win% ≥ 80 → ≤ 50. Zaman baskısı: hamleden sonraki saat < başlangıç süresinin %10'u;
    daily oyunlarda yok.
- **Gerçek motor testi:** `engine.test.ts` fixture oyununda 7… Qg5'i (vezir Bxg5 ile gidiyor) asılı taş buluyor.
- **Nerede görünür:** oyun sayfası hamle kutusu (etiket + açıklama); bulmaca bağlamında **cevaptan sonra**
  (önce gösterilirse ipucu olur); bulmaca motif filtresi (sadece mevcut motifler, sayılarıyla); panelde
  "Motife göre hatalar". **Odak konusu artık motif:** son 7 günün en sık motifi (eşitlikte öncelikli olan),
  motif yoksa evre. Bulmaca adresindeki `focus` bir motif ya da evre olabilir.
- **İlk sonuç (mswindler07, blitz, son 30 gün):** hata + blunder'ların motifleri: asılı taş 44, kazanılmış oyun
  kaçtı 27, bedava taş alınmadı 16, zaman baskısı 8, mat kaçtı 4, mata düşme 2. Projenin varsayımı
  (en büyük sorun taş asmak) doğrulandı.
- **Sonra (v2):** çatal, şiş, açmaz tespiti.

### M6 – Açılış modülü (2026-11-21)
- **Ekran:** `#/u/:kullanıcı/openings` (oyun listesinde "Açılışlar"). Ortak filtre (tempo + tarih aralığı).
  Analiz gerektirmez; sadece oyunlar ve PGN'ler kullanılır (`db/openings.ts`).
- **Açılış ailesi (`core/openings/stats.ts`, `openingFamily`):** Chess.com'un ayrıntılı adı, ilk
  Opening/Defense/Defence/Game/Gambit/Attack/System kelimesine kadar kısaltılır ("Kings Pawn Opening Leonardis
  Variation …" → "Kings Pawn Opening"). Böyle bir kelime yoksa hamle numarasından önceki en fazla 3 kelime.
  Chess.com bazen aynı açılışa farklı ad veriyor ("Italian Game" / "Giuoco Piano Game"); birleştirilmedi.
  Açılış adı olan oyunlar renk + aileye göre gruplanır: oyun, G/B/M, puan (galibiyet 1, beraberlik ½).
- **Prensip kontrolleri (`core/openings/principles.ts`):** sadece standart başlangıç pozisyonu; kullanıcının
  ilk 10 hamlesi (`OPENING_MOVES`):
  - erken vezir: ilk 5 hamlede vezir oynandı.
  - rok yok / geç rok: 10. hamleye kadar rok yok; hiç rok yoksa "rok yok", sonra yapıldıysa "geç rok".
    Oyun 10 hamleden kısaysa bakılmaz.
  - aynı taşı tekrar: bütün hafif taşlar çıkmadan at/fil/kale/vezir alış yapmadan tekrar oynandı (sayılır).
  - kenar piyonu: a/h piyonunun alış olmayan hamleleri (sayılır).
  - gelişmemiş taşlar: 10. hamlede en az 2 at/fil hiç oynamamış ve hâlâ başlangıç karesinde.
  Her uyarı bir yarım hamle taşır; uyarı etiketleri oyunu o hamlede açar.
- **Replay hamlelerine** `piece`, `capture`, `castle` alanları eklendi (`core/games/replay.ts`).
- **Alıştırma:** "İlk 10 hamledeki hatalardan tekrar" ayrı bir ekran olmadı; açılış evresi seçili bulmacalara
  kısayol (`#/u/:kullanıcı/puzzles/opening`, açılış = ilk 12 hamle).
- **İlk sonuç (mswindler07, blitz + rapid, son 30 gün, 45 oyun):** aynı taşı tekrar %69, rok yok %27,
  kenar piyonu %24, geç rok %18, erken vezir %11, gelişmemiş taşlar %9. "Aynı taşı tekrar" saldırıdan kaçan
  taşı da sayıyor; fazla sık çıkarsa tehdit altındaki taşı hariç tutmayı düşün.

### M7 – Oyun sonu modülü (2026-11-21)
- **Ekranlar:** `#/u/:kullanıcı/endgames` (liste, oyun listesinde "Oyun sonu") ve
  `#/u/:kullanıcı/endgames/:ders` (oyna). Ders kimliği müfredat id'si ya da kendi oyunundan `gameId:ply`.
- **Müfredat (`core/endgames/curriculum.ts`):** vezirle mat (15 hamle), iki kaleyle mat (15), kaleyle mat (30),
  karşılık (kazan, 30), kare kuralı (siyah, beraberlik, 15), Lucena (kazan, 40), Philidor (siyah, beraberlik, 30).
  **Her FEN Stockfish ile doğrulandı** ve `engine.test.ts` bunu her test koşusunda tekrar kontrol eder
  (derinlik 16: mat/kazan → mat ya da ≥ +3, beraberlik → |değer| ≤ 1). Karşılık için ilk adaylar beraberlik
  çıktı; seçilen pozisyon "8/8/3k4/8/3K4/8/3P4/8 w": beyaz ancak d2-d3 tempo hamlesiyle kazanır.
- **Kendi oyunlarından (`core/endgames/fromGames.ts`):** kullanıcının oyun sonu evresindeki hamlesi win%'i
  ≥ 80'den ≤ 50'ye düşürdüyse, o hamleden önceki pozisyon "bunu kazan" çalışması olur (40 hamle). Ortak filtre
  (tempo + tarih aralığı) ve analiz gerekir.
- **Hedef kontrolü (`core/endgames/judge.ts`, saf):** mat → başarı (her hedefte), mat olmak → başarısız;
  kural beraberliği (pat, yetersiz materyal, üç tekrar, 50 hamle) sadece beraberlik hedefinde başarı. Motor
  skoru (kullanıcının açısından): mat/kazan hedefinde < +2 → "üstünlük kaçtı"; kazan hedefinde zorlayıcı mat
  ya da vezir terfisi + ≥ +5 → başarı; beraberlik hedefinde ≤ −5 ya da mat → kaybedildi. Hamle sınırı
  kullanıcının sırası geldiğinde kontrol edilir (beraberlikte sınıra ulaşmak başarı).
- **Motor:** paylaşılan worker, derinlik 12 (`ENGINE_DEPTH`). Kullanıcı hamlesinden sonraki pozisyon bir kez
  aranır: hem skor (hedef kontrolü) hem motorun cevabı buradan gelir. Terfi her zaman vezir.
- **İlerleme:** `settings.endgameProgress` (deneme sayısı, çözüldü mü, en az hamle). Dexie sürümü değişmedi.
- **Dinamik i18n anahtarları** (`endgame.lesson|desc|hint.<id>`, `endgame.result.*`) `i18n/index.test.ts`
  ile kontrol edilir; yeni ders eklerken üç metni de ekle.

### M8 – PWA ve mobil cilalama (2026-11-22)
- **Yeni bağımlılık:** `vite-plugin-pwa` 2 (dev; teknoloji tablosunda planlıydı). Manifest + Workbox ile
  service worker üretir. `npm audit` derleme aracındaki (workbox-build → minimatch) 4 orta seviye uyarı
  gösteriyor; sitede çalışan koda girmiyor, `--force` ile düzeltilmedi.
- **Service worker (`vite.config.ts`):** `registerType: 'autoUpdate'`; yeni sürüm arka planda iner ve
  sayfa bir sonraki yüklemede (ya da etkinleşince otomatik yenilemeyle) güncellenir. Önbelleğe alınanlar:
  uygulama kabuğu (js/css/html/ikonlar) ve **Stockfish** (`stockfish.js` + `.wasm`, ≈1.8 MB), böylece
  kurulu uygulama çevrimdışı analiz, bulmaca ve oyun sonu çalıştırır. Chess.com istekleri hep ağa gider.
  Hash yönlendirme olduğu için `navigateFallback: index.html` yeterli. Geliştirme sunucusunda SW yok.
- **SW'yi kaldırmak gerekirse:** `selfDestroying: true` yapıp yayınla; kullanıcıların tarayıcısındaki SW
  kendini siler. Önbellek sorunu şüphesinde ilk bakılacak yer burası.
- **Kod bölme:** oyun/bulmaca/oyun sonu/açılış/panel sayfaları `React.lazy` ile ayrı parçalar
  (`ui/lazyPage.ts`). Ana parça ~237 KB (500 KB uyarısı gitti). Yayından sonra eski sürümle açık kalan sekme
  silinmiş bir parçayı yükleyemezse sayfa **bir kez** yenilenir (`sessionStorage` bayrağı, döngü olmaz).
- **İkonlar:** `scripts/make-icons.ps1` (PowerShell + System.Drawing, bağımlılık yok, Windows): 192/512 PNG
  (yuvarlatılmış), maskable 512 (tam zemin, at güvenli dairede), `apple-touch-icon.png` 180. Görünüm
  favicon ile aynı (zümrüt zemin, beyaz ♞ — Segoe UI Symbol).
- **iOS:** `apple-mobile-web-app-capable`, durum çubuğu `black` (`black-translucent` içeriği çubuğun altına
  sokar, ek boşluk ayarı ister). Gövdeye `env(safe-area-inset-*)` boşlukları; düğme/bağlantılarda
  `touch-action: manipulation` (çift dokunma yakınlaştırma gecikmesi yok). Tahtalar zaten `touch-none`.
- **Doğrulama:** `npm run build` + `vite preview` (`.claude/launch.json` → "preview", port 4173): SW etkin,
  manifest okunuyor, Stockfish önbellekte; sunucu kapalıyken sayfa açıldı, bulmaca sayfası yüklendi ve oyun sonu
  dersinde motor hamle yaptı.
- **Telefonda denenmedi:** kurulum ve dokunmatik his kullanıcı tarafından denenecek.

### İyileştirmeler (2026-11-22)
- **Açılış, "aynı taşı tekrar":** saldırı altındaki taşın kaçması artık sayılmaz (hamleden önceki pozisyonda
  taşın karesi rakip tarafından saldırı altındaysa). Örnek test oyununda 6 → 2.
- **Açılış aileleri:** `FAMILY_ALIASES` ile "Giuoco Piano Game" → "Italian Game", "Kings Indian Defence" →
  "Kings Indian Defense". Yeni eşleşmeler buraya eklenir.
- **Motif v2, çatal (`core/analysis/tactics.ts`):** `forkTargets(fen, kare)` bir taşın saldırdığı, alınmaya
  değer rakip taşları verir: şah, saldırandan değerli taş ya da korunmasız en az hafif taş (piyon sayılmaz).
  İki ve daha fazlası çataldır. Yeni motifler (`MOTIFS` sırasıyla):
  - `allowed-fork` ("Çatala düşme"): asılı taş durumunda rakibin en iyi cevabının ilk hamlesi bir çatal.
  - `missed-fork` ("Çatal kaçtı"): en iyi hamle bir çataldı, varyant ≥ 2 kazandırıyor ve oynanmadı.
  Saklanmaz, analizden hesaplanır (eski analizler de etiketlenir). İlk sonuç (blitz + rapid, son 30 gün):
  çatala düşme 6, çatal kaçtı 2.
- **Motif v2, açmaz ve şiş (`lineTactics`):** fil/kale/vezirin her çizgisinde ilk rakip taş "ön", arkasındaki
  (arada boşluk olan) ikinci rakip taş "arka". Açmaz: ön ≥ hafif taş ve arka daha değerli (çoğu zaman şah).
  Şiş: ön şah ya da arkadan değerli, arka ≥ hafif taş. Yeni motifler: `allowed-pin` ("Açmaza düşme"),
  `missed-pin` ("Açmaz kaçtı"), `allowed-skewer` ("Şişe düşme"), `missed-skewer` ("Şiş kaçtı"); kurallar
  çatalla aynı (asılı taş durumunda rakibin ilk cevabı / taş kazandıran en iyi hamle). `motifsForMove` sonucu
  artık `MOTIFS` sırasına göre sıralanır. İlk sonuç: açmaza düşme 2, açmaz kaçtı 2, şiş kaçtı 1.

### İngilizce arayüz (2026-11-22)
- **Sözlük:** `src/i18n/en.ts`, tipi `Record<MessageKey, string>`: Türkçede olan her anahtar İngilizcede de
  olmak zorunda (eksik/fazla anahtar tip hatası). `i18n/index.test.ts` iki dilde `{yer tutucuların}` aynı
  olduğunu ve boş metin olmadığını kontrol eder. **Yeni metin eklerken ikisine de ekle.**
- **Varsayılan Türkçe;** seçim cihaz başına `localStorage` (`chess-coach:language`). `t()` senkron kaldı,
  dil değişince sayfa yeniden yüklenir (bağlam/abonelik gerekmedi). Düğme (`ui/LanguageSwitch.tsx`) üst menüde
  ve ana sayfada; diğer dilin adını gösterir. `<html lang>` açılışta ayarlanır. Manifest Türkçe kaldı.
- **Biçimler dile göre:** `locale()` (`tr-TR` / `en-GB`), `formatPercent` ("%45" / "45%"), `formatNumber`.
  Kodda `'tr-TR'` ya da elle `%` yazma; bunları kullan.
- **Bilinen:** İngilizcede çoğul eki yok ("1 games" gibi). Gerekirse `Intl.PluralRules` ile `t`'ye çoğul desteği ekle.

### R1 – Oyun inceleme ekranı (2026-11-22)
- **İsabet (`core/analysis/accuracy.ts`):** Lichess formülü. Hamle isabeti
  `103.17·e^(−0.0435·düşüş) − 3.17 + 1` (0–100; düşüş = hamleyi yapanın win% kaybı). Oyun isabeti: oynaklıkla
  (pencere = hamle sayısı/10, 2–8; std 0.5–12) ağırlıklı ortalama ile harmonik ortalamanın ortalaması.
  Saklanmaz, analizden hesaplanır. `whiteWinPercents` grafiğin de kaynağı.
- **Kritik anlar (`core/analysis/review.ts`):** kullanıcının en çok kaybettiren 3 hatası (inaccuracy ve üstü),
  oyun sırasıyla.
- **Oyun sayfası:** tahtanın altında beyaz açısından kazanma şansı grafiği (`ui/EvalGraph.tsx`; hatalar hamle
  listesiyle aynı renkte noktalar; dokun/sürükle → hamleye git). Tahtada o pozisyonda motorun en iyi hamlesi
  yeşil okla (onay kutusuyla kapatılabilir) ve metin olarak "Bu pozisyonda en iyisi". Oyuncu satırlarında isabet.
  "Kritik anlar" kutusu: her biri hamleye gider, win% değişimi ve ana motif.
- **Liste ve panel:** `listAnalysisSummaries` artık `{ counts, accuracy }` döner; oyun satırında "İsabet 81".
  Panelde "Ortalama isabet" kutusu ve dönem başına isabet grafiği (`TrendPoint.accuracy`).
- **İlk sonuç (blitz + rapid, son 30 gün):** ortalama isabet 66.6.

### R2 – "Asılı taşı bul" antrenörü + tehdit görünümü (2026-11-22)
- **Statik takas (`core/analysis/hanging.ts`, `staticExchange`):** bir karede saldıranın kazandığı materyal;
  her iki taraf en ucuz taşla alır, istediği an durabilir (`best(i) = max(0, kazanç[i] − best(i+1))`).
  Alışlar **gerçek yasal hamlelerle** yapılır (sıra saldırana çevrilir, geçerken alma silinir), böylece açmaz ve
  arka arkaya dizilmiş taşlar doğru sayılır. `hangingPieces(fen, renk)`: SEE > 0 olan, en az hafif taş
  değerindeki taşlar (piyon ve şah hariç, `MIN_HANGING_VALUE = 3`).
- **Alıştırmalar (`core/training/hangingDrills.ts`):** kaynak, analizdeki gerçek anlar:
  - `own`: kullanıcının `hanging-piece` etiketli hamlesinden **sonraki** pozisyon, cevap = kendi asılı taşları.
  - `free`: `missed-free-piece` etiketli hamleden **önceki** pozisyon, cevap = rakibin asılı taşları.
  Sadece statik olarak gerçekten asılı taş olan anlar alınır (derin taktikler bulmacalara kalır).
  Doğru = bütün cevap karelerine dokunmak ve fazlasına dokunmamak (`checkSquares`).
- **Tekrar:** bulmacalarla aynı Leitner kutuları ve aynı `puzzleProgress` tablosu; kimlik
  `hang:own|free:gameId:ply`. `planPuzzles` artık genel (`Schedulable`: id, endTime, ply).
- **Ekran `#/u/:kullanıcı/hanging`:** oyun listesinde "Asılı taş" düğmesi; panelde odak konusu asılı taş ya da
  bedava taş ise ek kısayol. Seçim sarı halka; sonuçta yeşil = bulunan, kırmızı = kaçırılan, turuncu = yanlış.
- **Tehdit görünümü:** oyun sayfasında onay kutusu; iki tarafın asılı taşlarını kırmızı halkayla gösterir.
- **İlk sonuç (blitz + rapid, son 30 gün):** 63 alıştırma.

### R3 – Otomatik analiz (2026-11-22)
- **Ayar:** `settings.autoAnalyze` (varsayılan **açık**), analiz kutusunda onay kutusu. Kapatınca sadece
  "Analizi başlat" ile çalışır.
- **Ne zaman başlar:** (1) oyun listesinde senkronizasyon bittiğinde (hata/çevrimdışı olsa da, kayıtlı oyunlar
  için), (2) tempo ya da tarih aralığı değişince (filtreye yeni giren oyunlar), (3) **uygulama açılınca**
  (`ui/background.ts`, `startBackgroundWork`): ekrandaki kullanıcı ya da son kullanıcı için arka planda
  senkronizasyon + analiz, hangi sayfadan açılırsa açılsın. Uygulama başına bir kez.
- **Duraklat'a saygı:** `analysisRunner.autoStart` kullanıcı bu oturumda duraklattıysa ya da başka kullanıcının
  analizi sürüyorsa hiçbir şey yapmaz; elle başlatınca bayrak kalkar. Sayfa yenilenince sıfırlanır.
- **Motor gereksiz başlamaz:** çalıştırıcı önce kuyruğu planlar, analiz edilecek oyun varsa Stockfish'i başlatır.
  `RunnerState.remaining` kalan oyun sayısı (sürmekte olan dahil).
- **Gösterge:** üst menüde "Analiz: N oyun" (yeşil nabız), o kullanıcının oyun listesine götürür.
- **Telefonda:** arka plan analizi pil ve işlemci kullanır; gerekirse ayardan kapatılabilir.

### R4 – Günlük antrenman planı (2026-11-22)
- **Etkinlik kaydı:** `settings.activityLog` = `{ "YYYY-MM-DD": sayı }`, **yerel** takvim günü
  (`core/training/daily.ts`, `dayKey`). Biten her bulmaca, asılı taş alıştırması ve oyun sonu denemesi +1
  (`db/daily.ts`, `recordActivity`). 400 günden eski kayıtlar atılır.
- **Seri:** bugüne kadar ardışık aktif günler; bugün henüz bir şey yapılmadıysa dünden geriye sayılır (seri gün
  bitene kadar yaşar). En uzun seri de tutulur. Günlük hedef `DAILY_GOAL = 10`.
- **Plan (`buildDailyPlan`):** sırayla en fazla 5 bulmaca (önce vadesi gelenler), en fazla 3 asılı taş
  alıştırması, çözülmemiş ilk müfredat dersi, son analiz edilmiş oyunun ilk kritik anı. Yapılacak bir şey yoksa
  o madde çıkmaz. Yükleyici her oyunu bir kez tekrar oynatıp hem bulmacaları hem alıştırmaları üretir.
- **Kart:** oyun listesinde başlığın altında "Bugünün antrenmanı"; ekrandaki filtreyi kullanır (filtre değişince
  yenilenir), arka plan analizi bitince de yenilenir.

### R5 – Yedekle / geri yükle (2026-11-22)
- **Biçim (`core/backup/backup.ts`):** `{ format: 'chess-coach-backup', version: 1, exportedAt, usernames,
  analyses, puzzleProgress, endgameProgress, activityLog }`. Oyunlar ve cihaz tercihleri (filtre, derinlik, dil,
  otomatik analiz) **girmez**; oyunlar diğer cihazda aynı kullanıcı adı açılınca yeniden çekilir, analizler
  Chess.com oyun kimliğiyle eşleşir. Biçim değişirse `BACKUP_VERSION`'ı artır ve `readBackup`'a göç ekle.
- **Doğrulama:** `readBackup(text)` JSON'u ve her kaydın şeklini kontrol eder (analizde
  pozisyon sayısı = hamle + 1); geçmeyen dosya hiç yazılmaz.
- **Birleştirme (`db/backup.ts`, tek işlem):** analiz `analyzedAt`'e, bulmaca ilerlemesi `lastAttemptAt`'e
  göre yeni olan kalır; oyun sonu ilerlemesi ders ders (deneme en çok, çözüldü veya, en az hamle); etkinlik gün
  gün büyük sayı (aynı alıştırma iki kez sayılmaz). Bu cihazdan hiçbir şey silinmez.
- **Ekran:** oyun listesinin en altında katlanır "Yedekle ve taşı" kutusu; indir (`chess-coach-backup-
  YYYY-MM-DD.json`, Blob + `download`) ve yükle (dosya seçici). Yükleme sonrası sayfa yenilenir.
- **Boyut:** 62 analiz ≈ 1 MB.
- **Telefonda denenmedi:** iOS'ta kurulu uygulamada indirme paylaşım menüsü açabilir.

### R6 – Lichess desteği (2026-11-21)
- **Hesap anahtarı (`core/api/source.ts`):** Chess.com adı olduğu gibi (`hikaru`), Lichess önekli
  (`lichess:thibault`). Chess.com adlarında `:` olamaz, çakışma yok; mevcut Chess.com verileri ve adresleri
  değişmedi, Dexie sürümü artmadı. Adres `#/u/lichess%3Athibault`. Lichess oyun kimliği `li-<id>` (Chess.com
  uuid'leri onaltılık, `li-` ile başlamaz). `sourceOf`, `accountName`, `accountKey`, `gameSource` yardımcıları;
  ekranda `accountLabel` → "thibault (Lichess)". Lichess adı: 2–30 karakter, harf/rakamla başlar.
- **Senkronizasyon (`core/api/lichess.ts`, `syncLichess`):** tek akış (NDJSON) isteği
  `/api/games/user/{u}?pgnInJson&clocks&opening&sort=dateDesc`. İlk seferde en yeni
  `LICHESS_FIRST_SYNC_MAX = 2000` oyun, sonra en yeni kayıtlı oyunun `endTime`'ından sonrası (`since`).
  Oyunlar geldikçe 100'lük paketlerle kaydedilir; ilerleme "N oyun alındı" (toplam bilinmiyor, `total: 0`).
  Son kontrol zamanı `archives` tablosunda `lichess:games` satırı. Hatalar Chess.com'la aynı türler
  (`ChessComError`: not-found / rate-limited / network / http), arayüz ikisini aynı işler.
- **Dönüştürme (`normalizeLichessGame`):** sadece `standard` varyant ve gerçekten oynanmış oyunlar
  (created/started/aborted/noStart atlanır). Tempo: ultraBullet+bullet → bullet, classical → rapid,
  correspondence → daily. Durumlar Chess.com kodlarına çevrilir (mate → checkmated, resign → resigned,
  outoftime → timeout, timeout (rakip ayrıldı) → abandoned, draw → agreed…). Açılış adı Lichess'in
  `opening.name`'i, bağlantı `lichess.org/opening/<eco>`. PGN'deki `[%clk]` biçimi Chess.com'la aynı.
- **Açılış ailesi:** Lichess adları "Aile: Varyant" biçiminde; `openingFamily` iki noktadan öncesini alır.
- **Canlı deneme (2026-11-21):** `thibault` hesabı tarayıcıda: 1985 oyun çekildi, otomatik analiz başladı,
  oyun sayfası (saatler, isabet, grafik, "Lichess'te aç"), açılışlar ve olmayan kullanıcı hatası doğru.
  Gerçek API'ye karşı ayrıca bir kerelik test: 231 oyunun hepsi PGN'den tekrar oynatılabildi.
- **Bilinen:** Aynı kişi iki sitede ayrı hesap sayılır (veriler birleştirilmez). Yedek dosyası `usernames`
  alanında önekli anahtarları taşır; biçim değişmedi (`BACKUP_VERSION` 1).

### R7 – Küçük ama kalıcı iyileştirmeler (2026-11-21)
- **i18n çoğul desteği (`src/i18n/index.ts`):** `Intl.PluralRules` tabanlı `{ad|tekil|çoğul}` sözdizimi
  eklendi (bağımlılık yok; `#` işareti sayının yerine geçer: `{count|# game|# games}`, ya da sadece kelime
  için `{total|month|months}`). `en.ts`'teki tüm sayılı metinler güncellendi; `tr.ts` sade kaldı (Türkçede
  sayıdan sonra çoğul eki yok). `i18n/index.test.ts` iki dilde aynı parametre setini, bozuk biçim olmadığını
  ve İngilizce tekil/çoğul çıktılarını doğrular.
- **Playwright duman testi atlandı:** Playwright yüzlerce MB tarayıcı indiriyor, CI süresini ve bağımlılık
  yükünü ciddi biçimde artırıyor. Projede zaten 267 Vitest testi (gerçek Stockfish ve fixture PGN/NDJSON
  dahil) var; büyük değişikliklerde canlı tarayıcı denemesi yeterli görüldü. İleride çok sayıda ekran
  regresyonu olursa tekrar değerlendirilir.

### Arayüz yenileme (2026-11-21)
- **Sabit gezinme (`src/ui/Nav.tsx`):** Kullanıcı seçiliyken sticky üst çubuk (logo, `AnalysisBadge`,
  `SoundToggle`, kullanıcı değiştir, dil) + masaüstünde 6 ikonlu sekme (Oyunlar, Bulmaca, Asılı taş,
  Açılışlar, Oyun sonu, Panel), mobilde (`sm:hidden`) 6'lı sabit alt gezinme çubuğu (`safe-area-inset-bottom`
  destekli). Oyunlar sayfası başlığındaki 5 düğme kaldırıldı.
- **Oyunlar sayfası ve Günlük Kart:** Tempo/tarih filtreleri ve kompakt analiz şeridi tek araç kartında
  toplandı; Derinlik, "otomatik analiz" ve açıklama katlanır "Ayarlar" (`<details>`) içine alındı.
  `DailyCard` gradyan vurgulu, seri rozetli ve ikonlu 2 sütunlu aksiyon kartlarıyla güncellendi.
- **Dikey Eval Bar (`core/analysis/evalBar.ts` + `ui/EvalBar.tsx`):** Oyun inceleme ekranında analiz varsa
  tahtanın solunda görünür; mat dışı skorlar %5–%95 bandına sıkıştırılır, tahta yönüne göre döner.
- **Ses efektleri (`src/ui/sound.ts`):** Sıfır bağımlılık, Web Audio API ile hamle/alış/şah/doğru/yanlış
  sesleri; tercih `localStorage` (`chess-coach:sound`), üst çubuktaki düğmeyle kapatılabilir.
- **Ana sayfa (`ui/pages/HomePage.tsx`):** Hero kartı, segment kontrol tarzı site seçici ve 6 renkli
  özellik kartıyla yenilendi.

### Gerçek Antrenör Modu + Etkileşimli Açılış Rehberi (2026-11-21)
- **İnsan dili hamle anlatımı (`core/analysis/explainMove.ts` + `ui/moveText.ts`):** Şifreli SAN notasyonları
  (`19... Rxa2`, `O-O`, `Bxd5`) yerine doğal Türkçe/İngilizce anlatım (parantez içinde kısa kodu korunur:
  "Kalenle a2’deki piyonu aldın (Rxa2)", "kısa rok yapmak (O-O)"). Türkçe kare ve iyelik ekleri testlidir.
- **Koç açıklama motoru (`core/analysis/coachExplain.ts` + `cheapestCapturer`):** Her hata anında 3 net
  öğretici çıktı üretir: (1) En iyi hamle neden iyi (bedava alış, çatal/açmaz/şiş, tehdit altındaki taşı
  kurtarma, rok, mat), (2) Oyundaki hamle neden kötü (korumasız kalan taş + en ucuz rakip alıcı, rakibin
  ceza hamlesi ve adım adım ceza varyantı), (3) Bir dahaki sefere nasıl düşünmelisin (motife özel zihinsel
  kontrol listesi).
- **Bulmacalar (`ui/pages/PuzzlePage.tsx`):** Çözmeden önce 2 kademeli **İpucu** (1. tık düşünme rehberi,
  2. tık oynanacak taşın karesini mavi halkayla vurgulama). Çözümden sonra tahtada **En iyi hamle / Oyunda
  oynadığın** geçişi ve rakibin ceza varyantını ◀/▶ ile tahtada adım adım izleme.
- **Asılı Taş (`ui/pages/HangingPage.tsx`):** Belirgin "Sen: Beyaz/Siyah" ve sıra rozeti; oynanan hamle
  sarı karelerle işaretli; kontrol sonrası her asılı taşa en ucuz alıcıdan **kırmızı saldırı oku** + Türkçe
  açıklama + "Öneriyi tahtada gör" geçişi.
- **Oyun İnceleme (`ui/pages/GamePage.tsx`):** Hatalı hamlelerde aynı Türkçe koç açıklaması ve düşünme
  ipucu görünür.
- **Etkileşimli Açılış Rehberi (`core/openings/guides.ts`, `ui/OpeningTrainer.tsx`):** 5 temel açılış
  (İtalyan Açılışı, Londra Sistemi, Klasik 1…e5, Caro-Kann, Kabul Edilmemiş Vezir Gambiti), toplam 11
  varyasyon. Kısa tanıtım (Temel fikir, Avantajları, Dikkat edilecekler) + iki mod: **Rehberli öğren**
  (yeşil ok + hamle açıklaması + otomatik rakip cevabı) ve **Kendin dene (pratik)** (oksuz, ipuçlu).
  İlerleme `settings.openingProgress` içinde saklanır (Dexie sürümü artmadı), tamamlanan varyasyon günlük
  seriye +1 ekler. Tüm varyasyon hamleleri `guides.test.ts` içinde `chess.js` ile doğrulanır.

### Sanat yönü ve göz yormayan temalar (2026-11-21)
- **Tipografi (`index.html`, `src/index.css`):** Başlıklarda **Fraunces** (editorial serif), gövdede
  **Plus Jakarta Sans**, hamle/saatlerde **JetBrains Mono** (çevrimdışı fallback'li).
- **3 göz yormayan tema (`src/ui/theme.ts`, `src/ui/ThemeSwitch.tsx`):**
  - `walnut` (**Ceviz Kulüp**, varsayılan): sıcak espresso zemin, ceviz kartlar, fildişi metin, mat
    pirinç altın vurgu, sıcak ahşap tahta (`#9d7250` / `#decab0`).
  - `forest` (**Orman Turnuva**): koyu çam zemin, adaçayı yüzeyler, yumuşak yaprak yeşili vurgu,
    turnuva yeşil tahta (`#658058` / `#d3dcc9`).
  - `obsidian` (**Füme Bakır**): sıcak bazalt/grafit zemin, mat bakır vurgu, arduvaz tahta
    (`#626f7d` / `#cbd2d9`).
  Seçim `localStorage` (`chess-coach:theme`) ile saklanır, `<html data-theme>` ve `useBoardColors()` ile
  hem tüm sayfalar hem tüm satranç tahtaları anlık olarak güncellenir.
- **Doku ve çerçeve:** Hafif ortam ışığı + mikro kâğıt/ahşap kum dokusu (`body::after`), tüm tahtalarda
  `.club-board-frame`, ana sayfada asimetrik 2 sütunlu editöryel vitrin (sağda canlı İtalyan Açılışı
  tahtası, altta 01–06 numaralı çizgili dizin).
