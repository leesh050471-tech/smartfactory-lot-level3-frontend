'use client';
import { useEffect, useState } from 'react';
import { api, ApiError, post } from '../lib/api';
import { useCan, useRequire } from '../lib/auth';

type K = { key: string; label: string; unit: string; value: number | null; baseline: number | null; target: number; better: 'lower' | 'higher' };

export default function Dashboard() {
  const ok = useRequire();
  const isAdmin = useCan();
  const [d, setD] = useState<{ kpis: K[]; counts: Record<string, number>; note: string } | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api('/kpi').then(setD).catch((e: ApiError) => setError(e.message));
  useEffect(() => { if (ok) load(); }, [ok]);

  async function reseed() {
    if (!confirm('모든 데이터를 지우고 가상 데이터로 다시 채울까요?')) return;
    setBusy(true); setMsg(''); setError('');
    try { setMsg((await post('/admin/reseed')).message); await load(); }
    catch (e) { setError((e as ApiError).message); }
    finally { setBusy(false); }
  }

  if (!ok) return <p className="muted">확인 중이에요…</p>;
  const reached = (k: K) => k.value !== null && (k.better === 'lower' ? k.value <= k.target : k.value >= k.target);
  const counts = d?.counts;
  return (
    <>
      <h1>KPI 대시보드</h1>
      <p className="muted">가상 데이터로 자동 계산한 값이에요. 기준값과 목표는 사업계획서 수치예요.</p>
      {error && <div className="alert">{error}</div>}
      <div className="grid3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {d?.kpis.map((k) => (
          <div key={k.key} className="card kpi">
            <div className="muted">{k.label}</div>
            <div className={'num ' + (reached(k) ? 'good' : 'warn')}>{k.value === null ? '–' : k.value}<span style={{ fontSize: 16 }}>{k.value === null ? '' : k.unit}</span></div>
            <div className="sub">
              {k.baseline !== null ? `기준 ${k.baseline}${k.unit} → ` : '기준 추가 확인 필요 → '}목표 {k.better === 'higher' ? `${k.target}${k.unit} 이상` : `${k.target}${k.unit}`}
            </div>
          </div>
        ))}
      </div>
      <h2 style={{ fontSize: 18 }}>오늘 할 일</h2>
      <div className="grid3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <div className="card kpi"><div className="muted">진행 중 수주</div><div className="num">{counts?.open_orders ?? '–'}</div></div>
        <div className="card kpi"><div className="muted">진행 중 작업지시</div><div className="num">{counts?.open_work_orders ?? '–'}</div></div>
        <div className="card kpi"><div className="muted">검사 대기</div><div className="num">{counts?.pending_inspections ?? '–'}</div></div>
        <div className="card kpi"><div className="muted">보류·불합격 LOT</div><div className="num">{counts?.bad_lots ?? '–'}</div></div>
      </div>
      {isAdmin && (
        <div className="card">
          <strong>가상 데이터</strong>
          <p className="muted">데이터가 어지러워졌을 때 처음 상태로 되돌려요. 수주·생산·재고·품질 기록이 모두 초기화돼요.</p>
          {msg && <div className="ok">{msg}</div>}
          <button className="btn ghost" onClick={reseed} disabled={busy}>{busy ? '채우는 중…' : '가상 데이터 다시 채우기'}</button>
        </div>
      )}
    </>
  );
}
