'use client';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError, badgeClass, post } from '../../lib/api';
import { useCan, useRequire } from '../../lib/auth';

export default function Stock() {
  const ok = useRequire();
  const can = useCan('sales', 'production');
  const [q, setQ] = useState('');
  const [supply, setSupply] = useState('');
  const [type, setType] = useState('');
  const [qc, setQc] = useState('');
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [locs, setLocs] = useState<any[]>([]);
  const [tab, setTab] = useState<'in' | 'move' | ''>('');
  const [rin, setRin] = useState({ item_id: '', lot_no: '', qty: '', location_id: '' });
  const [mv, setMv] = useState({ lot_id: '', location_id: '', move_type: '출고', qty: '', ref: '' });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const load = () => {
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (supply) p.set('supply_type', supply);
    if (type) p.set('type', type);
    if (qc) p.set('qc', qc);
    return api('/stock?' + p).then((d) => { setRows(d); setError(''); }).catch((e: ApiError) => { setError(e.message); setRows([]); });
  };
  useEffect(() => { if (!ok) return; const t = setTimeout(load, 250); return () => clearTimeout(t); }, [ok, q, supply, type, qc]);
  useEffect(() => {
    if (!ok) return;
    api('/items').then((d) => setItems(d.filter((x: any) => x.type === '원료' || x.type === '부자재'))).catch(() => {});
    api('/locations').then(setLocs).catch(() => {});
  }, [ok]);

  async function submit(e: FormEvent, path: string, body: any) {
    e.preventDefault(); setFormError(''); setFields({}); setMsg('');
    try { const r = await post(path, body); setMsg(r.message); await load(); }
    catch (x) { setFormError((x as ApiError).message); setFields((x as ApiError).fields || {}); }
  }

  if (!ok) return <p className="muted">확인 중이에요…</p>;
  const total = (rows || []).reduce((a, r) => a + r.qty, 0);
  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>재고 현황</h1>
        {can && <div className="row"><button className="btn" onClick={() => setTab(tab === 'in' ? '' : 'in')}>자재 입고</button><button className="btn ghost" onClick={() => setTab(tab === 'move' ? '' : 'move')}>출고·재고 조정</button></div>}
      </div>
      {msg && <div className="ok">{msg}</div>}
      {error && <div className="alert">{error}</div>}
      {tab === 'in' && (
        <form className="card" noValidate onSubmit={(e) => submit(e, '/lots/receive', { item_id: rin.item_id ? Number(rin.item_id) : undefined, lot_no: rin.lot_no.trim().toUpperCase(), qty: Number(rin.qty), location_id: rin.location_id ? Number(rin.location_id) : undefined })}>
          <strong>자재 입고 (원료·부자재)</strong>
          <div className="two">
            <div><label>품목</label><select value={rin.item_id} onChange={(e) => setRin({ ...rin, item_id: e.target.value })}><option value="">선택하세요</option>{items.map((i) => <option key={i.id} value={i.id}>{i.item_code} {i.name} ({i.supply_type})</option>)}</select>{fields.item_id && <div className="err">{fields.item_id}</div>}</div>
            <div><label>LOT 번호</label><input value={rin.lot_no} onChange={(e) => setRin({ ...rin, lot_no: e.target.value })} placeholder="RM001-B01" />{fields.lot_no && <div className="err">{fields.lot_no}</div>}</div>
          </div>
          <div className="two">
            <div><label>수량</label><input value={rin.qty} onChange={(e) => setRin({ ...rin, qty: e.target.value })} />{fields.qty && <div className="err">{fields.qty}</div>}</div>
            <div><label>로케이션</label><select value={rin.location_id} onChange={(e) => setRin({ ...rin, location_id: e.target.value })}><option value="">선택하세요</option>{locs.map((l) => <option key={l.id} value={l.id}>{l.code} {l.name}</option>)}</select>{fields.location_id && <div className="err">{fields.location_id}</div>}</div>
          </div>
          {formError && !Object.keys(fields).length && <div className="alert">{formError}</div>}
          <p><button className="btn">입고</button></p>
        </form>
      )}
      {tab === 'move' && (
        <form className="card" noValidate onSubmit={(e) => submit(e, '/moves', { lot_id: mv.lot_id ? Number(mv.lot_id) : undefined, location_id: mv.location_id ? Number(mv.location_id) : undefined, move_type: mv.move_type, qty: Number(mv.qty), ref: mv.ref })}>
          <strong>출고 / 기타 입출고(재고 조정)</strong>
          <p className="muted">조정은 줄일 때 -를 붙여요. 예: -5</p>
          <div className="two">
            <div><label>LOT</label><select value={mv.lot_id} onChange={(e) => setMv({ ...mv, lot_id: e.target.value })}><option value="">선택하세요</option>{(rows || []).map((r) => <option key={r.id} value={r.id}>{r.lot_no} · {r.item_name} · 재고 {r.qty}</option>)}</select>{fields.lot_id && <div className="err">{fields.lot_id}</div>}</div>
            <div><label>로케이션</label><select value={mv.location_id} onChange={(e) => setMv({ ...mv, location_id: e.target.value })}><option value="">선택하세요</option>{locs.map((l) => <option key={l.id} value={l.id}>{l.code} {l.name}</option>)}</select>{fields.location_id && <div className="err">{fields.location_id}</div>}</div>
          </div>
          <div className="two">
            <div><label>구분</label><select value={mv.move_type} onChange={(e) => setMv({ ...mv, move_type: e.target.value })}><option>출고</option><option>기타입출고</option></select></div>
            <div><label>수량</label><input value={mv.qty} onChange={(e) => setMv({ ...mv, qty: e.target.value })} />{fields.qty && <div className="err">{fields.qty}</div>}</div>
          </div>
          <label>사유 (선택)</label><input value={mv.ref} onChange={(e) => setMv({ ...mv, ref: e.target.value })} />
          {formError && !Object.keys(fields).length && <div className="alert">{formError}</div>}
          <p><button className="btn">처리</button></p>
        </form>
      )}
      <div className="row" style={{ margin: '8px 0' }}>
        <input style={{ maxWidth: 220 }} placeholder="LOT·품목 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <select style={{ maxWidth: 130 }} value={type} onChange={(e) => setType(e.target.value)}><option value="">전체 종류</option>{['원료', '부자재', '반제품', '완제품'].map((t) => <option key={t}>{t}</option>)}</select>
        <select style={{ maxWidth: 130 }} value={supply} onChange={(e) => setSupply(e.target.value)}><option value="">사급/자급</option><option>사급</option><option>자급</option></select>
        <select style={{ maxWidth: 130 }} value={qc} onChange={(e) => setQc(e.target.value)}><option value="">전체 품질</option>{['대기', '합격', '불합격', '보류'].map((t) => <option key={t}>{t}</option>)}</select>
      </div>
      <p className="muted">표시된 LOT {rows?.length ?? 0}개 · 재고 합계 {total} (재고는 입출고 이력의 합계로 계산해요)</p>
      {rows === null && <p className="muted">불러오는 중이에요…</p>}
      <table className="table">
        <thead><tr><th>LOT</th><th>품목</th><th>종류</th><th>사급/자급</th><th>품질</th><th>재고</th><th>위치</th></tr></thead>
        <tbody>
          {rows?.map((r) => (
            <tr key={r.id}>
              <td><Link href={`/trace?lot=${r.lot_no}`}>{r.lot_no}</Link></td><td>{r.item_code} {r.item_name}</td><td>{r.item_type}</td>
              <td>{r.supply_type}</td><td><span className={badgeClass(r.qc_status)}>{r.qc_status}</span></td><td>{r.qty}</td><td>{r.location_code}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
