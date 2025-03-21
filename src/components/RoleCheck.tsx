import { ReactNode } from 'react';
import { useAuth } from '../store/auth';

interface RoleCheckProps {
  children: ReactNode;
  requiredRole: string;
}

export function RoleCheck({ children, requiredRole }: RoleCheckProps) {
  const { user } = useAuth();
  
  // Check if user has the required role
  const hasRequiredRole = user?.role === requiredRole;

  if (!hasRequiredRole) {
    return (
      <div className="p-4 bg-red-50 rounded-md">
        <p className="text-red-600">Access denied. {requiredRole} privileges required.</p>
      </div>
    );
  }

  return <>{children}</>;
}