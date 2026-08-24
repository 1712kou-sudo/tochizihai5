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
import { Service } from '@/types';
import { SCHEME_LABELS } from '@/utils/colors';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Bot,
  RefreshCw,
  Search,
  MapPin,
  Link as LinkIcon,
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
    seedUrl: 'https://www.city.shinjuku.lg.jp/fukushi/index05.html',
    tel: '03-5273-4512',
  },
  '渋谷区': {
    prefix: 'SBY',
    seedUrl: 'https://www.city.shibuya.tokyo.jp/kenko/koreisha-seikatsu/koreisha-shien/',
    tel: '03-3463-1211',
  },
};

// AI収集で取得したサービスの一時型（Service に変換する前）
interface CollectedItem {
  id: string;           // フロントで採番
  role: string | null;  // discovery_rules.json の role
  name: string;
  scheme: string;
  description: string;
  needs_tag_ids: string[];
  price: number | null;
  price_source_snippet: string;
  reduction_hours: number;
  application_route: string;
  confidence_score: number;
  reference_date: string | null;  // 資料の基準日
  stale_candidate: boolean;       // 18か月以上前なら true
  source_official: boolean;       // .lg.jp なら true
  source_url: string;
  state: 'pending' | 'added' | 'skipped';
}

interface AdminPipelineProps {
  services: Service[];
  onUpdateStatus: (id: string, newStatus: 'approved' | 'rejected' | 'draft') => void;
  onBulkUpdateStatus: (ids: string[], newStatus: 'approved' | 'rejected' | 'draft') => void;
  onAddDraftServices: (newServices: Service[]) => void;
}

