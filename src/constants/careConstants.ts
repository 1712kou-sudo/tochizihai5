/**
 * 介護保険制度定数およびマスターデータ定義
 * 
 * 厚生労働省告示に基づく区分支給限度基準額テーブル、
 * スロット定義、頻出ニーズタグ、境界ルール、デモ用サンプルデータを管理します。
 */

import { CareLevel, DayOfWeek, NeedsTag, RestrictionRule, TimePeriod, UserInputData } from '@/types';

/**
 * 区分支給限度基準額（単位／月）
 * 厚生労働省の最新介護報酬告示に基づく基準単位数
 * （1単位あたり標準10円、自己負担1割〜3割。基本計算は1割で算出）
 */
export const CARE_LEVEL_LIMITS: Record<CareLevel, {
  name: string;
  maxUnits: number;          // 支給限度単位数
  approximateMaxCost: number;// 10割相当額（円/月）
  selfPayBaseCost: number;   // 1割負担時の上限目安（円/月）
  description: string;
}> = {
  unapplied: {
    name: '未申請',
    maxUnits: 0,
    approximateMaxCost: 0,
    selfPayBaseCost: 0,
    description: '介護保険給付は利用できません。まず市区町村窓口で認定申請を行いましょう。',
  },
  support_1: {
    name: '要支援1',
    maxUnits: 5032,
    approximateMaxCost: 50320,
    selfPayBaseCost: 5032,
    description: '日常生活の一部に支援が必要。総合事業や予防給付が利用可能。',
  },
  support_2: {
    name: '要支援2',
    maxUnits: 10531,
    approximateMaxCost: 105310,
    selfPayBaseCost: 10531,
    description: '状態維持・改善のための予防給付や総合事業が利用可能。',
  },
  care_1: {
    name: '要介護1',
    maxUnits: 16765,
    approximateMaxCost: 167650,
    selfPayBaseCost: 16765,
    description: '身の回りの世話（立ち上がりや歩行等）に部分的な介助が必要。',
  },
  care_2: {
    name: '要介護2',
    maxUnits: 19705,
    approximateMaxCost: 197050,
    selfPayBaseCost: 19705,
    description: '身の回りのことや排泄・入浴等に一部または全般的な介助が必要。',
  },
  care_3: {
    name: '要介護3',
    maxUnits: 27048,
    approximateMaxCost: 270480,
    selfPayBaseCost: 27048,
    description: '自力での立ち上がりや歩行が難しく、排泄・入浴・着替え等に全面的な介助が必要。',
  },
  care_4: {
    name: '要介護4',
    maxUnits: 30938,
    approximateMaxCost: 309380,
    selfPayBaseCost: 30938,
    description: '日常生活全般に介助が必要で、動作能力の低下が著しい状態。',
  },
  care_5: {
    name: '要介護5',
    maxUnits: 36217,
    approximateMaxCost: 362170,
    selfPayBaseCost: 36217,
    description: '生活全般で常時介助が必要。意思の伝達が困難な場合が多い状態。',
  },
  unknown: {
    name: '区分不明・相談中',
    maxUnits: 19705, // 試算用に要介護2相当を仮置き
    approximateMaxCost: 197050,
    selfPayBaseCost: 19705,
    description: '要介護度が未定のため、一般的な「要介護2」の限度額を仮適用して試算します。',
  },
};

/**
 * 曜日一覧定義
 */
export const DAYS_OF_WEEK: { key: DayOfWeek; label: string; shortLabel: string }[] = [
  { key: 'mon', label: '月曜日', shortLabel: '月' },
  { key: 'tue', label: '火曜日', shortLabel: '火' },
  { key: 'wed', label: '水曜日', shortLabel: '水' },
  { key: 'thu', label: '木曜日', shortLabel: '木' },
  { key: 'fri', label: '金曜日', shortLabel: '金' },
  { key: 'sat', label: '土曜日', shortLabel: '土' },
  { key: 'sun', label: '日曜日', shortLabel: '日' },
];

/**
 * 時間帯4区分定義
 * スロットごとの名目時間と実質負担基本時間
 */
export const TIME_PERIODS: {
  key: TimePeriod;
  label: string;
  timeRange: string;
  nominalHours: number;
  defaultEffectiveHours: number;
}[] = [
  {
    key: 'morning',
    label: '朝',
    timeRange: '7:00 - 9:00',
    nominalHours: 2,
    defaultEffectiveHours: 2,
  },
  {
    key: 'daytime',
    label: '日中',
    timeRange: '9:00 - 16:00',
    nominalHours: 7,
    defaultEffectiveHours: 4, // 常時付き添いでない限り実質4時間程度として換算
  },
  {
    key: 'evening',
    label: '夕方',
    timeRange: '16:00 - 19:00',
    nominalHours: 3,
    defaultEffectiveHours: 3,
  },
  {
    key: 'night',
    label: '夜間',
    timeRange: '19:00 - 22:00',
    nominalHours: 3,
    defaultEffectiveHours: 3,
  },
];

