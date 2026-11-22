import type { PieceSymbol } from 'chess.js'
import type { BestReason, MistakeCoaching, PlayedReason } from '../core/analysis/coachExplain'
import type { MoveDetails } from '../core/analysis/explainMove'
import type { ThreatCapture } from '../core/analysis/hanging'
import { getLanguage, t } from '../i18n'

interface TrPiece {
  plain: string
  acc: string // "piyonu", "kaleyi"
  myAcc: string // "piyonunu", "kaleni"
  withMy: string // "piyonunla", "kalenle"
  myNom: string // "piyonun", "kalen"
  theirNom: string // "piyonu", "kalesi"
  toDat: string // "vezire", "ata"
}

const TR_PIECES: Record<PieceSymbol, TrPiece> = {
  p: {
    plain: 'piyon',
    acc: 'piyonu',
    myAcc: 'piyonunu',
    withMy: 'piyonunla',
    myNom: 'piyonun',
    theirNom: 'piyonu',
    toDat: 'piyona',
  },
  n: {
    plain: 'at',
    acc: 'atı',
    myAcc: 'atını',
    withMy: 'atınla',
    myNom: 'atın',
    theirNom: 'atı',
    toDat: 'ata',
  },
  b: {
    plain: 'fil',
    acc: 'fili',
    myAcc: 'filini',
    withMy: 'filinle',
    myNom: 'filin',
    theirNom: 'fili',
    toDat: 'file',
  },
  r: {
    plain: 'kale',
    acc: 'kaleyi',
    myAcc: 'kaleni',
    withMy: 'kalenle',
    myNom: 'kalen',
    theirNom: 'kalesi',
    toDat: 'kaleye',
  },
  q: {
    plain: 'vezir',
    acc: 'veziri',
    myAcc: 'vezirini',
    withMy: 'vezirinle',
    myNom: 'vezirin',
    theirNom: 'veziri',
    toDat: 'vezire',
  },
  k: {
    plain: 'şah',
    acc: 'şahı',
    myAcc: 'şahını',
    withMy: 'şahınla',
    myNom: 'şahın',
    theirNom: 'şahı',
    toDat: 'şaha',
  },
}

const EN_PIECES: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
}

const PIECE_GLYPHS: Record<PieceSymbol, string> = {
  p: '♟',
  n: '♞',
  b: '♝',
  r: '♜',
  q: '♛',
  k: '♚',
}

/**
 * Short, visual, beginner-friendly move label with a piece glyph, e.g.
 * TR: "♜ Kale → e8", "♝ Fil × d5", "♚ Kısa rok"
 * EN: "♜ Rook → e8", "♝ Bishop × d5", "♚ Castle kingside"
 */
export function formatMoveBadge(move: MoveDetails, lang = getLanguage()): string {
  if (move.castling === 'kingside') return lang === 'tr' ? '♚ Kısa rok' : '♚ Castle kingside'
  if (move.castling === 'queenside') return lang === 'tr' ? '♚ Uzun rok' : '♚ Castle queenside'
  const glyph = PIECE_GLYPHS[move.piece]
  const name = lang === 'tr' ? cap(TR_PIECES[move.piece].plain) : cap(EN_PIECES[move.piece])
  const verb = move.captured ? '×' : '→'
  const extra = move.checkmate ? ' #' : move.check ? ' +' : ''
  return `${glyph} ${name} ${verb} ${move.to}${extra}`
}

/** Turkish "-deki/-daki/-teki" suffix by rank digit ("a2" → "a2’deki", "d5" → "d5’teki"). */
export function trAtSquare(square: string): string {
  const rank = square.slice(-1)
  if (rank === '6') return `${square}’daki`
  if (rank === '3' || rank === '4' || rank === '5') return `${square}’teki`
  return `${square}’deki`
}

/** Turkish "-e/-a/-ye/-ya" direction suffix by rank digit ("f6" → "f6’ya", "e4" → "e4’e"). */
export function trToSquare(square: string): string {
  const rank = square.slice(-1)
  if (rank === '6') return `${square}’ya`
  if (rank === '2' || rank === '7') return `${square}’ye`
  return `${square}’e`
}

function checkTag(move: MoveDetails, lang: 'tr' | 'en'): string {
  if (move.checkmate) return lang === 'tr' ? ' — şah mat!' : ' — checkmate!'
  if (move.check) return lang === 'tr' ? ' (şah)' : ' (check)'
  return ''
}

