/**
 * 自治体ダッシュボード（to G）コンポーネント
 * 
 * 市民の検索ログや0件ヒット需要を集計し、
 * 1. 時間帯×曜日の需要集中 vs 供給空白ヒートマップ
 * 2. 未充足需要ランキング（検索0件タグ回数）
 * 3. 町丁目別サービス空白地図（高齢単身世帯 ÷ サービス数）
 * 4. 供給が特に不足している枠の数
 * を可視化して総合事業や生活支援体制整備事業の政策立案を支援します。
 */

'use client';

import React, { useMemo, useState } from 'react';
import { DAYS_OF_WEEK, NEEDS_TAGS, TIME_PERIODS } from '@/constants/careConstants';
import { ALL_SERVICES } from '@/data/servicesSeed';
import { NeedsCategory } from '@/types';
import {
  BarChart3,
  MapPin,
  TrendingUp,
  AlertOctagon,
  Shield,
  HelpCircle,
  Building2,
  Calendar,
  Layers,
} from 'lucide-react';

/** ヒートマップの対象にできるサービス種別 */
const SERVICE_CATEGORIES: { key: NeedsCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'housework', label: '家事' },
  { key: 'physical_care', label: '身体介護' },
  { key: 'monitoring', label: '見守り・安否確認' },
  { key: 'outing', label: '外出の付き添い' },
  { key: 'social', label: '社会参加' },
  { key: 'housing', label: '住まい・環境' },
  { key: 'family_rest', label: '家族の休息' },
];

// 自治体向けシミュレーションデータ
const UNMET_NEEDS_RANKING = [
  { rank: 1, name: '平日夕方の通院付き添い・院内介助', count: 342, reason: '訪問介護の対応終了後の時間帯、介護タクシー不足', category: '外出支援' },
  { rank: 2, name: '土日の庭木手入れ・除草', count: 285, reason: '介護保険適用外、シルバー人材の土日稼働枠不足', category: '住まい環境' },
  { rank: 3, name: '夜間（19時〜22時）の緊急駆けつけ・見守り', count: 219, reason: '定期巡回事業者のカバーエリア外、自費対応事業者僅少', category: '見守り' },
  { rank: 4, name: '愛犬の散歩・ペット給餌', count: 178, reason: '保険給付完全対象外、民間ペットシッター高額', category: '住まい環境' },
  { rank: 5, name: '休日日中の男性介護者のレスパイト', count: 142, reason: 'ショートステイの慢性的な満床、通所閉所', category: '家族休息' },
];

// 需要 vs 供給ギャップ（ヒートマップデータ: 4行×7列）
// 数値が高いほど「需要過多なのに供給ゼロ（深刻な空白枠）」
const HEATMAP_GAP_MATRIX: Record<string, number> = {
  'mon-morning': 45,
  'mon-daytime': 20,
  'mon-evening': 88, // 深刻
  'mon-night': 72,

  'tue-morning': 40,
  'tue-daytime': 15,
  'tue-evening': 82,
  'tue-night': 68,

  'wed-morning': 38,
  'wed-daytime': 18,
  'wed-evening': 91, // 深刻
  'wed-night': 70,

  'thu-morning': 42,
  'thu-daytime': 22,
  'thu-evening': 85,
  'thu-night': 65,

  'fri-morning': 50,
  'fri-daytime': 25,
  'fri-evening': 95, // 最も深刻
  'fri-night': 80,

  'sat-morning': 65,
  'sat-daytime': 78,
  'sat-evening': 89,
  'sat-night': 84,

  'sun-morning': 70,
  'sun-daytime': 85,
  'sun-evening': 92,
  'sun-night': 88,
};

// 町丁目別サービス空白度データ（世田谷区エリアモデル）
const DISTRICT_BLANK_DATA = [
  { district: '烏山・給田地域', elderlySingles: 4820, services: 18, ratio: '267世帯/所', level: 'high' },
  { district: '砧・成城地域', elderlySingles: 5120, services: 24, ratio: '213世帯/所', level: 'high' },
  { district: '北沢・代田地域', elderlySingles: 3950, services: 32, ratio: '123世帯/所', level: 'mid' },
  { district: '玉川・用賀地域', elderlySingles: 4400, services: 38, ratio: '115世帯/所', level: 'mid' },
  { district: '世田谷・経堂地域', elderlySingles: 6200, services: 58, ratio: '106世帯/所', level: 'low' },
];

