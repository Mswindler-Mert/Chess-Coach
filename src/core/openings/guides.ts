import { Chess } from 'chess.js'
import type { Color } from '../games/model'

export interface BilingualText {
  tr: string
  en: string
}

export interface GuideMove {
  /** Standard algebraic notation, e.g. "e4", "Nf3", "O-O". */
  san: string
  /** Short, beginner-friendly reason for this move. */
  note: BilingualText
  /** Specific explanations for common wrong moves beginners try at this exact step (keyed by SAN). */
  wrongMoves?: Record<string, BilingualText>
}

export interface OpeningLine {
  id: string
  title: BilingualText
  /** Short cue: "When the opponent plays 3... Bc5" */
  when: BilingualText
  moves: readonly GuideMove[]
}

export interface OpeningGuide {
  id: string
  color: Color
  name: BilingualText
  tagline: BilingualText
  idea: BilingualText
  /** 1-sentence golden rule when the opponent deviates from the script. */
  offbookRule: BilingualText
  pros: readonly BilingualText[]
  cons: readonly BilingualText[]
  lines: readonly OpeningLine[]
}

export interface OpeningStep {
  index: number
  san: string
  uci: string
  from: string
  to: string
  side: Color
  isUserMove: boolean
  fenBefore: string
  fenAfter: string
  note: BilingualText
  wrongMoves?: Record<string, BilingualText>
}

const ITALIAN_BASE: readonly GuideMove[] = [
  {
    san: 'e4',
    note: {
      tr: 'Merkezi ele geçir ve vezir ile filinin yolunu aç.',
      en: 'Claim the centre and open lines for your queen and bishop.',
    },
  },
  {
    san: 'e5',
    note: {
      tr: 'Rakip de merkezde eşit pay istiyor.',
      en: 'Black mirrors you and fights for the centre.',
    },
  },
  {
    san: 'Nf3',
    note: {
      tr: 'Atı geliştirirken rakibin e5 piyonuna saldır — hem gelişim hem tehdit!',
      en: 'Develop the knight while attacking the e5 pawn — development with a threat!',
    },
  },
  {
    san: 'Nc6',
    note: {
      tr: 'Rakip atını geliştirerek e5 piyonunu koruyor.',
      en: 'Black develops a knight to defend the e5 pawn.',
    },
  },
  {
    san: 'Bc4',
    note: {
      tr: 'İtalyan Fil! Rakibin en zayıf karesi f7’ye nişan al ve kısa roka hazırlan.',
      en: 'The Italian Bishop! Aim at Black’s weakest square (f7) and prepare to castle.',
    },
  },
]

const LONDON_BASE: readonly GuideMove[] = [
  {
    san: 'd4',
    note: {
      tr: 'Merkezi d4 ile tut ve siyah kareli filinin yolunu aç.',
      en: 'Take the centre with d4 and open the diagonal for your dark-squared bishop.',
    },
  },
  {
    san: 'd5',
    note: {
      tr: 'Rakip merkezde karşılık veriyor.',
      en: 'Black meets you directly in the centre.',
    },
  },
  {
    san: 'Bf4',
    note: {
      tr: 'Londra’nın imzası: e3 oynamadan önce fili piyon zincirinin dışına çıkar!',
      en: 'The London signature: get the bishop outside the pawn chain before playing e3!',
    },
  },
]

const CLASSICAL_E5_BASE: readonly GuideMove[] = [
  {
    san: 'e4',
    note: {
      tr: 'Beyaz merkez piyonuyla başlıyor.',
      en: 'White opens with the king’s pawn.',
    },
  },
  {
    san: 'e5',
    note: {
      tr: 'Merkezi hemen paylaş — alan bırakma ve taşlarına yol aç.',
      en: 'Match White in the centre right away and free your pieces.',
    },
  },
  {
    san: 'Nf3',
    note: {
      tr: 'Beyaz atını çıkıp e5 piyonuna saldırıyor.',
      en: 'White develops the knight and attacks your e5 pawn.',
    },
  },
  {
    san: 'Nc6',
    note: {
      tr: 'En doğal savunma: piyonu korurken bir taş daha geliştiriyorsun.',
      en: 'The most natural defence: protect the pawn while developing a piece.',
    },
  },
]

