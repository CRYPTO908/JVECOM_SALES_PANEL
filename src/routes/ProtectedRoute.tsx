import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { LoadingSpinner } from '@/components/common/EmptyState';

export function ProtectedRoute() {
  const { profile, loading, initialized } = useAuth();

  if (loading && !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner text="Connecting to SalesOS..." />
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