export const GovDashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('last_30_days');

  // 空白度が特に高い（85以上）枠の数
  const criticalGapSlots = Object.values(HEATMAP_GAP_MATRIX).filter((v) => v >= 85).length;

  // ヒートマップの対象サービス種別
  const [serviceCategory, setServiceCategory] = useState<NeedsCategory | 'all'>('all');

  /**
   * 曜日 × 時間帯ごとの「対応できる事業所数」を、承認済みシードから実際に集計する。
   * （需要側は検索ログのシミュレーション値、供給側はこの実データ）
   */
  const supplyMatrix = useMemo(() => {
    const tagIds = new Set(
      NEEDS_TAGS.filter((t) => serviceCategory === 'all' || t.category === serviceCategory).map(
        (t) => t.id
      )
    );
    const targets = ALL_SERVICES.filter(
      (svc) => svc.status === 'approved' && svc.needsTagIds.some((id) => tagIds.has(id))
    );
    const matrix: Record<string, number> = {};
    for (const d of DAYS_OF_WEEK) {
      for (const p of TIME_PERIODS) {
        matrix[`${d.key}-${p.key}`] = targets.filter(
          (svc) => svc.availableDays.includes(d.key) && svc.availablePeriods.includes(p.key)
        ).length;
      }
    }
    return matrix;
  }, [serviceCategory]);

  const supplyValues = Object.values(supplyMatrix);
  // 供給が最も薄い枠（政策示唆の根拠として提示する）
  const weakestSlots = useMemo(() => {
    const min = Math.min(...Object.values(supplyMatrix));
    return Object.entries(supplyMatrix)
      .filter(([, v]) => v === min)
      .map(([key]) => {
        const [d, pd] = key.split('-');
        const day = DAYS_OF_WEEK.find((x) => x.key === d)?.shortLabel ?? d;
        const period = TIME_PERIODS.find((x) => x.key === pd)?.label ?? pd;
        return `${day}・${period}`;
      });
  }, [supplyMatrix]);
  const maxSupply = Math.max(1, ...supplyValues);
  const zeroSupplySlots = supplyValues.filter((v) => v === 0).length;

  // 供給が少ないほど濃いオレンジ（単一色相の濃淡）
  const getSupplyColor = (count: number) => {
    if (count === 0) return 'bg-orange-700 text-white font-bold';
    const ratio = count / maxSupply;
    if (ratio <= 0.15) return 'bg-orange-500 text-stone-900 font-bold';
    if (ratio <= 0.35) return 'bg-orange-200 text-orange-900 font-medium';
    if (ratio <= 0.6) return 'bg-orange-50 text-orange-800';
    return 'bg-stone-50 text-stone-500';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ダッシュボードヘッダー */}
      <div className="glass p-6 sm:p-8 rounded-xl border border-stone-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-orange-700 text-xs font-bold tracking-wide">
            <Building2 className="w-4 h-4" />
            <span>自治体向け政策支援ダッシュボード (to Government)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">
            サービス空白ヒートマップ ＆ 未充足需要分析
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
            市民がけあしるで検索した行動ログから、「既存の介護統計には表れない未充足需要」を集計。
            総合事業・生活支援体制整備事業の事業者公募や助成金設計の根拠データを提供します。
          </p>
        </div>

        <div className="flex items-center space-x-2 glass p-2 rounded-lg border border-stone-300">
          <Calendar className="w-4 h-4 text-stone-400 ml-1" />
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-transparent text-xs font-semibold text-stone-700 outline-none cursor-pointer pr-2"
          >
            <option value="last_30_days">過去30日間の検索ログ</option>
            <option value="last_90_days">過去90日間（四半期）</option>
            <option value="last_year">直近1年間（年間統計）</option>
          </select>
        </div>
      </div>

      {/* 政策主要KPIカード（4指標） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass p-5 rounded-lg border border-stone-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold">
            <span>総検索ログ数</span>
            <span className="p-1.5 rounded-lg bg-stone-50 text-stone-700">市内全域</span>
          </div>
          <div className="text-3xl font-black text-stone-900">
            3,480 <span className="text-sm font-normal text-stone-500">件</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center space-x-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>前月比 +18.4% 増加</span>
          </div>
        </div>

        <div className="glass p-5 rounded-lg border border-stone-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold">
            <span>未充足需要率（0件ヒット）</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700 font-bold">空白リスク</span>
          </div>
          <div className="text-3xl font-black text-rose-600">
            29.4 <span className="text-sm font-normal text-stone-500">%</span>
          </div>
          <div className="text-[11px] text-stone-500 leading-tight">
            検索約3件に1件が対応事業者不在
          </div>
        </div>

        <div className="glass p-5 rounded-lg border border-stone-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold">
            <span>供給が特に不足している枠</span>
            <span className="p-1.5 rounded-lg bg-orange-50 text-orange-700 font-bold">要対策</span>
          </div>
          <div className="text-3xl font-black text-orange-700 tabular-nums">
            {criticalGapSlots} <span className="text-sm font-normal text-stone-500">／ 28 枠</span>
          </div>
          <div className="text-[11px] text-stone-500 leading-tight">
            需要に対し事業者がほぼ不在の曜日・時間帯
          </div>
        </div>

        <div className="glass p-5 rounded-lg border border-stone-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold">
            <span>登録済み承認サービス数</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">市内・近隣</span>
          </div>
          <div className="text-3xl font-black text-stone-900">
            185 <span className="text-sm font-normal text-stone-500">件</span>
          </div>
          <div className="text-[11px] text-stone-500 leading-tight">
            うち保険外（自費・互助）: 96件 (51.8%)
          </div>
        </div>
      </div>

      {/* メイン分析セクション（ヒートマップ ＆ ランキング） */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 左側: 需要×供給空白ヒートマップ（7カラム） */}
        <div className="lg:col-span-7 glass p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <h3 className="font-bold text-base text-stone-900 flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-stone-600" />
                <span>時間帯 × 曜日 需要集中・空白ヒートマップ</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                サービス種別ごとに、曜日・時間帯別の「対応できる事業所数」を集計しています。色が濃いほど供給が薄い枠です。
              </p>
            </div>
          </div>

          {/* サービス種別の切り替え */}
          <div className="flex flex-wrap gap-1.5">
            {SERVICE_CATEGORIES.map((cat) => {
              const isActive = serviceCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setServiceCategory(cat.key)}
                  aria-pressed={isActive}
                  className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                    isActive
                      ? 'border-orange-600 bg-orange-50 text-orange-800 font-bold'
                      : 'border-stone-300 text-stone-600 hover:bg-stone-50 font-medium'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-500">
            <span>
              最多の枠で{' '}
              <strong className="text-stone-800 tabular-nums">{maxSupply}</strong> 事業所
            </span>
            <span>
              対応事業所ゼロ:{' '}
              <strong className={zeroSupplySlots > 0 ? 'text-orange-700' : 'text-stone-800'}>
                <span className="tabular-nums">{zeroSupplySlots}</span> / 28 枠
              </strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <div className="grid grid-cols-[80px_repeat(7,minmax(0,1fr))] gap-1.5 min-w-[520px] text-center text-xs font-bold text-stone-700">
              {/* ヘッダー */}
              <div />
              {DAYS_OF_WEEK.map((d) => (
                <div key={`h-${d.key}`} className="min-w-0 p-1.5 bg-stone-100 rounded-lg truncate">
                  {d.shortLabel}
                </div>
              ))}

              {/* 4時間帯 × 7曜日 */}
              {TIME_PERIODS.map((period) => (
                <React.Fragment key={period.key}>
                  <div className="min-w-0 p-2 text-xs font-bold bg-stone-50 rounded-lg text-stone-700 text-center flex flex-col justify-center">
                    <div>{period.label}</div>
                    <div className="text-[11px] text-stone-400 font-normal">{period.timeRange}</div>
                  </div>

                  {DAYS_OF_WEEK.map((day) => {
                    const key = `${day.key}-${period.key}`;
                    const count = supplyMatrix[key] ?? 0;
                    return (
                      <div
                        key={key}
                        className={`min-w-0 h-14 rounded-lg p-1 flex flex-col justify-center items-center text-center ${getSupplyColor(
                          count
                        )}`}
                        title={`${day.label} ${period.label}：対応できる事業所 ${count} 件`}
                      >
                        <span className="text-sm tabular-nums">{count}</span>
                        <span className="text-[11px] opacity-80 font-normal">
                          {count === 0 ? '事業所なし' : '事業所'}
                        </span>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-between text-xs text-stone-600">
            <span className="font-semibold text-stone-800">
              政策示唆:{' '}
              {zeroSupplySlots > 0 ? (
                <>
                  この種別では <strong className="text-orange-700">{zeroSupplySlots} 枠</strong>{' '}
                  で対応できる事業所が1件もありません（
                  {weakestSlots.slice(0, 4).join('、')}
                  {weakestSlots.length > 4 ? ' ほか' : ''}）。事業者公募や助成の対象として優先度が高い時間帯です。
                </>
              ) : (
                <>
                  最も供給が薄いのは {weakestSlots.slice(0, 4).join('、')}
                  {weakestSlots.length > 4 ? ' ほか' : ''} です。需要集中と重なる場合は補助の検討対象になります。
                </>
              )}
            </span>
          </div>
        </div>

        {/* 右側: 未充足需要ランキング（5カラム） */}
        <div className="lg:col-span-5 glass p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
          <div className="pb-3 border-b border-stone-100">
            <h3 className="font-bold text-base text-stone-900 flex items-center space-x-2">
              <AlertOctagon className="w-5 h-5 text-rose-600" />
              <span>未充足需要ランキング（検索0件タグ）</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              市民が「困っている」と入力したが、マッチするサービスが0件だった件数順
            </p>
          </div>

          <div className="space-y-3">
            {UNMET_NEEDS_RANKING.map((item) => (
              <div
                key={item.rank}
                className="p-3.5 rounded-lg border border-stone-200 bg-stone-50/50 hover:bg-stone-50 transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        item.rank === 1
                          ? 'bg-rose-600 text-white'
                          : item.rank === 2
                          ? 'bg-rose-600 text-white'
                          : item.rank === 3
                          ? 'bg-amber-500 text-stone-900'
                          : 'bg-stone-400 text-white'
                      }`}
                    >
                      {item.rank}
                    </span>
                    <span className="font-bold text-xs text-stone-900">{item.name}</span>
                  </div>
                  <span className="font-mono font-extrabold text-xs text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                    {item.count} 回
                  </span>
                </div>

                <p className="text-[11px] text-stone-600 leading-tight">
                  <span className="text-stone-400">要因:</span> {item.reason}
                </p>

                <div className="text-[11px] text-stone-700 bg-stone-50 px-2 py-0.5 rounded-md inline-block">
                  推奨施策: 総合事業 訪問型サービスB・シルバー人材委託
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* サービス空白地図・地区別集計 */}
      <div className="glass p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <h3 className="font-bold text-base text-stone-900 flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-stone-600" />
              <span>町丁目・日常生活圏域別 サービス空白密度</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              高齢単身世帯数に対する登録サービス提供事業者数の比率（世田谷区圏域モデル）
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-stone-50 text-stone-800 rounded-full">
            国勢調査小地域 × 承認事業者
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {DISTRICT_BLANK_DATA.map((d) => (
            <div
              key={d.district}
              className={`p-4 rounded-lg border-2 space-y-2 ${
                d.level === 'high'
                  ? 'border-rose-300 bg-rose-50/50'
                  : d.level === 'mid'
                  ? 'border-amber-300 bg-amber-50/50'
                  : 'border-emerald-300 bg-emerald-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-stone-900">{d.district}</span>
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                    d.level === 'high'
                      ? 'bg-rose-200 text-rose-900'
                      : d.level === 'mid'
                      ? 'bg-amber-200 text-amber-900'
                      : 'bg-emerald-200 text-emerald-900'
                  }`}
                >
                  {d.level === 'high' ? '空白度 高' : d.level === 'mid' ? '中程度' : '充足'}
                </span>
              </div>

              <div className="text-xs text-stone-600 space-y-1 pt-1">
                <div className="flex justify-between">
                  <span>単身高齢世帯:</span>
                  <span className="font-semibold">{d.elderlySingles.toLocaleString()} 世帯</span>
                </div>
                <div className="flex justify-between">
                  <span>対応事業者数:</span>
                  <span className="font-semibold">{d.services} 施設</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-black/5 font-bold text-stone-900">
                  <span>世帯密度:</span>
                  <span>{d.ratio}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* k-匿名性・統計倫理に関する配慮表示 */}
        <div className="p-3.5 rounded-lg bg-stone-50 border border-stone-200 flex items-center space-x-2 text-xs text-stone-500">
          <Shield className="w-4 h-4 text-stone-400 shrink-0" />
          <span>
            <strong>プライバシー・k-匿名性保護方針</strong>: 検索件数が5件未満の極小エリアおよび特定時間帯は、個人が特定されるリスクを防ぐためダッシュボード上でマスク処理（非表示）されます。
          </span>
        </div>
      </div>
    </div>
  );
};
