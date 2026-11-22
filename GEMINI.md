# Satranç Antrenörü — Kalıcı Kurallar (GEMINI.md)

1. Yeni bir özellik eklemeden veya büyük bir değişiklik yapmadan önce mevcut durumu otomatik olarak `git commit` ile yedekle.
2. GitHub'a push yapmadan önce sırasıyla `npm run format:check`, `npm run lint`, `npm run typecheck` ve `npm test` komutlarını çalıştır; format hatası çıkarsa Prettier (`npm run format`) ile düzelt, tüm kontroller geçmeden push yapma.
