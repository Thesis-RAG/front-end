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
    <div className="flex h-screen w-full overflow-hidden bg-slate-100/70 dark:bg-background">
      <AppSidebar />
      <main className="min-w-0 flex-1 overflow-hidden bg-background/80">
        <Outlet />
      </main>
    </div>
  );
}
