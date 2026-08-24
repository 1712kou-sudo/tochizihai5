/**
 * AIデータ収集 ＆ 承認管理パイプライン コンポーネント（管理画面）
 * 
 * 1. AI巡回による構造化データ収集のリアルタイム実行デモ（ログ表示）
 * 2. 収集レコードのステータス管理（approved / draft / rejected / stale）
 * 3. 人手による承認フロー（出典URL、原文抜粋 snippet、confidence score 確認）
 * 4. 未承認レコードの一般非公開バリデーション
 */

'use client';

import React, { useState, useRef } from 'react';
import { Service } from '@/types';
import { SCHEME_LABELS } from '@/utils/colors';
import {
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Bot,
  Terminal,
  RefreshCw,
  Search,
  Copy,
  MapPin,
  Link as LinkIcon,
  ChevronDown,
  Check,
} from 'lucide-react';

// 登録済み自治体マスター（municipalities.json と同期）
const MUNICIPALITIES: Record<string, { prefix: string; seedUrl: string; tel: string }> = {
  '世田谷区': {
    prefix: 'STG',
    seedUrl: 'https://www.city.setagaya.lg.jp/fukushikenkou/koureikaigo/category/12486.html',
    tel: '03-5432-2407',
  },
  '練馬区': {
    prefix: 'NRM',
    seedUrl: 'https://www.city.nerima.tokyo.jp/hokenfukushi/koreisha/',
    tel: '03-3993-1111',
  },
  '新宿区': {
    prefix: 'SJK',
    seedUrl: 'https://www.city.shinjuku.lg.jp/fukushi/koresha/index.html',
    tel: '03-5273-4512',
  },
  '渋谷区': {
    prefix: 'SBY',
    seedUrl: 'https://www.city.shibuya.tokyo.jp/fukushi/koresha/',
    tel: '03-3463-1211',
  },
};

/** 自治体別デモログを生成 */
function buildDemoLogs(municipalityName: string, url: string, prefix: string): string[] {
  return [
    `⚡ [CRAWLER] Python収集パイプラインを起動中...`,
    `📡 [FETCH] ${municipalityName} 高齢者向けサービスページに接続 (robots.txt 遵守)`,
    `🔍 [DISCOVERY] ${url}`,
    `🔗 [LINKS] サービス候補リンクを ${Math.floor(Math.random() * 8) + 8} 件検出`,
    `📄 [PAGE 1/8] ページテキスト取得中... (interval=1.2s)`,
    `🤖 [LLM] claude-sonnet-4-6 / Structured Output スキーマ適用中...`,
    `📊 [PARSE] 抽出成功: {"name": "${municipalityName}配食サービス", "price": 500, "confidence": 0.96}`,
    `📄 [PAGE 2/8] ページテキスト取得中...`,
    `🤖 [LLM] claude-sonnet-4-6 / Structured Output スキーマ適用中...`,
    `📊 [PARSE] 抽出成功: {"name": "${municipalityName}見守り訪問", "price": 0, "confidence": 0.94}`,
    `💾 [SAVE] status="draft" として新規 ${Math.floor(Math.random() * 3) + 2} 件を extracted_drafts.json に追記`,
    `✅ [COMPLETE] 収集完了。管理者の人手承認待ちリストに登録しました。`,
    ``,
    `  実行コマンド: python crawler/collect_services.py --municipality ${municipalityName}`,
    `  出力ファイル: crawler/extracted_drafts.json`,
  ];
}

interface AdminPipelineProps {
  services: Service[];
  onUpdateStatus: (id: string, newStatus: 'approved' | 'rejected' | 'draft') => void;
  onBulkUpdateStatus: (ids: string[], newStatus: 'approved' | 'rejected' | 'draft') => void;
}

