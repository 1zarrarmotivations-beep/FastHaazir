# Mobile Features - Developer Guide

## 🎯 How to Use Mobile Features in Fast Haazir

This guide shows you how to integrate and use mobile-specific features in your React components.

---

## 📦 Import Mobile Library

```typescript
import {
  isMobile,
  getPlatform,
  takePicture,
  getCurrentLocation,
  watchLocation,
  clearLocationWatch,
  registerPushNotifications,
  setupPushNotificationListeners,
  hapticImpact,
  hapticNotification,
  hideKeyboard,
  exitApp
} from '@/lib/mobile';
```

---

## 1️⃣ **Check if Running on Mobile**

```typescript
import { isMobile, getPlatform } from '@/lib/mobile';

function MyComponent() {
  const mobile = isMobile(); // true on Android/iOS, false on web
  const platform = getPlatform(); // 'android' | 'ios' | 'web'

  return (
    <div>
      {mobile ? (
        <MobileView platform={platform} />
      ) : (
        <WebView />
      )}
    </div>
  );
}
```

---

## 2️⃣ **Camera - Take Photos**

### **Use Case: Profile Photo Upload**

```typescript
import { takePicture, hapticImpact } from '@/lib/mobile';
import { Button } from '@/components/ui/button';
import { Camera, Image as ImageIcon } from 'lucide-react';

function ProfilePhotoUpload() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleTakePhoto = async () => {
    await hapticImpact('light'); // Haptic feedback
    
    const imageUrl = await takePicture(false); // false = camera, true = gallery
    
    if (imageUrl) {
      setPhoto(imageUrl);
      // Upload to server
      await uploadPhoto(imageUrl);
    }
  };

  const handlePickFromGallery = async () => {
    await hapticImpact('light');
    
    const imageUrl = await takePicture(true); // Pick from gallery
    
    if (imageUrl) {
      setPhoto(imageUrl);
      await uploadPhoto(imageUrl);
    }
  };

  return (
    <div className="space-y-4">
      {photo && (
        <img src={photo} alt="Profile" className="w-32 h-32 rounded-full" />
      )}
      
      <div className="flex gap-2">
        <Button onClick={handleTakePhoto}>
          <Camera className="mr-2" />
          Take Photo
        </Button>
        
        <Button onClick={handlePickFromGallery} variant="outline">
          <ImageIcon className="mr-2" />
          Choose from Gallery
        </Button>
      </div>
    </div>
  );
}
```

---

## 3️⃣ **Geolocation - Get Current Position**

### **Use Case: Detect Delivery Address**

```typescript
import { getCurrentLocation } from '@/lib/mobile';
import { toast } from 'sonner';

function DeliveryAddressDetector() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const detectLocation = async () => {
    setLoading(true);
    
    const position = await getCurrentLocation();
    
    if (position) {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      setLocation({ lat, lng });
      
      // Reverse geocode to get address
      const addressText = await reverseGeocode(lat, lng);
      setAddress(addressText);
      
      toast.success('Location detected!');
    } else {
      toast.error('Unable to get location. Please enable GPS.');
    }
    
    setLoading(false);
  };

  return (
    <div>
      <Button onClick={detectLocation} disabled={loading}>
        {loading ? 'Detecting...' : 'Use My Location'}
      </Button>
      
      {address && (
        <p className="mt-2 text-sm">{address}</p>
      )}
    </div>
  );
}
```

---

## 4️⃣ **Geolocation - Live Tracking**

### **Use Case: Rider Location Updates**

```typescript
import { watchLocation, clearLocationWatch } from '@/lib/mobile';
import { supabase } from '@/integrations/supabase/client';

function RiderLocationTracker({ riderId }: { riderId: string }) {
  const watchIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Start watching location when component mounts
    watchIdRef.current = watchLocation((position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      console.log('[Rider] Location updated:', lat, lng);
      
      // Update database
      supabase
        .from('riders')
        .update({
          current_location_lat: lat,
          current_location_lng: lng,
          updated_at: new Date().toISOString()
        })
        .eq('id', riderId)
        .then(() => {
          console.log('[Rider] Location saved to database');
        });
    });

    // Cleanup when component unmounts
    return () => {
      if (watchIdRef.current) {
        clearLocationWatch(watchIdRef.current);
        console.log('[Rider] Stopped location tracking');
      }
    };
  }, [riderId]);

  return (
    <div className="flex items-center gap-2 text-sm text-green-600">
      <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
      <span>Location tracking active</span>
    </div>
  );
}
```

---

## 5️⃣ **Push Notifications**

### **Use Case: Register Device for Push**

```typescript
import { registerPushNotifications, setupPushNotificationListeners } from '@/lib/mobile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

function PushNotificationSetup() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const initPush = async () => {
      // Register for push notifications
      const token = await registerPushNotifications();
      
      if (token) {
        console.log('[Push] Device token:', token);
        
        // Save token to database
        await supabase
          .from('push_device_tokens')
          .upsert({
            user_id: user.id,
            device_token: token,
            platform: getPlatform(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,device_token'
          });
        
        console.log('[Push] Token saved to database');
      }
    };

    // Setup notification listeners
    setupPushNotificationListeners(
      // When notification received while app is open
      (notification) => {
        console.log('[Push] Received:', notification);
        toast.info(notification.title, {
          description: notification.body
        });
      },
      // When notification is clicked
      (notification) => {
        console.log('[Push] Clicked:', notification);
        
        // Navigate to specific screen based on notification data
        const data = notification.notification.data;
        if (data?.route) {
          navigate(data.route);
        }
      }
    );

    initPush();
  }, [user]);

  return null; // This is a setup component, no UI
}
```

