/**
 * 自治体ダッシュボード（to G）コンポーネント
 * 
 * 市民の検索ログや0件ヒット需要を集計し、
 * 1. 時間帯×曜日の需要集中 vs 供給空白ヒートマップ
 * 2. 未充足需要ランキング（検索0件タグ回数）
 * 3. 町丁目別サービス空白地図（高齢単身世帯 ÷ サービス数）
 * 4. 市内平均「時間の買い戻しコスト」
 * を可視化して総合事業や生活支援体制整備事業の政策立案を支援します。
 */

'use client';

import React, { useState } from 'react';
import { DAYS_OF_WEEK, TIME_PERIODS } from '@/constants/careConstants';
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

  const getHeatmapColor = (score: number) => {
    if (score >= 85) return 'bg-rose-600 text-white font-bold'; // 深刻
    if (score >= 70) return 'bg-rose-400 text-white font-bold';
    if (score >= 50) return 'bg-amber-300 text-amber-950 font-medium';
    if (score >= 30) return 'bg-teal-100 text-teal-900';
    return 'bg-emerald-50 text-emerald-800';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* ダッシュボードヘッダー */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            <span>自治体向け政策支援ダッシュボード (to Government)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">
            サービス空白ヒートマップ ＆ 未充足需要分析
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            市民がケアタイムラインで検索した行動ログから、「既存の介護統計には表れない未充足需要」を集計。
            総合事業・生活支援体制整備事業の事業者公募や助成金設計の根拠データを提供します。
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-white/10 p-2 rounded-2xl border border-white/20">
          <Calendar className="w-4 h-4 text-indigo-300 ml-1" />
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-transparent text-xs font-semibold text-white outline-none cursor-pointer pr-2"
          >
            <option value="last_30_days" className="bg-slate-900 text-white">過去30日間の検索ログ</option>
            <option value="last_90_days" className="bg-slate-900 text-white">過去90日間（四半期）</option>
            <option value="last_year" className="bg-slate-900 text-white">直近1年間（年間統計）</option>
          </select>
        </div>
      </div>

      {/* 政策主要KPIカード（4指標） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>総検索ログ数</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">市内全域</span>
          </div>
          <div className="text-3xl font-black text-slate-900">
            3,480 <span className="text-sm font-normal text-slate-500">件</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center space-x-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>前月比 +18.4% 増加</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>未充足需要率（0件ヒット）</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700 font-bold">空白リスク</span>
          </div>
          <div className="text-3xl font-black text-rose-600">
            29.4 <span className="text-sm font-normal text-slate-500">%</span>
          </div>
          <div className="text-[11px] text-slate-500 leading-tight">
            検索約3件に1件が対応事業者不在
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>市内平均「時間の買い戻しコスト」</span>
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700 font-bold">新指標</span>
          </div>
          <div className="text-3xl font-black text-teal-700">
            ¥620 <span className="text-sm font-normal text-slate-500">／時間</span>
          </div>
          <div className="text-[11px] text-slate-500 leading-tight">
            1時間の家族介護軽減にかかる平均実費
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>登録済み承認サービス数</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">市内・近隣</span>
          </div>
          <div className="text-3xl font-black text-slate-900">
            185 <span className="text-sm font-normal text-slate-500">件</span>
          </div>
          <div className="text-[11px] text-slate-500 leading-tight">
            うち保険外（自費・互助）: 96件 (51.8%)
          </div>
        </div>
      </div>

      {/* メイン分析セクション（ヒートマップ ＆ ランキング） */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 左側: 需要×供給空白ヒートマップ（7カラム） */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <span>時間帯 × 曜日 需要集中・空白ヒートマップ</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                色が濃い赤ほど「市民の検索需要が高いのに、対応できる事業者が極端に不足している」空白枠です。
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[480px]">
              <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-1.5 text-center text-xs font-bold text-slate-700 mb-2">
                <div></div>
                {DAYS_OF_WEEK.map((d) => (
                  <div key={d.key} className="p-1.5 bg-slate-100 rounded-lg">
                    {d.shortLabel}
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                {TIME_PERIODS.map((period) => (
                  <div key={period.key} className="grid grid-cols-[80px_repeat(7,1fr)] gap-1.5 items-center">
                    <div className="p-2 text-xs font-bold bg-slate-50 rounded-lg text-slate-700 text-center">
                      <div>{period.label}</div>
                      <div className="text-[9px] text-slate-400 font-normal">{period.timeRange}</div>
                    </div>

                    {DAYS_OF_WEEK.map((day) => {
                      const key = `${day.key}-${period.key}`;
                      const score = HEATMAP_GAP_MATRIX[key] || 0;
                      const colorClass = getHeatmapColor(score);

                      return (
                        <div
                          key={key}
                          className={`h-14 rounded-xl p-1 flex flex-col justify-center items-center text-center transition-all cursor-pointer hover:scale-105 ${colorClass}`}
                          title={`${day.label} ${period.label}: 空白度スコア ${score}`}
                        >
                          <span className="text-sm">{score}</span>
                          <span className="text-[9px] opacity-80">
                            {score >= 85 ? '供給ゼロ' : score >= 70 ? '不足' : '対応可'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold text-rose-800">
              💡 政策示唆: 「平日夕方（16:00〜19:00）」および「土日」に需要が集中していますが、既存介護事業所の稼働が激減しています。
            </span>
          </div>
        </div>

        {/* 右側: 未充足需要ランキング（5カラム） */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
              <AlertOctagon className="w-5 h-5 text-rose-600" />
              <span>未充足需要ランキング（検索0件タグ）</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              市民が「困っている」と入力したが、マッチするサービスが0件だった件数順
            </p>
          </div>

          <div className="space-y-3">
            {UNMET_NEEDS_RANKING.map((item) => (
              <div
                key={item.rank}
                className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        item.rank === 1
                          ? 'bg-rose-600 text-white'
                          : item.rank === 2
                          ? 'bg-rose-500 text-white'
                          : item.rank === 3
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-400 text-white'
                      }`}
                    >
                      {item.rank}
                    </span>
                    <span className="font-bold text-xs text-slate-900">{item.name}</span>
                  </div>
                  <span className="font-mono font-extrabold text-xs text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                    {item.count} 回
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-tight">
                  <span className="text-slate-400">要因:</span> {item.reason}
                </p>

                <div className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
                  推奨施策: 総合事業 訪問型サービスB・シルバー人材委託
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* サービス空白地図・地区別集計 */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-indigo-600" />
              <span>町丁目・日常生活圏域別 サービス空白密度</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              高齢単身世帯数に対する登録サービス提供事業者数の比率（世田谷区圏域モデル）
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-800 rounded-full">
            国勢調査小地域 × 承認事業者
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {DISTRICT_BLANK_DATA.map((d) => (
            <div
              key={d.district}
              className={`p-4 rounded-2xl border-2 space-y-2 ${
                d.level === 'high'
                  ? 'border-rose-300 bg-rose-50/50'
                  : d.level === 'mid'
                  ? 'border-amber-300 bg-amber-50/50'
                  : 'border-emerald-300 bg-emerald-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">{d.district}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
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

              <div className="text-xs text-slate-600 space-y-1 pt-1">
                <div className="flex justify-between">
                  <span>単身高齢世帯:</span>
                  <span className="font-semibold">{d.elderlySingles.toLocaleString()} 世帯</span>
                </div>
                <div className="flex justify-between">
                  <span>対応事業者数:</span>
                  <span className="font-semibold">{d.services} 施設</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-black/5 font-bold text-slate-900">
                  <span>世帯密度:</span>
                  <span>{d.ratio}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* k-匿名性・統計倫理に関する配慮表示 */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center space-x-2 text-xs text-slate-500">
          <Shield className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            <strong>プライバシー・k-匿名性保護方針</strong>: 検索件数が5件未満の極小エリアおよび特定時間帯は、個人が特定されるリスクを防ぐためダッシュボード上でマスク処理（非表示）されます。
          </span>
        </div>
      </div>
    </div>
  );
};
