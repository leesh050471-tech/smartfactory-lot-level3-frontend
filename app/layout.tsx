import './globals.css';
import type { ReactNode } from 'react';
import { AuthProvider } from '../lib/auth';
import Nav from './nav';

export const metadata = {
  title: '필코코스팜 디지털협업공장',
  description: 'LOT 추적과 SCM 협업을 보여 주는 가상 프로토타입',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          <Nav />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