---

## 6️⃣ **Haptic Feedback**

### **Use Case: Button Press Vibration**

```typescript
import { hapticImpact, hapticNotification } from '@/lib/mobile';
import { Button } from '@/components/ui/button';

function HapticButton({ onClick, children }) {
  const handleClick = async () => {
    // Light haptic on button press
    await hapticImpact('light');
    
    // Execute actual click handler
    onClick();
  };

  return (
    <Button onClick={handleClick}>
      {children}
    </Button>
  );
}

function OrderConfirmation() {
  const confirmOrder = async () => {
    try {
      await placeOrder();
      
      // Success haptic
      await hapticNotification('success');
      
      toast.success('Order placed successfully!');
    } catch (error) {
      // Error haptic
      await hapticNotification('error');
      
      toast.error('Failed to place order');
    }
  };

  return (
    <HapticButton onClick={confirmOrder}>
      Confirm Order
    </HapticButton>
  );
}
```

---

## 7️⃣ **Keyboard Management**

### **Use Case: Dismiss Keyboard on Submit**

```typescript
import { hideKeyboard } from '@/lib/mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function ChatInput() {
  const [message, setMessage] = useState('');

  const sendMessage = async () => {
    if (!message.trim()) return;
    
    // Hide keyboard when sending
    await hideKeyboard();
    
    // Send message
    await sendChatMessage(message);
    
    // Clear input
    setMessage('');
    
    // Haptic feedback
    await hapticImpact('light');
  };

  return (
    <div className="flex gap-2">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        onKeyPress={(e) => {
          if (e.key === 'Enter') sendMessage();
        }}
      />
      <Button onClick={sendMessage}>Send</Button>
    </div>
  );
}
```

---

## 8️⃣ **Combine Multiple Features**

### **Use Case: Rider Dashboard with All Features**

```typescript
import {
  isMobile,
  getCurrentLocation,
  watchLocation,
  clearLocationWatch,
  registerPushNotifications,
  setupPushNotificationListeners,
  hapticNotification
} from '@/lib/mobile';

function RiderDashboard() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<string | null>(null);

  // Initialize mobile features
  useEffect(() => {
    if (!isMobile()) return;

    // Register for push notifications
    registerPushNotifications().then(token => {
      if (token) {
        console.log('[Rider] Push token:', token);
        // Save to database
      }
    });

    // Setup push listeners
    setupPushNotificationListeners(
      (notification) => {
        // New order received
        hapticNotification('success');
        toast.info('New Order!', {
          description: notification.body
        });
      },
      (notification) => {
        // Notification clicked
        const data = notification.notification.data;
        if (data?.orderId) {
          navigate(`/order/${data.orderId}`);
        }
      }
    );
  }, []);

  // Handle online/offline toggle
  const toggleOnline = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    
    if (newStatus) {
      // Going online - start location tracking
      const position = await getCurrentLocation();
      if (position) {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });

        // Start watching location
        watchIdRef.current = watchLocation((pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          
          setLocation({ lat, lng });
          
          // Update in database
          updateRiderLocation(user.id, lat, lng);
        });
      }
      
      hapticNotification('success');
      toast.success('You are now online!');
    } else {
      // Going offline - stop location tracking
      if (watchIdRef.current) {
        clearLocationWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      
      hapticNotification('warning');
      toast.info('You are now offline');
    }
    
    // Update status in database
    updateRiderOnlineStatus(user.id, newStatus);
  };

  return (
    <div>
      <Switch checked={isOnline} onCheckedChange={toggleOnline} />
      <span>{isOnline ? 'Online' : 'Offline'}</span>
      
      {location && isOnline && (
        <div className="text-sm text-muted-foreground">
          Location: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
        </div>
      )}
    </div>
  );
}
```

---

## 🎯 **Best Practices**

### **1. Always Check if Mobile**
```typescript
if (isMobile()) {
  // Use native feature
} else {
  // Use web fallback
}
```

### **2. Handle Permissions Gracefully**
```typescript
const position = await getCurrentLocation();
if (!position) {
  toast.error('Location permission denied. Please enable in settings.');
  return;
}
```

### **3. Provide Feedback**
```typescript
await hapticImpact('medium'); // Haptic
toast.success('Action completed'); // Visual
```

### **4. Cleanup Watchers**
```typescript
useEffect(() => {
  const watchId = watchLocation(callback);
  
  return () => {
    if (watchId) clearLocationWatch(watchId);
  };
}, []);
```

### **5. Test on Real Device**
Always test mobile features on a physical device, not just emulator:
```bash
yarn build
npx cap sync
npx cap run android
```

---

## ✅ **Mobile Feature Checklist**

Before publishing, ensure all mobile features are tested:

- [ ] Camera - Take photo
- [ ] Camera - Pick from gallery
- [ ] Location - Get current position
- [ ] Location - Watch position updates
- [ ] Push notifications - Registration
- [ ] Push notifications - Receive
- [ ] Push notifications - Click handling
- [ ] Haptic feedback - Button presses
- [ ] Haptic feedback - Notifications
- [ ] Keyboard - Auto-hide on submit
- [ ] Status bar - Custom color
- [ ] Splash screen - Branding
- [ ] Back button - Navigation
- [ ] Back button - Exit app

---

## 🚀 **Ready to Build!**

Now you know how to integrate all mobile features into Fast Haazir.

All the features work seamlessly on Android and iOS with the same codebase.

Happy coding! 📱✨
