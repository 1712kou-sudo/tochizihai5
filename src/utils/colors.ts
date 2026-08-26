/**
 * けあしる カラー＆ステータス定義
 * 
 * 4つのスロット状態（family / insurance / paid / none）に対応する
 * 仕様書準拠のカラーコード、背景色、テキスト色、ラベルを管理します。
 */

import { ServiceScheme, SlotState } from '@/types';

export interface SlotColorConfig {
  state: SlotState;
  label: string;
  shortLabel: string;
  bgHex: string;
  textHex: string;
  borderHex: string;
  badgeClass: string;
  cardClass: string;
  filterIdleClass: string;
  filterSelectedClass: string;
  description: string;
}

export const SLOT_COLORS: Record<SlotState, SlotColorConfig> = {
  family: {
    state: 'family',
    label: '家族が担う',
    shortLabel: '家族',
    bgHex: '#F0E7E0',
    textHex: '#5E4536',
    borderHex: '#BFA795',
    badgeClass: 'bg-[#F0E7E0] text-[#5E4536] border-[#BFA795]',
    cardClass: 'bg-[#F0E7E0] text-[#5E4536] border-[#BFA795] hover:bg-[#E6D9CF]',
    filterIdleClass: 'border-[#BFA795] bg-[#F0E7E0] text-[#5E4536] hover:bg-[#E6D9CF]',
    filterSelectedClass: 'border-[#2D231E] bg-[#8A7059] text-white shadow-[0_3px_0_#2D231E]',
    description: '家族が自力で抱えている時間（見えない介護負担）',
  },
  insurance: {
    state: 'insurance',
    label: '保険・公的',
    shortLabel: '保険',
    bgHex: '#C9DDEE',
    textHex: '#183F66',
    borderHex: '#5E8CB4',
    badgeClass: 'bg-[#C9DDEE] text-[#183F66] border-[#5E8CB4]',
    cardClass: 'bg-[#C9DDEE] text-[#183F66] border-[#5E8CB4] hover:bg-[#B9D2E8]',
    filterIdleClass: 'border-[#5E8CB4] bg-[#C9DDEE] text-[#183F66] hover:bg-[#B9D2E8]',
    filterSelectedClass: 'border-[#2D231E] bg-[#3F6E97] text-white shadow-[0_3px_0_#2D231E]',
    description: '1〜3割負担で利用できる公的給付・総合事業サービス',
  },
  paid: {
    state: 'paid',
    label: '保険外',
    shortLabel: '保険外',
    bgHex: '#FFDDBB',
    textHex: '#7B3A0B',
    borderHex: '#ED6A2C',
    badgeClass: 'bg-[#FFDDBB] text-[#7B3A0B] border-[#ED6A2C]',
    cardClass: 'bg-[#FFDDBB] text-[#7B3A0B] border-[#ED6A2C] hover:bg-[#FFD0A4]',
    filterIdleClass: 'border-[#ED6A2C] bg-[#FFDDBB] text-[#7B3A0B] hover:bg-[#FFD0A4]',
    filterSelectedClass: 'border-[#2D231E] bg-[#C4511A] text-white shadow-[0_3px_0_#2D231E]',
    description: '自治体上乗せ施策・シルバー人材・民間自費・地域互助サービス',
  },
  none: {
    state: 'none',
    label: '予定なし',
    shortLabel: 'なし',
    bgHex: '#FAF7F4',
    textHex: '#9A9089',
    borderHex: '#DCCFC4',
    badgeClass: 'bg-[#FAF7F4] text-[#9A9089] border-dashed border-[#DCCFC4]',
    cardClass: 'bg-[#FAF7F4] text-[#9A9089] border-dashed border-[#DCCFC4] hover:bg-[#F2EDE8]',
    filterIdleClass: 'border-dashed border-[#DCCFC4] bg-[#FAF7F4] text-[#9A9089] hover:bg-[#F2EDE8]',
    filterSelectedClass: 'border-[#2D231E] bg-[#8A7F76] text-white shadow-[0_3px_0_#2D231E]',
    description: '困りごとが登録されていない、または対応者不在の枠',
  },
};

/**
 * サービススキーム別のバッジ表示設定
 */
export const SCHEME_LABELS: Record<ServiceScheme, { label: string; badgeColor: string }> = {
  insurance: {
    label: '介護保険給付',
    badgeColor: 'bg-[#E4EDF4] text-[#1F4A73] border-[#5E8CB4]',
  },
  sogo_jigyo: {
    label: '総合事業',
    badgeColor: 'bg-[#E4EDF4] text-[#1F4A73] border-[#5E8CB4]',
  },
  municipal_extra: {
    label: '自治体施策',
    badgeColor: 'bg-[#FDE8DC] text-[#8A3D07] border-[#ED6A2C]',
  },
  private_paid: {
    label: '民間自費',
    badgeColor: 'bg-[#FFDDBB] text-[#7B3A0B] border-[#ED6A2C]',
  },
  mutual_aid: {
    label: '地域互助・NPO',
    badgeColor: 'bg-[#FFDDBB] text-[#7B3A0B] border-[#ED6A2C]',
  },
};
