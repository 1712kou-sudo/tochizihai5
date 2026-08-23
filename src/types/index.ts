/**
 * ケアタイムライン 型定義ファイル
 * 
 * 介護保険・保険外サービス、28スロットタイムライン、
 * 要介護度・世帯状況・指標計算に関する型を定義します。
 */

// 要介護認定区分
export type CareLevel = 
  | 'unapplied'    // 未申請
  | 'support_1'    // 要支援1
  | 'support_2'    // 要支援2
  | 'care_1'       // 要介護1
  | 'care_2'       // 要介護2
  | 'care_3'       // 要介護3
  | 'care_4'       // 要介護4
  | 'care_5'       // 要介護5
  | 'unknown';     // 不明

// 世帯状況
export type HouseholdType = 
  | 'single'           // 独居（一人暮らし）
  | 'elderly_only'     // 高齢者のみ世帯
  | 'living_together'  // 同居家族あり
  | 'long_distance';   // 遠距離介護

// 曜日（7日）
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

// 時間帯（4区分）
export type TimePeriod = 'morning' | 'daytime' | 'evening' | 'night';

// スロット識別子 (例: "mon-morning")
export type SlotId = `${DayOfWeek}-${TimePeriod}`;

// スロットの状態（色分け）
export type SlotState = 
  | 'family'     // 赤: 家族が担っている
  | 'insurance'  // 緑: 介護保険給付・総合事業
  | 'paid'       // 橙: 保険外（自治体上乗せ／民間自費／互助）
  | 'none';      // グレー: 誰もいない（リスク枠）

// サービス提供スキーム
export type ServiceScheme = 
  | 'insurance'        // 介護保険給付
  | 'sogo_jigyo'       // 総合事業（地域支援事業）
  | 'municipal_extra'  // 自治体独自（上乗せ・横出し施策）
  | 'private_paid'     // 民間自費サービス
  | 'mutual_aid';      // 地域互助・ボランティア・NPO

// ニーズカテゴリ
export type NeedsCategory = 
  | 'housework'      // 家事（調理・掃除・洗濯・ゴミ出し等）
  | 'outing'         // 外出（通院付き添い・買い物・散歩等）
  | 'monitoring'     // 見守り・安否確認
  | 'physical_care'  // 身体介護（入浴・排泄・着替え・服薬等）
  | 'social'         // 社会参加・話し相手・デイサービス
  | 'housing'        // 住まい・環境（庭木・軽作業・雪かき等）
  | 'family_rest';   // 家族の休息・レスパイト

// ニーズタグ定義
export interface NeedsTag {
  id: string;
  name: string;
  category: NeedsCategory;
  description: string;
  defaultSlots: TimePeriod[]; // 既定で発生しやすい時間帯
  iconName: string;
}

// サービス提供事業所情報
export interface Provider {
  id: string;
  name: string;
  corporateNumber?: string;
  kaigoJigyoshoBango?: string;
  address: string;
  lat: number;
  lng: number;
  tel: string;
  url?: string;
  providerType: 'care_facility' | 'silver_center' | 'social_welfare' | 'npo' | 'private_business' | 'volunteer';
}

// サービスデータ定義
export interface Service {
  id: string;
  providerId: string;
  providerName: string;
  name: string;
  scheme: ServiceScheme;
  description: string;
  needsTagIds: string[];
  targetCareLevels: CareLevel[];
  targetHouseholds: HouseholdType[];
  availableDays: DayOfWeek[];
  availablePeriods: TimePeriod[];
  priceModel: 'per_time' | 'per_hour' | 'per_month' | 'unit_based' | 'free';
  price: number;              // 1回あたりの利用者自己負担額（円）
  unitCount?: number;         // 介護報酬単位数（保険内のみ）
  reductionHours: number;     // このサービスが1回で肩代わりする家族時間（h）
  applicationRoute: string;   // 相談・申込先窓口
  sourceUrl: string;          // 出典URL
  sourceType: string;         // 公表システム / 自治体PDF / 事業所サイト / 社協等
  priceSourceSnippet: string; // 原文抜粋
  verifiedAt: string;         // 最終確認日
  verifiedBy: string;         // 承認担当
  status: 'draft' | 'approved' | 'rejected' | 'stale';
  confidenceScore: number;    // AI信頼度スコア 0-1
}

// タイムラインの1スロットデータ
export interface TimelineSlot {
  id: SlotId;
  day: DayOfWeek;
  period: TimePeriod;
  state: SlotState;
  needsTagId?: string;
  assignedService?: Service;
  assignedPerson?: string;    // ブラウザ側での担当者名（例: "長女", "長男", "ヘルパー"）
  nominalHours: number;       // スロットの基準時間（朝=2, 昼=7, 夕=3, 夜=3）
  effectiveHours: number;     // 実質家族負担時間（要介護度や内容により調整）
  cost: number;               // 自己負担額（円/月換算）
  riskWarning?: string;       // リスク警告文
}

// 3大指標 ＋ 買い戻し単価
export interface TimelineMetrics {
  familyHoursPerWeek: number;  // 家族の介護時間（時間／週）
  selfPayPerMonth: number;     // 自己負担額（円／月）
  coverageRate: number;        // サービス充足率（%）
  savedHoursPerMonth: number;  // 削減された家族時間（時間／月）
  repurchaseUnitPrice: number; // 時間の買い戻し単価（円／時間）
  insuranceUnitsUsed: number;  // 利用介護保険単位数
  insuranceUnitsLimit: number; // 区分支給限度基準額単位数
  isLimitExceeded: boolean;    // 支給限度額超過フラグ
}

// 境界説明ルール（保険内 vs 保険外）
export interface RestrictionRule {
  id: string;
  needsTagId: string;
  title: string;
  scheme: ServiceScheme;
  isCovered: 'covered' | 'conditional' | 'not_covered';
  conditionText: string;
  explanation: string;
  officialSource: string;
}

// 匿名検索ログ（自治体ダッシュボード向け）
export interface SearchLog {
  id: string;
  careLevel: CareLevel;
  householdType: HouseholdType;
  needsTagIds: string[];
  slotId: SlotId;
  resultCount: number;
  assignedServiceId?: string;
  budget: number;
  reductionHoursTotal: number;
  postalPrefix: string;
  createdAt: string;
}

// 入力フォームデータ
export interface UserInputData {
  careLevel: CareLevel;
  householdType: HouseholdType;
  selectedNeeds: string[]; // needsTagIds
  slotNeeds: Record<SlotId, string | null>; // スロットごとの困りごと
  monthlyBudget: number;   // 月額予算（円）
  postalCode?: string;     // 郵便番号
}
