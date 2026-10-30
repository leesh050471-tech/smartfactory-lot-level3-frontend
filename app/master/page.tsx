'use client';
import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError, post } from '../../lib/api';
import { useCan, useRequire } from '../../lib/auth';

export default function Master() {
  const ok = useRequire();
  const isAdmin = useCan();
  const [items, setItems] = useState<any[] | null>(null);
  const [partners, setPartners] = useState<any[]>([]);
  const [locs, setLocs] = useState<any[]>([]);
  const [form, setForm] = useState({ item_code: '', name: '', type: '원료', supply_type: '자급' });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => api('/items').then(setItems).catch((e: ApiError) => { setError(e.message); setItems([]); });
  useEffect(() => {
    if (!ok) return;
    load();
    api('/partners').then(setPartners).catch(() => {});
    api('/locations').then(setLocs).catch(() => {});
  }, [ok]);

  async function add(e: FormEvent) {
    e.preventDefault(); setError(''); setFields({}); setMsg('');
    try { await post('/items', form); setMsg('품목을 등록했어요.'); setForm({ ...form, item_code: '', name: '' }); await load(); }
    catch (x) { setError((x as ApiError).message); setFields((x as ApiError).fields || {}); }
  }

  if (!ok) return <p className="muted">확인 중이에요…</p>;
  return (
    <>
      <h1>기준정보</h1>
      <p className="muted">품목코드는 하나만 있어야 해요. 같은 코드를 두 번 등록할 수 없어요.</p>
      {msg && <div className="ok">{msg}</div>}
      {isAdmin && (
        <form className="card" onSubmit={add} noValidate>
          <strong>품목 등록 (관리자)</strong>
          <div className="two">
            <div><label>품목코드</label><input value={form.item_code} onChange={(e) => setForm({ ...form, item_code: e.target.value.toUpperCase() })} placeholder="RM-006" />{fields.item_code && <div className="err">{fields.item_code}</div>}</div>
            <div><label>이름</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />{fields.name && <div className="err">{fields.name}</div>}</div>
          </div>
          <div className="two">
            <div><label>종류</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{['원료', '부자재', '반제품', '완제품'].map((t) => <option key={t}>{t}</option>)}</select></div>
            <div><label>사급/자급</label><select value={form.supply_type} onChange={(e) => setForm({ ...form, supply_type: e.target.value })}><option>자급</option><option>사급</option></select></div>
          </div>
          {error && !Object.keys(fields).length && <div className="alert">{error}</div>}
          {error && fields.item_code && <div className="alert">{error}</div>}
          <p><button className="btn">등록</button></p>
        </form>
      )}
      {!isAdmin && error && <div className="alert">{error}</div>}
      <h2 style={{ fontSize: 18 }}>품목</h2>
      {items === null && <p className="muted">불러오는 중이에요…</p>}
      <table className="table"><thead><tr><th>코드</th><th>이름</th><th>종류</th><th>사급/자급</th></tr></thead>
        <tbody>{items?.map((i) => <tr key={i.id}><td>{i.item_code}</td><td>{i.name}</td><td>{i.type}</td><td>{i.supply_type}</td></tr>)}</tbody></table>
      <div className="two">
        <div><h2 style={{ fontSize: 18 }}>거래처</h2>{partners.map((p) => <div key={p.id} className="card">{p.name} <span className={'badge ' + (p.kind === '코스메카SCM' ? 'doing' : 'gray')}>{p.kind}</span></div>)}</div>
        <div><h2 style={{ fontSize: 18 }}>로케이션</h2>{locs.map((l) => <div key={l.id} className="card"><b>{l.code}</b> {l.name}</div>)}</div>
      </div>
    </>
  );
}
