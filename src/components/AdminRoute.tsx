import { Navigate } from 'react-router-dom';
import { useIsAdmin } from '@/hooks/useIsAdmin';

interface AdminRouteProps {
  children: JSX.Element;
}

/**
 * AdminRoute — wraps routes that require admin privileges.
 * - Loading: spinner
 * - Not signed in OR not admin: redirect to /activities
 *   (auth gating is also applied via the existing ProtectedRoute on the same path)
 */
const AdminRoute = ({ children }: AdminRouteProps) => {
  const { isAdmin, loading } = useIsAdmin();

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/activities" replace />;

  return children;
};

export default AdminRoute;