export const AdminPipeline: React.FC<AdminPipelineProps> = ({ services, onUpdateStatus, onBulkUpdateStatus, onAddDraftServices }) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 収集設定
  const [useCustomUrl, setUseCustomUrl] = useState<boolean>(false);
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('世田谷区');
  const [customName, setCustomName] = useState<string>('');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [customPrefix, setCustomPrefix] = useState<string>('XXX');
  // 収集
  const [isCollecting, setIsCollecting] = useState<boolean>(false);
  const [collectProgress, setCollectProgress] = useState<string>('');
  const [collectError, setCollectError] = useState<string>('');
  const [collectedItems, setCollectedItems] = useState<CollectedItem[]>([]);

  const activeName = useCustomUrl ? (customName || 'カスタム') : selectedMunicipality;
  const activeCfg = MUNICIPALITIES[selectedMunicipality];
  const activeUrl = useCustomUrl ? customUrl : activeCfg?.seedUrl ?? '';
  const activePrefix = useCustomUrl ? customPrefix : activeCfg?.prefix ?? 'XXX';

  /** CollectedItem を Service 型に変換（デフォルト値で補完） */
  const toService = (item: CollectedItem, providerName: string): Service => ({
    id: item.id,
    providerId: `prov_ai_${activePrefix.toLowerCase()}`,
    providerName,
    name: item.name,
    scheme: item.scheme as Service['scheme'],
    description: item.description,
    needsTagIds: item.needs_tag_ids,
    targetCareLevels: ['support_1', 'support_2', 'care_1', 'care_2', 'care_3', 'care_4', 'care_5', 'unknown'],
    targetHouseholds: ['single', 'elderly_only', 'living_together', 'long_distance'],
    availableDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    availablePeriods: ['daytime'],
    priceModel: item.price === 0 ? 'free' : 'per_time',
    price: item.price ?? 0,
    reductionHours: item.reduction_hours,
    applicationRoute: item.application_route,
    sourceUrl: item.source_url,
    sourceType: '自治体公式サービスページ（AI収集）',
    priceSourceSnippet: item.price_source_snippet,
    verifiedAt: new Date().toISOString().split('T')[0],
    verifiedBy: `ai_collect_${activePrefix.toLowerCase()}`,
    status: 'draft',
    confidenceScore: item.confidence_score,
  });

  /** 承認ボタン：Serviceに変換してリストに追加 */
  const handleApproveItem = (item: CollectedItem) => {
    const svc = toService(item, activeName);
    onAddDraftServices([svc]);
    setCollectedItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, state: 'added' } : i))
    );
  };

  /** スキップ */
  const handleSkipItem = (itemId: string) => {
    setCollectedItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, state: 'skipped' } : i))
    );
  };

  /** pending の全件をまとめてDraft追加 */
  const handleApproveAll = () => {
    const pending = collectedItems.filter((i) => i.state === 'pending');
    if (pending.length === 0) return;
    onAddDraftServices(pending.map((i) => toService(i, activeName)));
    setCollectedItems((prev) => prev.map((i) => i.state === 'pending' ? { ...i, state: 'added' } : i));
  };

  /** データ収集：/api/collect を呼び出す */
  const handleCollect = async () => {
    if (!activeUrl) return;
    setIsCollecting(true);
    setCollectedItems([]);
    setCollectError('');

    // ① まずリンク一覧を取得してサービスページを探す
    setCollectProgress('ページのリンクを収集中...');
    let urls: string[] = [activeUrl];
    try {
      const linksResp = await fetch(`/api/links?url=${encodeURIComponent(activeUrl)}`);
      if (linksResp.ok) {
        const { links } = await linksResp.json() as { links: string[] };
        if (links.length > 0) urls = [activeUrl, ...links.slice(0, 9)];
      }
    } catch { /* fallback to seed url */ }

    // ② 各URLからサービスを収集
    const allItems: CollectedItem[] = [];
    for (let i = 0; i < urls.length; i++) {
      const u = urls[i];
      setCollectProgress(`収集中 ${i + 1}/${urls.length}：${u.split('/').slice(-2).join('/')}`);
      try {
        const resp = await fetch('/api/collect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: u, municipalityName: activeName }),
        });
        if (!resp.ok) {
          let errMsg = `HTTP ${resp.status}`;
          try {
            const err = await resp.json() as { error: string };
            if (err.error) errMsg = err.error;
          } catch { /* response was not JSON (e.g. Cloudflare HTML error page) */ }
          throw new Error(errMsg);
        }
        const data = await resp.json() as {
          services?: Omit<CollectedItem, 'id' | 'source_url' | 'state'>[];
          skipped?: boolean;
          reason?: string;
        };
        if (data.skipped) {
          // 否定語ページはスキップ（正常）
          continue;
        }
        (data.services ?? []).forEach((s, idx) => {
          allItems.push({
            ...s,
            id: `${activePrefix}-AI-${Date.now()}-${allItems.length + idx}`,
            source_url: u,
            state: 'pending',
          });
        });
      } catch (e) {
        setCollectError(`エラー (${u}): ${e}`);
      }
    }

    setCollectedItems(allItems);
    setCollectProgress(`収集完了 — ${allItems.length} 件抽出`);
    setIsCollecting(false);
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

          {/* 実行ボタン */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleCollect}
              disabled={isCollecting || (useCustomUrl && !customUrl)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm transition-colors disabled:opacity-40"
            >
              {isCollecting ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /><span className="max-w-48 truncate">{collectProgress || '収集中...'}</span></>
              ) : (
                <><Bot className="w-4 h-4" /><span>データ収集</span></>
              )}
            </button>
            {collectProgress && !isCollecting && (
              <span className="text-[12px] text-stone-500">{collectProgress}</span>
            )}
          </div>
        </div>

        {/* 収集結果（CollectedItems） */}
        {(collectedItems.length > 0 || collectError) && (
          <div className="border-t border-stone-100 px-6 py-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold text-stone-800">
                収集結果 — {collectedItems.length} 件（承認するとDraftとして登録されます）
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {collectError && (
                  <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg">{collectError}</p>
                )}
                {collectedItems.some((i) => i.state === 'pending') && (
                  <button
                    type="button"
                    onClick={handleApproveAll}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    すべてDraft追加（{collectedItems.filter((i) => i.state === 'pending').length}件）
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {collectedItems.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg border px-4 py-3 flex items-start gap-3 transition-opacity ${
                    item.state === 'added' ? 'border-emerald-300 bg-emerald-50 opacity-70' :
                    item.state === 'skipped' ? 'border-stone-200 bg-stone-50 opacity-40' :
                    'border-stone-200 bg-white'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-stone-900">{item.name}</span>
                      {item.role && (
                        <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-mono shrink-0">
                          {item.role}
                        </span>
                      )}
                      <span className="text-[11px] text-stone-400 font-mono shrink-0">
                        信頼度 {(item.confidence_score * 100).toFixed(0)}%
                      </span>
                      <span className="text-[11px] text-stone-400 shrink-0">
                        {item.price === null ? '料金不明（Tier1 — 人レビュー後に確認）' : item.price === 0 ? '無料' : `${item.price.toLocaleString()}円`}
                      </span>
                    </div>
                    {item.stale_candidate && (
                      <div className="flex items-center gap-1 mt-0.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        基準日が18か月以上前 — 最新情報を要確認（{item.reference_date ?? '日付不明'}）
                      </div>
                    )}
                    {!item.stale_candidate && item.reference_date && (
                      <span className="text-[11px] text-stone-400 mt-0.5 block">基準日: {item.reference_date}</span>
                    )}
                    <p className="text-[12px] text-stone-600 mt-0.5 line-clamp-2">{item.description}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-orange-600 hover:underline flex items-center gap-0.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {item.source_url.split('/').slice(-2).join('/')}
                      </a>
                      {!item.source_official && (
                        <span className="text-[10px] text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                          ⚠ lg.jp 外
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {item.state === 'pending' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApproveItem(item)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors"
                        >
                          Draft追加
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSkipItem(item.id)}
                          className="px-3 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 text-[11px] font-medium transition-colors"
                        >
                          スキップ
                        </button>
                      </>
                    ) : item.state === 'added' ? (
                      <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />追加済み
                      </span>
                    ) : (
                      <span className="text-[11px] text-stone-400">スキップ済み</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
