export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002';

export type User = { id: number; name: string; email: string; role: 'admin' | 'sales' | 'production' | 'quality' };
export const ROLE_LABEL: Record<string, string> = { admin: '관리자', sales: '영업·물류', production: '생산', quality: '품질' };

export class ApiError extends Error {
  fields: Record<string, string>;
  status: number;
  constructor(message: string, fields: Record<string, string> = {}, status = 0) {
    super(message);
    this.fields = fields;
    this.status = status;
  }
}

export function getToken() {
  try { return localStorage.getItem('token'); } catch { return null; }
}

export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(API + path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers || {}) },
    });
  } catch {
    throw new ApiError('서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요. (무료 서버는 첫 접속이 1분 가까이 걸릴 수 있어요)');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      (body && typeof body.message === 'string' && body.message) || '문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.',
      (body && body.fields) || {},
      res.status,
    );
  }
  return body as T;
}

export const post = <T = any>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });

export const fmtDate = (iso?: string | null) => {
  if (!iso) return '-';
  const k = new Date(new Date(iso).getTime() + 9 * 3600e3);
  return k.toISOString().slice(0, 10) + ' ' + k.toISOString().slice(11, 16);
};
export const fmtDay = (iso?: string | null) => (iso ? String(iso).slice(0, 10) : '-');

const BADGE: Record<string, string> = {
  접수: 'new', 대기: 'new', 생산중: 'doing', 진행: 'doing', 출하준비: 'doing', 보류: 'doing', 완료: 'done', 출하완료: 'done', 합격: 'done', OK: 'done',
  불합격: 'bad', NG: 'bad', 취소: 'gray',
};
export const badgeClass = (s: string) => 'badge ' + (BADGE[s] || 'gray');