/**
 * 頻出ニーズタグ（30件）
 * 介護現場で最も頻出する困りごとをカテゴリ別に網羅
 */
export const NEEDS_TAGS: NeedsTag[] = [
  // 家事系 (housework)
  {
    id: 'cooking',
    name: '朝夕の調理・食事準備',
    category: 'housework',
    description: '栄養バランスの取れた温かい食事の用意や後片付け',
    defaultSlots: ['morning', 'evening'],
    iconName: 'Utensils',
  },
  {
    id: 'cleaning',
    name: '居室・水回りの掃除',
    category: 'housework',
    description: '居室の掃除機がけ、トイレ・浴室・キッチンの清掃',
    defaultSlots: ['daytime'],
    iconName: 'Sparkles',
  },
  {
    id: 'laundry',
    name: '洗濯・衣類干し',
    category: 'housework',
    description: '衣類の洗濯、乾燥、取り込み、たたみ',
    defaultSlots: ['morning', 'daytime'],
    iconName: 'Shirt',
  },
  {
    id: 'garbage',
    name: 'ゴミ出し・分別',
    category: 'housework',
    description: '決められた集積場所へのゴミ出し、粗大ゴミ等の整理',
    defaultSlots: ['morning'],
    iconName: 'Trash2',
  },
  {
    id: 'shopping_daily',
    name: '食材・日用品の買い物',
    category: 'housework',
    description: 'スーパーやドラッグストアでの日用品・生鮮食品の買い出し',
    defaultSlots: ['daytime', 'evening'],
    iconName: 'ShoppingCart',
  },

  // 外出系 (outing)
  {
    id: 'hospital_escort',
    name: '通院付き添い・院内介助',
    category: 'outing',
    description: '病院への行き帰り移動介助、受付や待合室・診察室での付き添い',
    defaultSlots: ['morning', 'daytime'],
    iconName: 'Ambulance',
  },
  {
    id: 'walk_escort',
    name: '散歩・近隣外出の同行',
    category: 'outing',
    description: '気分転換や筋力維持のための散歩同行、安全確保',
    defaultSlots: ['daytime', 'evening'],
    iconName: 'Footprints',
  },
  {
    id: 'bank_escort',
    name: '銀行・役所手続きの同行',
    category: 'outing',
    description: '行政手続き、年金受給や光熱費支払いなどの外出同行',
    defaultSlots: ['daytime'],
    iconName: 'Building',
  },

  // 見守り・安否 (monitoring)
  {
    id: 'safety_check_day',
    name: '日中の安否確認・声かけ',
    category: 'monitoring',
    description: '定期的な訪問や電話、センサー等による安否確認と体調チェック',
    defaultSlots: ['daytime'],
    iconName: 'Eye',
  },
  {
    id: 'meal_delivery_check',
    name: '配食サービス＋安否確認',
    category: 'monitoring',
    description: '栄養配慮のお弁当の手渡し配達と、その際の手渡し安否確認',
    defaultSlots: ['daytime', 'evening'],
    iconName: 'Package',
  },
  {
    id: 'night_safety',
    name: '夜間の転倒・徘徊不安',
    category: 'monitoring',
    description: '夜間トイレ移動の不安、徘徊リスクへの対策やコール対応',
    defaultSlots: ['night'],
    iconName: 'Moon',
  },
  {
    id: 'emergency_system',
    name: '緊急通報・駆けつけ体制',
    category: 'monitoring',
    description: 'ペンダント型通報機や緊急時警備員の駆けつけサービス',
    defaultSlots: ['night', 'daytime'],
    iconName: 'ShieldAlert',
  },

  // 身体介護 (physical_care)
  {
    id: 'bath_care',
    name: '入浴介助・洗髪',
    category: 'physical_care',
    description: '浴槽への出入り、身体の洗浄、着替え等の介助',
    defaultSlots: ['daytime', 'evening'],
    iconName: 'Droplets',
  },
  {
    id: 'excretion_care',
    name: '排泄介助・おむつ交換',
    category: 'physical_care',
    description: 'トイレ誘導、ポータブルトイレ介助、おむつ交換',
    defaultSlots: ['morning', 'daytime', 'evening', 'night'],
    iconName: 'Activity',
  },
  {
    id: 'medication_check',
    name: '服薬管理・飲み忘れ防止',
    category: 'physical_care',
    description: '決められた時間での確実な服薬の確認・カレンダーセット',
    defaultSlots: ['morning', 'evening'],
    iconName: 'Pill',
  },
  {
    id: 'dressing_care',
    name: '着替え・身だしなみ介助',
    category: 'physical_care',
    description: '朝の着替え、整髪、口腔ケア、就寝前のパジャマ着替え',
    defaultSlots: ['morning', 'night'],
    iconName: 'Smile',
  },
  {
    id: 'rehab_training',
    name: '訪問リハビリ・機能訓練',
    category: 'physical_care',
    description: 'PT/OT等専門職による自宅での関節可動域維持や歩行訓練',
    defaultSlots: ['daytime'],
    iconName: 'HeartPulse',
  },

  // 社会参加・話し相手 (social)
  {
    id: 'day_service',
    name: '通所介護（デイサービス）',
    category: 'social',
    description: '送迎付き施設での入浴・食事・機能訓練・他者交流',
    defaultSlots: ['daytime'],
    iconName: 'Sun',
  },
  {
    id: 'talking_partner',
    name: '話し相手・認知症傾聴',
    category: 'social',
    description: '孤独感解消のための傾聴ボランティアや対面コミュニケーション',
    defaultSlots: ['daytime', 'evening'],
    iconName: 'MessageCircleHeart',
  },
  {
    id: 'community_gathering',
    name: '通いの場・サロン参加',
    category: 'social',
    description: '地域包括支援センターや社協が主催する百歳体操や茶話会',
    defaultSlots: ['daytime'],
    iconName: 'Users',
  },
  {
    id: 'haircut_visit',
    name: '訪問理美容・身だしなみ',
    category: 'social',
    description: '自宅や施設に出張して行うプロによるカット・カラー',
    defaultSlots: ['daytime'],
    iconName: 'Scissors',
  },

  // 住まい・環境 (housing)
  {
    id: 'gardening_weed',
    name: '庭木剪定・草むしり',
    category: 'housing',
    description: '敷地内の雑草除去、庭木の手入れ、防犯・衛生環境の維持',
    defaultSlots: ['daytime'],
    iconName: 'Flower2',
  },
  {
    id: 'handyman_tasks',
    name: '電球交換・家具移動・軽作業',
    category: 'housing',
    description: '高いところの電球交換、粗大ゴミの移動、建具の調整',
    defaultSlots: ['daytime'],
    iconName: 'Wrench',
  },
  {
    id: 'pet_care',
    name: 'ペットの散歩・給餌',
    category: 'housing',
    description: '高齢者が飼っている愛犬・愛猫の散歩代行やケージ掃除',
    defaultSlots: ['morning', 'evening'],
    iconName: 'Dog',
  },
  {
    id: 'diaper_delivery_subsidy',
    name: '紙おむつ支給・配達',
    category: 'housing',
    description: '自治体補助による大人用おむつの定期配達と費用助成',
    defaultSlots: ['daytime'],
    iconName: 'Box',
  },
  {
    id: 'futon_drying',
    name: '寝具乾燥・水洗い消毒',
    category: 'housing',
    description: '重くて干せない布団の専用乾燥車による丸ごと乾燥・消毒サービス',
    defaultSlots: ['daytime'],
    iconName: 'SunMedium',
  },

  // 家族の休息・レスパイト (family_rest)
  {
    id: 'short_stay',
    name: 'ショートステイ（短期入所）',
    category: 'family_rest',
    description: '家族の冠婚葬祭・旅行・介護疲れリフレッシュのための短期宿泊施設利用',
    defaultSlots: ['daytime', 'night'],
    iconName: 'Bed',
  },
  {
    id: 'night_respite',
    name: '夜間見守り・家族の睡眠確保',
    category: 'family_rest',
    description: '夜間の付き添いを専門員が代行し、主介護者がまとまった睡眠をとる',
    defaultSlots: ['night'],
    iconName: 'ShieldCheck',
  },
  {
    id: 'weekend_relief',
    name: '休日の介護交代・見守り代行',
    category: 'family_rest',
    description: '休日に家族が外出・休息できるよう、半日〜終日の見守りを委託',
    defaultSlots: ['daytime'],
    iconName: 'Coffee',
  },
  {
    id: 'care_consultation',
    name: 'ケアマネ・専門員への悩み相談',
    category: 'family_rest',
    description: '介護の悩み、施設入所検討、ケアプランの見直し相談',
    defaultSlots: ['daytime', 'evening'],
    iconName: 'HelpCircle',
  },
];

