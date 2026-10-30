'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError, badgeClass, fmtDate, post } from '../../../lib/api';
import { useCan, useRequire } from '../../../lib/auth';

export default function WorkOrderDetail() {
  const ok = useRequire();
  const can = useCan('production');
  const { id } = useParams<{ id: string }>();
  const [w, setW] = useState<any>(null);
  const [stock, setStock] = useState<any[]>([]);
  const [rows, setRows] = useState<{ lot_id: string; used_qty: string }[]>([{ lot_id: '', used_qty: '' }]);
  const [qty, setQty] = useState({ good_qty: '', defect_qty: '0', loss_qty: '0' });
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api(`/work-orders/${id}`).then(setW).catch((e: ApiError) => setError(e.message));
  useEffect(() => {
    if (!ok) return;
    load();
    api('/stock').then((d) => setStock(d.filter((s: any) => s.qty > 0))).catch(() => {});
  }, [ok, id]);

  async function submit() {
    setBusy(true); setError(''); setMsg('');
    try {
      const r = await post(`/work-orders/${id}/results`, {
        good_qty: Number(qty.good_qty), defect_qty: Number(qty.defect_qty), loss_qty: Number(qty.loss_qty),
        inputs: rows.filter((x) => x.lot_id).map((x) => ({ lot_id: Number(x.lot_id), used_qty: Number(x.used_qty) })),
      });
      setMsg(r.message); setRows([{ lot_id: '', used_qty: '' }]); setQty({ good_qty: '', defect_qty: '0', loss_qty: '0' });
      await load(); api('/stock').then((d) => setStock(d.filter((s: any) => s.qty > 0))).catch(() => {});
    } catch (e) { setError((e as ApiError).message); }
    finally { setBusy(false); }
  }
  async function act(path: string, ask: string) {
    if (!confirm(ask)) return;
    setError(''); setMsg('');
    try { setMsg((await post(path)).message || '처리했어요.'); await load(); } catch (e) { setError((e as ApiError).message); }
  }

  if (!ok) return <p className="muted">확인 중이에요…</p>;
  if (error && !w) return <><Link href="/work-orders">← 작업지시</Link><div className="alert">{error}</div></>;
  if (!w) return <p className="muted">불러오는 중이에요…</p>;
  const open = ['대기', '진행'].includes(w.status);
  const setRow = (i: number, k: string, v: string) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <>
      <Link href="/work-orders">← 작업지시</Link>
      <div className="card" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}><h1>작업지시 #{w.id} · {w.stage}</h1><span className={badgeClass(w.status)}>{w.status}</span></div>
        <p>{w.item.item_code} {w.item.name} · 계획 {w.planned_qty}{w.order && <> · <Link href={`/orders/${w.order.id}`}>수주 #{w.order.id}</Link></>}</p>
        {msg && <div className="ok">{msg}</div>}
        {error && <div className="alert">{error}</div>}
        {can && open && (
          <p className="row">
            {w.status === '진행' && <button className="btn" onClick={() => act(`/work-orders/${id}/complete`, '작업지시를 완료할까요?')}>작업 완료</button>}
            {w.status === '대기' && <button className="btn ghost" onClick={() => act(`/work-orders/${id}/cancel`, '작업지시를 취소할까요?')}>작업지시 취소</button>}
          </p>
        )}
      </div>

      {can && open && (
        <div className="card">
          <strong>현장 실적 입력</strong>
          <p className="muted">사용한 자재 LOT를 꼭 입력해야 해요. 품질 합격 LOT만 쓸 수 있어요.</p>
          {rows.map((r, i) => (
            <div key={i} className="two" style={{ marginBottom: 6 }}>
              <select value={r.lot_id} onChange={(e) => setRow(i, 'lot_id', e.target.value)}>
                <option value="">투입 LOT 선택</option>
                {stock.map((s) => <option key={s.id} value={s.id}>{s.lot_no} · {s.item_name} · 재고 {s.qty} · {s.qc_status}</option>)}
              </select>
              <input placeholder="사용 수량" value={r.used_qty} onChange={(e) => setRow(i, 'used_qty', e.target.value)} />
            </div>
          ))}
          <button className="btn ghost" type="button" onClick={() => setRows([...rows, { lot_id: '', used_qty: '' }])}>+ 투입 LOT 추가</button>
          <div className="two">
            <div><label>양품 수량</label><input value={qty.good_qty} onChange={(e) => setQty({ ...qty, good_qty: e.target.value })} /></div>
            <div><label>불량 수량</label><input value={qty.defect_qty} onChange={(e) => setQty({ ...qty, defect_qty: e.target.value })} /></div>
          </div>
          <label>Loss 수량</label><input value={qty.loss_qty} onChange={(e) => setQty({ ...qty, loss_qty: e.target.value })} style={{ maxWidth: 200 }} />
          <p><button className="btn" disabled={busy} onClick={submit}>{busy ? '저장 중…' : '실적 저장'}</button></p>
        </div>
      )}

      <div className="card">
        <strong>실적 기록</strong>
        {w.results.length === 0 && <p className="muted">아직 실적이 없어요.</p>}
        {w.results.map((r: any) => (
          <div key={r.id} style={{ borderTop: '1px solid var(--line)', marginTop: 8, paddingTop: 8 }}>
            <div>출력 LOT <Link href={`/trace?lot=${r.output_lot.lot_no}`}><b>{r.output_lot.lot_no}</b></Link> <span className={badgeClass(r.output_lot.qc_status)}>{r.output_lot.qc_status}</span></div>
            <div className="muted">양품 {r.good_qty} · 불량 {r.defect_qty} · Loss {r.loss_qty} · {r.recorded_by} · {fmtDate(r.recorded_at)}</div>
            <div className="muted">투입: {r.inputs.map((i: any) => `${i.lot_no}(${i.item_name}) ${i.used_qty}`).join(', ')}</div>
          </div>
        ))}
      </div>
    </>
  );
}
