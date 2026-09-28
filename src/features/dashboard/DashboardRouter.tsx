import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types';
import { AdminDashboard } from './AdminDashboard';
import { ManagerDashboard } from './ManagerDashboard';
import { SalesRepDashboard } from './SalesRepDashboard';

export function DashboardRouter() {
  const { profile, isManager, isSalesRep } = useAuth();

  if (isSalesRep) {
    return <SalesRepDashboard />;
  }

  if (isManager) {
    return <ManagerDashboard />;
  }

  // Default to Admin Dashboard for Org Admin and Super Admin
  return <AdminDashboard />;
}