/**
 * 保険内外の境界説明ルール
 * ケアマネや家族が直面する「保険でできること／できないこと」の明文化
 */
export const RESTRICTION_RULES: RestrictionRule[] = [
  {
    id: 'rule_housework_living_together',
    needsTagId: 'cleaning',
    title: '同居家族がいる場合の生活援助（掃除・洗濯・調理）',
    scheme: 'insurance',
    isCovered: 'conditional',
    conditionText: '原則として同居家族がいる場合は介護保険の「生活援助」は算定不可。',
    explanation: '同居家族が障害や疾病、就労等で家事を行うことが困難な「やむを得ない事情」があるとケアマネジャーおよび自治体が認めた場合のみ保険適用。それ以外はシルバー人材センターや民間家事代行（自費）を利用します。',
    officialSource: '厚生労働省「老計第10号」及び各市区町村介護保険の手引き',
  },
  {
    id: 'rule_hospital_in_clinic',
    needsTagId: 'hospital_escort',
    title: '通院付き添いにおける「院内介助」の扱い',
    scheme: 'insurance',
    isCovered: 'conditional',
    conditionText: '病院敷地内・診察室内の介助は原則「病院スタッフが対応」とされ保険対象外。',
    explanation: '見守りや誘導が常時必要な認知症・重度身体障害があり、病院側で対応困難な場合に限り自治体判断で保険適用される場合があります。院内の長い待ち時間の付き添いは民間自費サービスやボランティアが有効です。',
    officialSource: '厚生労働省通知（介護保険における通院等乗降介助等の取扱いについて）',
  },
  {
    id: 'rule_gardening_pet',
    needsTagId: 'gardening_weed',
    title: '庭木の手入れ・草むしり・ペットの世話',
    scheme: 'private_paid',
    isCovered: 'not_covered',
    conditionText: '本人の日常生活に直接必要不可欠な行為ではないため、介護保険の完全対象外。',
    explanation: '草むしりや植木剪定、犬の散歩等は介護保険給付では行えません。シルバー人材センター（1時間1,200〜1,800円程度）や地域の便利屋・自費サービスを活用します。',
    officialSource: '厚生労働省「老計第10号（訪問介護におけるサービス行為の考え方）」',
  },
  {
    id: 'rule_shopping_extra',
    needsTagId: 'shopping_daily',
    title: '家族分の買い物・嗜好品・遠方店舗での買い物',
    scheme: 'insurance',
    isCovered: 'conditional',
    conditionText: '本人の日常生活に直接必要な最小限の日用品・食材の近隣購入のみ保険対象。',
    explanation: '家族全員分のまとめ買いや、デパートへの買い物、お酒・タバコなどの嗜好品のみの買い出しは保険対象外となります。配食サービスや民間ネットスーパー、自費家事代行と併用します。',
    officialSource: '訪問介護適正化ガイドライン',
  },
  {
    id: 'rule_night_respite',
    needsTagId: 'night_safety',
    title: '夜間の長時間の見守り・付き添い宿泊',
    scheme: 'private_paid',
    isCovered: 'conditional',
    conditionText: '定期巡回・随時対応型訪問介護看護（1回短時間）は保険適用。長時間の添い寝・見守りは自費。',
    explanation: '夜間に数時間滞在する見守りは保険外の夜間専門付き添いサービス（1泊1.2万〜2万円）やショートステイを活用します。',
    officialSource: '地域密着型サービス実施基準',
  },
];

