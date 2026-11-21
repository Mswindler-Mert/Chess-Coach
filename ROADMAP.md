# Yol Haritası v2 – Büyük Adımlar

M0–M8 bitti (bkz. CLAUDE.md). Bu dosya sıradaki büyük işlerin planıdır. Her adım kendi dalında yapılır,
bitince `main`'e birleştirilir, push edilir ve yayının başarılı olduğu doğrulanır; sonra buradaki kutu
işaretlenir. Limit dolarsa ilk işaretsiz adımdan devam edilir. Ayrıntılı kararlar CLAUDE.md "Karar Notları"na.

Öncelik ölçütü: 300 reytingten hızlı yükselmek (en büyük sorun **taş asmak**) ve uygulamayı her gün
kullanılır hale getirmek.

## R1 – Oyun inceleme ekranı

Analizi gözle görülür yapmak: hangi hamlede oyunun koptuğu tek bakışta anlaşılsın.

- [x] Oyun başı **isabet puanı** (accuracy, 0–100) — Lichess'in win% tabanlı formülü, saf fonksiyon + test.
- [x] Oyun sayfasında **kazanma şansı grafiği** (beyaz açısından, hamle hamle); tıklayınca o hamleye gider,
      hatalı hamleler işaretli.
- [x] Tahtada **en iyi hamle oku** (seçili pozisyonda motorun önerisi; hatalı hamlede "daha iyisi" oku).
- [x] **Kritik anlar** listesi: kullanıcının en büyük 3 hatası (win% kaybına göre), tıklayınca o hamle.
- [x] İsabet puanı oyun listesinde ve panelde (ortalama + trend).

## R2 – "Asılı taşı bul" antrenörü + tehdit görünümü

Asılı taşı görmeyi doğrudan çalıştırmak.

- [x] Saf fonksiyon: bir pozisyonda **asılı taşlar** (saldırı altında ve yeterince korunmayan taşlar;
      basit takas hesabı, SEE benzeri) + testler.
- [x] Alıştırma ekranı: kendi oyunlarından pozisyonlar; "Asılı olan taşlarına dokun" (kendi taşların) ve
      "Rakibin bedava taşına dokun" turları; doğru/yanlış, açıklama.
- [x] Pozisyon kaynağı: analizde `hanging-piece` / `missed-free-piece` etiketli anlar (gerçek hata anları).
- [x] Tahtalarda isteğe bağlı **tehdit görünümü** düğmesi: asılı taşları kırmızı halkayla gösterir
      (oyun sayfası; bulmacada çözüm sonrası).

## R3 – Otomatik analiz

- [x] Ayar: "Yeni oyunları otomatik analiz et" (varsayılan açık). Senkronizasyon bitince filtredeki
      analiz edilmemiş oyunlar kendiliğinden kuyruğa girer.
- [x] Uygulama açılınca (son kullanıcıyla) arka planda senkronizasyon + analiz devam eder.
- [x] Üst menüde küçük analiz durumu göstergesi (ör. "Analiz 12/45").

## R4 – Günlük antrenman planı

- [x] Oyun listesinin üstünde **"Bugünün antrenmanı"** kartı: vadesi gelen bulmacalar, 1 asılı taş turu,
      1 oyun sonu dersi (çözülmemiş ilk ders), son oyunun incelemesi.
- [x] **Seri (streak):** antrenman yapılan ardışık gün sayısı; günlük hedef (ör. 10 bulmaca) ilerleme çubuğu.
- [x] Saf fonksiyonlar (plan üretimi, seri hesabı) + testler.

## R5 – Yedekle / geri yükle

Analiz bilgisayarda hızlı; sonuçları telefona taşımak için.

- [ ] Dışa aktar: oyunlar hariç (yeniden çekilebilir) analizler, bulmaca ilerlemesi, ayarlar, oyun sonu
      ilerlemesi → tek JSON dosyası (sürüm alanlı).
- [ ] İçe aktar: dosya seç → doğrula → birleştir (mevcut kayıtlarla çakışmada yenisi kalır).
- [ ] Saf doğrulama/birleştirme fonksiyonları + testler.

## R6 – Lichess desteği

Arkadaşlardan Lichess kullananlar için.

- [ ] Lichess API istemcisi (`/api/games/user/{u}`, NDJSON, PGN + saatler), sırayla ve hız sınırına uyarak.
- [ ] Ortak oyun modeline dönüştürme (tempo, sonuç, açılış adı), kaynak alanı (`chesscom` / `lichess`).
- [ ] Ana sayfada site seçimi; adres `#/u/:kullanıcı` → kaynak önekli kimlik; mevcut veriler bozulmadan.
- [ ] Testler (fixture NDJSON).

## R7 – Küçük ama kalıcı iyileştirmeler

- [ ] i18n çoğul desteği (`Intl.PluralRules`; "1 game" / "2 games").
- [ ] Uçtan uca duman testi (Playwright): ana akış (kullanıcı adı → liste → oyun → bulmaca) — bağımlılık
      ağırsa atlanır, kararı notlara yaz.
