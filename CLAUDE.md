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
  kuyruk sekme kapanınca durur (sayfa açılınca kendiliğinden başlamaz, "Analizi başlat" gerekir).

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
