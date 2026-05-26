import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthProvider';

export default function ProtectedRoute() {
  const { user } = useAuth();

  // 유저 정보가 없으면 무조건 로그인 페이지로 리다이렉트 (데이터 날아감 방지)
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 유저 정보가 있으면 하위 컴포넌트(대시보드 등) 정상 렌더링
  return <Outlet />;
}