/**
 * Plain-language description of a move as an action phrase, e.g.
 * TR: "kısa rok (O-O)", "d5’teki atı filinle almak (Bxd5)", "f6’ya piyon sürmek (f6)"
 * EN: "castle kingside (O-O)", "capture the knight on d5 with your bishop (Bxd5)"
 */
export function formatMoveAction(move: MoveDetails, lang = getLanguage()): string {
  if (lang === 'en') {
    if (move.castling === 'kingside') return `castle kingside (${move.san})`
    if (move.castling === 'queenside') return `castle queenside (${move.san})`
    const piece = EN_PIECES[move.piece]
    const suffix = checkTag(move, 'en')
    if (move.captured) {
      const target = EN_PIECES[move.captured]
      return `take the ${target} on ${move.to} with your ${piece} (${move.san})${suffix}`
    }
    if (move.promotion) {
      return `promote the pawn on ${move.to} to a ${EN_PIECES[move.promotion]} (${move.san})${suffix}`
    }
    return `move your ${piece} to ${move.to} (${move.san})${suffix}`
  }

  if (move.castling === 'kingside') return `kısa rok yapmak (${move.san})`
  if (move.castling === 'queenside') return `uzun rok yapmak (${move.san})`
  const p = TR_PIECES[move.piece]
  const suffix = checkTag(move, 'tr')
  if (move.captured) {
    const target = TR_PIECES[move.captured]
    return `${trAtSquare(move.to)} ${target.acc} ${p.withMy} almak (${move.san})${suffix}`
  }
  if (move.promotion) {
    return `${trAtSquare(move.to)} piyonu ${TR_PIECES[move.promotion].toDat} çıkmak (${move.san})${suffix}`
  }
  if (move.piece === 'p') {
    return `piyonunu ${trToSquare(move.to)} sürmek (${move.san})${suffix}`
  }
  return `${p.myAcc} ${trToSquare(move.to)} oynamak (${move.san})${suffix}`
}

/**
 * Plain-language sentence for a move the user played in the past tense:
 * TR: "Kalenle a2’deki piyonu aldın (Rxa2)." / "Piyonunu f6’ya sürdün (f6)."
 * EN: "You captured the pawn on a2 with your rook (Rxa2)."
 */
export function formatPlayedSentence(move: MoveDetails, lang = getLanguage()): string {
  if (lang === 'en') {
    if (move.castling === 'kingside') return `You castled kingside (${move.san}).`
    if (move.castling === 'queenside') return `You castled queenside (${move.san}).`
    const piece = EN_PIECES[move.piece]
    if (move.captured) {
      return `You took the ${EN_PIECES[move.captured]} on ${move.to} with your ${piece} (${move.san}).`
    }
    return `You moved your ${piece} to ${move.to} (${move.san}).`
  }

  if (move.castling === 'kingside') return `Kısa rok yaptın (${move.san}).`
  if (move.castling === 'queenside') return `Uzun rok yaptın (${move.san}).`
  const p = TR_PIECES[move.piece]
  if (move.captured) {
    return `${cap(p.withMy)} ${trAtSquare(move.to)} ${TR_PIECES[move.captured].acc} aldın (${move.san}).`
  }
  if (move.piece === 'p') {
    return `Piyonunu ${trToSquare(move.to)} sürdün (${move.san}).`
  }
  return `${cap(p.myAcc)} ${trToSquare(move.to)} oynadın (${move.san}).`
}

/** Plain-language description of an enemy threat capture (for hanging piece drills & coaching). */
export function formatThreatSentence(
  threat: ThreatCapture,
  kind: 'own' | 'free',
  lang = getLanguage(),
): string {
  if (lang === 'en') {
    const attacker = EN_PIECES[threat.attackerPiece]
    const target = EN_PIECES[threat.targetPiece]
    return kind === 'own'
      ? `Your ${target} on ${threat.to} is undefended — the opponent’s ${attacker} on ${threat.from} can capture it (+${threat.gain}).`
      : `The opponent’s ${target} on ${threat.to} is free — your ${attacker} on ${threat.from} can capture it (+${threat.gain}).`
  }
  const attacker = TR_PIECES[threat.attackerPiece]
  const target = TR_PIECES[threat.targetPiece]
  return kind === 'own'
    ? `${trAtSquare(threat.to)} ${target.myNom} tehlikede — rakibin ${trAtSquare(threat.from)} ${attacker.theirNom} onu alabiliyor (+${threat.gain} puan).`
    : `Rakibin ${trAtSquare(threat.to)} ${target.theirNom} bedava — ${trAtSquare(threat.from)} ${attacker.myNom} ile alabiliyorsun (+${threat.gain} puan).`
}