/**
 * 入力例サンプル（要介護2・同居家族あり・家族負担が大きいケース）
 */
export const DEMO_SAMPLE_INPUT: UserInputData = {
  careLevel: 'care_2',
  householdType: 'living_together',
  selectedNeeds: [
    'cooking',
    'hospital_escort',
    'bath_care',
    'day_service',
    'gardening_weed',
    'meal_delivery_check',
    'cleaning',
    'night_safety',
    'short_stay',
  ],
  slotNeeds: {
    'mon-morning': 'cooking',
    'mon-daytime': 'day_service',
    'mon-evening': 'cooking',
    'mon-night': 'night_safety',

    'tue-morning': 'cooking',
    'tue-daytime': 'hospital_escort',
    'tue-evening': 'bath_care',
    'tue-night': 'night_safety',

    'wed-morning': 'cooking',
    'wed-daytime': 'cleaning',
    'wed-evening': 'cooking',
    'wed-night': null,

    'thu-morning': 'cooking',
    'thu-daytime': 'day_service',
    'thu-evening': 'cooking',
    'thu-night': 'night_safety',

    'fri-morning': 'cooking',
    'fri-daytime': 'meal_delivery_check',
    'fri-evening': 'bath_care',
    'fri-night': null,

    'sat-morning': 'cooking',
    'sat-daytime': 'gardening_weed',
    'sat-evening': 'cooking',
    'sat-night': 'night_safety',

    'sun-morning': 'cooking',
    'sun-daytime': 'short_stay',
    'sun-evening': 'cooking',
    'sun-night': 'night_safety',
  },
  monthlyBudget: 25000,
  postalCode: '154-0004',
};
