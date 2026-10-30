'use client';
import { useEffect, useState } from 'react';
import { api, ApiError, badgeClass } from '../../lib/api';
import { useRequire } from '../../lib/auth';

export default function Trace() {
  const ok = useRequire();
  const [lot, setLot] = useState('');
  const [dir, setDir] = useState<'forward' | 'backward'>('backward');
  const [r, setR] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(l = lot, d = dir) {
    if (!l.trim()) { setError('LOT 번호를 입력해 주세요.'); return; }
    setBusy(true); setError(''); setR(null);
    try { setR(await api(`/lots/${encodeURIComponent(l.trim())}/trace?direction=${d}`)); }
    catch (e) { setError((e as ApiError).message); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    if (!ok) return;
    const l = new URLSearchParams(window.location.search).get('lot');
    if (l) { setLot(l); run(l, dir); }
  }, [ok]);

  if (!ok) return <p className="muted">확인 중이에요…</p>;
  const depths = r ? Array.from(new Set(r.nodes.map((n: any) => n.depth))).sort() as number[] : [];
  return (
    <>
      <h1>LOT 추적</h1>
      <p className="muted"><b>역추적</b>은 이 LOT가 어떤 자재로 만들어졌는지, <b>정추적</b>은 이 LOT가 어떤 제품에 쓰였는지 보여 줘요. 재고 화면에서 LOT 번호를 누르면 바로 올 수 있어요.</p>
      <div className="card">
        <div className="row">
          <input style={{ maxWidth: 260 }} placeholder="예: FG-20261019-2-1" value={lot} onChange={(e) => setLot(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} />
          <button className={'chip' + (dir === 'backward' ? ' on' : '')} onClick={() => setDir('backward')}>역추적 (자재 찾기)</button>
          <button className={'chip' + (dir === 'forward' ? ' on' : '')} onClick={() => setDir('forward')}>정추적 (사용처 찾기)</button>
          <button className="btn" disabled={busy} onClick={() => run()}>{busy ? '찾는 중…' : '조회'}</button>
        </div>
        {error && <div className="alert">{error}</div>}
      </div>
      {r && (
        <div className="card">
          <div><b>{r.root.lot_no}</b> · {r.root.item_name} <span className={badgeClass(r.root.qc_status)}>{r.root.qc_status}</span></div>
          {r.nodes.length === 0 && <p className="muted">{r.direction === 'forward' ? '이 LOT를 쓴 제품이 아직 없어요.' : '이 LOT는 입고된 자재라서 더 거슬러 올라갈 LOT가 없어요.'}</p>}
          {depths.map((d) => (
            <div key={d}>
              <div className="muted" style={{ marginTop: 10 }}>{d}단계 {r.direction === 'forward' ? '(이 LOT를 사용한 LOT)' : '(투입된 LOT)'}</div>
              <ul className="tree">
                {r.nodes.filter((n: any) => n.depth === d).map((n: any, i: number) => (
                  <li key={i}>
                    <b>{n.lot_no}</b> · {n.item_name} · {n.kind} <span className={badgeClass(n.qc_status)}>{n.qc_status}</span>
                    <span className="muted"> · 사용량 {n.used_qty} · 연결: {n.from}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
