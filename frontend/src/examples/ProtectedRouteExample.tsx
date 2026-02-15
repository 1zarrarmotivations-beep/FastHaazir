import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';

/**
 * EXAMPLE: How to use ProtectedRoute in your application
 * 
 * This demonstrates production-ready route protection with:
 * - Strict role separation
 * - No possibility of role misrouting
 * - Proper authentication checks
 */

// Example page components (replace with your actual components)
const LoginPage = () => <div>Login Page</div>;
const AdminDashboard = () => <div>Admin Dashboard</div>;
const RiderDashboard = () => <div>Rider Dashboard</div>;
const CustomerHome = () => <div>Customer Home</div>;
const AdminUsers = () => <div>Admin Users Management</div>;
const RiderOrders = () => <div>Rider Orders</div>;
const CustomerOrders = () => <div>Customer Orders</div>;

const AppRoutes: React.FC = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />

                {/* Admin-only routes */}
                <Route
                    path="/admin-dashboard"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/users"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <AdminUsers />
                        </ProtectedRoute>
                    }
                />

                {/* Rider-only routes */}
                <Route
                    path="/rider-dashboard"
                    element={
                        <ProtectedRoute allowedRoles={['rider']}>
                            <RiderDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/rider/orders"
                    element={
                        <ProtectedRoute allowedRoles={['rider']}>
                            <RiderOrders />
                        </ProtectedRoute>
                    }
                />

                {/* Customer-only routes */}
                <Route
                    path="/home"
                    element={
                        <ProtectedRoute allowedRoles={['customer']}>
                            <CustomerHome />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/orders"
                    element={
                        <ProtectedRoute allowedRoles={['customer']}>
                            <CustomerOrders />
                        </ProtectedRoute>
                    }
                />

                {/* Mixed access - Multiple roles allowed (if needed) */}
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'rider', 'customer']}>
                            <div>Profile Page - All authenticated users</div>
                        </ProtectedRoute>
                    }
                />

                {/* Root redirect based on authentication */}
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Catch-all 404 */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
};

export default AppRoutes;

/**
 * INTEGRATION NOTES:
 * 
 * 1. Replace your App.tsx routes with this pattern
 * 2. Every protected route MUST be wrapped in <ProtectedRoute>
 * 3. Specify exact allowedRoles for each route
 * 4. The component automatically redirects unauthorized users to their correct dashboard
 * 
 * SECURITY FEATURES:
 * - Database role verification on every route
 * - Real-time auth state subscription
 * - Account status validation (active/suspended)
 * - Loading states prevent content flash
 * - Impossible to access routes for wrong role
 * - Comprehensive error logging
 * 
 * WHY THIS IS PRODUCTION-READY:
 * ✓ No race conditions (isMounted check)
 * ✓ No role misrouting (strict DB validation)
 * ✓ Proper TypeScript typing
 * ✓ Memory leak prevention (cleanup on unmount)
 * ✓ Auth state subscription (real-time updates)
 * ✓ Graceful error handling
 * ✓ Security logging for audit trails
 */
