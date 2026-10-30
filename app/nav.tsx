'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { ROLE_LABEL } from '../lib/api';

export default function Nav() {
  const { user, logout } = useAuth();
  const router = useRouter();
  return (
    <header className="top">
      <div className="in">
        <Link href="/"><strong>🏭 필코코스팜 디지털협업공장</strong></Link>
        <nav className="row">
          {user && (
            <>
              <Link href="/">대시보드</Link>
              <Link href="/orders">수주</Link>
              <Link href="/work-orders">작업지시</Link>
              <Link href="/stock">재고</Link>
              <Link href="/trace">LOT 추적</Link>
              <Link href="/quality">품질</Link>
              <Link href="/master">기준정보</Link>
              <span className="muted">{user.name} ({ROLE_LABEL[user.role]})</span>
              <button className="btn ghost" onClick={() => { logout(); router.push('/login'); }}>로그아웃</button>
            </>
          )}
          {!user && <Link href="/login" className="btn">로그인</Link>}
        </nav>
      </div>
    </header>
  );
}