const CARO_KANN_BASE: readonly GuideMove[] = [
  {
    san: 'e4',
    note: {
      tr: 'Beyaz merkez piyonunu sürüyor.',
      en: 'White starts with the king’s pawn.',
    },
  },
  {
    san: 'c6',
    note: {
      tr: 'Bir sonraki hamlede d5 sürüşünü destekle — piyon geri alınırken taş kaybetme.',
      en: 'Prepare d5 next move so you can recapture with a pawn and stay solid.',
    },
  },
  {
    san: 'd4',
    note: {
      tr: 'Beyaz iki piyonla merkezi kuruyor.',
      en: 'White builds a full two-pawn centre.',
    },
  },
  {
    san: 'd5',
    note: {
      tr: 'Beyazın e4 piyonuna hemen meydan oku!',
      en: 'Challenge White’s e4 pawn immediately!',
    },
  },
]

const QGD_BASE: readonly GuideMove[] = [
  {
    san: 'd4',
    note: {
      tr: 'Beyaz vezir piyonuyla başlıyor.',
      en: 'White opens with the queen’s pawn.',
    },
  },
  {
    san: 'd5',
    note: {
      tr: 'Merkezde sağlam bir dayanak kur.',
      en: 'Establish a solid foothold in the centre.',
    },
  },
  {
    san: 'c4',
    note: {
      tr: 'Vezir Gambiti: Beyaz kenar piyonuyla merkez piyonunu saptırmak istiyor.',
      en: 'The Queen’s Gambit: White offers a wing pawn to deflect your central pawn.',
    },
  },
  {
    san: 'e6',
    note: {
      tr: 'Gambiti alma — d5’i piyonla koru ve filinle roka hazırlan.',
      en: 'Decline the gambit — back up d5 with a pawn and open your dark-squared bishop.',
    },
  },
]

