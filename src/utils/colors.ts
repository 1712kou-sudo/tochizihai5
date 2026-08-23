/**
 * ケアタイムライン カラー＆ステータス定義
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
  description: string;
}

export const SLOT_COLORS: Record<SlotState, SlotColorConfig> = {
  family: {
    state: 'family',
    label: '家族が担っている',
    shortLabel: '家族',
    bgHex: '#FCEBEB',
    textHex: '#791F1F',
    borderHex: '#F7C5C5',
    badgeClass: 'bg-[#FCEBEB] text-[#791F1F] border-[#F7C5C5]',
    cardClass: 'bg-[#FCEBEB] text-[#791F1F] border-[#F7C5C5] hover:border-[#E89999]',
    description: '家族が自力で抱えている時間（見えない介護負担）',
  },
  insurance: {
    state: 'insurance',
    label: '介護保険給付・総合事業',
    shortLabel: '保険内',
    bgHex: '#E1F5EE',
    textHex: '#085041',
    borderHex: '#B5EAD7',
    badgeClass: 'bg-[#E1F5EE] text-[#085041] border-[#B5EAD7]',
    cardClass: 'bg-[#E1F5EE] text-[#085041] border-[#B5EAD7] hover:border-[#83D5BA]',
    description: '1〜3割負担で利用できる公的給付・総合事業サービス',
  },
  paid: {
    state: 'paid',
    label: '保険外（自治体・民間・互助）',
    shortLabel: '保険外',
    bgHex: '#FAECE7',
    textHex: '#712B13',
    borderHex: '#F3D0C4',
    badgeClass: 'bg-[#FAECE7] text-[#712B13] border-[#F3D0C4]',
    cardClass: 'bg-[#FAECE7] text-[#712B13] border-[#F3D0C4] hover:border-[#E5A893]',
    description: '自治体上乗せ施策・シルバー人材・民間自費・地域互助サービス',
  },
  none: {
    state: 'none',
    label: '予定なし / リスク枠',
    shortLabel: 'なし',
    bgHex: '#F3F4F6',
    textHex: '#6B7280',
    borderHex: '#E5E7EB',
    badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
    cardClass: 'bg-gray-50/70 text-gray-400 border-dashed border-gray-200 hover:border-gray-300',
    description: '困りごとが登録されていない、または対応者不在の枠',
  },
};

/**
 * サービススキーム別のバッジ表示設定
 */
export const SCHEME_LABELS: Record<ServiceScheme, { label: string; badgeColor: string }> = {
  insurance: {
    label: '介護保険給付',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  sogo_jigyo: {
    label: '総合事業',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
  },
  municipal_extra: {
    label: '自治体上乗せ施策',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  private_paid: {
    label: '民間自費サービス',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  mutual_aid: {
    label: '地域互助・NPO',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
  },
};
