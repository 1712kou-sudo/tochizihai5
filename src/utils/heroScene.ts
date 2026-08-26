/**
 * スクロールヒーローの派生値計算
 *
 * 進捗 p (0..1) から、チップ・アイコン・28マス・見出し・CTA の
 * すべての表示値を純関数で導く。React の再レンダリングを最小化するため、
 * ここには一切の副作用と DOM 参照を持たせない。
 *
 * 座標・回転・サイズは決定論的な擬似乱数（sin による hash）で生成しており、
 * デザインリファレンス（Redesign.dc.html）と同一の見た目になる。
 */

import { SLOT_COLORS } from '@/utils/colors';

/* ---------- 数値ヘルパー ---------- */
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** smoothstep（仕様のイージング） */
export const ease = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const hex = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

/** 2色を t で補間して rgb() 文字列にする */
export const mixColor = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(
    lerp(A[1], B[1], t)
  )},${Math.round(lerp(A[2], B[2], t))})`;
};

/** 決定論的な擬似乱数（seed が同じなら常に同じ値） */
const hash = (seed: number, k: number) => {
  const v = Math.sin(seed * k) * 43758.5453;
  return v - Math.floor(v);
};

/* ---------- 散布するテキスト ---------- */

/** 週表のマスに着地する10個（cell = 0..27 のマス番号） */
const PLACED: { t: string; c: number; k: 'insurance' | 'paid' }[] = [
  { t: 'ゴミ出し', c: 1, k: 'paid' },
  { t: '訪問介護', c: 7, k: 'insurance' },
  { t: '家事援助', c: 9, k: 'paid' },
  { t: '区の配食', c: 11, k: 'insurance' },
  { t: '買い物代行', c: 13, k: 'paid' },
  { t: 'デイ送迎', c: 15, k: 'insurance' },
  { t: '付き添い', c: 18, k: 'paid' },
  { t: '見守り', c: 22, k: 'paid' },
  { t: '訪問入浴', c: 24, k: 'insurance' },
  { t: '草むしり', c: 26, k: 'paid' },
];

/** 中央へ吸い込まれて消える62個 */
const NOISE = [
  '訪問介護', 'デイサービス', '福祉用具貸与', '要介護認定', 'ケアプラン', '地域包括支援センター',
  '短期入所', '訪問入浴', '通所リハビリ', '住宅改修 20万円', '高額介護サービス費', '限度額 19,705単位',
  '自費ヘルパー', '家事代行 2,800円/時', '移動支援', '介護タクシー', '見守りセンサー', '緊急通報装置',
  '生活支援体制整備事業', '社会福祉協議会', 'シルバー人材センター', 'NPOの家事支援', '生協の宅配', '便利屋',
  '草むしり 1,450円/時', '洗濯代行', '調理支援', '安否確認', '認知症カフェ', 'ショートステイ',
  '福祉用具購入費 10万円', '生活援助の条件', '同居家族がいる場合', '院内介助の扱い', '負担割合証', '区分変更申請',
  'サービス担当者会議', '訪問看護', '居宅療養管理指導', '夜間対応型訪問介護', '小規模多機能', '定期巡回・随時対応',
  '配食 1食 500円', '紙おむつの支給', '寝具の乾燥消毒', '理美容サービス', '外出支援', '介護者の会',
  'レスパイト入院', '要介護2', 'ケアマネジャー', '自己負担 1割', '支給限度額', '保険外サービス',
  '混合介護', '自治体の助成', '見守り訪問', '電球の交換', 'ペットの世話', '院内付き添い 3,300円/時',
  '買い物同行', '住民ボランティア',
];

const ALL_CHIPS: { text: string; cell: number }[] = [
  ...PLACED.map((p) => ({ text: p.t, cell: p.c })),
  ...NOISE.map((t) => ({ text: t, cell: -1 })),
];

/**
 * チップの初期位置。中央帯（y 37-63% × x 19-81%）は
 * 見出しとカードの立入禁止ゾーンなので、左右へ押し出す。
 */
const CHIP_NOISE = ALL_CHIPS.map((_, i) => {
  const rnd = (k: number) => hash(i + 7, k);
  const col = i % 9;
  const row = Math.floor(i / 9) % 8;
  let x = 3.5 + col * 10.8 + rnd(12.9898) * 7;
  const y = 12 + row * 10.2 + rnd(78.233) * 6;
  if (y > 37 && y < 63 && x > 19 && x < 81) {
    x = x < 50 ? 3 + (x - 19) * 0.45 : 81 + (x - 50) * 0.38;
  }
  return { x, y, rot: rnd(3.71) * 7 - 3.5, fs: 11.5 + rnd(5.31) * 4 };
});

/* ---------- アイコンタイル ---------- */

/** 24x24 の線画（家・時計・書類・¥・虫めがね・カレンダー・人・ハート・電球・封筒・＋・受話器） */
const ICONS = [
  { d1: 'M3 11l9-8 9 8', d2: 'M5 10v10h14V10' },
  { d1: 'M12 7v5l3 2', d2: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z' },
  { d1: 'M7 3h7l4 4v14H7z', d2: 'M14 3v5h5' },
  { d1: 'M7 5l5 7 5-7', d2: 'M12 12v7M8 14h8M8 17h8' },
  { d1: 'M15.5 15.5L20 20', d2: 'M11 17a6 6 0 1 1 0-12 6 6 0 0 1 0 12z' },
  { d1: 'M4 6h16v14H4z', d2: 'M4 10h16M8 4v4M16 4v4' },
  { d1: 'M5.5 19.5a6.5 6.5 0 0 1 13 0', d2: 'M12 12.4a3.4 3.4 0 1 1 0-6.8 3.4 3.4 0 0 1 0 6.8z' },
  { d1: 'M12 20s-7-4.5-9-9a4.8 4.8 0 0 1 9-2 4.8 4.8 0 0 1 9 2c-2 4.5-9 9-9 9z', d2: '' },
  { d1: 'M9 18h6M10 21h4', d2: 'M12 3a6 6 0 0 1 3.7 10.7c-.7.6-.7 1.3-.7 2.3H9c0-1 0-1.7-.7-2.3A6 6 0 0 1 12 3z' },
  { d1: 'M3 6h18v12H3z', d2: 'M3 7l9 6 9-6' },
  { d1: 'M12 8v8M8 12h8', d2: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z' },
  { d1: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z', d2: '' },
];

/** 立入禁止ゾーンを避けた手置きの12座標 */
const ICON_POS: [number, number][] = [
  [6, 17], [88, 14], [7, 42], [90, 38], [14, 68], [30, 82],
  [48, 77], [66, 86], [81, 68], [91, 55], [32, 18], [58, 15],
];
const ICON_BG = [
  '#FDE8DC', '#E7EFF6', '#F3EAD9', '#EAEFE3', '#F3EAD9', '#FDE8DC',
  '#EAEFE3', '#E7EFF6', '#FDE8DC', '#F3EAD9', '#E7EFF6', '#EAEFE3',
];

const ICON_NOISE = ICONS.map((_, j) => {
  const rnd = (k: number) => hash(j + 41, k);
  return {
    x: ICON_POS[j][0] + rnd(12.9898) * 4 - 2,
    y: ICON_POS[j][1] + rnd(78.233) * 4 - 2,
    rot: rnd(3.71) * 14 - 7,
    size: Math.round(42 + rnd(5.31) * 22),
  };
});

/** 見出し背後のアルキメデス螺旋（3.2周、縦0.66倍に潰す） */
export const SWIRL_PATH = (() => {
  let d = '';
  for (let a = 0; a <= 20.1; a += 0.3) {
    const r = 2.8 + 2.1 * a;
    d +=
      (d ? ' L' : 'M') +
      (60 + r * Math.cos(a)).toFixed(1) +
      ' ' +
      (30 + r * Math.sin(a) * 0.66).toFixed(1);
  }
  return d;
})();

export const DAYS = ['月', '火', '水', '木', '金', '土', '日'];

/* ---------- 型 ---------- */
export interface HeroChip {
  text: string;
  fs: string;
  dur: string;
  delay: string;
  x: string;
  y: string;
  tf: string;
  op: string;
}
export interface HeroIcon {
  d1: string;
  d2: string;
  x: string;
  y: string;
  tf: string;
  op: string;
  size: string;
  bg: string;
  dur: string;
  delay: string;
}
export interface HeroCell {
  label: string;
  bg: string;
  bc: string;
  bs: string;
  fg: string;
  op: string;
  tf: string;
}
export interface HeroScene {
  chips: HeroChip[];
  icons: HeroIcon[];
  cells: HeroCell[];
  bg: string;
  sub: string;
  chipBg: string;
  chipBc: string;
  chipFg: string;
  flipTf: string;
  introOp: string;
  swirlOpSoft: string;
  convOp: string;
  cardOp: string;
  cardSc: string;
  tableSc: string;
  daysOp: string;
  headOp: string;
  l1Tf: string;
  l2Tf: string;
  ctaOp: string;
  ctaTf: string;
  hintOp: number;
}

/**
 * 進捗 p からシーン全体の表示値を作る。
 * フェーズ区間は README のフェーズ表に対応。
 */
export function buildHeroScene(p: number): HeroScene {
  const flip = ease((p - 0.36) / 0.28);          // 0.36–0.64 天地反転
  const invert = Math.sin(clamp01(flip) * Math.PI); // 反転の中間で最大
  const assemble = ease((p - 0.66) / 0.22);      // 0.66–0.88 マスが咲く
  const head = ease((p - 0.8) / 0.14);           // 0.80–0.94 見出し
  const ctaF = ease((p - 0.9) / 0.09);           // 0.90–1.00 CTA

  const chips: HeroChip[] = ALL_CHIPS.map((it, i) => {
    const n = CHIP_NOISE[i];
    const dur = (4.5 + (n.fs - 11.5) * 0.875).toFixed(1) + 's';
    const delay = (-(n.rot + 3.5) * 0.9).toFixed(1) + 's';

    if (it.cell >= 0) {
      // 関連10個: カード上に縦一列の束として整列
      const g = ease((p - 0.09 - i * 0.014) / 0.22);
      return {
        text: it.text,
        fs: n.fs.toFixed(1) + 'px',
        dur,
        delay,
        x: lerp(n.x, 50, g).toFixed(2) + '%',
        y: lerp(n.y, 42 + i * 2.7, g).toFixed(2) + '%',
        tf: `translate(-50%,-50%) rotate(${lerp(n.rot, (i - 4.5) * 1.1, g).toFixed(
          1
        )}deg) scale(${lerp(1, 0.94, g).toFixed(3)})`,
        op: '1',
      };
    }

    // 無関係62個: 中央(50%,54%)へ吸い込まれて消える
    const cv = ease((p - 0.04 - (i % 11) * 0.015) / 0.22);
    return {
      text: it.text,
      fs: n.fs.toFixed(1) + 'px',
      dur,
      delay,
      x: lerp(n.x, 50, cv).toFixed(2) + '%',
      y: lerp(n.y, 54, cv).toFixed(2) + '%',
      tf: `translate(-50%,-50%) rotate(${lerp(n.rot, 0, cv).toFixed(1)}deg) scale(${lerp(
        1,
        0.22,
        cv
      ).toFixed(3)})`,
      op: (1 - ease((cv - 0.55) / 0.45)).toFixed(2),
    };
  });

  const icons: HeroIcon[] = ICONS.map((ic, j) => {
    const n = ICON_NOISE[j];
    const cv = ease((p - 0.05 - (j % 7) * 0.018) / 0.22);
    return {
      d1: ic.d1,
      d2: ic.d2,
      x: lerp(n.x, 50, cv).toFixed(2) + '%',
      y: lerp(n.y, 54, cv).toFixed(2) + '%',
      tf: `translate(-50%,-50%) rotate(${lerp(n.rot, 0, cv).toFixed(1)}deg) scale(${lerp(
        1,
        0.2,
        cv
      ).toFixed(3)})`,
      op: (1 - ease((cv - 0.55) / 0.45)).toFixed(2),
      size: n.size + 'px',
      bg: ICON_BG[j],
      dur: 5 + (j % 5) + 's',
      delay: '-' + (j * 0.7).toFixed(1) + 's',
    };
  });

  // 28マス: 中心からの距離順に咲く
  const cells: HeroCell[] = [];
  for (let i = 0; i < 28; i++) {
    const hit = PLACED.find((q) => q.c === i);
    const dist = Math.abs((i % 7) - 3) / 3 + Math.abs(Math.floor(i / 7) - 1.5) / 1.5;
    const f = ease(clamp01(assemble * 2.2 - dist * 0.3));
    const tok = SLOT_COLORS[hit ? hit.k : 'none'];
    cells.push({
      label: hit ? hit.t : '',
      bg: tok.bgHex,
      bc: tok.borderHex,
      bs: hit ? 'solid' : 'dashed',
      fg: tok.textHex,
      op: f.toFixed(2),
      tf: `scale(${lerp(0.62, 1, f).toFixed(3)})`,
    });
  }

  return {
    chips,
    icons,
    cells,
    bg: mixColor('#FFF8F3', '#241C18', invert),
    sub: mixColor('#8A7F76', '#A79A90', invert),
    chipBg: mixColor('#FFFFFF', '#241C18', invert),
    chipBc: mixColor('#E4D8CD', '#4A3E37', invert),
    chipFg: mixColor('#2D231E', '#F6F0EA', invert),
    flipTf: `rotateX(${(flip * 180).toFixed(2)}deg) scale(${(1 - 0.15 * invert).toFixed(3)})`,
    introOp: (1 - ease((p - 0.1) / 0.12)).toFixed(2),
    swirlOpSoft: (0.4 * (1 - ease((p - 0.12) / 0.14))).toFixed(2),
    convOp: (ease((p - 0.2) / 0.12) - ease((p - 0.42) / 0.1)).toFixed(2),
    cardOp: ease((p - 0.11) / 0.14).toFixed(2),
    cardSc: lerp(0.72, 1, ease((p - 0.11) / 0.18)).toFixed(3),
    tableSc: lerp(0.34, 1, ease((p - 0.6) / 0.2)).toFixed(3),
    daysOp: ease((p - 0.72) / 0.12).toFixed(2),
    headOp: head.toFixed(2),
    l1Tf: `translateY(${lerp(-80, 0, head).toFixed(1)}px) skewY(${lerp(-5, 0, head).toFixed(2)}deg)`,
    l2Tf: `translateY(${lerp(80, 0, head).toFixed(1)}px) skewY(${lerp(5, 0, head).toFixed(2)}deg)`,
    ctaOp: ctaF.toFixed(2),
    ctaTf: `translateY(${lerp(22, 0, ctaF).toFixed(1)}px)`,
    hintOp: p < 0.04 ? 1 : 0,
  };
}
