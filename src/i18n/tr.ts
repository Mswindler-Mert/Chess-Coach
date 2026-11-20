// Turkish UI strings. Keys are English; values are shown to the user.
export const tr = {
  'app.title': 'Satranç Antrenörü',
  'app.tagline': 'Chess.com oyunlarını analiz et, sık yaptığın hataları bul, onlardan öğren.',

  'home.username.label': 'Chess.com kullanıcı adın',
  'home.username.placeholder': 'ör. hikaru',
  'home.username.submit': 'Oyunlarımı getir',
  'home.username.invalid': 'Geçerli bir Chess.com kullanıcı adı yaz (3–25 harf, rakam, _ veya -).',
  'home.continue': '{username} olarak devam et',
  'home.features.title': 'Neler olacak?',
  'home.features.puzzles.title': 'Hatalarımdan bulmacalar',
  'home.features.puzzles.body': 'Yaptığın hatalardan önceki pozisyonda en iyi hamleyi bul.',
  'home.features.openings.title': 'Açılış',
  'home.features.openings.body': 'Hangi açılışları oynadığını ve prensip hatalarını gör.',
  'home.features.endgames.title': 'Oyun sonu',
  'home.features.endgames.body':
    'Kaçırdığın oyun sonlarını ve temel matları Stockfish’e karşı çalış.',
  'home.features.dashboard.title': 'Panel',
  'home.features.dashboard.body': 'Blunder trendin, hata dağılımın ve haftanın odak konusu.',

  'nav.home': 'Ana sayfa',
  'nav.changeUser': 'Kullanıcı değiştir',
  'nav.backToGames': 'Oyunlara dön',

  'sync.running': 'Chess.com’dan oyunlar çekiliyor…',
  'sync.progress': '{done}/{total} ay çekildi',
  'sync.upToDate': 'Oyunlar güncel.',
  'sync.lastSynced': 'Son güncelleme: {time}',
  'sync.refresh': 'Yenile',
  'sync.error.notFound': '“{username}” Chess.com’da bulunamadı. Kullanıcı adını kontrol et.',
  'sync.error.rateLimited':
    'Chess.com şu an çok fazla istek aldığını söylüyor. Biraz sonra tekrar dene.',
  'sync.error.network': 'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.',
  'sync.error.other': 'Oyunlar çekilirken bir hata oldu. Tekrar dene.',

  'games.title': '{username} oyunları',
  'games.count': '{shown} oyun gösteriliyor (toplam {total})',
  'games.empty': 'Henüz oyun yok.',
  'games.emptyFiltered':
    'Seçili tempolarda oyun yok. Yukarıdan blitz veya bullet’ı açarak diğer oyunlarını görebilirsin.',
  'games.showMore': 'Daha fazla göster',
  'games.moves': '{count} hamle',
  'games.unrated': 'puansız',
  'games.filter.label': 'Tempo',

  'timeClass.bullet': 'Bullet',
  'timeClass.blitz': 'Blitz',
  'timeClass.rapid': 'Rapid',
  'timeClass.daily': 'Günlük',
  'units.minutes': 'dk',
  'units.days': 'gün',

  'outcome.win': 'Galibiyet',
  'outcome.loss': 'Mağlubiyet',
  'outcome.draw': 'Beraberlik',
  'outcome.short.win': 'G',
  'outcome.short.loss': 'M',
  'outcome.short.draw': 'B',

  'color.white': 'Beyaz',
  'color.black': 'Siyah',

  'endReason.checkmated': 'mat',
  'endReason.timeout': 'süre bitti',
  'endReason.resigned': 'terk',
  'endReason.abandoned': 'oyun terk edildi',
  'endReason.stalemate': 'pat',
  'endReason.agreed': 'anlaşmalı',
  'endReason.repetition': 'üç kez tekrar',
  'endReason.insufficient': 'yetersiz materyal',
  'endReason.timevsinsufficient': 'süre bitti, yetersiz materyal',
  'endReason.50move': '50 hamle kuralı',

  'viewer.loading': 'Oyun yükleniyor…',
  'viewer.notFound': 'Bu oyun bulunamadı.',
  'viewer.parseError': 'Bu oyunun hamleleri okunamadı.',
  'viewer.first': 'Başa dön',
  'viewer.prev': 'Önceki hamle',
  'viewer.next': 'Sonraki hamle',
  'viewer.last': 'Sona git',
  'viewer.openOnChessCom': 'Chess.com’da aç',
  'viewer.keyboardHint': 'İpucu: ← → tuşlarıyla hamleler arasında gezinebilirsin.',

  'footer.license': '{name} açık kaynaktır (GPL-3.0). Analiz motoru: Stockfish.',
} as const

export type MessageKey = keyof typeof tr
