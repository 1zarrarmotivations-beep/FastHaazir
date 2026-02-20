import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Navigation, Package, Send, ChevronRight, Loader2, LocateFixed, Clock, RefreshCcw, CheckCircle2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { useOnlineRiders } from '@/hooks/useRiders';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { calculateDistance } from '@/components/rider/DeliveryMap';
import { usePaymentSettings, calculatePayment } from '@/hooks/useRiderPayments';

interface Location {
  lat: number;
  lng: number;
  address: string;
}

type Step = 'pickup' | 'dropoff' | 'details' | 'waiting' | 'assigned';

const REQUEST_TIMEOUT = 60; // seconds

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = {
  lat: 30.1798,
  lng: 66.9750, // Quetta
};

const AssignRider: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mapRef = useRef<google.maps.Map | null>(null);

  const { user, loading: authLoading } = useAuth();
  const { data: riders, isLoading: loadingRiders } = useOnlineRiders();
  const { data: paymentSettings } = usePaymentSettings();

  const [step, setStep] = useState<Step>('pickup');
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  const [itemDescription, setItemDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Request broadcasting state
  const [requestId, setRequestId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REQUEST_TIMEOUT);
  const [assignedRider, setAssignedRider] = useState<{ id: string; name: string; phone: string; image: string | null; vehicle_type: string } | null>(null);

  // Calculate distance and charge based on selected locations using database settings
  const { distance, deliveryCharge, riderEarning, commission } = useMemo(() => {
    if (pickupLocation && dropoffLocation) {
      const dist = calculateDistance(
        pickupLocation.lat,
        pickupLocation.lng,
        dropoffLocation.lat,
        dropoffLocation.lng
      );

      if (paymentSettings) {
        // Use enhanced calculation
        const { customerCharge, riderEarning, commission } = calculatePayment(dist, paymentSettings);
        return {
          distance: dist,
          deliveryCharge: customerCharge,
          riderEarning,
          commission
        };
      }

      // Fallback calculation
      const fallbackCharge = Math.max(80 + (dist * 30), 100);
      return {
        distance: dist,
        deliveryCharge: fallbackCharge,
        riderEarning: Math.round(fallbackCharge * 0.7), // roughly 70% to rider
        commission: Math.round(fallbackCharge * 0.3)
      };
    }
    // Default zero state
    return {
      distance: 0,
      deliveryCharge: paymentSettings?.min_payment || 100,
      riderEarning: 0,
      commission: 0
    };
  }, [pickupLocation, dropoffLocation, paymentSettings]);

  // Countdown timer for waiting step
  useEffect(() => {
    if (step !== 'waiting' || !requestId) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Request expired - mark as cancelled
          handleRequestTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, requestId]);

  // Real-time subscription for rider acceptance
  useEffect(() => {
    if (!requestId || step !== 'waiting') return;

    const channel = supabase
      .channel(`rider-request-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rider_requests',
          filter: `id=eq.${requestId}`,
        },
        async (payload) => {
          const updated = payload.new as any;

          // Check if rider was assigned
          if (updated.rider_id && updated.status !== 'placed') {
            const { data: riderData } = await supabase
              .from('public_rider_info')
              .select('*')
              .eq('id', updated.rider_id)
              .single();

            if (riderData) {
              setAssignedRider({
                id: riderData.id!,
                name: riderData.name!,
                phone: '', // Phone not exposed in public view
                image: riderData.image,
                vehicle_type: riderData.vehicle_type || 'Bike',
              });
            }

            setStep('assigned');
            toast.success('🎉 Rider Assigned!', {
              description: `${riderData?.name || 'A rider'} is on the way to pick up your item`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, step]);

  const handleRequestTimeout = async () => {
    if (!requestId) return;

    // Update request status to cancelled/expired
    await supabase
      .from('rider_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId)
      .is('rider_id', null);

    toast.error('No rider accepted', {
      description: 'All nearby riders are busy. Please try again.',
    });
  };

  const handleRetryRequest = async () => {
    if (!pickupLocation || !dropoffLocation) return;

    setCountdown(REQUEST_TIMEOUT);
    setRequestId(null);
    await handleBroadcastRequest();
  };

  // Reverse geocode function - get full detailed address using Google Maps Geocoding API
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    if (!window.google || !window.google.maps) return `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;

    const geocoder = new google.maps.Geocoder();
    try {
      const response = await geocoder.geocode({ location: { lat, lng } });
      if (response.results[0]) {
        return response.results[0].formatted_address;
      }
      return `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (e) {
      console.error("Geocoding failed", e);
      return `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  }, []);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        const address = await reverseGeocode(lat, lng);

        if (step === 'pickup') {
          setPickupLocation({ lat, lng, address });
        } else if (step === 'dropoff') {
          setDropoffLocation({ lat, lng, address });
        }

        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(15);
        }
        setIsLocating(false);
      },
      (error) => {
        console.error('Location error:', error);
        toast.error('Unable to get your location');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [step, reverseGeocode]);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    mapRef.current = null;
  }, []);

  const handleMapClick = async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const address = await reverseGeocode(lat, lng);

    if (step === 'pickup') {
      setPickupLocation({ lat, lng, address });
    } else if (step === 'dropoff') {
      setDropoffLocation({ lat, lng, address });
    }
  };

  const handleNext = () => {
    if (step === 'pickup' && pickupLocation) {
      setStep('dropoff');
    } else if (step === 'dropoff' && dropoffLocation) {
      setStep('details');
    }
  };

  const handleBack = () => {
    if (step === 'pickup') {
      navigate('/');
    } else if (step === 'dropoff') {
      setStep('pickup');
    } else if (step === 'details') {
      setStep('dropoff');
    } else if (step === 'waiting' && countdown === 0) {
      setStep('details');
      setRequestId(null);
      setCountdown(REQUEST_TIMEOUT);
    }
  };

  // Broadcast request to all online riders
  const handleBroadcastRequest = async () => {
    if (!pickupLocation || !dropoffLocation || !itemDescription.trim()) {
      toast.error('Please complete all fields');
      return;
    }

    if (!user && !authLoading) {
      toast.error('Please login to continue');
      navigate('/auth');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create rider request without assigning a specific rider
      // This will be broadcast to all online riders
      const { data, error } = await supabase
        .from('rider_requests')
        .insert({
          customer_id: user?.id || null,
          customer_phone: user?.phone || null,
          rider_id: null, // No rider assigned - broadcast to all
          pickup_address: pickupLocation.address,
          pickup_lat: pickupLocation.lat,
          pickup_lng: pickupLocation.lng,
          dropoff_address: dropoffLocation.address,
          dropoff_lat: dropoffLocation.lat,
          dropoff_lng: dropoffLocation.lng,
          item_description: itemDescription.trim(),
          status: 'placed',
          total: deliveryCharge,
          rider_earning: riderEarning,
          commission: commission,
          distance_km: distance,
        })
        .select()
        .single();

      if (error) throw error;

      setRequestId(data.id);
      setStep('waiting');
      setCountdown(REQUEST_TIMEOUT);

      toast.info('Request Sent!', {
        description: `Sent to ${riders?.length || 0} nearby riders. Waiting for acceptance...`,
      });

      // Invalidate queries to refresh orders list
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });

    } catch (error) {
      console.error('Error broadcasting request:', error);
      toast.error('Failed to send request', {
        description: 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps: Step[] = ['pickup', 'dropoff', 'details', 'waiting'];
  const currentStepIndex = steps.indexOf(step);
  const onlineRiderCount = riders?.length || 0;

  return (
    <div className="mobile-container bg-background min-h-screen flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={handleBack} disabled={step === 'waiting' && countdown > 0}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-foreground">Request a Rider</h1>
            <p className="text-xs text-muted-foreground">
              {step === 'pickup' && 'Set pickup location'}
              {step === 'dropoff' && 'Set dropoff location'}
              {step === 'details' && 'Add item details'}
              {step === 'waiting' && 'Waiting for rider...'}
              {step === 'assigned' && 'Rider assigned!'}
            </p>
          </div>
          {step === 'details' && onlineRiderCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-500 text-xs font-medium">
              <Users className="w-3 h-3" />
              {onlineRiderCount} online
            </div>
          )}
        </div>

        {/* Progress Steps */}
        {step !== 'assigned' && (
          <div className="flex items-center gap-1.5 px-4 pb-3">
            {['pickup', 'dropoff', 'details', 'waiting'].map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= currentStepIndex ? 'bg-primary' : 'bg-muted'
                  }`}
              />
            ))}
          </div>
        )}
      </motion.header>

      {/* Map Section - Only show for pickup/dropoff steps */}
      {(step === 'pickup' || step === 'dropoff') && (
        <motion.div
          key="map-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="relative flex-1 w-full min-h-[60vh] sm:min-h-[50vh]"
        >
          <div className="absolute inset-0">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={defaultCenter}
              zoom={13}
              onLoad={onLoad}
              onUnmount={onUnmount}
              onClick={handleMapClick}
              options={{
                disableDefaultUI: true,
                zoomControl: true,
              }}
            >
              {step === 'pickup' && pickupLocation && (
                <MarkerF
                  position={{ lat: pickupLocation.lat, lng: pickupLocation.lng }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: "#ff3d00", // Orange for Pickup
                    fillOpacity: 1,
                    strokeColor: "white",
                    strokeWeight: 2,
                  }}
                />
              )}
              {step === 'dropoff' && dropoffLocation && (
                <MarkerF
                  position={{ lat: dropoffLocation.lat, lng: dropoffLocation.lng }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: "#00b894", // Green for Dropoff
                    fillOpacity: 1,
                    strokeColor: "white",
                    strokeWeight: 2,
                  }}
                />
              )}
            </GoogleMap>
          </div>

          {/* Locate Me Button */}
          <Button
            variant="outline"
            size="icon"
            className="absolute top-4 right-4 z-[10] bg-background/80 backdrop-blur-md border-border text-foreground shadow-sm hover:bg-background/90"
            onClick={getCurrentLocation}
            disabled={isLocating}
          >
            {isLocating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LocateFixed className="w-5 h-5" />
            )}
          </Button>

          {/* Bottom Card */}
          <div className="absolute bottom-4 left-4 right-4 z-[10]">
            <Card className="p-4 bg-background/95 backdrop-blur shadow-lg border-border">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${step === 'pickup' ? 'bg-orange-500/20' : 'bg-green-500/20'
                    }`}
                >
                  <MapPin className={`w-5 h-5 ${step === 'pickup' ? 'text-orange-500' : 'text-green-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {step === 'pickup' ? 'Pickup Location' : 'Dropoff Location'}
                  </p>
                  <p className="font-semibold text-sm truncate text-foreground">
                    {step === 'pickup'
                      ? pickupLocation?.address || 'Tap on map to select'
                      : dropoffLocation?.address || 'Tap on map to select'}
                  </p>
                </div>
              </div>
              <Button
                className="w-full"
                disabled={step === 'pickup' ? !pickupLocation : !dropoffLocation}
                onClick={handleNext}
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>
          </div>
        </motion.div>
      )}

      {/* Item Details Step */}
      {step === 'details' && (
        <motion.div
          key="details-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex-1 p-4 space-y-4"
        >
          {/* Location Summary */}
          <Card className="p-4 border-border shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-orange-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Pickup</p>
                  <p className="font-medium text-sm truncate text-foreground">{pickupLocation?.address}</p>
                </div>
              </div>
              <div className="border-l-2 border-dashed border-border ml-5 h-4" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                  <Navigation className="w-5 h-5 text-green-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Dropoff</p>
                  <p className="font-medium text-sm truncate text-foreground">{dropoffLocation?.address}</p>
                </div>
              </div>
            </div>

            {/* Distance and Price Info */}
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Distance: {distance.toFixed(1)} km</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-primary">Rs. {deliveryCharge}</span>
                <p className="text-xs text-muted-foreground">Delivery charge</p>
              </div>
            </div>
          </Card>

          {/* Item Description */}
          <Card className="p-4 border-border shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Package className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">What are you sending?</span>
            </div>
            <textarea
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              placeholder="Describe your item (e.g., Documents, Small package, Food order...)"
              className="w-full h-24 p-3 rounded-xl bg-muted border-transparent resize-none text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-2 text-right">
              {itemDescription.length}/500
            </p>
          </Card>

          {/* Online Riders Info */}
          <Card className="p-4 border-border shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${onlineRiderCount > 0 ? 'bg-green-500/20' : 'bg-orange-500/20'
                  }`}>
                  <Users className={`w-5 h-5 ${onlineRiderCount > 0 ? 'text-green-500' : 'text-orange-500'}`} />
                </div>
                <div>
                  {loadingRiders ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        <p className="font-medium text-muted-foreground">Checking riders...</p>
                      </div>
                      <p className="text-xs text-muted-foreground">Finding available riders nearby</p>
                    </>
                  ) : onlineRiderCount > 0 ? (
                    <>
                      <p className="font-medium text-green-600 dark:text-green-400">{onlineRiderCount} Rider{onlineRiderCount > 1 ? 's' : ''} Online</p>
                      <p className="text-xs text-muted-foreground">Request will be sent to all nearby riders</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-orange-600 dark:text-orange-400">No Riders Available</p>
                      <p className="text-xs text-muted-foreground">All riders are currently offline or busy</p>
                    </>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['online-riders'] })}
                disabled={loadingRiders}
              >
                <RefreshCcw className={`w-4 h-4 ${loadingRiders ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </Card>

          <Button
            className="w-full h-12 text-lg"
            disabled={!itemDescription.trim() || isSubmitting || onlineRiderCount === 0 || loadingRiders}
            onClick={handleBroadcastRequest}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Send className="w-5 h-5 mr-2" />
            )}
            {isSubmitting ? 'Sending...' : `Request Rider • Rs. ${deliveryCharge}`}
          </Button>

          {!loadingRiders && onlineRiderCount === 0 && (
            <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
              <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
                No riders are online right now
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-500 mt-1">
                Please try again in a few minutes. Riders may be on active deliveries.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Waiting for Rider Step */}
      {step === 'waiting' && (
        <motion.div
          key="waiting-section"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col items-center justify-center p-6"
        >
          <AnimatePresence mode="wait">
            {countdown > 0 ? (
              <motion.div
                key="countdown"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                {/* Animated waiting indicator */}
                <motion.div
                  className="relative w-32 h-32 mx-auto mb-6"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <div className="absolute inset-0 rounded-full border-4 border-muted" />
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent"
                    style={{
                      clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin((countdown / REQUEST_TIMEOUT) * 2 * Math.PI)}% ${50 - 50 * Math.cos((countdown / REQUEST_TIMEOUT) * 2 * Math.PI)}%)`
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-foreground">{countdown}</span>
                  </div>
                </motion.div>

                <h2 className="text-xl font-bold text-foreground mb-2">Finding a Rider...</h2>
                <p className="text-muted-foreground mb-4">
                  Request sent to {onlineRiderCount} nearby riders
                </p>

                {/* Pulsing dots */}
                <div className="flex justify-center gap-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-primary"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>

                <Card className="mt-8 p-4 max-w-sm mx-auto bg-card border-border">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">Waiting for acceptance</p>
                      <p className="text-xs text-muted-foreground">First rider to accept gets the job</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="expired"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-10 h-10 text-destructive" />
                </div>

                <h2 className="text-xl font-bold text-foreground mb-2">No Rider Accepted</h2>
                <p className="text-muted-foreground mb-6">
                  All nearby riders are currently busy. Would you like to try again?
                </p>

                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => {
                    setStep('details');
                    setRequestId(null);
                    setCountdown(REQUEST_TIMEOUT);
                  }}>
                    Go Back
                  </Button>
                  <Button onClick={handleRetryRequest} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCcw className="w-4 h-4 mr-2" />
                    )}
                    Try Again
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Rider Assigned Step */}
      {step === 'assigned' && assignedRider && (
        <motion.div
          key="assigned-section"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="w-24 h-24 rounded-full gradient-success flex items-center justify-center mb-6"
          >
            <CheckCircle2 className="w-12 h-12 text-white" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-foreground mb-2"
          >
            🎉 Rider Assigned!
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground mb-6"
          >
            {assignedRider.name} is on the way to pick up your item
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-4 w-full max-w-sm border-border">
              <div className="flex items-center gap-4">
                <img
                  src={assignedRider.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'}
                  alt={assignedRider.name}
                  className="w-16 h-16 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">{assignedRider.name}</h3>
                  <p className="text-sm text-muted-foreground">{assignedRider.vehicle_type}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <Button onClick={() => navigate('/orders')} className="w-full">
              Track Your Delivery
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default AssignRider;
