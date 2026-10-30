'use client';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError, badgeClass, post } from '../../lib/api';
import { useCan, useRequire } from '../../lib/auth';

export default function WorkOrders() {
  const ok = useRequire();
  const can = useCan('production');
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [stage, setStage] = useState('제조');
  const [form, setForm] = useState({ order_id: '', item_id: '', planned_qty: '' });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const load = () => api('/work-orders').then(setItems).catch((e: ApiError) => { setError(e.message); setItems([]); });
  useEffect(() => {
    if (!ok) return;
    load();
    api('/items').then((d) => setProducts(d.filter((x: any) => x.type === '반제품' || x.type === '완제품'))).catch(() => {});
    api('/orders').then((d) => setOrders(d.filter((x: any) => !['취소', '출하완료'].includes(x.status)))).catch(() => {});
    const o = new URLSearchParams(window.location.search).get('order_id');
    if (o) setForm((f) => ({ ...f, order_id: o }));
  }, [ok]);

  async function create(e: FormEvent) {
    e.preventDefault(); setFormError(''); setFields({});
    try {
      await post('/work-orders', {
        order_id: form.order_id ? Number(form.order_id) : undefined, item_id: form.item_id ? Number(form.item_id) : undefined,
        stage, planned_qty: Number(form.planned_qty),
      });
      setForm({ order_id: '', item_id: '', planned_qty: '' }); await load();
    } catch (x) { setFormError((x as ApiError).message); setFields((x as ApiError).fields || {}); }
  }
  const set = (k: string) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const wantType = stage === '제조' ? '반제품' : '완제품';

  if (!ok) return <p className="muted">확인 중이에요…</p>;
  return (
    <>
      <h1>작업지시</h1>
      <p className="muted">제조는 반제품(벌크)을, 충포장은 완제품을 만들어요.</p>
      {error && <div className="alert">{error}</div>}
      {can && (
        <form className="card" onSubmit={create} noValidate>
          <strong>작업지시 만들기</strong>
          <div className="two">
            <div><label>공정</label><select value={stage} onChange={(e) => { setStage(e.target.value); setForm({ ...form, item_id: '' }); }}><option>제조</option><option>충포장</option></select></div>
            <div><label>생산 품목 ({wantType})</label>
              <select value={form.item_id} onChange={set('item_id')}><option value="">선택하세요</option>{products.filter((p) => p.type === wantType).map((p) => <option key={p.id} value={p.id}>{p.item_code} {p.name}</option>)}</select>
              {fields.item_id && <div className="err">{fields.item_id}</div>}</div>
          </div>
          <div className="two">
            <div><label>연결할 수주 (선택)</label><select value={form.order_id} onChange={set('order_id')}><option value="">연결 안 함</option>{orders.map((o) => <option key={o.id} value={o.id}>#{o.id} {o.partner.name}</option>)}</select></div>
            <div><label>계획 수량</label><input value={form.planned_qty} onChange={set('planned_qty')} placeholder="400" />{fields.planned_qty && <div className="err">{fields.planned_qty}</div>}</div>
          </div>
          {formError && !Object.keys(fields).length && <div className="alert">{formError}</div>}
          <p><button className="btn">만들기</button></p>
        </form>
      )}
      {items === null && <p className="muted">불러오는 중이에요…</p>}
      {items?.map((w) => (
        <Link key={w.id} href={`/work-orders/${w.id}`} className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>#{w.id} {w.stage} · {w.item.name}</strong><span className={badgeClass(w.status)}>{w.status}</span>
          </div>
          <div className="muted">계획 {w.planned_qty}{w.order && <> · 수주 #{w.order.id} {w.order.partner?.name}</>}</div>
        </Link>
      ))}
    </>
  );
}
