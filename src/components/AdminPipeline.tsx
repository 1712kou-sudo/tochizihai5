/**
 * AIデータ収集 ＆ 承認管理パイプライン コンポーネント（管理画面）
 * 
 * 1. AI巡回による構造化データ収集のリアルタイム実行デモ（ログ表示）
 * 2. 収集レコードのステータス管理（approved / draft / rejected / stale）
 * 3. 人手による承認フロー（出典URL、原文抜粋 snippet、confidence score 確認）
 * 4. 未承認レコードの一般非公開バリデーション
 */

'use client';

import React, { useState } from 'react';
import { ALL_SERVICES } from '@/data/servicesSeed';
import { Service } from '@/types';
import { SCHEME_LABELS } from '@/utils/colors';
import {
  Database,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Bot,
  Terminal,
  RefreshCw,
  Search,
} from 'lucide-react';

export const AdminPipeline: React.FC = () => {
  const [servicesList, setServicesList] = useState<Service[]>(ALL_SERVICES);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isCrawling, setIsCrawling] = useState<boolean>(false);
  const [crawlLogs, setCrawlLogs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 承認ステータスの切り替え
  const handleUpdateStatus = (id: string, newStatus: 'approved' | 'rejected' | 'draft') => {
    setServicesList((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status: newStatus,
              verifiedAt: new Date().toISOString().split('T')[0],
              verifiedBy: '管理者（人手確認）',
            }
          : s
      )
    );
  };

  // AI収集スクリプトのシミュレーション実行（デモ用）
  const handleRunCrawlerDemo = () => {
    setIsCrawling(true);
    setCrawlLogs([
      '⚡ [CRAWLER] Python収集パイプラインを起動中...',
      '📡 [FETCH] 練馬区オープンデータCSVおよび介護サービス情報公表システムに接続',
      '🔍 [DISCOVERY] 対象事業所 137120XXXX の自社公式Webサイトを巡回中 (robots.txt遵守, interval=1.2s)',
      '📄 [EXTRACT] 高齢者福祉のしおり PDF (P.24-28 生活支援施策) をテキスト抽出中...',
      '🤖 [LLM] Claude 3.7 Sonnet / Structured Output スキーマ適用中...',
      '📊 [PARSE] 抽出結果: {"service": "まごころ配食", "price": 500, "confidence": 0.98, "snippet": "1食あたり自己負担500円"}',
      '💾 [DB] status="draft" として新規2件をステージングDBへ投入完了！',
      '✅ [COMPLETE] 収集完了。管理者の人手承認待ちリストに登録しました。',
    ]);

    setTimeout(() => {
      setIsCrawling(false);
    }, 2500);
  };

  const filteredServices = servicesList.filter((s) => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (
      searchQuery &&
      !s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !s.providerName.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* 管理ヘッダー */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-stone-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-orange-700 text-xs font-bold tracking-wide">
            <Bot className="w-4 h-4" />
            <span>AI収集パイプライン ＆ 人手承認コンソール</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">
            自治体・民間自費サービス データ収集＆検証
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
            オープンデータCSV、事業所公式サイト、自治体PDFからAIが自動収集・構造化。
            推測による誤情報を防ぐため、<strong>管理者の人手承認（Approved）を得たレコードのみを一般公開</strong>します。
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunCrawlerDemo}
          disabled={isCrawling}
          className="flex items-center space-x-2 px-5 py-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm transition-colors disabled:opacity-50"
        >
          {isCrawling ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>自動収集中...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>収集スクリプトを実行</span>
            </>
          )}
        </button>
      </div>

      {/* 収集ログコンソール（デモ用） */}
      {crawlLogs.length > 0 && (
        <div className="bg-stone-950 p-5 rounded-lg border border-stone-800 font-mono text-xs text-emerald-400 space-y-1 shadow-inner overflow-hidden">
          <div className="flex items-center justify-between text-stone-400 pb-2 border-b border-stone-800 mb-2">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-stone-200">crawler/collect_services.py 実行ログ</span>
            </div>
            <span className="text-[10px] text-stone-500">Structured Output Engine</span>
          </div>
          {crawlLogs.map((log, idx) => (
            <div key={idx} className="leading-relaxed animate-fadeIn">
              {log}
            </div>
          ))}
        </div>
      )}

      {/* 統計バー */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
          <span className="text-xs text-stone-500 block">総サービス件数</span>
          <span className="text-2xl font-bold text-stone-900">{servicesList.length} 件</span>
        </div>
        <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
          <span className="text-xs text-emerald-600 font-bold block">公開中（Approved）</span>
          <span className="text-2xl font-bold text-emerald-700">
            {servicesList.filter((s) => s.status === 'approved').length} 件
          </span>
        </div>
        <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
          <span className="text-xs text-amber-600 font-bold block">人手承認待ち（Draft）</span>
          <span className="text-2xl font-bold text-amber-700">
            {servicesList.filter((s) => s.status === 'draft').length} 件
          </span>
        </div>
        <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
          <span className="text-xs text-rose-600 font-bold block">却下 / 非公開</span>
          <span className="text-2xl font-bold text-rose-700">
            {servicesList.filter((s) => s.status === 'rejected' || s.status === 'stale').length} 件
          </span>
        </div>
      </div>

      {/* フィルター＆検索 */}
      <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterStatus === 'all' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'
            }`}
          >
            すべて ({servicesList.length})
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterStatus === 'approved' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800'
            }`}
          >
            承認済み
          </button>
          <button
            onClick={() => setFilterStatus('draft')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterStatus === 'draft' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800'
            }`}
          >
            承認待ち (Draft)
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="サービス名・事業者名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-1.5 rounded-xl border border-stone-200 text-xs w-64 focus:outline-orange-600"
          />
        </div>
      </div>

      {/* サービス一覧テーブル */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-stone-50 text-stone-700 border-b border-stone-200">
              <tr>
                <th className="p-3.5 font-bold">ステータス</th>
                <th className="p-3.5 font-bold">サービス名 / 提供事業者</th>
                <th className="p-3.5 font-bold">区分</th>
                <th className="p-3.5 font-bold">料金 / 原文抜粋</th>
                <th className="p-3.5 font-bold">削減時間</th>
                <th className="p-3.5 font-bold">出典 / 信頼度</th>
                <th className="p-3.5 font-bold text-center">人手承認操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredServices.slice(0, 30).map((srv) => {
                const schemeInfo = SCHEME_LABELS[srv.scheme];
                return (
                  <tr key={srv.id} className="hover:bg-stone-50/80 transition-colors">
                    {/* ステータス */}
                    <td className="p-3.5 whitespace-nowrap">
                      {srv.status === 'approved' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          公開中
                        </span>
                      )}
                      {srv.status === 'draft' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          承認待ち
                        </span>
                      )}
                      {srv.status === 'rejected' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          <XCircle className="w-3 h-3 mr-1" />
                          却下
                        </span>
                      )}
                    </td>

                    {/* サービス名 */}
                    <td className="p-3.5">
                      <div className="font-bold text-stone-900">{srv.name}</div>
                      <div className="text-[11px] text-stone-500">{srv.providerName}</div>
                    </td>

                    {/* スキーム */}
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${schemeInfo.badgeColor}`}>
                        {schemeInfo.label}
                      </span>
                    </td>

                    {/* 料金 ＆ 原文 */}
                    <td className="p-3.5 max-w-xs">
                      <div className="font-bold text-stone-900">
                        {srv.price === 0 ? '無料' : `約 ${srv.price.toLocaleString()} 円`}
                      </div>
                      <div className="text-[10px] text-stone-500 font-mono line-clamp-1 mt-0.5">
                        「{srv.priceSourceSnippet}」
                      </div>
                    </td>

                    {/* 削減時間 */}
                    <td className="p-3.5 whitespace-nowrap font-bold text-emerald-700">
                      {srv.reductionHours} 時間/回
                    </td>

                    {/* 出典 ＆ 信頼度 */}
                    <td className="p-3.5">
                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] font-semibold text-stone-600">
                          {(srv.confidenceScore * 100).toFixed(0)}%
                        </span>
                        {srv.sourceUrl && (
                          <a
                            href={srv.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-600 hover:text-orange-800"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <div className="text-[9px] text-stone-400">{srv.sourceType}</div>
                    </td>

                    {/* 操作ボタン */}
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(srv.id, 'approved')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-xs transition-all"
                        >
                          承認・公開
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(srv.id, 'rejected')}
                          className="px-2 py-1 rounded-lg bg-stone-200 hover:bg-rose-100 hover:text-rose-700 text-stone-700 text-[10px] font-medium transition-all"
                        >
                          却下
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