export const AdminPipeline: React.FC<AdminPipelineProps> = ({ services, onUpdateStatus, onBulkUpdateStatus }) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isCrawling, setIsCrawling] = useState<boolean>(false);
  const [crawlLogs, setCrawlLogs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 収集設定
  const [useCustomUrl, setUseCustomUrl] = useState<boolean>(false);
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('世田谷区');
  const [customName, setCustomName] = useState<string>('');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [customPrefix, setCustomPrefix] = useState<string>('XXX');
  const [copied, setCopied] = useState<boolean>(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const activeName = useCustomUrl ? (customName || 'カスタム') : selectedMunicipality;
  const activeCfg = MUNICIPALITIES[selectedMunicipality];
  const activeUrl = useCustomUrl ? customUrl : activeCfg?.seedUrl ?? '';
  const activePrefix = useCustomUrl ? customPrefix : activeCfg?.prefix ?? 'XXX';

  const cliCommand = useCustomUrl
    ? `python crawler/collect_services.py --url "${activeUrl}" --name ${activeName} --prefix ${activePrefix}`
    : `python crawler/collect_services.py --municipality ${selectedMunicipality}`;

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(cliCommand).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // デモ実行（ログをステップごとに追加）
  const handleRunCrawlerDemo = () => {
    if (useCustomUrl && !customUrl) return;
    setIsCrawling(true);
    setCrawlLogs([]);
    const logs = buildDemoLogs(activeName, activeUrl, activePrefix);
    logs.forEach((line, i) => {
      setTimeout(() => {
        setCrawlLogs((prev) => [...prev, line]);
        if (i === logs.length - 1) setIsCrawling(false);
      }, i * 180);
    });
  };

  const filteredServices = services.filter((s) => {
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

  const filteredIds = filteredServices.map((s) => s.id);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const someFilteredSelected = filteredIds.some((id) => selectedIds.has(id));

  const handleToggleAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleToggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAction = (newStatus: 'approved' | 'rejected' | 'draft') => {
    onBulkUpdateStatus(Array.from(selectedIds), newStatus);
    setSelectedIds(new Set());
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* ── 収集パネル ── */}
      <div className="glass rounded-xl border border-stone-200 overflow-hidden">
        {/* ヘッダー */}
        <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-orange-700 text-xs font-bold tracking-wide mb-0.5">
              <Bot className="w-4 h-4" />
              <span>AI収集パイプライン</span>
            </div>
            <h2 className="text-xl font-extrabold text-stone-900">自治体サービス データ収集</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Playwright + Claude API でサービスページを自動巡回し、<strong>draft</strong> として登録します。
            </p>
          </div>
        </div>

        {/* 収集設定 */}
        <div className="px-6 py-5 space-y-4">
          {/* 登録済み / カスタム 切り替え */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setUseCustomUrl(false)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !useCustomUrl ? 'bg-orange-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 inline mr-1" />
              登録済み自治体
            </button>
            <button
              type="button"
              onClick={() => setUseCustomUrl(true)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                useCustomUrl ? 'bg-orange-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5 inline mr-1" />
              URLを直接指定
            </button>
          </div>

          {!useCustomUrl ? (
            /* 登録済み自治体セレクター */
            <div className="flex flex-wrap gap-2">
              {Object.keys(MUNICIPALITIES).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedMunicipality(name)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                    selectedMunicipality === name
                      ? 'bg-orange-50 border-orange-400 text-orange-800'
                      : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          ) : (
            /* カスタムURL入力 */
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-[11px] text-stone-500 font-bold mb-1">自治体名</label>
                <input
                  type="text"
                  placeholder="例: 杉並区"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-200 text-xs focus:outline-orange-500"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-[11px] text-stone-500 font-bold mb-1">IDプレフィックス</label>
                <input
                  type="text"
                  placeholder="例: SGN"
                  value={customPrefix}
                  onChange={(e) => setCustomPrefix(e.target.value.toUpperCase().slice(0, 5))}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-mono focus:outline-orange-500"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-[11px] text-stone-500 font-bold mb-1">収集開始URL</label>
                <input
                  type="url"
                  placeholder="https://www.city.〇〇.lg.jp/..."
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-200 text-xs focus:outline-orange-500"
                />
              </div>
            </div>
          )}

          {/* CLIコマンド表示 */}
          <div className="bg-stone-950 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
            <code className="text-emerald-400 text-xs font-mono flex-1 min-w-0 truncate">
              {cliCommand}
            </code>
            <button
              type="button"
              onClick={handleCopyCommand}
              title="コマンドをコピー"
              className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-bold transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'コピー済み' : 'コピー'}
            </button>
          </div>

          {/* 実行ボタン */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRunCrawlerDemo}
              disabled={isCrawling || (useCustomUrl && !customUrl)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm transition-colors disabled:opacity-40"
            >
              {isCrawling ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /><span>収集中...</span></>
              ) : (
                <><Play className="w-4 h-4 fill-white" /><span>デモ実行</span></>
              )}
            </button>
            <p className="text-[11px] text-stone-400">
              実際の収集はターミナルで上記コマンドを実行してください。
            </p>
          </div>
        </div>

        {/* 収集ログコンソール */}
        {crawlLogs.length > 0 && (
          <div className="border-t border-stone-100 bg-stone-950 px-5 py-4 font-mono text-xs text-emerald-400 space-y-0.5 max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between text-stone-400 pb-2 border-b border-stone-800 mb-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-stone-200">
                  collect_services.py — {activeName}
                </span>
              </div>
              {isCrawling && <RefreshCw className="w-3 h-3 animate-spin text-stone-500" />}
            </div>
            {crawlLogs.map((log, idx) => (
              <div key={idx} className="leading-relaxed whitespace-pre">
                {log}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}
      </div>

      {/* 統計バー */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass p-4 rounded-lg border border-stone-200 shadow-sm">
          <span className="text-xs text-stone-500 block">総サービス件数</span>
          <span className="text-2xl font-bold text-stone-900">{services.length} 件</span>
        </div>
        <div className="glass p-4 rounded-lg border border-stone-200 shadow-sm">
          <span className="text-xs text-emerald-600 font-bold block">公開中（Approved）</span>
          <span className="text-2xl font-bold text-emerald-700">
            {services.filter((s) => s.status === 'approved').length} 件
          </span>
        </div>
        <div className="glass p-4 rounded-lg border border-stone-200 shadow-sm">
          <span className="text-xs text-amber-600 font-bold block">人手承認待ち（Draft）</span>
          <span className="text-2xl font-bold text-amber-700">
            {services.filter((s) => s.status === 'draft').length} 件
          </span>
        </div>
        <div className="glass p-4 rounded-lg border border-stone-200 shadow-sm">
          <span className="text-xs text-rose-600 font-bold block">却下 / 非公開</span>
          <span className="text-2xl font-bold text-rose-700">
            {services.filter((s) => s.status === 'rejected' || s.status === 'stale').length} 件
          </span>
        </div>
      </div>

      {/* フィルター＆検索 */}
      <div className="glass p-4 rounded-lg border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterStatus === 'all' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'
            }`}
          >
            すべて ({services.length})
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

      {/* 一括操作バー（選択中のみ表示） */}
      {selectedIds.size > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-orange-800">
            {selectedIds.size} 件を選択中
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleBulkAction('approved')}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              まとめて承認・公開
            </button>
            <button
              type="button"
              onClick={() => handleBulkAction('rejected')}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              まとめて却下
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-medium transition-colors"
            >
              選択解除
            </button>
          </div>
        </div>
      )}

      {/* サービス一覧テーブル */}
      <div className="glass rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-stone-50 text-stone-700 border-b border-stone-200">
              <tr>
                <th className="p-3.5 w-8">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    ref={(el) => { if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected; }}
                    onChange={handleToggleAll}
                    className="w-3.5 h-3.5 rounded accent-orange-600 cursor-pointer"
                    title="表示中を全選択"
                  />
                </th>
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
                const isSelected = selectedIds.has(srv.id);
                return (
                  <tr
                    key={srv.id}
                    className={`transition-colors ${isSelected ? 'bg-orange-50' : 'hover:bg-stone-50/80'}`}
                  >
                    {/* チェックボックス */}
                    <td className="p-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleOne(srv.id)}
                        className="w-3.5 h-3.5 rounded accent-orange-600 cursor-pointer"
                      />
                    </td>

                    {/* ステータス */}
                    <td className="p-3.5 whitespace-nowrap">
                      {srv.status === 'approved' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          公開中
                        </span>
                      )}
                      {srv.status === 'draft' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          承認待ち
                        </span>
                      )}
                      {srv.status === 'rejected' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
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
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${schemeInfo.badgeColor}`}>
                        {schemeInfo.label}
                      </span>
                    </td>

                    {/* 料金 ＆ 原文 */}
                    <td className="p-3.5 max-w-xs">
                      <div className="font-bold text-stone-900">
                        {srv.price === 0 ? '無料' : `約 ${srv.price.toLocaleString()} 円`}
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono line-clamp-1 mt-0.5">
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
                        <span className="text-[11px] font-semibold text-stone-600">
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
                      <div className="text-[11px] text-stone-400">{srv.sourceType}</div>
                    </td>

                    {/* 操作ボタン */}
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(srv.id, 'approved')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-all"
                        >
                          承認・公開
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(srv.id, 'rejected')}
                          className="px-2 py-1 rounded-lg bg-stone-200 hover:bg-rose-100 hover:text-rose-700 text-stone-700 text-[11px] font-medium transition-all"
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
