'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError, badgeClass, fmtDate, fmtDay, post } from '../../../lib/api';
import { useCan, useRequire } from '../../../lib/auth';

export default function OrderDetail() {
  const ok = useRequire();
  const canSales = useCan('sales');
  const canProd = useCan('production');
  const { id } = useParams<{ id: string }>();
  const [o, setO] = useState<any>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api(`/orders/${id}`).then(setO).catch((e: ApiError) => setError(e.message));
  useEffect(() => { if (ok) load(); }, [ok, id]);

  async function act(path: string, ask?: string) {
    if (ask && !confirm(ask)) return;
    setBusy(true); setMsg(''); setError('');
    try { const r = await post(path); setMsg(r.message || '처리했어요.'); await load(); }
    catch (e) { setError((e as ApiError).message); }
    finally { setBusy(false); }
  }

  if (!ok) return <p className="muted">확인 중이에요…</p>;
  if (error && !o) return <><Link href="/orders">← 수주 목록</Link><div className="alert">{error}</div></>;
  if (!o) return <p className="muted">불러오는 중이에요…</p>;
  const done = ['출하완료', '취소'].includes(o.status);
  return (
    <>
      <Link href="/orders">← 수주 목록</Link>
      <div className="card" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h1>수주 #{o.id}</h1><span className={badgeClass(o.status)}>{o.status}</span>
        </div>
        <p className="muted">
          <span className={'badge ' + (o.source === 'SCM' ? 'doing' : 'gray')}>{o.source}</span> {o.partner.name}
          {o.scm_order_no && <> · SCM 주문번호 {o.scm_order_no}</>}
        </p>
        <p>납기 {fmtDay(o.due_date)} · 접수 {fmtDate(o.created_at)}{o.shipped_at && <> · 출하 {fmtDate(o.shipped_at)}</>}</p>
        <table className="table"><thead><tr><th>품목</th><th>수량</th></tr></thead><tbody>
          {o.lines.map((l: any) => <tr key={l.id}><td>{l.item.item_code} {l.item.name}</td><td>{l.qty}</td></tr>)}
        </tbody></table>
        {msg && <div className="ok">{msg}</div>}
        {error && <div className="alert">{error}</div>}
        {canSales && !done && (
          <p className="row">
            <button className="btn" disabled={busy} onClick={() => act(`/orders/${id}/ship`, '합격 재고에서 출하 처리할까요?')}>출하 처리{o.source === 'SCM' ? ' + SCM 실적 전송(모의)' : ''}</button>
            {o.status === '접수' && <button className="btn ghost" disabled={busy} onClick={() => act(`/orders/${id}/cancel`, '이 수주를 취소할까요?')}>수주 취소</button>}
          </p>
        )}
      </div>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}><strong>연결된 작업지시</strong>{canProd && !done && <Link href={`/work-orders?order_id=${o.id}`} className="btn ghost">작업지시 만들기</Link>}</div>
        {o.work_orders.length === 0 && <p className="muted">아직 없어요.</p>}
        {o.work_orders.map((w: any) => (
          <Link key={w.id} href={`/work-orders/${w.id}`} className="card" style={{ marginTop: 8 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}><strong>#{w.id} {w.stage} · {w.item.name}</strong><span className={badgeClass(w.status)}>{w.status}</span></div>
            <div className="muted">계획 {w.planned_qty}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
