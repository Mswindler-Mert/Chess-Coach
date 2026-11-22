# Satranç Antrenörü — Ajan Kuralları (Antigravity)

Bu proje önce Claude Code ile geliştirildi. Asıl proje hafızası **CLAUDE.md**'dir (amaç, mimari, analiz
mantığı, karar notları). Bu dosya sadece kısa bir giriş ve her oturumda geçerli kurallardır.

## Her oturumun başında

1. @CLAUDE.md dosyasını oku (özellikle "Çalışma Kuralları" ve "Karar Notları").
2. @ROADMAP.md dosyasını oku; ilk işaretsiz adım sıradaki iştir.
3. `git status` ve `git log --oneline -5` ile hangi dalda olunduğunu ve son commit'leri kontrol et.

## Çalışma kuralları (özet; ayrıntı CLAUDE.md'de)

- Kod ve değişken isimleri İngilizce; arayüz metinleri `src/i18n` üzerinden, **hem `tr.ts` hem `en.ts`**'e eklenir.
- Satranç/analiz mantığı `src/core` içinde saf fonksiyon olarak yazılır ve her yeni fonksiyon için Vitest testi yazılır.
- Bir iş bitince: `npm test`, `npm run typecheck`, `npm run lint`, sonra kısa ve açıklayıcı commit.
- Büyük değişiklikten önce planı kısaca anlat ve onay bekle. Bağımlılık eklemeden önce nedenini söyle.
- Yeni bir özellik eklemeden veya büyük bir değişiklik yapmadan önce, çalışma ağacında commit edilmemiş değişiklik varsa mevcut durumu otomatik olarak `git commit` ile yedekle.
- Stockfish çağrıları asla ana thread'de çalışmaz.
- Her büyük adım kendi dalında yapılır; bitince `main`'e fast-forward ile birleştirilir. `main`'e push yayını tetikler.
- Commit e-postası GitHub noreply adresidir; kişisel e-posta commit'lere girmemeli.
- Aşama bitince ROADMAP.md'deki kutuyu işaretle, önemli kararları CLAUDE.md "Karar Notları"na ekle
  (yeni kararlar da CLAUDE.md'ye yazılır, tek kaynak orası kalsın).
