import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useAdmin";
import { Loader2 } from "lucide-react";

type AllowedRole = "admin" | "rider" | "business" | "customer";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: AllowedRole[];
}

const roleRedirectMap: Record<string, string> = {
  super_admin: "/admin",
  admin: "/admin",
  rider: "/rider",
  business: "/business",
  customer: "/",
};

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, session, loading: authLoading } = useAuth();
  const { data: userRole, isLoading: roleLoading, isFetched } = useUserRole();
  const location = useLocation();

  const isLoading = authLoading || roleLoading;

  // Debug logging
  useEffect(() => {
    console.log("[ProtectedRoute] State:", {
      path: location.pathname,
      allowedRoles,
      authLoading,
      roleLoading,
      isFetched,
      userId: user?.id,
      hasSession: !!session,
      userRole,
    });
  }, [location.pathname, allowedRoles, authLoading, roleLoading, isFetched, user?.id, session, userRole]);

  // Show loading spinner while checking auth/role
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // CRITICAL: Check BOTH user AND session - no ghost sessions
  if (!user || !session) {
    console.log("[ProtectedRoute] No user or session, redirecting to /auth");
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Wait for role to be fetched before making access decisions
  if (!isFetched || userRole === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Check if user has an allowed role
  const resolution = userRole as any;
  const effectiveRole = resolution?.role || 'customer';
  const isSuperAdmin = effectiveRole === 'super_admin';

  if (resolution?.isBlocked) {
    console.log("[ProtectedRoute] User is blocked, redirecting to /auth");
    return <Navigate to="/auth" state={{ error: "Account disabled" }} replace />;
  }

  // PHASE 3 & 4: Rider status validation
  if (effectiveRole === 'rider' && !allowedRoles.includes('customer')) {
    if (resolution.needsRegistration || resolution.riderStatus !== 'verified') {
      console.log("[ProtectedRoute] Rider not verified accessing restricted area, redirecting to registration/pending");
      return <Navigate to="/rider/register" replace />;
    }
  }

  // Super Admin bypass: If allowed roles includes 'admin', super_admin also has access
  const hasAccess = allowedRoles.includes(effectiveRole as AllowedRole) ||
    (isSuperAdmin && (allowedRoles.includes('admin') || allowedRoles.length === 0));

  console.log("[ProtectedRoute] Access check:", {
    effectiveRole,
    allowedRoles,
    hasAccess,
    isSuperAdmin,
    riderStatus: resolution?.riderStatus
  });

  if (!hasAccess) {
    // Redirect to the user's correct dashboard based on their role
    const redirectPath = roleRedirectMap[effectiveRole as AllowedRole] || "/";
    console.log("[ProtectedRoute] Access denied, redirecting to:", redirectPath);
    return <Navigate to={redirectPath} replace />;
  }

  console.log("[ProtectedRoute] Access granted for role:", effectiveRole);
  return <>{children}</>;
};

export default ProtectedRoute;
