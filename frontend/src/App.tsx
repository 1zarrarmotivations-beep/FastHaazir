import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import ChatNotificationProvider from "@/components/chat/ChatNotificationProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import RealtimeProvider from "@/components/RealtimeProvider";
import PushNotificationProvider from "@/components/push/PushNotificationProvider";
import { AndroidNotificationSetup } from "@/components/push/AndroidNotificationSetup";
import { initializeMobileApp } from "@/lib/mobile";
import Index from "./pages/Index";

// Lazy load non-critical pages
const Auth = lazy(() => import("./pages/Auth"));
const AssignRider = lazy(() => import("./pages/AssignRider"));
const RestaurantDetail = lazy(() => import("./pages/RestaurantDetail"));
const Restaurants = lazy(() => import("./pages/Restaurants"));
const Grocery = lazy(() => import("./pages/Grocery"));
const Cart = lazy(() => import("./pages/Cart"));
const Orders = lazy(() => import("./pages/Orders"));
const History = lazy(() => import("./pages/History"));
const Profile = lazy(() => import("./pages/Profile"));
const RiderDashboard = lazy(() => import("./pages/RiderDashboard"));
const Admin = lazy(() => import("./pages/Admin"));
// Removed: BusinessDashboard (business role removed - admin controls all)
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient();

const App = () => {
  // Initialize mobile app features on mount
  useEffect(() => {
    initializeMobileApp();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <CartProvider>
      <TooltipProvider>
        <ChatNotificationProvider>
          <RealtimeProvider>
            <Toaster />
            <Sonner />
            {/* Global singleton reCAPTCHA container (invisible) */}
            <div
              id="recaptcha-container"
              aria-hidden="true"
              className="fixed left-[-10000px] top-0 h-0 w-0 overflow-hidden"
            />
            <BrowserRouter>
              <PushNotificationProvider>
                {/* Android 13+ Notification Permission Dialog */}
                <AndroidNotificationSetup />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/complete-profile" element={<CompleteProfile />} />
                    <Route path="/assign-rider" element={<AssignRider />} />
                    <Route path="/restaurants" element={<Restaurants />} />
                    <Route path="/grocery" element={<Grocery />} />
                    <Route path="/restaurant/:id" element={<RestaurantDetail />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/profile" element={<Profile />} />

                    {/* Protected Dashboards */}
                    <Route
                      path="/rider"
                      element={
                        <ProtectedRoute allowedRoles={["rider"]}>
                          <RiderDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/rider-dashboard"
                      element={
                        <ProtectedRoute allowedRoles={["rider"]}>
                          <RiderDashboard />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                          <Admin />
                        </ProtectedRoute>
                      }
                    />

                    {/* Removed: Business routes (business role removed)
                        Admin now controls all businesses from /admin panel */}

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </PushNotificationProvider>
            </BrowserRouter>
          </RealtimeProvider>
        </ChatNotificationProvider>
      </TooltipProvider>
    </CartProvider>
  </QueryClientProvider>
  );
};

export default App;
