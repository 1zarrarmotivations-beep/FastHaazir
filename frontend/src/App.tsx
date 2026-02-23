import { lazy, Suspense, useEffect, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Capacitor } from "@capacitor/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { GroceryCartProvider } from "@/context/GroceryCartContext";
import ChatNotificationProvider from "@/components/chat/ChatNotificationProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import RealtimeProvider from "@/components/RealtimeProvider";
import PushNotificationProvider from "@/components/push/PushNotificationProvider";
import { AndroidNotificationSetup } from "@/components/push/AndroidNotificationSetup";
import { initializeMobileApp } from "@/lib/mobile";
import { initializeAnalytics, trackPageView } from "@/lib/analytics";
import { useLocation } from "react-router-dom";
import { GoogleMapProvider } from "@/components/maps/GoogleMapProvider";

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

// Helper to retry lazy imports if they fail (chunk load error)
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    try {
      return await componentImport();
    } catch (error: any) {
      console.error("Lazy load failed, retrying...", error);
      if (error.message.includes("dynamically imported module")) {
        // If chunk load error, force reload page once (handled by user usually, but we could automate)
        // For now, let's just retry the fetch once after a delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await componentImport().catch(() => {
          window.location.reload(); // Last resort: reload page to get fresh index
          throw error;
        });
      }
      throw error;
    }
  });

// Lazy load non-critical pages using Retry wrapper
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const AssignRider = lazyWithRetry(() => import("./pages/AssignRider"));
const RestaurantDetail = lazyWithRetry(() => import("./pages/RestaurantDetail"));
const Restaurants = lazyWithRetry(() => import("./pages/Restaurants"));
const Grocery = lazyWithRetry(() => import("./pages/Grocery"));
const GroceryCart = lazyWithRetry(() => import("./pages/GroceryCart"));
const GroceryOrders = lazyWithRetry(() => import("./pages/GroceryOrders"));
const Bakery = lazyWithRetry(() => import("./pages/Bakery"));
const Cart = lazyWithRetry(() => import("./pages/Cart"));
const Orders = lazyWithRetry(() => import("./pages/Orders"));
const ScheduledOrders = lazyWithRetry(() => import("./pages/ScheduledOrders"));
const History = lazyWithRetry(() => import("./pages/History"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const RiderDashboard = lazyWithRetry(() => import("./pages/RiderDashboard"));
// New multi-page rider dashboard architecture
const RiderDashboardLayout = lazyWithRetry(() => import("./pages/rider/RiderDashboardLayout"));
const RiderHomePage = lazyWithRetry(() => import("./pages/rider/RiderHomePage"));
const RiderOrdersPage = lazyWithRetry(() => import("./pages/rider/RiderOrdersPage"));
const RiderMapPage = lazyWithRetry(() => import("./pages/rider/RiderMapPage"));
const RiderProfilePage = lazyWithRetry(() => import("./pages/rider/RiderProfilePage"));
const RiderSpeedPage = lazyWithRetry(() => import("./pages/rider/RiderSpeedPage"));
const RiderWallet = lazyWithRetry(() => import("./pages/RiderWallet"));
const Admin = lazyWithRetry(() => import("./pages/Admin"));
// Removed: BusinessDashboard (business role removed - admin controls all)
const CompleteProfile = lazyWithRetry(() => import("./pages/CompleteProfile"));
const RiderRegistration = lazyWithRetry(() => import("./pages/RiderRegistration"));
const Onboarding = lazyWithRetry(() => import("./components/onboarding/OnboardingFlow").then(module => ({ default: module.OnboardingFlow })));
const PrivacyPolicy = lazyWithRetry(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazyWithRetry(() => import("./pages/TermsOfService"));
const Support = lazyWithRetry(() => import("./pages/Support"));
const RiderSupport = lazyWithRetry(() => import("./pages/RiderSupport"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));


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

    // Show welcome notification if first time
    import('@/lib/mobile').then(m => m.showWelcomeNotification());
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
        <GroceryCartProvider>
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
                    <GoogleMapProvider>
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/auth" element={<Auth />} />
                          <Route path="/complete-profile" element={<CompleteProfile />} />
                          <Route path="/assign-rider" element={<AssignRider />} />
                          <Route path="/restaurants" element={<Restaurants />} />
                          <Route path="/grocery" element={<Grocery />} />
                          <Route path="/grocery/cart" element={<GroceryCart />} />
                          <Route path="/grocery/orders" element={<GroceryOrders />} />
                          <Route path="/bakery" element={<Bakery />} />
                          <Route path="/restaurant/:id" element={<RestaurantDetail />} />
                          <Route path="/cart" element={<Cart />} />
                          <Route path="/orders" element={<Orders />} />
                          <Route path="/scheduled-orders" element={<ScheduledOrders />} />
                          <Route path="/history" element={<History />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/onboarding" element={<Onboarding />} />
                          <Route path="/support" element={<Support />} />
                          <Route path="/rider/register" element={<RiderRegistration />} />

                          {/* Protected Dashboards - Multi-Page Rider Dashboard */}
                          <Route
                            path="/rider"
                            element={
                              <ProtectedRoute allowedRoles={["rider"]}>
                                <RiderDashboardLayout />
                              </ProtectedRoute>
                            }
                          >
                            <Route index element={<RiderHomePage />} />
                            <Route path="orders" element={<RiderOrdersPage />} />
                            <Route path="map" element={<RiderMapPage />} />
                            <Route path="speed" element={<RiderSpeedPage />} />
                            <Route path="earnings" element={<RiderWallet />} />
                            <Route path="profile" element={<RiderProfilePage />} />
                          </Route>

                          {/* Legacy Rider Dashboard Route - Redirects to new multi-page */}
                          <Route
                            path="/rider-dashboard"
                            element={
                              <ProtectedRoute allowedRoles={["rider"]}>
                                <RiderDashboard />
                              </ProtectedRoute>
                            }
                          />

                          {/* Rider Support - Protected for Riders Only */}
                          <Route
                            path="/rider-support"
                            element={
                              <ProtectedRoute allowedRoles={["rider"]}>
                                <RiderSupport />
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

                          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                          <Route path="/terms-of-service" element={<TermsOfService />} />

                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
                    </GoogleMapProvider>
                  </PushNotificationProvider>
                </BrowserRouter>
              </RealtimeProvider>
            </ChatNotificationProvider>
          </TooltipProvider>
        </GroceryCartProvider>
      </CartProvider>
    </QueryClientProvider >
  );
};

export default App;
