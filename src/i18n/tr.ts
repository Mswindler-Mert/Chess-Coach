// Turkish UI strings. Keys are English; values are shown to the user.
export const tr = {
  'app.title': 'Satranç Antrenörü',
  'app.tagline': 'Chess.com oyunlarını analiz et, sık yaptığın hataları bul, onlardan öğren.',
  'home.username.label': 'Chess.com kullanıcı adın',
  'home.username.placeholder': 'ör. hikaru',
  'home.username.submit': 'Oyunlarımı getir',
  'home.username.comingSoon': 'Oyun çekme bir sonraki aşamada (M1) gelecek.',
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
  'footer.license': '{name} açık kaynaktır (GPL-3.0). Analiz motoru: Stockfish.',
} as const

export type MessageKey = keyof typeof tr