/** Plain-language sentence for an opponent's immediate reply in a refutation line. */
export function formatEnemyReply(move: MoveDetails, lang = getLanguage()): string {
  if (lang === 'en') {
    if (move.castling === 'kingside') return `Opponent castles kingside (${move.san}).`
    if (move.castling === 'queenside') return `Opponent castles queenside (${move.san}).`
    const p = EN_PIECES[move.piece]
    if (move.captured) {
      return `Opponent takes your ${EN_PIECES[move.captured]} on ${move.to} with their ${p} (${move.san})${checkTag(move, 'en')}.`
    }
    return `Opponent moves their ${p} to ${move.to} (${move.san})${checkTag(move, 'en')}.`
  }
  if (move.castling === 'kingside') return `Rakip kısa rok yapıyor (${move.san}).`
  if (move.castling === 'queenside') return `Rakip uzun rok yapıyor (${move.san}).`
  const p = TR_PIECES[move.piece]
  if (move.captured) {
    return `Rakip ${p.theirNom} ile ${trAtSquare(move.to)} ${TR_PIECES[move.captured].myAcc} alıyor (${move.san})${checkTag(move, 'tr')}.`
  }
  return `Rakip ${p.theirNom} ile ${trToSquare(move.to)} oynuyor (${move.san})${checkTag(move, 'tr')}.`
}

/** Explains why the engine's best move works in plain language. */
export function formatBestReason(
  move: MoveDetails,
  reason: BestReason,
  lang = getLanguage(),
): string {
  const action = formatMoveAction(move, lang)
  if (lang === 'en') {
    switch (reason.kind) {
      case 'checkmate':
        return `${cap(action)} delivers immediate checkmate!`
      case 'forced-mate':
        return `${cap(action)} starts a forced checkmate sequence.`
      case 'free-capture':
        return `${cap(action)} wins material (+${reason.gain} points) that the opponent cannot recover.`
      case 'fork':
        return `${cap(action)} attacks ${reason.targetCount} enemy targets at once (a fork) and wins material.`
      case 'pin':
        return `${cap(action)} pins an enemy piece to a more valuable one behind it.`
      case 'skewer':
        return `${cap(action)} skewers a valuable piece to win the piece behind it.`
      case 'saves-piece':
        return `${cap(action)} rescues your threatened ${EN_PIECES[reason.piece]} from ${reason.from}.`
      case 'castle':
        return `${cap(action)} tucks your king to safety and brings your rook into the game.`
      case 'capture':
        return `${cap(action)} wins a favourable trade.`
      case 'gives-check':
        return `${cap(action)} gives check and seizes the initiative.`
      case 'develops':
        return `${cap(action)} develops a piece off the back rank into the game.`
      case 'active-rook':
        return `${cap(action)} puts your rook on the open ${reason.file}-file.`
      case 'position':
        return `${cap(action)} keeps your pieces safe and improves your position.`
    }
  }

  switch (reason.kind) {
    case 'checkmate':
      return `${cap(action)} doğrudan şah mat ediyor!`
    case 'forced-mate':
      return `${cap(action)} zorunlu mat yolunu açıyor.`
    case 'free-capture':
      return `${cap(action)} rakibin geri alamayacağı bedava taş kazandırıyor (+${reason.gain} puan).`
    case 'fork':
      return `${cap(action)} aynı anda ${reason.targetCount} hedefe saldırarak (çatal) taş kazandırıyor.`
    case 'pin':
      return `${cap(action)} rakibin taşını arkasındaki daha değerli taşa bağlıyor (açmaz).`
    case 'skewer':
      return `${cap(action)} öndeki değerli taşa saldırıp arkasındaki taşı kazandırıyor (şiş).`
    case 'saves-piece':
      return `${cap(action)} ${trAtSquare(reason.from)} tehdit altındaki ${TR_PIECES[reason.piece].myAcc} güvene alıyor.`
    case 'castle':
      return `${cap(action)} şahını köşeye çekip güvene alıyor ve kaleni oyuna sokuyor.`
    case 'capture':
      return `${cap(action)} kârlı bir takas yapıyor.`
    case 'gives-check':
      return `${cap(action)} şah çekerek baskıyı eline alıyor.`
    case 'develops':
      return `${cap(action)} başlangıç karesindeki taşını oyuna sokuyor.`
    case 'active-rook':
      return `${cap(action)} kaleni açık ${reason.file}-hattına çıkarıp aktif hale getiriyor.`
    case 'position':
      return `${cap(action)} taşlarını güvende tutup konumunu güçlendiriyor.`
  }
}