export const OPENING_GUIDES: readonly OpeningGuide[] = [
  {
    id: 'italian',
    color: 'white',
    name: { tr: 'İtalyan Açılışı', en: 'Italian Game' },
    tagline: {
      tr: 'Hızlı gelişim, merkez kontrolü ve zayıf f7 karesine baskı.',
      en: 'Fast development, central control, and pressure on f7.',
    },
    idea: {
      tr: 'Taşlarını hızla merkeze çıkar (Nf3, Bc4), şahını kısa rokla güvene al ve rakibin cevabına göre merkezde d4 ile alan kazan.',
      en: 'Develop quickly toward the centre (Nf3, Bc4), castle early, and expand with d4 depending on how Black replies.',
    },
    offbookRule: {
      tr: 'Rakip farklı oynarsa panik yok: 1) e4 piyonunu koru (d3 veya Nc3), 2) Atlarını ve fillerini çıkar, 3) Kısa rok yapıp şahını güvene al.',
      en: 'If Black goes off-book: 1) Protect e4 (d3 or Nc3), 2) Develop knights and bishops, 3) Castle kingside early.',
    },
    pros: [
      {
        tr: 'Tüm temel açılış prensiplerini (merkez, gelişim, hızlı rok) doğalca uygular.',
        en: 'Naturally follows every opening principle (centre, development, quick castling).',
      },
      {
        tr: 'Rakip dikkatsiz oynarsa f7 üzerinden hızlı hücum şansı verir.',
        en: 'Creates immediate attacking chances against f7 if Black is careless.',
      },
    ],
    cons: [
      {
        tr: 'Rakip 3…Nf6 oynadığında e4 piyonun tehdit altında kalır — korumayı unutma.',
        en: 'When Black plays 3…Nf6 your e4 pawn is attacked — remember to defend or counter-attack.',
      },
      {
        tr: 'Filin c4’te açıkta durduğu için d5 sürüşlerine karşı dikkatli ol.',
        en: 'The bishop on c4 can become a target for …d5 if you neglect the centre.',
      },
    ],
    lines: [
      {
        id: 'giuoco-piano',
        title: { tr: 'Giuoco Piano (Merkez Kurma)', en: 'Giuoco Piano (Build the Centre)' },
        when: {
          tr: 'Rakip 3…Bc5 ile filini çıkarsa',
          en: 'When Black develops the bishop with 3…Bc5',
        },
        moves: [
          ...ITALIAN_BASE,
          {
            san: 'Bc5',
            note: {
              tr: 'Rakip de en aktif karesine filini çıkardı.',
              en: 'Black develops the bishop to its most active square.',
            },
          },
          {
            san: 'c3',
            note: {
              tr: 'Bir sonraki hamlede d4 sürerek dev bir piyon merkezi kurmaya hazırlan!',
              en: 'Prepare d4 next move to build a strong two-pawn centre!',
            },
          },
          {
            san: 'Nf6',
            note: {
              tr: 'Rakip atını çıkarıp e4 piyonuna saldırıyor.',
              en: 'Black develops the knight and attacks e4.',
            },
          },
          {
            san: 'd4',
            note: {
              tr: 'Filine saldırarak merkezi aç! Rakip almak zorunda kalır.',
              en: 'Strike the centre while attacking the bishop! Black has to capture.',
            },
          },
          {
            san: 'exd4',
            note: {
              tr: 'Rakip piyonunu aldı.',
              en: 'Black captures the d4 pawn.',
            },
          },
          {
            san: 'cxd4',
            note: {
              tr: 'c3 piyonuyla geri al: Artık d4 ve e4 ile harika bir merkezin var ve filini de kovalıyorsun!',
              en: 'Recapture with the c-pawn: you now own a dream d4+e4 centre with tempo on the bishop!',
            },
          },
        ],
      },
      {
        id: 'two-knights-solid',
        title: { tr: 'İki At’a Karşı Sağlam Yol', en: 'Solid Setup vs Two Knights' },
        when: { tr: 'Rakip 3…Nf6 ile e4’e saldırırsa', en: 'When Black attacks e4 with 3…Nf6' },
        moves: [
          ...ITALIAN_BASE,
          {
            san: 'Nf6',
            note: {
              tr: 'Dikkat! Rakip atı e4 piyonunu tehdit ediyor.',
              en: 'Watch out! Black’s knight threatens your e4 pawn.',
            },
          },
          {
            san: 'd3',
            note: {
              tr: 'En sakin ve sağlam cevap: e4’ü piyonla koru ve c1 filinin yolunu aç.',
              en: 'The calmest reply: defend e4 solidly and open the diagonal for your c1 bishop.',
            },
          },
          {
            san: 'Bc5',
            note: {
              tr: 'Rakip filini çıkıp roka hazırlanıyor.',
              en: 'Black develops the bishop and prepares to castle.',
            },
          },
          {
            san: 'O-O',
            note: {
              tr: 'Kısa rok! Şahın artık güvende, taşların hazır — orta oyuna rahatça geçebilirsin.',
              en: 'Castle kingside! Your king is safe and your pieces are ready for the middlegame.',
            },
          },
        ],
      },
      {
        id: 'fried-liver',
        title: { tr: 'f7’ye Saldırı (Ng5)', en: 'Attack on f7 (Ng5)' },
        when: { tr: 'Rakip 3…Nf6 oynadığında saldırgan plan', en: 'Aggressive plan against 3…Nf6' },
        moves: [
          ...ITALIAN_BASE,
          {
            san: 'Nf6',
            note: {
              tr: 'Rakip e4’e saldırıyor ama f7 karesi hâlâ sadece şahla korunuyor.',
              en: 'Black attacks e4, while f7 is still only guarded by the king.',
            },
          },
          {
            san: 'Ng5',
            note: {
              tr: 'Hem at hem fil f7’ye bakıyor! Rakip hemen önlem almazsa vezir+kale çatalı yiyecek.',
              en: 'Both knight and bishop aim at f7! If Black ignores it, Nxf7 forks queen and rook.',
            },
          },
          {
            san: 'd5',
            note: {
              tr: 'Rakip filinin çaprazını piyonla kesmeye çalışıyor.',
              en: 'Black blocks your bishop’s diagonal with the d-pawn.',
            },
          },
          {
            san: 'exd5',
            note: {
              tr: 'Piyonu al ve c6’daki ata saldır! Rakip Nxd5 ile geri alırsa f7’ye büyük hücum başlar.',
              en: 'Capture the pawn and attack the c6 knight! If Black recaptures with Nxd5, a huge attack on f7 follows.',
            },
            wrongMoves: {
              Bxd5: {
                tr: 'Fille d5’i alırsan siyah f6 atıyla filini alır (Nxd5) — hem güçlü filini verirsin hem de f7 baskın biter! Piyonla (exd5) al ki filin f7’ye bakmaya devam etsin.',
                en: 'If you take with the bishop, Black captures it with the f6 knight (Nxd5) and ends your attack on f7! Capture with the e-pawn (exd5) to keep your bishop aiming at f7.',
              },
              Nxf7: {
                tr: 'Henüz erken! Önce d5’teki piyonu e-piyonunla al ki filinin yolu açık kalsın ve siyahın taşları dağılsın.',
                en: 'A bit too early! Capture on d5 with your e-pawn first so your bishop diagonal stays open.',
              },
            },
          },
        ],
      },
    ],
  },
  {
    id: 'london',
    color: 'white',
    name: { tr: 'Londra Sistemi', en: 'London System' },
    tagline: {
      tr: 'Her rakibe karşı kurulan kaya gibi sağlam piyon piramidi.',
      en: 'A rock-solid pyramid setup you can play against almost anything.',
    },
    idea: {
      tr: 'Önce d4 ve Bf4 oyna, ardından e3–c3–Nf3–Nd2 piramidini kur. Karmaşık ezber gerektirmez, taş asma riskini en aza indirir.',
      en: 'Play d4 and Bf4 first, then build the e3–c3–Nf3–Nd2 pyramid. Minimal theory and very hard to blunder.',
    },
    offbookRule: {
      tr: 'Rakip ne oynarsa oynasın piramidini kur: Bf4 → e3 → Nf3 → c3 → Nd2 → Bd3 → kısa rok. Sadece rakip piyonunu/taşını bedava bırakırsa al!',
      en: 'No matter what Black plays, build your pyramid: Bf4 → e3 → Nf3 → c3 → Nd2 → Bd3 → castle. Only deviate to grab free material!',
    },
    pros: [
      {
        tr: 'Rakip ne oynarsa oynasın hemen hemen aynı güvenli düzeni kurabilirsin.',
        en: 'You get the same reliable structure against almost any response from Black.',
      },
      {
        tr: 'd4 piyonun çift korumalı kalır; erken tuzaklara düşmek çok zordur.',
        en: 'Your d4 pawn stays well protected, making early traps very rare.',
      },
    ],
    cons: [
      {
        tr: 'Oyun biraz yavaş ilerler; fazla pasif kalırsan rakip rahat gelişir.',
        en: 'Positions can be slower; playing too passively lets Black equalise easily.',
      },
      {
        tr: 'Fili Bf4’e çıkmadan e3 oynarsan kendi filini içeride hapsedersin — sırayı unutma!',
        en: 'Never play e3 before Bf4 or you lock your bishop inside the pawn chain!',
      },
    ],
    lines: [
      {
        id: 'pyramid',
        title: { tr: 'Klasik Londra Piramidi', en: 'Classic London Pyramid' },
        when: {
          tr: 'Rakip …Nf6 ve …e6 ile sakin oynarsa',
          en: 'When Black plays calmly with …Nf6 and …e6',
        },
        moves: [
          ...LONDON_BASE,
          {
            san: 'Nf6',
            note: {
              tr: 'Rakip atını merkeze geliştiriyor.',
              en: 'Black develops the knight toward the centre.',
            },
          },
          {
            san: 'e3',
            note: {
              tr: 'Fil dışarıda olduğu için artık e3 ile d4’ü koruyup diğer filinin yolunu açabilirsin.',
              en: 'Now that the bishop is outside, e3 backs up d4 and frees your light-squared bishop.',
            },
          },
          {
            san: 'e6',
            note: {
              tr: 'Rakip de sağlam bir piyon yapısı kuruyor.',
              en: 'Black builds a solid pawn structure too.',
            },
          },
          {
            san: 'Nf3',
            note: {
              tr: 'Atını e5 ve d4’ü kontrol edecek en iyi kareye çıkar.',
              en: 'Develop your knight to control e5 and reinforce d4.',
            },
          },
          {
            san: 'Bd6',
            note: {
              tr: 'Rakip senin f4 filini değişmek istiyor.',
              en: 'Black offers to trade off your f4 bishop.',
            },
          },
          {
            san: 'Bg3',
            note: {
              tr: 'Fili geri çek! Rakip alırsa h-piyonunla (hxg3) geri alıp kalen için açık h-hattı kazanırsın.',
              en: 'Tuck the bishop back! If Black takes, recapture hxg3 to open the h-file for your rook.',
            },
          },
        ],
      },
      {
        id: 'vs-c5',
        title: { tr: 'Merkez Baskısına Karşı (…c5)', en: 'Meeting …c5 Pressure' },
        when: {
          tr: 'Rakip hemen 2…c5 ile d4’e saldırırsa',
          en: 'When Black challenges d4 early with 2…c5',
        },
        moves: [
          ...LONDON_BASE,
          {
            san: 'c5',
            note: {
              tr: 'Rakip hemen d4 merkez piyonuna baskı kuruyor.',
              en: 'Black immediately attacks your d4 centre pawn.',
            },
          },
          {
            san: 'e3',
            note: {
              tr: 'Sakin kal: d4’ü koru ve piyon piramidinin ilk ayağını at.',
              en: 'Stay calm: back up d4 and start building your pyramid.',
            },
          },
          {
            san: 'Nc6',
            note: {
              tr: 'Rakip d4 üzerindeki baskıyı artırıyor.',
              en: 'Black adds another attacker on d4.',
            },
          },
          {
            san: 'c3',
            note: {
              tr: 'Piramit tamam! d4 artık hem e3 hem c3 piyonlarıyla kaya gibi korunuyor.',
              en: 'Pyramid complete! d4 is now rock-solid, defended by both e3 and c3.',
            },
          },
          {
            san: 'Nf6',
            note: {
              tr: 'Rakip gelişimini sürdürüyor.',
              en: 'Black continues developing.',
            },
          },
          {
            san: 'Nd2',
            note: {
              tr: 'Vezir atını c3 yerine d2’den geliştir; böylece c-piyonun yerinde kalır ve e4’ü desteklersin.',
              en: 'Develop the knight to d2 so your c3 pawn stays put and you control e4.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'classical-e5',
    color: 'black',
    name: { tr: 'Klasik 1…e5 Savunması', en: 'Classical 1…e5 Defence' },
    tagline: {
      tr: '1.e4’e karşı en temel, açık ve aktif Siyah savunması.',
      en: 'The most principled, active Black response to 1.e4.',
    },
    idea: {
      tr: 'Merkezde eşit alan tut (e5), taşlarını aktif karelere hızla geliştir (Nc6, Bc5/Be7, Nf6) ve erken rok yaparak güvende kal.',
      en: 'Hold equal space in the centre (e5), develop your pieces actively (Nc6, Bc5/Be7, Nf6), and castle early.',
    },
    offbookRule: {
      tr: 'Beyaz farklı bir hamle oynarsa: 1) e5 piyonun güvende mi kontrol et, 2) Atlarını (Nc6, Nf6) ve filini (Bc5/Be7) çıkar, 3) Kısa rok yap.',
      en: 'If White deviates: 1) Check that e5 is protected, 2) Develop Nc6, Nf6, and Bc5/Be7, 3) Castle early.',
    },
    pros: [
      {
        tr: 'Taşların sıkışmaz; açık hatlarda taktik görüşünü hızla geliştirir.',
        en: 'Your pieces never get cramped; open lines sharpen your tactical vision fast.',
      },
      {
        tr: 'Hem İtalyan hem İspanyol’a karşı doğal prensiplerle rahat oynanır.',
        en: 'Plays naturally against both the Italian and Ruy Lopez using simple principles.',
      },
    ],
    cons: [
      {
        tr: 'Açık pozisyonlarda f7 karesi hassastır; erken rok yapmayı geciktirme.',
        en: 'In open positions f7 is sensitive — don’t delay castling.',
      },
    ],
    lines: [
      {
        id: 'vs-italian',
        title: { tr: 'İtalyan Açılışı’na Karşı', en: 'Against the Italian Game' },
        when: { tr: 'Beyaz 3.Bc4 oynarsa', en: 'When White plays 3.Bc4' },
        moves: [
          ...CLASSICAL_E5_BASE,
          {
            san: 'Bc4',
            note: {
              tr: 'Beyaz İtalyan Açılışı’na girdi ve f7’ye bakıyor.',
              en: 'White enters the Italian Game and eyes f7.',
            },
          },
          {
            san: 'Bc5',
            note: {
              tr: 'Sen de filini en aktif kareye çıkar (f2’ye bak) ve kısa roka yol aç!',
              en: 'Bring your bishop to its best square (eyeing f2) and clear the way to castle!',
            },
          },
          {
            san: 'O-O',
            note: {
              tr: 'Beyaz şahını güvene aldı.',
              en: 'White castles to safety.',
            },
          },
          {
            san: 'Nf6',
            note: {
              tr: 'Atını geliştirerek e4 piyonuna baskı kur ve bir sonraki hamlede roka hazır ol.',
              en: 'Develop the knight with pressure on e4 and get ready to castle next.',
            },
          },
          {
            san: 'd3',
            note: {
              tr: 'Beyaz e4 piyonunu korudu.',
              en: 'White defends the e4 pawn.',
            },
          },
          {
            san: 'O-O',
            note: {
              tr: 'Kısa rok! Artık şahın güvende, tüm hafif taşların oyunda.',
              en: 'Castle kingside! Your king is safe and your minor pieces are active.',
            },
          },
        ],
      },
      {
        id: 'vs-spanish',
        title: { tr: 'İspanyol’a (Ruy Lopez) Karşı', en: 'Against the Ruy Lopez' },
        when: { tr: 'Beyaz 3.Bb5 oynarsa', en: 'When White plays 3.Bb5' },
        moves: [
          ...CLASSICAL_E5_BASE,
          {
            san: 'Bb5',
            note: {
              tr: 'İspanyol Açılışı: Beyaz e5’i koruyan atına baskı yapıyor.',
              en: 'The Ruy Lopez: White puts pressure on the knight guarding e5.',
            },
          },
          {
            san: 'a6',
            note: {
              tr: 'File hemen soru sor: ya geri çekilsin ya da atı alsın!',
              en: 'Put the question to the bishop immediately: retreat or trade!',
            },
          },
          {
            san: 'Ba4',
            note: {
              tr: 'Beyaz filini geri çekti.',
              en: 'White retreats the bishop.',
            },
          },
          {
            san: 'Nf6',
            note: {
              tr: 'Atını geliştirip e4 piyonuna karşı baskı kur.',
              en: 'Develop your knight and counter-attack White’s e4 pawn.',
            },
          },
          {
            san: 'O-O',
            note: {
              tr: 'Beyaz rok yapıyor.',
              en: 'White castles.',
            },
          },
          {
            san: 'Be7',
            note: {
              tr: 'Filini geliştirip şahının önünü aç; sıradaki hamlen kısa rok!',
              en: 'Develop your bishop cleanly; next move you castle to safety!',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'caro-kann',
    color: 'black',
    name: { tr: 'Caro-Kann Savunması', en: 'Caro-Kann Defence' },
    tagline: {
      tr: '1.e4’e karşı sakin, sağlam ve taş asmayı azaltan kalkan.',
      en: 'A calm, sturdy shield against 1.e4 with clean piece development.',
    },
    idea: {
      tr: 'c6 ile d5’i hazırla, açık kareli filini (c8) piyon zincirinin dışına (Bf5) çıkar, sonra e6 ile kaya gibi savunma kur.',
      en: 'Support d5 with c6, develop your light-squared bishop outside the chain (Bf5), then lock down with e6.',
    },
    offbookRule: {
      tr: 'Beyaz 2.d4 oynamazsa bile planın basit: d5 ile merkezi al, açık kareli filini e6’dan önce dışarı çıkar, sonra atları geliştirip rok yap.',
      en: 'Even if White skips 2.d4, your plan stays simple: claim the centre with d5, get the light bishop out before e6, then develop and castle.',
    },
    pros: [
      {
        tr: 'Erken taktik tuzaklara karşı çok dayanıklıdır; piyon yapın hep sağlam kalır.',
        en: 'Very resistant to early traps; your pawn structure stays healthy into the endgame.',
      },
      {
        tr: 'Fransız Savunması’nın aksine c8 filin içeride sıkışıp kalmaz.',
        en: 'Unlike the French Defence, your c8 bishop gets out actively.',
      },
    ],
    cons: [
      {
        tr: 'İlk birkaç hamlede biraz daha az alanın olur; sabırlı gelişim ister.',
        en: 'You have slightly less space at first and need to develop patiently.',
      },
    ],
    lines: [
      {
        id: 'advance',
        title: { tr: 'İlerleme Varyasyonu (3.e5)', en: 'Advance Variation (3.e5)' },
        when: { tr: 'Beyaz 3.e5 ile piyonu sürerse', en: 'When White pushes 3.e5' },
        moves: [
          ...CARO_KANN_BASE,
          {
            san: 'e5',
            note: {
              tr: 'Beyaz alan kazanmak için e5 sürdü.',
              en: 'White pushes e5 to gain space.',
            },
          },
          {
            san: 'Bf5',
            note: {
              tr: 'Altın kural: e6 oynamadan önce filini dışarı çıkar! Yoksa içeride kilitli kalır.',
              en: 'Golden rule: get the bishop outside before playing e6, or it gets trapped behind your pawns.',
            },
          },
          {
            san: 'Nf3',
            note: {
              tr: 'Beyaz atını geliştiriyor.',
              en: 'White develops the kingside knight.',
            },
          },
          {
            san: 'e6',
            note: {
              tr: 'Artık e6 oynayıp d5’i koruyabilir ve siyah filinin yolunu açabilirsin. Harika sağlam yapı!',
              en: 'Now e6 backs up d5 and frees your dark-squared bishop. Rock-solid setup!',
            },
          },
        ],
      },
      {
        id: 'classical',
        title: { tr: 'Klasik Değişim (3.Nc3)', en: 'Classical Line (3.Nc3)' },
        when: { tr: 'Beyaz 3.Nc3 ile e4’ü korursa', en: 'When White defends e4 with 3.Nc3' },
        moves: [
          ...CARO_KANN_BASE,
          {
            san: 'Nc3',
            note: {
              tr: 'Beyaz atıyla e4 piyonunu koruyor.',
              en: 'White defends the e4 pawn with the knight.',
            },
          },
          {
            san: 'dxe4',
            note: {
              tr: 'Merkezde piyonu al — böylece c8 filinin yolu tamamen açılır.',
              en: 'Capture in the centre — this opens the diagonal for your c8 bishop.',
            },
          },
          {
            san: 'Nxe4',
            note: {
              tr: 'Beyaz atıyla geri aldı.',
              en: 'White recaptures with the knight.',
            },
          },
          {
            san: 'Bf5',
            note: {
              tr: 'Ata saldırarak filini tempo ile geliştir! Rakip atını kaçmak zorunda.',
              en: 'Develop the bishop with tempo on the knight! White has to move it again.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'qgd',
    color: 'black',
    name: { tr: 'Kabul Edilmemiş Vezir Gambiti', en: 'Queen’s Gambit Declined' },
    tagline: {
      tr: '1.d4’e karşı en güvenilir, zamansız klasik savunma.',
      en: 'The most trustworthy classical defence against 1.d4.',
    },
    idea: {
      tr: 'd5’i e6 ile tut, atını Nf6’ya çık, filini Be7’ye koyup açmazı çöz ve hemen kısa rok yap.',
      en: 'Keep d5 backed up by e6, develop Nf6 and Be7 to break any pin, and castle quickly.',
    },
    offbookRule: {
      tr: 'Beyaz 2.c4 oynamazsa da d5’i koru, Nf6 ve Be7 ile gelişip kısa rok yap; ardından …c5 ile beyazın merkezine saldır.',
      en: 'Even without 2.c4, keep d5 solid, develop Nf6 and Be7, castle early, and later counter-attack the centre with …c5.',
    },
    pros: [
      {
        tr: 'Zayıflığı olmayan, son derece dengeli ve anlaşılır bir şah güvenliği sağlar.',
        en: 'Gives great king safety with no glaring weaknesses.',
      },
    ],
    cons: [
      {
        tr: 'c8 fili başta e6 piyonunun arkasında kalır; ileride …c5 veya …b6 ile açılır.',
        en: 'Your c8 bishop starts behind the e6 pawn and opens up later with …c5 or …b6.',
      },
    ],
    lines: [
      {
        id: 'main',
        title: { tr: 'Klasik Gelişim (3.Nc3)', en: 'Classical Setup (3.Nc3)' },
        when: {
          tr: 'Beyaz 3.Nc3 ve 4.Bg5 ile açmaz kurarsa',
          en: 'When White plays 3.Nc3 and pins with 4.Bg5',
        },
        moves: [
          ...QGD_BASE,
          {
            san: 'Nc3',
            note: {
              tr: 'Beyaz d5’e baskıyı artırıyor.',
              en: 'White increases pressure on d5.',
            },
          },
          {
            san: 'Nf6',
            note: {
              tr: 'Atını çıkarıp d5’i bir kez daha koru.',
              en: 'Develop your knight and add another defender to d5.',
            },
          },
          {
            san: 'Bg5',
            note: {
              tr: 'Beyaz atını vezire açmaza aldı.',
              en: 'White pins your knight to your queen.',
            },
          },
          {
            san: 'Be7',
            note: {
              tr: 'Filini araya koyarak açmazı hemen boz ve kısa roka hazırlan!',
              en: 'Break the pin immediately with the bishop and prepare to castle!',
            },
          },
          {
            san: 'e3',
            note: {
              tr: 'Beyaz filinin yolunu açtı.',
              en: 'White opens the line for the f1 bishop.',
            },
          },
          {
            san: 'O-O',
            note: {
              tr: 'Kısa rok! Şahın tamamen güvende, merkezin sağlam.',
              en: 'Castle kingside! Your king is completely safe and your centre holds firm.',
            },
          },
        ],
      },
      {
        id: 'exchange',
        title: { tr: 'Değişim Varyasyonu (3.cxd5)', en: 'Exchange Variation (3.cxd5)' },
        when: {
          tr: 'Beyaz 3.cxd5 ile merkezde hemen değişirse',
          en: 'When White trades on d5 immediately',
        },
        moves: [
          ...QGD_BASE,
          {
            san: 'cxd5',
            note: {
              tr: 'Beyaz d5 piyonunu hemen aldı.',
              en: 'White immediately captures on d5.',
            },
          },
          {
            san: 'exd5',
            note: {
              tr: 'Piyonla geri al! Bu alış sayesinde sıkışık duran c8 filinin önü de açılmış oldu.',
              en: 'Recapture with the e-pawn! Bonus: your c8 bishop’s diagonal is now wide open.',
            },
          },
          {
            san: 'Nc3',
            note: {
              tr: 'Beyaz atını geliştiriyor.',
              en: 'White develops the knight.',
            },
          },
          {
            san: 'Nf6',
            note: {
              tr: 'Atını doğal karesine çıkar ve merkezi kontrol et.',
              en: 'Develop your knight naturally and control the centre.',
            },
          },
          {
            san: 'Bg5',
            note: {
              tr: 'Beyaz atını açmaza alıyor.',
              en: 'White pins the knight.',
            },
          },
          {
            san: 'Be7',
            note: {
              tr: 'Açmazı boz ve bir sonraki hamlede kısa rok yapmaya hazır ol!',
              en: 'Unpin cleanly and get ready to castle next move!',
            },
          },
        ],
      },
    ],
  },
]

/** Expands one opening variation into playable step-by-step positions. */
export function buildOpeningSteps(guide: OpeningGuide, lineId: string): OpeningStep[] {
  const line = guide.lines.find((l) => l.id === lineId)
  if (!line) return []
  const chess = new Chess()
  const steps: OpeningStep[] = []
  line.moves.forEach((entry, index) => {
    const fenBefore = chess.fen()
    const side: Color = chess.turn() === 'w' ? 'white' : 'black'
    const move = chess.move(entry.san)
    steps.push({
      index,
      san: move.san,
      uci: move.lan,
      from: move.from,
      to: move.to,
      side,
      isUserMove: side === guide.color,
      fenBefore,
      fenAfter: chess.fen(),
      note: entry.note,
      wrongMoves: entry.wrongMoves,
    })
  })
  return steps
}

export function openingLineKey(guideId: string, lineId: string): string {
  return `${guideId}:${lineId}`
}

/** Maps a game opening family name (e.g. "Italian Game") to an interactive guide id when we have one. */
export function guideIdForOpeningFamily(family: string): string | null {
  const lower = family.toLowerCase()
  if (lower.includes('italian') || lower.includes('giuoco')) return 'italian'
  if (lower.includes('london')) return 'london'
  if (lower.includes('caro-kann') || lower.includes('caro kann')) return 'caro-kann'
  if (lower.includes('queen') && lower.includes('gambit')) return 'qgd'
  if (lower.includes('ruy lopez') || lower.includes('spanish') || lower.includes('four knights')) {
    return 'classical-e5'
  }
  return null
}
