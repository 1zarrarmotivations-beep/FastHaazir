import { lazy, Suspense, useEffect, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Capacitor } from "@capacitor/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import ChatNotificationProvider from "@/components/chat/ChatNotificationProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import RealtimeProvider from "@/components/RealtimeProvider";
import PushNotificationProvider from "@/components/push/PushNotificationProvider";
import { AndroidNotificationSetup } from "@/components/push/AndroidNotificationSetup";
import { initializeMobileApp } from "@/lib/mobile";
import { initializeAnalytics, trackPageView } from "@/lib/analytics";
import { useLocation } from "react-router-dom";
import Index from "./pages/Index";

// Page view tracker component
const RouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    trackPageView({
      pagePath: location.pathname,
      pageTitle: document.title,
    });
  }, [location]);

  return null;
};

// Lazy load non-critical pages
const Auth = lazy(() => import("./pages/Auth"));
const AssignRider = lazy(() => import("./pages/AssignRider"));
const RestaurantDetail = lazy(() => import("./pages/RestaurantDetail"));
const Restaurants = lazy(() => import("./pages/Restaurants"));
const Grocery = lazy(() => import("./pages/Grocery"));
const Bakery = lazy(() => import("./pages/Bakery"));
const Cart = lazy(() => import("./pages/Cart"));
const Orders = lazy(() => import("./pages/Orders"));
const History = lazy(() => import("./pages/History"));
const Profile = lazy(() => import("./pages/Profile"));
const RiderDashboard = lazy(() => import("./pages/RiderDashboard"));
const Admin = lazy(() => import("./pages/Admin"));
// Removed: BusinessDashboard (business role removed - admin controls all)
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const RiderRegistration = lazy(() => import("./pages/RiderRegistration"));
const Onboarding = lazy(() => import("./components/onboarding/OnboardingFlow").then(module => ({ default: module.OnboardingFlow })));
const NotFound = lazy(() => import("./pages/NotFound"));
const Support = lazy(() => import("./pages/Support"));

const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

import { AnimatedSplash } from "@/components/AnimatedSplash";
import { SplashScreen } from "@capacitor/splash-screen";
import { useState } from "react";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  // Initialize mobile app features on mount
  useEffect(() => {
    initializeMobileApp();
    initializeAnalytics();

    // Hide native splash screen as soon as React app is ready
    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide();
    }
  }, []);

  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('fasthaazir_onboarding_completed');
  });

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem('fasthaazir_onboarding_completed', 'true');
    setShowOnboarding(false);
  }, []);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <TooltipProvider>
          <ChatNotificationProvider>
            <RealtimeProvider>
              <AnimatedSplash onFinish={handleSplashFinish} />
              <Toaster />
              <Sonner />
              {/* Global singleton reCAPTCHA container (invisible) */}
              <div
                id="recaptcha-container"
                aria-hidden="true"
                className="fixed left-[-10000px] top-0 h-0 w-0 overflow-hidden"
              />
              <BrowserRouter>
                <RouteTracker />
                {/* Onboarding must be inside BrowserRouter because it uses useNavigate */}
                {showOnboarding && (
                  <Suspense fallback={<PageLoader />}>
                    <Onboarding onComplete={handleOnboardingComplete} />
                  </Suspense>
                )}
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
                      <Route path="/bakery" element={<Bakery />} />
                      <Route path="/restaurant/:id" element={<RestaurantDetail />} />
                      <Route path="/cart" element={<Cart />} />
                      <Route path="/orders" element={<Orders />} />
                      <Route path="/history" element={<History />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/support" element={<Support />} />
                      <Route path="/rider/register" element={<RiderRegistration />} />
                      <Route path="/onboarding" element={<Onboarding />} />

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
                          <Admin />
                        }
                      />

                      {/* Removed: Business routes (business role removed)
                        Admin now controls all businesses from /admin panel */}

                      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                      <Route path="/terms-of-service" element={<TermsOfService />} />

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
