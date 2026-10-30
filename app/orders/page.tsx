'use client';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError, badgeClass, fmtDay, post } from '../../lib/api';
import { useCan, useRequire } from '../../lib/auth';

export default function Orders() {
  const ok = useRequire();
  const can = useCan('sales');
  const [q, setQ] = useState('');
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('');
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [partners, setPartners] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ partner_id: '', due_date: '', item_id: '', qty: '' });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const load = () => {
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (source) p.set('source', source);
    if (status) p.set('status', status);
    return api('/orders?' + p).then((d) => { setItems(d); setError(''); }).catch((e: ApiError) => { setError(e.message); setItems([]); });
  };
  useEffect(() => { if (!ok) return; const t = setTimeout(load, 250); return () => clearTimeout(t); }, [ok, q, source, status]);
  useEffect(() => {
    if (!ok) return;
    api('/partners').then((d) => setPartners(d.filter((x: any) => x.kind === '일반'))).catch(() => {});
    api('/items?type=완제품').then(setProducts).catch(() => {});
  }, [ok]);

  async function scm() {
    setMsg(''); setError('');
    try { setMsg((await post('/mock/scm/orders')).message); await load(); } catch (e) { setError((e as ApiError).message); }
  }
  async function dupScm() {
    setMsg(''); setError('');
    try { setMsg((await post('/mock/scm/orders', { scm_order_no: 'SCM-20261018-001' })).message); } catch (e) { setError((e as ApiError).message); }
  }
  async function create(e: FormEvent) {
    e.preventDefault(); setFormError(''); setFields({});
    try {
      await post('/orders', {
        partner_id: form.partner_id ? Number(form.partner_id) : undefined, due_date: form.due_date,
        lines: form.item_id ? [{ item_id: Number(form.item_id), qty: Number(form.qty) }] : [],
      });
      setShow(false); setForm({ partner_id: '', due_date: '', item_id: '', qty: '' }); await load();
    } catch (x) { setFormError((x as ApiError).message); setFields((x as ApiError).fields || {}); }
  }
  const set = (k: string) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  if (!ok) return <p className="muted">확인 중이에요…</p>;
  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>수주</h1>
        {can && (
          <div className="row">
            <button className="btn" onClick={scm}>SCM 주문 수신(모의)</button>
            <button className="btn ghost" onClick={dupScm} title="같은 SCM 주문번호가 다시 오면 거절되는지 보여 줘요">같은 주문 다시 수신</button>
            <button className="btn ghost" onClick={() => setShow(!show)}>일반 수주 등록</button>
          </div>
        )}
      </div>
      {msg && <div className="ok">{msg}</div>}
      {error && <div className="alert">{error}</div>}
      {show && (
        <form className="card" onSubmit={create} noValidate>
          <strong>일반 거래처 수주 등록</strong>
          <label>거래처</label>
          <select value={form.partner_id} onChange={set('partner_id')}><option value="">선택하세요</option>{partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          {fields.partner_id && <div className="err">{fields.partner_id}</div>}
          <label>납기일</label>
          <input value={form.due_date} onChange={set('due_date')} placeholder="2026-11-10" />
          {fields.due_date && <div className="err">{fields.due_date}</div>}
          <div className="two">
            <div><label>완제품</label><select value={form.item_id} onChange={set('item_id')}><option value="">선택하세요</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label>수량</label><input value={form.qty} onChange={set('qty')} placeholder="100" /></div>
          </div>
          {(fields.lines || fields['lines.0.qty']) && <div className="err">{fields.lines || fields['lines.0.qty']}</div>}
          {formError && !Object.keys(fields).length && <div className="alert">{formError}</div>}
          <p><button className="btn">등록</button></p>
        </form>
      )}
      <div className="row" style={{ margin: '8px 0' }}>
        <input style={{ maxWidth: 240 }} placeholder="주문번호·거래처·품목 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <select style={{ maxWidth: 140 }} value={source} onChange={(e) => setSource(e.target.value)}><option value="">전체 구분</option><option value="SCM">SCM</option><option value="일반">일반</option></select>
        <select style={{ maxWidth: 140 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">전체 상태</option>{['접수', '생산중', '출하준비', '출하완료', '취소'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {items === null && <p className="muted">불러오는 중이에요… (첫 접속은 1분 가까이 걸릴 수 있어요)</p>}
      {items && items.length === 0 && !error && <p className="muted">조건에 맞는 수주가 없어요.</p>}
      {items?.map((o) => (
        <Link key={o.id} href={`/orders/${o.id}`} className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>#{o.id} · {o.partner.name}</strong>
            <span className={badgeClass(o.status)}>{o.status}</span>
          </div>
          <div className="muted">
            <span className={'badge ' + (o.source === 'SCM' ? 'doing' : 'gray')}>{o.source}</span>{' '}
            {o.scm_order_no ? o.scm_order_no + ' · ' : ''}납기 {fmtDay(o.due_date)} · {o.lines.map((l: any) => `${l.item.name} ${l.qty}`).join(', ')}
          </div>
        </Link>
      ))}
    </>
  );
}
