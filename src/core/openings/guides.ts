import { Chess } from 'chess.js'
import type { Color } from '../games/model'

export interface BilingualText {
  tr: string
  en: string
}

export type WhatIfKind = 'punish' | 'danger' | 'exchange' | 'deviation'

export interface WhatIfMove {
  san: string
  note: BilingualText
}

export interface WhatIfScenario {
  id: string
  kind: WhatIfKind
  /** Short clickable question button label. */
  prompt: BilingualText
  /**
   * 'beforeStep' (default) plays from the current user-turn position (`step.fenBefore`).
   * 'beforePrev' rewinds one half-move to show an alternative move by the opponent.
   */
  anchor?: 'beforeStep' | 'beforePrev'
  /** Moves played live on the board so the player sees the consequence visually. */
  moves: readonly WhatIfMove[]
  /** Takeaway shown at the end of the scenario. */
  takeaway: BilingualText
}

export interface WhatIfStep {
  index: number
  san: string
  uci: string
  from: string
  to: string
  side: Color
  fenBefore: string
  fenAfter: string
  note: BilingualText
}

export interface GuideMove {
  /** Standard algebraic notation, e.g. "e4", "Nf3", "O-O". */
  san: string
  /** Short, beginner-friendly reason for this move. */
  note: BilingualText
  /** Specific explanations for common wrong moves beginners try at this exact step (keyed by SAN). */
  wrongMoves?: Record<string, BilingualText>
  /** Interactive "What if?" board scenarios playable right from this step. */
  whatIfs?: readonly WhatIfScenario[]
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
  whatIfs?: readonly WhatIfScenario[]
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
    whatIfs: [
      {
        id: 'italian-opp-d5',
        kind: 'deviation',
        anchor: 'beforePrev',
        prompt: {
          tr: 'Ya rakip e5 yerine 1…d5 oynayıp piyonuma saldırırsa?',
          en: 'What if Black plays 1…d5 instead of 1…e5?',
        },
        moves: [
          {
            san: 'd5',
            note: {
              tr: 'Rakip e5 oynamadı, İskandinav Savunması ile direkt e4 piyonuna saldırdı! Burada İtalyan planından çıkmalısın.',
              en: 'Black skips 1…e5 and hits e4 directly (Scandinavian). Step out of the Italian plan here.',
            },
          },
          {
            san: 'exd5',
            note: {
              tr: 'Korkma, piyonu al! Eğer 2.Nf3 oynayıp bıraksaydın rakip dxe4 ile bedava piyon alır ve atını kovalardı.',
              en: 'Take the pawn! If you played 2.Nf3 instead, Black would win e4 for free and kick your knight.',
            },
          },
          {
            san: 'Qxd5',
            note: {
              tr: 'Rakip vezirini oyunun 2. hamlesinde erkenden ortaya çıkardı.',
              en: 'Black brings the queen out way too early on move 2.',
            },
          },
          {
            san: 'Nc3',
            note: {
              tr: 'Atını geliştirirken vezire saldır! Rakip veziri kaçmak zorunda kalır, sen bedava gelişim kazanırsın.',
              en: 'Develop your knight with tempo on the queen! Black must waste a move retreating.',
            },
          },
        ],
        takeaway: {
          tr: 'Rakip 1…d5 sürerse İtalyan planı biter: 2.exd5 al ve 3.Nc3 ile veziri kovala! (Ayrıntılı dersi “1.e4 Karar Haritası”nda.)',
          en: 'Against 1…d5, leave the Italian plan: capture 2.exd5 and chase the queen with 3.Nc3!',
        },
      },
      {
        id: 'italian-if-bc4-first',
        kind: 'danger',
        prompt: {
          tr: 'Neden 2.Bc4 değil de önce 2.Nf3 oynuyoruz?',
          en: 'Why 2.Nf3 first instead of 2.Bc4?',
        },
        moves: [
          {
            san: 'Bc4',
            note: {
              tr: 'Fili erken çıkarırsan rakibin e5 piyonuna hiç tehdit yok.',
              en: 'Developing the bishop first creates no immediate threat on e5.',
            },
          },
          {
            san: 'Nf6',
            note: {
              tr: 'Rakip hemen atıyla senin e4 piyonuna saldırır — şimdi savunmaya geçmek zorunda kalırsın!',
              en: 'Black immediately attacks your e4 pawn — now you are forced onto the defensive!',
            },
          },
        ],
        takeaway: {
          tr: 'Önce 2.Nf3 oyna ki saldıran taraf SEN ol; rakip savunma yapmak zorunda kalsın.',
          en: 'Play 2.Nf3 first so YOU set the threat and force Black to defend.',
        },
      },
    ],
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
    whatIfs: [
      {
        id: 'italian-opp-f6-blunder',
        kind: 'punish',
        anchor: 'beforePrev',
        prompt: {
          tr: 'Rakip piyonu atla değil 2…f6?? ile korursa nasıl cezalandırırım?',
          en: 'How do I punish Black if they defend with 2…f6?? instead of Nc6?',
        },
        moves: [
          {
            san: 'f6',
            note: {
              tr: 'Başlangıç seviyesinde çok yapılan dev hata! Rakip şahının çaprazını açtı.',
              en: 'A classic beginner blunder! Black weakens the king’s diagonal.',
            },
          },
          {
            san: 'Nxe5',
            note: {
              tr: 'Atı feda edip piyonu al! Rakip atını piyonla alırsa şahı felakete sürüklenir.',
              en: 'Sacrifice the knight for the pawn! If Black takes back, their king is crushed.',
            },
          },
          {
            san: 'fxe5',
            note: {
              tr: 'Rakip “bedava at!” diye sevinip aldı…',
              en: 'Black happily grabs the “free” knight…',
            },
          },
          {
            san: 'Qh5+',
            note: {
              tr: 'ŞAH! Rakip g6 sürerse Qxe5+ ile h8 kalesini düşürürsün, şah kaçarsa mat gelir!',
              en: 'CHECK! After g6, Qxe5+ forks king and h8 rook; if the king runs, mate follows!',
            },
          },
        ],
        takeaway: {
          tr: 'Rakip e5 piyonunu f6 ile korursa bariz geriye düşer: hemen Nxe5! ardından Qh5+ ile oyunu dağıt.',
          en: 'If Black defends e5 with f6, punish immediately with Nxe5! followed by Qh5+.',
        },
      },
      {
        id: 'italian-opp-d6-philidor',
        kind: 'deviation',
        anchor: 'beforePrev',
        prompt: {
          tr: 'Rakip 2…Nc6 yerine 2…d6 (Philidor) oynarsa ne yaparım?',
          en: 'What if Black plays 2…d6 instead of 2…Nc6?',
        },
        moves: [
          {
            san: 'd6',
            note: {
              tr: 'Rakip pasif kaldı ve kendi f8 filinin önünü kapattı.',
              en: 'Black plays passively and locks in their own dark-squared bishop.',
            },
          },
          {
            san: 'd4',
            note: {
              tr: 'Hemen merkezi aç! Rakip sıkışık olduğu için alan avantajı tamamen sende kalır.',
              en: 'Open the centre right away! With Black cramped, you seize full control.',
            },
          },
          {
            san: 'exd4',
            note: {
              tr: 'Rakip merkezi bırakmak zorunda kaldı.',
              en: 'Black gives up the centre.',
            },
          },
          {
            san: 'Nxd4',
            note: {
              tr: 'Atın merkezin tam ortasına yerleşti, tüm taşlarının yolu açık!',
              en: 'Your knight dominates the centre and every piece has open lines!',
            },
          },
        ],
        takeaway: {
          tr: 'Rakip 2…d6 ile pasif kalırsa c4 filiyle beklemek yerine hemen 3.d4 ile merkezi patlat.',
          en: 'Against passive 2…d6, strike immediately with 3.d4 to grab the centre.',
        },
      },
    ],
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
            whatIfs: [
              {
                id: 'gp-opp-passive-h6',
                kind: 'punish',
                anchor: 'beforePrev',
                prompt: {
                  tr: 'Rakip 3…Bc5 yerine 3…h6? gibi yavaş oynarsa nasıl cezalandırırım?',
                  en: 'How do I punish passive play like 3…h6? instead of 3…Bc5?',
                },
                moves: [
                  {
                    san: 'h6',
                    note: {
                      tr: 'Rakip merkez ve gelişimi bırakıp kenar piyonuyla zaman kaybetti.',
                      en: 'Black wastes a tempo on a flank pawn instead of developing.',
                    },
                  },
                  {
                    san: 'd4',
                    note: {
                      tr: 'Hiç beklemeden d4 ile merkezi parçala! Gelişim üstünlüğün hemen hissedilir.',
                      en: 'Strike immediately with d4! Your lead in development takes over.',
                    },
                  },
                  {
                    san: 'exd4',
                    note: {
                      tr: 'Rakip merkezi bırakıyor.',
                      en: 'Black surrenders the centre.',
                    },
                  },
                  {
                    san: 'Nxd4',
                    note: {
                      tr: 'Merkez tamamen senin, taşların serbest, rakip hâlâ tek taşla bekliyor!',
                      en: 'You own the centre while Black is stuck far behind in development!',
                    },
                  },
                ],
                takeaway: {
                  tr: 'Rakip taş çıkarmayı bırakıp h6/a6 gibi yavaş hamle yaparsa hemen d4 ile merkezi aç ve cezalandır.',
                  en: 'When Black wastes time on flank moves like h6/a6, punish by opening the centre with d4.',
                },
              },
              {
                id: 'gp-premature-d4',
                kind: 'danger',
                prompt: {
                  tr: 'Ya 4.c3 hazırlığını atlayıp hemen 4.d4 sürersem ne olur?',
                  en: 'What happens if I skip 4.c3 and push 4.d4 right away?',
                },
                moves: [
                  {
                    san: 'd4',
                    note: {
                      tr: 'c3 desteği olmadan d4 sürdün.',
                      en: 'You push d4 without c3 backing it up.',
                    },
                  },
                  {
                    san: 'exd4',
                    note: {
                      tr: 'Rakip piyonu alıyor.',
                      en: 'Black takes the pawn.',
                    },
                  },
                  {
                    san: 'Nxd4',
                    note: {
                      tr: 'Piyonla geri alamadığın için atla almak zorunda kalıyorsun…',
                      en: 'Without a c3 pawn you have to recapture with the knight…',
                    },
                  },
                  {
                    san: 'Nxd4',
                    note: {
                      tr: 'Rakip atları değişip baskını kırıyor, artık iki piyonlu dev merkezin yok!',
                      en: 'Black trades off your knight and breaks your dream pawn centre!',
                    },
                  },
                ],
                takeaway: {
                  tr: 'Önce 4.c3 oyna ki rakip exd4 aldığında cxd4 ile iki piyonlu dev merkez (d4+e4) kurabilesin.',
                  en: 'Play 4.c3 first so you can recapture cxd4 and keep a huge d4+e4 pawn centre.',
                },
              },
            ],
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
            whatIfs: [
              {
                id: 'gp-opp-bb6',
                kind: 'punish',
                prompt: {
                  tr: 'Ya 5.d4 sonrası rakip almayıp filini 5…Bb6 ile kaçarsa?',
                  en: 'What if after 5.d4 Black retreats 5…Bb6 instead of capturing?',
                },
                moves: [
                  {
                    san: 'd4',
                    note: {
                      tr: 'Merkezi açıp file saldırıyorsun.',
                      en: 'You hit the centre and the bishop.',
                    },
                  },
                  {
                    san: 'Bb6',
                    note: {
                      tr: 'Rakip piyonu almayıp filini geri çekti — büyük hata!',
                      en: 'Black skips the capture and retreats the bishop — a big mistake!',
                    },
                  },
                  {
                    san: 'dxe5',
                    note: {
                      tr: 'Bedava e5 piyonunu alırken rakibin f6 atına da saldırıyorsun!',
                      en: 'You win the e5 pawn for free AND kick the f6 knight!',
                    },
                  },
                  {
                    san: 'Ng4',
                    note: {
                      tr: 'Rakip atı garip bir kareye kaçmak zorunda kaldı, sen hem piyon öndesin hem merkez sende.',
                      en: 'Black’s knight is pushed aside while you are up a clean pawn with a huge centre.',
                    },
                  },
                ],
                takeaway: {
                  tr: 'Rakip d4 piyonunu almaktan çekinip filini kaçarsa hemen dxe5 ile merkez piyonunu kazan!',
                  en: 'If Black declines d4 and retreats the bishop, immediately win the e5 pawn with dxe5!',
                },
              },
            ],
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
            whatIfs: [
              {
                id: 'gp-exchange-order',
                kind: 'exchange',
                prompt: {
                  tr: 'Takası piyonla (cxd4) mı, atla (Nxd4) mı geri almalıyım?',
                  en: 'Should I recapture with the pawn (cxd4) or the knight (Nxd4)?',
                },
                moves: [
                  {
                    san: 'Nxd4',
                    note: {
                      tr: 'Atla geri alırsan c3 piyonun boşa beklemiş olur…',
                      en: 'Recapturing with the knight wastes the whole point of 4.c3…',
                    },
                  },
                  {
                    san: 'Nxe4',
                    note: {
                      tr: 'Üstelik rakip senin korumasız kalan e4 piyonunu BEDAVA alır!',
                      en: 'Even worse, Black immediately snatches your undefended e4 pawn for FREE!',
                    },
                  },
                ],
                takeaway: {
                  tr: 'Her zaman piyonla (cxd4) al! Hem c5 filine saldırıp tempo kazanırsın hem de dev merkezin oluşur.',
                  en: 'Always recapture with cxd4! You hit the c5 bishop with tempo and build a monster centre.',
                },
              },
              {
                id: 'gp-after-bb4-check',
                kind: 'danger',
                prompt: {
                  tr: '6.cxd4 sonrası rakip 6…Bb4+ şah çekerse ne yapmalıyım?',
                  en: 'What if Black plays 6…Bb4+ check after 6.cxd4?',
                },
                moves: [
                  {
                    san: 'cxd4',
                    note: {
                      tr: 'Piyonla aldın ve filini kovaladın.',
                      en: 'You recapture and attack the bishop.',
                    },
                  },
                  {
                    san: 'Bb4+',
                    note: {
                      tr: 'Rakip filini kaçarken şah çekti — şimdi e4 piyonun da tehdit altında!',
                      en: 'Black retreats with check — and remember your e4 pawn is also attacked!',
                    },
                  },
                  {
                    san: 'Bd2',
                    note: {
                      tr: 'En güvenli yol: Filini araya kapat! Atla (Nc3) kapatırsan Nxe4 ile e4 piyonunu kaybederdin.',
                      en: 'Safest block: interpose the bishop! Blocking with Nc3 would let Black take e4.',
                    },
                  },
                  {
                    san: 'Bxd2+',
                    note: {
                      tr: 'Rakip filleri takas ediyor.',
                      en: 'Black trades bishops.',
                    },
                  },
                  {
                    san: 'Nbxd2',
                    note: {
                      tr: 'b1 atıyla geri al: Hem gelişim kazandın hem de e4 piyonun güvende kaldı!',
                      en: 'Recapture with the b1 knight: you develop cleanly and keep e4 safe!',
                    },
                  },
                ],
                takeaway: {
                  tr: '6…Bb4+ gelirse panik yok: 7.Bd2 ile şahı kapat, takas sonrası b1 atıyla geri al.',
                  en: 'Against 6…Bb4+, calmly block with 7.Bd2 and recapture with the b1 knight.',
                },
              },
            ],
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
            whatIfs: [
              {
                id: 'two-knights-ignore-e4',
                kind: 'danger',
                prompt: {
                  tr: 'Ya e4’ü korumayıp hemen 4.O-O (kısa rok) yaparsam ne olur?',
                  en: 'What happens if I ignore e4 and castle 4.O-O immediately?',
                },
                moves: [
                  {
                    san: 'O-O',
                    note: {
                      tr: 'Rok yaptın ama merkezdeki e4 piyonun korumasız kaldı.',
                      en: 'You castled, leaving your central e4 pawn undefended.',
                    },
                  },
                  {
                    san: 'Nxe4',
                    note: {
                      tr: 'Rakip merkez piyonunu bedava aldı! Şimdi piyon geridesin.',
                      en: 'Black snatches your central pawn for free!',
                    },
                  },
                ],
                takeaway: {
                  tr: 'Rakip 3…Nf6 oynadığında ilk görevin e4 piyonunu korumaktır (4.d3 veya 4.Nc3).',
                  en: 'When Black plays 3…Nf6, protect e4 first (4.d3 or 4.Nc3) before castling.',
                },
              },
            ],
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
            whatIfs: [
              {
                id: 'fl-opp-ignores-f7',
                kind: 'punish',
                prompt: {
                  tr: '4.Ng5 sonrası rakip tehlikeyi görmeyip 4…Bc5?? oynarsa?',
                  en: 'What if Black misses the threat and plays 4…Bc5??',
                },
                moves: [
                  {
                    san: 'Ng5',
                    note: {
                      tr: 'f7 karesine hem at hem fil ile saldırdın.',
                      en: 'You attack f7 twice with knight and bishop.',
                    },
                  },
                  {
                    san: 'Bc5',
                    note: {
                      tr: 'Rakip f7’yi unuttu!',
                      en: 'Black forgets to block f7!',
                    },
                  },
                  {
                    san: 'Nxf7',
                    note: {
                      tr: 'ÇATAL! Atın aynı anda hem vezire (d8) hem kaleye (h8) saldırıyor — rakip en az kale kaybeder!',
                      en: 'FORK! Your knight attacks both queen (d8) and rook (h8) — winning at least a rook!',
                    },
                  },
                ],
                takeaway: {
                  tr: 'Rakip 4…d5 ile filinin yolunu kesmezse 5.Nxf7 çatalı oyunu anında kazandırır!',
                  en: 'If Black fails to block with 4…d5, 5.Nxf7 forks queen and rook immediately!',
                },
              },
            ],
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
            whatIfs: [
              {
                id: 'fl-why-not-bxd5',
                kind: 'exchange',
                prompt: {
                  tr: 'Neden 5.Bxd5 ile fille almıyoruz? Tahtada gör!',
                  en: 'Why NOT capture with the bishop (5.Bxd5)? See it live!',
                },
                moves: [
                  {
                    san: 'Bxd5',
                    note: {
                      tr: 'Eğer filinle d5 piyonunu alırsan…',
                      en: 'If you take the d5 pawn with your bishop…',
                    },
                  },
                  {
                    san: 'Nxd5',
                    note: {
                      tr: 'Siyah f6 atıyla senin en güçlü saldırı filini BEDAVA takas eder!',
                      en: 'Black immediately trades off your strongest attacking bishop!',
                    },
                  },
                  {
                    san: 'Nxf7',
                    note: {
                      tr: 'Artık filin olmadığı için f7’ye dalsan bile şah atını basitçe alır (Kxf7). Hücumun tamamen bitti!',
                      en: 'Without the bishop, even Nxf7 just loses the knight to Kxf7. Your whole attack is gone!',
                    },
                  },
                ],
                takeaway: {
                  tr: 'Takası piyonla (5.exd5) başlat! Böylece c4 filin hayatta kalır ve f7’ye bakmaya devam eder.',
                  en: 'Always capture with the pawn (5.exd5) so your c4 bishop stays alive aiming at f7.',
                },
              },
              {
                id: 'fl-fried-liver-punish',
                kind: 'punish',
                prompt: {
                  tr: '5.exd5 sonrası rakip 5…Nxd5?? ile geri alırsa nasıl eziyoruz?',
                  en: 'How do we crush Black if they recapture 5…Nxd5??',
                },
                moves: [
                  {
                    san: 'exd5',
                    note: {
                      tr: 'Piyonla aldın ve c6 atına saldırdın.',
                      en: 'You take with the pawn and attack the c6 knight.',
                    },
                  },
                  {
                    san: 'Nxd5',
                    note: {
                      tr: 'Rakip tuzağa düştü! f6 atını çekerek d8 vezirinin f6 karesindeki savunmasını bıraktı.',
                      en: 'Black walks straight into the Fried Liver trap!',
                    },
                  },
                  {
                    san: 'Nxf7',
                    note: {
                      tr: 'BOOM! Atı f7’de feda et! Hem vezir hem kale tehdit altında, şah almak zorunda!',
                      en: 'BOOM! Sacrifice the knight on f7 — forking queen and rook so the king must take!',
                    },
                  },
                  {
                    san: 'Kxf7',
                    note: {
                      tr: 'Siyah şah ortaya çekildi.',
                      en: 'Black’s king is dragged into the open.',
                    },
                  },
                  {
                    san: 'Qf3+',
                    note: {
                      tr: 'ŞAH + d5 atına çift saldırı! Rakip şahını koruyamaz, d5 atını kazanır ve mat saldırısına geçersin!',
                      en: 'CHECK + double attack on the d5 knight! Black’s king is exposed and White is winning!',
                    },
                  },
                ],
                takeaway: {
                  tr: 'Rakip 5…Nxd5 oynarsa hiç çekinmeden 6.Nxf7! Kxf7 7.Qf3+ oyna — ünlü Kızarmış Ciğer saldırısı!',
                  en: 'If Black plays 5…Nxd5, unleash 6.Nxf7! Kxf7 7.Qf3+ — the classic Fried Liver attack!',
                },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'e4-responses',
    color: 'white',
    name: {
      tr: '1.e4 Karar Haritası (Rakip e5 Oynamazsa)',
      en: '1.e4 Decision Map (When Black Skips …e5)',
    },
    tagline: {
      tr: 'İtalyan oynamak istedin ama rakip d5, c5, e6 veya c6 sürdü — panik olmadan nasıl devam edersin?',
      en: 'You want the Italian, but Black plays d5, c5, e6, or c6 — see exact board answers for each.',
    },
    idea: {
      tr: '1.e4 sonrası İtalyan açılışı ancak rakip 1…e5 oynarsa mümkündür. Rakip farklı cevap verdiğinde ezbere değil, merkez prensibiyle doğru karşı planı uygula.',
      en: 'The Italian only happens after 1…e5. When Black replies differently, switch smoothly to the right central counter-plan.',
    },
    offbookRule: {
      tr: 'Rakip e4’üne saldırırsa (1…d5) piyonu al; merkez boş bırakırsa (1…e6, 1…c6) hemen 2.d4 ile iki piyonlu merkez kur!',
      en: 'If Black attacks e4 (1…d5), take it! If Black leaves the centre open (1…e6, 1…c6), immediately build a two-pawn centre with 2.d4!',
    },
    pros: [
      {
        tr: '1.e4 oynarken rakip sürpriz yaptığında şok olup blunder yapmanı bitirir.',
        en: 'Stops opening panic and early blunders when Black avoids 1…e5.',
      },
      {
        tr: 'Her cevaba karşı basit, ezbersiz ve yüksek tempolu gelişim sağlar.',
        en: 'Gives simple, high-tempo development against every common reply.',
      },
    ],
    cons: [
      {
        tr: 'İtalyan filini (Bc4) her pozisyona ezbere çıkmaya çalışırsan taş veya tempo kaybedersin.',
        en: 'Autopiloting Bc4 regardless of Black’s reply loses time or material.',
      },
    ],
    lines: [
      {
        id: 'scandinavian',
        title: { tr: 'Rakip 1…d5 Oynarsa (İskandinav)', en: 'When Black Plays 1…d5 (Scandinavian)' },
        when: {
          tr: 'Rakip 1.e4 piyonuna hemen saldırıp seni şaşırtmak isterse',
          en: 'When Black immediately attacks your e4 pawn',
        },
        moves: [
          {
            san: 'e4',
            note: {
              tr: 'Merkezi açarak oyuna başla.',
              en: 'Open with the king’s pawn.',
            },
          },
          {
            san: 'd5',
            note: {
              tr: 'Rakip e5 yerine d5 sürdü ve e4 piyonunu istiyor! İtalyan planından burada çıkıyoruz.',
              en: 'Black plays 1…d5 attacking e4! Leave the Italian plan right here.',
            },
          },
          {
            san: 'exd5',
            note: {
              tr: 'Tereddüt etme, piyonu al! Eğer piyonu bırakıp 2.Nf3 oynarsan rakip e4’ü bedava alır.',
              en: 'Capture immediately! Leaving e4 hanging with 2.Nf3 hands Black a free central pawn.',
            },
            wrongMoves: {
              Nf3: {
                tr: '2.Nf3 oynarsan rakip 2…dxe4 ile piyonunu bedava alır ve üstüne atını kovalar! Önce 2.exd5 ile d5 piyonunu al.',
                en: 'After 2.Nf3, Black wins your e4 pawn for free with 2…dxe4 and kicks your knight! Capture 2.exd5 first.',
              },
              e5: {
                tr: '2.e5 sürmek fena değil ama rakibin c8 filinin yolu tamamen açılır. En güçlü ve kolay yol 2.exd5 ile alıp veziri kovalamak!',
                en: '2.e5 frees Black’s c8 bishop easily. Capturing 2.exd5 to chase the queen is much stronger!',
              },
            },
            whatIfs: [
              {
                id: 'scand-if-nf3-takes',
                kind: 'danger',
                prompt: {
                  tr: 'Ya ben 2.Nf3 oynarsam ve rakip piyonumu alırsa ne olur?',
                  en: 'What if I play 2.Nf3 and Black takes my e4 pawn?',
                },
                moves: [
                  {
                    san: 'Nf3',
                    note: {
                      tr: 'İtalyan alışkanlığıyla 2.Nf3 oynadın ama e4 piyonun korumasız kaldı.',
                      en: 'Out of Italian habit you play 2.Nf3, leaving e4 undefended.',
                    },
                  },
                  {
                    san: 'dxe4',
                    note: {
                      tr: 'Rakip merkez piyonunu BEDAVA aldı ve aynı anda f3 atına saldırdı!',
                      en: 'Black takes your central pawn for FREE and attacks your f3 knight!',
                    },
                  },
                  {
                    san: 'Ng5',
                    note: {
                      tr: 'Atını kaçmak zorunda kaldın; rakip hem piyon önde hem gelişimde rahat!',
                      en: 'Your knight has to run while Black is up a pawn with easy development!',
                    },
                  },
                ],
                takeaway: {
                  tr: 'Rakip 1…d5 oynayınca asla ezbere 2.Nf3 yapma: önce 2.exd5 ile piyonu al!',
                  en: 'Never autopilot 2.Nf3 against 1…d5 — capture 2.exd5 first!',
                },
              },
              {
                id: 'scand-if-nf3-no-take',
                kind: 'deviation',
                prompt: {
                  tr: 'Ya 2.Nf3 oynasam ama rakip almayıp 2…Nc6 oynarsa ne olur?',
                  en: 'What if I played 2.Nf3 and Black didn’t take (2…Nc6)?',
                },
                moves: [
                  {
                    san: 'Nf3',
                    note: {
                      tr: 'e4’ü korumasız bıraktın…',
                      en: 'You left e4 undefended…',
                    },
                  },
                  {
                    san: 'Nc6',
                    note: {
                      tr: 'Rakip bedava e4 piyonunu görmeyip atını çıktı.',
                      en: 'Black missed the free e4 pawn and developed.',
                    },
                  },
                  {
                    san: 'exd5',
                    note: {
                      tr: 'Fırsatı hemen kullan ve d5 piyonunu al — artık hem atın dışarıda hem piyon öndesin!',
                      en: 'Take d5 immediately — now you are developed AND winning a pawn!',
                    },
                  },
                  {
                    san: 'Qxd5',
                    note: {
                      tr: 'Rakip vezirle alınca…',
                      en: 'When Black recaptures with the queen…',
                    },
                  },
                  {
                    san: 'Nc3',
                    note: {
                      tr: '3.Nc3 ile veziri kovala — iki atın da oyunda, harika üstünlük!',
                      en: 'Chase the queen with Nc3 — both knights are out and you dominate!',
                    },
                  },
                ],
                takeaway: {
                  tr: 'Rakip almasa bile 2.Nf3 gereksiz risktir; en temiz yol en baştan 2.exd5 almaktır.',
                  en: 'Even if Black misses dxe4, 2.Nf3 is an unnecessary risk — take 2.exd5 right away.',
                },
              },
            ],
          },
          {
            san: 'Qxd5',
            note: {
              tr: 'Rakip vezirini oyunun 2. hamlesinde ortaya çıkardı — şimdi onu cezalandırma zamanı!',
              en: 'Black brings the queen out on move 2 — time to punish it!',
            },
          },
          {
            san: 'Nc3',
            note: {
              tr: 'Atını geliştirirken vezire saldır! Rakip veziri kaçmak zorunda, sen bedava tempo kazandın!',
              en: 'Develop your knight while attacking the queen — free tempo!',
            },
            whatIfs: [
              {
                id: 'scand-opp-nf6-instead',
                kind: 'deviation',
                anchor: 'beforePrev',
                prompt: {
                  tr: 'Ya rakip 2…Qxd5 yerine 2…Nf6 ile önce atını çıkarsa?',
                  en: 'What if Black plays 2…Nf6 instead of 2…Qxd5?',
                },
                moves: [
                  {
                    san: 'Nf6',
                    note: {
                      tr: 'Rakip vezirini erken çıkarmamak için d5 piyonunu atla almaya hazırlanıyor.',
                      en: 'Black develops the knight to recapture on d5 without exposing the queen.',
                    },
                  },
                  {
                    san: 'd4',
                    note: {
                      tr: 'd5 piyonuna saplanıp kalma! Hemen 3.d4 ile merkezi kap ve taşlarını hızla geliştir.',
                      en: 'Don’t cling to d5! Grab the centre with 3.d4 and develop smoothly.',
                    },
                  },
                  {
                    san: 'Nxd5',
                    note: {
                      tr: 'Rakip piyonunu geri aldı.',
                      en: 'Black wins the pawn back.',
                    },
                  },
                  {
                    san: 'Nf3',
                    note: {
                      tr: 'Atını çık, ardından Be2 ve O-O — merkezde rahat bir üstünlüğün var.',
                      en: 'Develop Nf3, then Be2 and O-O — a comfortable central edge.',
                    },
                  },
                ],
                takeaway: {
                  tr: 'Rakip 2…Nf6 oynarsa piyonu zorla tutmaya çalışma (c4 vb.), 3.d4 ile merkezi al ve geliş!',
                  en: 'Against 2…Nf6, play 3.d4 to seize space and develop naturally.',
                },
              },
              {
                id: 'scand-queen-stays-center',
                kind: 'punish',
                prompt: {
                  tr: '3.Nc3 sonrası rakip vezirini 3…Qe5+? ile ortaya çekerse?',
                  en: 'What if Black checks with 3…Qe5+? instead of retreating?',
                },
                moves: [
                  {
                    san: 'Nc3',
                    note: {
                      tr: 'Atını çıkarıp vezire saldırdın.',
                      en: 'You attack the queen with the knight.',
                    },
                  },
                  {
                    san: 'Qe5+',
                    note: {
                      tr: 'Rakip şah çekerek rahatsız etmeye çalışıyor.',
                      en: 'Black tries an annoying check.',
                    },
                  },
                  {
                    san: 'Be2',
                    note: {
                      tr: 'Sakin ol! Filinle kapat: Hem şahtan kurtuldun hem bir taş daha geliştirdin!',
                      en: 'Stay calm! Block with Be2 — stopping the check AND developing a piece!',
                    },
                  },
                  {
                    san: 'Nf6',
                    note: {
                      tr: 'Rakip gelişmeye çalışıyor…',
                      en: 'Black tries to catch up…',
                    },
                  },
                  {
                    san: 'Nf3',
                    note: {
                      tr: 'Diğer atınla vezire YİNE saldır! Rakip 3 kez vezir oynarken senin 3 taşın oyunda ve roka hazırsın!',
                      en: 'Hit the queen AGAIN with Nf3! Black moved the queen 3 times while you have 3 pieces out!',
                    },
                  },
                ],
                takeaway: {
                  tr: 'Rakip vezirle oyalandıkça her seferinde yeni bir taş geliştirerek vezire saldır — muazzam gelişim farkı!',
                  en: 'Every time Black’s queen lingers, develop another piece with tempo on it!',
                },
              },
            ],
          },
          {
            san: 'Qa5',
            note: {
              tr: 'Rakip vezirini kenara kaçtı — bir hamle kaybetti.',
              en: 'Black retreats the queen to a5, losing a tempo.',
            },
          },
          {
            san: 'd4',
            note: {
              tr: 'Merkezi tamamen ele geçir ve c1 filinin yolunu aç.',
              en: 'Seize the centre and open your c1 bishop’s diagonal.',
            },
          },
          {
            san: 'Nf6',
            note: {
              tr: 'Rakip nihayet taş geliştirmeye başlıyor.',
              en: 'Black finally starts developing.',
            },
          },
          {
            san: 'Nf3',
            note: {
              tr: 'Harika! İki atın ve merkez piyonun oyunda, sıradaki hedef Bc4/Be2 ve kısa rok.',
              en: 'Excellent! Both knights and central pawn are active; next come Bc4/Be2 and castling.',
            },
          },
        ],
      },
      {
        id: 'sicilian',
        title: { tr: 'Rakip 1…c5 Oynarsa (Sicilya)', en: 'When Black Plays 1…c5 (Sicilian)' },
        when: {
          tr: 'Rakip e5 yerine kanattan merkeze baskı yaparsa',
          en: 'When Black fights for d4 from the flank with 1…c5',
        },
        moves: [
          {
            san: 'e4',
            note: {
              tr: 'Merkez piyonunla başla.',
              en: 'Start with e4.',
            },
          },
          {
            san: 'c5',
            note: {
              tr: 'Sicilya Savunması! Rakip senin d4 sürmeni zorlaştırmak istiyor.',
              en: 'The Sicilian Defense! Black fights for the d4 square.',
            },
          },
          {
            san: 'Nf3',
            note: {
              tr: 'Sakin kal ve atını geliştir — bir sonraki hamlede d4 ile merkezi açmaya hazırlan.',
              en: 'Develop calmly with Nf3 and prepare to open the centre with d4.',
            },
            whatIfs: [
              {
                id: 'sicilian-why-not-bc4',
                kind: 'danger',
                prompt: {
                  tr: 'Neden 2.Bc4 (İtalyan fili) burada iyi değil?',
                  en: 'Why is 2.Bc4 (the Italian bishop) not great here?',
                },
                moves: [
                  {
                    san: 'Bc4',
                    note: {
                      tr: 'Alışkanlıkla c4’e filini çıktın…',
                      en: 'Out of habit you put the bishop on c4…',
                    },
                  },
                  {
                    san: 'e6',
                    note: {
                      tr: 'Rakip e6 ile filinin f7 çaprazını anında duvar gibi kapatır ve d5 sürüşüne hazırlanır!',
                      en: 'Black immediately walls off your bishop with e6 and prepares …d5 with tempo!',
                    },
                  },
                  {
                    san: 'Nf3',
                    note: {
                      tr: 'Atını çıktığında…',
                      en: 'When you develop Nf3…',
                    },
                  },
                  {
                    san: 'd5',
                    note: {
                      tr: 'Rakip d5 ile hem merkezini patlatır hem filini kovalayıp tempo kazanır!',
                      en: 'Black strikes with …d5, seizing the centre and kicking your bishop!',
                    },
                  },
                ],
                takeaway: {
                  tr: '1…c5 karşısında 2.Bc4 kolayca …e6 ve …d5 ile kovulur. Önce 2.Nf3 oyna!',
                  en: 'Against 1…c5, 2.Bc4 runs straight into …e6 and …d5. Play 2.Nf3 first!',
                },
              },
            ],
          },
          {
            san: 'd6',
            note: {
              tr: 'Rakip e5 karesini kontrol edip c8 filinin yolunu açtı.',
              en: 'Black controls e5 and opens the c8 bishop.',
            },
          },
          {
            san: 'd4',
            note: {
              tr: 'Merkezi hemen aç! Rakip almak zorunda kalacak.',
              en: 'Open the centre right away!',
            },
          },
          {
            san: 'cxd4',
            note: {
              tr: 'Rakip merkez piyonunu kenar piyonuyla takas etti.',
              en: 'Black trades a flank pawn for your d-pawn.',
            },
          },
          {
            san: 'Nxd4',
            note: {
              tr: 'Atla geri al! Vezirle (Qxd4) alırsan Nc6 ile kovalanırsın; at merkezde çok güçlü durur.',
              en: 'Recapture with the knight! Qxd4 gets hit by Nc6, whereas the knight dominates the centre.',
            },
            whatIfs: [
              {
                id: 'sicilian-exchange-qxd4',
                kind: 'exchange',
                prompt: {
                  tr: 'Takası neden vezirle (4.Qxd4) değil atla (4.Nxd4) alıyoruz?',
                  en: 'Why recapture with the knight (4.Nxd4) instead of the queen (4.Qxd4)?',
                },
                moves: [
                  {
                    san: 'Qxd4',
                    note: {
                      tr: 'Vezirle aldın ama vezir merkezin ortasında açık hedef oldu.',
                      en: 'Your queen sits in the middle as an easy target.',
                    },
                  },
                  {
                    san: 'Nc6',
                    note: {
                      tr: 'Rakip atını geliştirirken vezirine saldırıyor — hamle kaybedip geri kaçmak zorundasın!',
                      en: 'Black develops the knight with tempo on your queen — forcing you to retreat!',
                    },
                  },
                ],
                takeaway: {
                  tr: 'Açılışta merkezdeki takasları mümkünse küçük taşlarla (piyon/at) geri al; vezirini hedef yapma.',
                  en: 'In the opening, recapture in the centre with pawns or knights — don’t expose your queen.',
                },
              },
            ],
          },
        ],
      },
      {
        id: 'french',
        title: { tr: 'Rakip 1…e6 Oynarsa (Fransız)', en: 'When Black Plays 1…e6 (French)' },
        when: {
          tr: 'Rakip 1…e6 ile sağlamca 2…d5 hazırlarsa',
          en: 'When Black prepares 2…d5 solidly with 1…e6',
        },
        moves: [
          {
            san: 'e4',
            note: {
              tr: 'Merkezi al.',
              en: 'Claim the centre.',
            },
          },
          {
            san: 'e6',
            note: {
              tr: 'Fransız Savunması! Rakip d5 sürüşüne hazırlanıyor ama c8 filinin önünü kendi kapattı.',
              en: 'The French Defense! Black prepares …d5, though blocking their own c8 bishop.',
            },
          },
          {
            san: 'd4',
            note: {
              tr: 'Rakip merkezi boş bıraktı — hemen ikinci piyonunu da merkeze koy!',
              en: 'Black left d4 free — immediately build a full two-pawn centre!',
            },
          },
          {
            san: 'd5',
            note: {
              tr: 'Rakip şimdi e4 piyonuna saldırıyor.',
              en: 'Black now challenges your e4 pawn.',
            },
          },
          {
            san: 'Nc3',
            note: {
              tr: 'Atını geliştirirken e4 piyonunu koru! (İstersen 3.e5 ile alanı kapatmak da geçerlidir.)',
              en: 'Defend e4 while developing a knight!',
            },
            whatIfs: [
              {
                id: 'french-if-dxe4',
                kind: 'exchange',
                prompt: {
                  tr: '3.Nc3 sonrası rakip 3…dxe4 ile alırsa ne olur?',
                  en: 'What if Black captures 3…dxe4 after 3.Nc3?',
                },
                moves: [
                  {
                    san: 'Nc3',
                    note: {
                      tr: 'e4 piyonunu atla korudun.',
                      en: 'You defend e4 with the knight.',
                    },
                  },
                  {
                    san: 'dxe4',
                    note: {
                      tr: 'Rakip merkezi takas etti.',
                      en: 'Black exchanges in the centre.',
                    },
                  },
                  {
                    san: 'Nxe4',
                    note: {
                      tr: 'Atın merkezin tam göbeğine yerleşti ve d4 piyonun hâlâ alan avantajı veriyor!',
                      en: 'Your knight lands right in the centre while d4 keeps your space advantage!',
                    },
                  },
                ],
                takeaway: {
                  tr: 'Rakip alırsa rahatça Nxe4 ile geri al — taşların çok aktif olacak.',
                  en: 'If Black takes on e4, happily recapture Nxe4 for very active pieces.',
                },
              },
            ],
          },
        ],
      },
      {
        id: 'caro-kann-white',
        title: { tr: 'Rakip 1…c6 Oynarsa (Caro-Kann)', en: 'When Black Plays 1…c6 (Caro-Kann)' },
        when: {
          tr: 'Rakip 1…c6 ile d5 hazırlarsa',
          en: 'When Black prepares 2…d5 with 1…c6',
        },
        moves: [
          {
            san: 'e4',
            note: {
              tr: 'Merkez piyonunu sür.',
              en: 'Push e4.',
            },
          },
          {
            san: 'c6',
            note: {
              tr: 'Caro-Kann! Rakip d5 sürmeye hazırlanıyor.',
              en: 'The Caro-Kann! Black prepares …d5.',
            },
          },
          {
            san: 'd4',
            note: {
              tr: 'Hemen iki piyonlu dev merkez kur!',
              en: 'Immediately claim the full two-pawn centre!',
            },
          },
          {
            san: 'd5',
            note: {
              tr: 'Rakip e4 piyonuna saldırdı.',
              en: 'Black challenges e4.',
            },
          },
          {
            san: 'Nc3',
            note: {
              tr: 'Atını geliştirip e4’ü koru — rakip alırsa atın merkeze oturur.',
              en: 'Develop and defend e4 — if Black takes, your knight takes the centre.',
            },
          },
          {
            san: 'dxe4',
            note: {
              tr: 'Rakip piyonunu aldı.',
              en: 'Black captures e4.',
            },
          },
          {
            san: 'Nxe4',
            note: {
              tr: 'Atla geri al! Sıradaki planın Nf3, Bc4/Bd3 ve kısa rok.',
              en: 'Recapture with the knight! Next come Nf3, Bc4/Bd3, and castling.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'anti-traps',
    color: 'black',
    name: {
      tr: 'Erken Vezir ve Tuzakları Cezalandır',
      en: 'Punish Early Queen & Opening Traps',
    },
    tagline: {
      tr: 'Rakip Çoban Matı (2.Qh5) veya f7 tuzağı denerse korkma — onu adım adım cezalandır ve ez!',
      en: 'Stop fearing Scholar’s Mate (2.Qh5) and early traps — punish them step by step on the board!',
    },
    idea: {
      tr: 'Vezirini erken çıkaran rakibe karşı kural çok basit: 1) Önce tehdidi (e5 / f7) sakinçe durdur, 2) Her yeni taş geliştirirken vezirine saldır, 3) Rakip vezirle kaçarken sen 3-4 taş önde ol!',
      en: 'Against an early queen: 1) Calmly stop the threat (e5 / f7), 2) Develop pieces WITH TEMPO on the queen, 3) Punish their wasted moves!',
    },
    offbookRule: {
      tr: 'Erken vezire karşı asla panikleme: önce “hangi kareyi tehdit ediyor?” diye sor, orayı koru, sonra gelişim hamleleriyle veziri kov.',
      en: 'Never panic against an early queen: check what square it threatens, defend it, then develop with tempo.',
    },
    pros: [
      {
        tr: 'Başlangıç seviyesinde en çok karşılaşılan ucuz tuzakları bedava galibiyete çevirir.',
        en: 'Turns the most common beginner traps into free wins.',
      },
      {
        tr: 'Savunma yaparken aynı anda gelişim ve tempo kazanmayı öğretir.',
        en: 'Teaches how to defend while gaining huge development and tempo.',
      },
    ],
    cons: [
      {
        tr: 'Sırayı karıştırırsan (örneğin 2…g6?? erken sürersen) kale veya şah matı verebilirsin!',
        en: 'Mixing up the move order (like playing 2…g6?? too early) loses a rook or gets mated!',
      },
    ],
    lines: [
      {
        id: 'wayward-queen',
        title: { tr: '2.Qh5 Çoban Matını Cezalandır', en: 'Punish 2.Qh5 (Wayward Queen)' },
        when: {
          tr: 'Rakip 1.e4 e5 sonrası hemen 2.Qh5 ile vezirini çıkarırsa',
          en: 'When White brings the queen out immediately with 2.Qh5',
        },
        moves: [
          {
            san: 'e4',
            note: {
              tr: 'Beyaz merkez piyonuyla başladı.',
              en: 'White starts with e4.',
            },
          },
          {
            san: 'e5',
            note: {
              tr: 'Merkezi paylaş.',
              en: 'Match in the centre.',
            },
          },
          {
            san: 'Qh5',
            note: {
              tr: 'İşte klasik erken vezir saldırısı! Beyaz hem e5 piyonunu hem de f7 karesini gözüne kestirdi.',
              en: 'The classic early queen attack! White eyes both your e5 pawn and f7.',
            },
          },
          {
            san: 'Nc6',
            note: {
              tr: 'ALTIN KURAL 1: Önce atınla e5 piyonunu koru! Asla hemen g6 sürme yoksa Qxe5+ ile kalen gider!',
              en: 'GOLDEN RULE 1: Defend e5 first with Nc6! Never play 2…g6?? or Qxe5+ wins your rook!',
            },
            wrongMoves: {
              g6: {
                tr: 'DUR! 2…g6?? oynarsan Beyaz 3.Qxe5+ ile hem piyonunu alır hem şah çeker hem de h8 kaleni bedava alır! Önce 2…Nc6 ile e5’i koru.',
                en: 'STOP! After 2…g6?? White plays 3.Qxe5+ forking your king and h8 rook! Defend e5 with 2…Nc6 first.',
              },
              Nf6: {
                tr: '2…Nf6 e5 piyonunu korumasız bırakır; Beyaz 3.Qxe5+ ile şah çekip piyonunu bedava alır! Önce 2…Nc6 oyna.',
                en: '2…Nf6 leaves e5 undefended; White takes with check (3.Qxe5+)! Play 2…Nc6 first.',
              },
            },
            whatIfs: [
              {
                id: 'wq-blunder-g6',
                kind: 'danger',
                prompt: {
                  tr: 'Ya 2…g6?? oynayıp veziri hemen kovmaya kalkarsam ne olur?',
                  en: 'What happens if I immediately kick the queen with 2…g6??',
                },
                moves: [
                  {
                    san: 'g6',
                    note: {
                      tr: 'e5 piyonunu korumadan vezire saldırdın…',
                      en: 'You kicked the queen without guarding e5…',
                    },
                  },
                  {
                    san: 'Qxe5+',
                    note: {
                      tr: 'FELAKET! Hem e5 piyonun gitti hem şah çekti hem de h8 kalene saldırıyor!',
                      en: 'DISASTER! White takes e5 with check AND forks your h8 rook!',
                    },
                  },
                  {
                    san: 'Qe7',
                    note: {
                      tr: 'Şahı kapatmak zorundasın…',
                      en: 'You have to block the check…',
                    },
                  },
                  {
                    san: 'Qxh8',
                    note: {
                      tr: 'h8 kalen 4. hamlede bedavaya gitti! İşte bu yüzden 1. adım HEP 2…Nc6!',
                      en: 'Your rook is gone on move 4! That is why step 1 is ALWAYS 2…Nc6!',
                    },
                  },
                ],
                takeaway: {
                  tr: '2.Qh5’e karşı asla hemen g6 oynama! Önce 2…Nc6 ile e5 piyonunu sağlama al.',
                  en: 'Never play 2…g6 against 2.Qh5! Always protect e5 with 2…Nc6 first.',
                },
              },
            ],
          },
          {
            san: 'Bc4',
            note: {
              tr: 'DİKKAT! Beyaz şimdi Çoban Matı (Qxf7#) tehdit ediyor!',
              en: 'DANGER! White now threatens Scholar’s Mate (Qxf7#)!',
            },
          },
          {
            san: 'g6',
            note: {
              tr: 'ALTIN KURAL 2: ŞİMDİ g6 sür! Hem mat yolunu kapattın hem de veziri kovalayıp tempo kazandın!',
              en: 'GOLDEN RULE 2: NOW push g6! You block the mate AND kick the queen with tempo!',
            },
            wrongMoves: {
              Nf6: {
                tr: 'EYVAH! 3…Nf6?? oynarsan 4.Qxf7# ile Çoban Matı olursun! Önce 3…g6 sürerek vezirin yolunu kes.',
                en: 'OH NO! 3…Nf6?? allows 4.Qxf7# Scholar’s Mate! Play 3…g6 first to block the queen.',
              },
            },
            whatIfs: [
              {
                id: 'wq-blunder-nf6',
                kind: 'danger',
                prompt: {
                  tr: 'Ya 3…Nf6?? oynayıp atımla vezire saldırırsam?',
                  en: 'What if I attack the queen with 3…Nf6?? right now?',
                },
                moves: [
                  {
                    san: 'Nf6',
                    note: {
                      tr: 'Vezire saldırdığını sandın ama f7 karesi hâlâ açık!',
                      en: 'You attacked the queen, forgetting f7 is still wide open!',
                    },
                  },
                  {
                    san: 'Qxf7#',
                    note: {
                      tr: 'ŞAH MAT! Çoban Matı! Çünkü f7 karesini c4 fili koruyor.',
                      en: 'CHECKMATE! Scholar’s Mate — the c4 bishop guards the queen!',
                    },
                  },
                ],
                takeaway: {
                  tr: 'c4 fili çıktığında vezire atla değil 3…g6 piyonuyla saldır ki f7 çaprazı tamamen kapansın!',
                  en: 'Once Bc4 lands, kick the queen with 3…g6 so the path to f7 is completely blocked!',
                },
              },
            ],
          },
          {
            san: 'Qf3',
            note: {
              tr: 'Beyaz pes etmedi, hâlâ f7’den mat (Qxf7#) istiyor!',
              en: 'White insists, threatening Qxf7# again from f3!',
            },
          },
          {
            san: 'Nf6',
            note: {
              tr: 'ALTIN KURAL 3: Şimdi atını f6’ya çıkar! Mat tehdidi bitti, üstelik 2 atın da oyunda — Beyazın ise sadece veziri ortada geziyor!',
              en: 'GOLDEN RULE 3: Now develop Nf6! The mate is dead and you already have two knights out!',
            },
            whatIfs: [
              {
                id: 'wq-punish-qb3-trap',
                kind: 'punish',
                prompt: {
                  tr: 'Rakip ısrar edip 5.Qb3 ile f7’ye yüklenmeye devam ederse nasıl eziyoruz?',
                  en: 'How do we crush White if they keep pushing with 5.Qb3?',
                },
                moves: [
                  {
                    san: 'Nf6',
                    note: {
                      tr: 'Matı engelledin ve atını geliştirdin.',
                      en: 'You stopped mate and developed.',
                    },
                  },
                  {
                    san: 'Qb3',
                    note: {
                      tr: 'Beyaz hâlâ sadece f7’ye saldırmayı düşünüyor — şimdi c2 karesi tamamen korumasız!',
                      en: 'White is obsessed with f7 — leaving c2 totally undefended!',
                    },
                  },
                  {
                    san: 'Nd4',
                    note: {
                      tr: 'BAM! Atınla hem vezire saldırıyorsun hem de Nxc2+ şah+kale çatalı istiyorsun!',
                      en: 'BAM! Your knight attacks the queen AND threatens the Nxc2+ royal fork!',
                    },
                  },
                  {
                    san: 'Bxf7+',
                    note: {
                      tr: 'Beyaz umutsuzca f7’yi alıp şah çekse bile…',
                      en: 'Even if White desperately grabs f7 with check…',
                    },
                  },
                  {
                    san: 'Ke7',
                    note: {
                      tr: 'Şahın güvende, Beyazın fili ve veziri sıkıştı — c2 çatalı hâlâ geliyor, Siyah tamamen kazanç!',
                      en: 'Your king is safe, White’s queen and bishop are tangled, and Nxc2+ still looms!',
                    },
                  },
                ],
                takeaway: {
                  tr: 'Rakip vezirle f7’ye inat ederse Nd4! sıçraması hem veziri kovar hem c2’den kaleyi düşürür!',
                  en: 'If White insists with Qb3, Nd4! hits the queen and threatens a devastating fork on c2!',
                },
              },
              {
                id: 'wq-punish-g4',
                kind: 'punish',
                prompt: {
                  tr: 'Rakip 5.g4? ile dikkatsizce saldırırsa nasıl cezalandırırım?',
                  en: 'How do I punish a reckless 5.g4? by White?',
                },
                moves: [
                  {
                    san: 'Nf6',
                    note: {
                      tr: 'Atını f6’ya çıktın.',
                      en: 'You developed Nf6.',
                    },
                  },
                  {
                    san: 'g4',
                    note: {
                      tr: 'Beyaz f6 atını g5 ile kovup f7’yi açmak istiyor — ama kendi şah kanadını darmadağın etti!',
                      en: 'White wants g5 to kick Nf6 — wrecking their own kingside!',
                    },
                  },
                  {
                    san: 'Nd4',
                    note: {
                      tr: 'İşte ceza! Hem vezire saldırıyorsun hem Nxc2+ şah+kale çatalı tehdit ediyorsun!',
                      en: 'Punishment! Attacking the queen AND threatening Nxc2+ forking king and rook!',
                    },
                  },
                  {
                    san: 'Qd3',
                    note: {
                      tr: 'Beyaz c2’yi korumak için vezirini sıkışık bir kareye çekmek zorunda kaldı.',
                      en: 'White must retreat the queen awkwardly just to guard c2.',
                    },
                  },
                  {
                    san: 'd5',
                    note: {
                      tr: 'Merkezi patlat! Beyazın tüm taşları başlangıç karesinde sıkışmışken sen ezici saldırıdasın!',
                      en: 'Blast open the centre! White’s pieces are stuck at home while you crush them!',
                    },
                  },
                ],
                takeaway: {
                  tr: 'Rakip vezirle oynayıp g4 gibi açgözlü hamle yaparsa hemen Nd4! ile veziri ve c2’yi vur!',
                  en: 'Against greedy moves like 5.g4?, jump in with 5…Nd4! hitting queen and c2!',
                },
              },
            ],
          },
          {
            san: 'Ne2',
            note: {
              tr: 'Beyaz nihayet taş geliştirmeye çalışıyor ama veziri kendi atının en iyi karesi olan f3’ü işgal etmiş durumda!',
              en: 'White finally tries to develop, but their own queen blocks their knight’s best square (f3)!',
            },
          },
          {
            san: 'Bg7',
            note: {
              tr: 'Filini uzun çapraza koy ve kısa roka hazırlan. Artık tamamen üstünsün!',
              en: 'Fianchetto your bishop and prepare to castle. You already have the better game!',
            },
          },
        ],
      },
      {
        id: 'scholars-bc4',
        title: { tr: '2.Bc4 Sonrası Çoban Matını Boz', en: 'Stop Scholar’s Mate After 2.Bc4' },
        when: {
          tr: 'Rakip 1.e4 e5 sonrası önce 2.Bc4 ile filini çıkarsa',
          en: 'When White starts with 2.Bc4 aiming for Qh5/Qf3',
        },
        moves: [
          {
            san: 'e4',
            note: {
              tr: 'Beyaz e4 oynadı.',
              en: 'White plays e4.',
            },
          },
          {
            san: 'e5',
            note: {
              tr: 'Merkezi tut.',
              en: 'Claim the centre.',
            },
          },
          {
            san: 'Bc4',
            note: {
              tr: 'Beyaz filini f7’ye doğrulttu — muhtemelen 3.Qh5 veya 3.Qf3 ile Çoban Matı deneyecek!',
              en: 'White aims at f7 — likely planning 3.Qh5 or 3.Qf3!',
            },
          },
          {
            san: 'Nf6',
            note: {
              tr: 'EN AKILLI CEVAP! Hem e4 piyonuna saldırıyorsun hem de h5 karesini tuttuğun için 3.Qh5’i imkânsız kılıyorsun!',
              en: 'THE SMARTEST REPLY! You attack e4 AND cover h5, making 3.Qh5 impossible!',
            },
            whatIfs: [
              {
                id: 'sbc4-free-queen',
                kind: 'punish',
                prompt: {
                  tr: 'Ya rakip ezberden 3.Qh5?? oynarsa ne olur?',
                  en: 'What if White autopilots 3.Qh5?? anyway?',
                },
                moves: [
                  {
                    san: 'Nf6',
                    note: {
                      tr: 'f6 atın h5 karesini kontrol ediyor!',
                      en: 'Your f6 knight guards h5!',
                    },
                  },
                  {
                    san: 'Qh5',
                    note: {
                      tr: 'Rakip ezberden Çoban Matı için vezirini h5’e koydu…',
                      en: 'White autopilots Qh5 for Scholar’s Mate…',
                    },
                  },
                  {
                    san: 'Nxh5',
                    note: {
                      tr: 'BEDAVA VEZİR! Rakibin vezirini 3. hamlede atınla alıyorsun!',
                      en: 'FREE QUEEN! Your knight captures White’s queen on move 3!',
                    },
                  },
                ],
                takeaway: {
                  tr: '2.Bc4’e karşı 2…Nf6 oynamak Çoban Matı oyuncularına karşı en zehirli silahtır — h5’i keser!',
                  en: '2…Nf6 against 2.Bc4 shuts down 3.Qh5 completely — and wins the queen if they autopilot!',
                },
              },
            ],
          },
          {
            san: 'Qf3',
            note: {
              tr: 'Beyaz h5’e gidemediği için 3.Qf3 ile f7’yi zorlamayı deniyor.',
              en: 'Blocked from h5, White tries 3.Qf3 instead.',
            },
          },
          {
            san: 'Nc6',
            note: {
              tr: 'Gelişmeye devam et! f6 atın zaten vezirin f7 yolunu tamamen kesiyor.',
              en: 'Keep developing! Your f6 knight already blocks the queen’s path to f7.',
            },
          },
          {
            san: 'Ne2',
            note: {
              tr: 'Beyazın veziri kendi atının karesini kapattığı için garip bir gelişim yapmak zorunda kaldı.',
              en: 'White’s queen blocks f3, forcing an awkward knight move.',
            },
          },
          {
            san: 'Bc5',
            note: {
              tr: 'Filini aktif karesine çık, sıradaki hamle kısa rok. Çoban Matı tamamen çöktü!',
              en: 'Develop Bc5 and castle next — Scholar’s Mate is completely neutralized!',
            },
          },
        ],
      },
      {
        id: 'fried-liver-defense',
        title: { tr: '4.Ng5 (f7 Saldırısını) Püskürt', en: 'Defend Against 4.Ng5 (Fried Liver)' },
        when: {
          tr: 'Rakip İtalyan’da 4.Ng5 ile f7 karene saldırırsa',
          en: 'When White launches 4.Ng5 against your f7 square',
        },
        moves: [
          { san: 'e4', note: { tr: 'Beyaz e4 sürdü.', en: 'White plays e4.' } },
          { san: 'e5', note: { tr: 'Merkezi paylaş.', en: 'Match in the centre.' } },
          { san: 'Nf3', note: { tr: 'Beyaz e5’e saldırıyor.', en: 'White attacks e5.' } },
          { san: 'Nc6', note: { tr: 'Atınla e5’i koru.', en: 'Defend e5.' } },
          { san: 'Bc4', note: { tr: 'İtalyan fili f7’ye bakıyor.', en: 'White aims at f7.' } },
          { san: 'Nf6', note: { tr: 'Atını geliştirip e4’e saldır.', en: 'Develop and hit e4.' } },
          {
            san: 'Ng5',
            note: {
              tr: 'ALARM! Hem at hem fil f7 karesine saldırıyor.',
              en: 'ALERT! Both knight and bishop attack f7.',
            },
          },
          {
            san: 'd5',
            note: {
              tr: 'TEK DOĞRU SAVUNMA: d5 sürerek c4 filinin f7 yolunu piyonla kes!',
              en: 'THE ONLY DEFENCE: push d5 to block the c4 bishop’s diagonal!',
            },
          },
          {
            san: 'exd5',
            note: {
              tr: 'Beyaz piyonunu aldı ve c6 atına saldırdı — DİKKAT, sakın Nxd5 ile geri alma!',
              en: 'White captures and attacks your c6 knight — CAREFUL, do NOT take back with Nxd5!',
            },
          },
          {
            san: 'Na5',
            note: {
              tr: 'USTA HAMLE! d5 piyonunu şimdilik bırak, atını kenara kaçarken c4 filine saldır! Artık saldıran SENSİN!',
              en: 'MASTER MOVE! Ignore d5 for now — save your knight while attacking the c4 bishop!',
            },
            wrongMoves: {
              Nxd5: {
                tr: 'TUZAK! 5…Nxd5?? oynarsan Beyaz 6.Nxf7! Kxf7 7.Qf3+ ile Kızarmış Ciğer saldırısı yapıp şahını mahveder! Bunun yerine 5…Na5 oyna.',
                en: 'TRAP! 5…Nxd5?? runs straight into 6.Nxf7! Kxf7 7.Qf3+ (the Fried Liver)! Play 5…Na5 instead.',
              },
            },
            whatIfs: [
              {
                id: 'fld-blunder-nxd5',
                kind: 'danger',
                prompt: {
                  tr: 'Ya 5…Nxd5?? ile piyonumu geri alırsam ne olur?',
                  en: 'What happens if I recapture the pawn with 5…Nxd5??',
                },
                moves: [
                  {
                    san: 'Nxd5',
                    note: {
                      tr: 'Piyonu geri aldın ama…',
                      en: 'You won the pawn back, but…',
                    },
                  },
                  {
                    san: 'Nxf7',
                    note: {
                      tr: 'KIZARMİŞ CİĞER! Beyaz atını f7’de feda edip vezir ve kalene çatal atıyor!',
                      en: 'FRIED LIVER! White sacrifices the knight to fork your queen and rook!',
                    },
                  },
                  {
                    san: 'Kxf7',
                    note: {
                      tr: 'Şahla almak zorundasın.',
                      en: 'Your king is forced to capture.',
                    },
                  },
                  {
                    san: 'Qf3+',
                    note: {
                      tr: 'ŞAH + d5 atına çifte saldırı! Şahın ortada kaldı, taş kaybedeceksin.',
                      en: 'CHECK + double attack on d5! Your king is exposed and you are losing.',
                    },
                  },
                ],
                takeaway: {
                  tr: '5.exd5 sonrası ASLA 5…Nxd5 oynama! 5…Na5 ile hem atını kurtar hem Beyazın filini kovala.',
                  en: 'Never play 5…Nxd5 after 5.exd5! Play 5…Na5 to dodge the trap and counterattack.',
                },
              },
            ],
          },
          {
            san: 'Bb5+',
            note: {
              tr: 'Beyaz filini şah çekerek kurtarıyor.',
              en: 'White saves the bishop with check.',
            },
          },
          {
            san: 'c6',
            note: {
              tr: 'Piyonla kapat ve d5 piyonuna baskı kur — artık taşların aktif, Beyazın saldırısı tamamen bitti!',
              en: 'Block with c6 and challenge d5 — your pieces burst alive and White’s attack is over!',
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
            whatIfs: [
              {
                id: 'london-why-bg3-not-bxd6',
                kind: 'exchange',
                prompt: {
                  tr: 'Neden 5.Bxd6 ile takası ben başlatmıyorum, neden Bg3 çekiyorum?',
                  en: 'Why retreat 5.Bg3 instead of initiating the trade 5.Bxd6?',
                },
                moves: [
                  {
                    san: 'Bxd6',
                    note: {
                      tr: 'Takası sen başlatırsan…',
                      en: 'If you initiate the trade…',
                    },
                  },
                  {
                    san: 'Qxd6',
                    note: {
                      tr: 'Rakip vezirini bedavadan aktif bir kareye geliştirmiş olur — üstelik senin h-hattın açılmadı!',
                      en: 'Black develops their queen for free — and you never get the open h-file!',
                    },
                  },
                ],
                takeaway: {
                  tr: 'Kural: Takası başlatan çoğu zaman rakibine gelişim hediye eder. Bg3 çek ki rakip alırsa hxg3 ile kalene açık hat doğsun!',
                  en: 'Rule: Don’t trade when it helps Black develop. Retreat Bg3 so …Bxg3 hxg3 opens your h-rook!',
                },
              },
              {
                id: 'london-hxg3-open-file',
                kind: 'punish',
                prompt: {
                  tr: '5.Bg3 sonrası rakip alırsa (5…Bxg3) neden çok iyi oluyor?',
                  en: 'Why is it great for us if Black takes 5…Bxg3?',
                },
                moves: [
                  {
                    san: 'Bg3',
                    note: {
                      tr: 'Filini sakinçe g3’e çektin.',
                      en: 'You tuck the bishop back to g3.',
                    },
                  },
                  {
                    san: 'Bxg3',
                    note: {
                      tr: 'Rakip filini aldı.',
                      en: 'Black takes on g3.',
                    },
                  },
                  {
                    san: 'hxg3',
                    note: {
                      tr: 'h-piyonuyla geri al! Bak h1 kalen şimdiden h7’ye ateş etmeye başladı bile!',
                      en: 'Recapture with the h-pawn! Your h1 rook is already firing straight down the h-file!',
                    },
                  },
                ],
                takeaway: {
                  tr: 'Bg3 sonrası rakip alırsa HEP hxg3 ile merkeze doğru al — h1 kalen bedavadan oyuna girer!',
                  en: 'Always recapture hxg3 — your h1 rook enters the attack for free!',
                },
              },
            ],
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
            whatIfs: [
              {
                id: 'ce5-vs-italian-d6-passive',
                kind: 'danger',
                prompt: {
                  tr: 'Neden 3…d6 değil de önce 3…Bc5 oynuyoruz?',
                  en: 'Why develop 3…Bc5 before playing …d6?',
                },
                moves: [
                  {
                    san: 'd6',
                    note: {
                      tr: '3…d6 oynarsan kendi f8 filinin önünü kapattın!',
                      en: 'Playing 3…d6 locks your own f8 bishop behind the pawn!',
                    },
                  },
                  {
                    san: 'd4',
                    note: {
                      tr: 'Beyaz hemen merkezi açıp daha rahat baskı kurar.',
                      en: 'White immediately opens the centre with an easier attack.',
                    },
                  },
                ],
                takeaway: {
                  tr: 'Önce filini piyon zincirinin dışına çıkar (3…Bc5), sonra d6 oyna!',
                  en: 'Get your bishop outside first (3…Bc5), then support e5 with d6!',
                },
              },
            ],
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
            whatIfs: [
              {
                id: 'ck-if-e6-first',
                kind: 'danger',
                prompt: {
                  tr: 'Ya 3…e6? ile önce piyonu sürersem ne olur?',
                  en: 'What goes wrong if I push 3…e6? before developing Bf5?',
                },
                moves: [
                  {
                    san: 'e6',
                    note: {
                      tr: 'Bak c8 filine: kendi piyonlarının arkasına hapis oldu!',
                      en: 'Look at your c8 bishop: trapped behind your own pawns!',
                    },
                  },
                  {
                    san: 'Nf3',
                    note: {
                      tr: 'Artık o fil uzun süre oyuna giremeyecek — Caro-Kann’ın tüm avantajını kaybettin.',
                      en: 'That bishop is stuck for a long time — losing the main point of the Caro-Kann.',
                    },
                  },
                ],
                takeaway: {
                  tr: 'Caro-Kann’da 3.e5’e karşı 1 numaralı refleks: Önce 3…Bf5 ile fili dışarı çıkar, sonra e6!',
                  en: 'Rule #1 against 3.e5: get 3…Bf5 outside first, then play e6!',
                },
              },
            ],
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
      whatIfs: entry.whatIfs,
    })
  })
  return steps
}

/** Starting FEN for a "What if?" scenario attached to `steps[stepIndex]`. */
export function whatIfStartFen(
  steps: readonly OpeningStep[],
  stepIndex: number,
  scenario: WhatIfScenario,
): string {
  if (scenario.anchor === 'beforePrev' && stepIndex > 0) {
    return steps[stepIndex - 1]?.fenBefore ?? steps[stepIndex]?.fenBefore ?? ''
  }
  return steps[stepIndex]?.fenBefore ?? ''
}

/** Expands a "What if?" scenario from `startFen` into live-playable board steps. */
export function buildWhatIfSteps(startFen: string, scenario: WhatIfScenario): WhatIfStep[] {
  const chess = new Chess(startFen)
  return scenario.moves.map((entry, index) => {
    const fenBefore = chess.fen()
    const side: Color = chess.turn() === 'w' ? 'white' : 'black'
    const move = chess.move(entry.san)
    return {
      index,
      san: move.san,
      uci: move.lan,
      from: move.from,
      to: move.to,
      side,
      fenBefore,
      fenAfter: chess.fen(),
      note: entry.note,
    }
  })
}

export function openingLineKey(guideId: string, lineId: string): string {
  return `${guideId}:${lineId}`
}

/** Maps a game opening family name (e.g. "Italian Game") to an interactive guide id when we have one. */
export function guideIdForOpeningFamily(family: string): string | null {
  const lower = family.toLowerCase()
  if (lower.includes('italian') || lower.includes('giuoco')) return 'italian'
  if (lower.includes('scandinavian') || lower.includes('sicilian') || lower.includes('french')) {
    return 'e4-responses'
  }
  if (lower.includes('wayward') || lower.includes('scholar')) return 'anti-traps'
  if (lower.includes('london')) return 'london'
  if (lower.includes('caro-kann') || lower.includes('caro kann')) return 'caro-kann'
  if (lower.includes('queen') && lower.includes('gambit')) return 'qgd'
  if (lower.includes('ruy lopez') || lower.includes('spanish') || lower.includes('four knights')) {
    return 'classical-e5'
  }
  return null
}