/** Explains why the user's game move was bad in plain language. */
export function formatPlayedReason(coaching: MistakeCoaching, lang = getLanguage()): string {
  const { move, reason, enemyReply } = coaching.played
  const playedText = formatPlayedSentence(move, lang)
  const detail = playedReasonDetail(reason, enemyReply, lang)
  return detail ? `${playedText} ${detail}` : playedText
}

function playedReasonDetail(
  reason: PlayedReason,
  enemyReply: MoveDetails | null,
  lang: 'tr' | 'en',
): string {
  if (lang === 'en') {
    switch (reason.kind) {
      case 'walked-into-mate':
        return 'This allows the opponent a forced checkmate.'
      case 'hanging-piece':
        if (reason.threat) return formatThreatSentence(reason.threat, 'own', 'en')
        return enemyReply
          ? `It leaves a piece undefended. ${formatEnemyReply(enemyReply, 'en')}`
          : 'It leaves one of your pieces undefended.'
      case 'allowed-fork':
        return enemyReply
          ? `It walks into a fork: ${formatEnemyReply(enemyReply, 'en')}`
          : 'It allows the opponent to fork two of your pieces.'
      case 'allowed-pin':
        return enemyReply
          ? `It walks into a pin: ${formatEnemyReply(enemyReply, 'en')}`
          : 'It lets the opponent pin one of your pieces.'
      case 'allowed-skewer':
        return enemyReply
          ? `It walks into a skewer: ${formatEnemyReply(enemyReply, 'en')}`
          : 'It lets the opponent skewer your pieces.'
      case 'missed-free-piece':
        return `You missed the opponent’s free ${EN_PIECES[reason.targetPiece]} on ${reason.targetSquare}.`
      case 'missed-mate':
        return 'You had a forced checkmate here but missed it.'
      case 'blew-winning':
        return enemyReply
          ? `This throws away a winning lead. ${formatEnemyReply(enemyReply, 'en')}`
          : 'This throws away a winning advantage.'
      case 'time-pressure':
        return 'The clock was low and this gave away the advantage.'
      case 'general':
        return enemyReply ? formatEnemyReply(enemyReply, 'en') : ''
    }
  }

  switch (reason.kind) {
    case 'walked-into-mate':
      return 'Bu hamle rakibe zorunlu mat yolu açıyor.'
    case 'hanging-piece':
      if (reason.threat) return formatThreatSentence(reason.threat, 'own', 'tr')
      return enemyReply
        ? `Bu hamle bir taşını korumasız bırakıyor. ${formatEnemyReply(enemyReply, 'tr')}`
        : 'Bu hamle bir taşını korumasız bırakıyor.'
    case 'allowed-fork':
      return enemyReply
        ? `İki taşını birden hedefleyen bir çatala izin veriyor: ${formatEnemyReply(enemyReply, 'tr')}`
        : 'Rakibe iki taşını birden tehdit eden bir çatal fırsatı veriyor.'
    case 'allowed-pin':
      return enemyReply
        ? `Taşının açmaza düşmesine izin veriyor: ${formatEnemyReply(enemyReply, 'tr')}`
        : 'Rakibin taşını açmaza almasına izin veriyor.'
    case 'allowed-skewer':
      return enemyReply
        ? `Şişe düşmeye izin veriyor: ${formatEnemyReply(enemyReply, 'tr')}`
        : 'Rakibe şiş taktiği fırsatı veriyor.'
    case 'missed-free-piece':
      return `Rakibin ${trAtSquare(reason.targetSquare)} bedava ${TR_PIECES[reason.targetPiece].theirNom} kaçtı.`
    case 'missed-mate':
      return 'Burada zorunlu matın vardı ama kaçırdın.'
    case 'blew-winning':
      return enemyReply
        ? `Kazanılmış üstünlüğü elden bırakıyor. ${formatEnemyReply(enemyReply, 'tr')}`
        : 'Kazanılmış üstünlüğü elden bırakıyor.'
    case 'time-pressure':
      return 'Süre azaldığı için avantajı kaybettin.'
    case 'general':
      return enemyReply ? formatEnemyReply(enemyReply, 'tr') : ''
  }
}

/** Returns the coaching thinking tip for a motif/situation from i18n. */
export function formatCoachTip(coaching: MistakeCoaching): string {
  return t(`coach.tip.${coaching.tip}`)
}

function cap(text: string): string {
  return text ? text.charAt(0).toLocaleUpperCase('tr-TR') + text.slice(1) : text
}
