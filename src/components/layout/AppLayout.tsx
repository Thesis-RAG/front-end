/** AppLayout: root authenticated shell that guards routes and composes the sidebar with the page outlet. */
import { Outlet, Navigate } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/contexts/AuthContext';

// Redirect unauthenticated users to /login; otherwise render sidebar + routed page content.
export function AppLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-muted/30">
      <AppSidebar />
      <main className="enterprise-page min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
