import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { roleResolver, type RoleResolution } from '@/lib/roleResolver';

type UserRole = 'admin' | 'rider' | 'customer';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles: UserRole[];
    redirectTo?: string;
}

interface UserData {
    id: string;
    role: UserRole;
    isBlocked: boolean;
    riderStatus?: 'pending' | 'verified' | 'rejected' | 'none';
}

/**
 * ProtectedRoute Component
 * 
 * Production-ready route guard that:
 * - Validates authentication status
 * - Enforces role-based access control using roleResolver
 * - Prevents race conditions with proper loading states
 * - Ensures users can only access routes matching their role
 * 
 * @param children - Components to render if authorized
 * @param allowedRoles - Array of roles permitted to access this route
 * @param redirectTo - Optional custom redirect path (defaults to role-based routing)
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    allowedRoles,
    redirectTo,
}) => {
    const location = useLocation();
    const [authState, setAuthState] = useState<{
        loading: boolean;
        authenticated: boolean;
        authorized: boolean;
        user: UserData | null;
        error: string | null;
    }>({
        loading: true,
        authenticated: false,
        authorized: false,
        user: null,
        error: null,
    });

    useEffect(() => {
        let isMounted = true;

        const checkAuth = async () => {
            try {
                // Step 1: Check authentication
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    throw new Error(`Session error: ${sessionError.message}`);
                }

                if (!session || !session.user) {
                    if (isMounted) {
                        setAuthState({
                            loading: false,
                            authenticated: false,
                            authorized: false,
                            user: null,
                            error: null,
                        });
                    }
                    return;
                }

                // Step 2: Use roleResolver to get user role from database
                // IMPORTANT: For phone logins, Supabase generates fake emails. 
                // We MUST pass phone if available to ensure correct role lookup.
                const identifier = session.user.phone || session.user.email || undefined;

                const resolution: RoleResolution = await roleResolver(
                    session.user.id,
                    identifier
                );

                // Step 3: Check if user is blocked
                if (resolution.isBlocked) {
                    if (isMounted) {
                        setAuthState({
                            loading: false,
                            authenticated: true,
                            authorized: false,
                            user: { id: session.user.id, role: resolution.role as UserRole, isBlocked: true },
                            error: 'Your account has been blocked. Please contact support.',
                        });
                    }
                    return;
                }

                // Step 4: Check rider approval status
                if (resolution.role === 'rider' && resolution.riderStatus) {
                    if (resolution.riderStatus === 'rejected') {
                        if (isMounted) {
                            setAuthState({
                                loading: false,
                                authenticated: true,
                                authorized: false,
                                user: { id: session.user.id, role: 'rider' as UserRole, isBlocked: true, riderStatus: 'rejected' },
                                error: 'Your rider application has been rejected.',
                            });
                        }
                        return;
                    }
                    if (resolution.riderStatus === 'none' || resolution.needsRegistration) {
                        if (isMounted) {
                            setAuthState({
                                loading: false,
                                authenticated: true,
                                authorized: false,
                                user: { id: session.user.id, role: 'rider' as UserRole, isBlocked: false, riderStatus: 'none' },
                                error: 'Please complete your rider registration.',
                            });
                        }
                        return;
                    }
                }

                // Step 5: Check role authorization
                // Map business to customer (business role redirects to customer)
                const normalizedRole = resolution.role === 'business' ? 'customer' : resolution.role;
                const isAuthorized = allowedRoles.includes(normalizedRole as UserRole);

                if (isMounted) {
                    setAuthState({
                        loading: false,
                        authenticated: true,
                        authorized: isAuthorized,
                        user: {
                            id: session.user.id,
                            role: resolution.role as UserRole,
                            isBlocked: resolution.isBlocked,
                            riderStatus: resolution.riderStatus
                        },
                        error: isAuthorized ? null : 'Insufficient permissions',
                    });
                }
            } catch (error) {
                console.error('ProtectedRoute auth check failed:', error);
                if (isMounted) {
                    setAuthState({
                        loading: false,
                        authenticated: false,
                        authorized: false,
                        user: null,
                        error: error instanceof Error ? error.message : 'Authentication failed',
                    });
                }
            }
        };

        checkAuth();

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) {
                setAuthState({
                    loading: false,
                    authenticated: false,
                    authorized: false,
                    user: null,
                    error: null,
                });
            } else {
                // Re-check authentication when state changes
                checkAuth();
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [allowedRoles]);

    // Loading state - prevent flash of wrong content
    if (authState.loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Verifying access...</p>
                </div>
            </div>
        );
    }

    // Not authenticated - redirect to login
    if (!authState.authenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Authenticated but not authorized - redirect based on actual role
    if (!authState.authorized) {
        // If custom redirect specified, use it
        if (redirectTo) {
            return <Navigate to={redirectTo} replace />;
        }

        // Otherwise, redirect to role-appropriate dashboard
        const roleRedirects: Record<UserRole, string> = {
            admin: '/admin-dashboard',
            rider: '/rider-dashboard',
            customer: '/home',
        };

        const destination = authState.user?.role
            ? roleRedirects[authState.user.role]
            : '/login';

        console.warn(
            `Unauthorized access attempt: User with role "${authState.user?.role}" ` +
            `tried to access route requiring roles: [${allowedRoles.join(', ')}]`
        );

        return <Navigate to={destination} replace />;
    }

    // Authenticated and authorized - render protected content
    return <>{children}</>;
};

export default ProtectedRoute;
