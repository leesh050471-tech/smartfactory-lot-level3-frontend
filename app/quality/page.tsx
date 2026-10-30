'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError, badgeClass, fmtDate, post } from '../../lib/api';
import { useCan, useRequire } from '../../lib/auth';

export default function Quality() {
  const ok = useRequire();
  const can = useCan('quality');
  const [q, setQ] = useState('');
  const [result, setResult] = useState('');
  const [items, setItems] = useState<any[] | null>(null);
  const [lots, setLots] = useState<any[]>([]);
  const [defects, setDefects] = useState<string[]>([]);
  const [pick, setPick] = useState<Record<number, { defect: string; note: string }>>({});
  const [newInsp, setNewInsp] = useState({ lot_id: '', kind: '시험' });
  const [vlot, setVlot] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = () => {
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (result) p.set('result', result);
    return api('/inspections?' + p).then(setItems).catch((e: ApiError) => { setError(e.message); setItems([]); });
  };
  useEffect(() => { if (!ok) return; const t = setTimeout(load, 250); return () => clearTimeout(t); }, [ok, q, result]);
  useEffect(() => {
    if (!ok) return;
    api('/stock').then(setLots).catch(() => {});
    api('/defect-types').then(setDefects).catch(() => {});
  }, [ok]);

  async function run(id: number | null, fn: () => Promise<any>) {
    setBusyId(id ?? -1); setError(''); setMsg('');
    try { const r = await fn(); if (r?.message) setMsg(r.message); await load(); api('/stock').then(setLots).catch(() => {}); }
    catch (e) { setError((e as ApiError).message); }
    finally { setBusyId(null); }
  }
  const getPick = (id: number) => pick[id] || { defect: '', note: '' };
  const setP = (id: number, k: string, v: string) => setPick({ ...pick, [id]: { ...getPick(id), [k]: v } });

  if (!ok) return <p className="muted">확인 중이에요…</p>;
  return (
    <>
      <h1>품질</h1>
      <p className="muted">시험 결과가 OK이고 COA를 승인하면 LOT가 "합격"이 돼요. 시험 NG는 "불합격", 비전 NG는 "보류"가 돼요.</p>
      {msg && <div className="ok">{msg}</div>}
      {error && <div className="alert">{error}</div>}
      {can && (
        <div className="two">
          <div className="card">
            <strong>시험·검사 요청</strong>
            <select value={newInsp.lot_id} onChange={(e) => setNewInsp({ ...newInsp, lot_id: e.target.value })} style={{ marginTop: 6 }}><option value="">LOT 선택</option>{lots.map((l) => <option key={l.id} value={l.id}>{l.lot_no} · {l.item_name}</option>)}</select>
            <select value={newInsp.kind} onChange={(e) => setNewInsp({ ...newInsp, kind: e.target.value })} style={{ marginTop: 6 }}><option>시험</option><option>비전</option></select>
            <p><button className="btn" onClick={() => run(null, () => post('/inspections', { lot_id: newInsp.lot_id ? Number(newInsp.lot_id) : undefined, kind: newInsp.kind }))}>요청 만들기</button></p>
          </div>
          <div className="card">
            <strong>비전검사기 결과 수신(모의)</strong>
            <select value={vlot} onChange={(e) => setVlot(e.target.value)} style={{ marginTop: 6 }}><option value="">제품 LOT 선택</option>{lots.filter((l) => l.kind === '제품').map((l) => <option key={l.id} value={l.id}>{l.lot_no} · {l.item_name}</option>)}</select>
            <p><button className="btn ghost" onClick={() => run(null, () => post('/mock/vision', { lot_id: vlot ? Number(vlot) : undefined }))}>비전 결과 받기</button></p>
          </div>
        </div>
      )}
      <div className="row" style={{ margin: '8px 0' }}>
        <input style={{ maxWidth: 220 }} placeholder="LOT·품목 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <select style={{ maxWidth: 130 }} value={result} onChange={(e) => setResult(e.target.value)}><option value="">전체 결과</option><option>대기</option><option>OK</option><option>NG</option></select>
      </div>
      {items === null && <p className="muted">불러오는 중이에요…</p>}
      {items?.map((n) => {
        const p = getPick(n.id);
        return (
          <div key={n.id} className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong><Link href={`/trace?lot=${n.lot.lot_no}`}>{n.lot.lot_no}</Link> · {n.lot.item.name}</strong>
              <span className="row"><span className="badge gray">{n.kind}</span><span className={badgeClass(n.result)}>{n.result}</span><span className={badgeClass(n.lot.qc_status)}>LOT {n.lot.qc_status}</span></span>
            </div>
            <div className="muted">{fmtDate(n.created_at)}{n.defect_type && <> · 불량유형 {n.defect_type}</>}{n.coa_approved && <> · COA 승인됨</>}{n.note && <> · {n.note}</>}</div>
            {can && n.result === '대기' && (
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn" disabled={busyId === n.id} onClick={() => run(n.id, () => post(`/inspections/${n.id}/result`, { result: 'OK' }))}>OK 입력</button>
                <select style={{ maxWidth: 150 }} value={p.defect} onChange={(e) => setP(n.id, 'defect', e.target.value)}><option value="">불량유형</option>{defects.map((d) => <option key={d}>{d}</option>)}</select>
                <input style={{ maxWidth: 180 }} placeholder="메모(선택)" value={p.note} onChange={(e) => setP(n.id, 'note', e.target.value)} />
                <button className="btn ghost" disabled={busyId === n.id} onClick={() => run(n.id, () => post(`/inspections/${n.id}/result`, { result: 'NG', defect_type: p.defect || undefined, note: p.note || undefined }))}>NG 입력</button>
              </div>
            )}
            {can && n.kind === '시험' && n.result === 'OK' && !n.coa_approved && (
              <p><button className="btn" disabled={busyId === n.id} onClick={() => run(n.id, () => post(`/inspections/${n.id}/coa`))}>COA 승인</button></p>
            )}
            {n.result === 'NG' && (
              <>
                {can && <p><button className="btn ghost" disabled={busyId === n.id} onClick={() => run(n.id, () => post(`/inspections/${n.id}/ai`))}>{busyId === n.id ? 'AI가 읽는 중…' : n.ai_summary ? 'AI 다시 분석' : 'AI 불량 분석'}</button></p>}
                {n.ai_summary && (
                  <div className="ai">
                    <strong>AI 요약·원인 후보</strong>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{n.ai_summary}</p>
                    <strong>시정조치 초안</strong>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{n.ai_action_draft}</p>
                    <span className="muted">AI 초안이에요. 담당자가 확인한 뒤 사용하세요.</span>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </>
  );
}
