import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPrivilege?: string;
  requiredPrivileges?: string[];
  requireAny?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPrivilege,
  requiredPrivileges,
  requireAny = false,
}) => {
  const { isAuthenticated, isLoading, hasPrivilege, hasAnyPrivilege } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Check single privilege
  if (requiredPrivilege && !hasPrivilege(requiredPrivilege)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check multiple privileges
  if (requiredPrivileges && requiredPrivileges.length > 0) {
    const hasAccess = requireAny
      ? hasAnyPrivilege(requiredPrivileges)
      : requiredPrivileges.every(p => hasPrivilege(p));

    if (!hasAccess) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
