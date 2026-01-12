# Fast Haazir - System Architecture & Data Flow

## 📊 Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE DATABASE                        │
│  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌──────────┐          │
│  │ orders  │  │businesses│  │ riders │  │ messages │          │
│  │         │  │          │  │        │  │          │          │
│  │ REALTIME│  │ REALTIME │  │REALTIME│  │ REALTIME │          │
│  └────┬────┘  └────┬─────┘  └───┬────┘  └────┬─────┘          │
│       │            │             │            │                 │
└───────┼────────────┼─────────────┼────────────┼─────────────────┘
        │            │             │            │
        ▼            ▼             ▼            ▼
┌───────────────────────────────────────────────────────────┐
│              REALTIME SUBSCRIPTIONS LAYER                  │
│  postgres_changes events → Invalidate React Query cache   │
└───────────────────────────────────────────────────────────┘
        │            │             │            │
        ▼            ▼             ▼            ▼
┌────────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐
│  CUSTOMER  │  │ BUSINESS │  │  RIDER  │  │  ADMIN   │
│    APP     │  │   APP    │  │   APP   │  │  PANEL   │
└────────────┘  └──────────┘  └─────────┘  └──────────┘
```

---

## 🔄 Order Flow (Customer → Business → Rider)

```
CUSTOMER                 BUSINESS                RIDER                   ADMIN
   │                        │                      │                       │
   │ 1. Browse Menu         │                      │                       │
   │ (useBusinesses)        │                      │                       │
   │ (useMenuItems)         │                      │                       │
   │                        │                      │                       │
   │ 2. Place Order ────────┼──────────────────────┼───────────────────────┤
   │ (useCreateOrder)       │                      │                       │
   │                        │                      │                       │
   │                        ▼                      ▼                       ▼
   │                  3. Receives Order      4. Push Notification   5. Sees Order
   │                  (useBusinessOrders)    (Speech + Toast)       (useAdminOrders)
   │                  REALTIME ⚡             REALTIME ⚡            REALTIME ⚡
   │                        │                      │                       │
   │                        │ 6. Update Status     │                       │
   │                        │    preparing         │                       │
   │                        │                      │                       │
   │ 7. Chat Active ◄───────┤                      │                       │
   │ (OrderChat)            │                      │                       │
   │ REALTIME ⚡            │                      │                       │
   │                        │                      │                       │
   │                        │                      │ 8. Accept Order       │
   │                        │                      │ (useAcceptRequest)    │
   │                        │                      │                       │
   │                        ▼                      ▼                       ▼
   │                  9. Status: on_way      10. Start Delivery    11. Track Live
   │                  REALTIME ⚡             (useUpdateStatus)     REALTIME ⚡
   │                        │                      │                       │
   │ 12. Chat Active ◄──────┴──────────────────────┤                       │
   │ (Customer ↔ Rider)                            │                       │
   │ REALTIME ⚡                                   │                       │
   │                                               │                       │
   │ 13. See Live Location ◄───────────────────────┤                       │
   │ (useRiderLocation)                            │                       │
   │ Updates every 10s                             │                       │
   │                                               │                       │
   │                                               │ 14. Delivered         │
   │                                               │ (useUpdateStatus)     │
   │                                               │                       │
   │ 15. Order Complete ◄──────────────────────────┼───────────────────────┤
   │ Status: delivered                             │                       │
   │ REALTIME ⚡                                   ▼                       ▼
   │                                         Earnings Update         Stats Update
   │                                         REALTIME ⚡             REALTIME ⚡
   ▼
Review & Rate
```

---

## 🔄 Admin → Customer Realtime Flow

```
ADMIN PANEL                           CUSTOMER APP
     │                                      │
     │ 1. Add Restaurant                   │
     │ (useCreateBusiness)                 │
     │         │                            │
     │         ▼                            │
     │   INSERT into                        │
     │   businesses table                   │
     │         │                            │
     │         ├────────► postgres_changes  │
     │         │          event fired       │
     │         │                 │          │
     │         │                 ▼          │
     │         │          Realtime          │
     │         │          subscription      │
     │         │          receives event    │
     │         │                 │          │
     │         │                 ▼          │
     │         │          invalidateQueries │
     │         │          ['businesses']    │
     │         │                 │          │
     │         │                 ▼          │
     │         │          Refetch data      │
     │         │                 │          │
     │         │                 ▼          │
     │         └─────────────────────────► Restaurant
     │                                     appears on
     │ 2. Delete Restaurant                home page
     │ (useDeleteBusiness)                 INSTANTLY ⚡
     │         │                            │
     │         ▼                            │
     │   DELETE from                        │
     │   businesses table                   │
     │         │                            │
     │         ├────────► postgres_changes  │
     │         │          event fired       │
     │         │                 │          │
     │         │                 ▼          │
     │         │          Realtime          │
     │         │          subscription      │
     │         │                 │          │
     │         │                 ▼          │
     │         └─────────────────────────► Restaurant
     │                                     disappears
     │                                     INSTANTLY ⚡
     │                                      │
     │ 3. Update Menu Item                  │
     │ (Business adds item)                 │
     │         │                            │
     │         ▼                            │
     │   INSERT into                        │
     │   menu_items table                   │
     │         │                            │
     │         └────────► REALTIME ─────────► Menu updates
     │                                     INSTANTLY ⚡
     ▼                                      ▼
```

---

## 🔄 Rider Online/Offline Flow

```
RIDER DASHBOARD                      ASSIGN RIDER PAGE            ADMIN PANEL
      │                                    │                          │
      │ 1. Toggle ONLINE                   │                          │
      │ (useToggleOnlineStatus)            │                          │
      │         │                          │                          │
      │         ▼                          │                          │
      │   UPDATE riders                    │                          │
      │   SET is_online=true               │                          │
      │         │                          │                          │
      │         ├────────► postgres_changes event ─────────────────────┤
      │         │                 │                                    │
      │         │                 ▼                                    │
      │         │          Realtime subscription                       │
      │         │          (useOnlineRiders)                           │
      │         │                 │                                    │
      │         │                 ▼                                    │
      │         │          invalidateQueries                           │
      │         │          ['online-riders']                           │
      │         │                 │                                    │
      │         │                 ▼                                    │
      │         └─────────────────────────► Rider appears         Rider count
      │                                     in list               updates
      │                                     INSTANTLY ⚡          INSTANTLY ⚡
      │                                    │                          │
      │ 2. Location Update                 │                          │
      │ (useRiderLocation)                 │                          │
      │ Every 10 seconds                   │                          │
      │         │                          │                          │
      │         ▼                          │                          │
      │   UPDATE riders                    │                          │
      │   SET current_location_lat         │                          │
      │       current_location_lng         │                          │
      │         │                          │                          │
      │         └────────► REALTIME ───────► Customer sees        Admin sees
      │                                     live location         live map
      │                                     on map ⚡              ⚡
      │                                    │                          │
      │ 3. Toggle OFFLINE                  │                          │
      │         │                          │                          │
      │         ▼                          │                          │
      │   UPDATE is_online=false           │                          │
      │         │                          │                          │
      │         └────────► REALTIME ───────► Rider disappears     Count updates
      │                                     INSTANTLY ⚡          INSTANTLY ⚡
      ▼                                    ▼                          ▼
```

---

## 💬 Chat Realtime Flow

```
CUSTOMER                              RIDER
   │                                    │
   │ 1. Type message                    │
   │ "On my way"                        │
   │         │                          │
   │         ▼                          │
   │   useSendMessage                   │
   │         │                          │
   │         ▼                          │
   │   INSERT into                      │
   │   messages table                   │
   │   {                                │
   │     order_id: "xxx",               │
   │     sender_type: "customer",       │
   │     sender_id: "user_id",          │
   │     message: "On my way"           │
   │   }                                │
   │         │                          │
   │         ├────────► postgres_changes event
   │         │                 │        │
   │         │                 ▼        │
   │         │          Realtime        │
   │         │          subscription    │
   │         │          active on       │
   │         │          both sides      │
   │         │                 │        │
   │         │                 ▼        │
   │         │          invalidateQueries
   │         │          ['messages']    │
   │         │                 │        │
   │         │                 ▼        │
   │         │          Refetch         │
   │         │                 │        │
   │         │                 ▼        │
   │   Message appears ◄────────────────┤ Message appears
   │   RIGHT side              │        │ LEFT side
   │   (customer)              │        │ (rider perspective)
   │   INSTANTLY ⚡            │        │ INSTANTLY ⚡
   │                           │        │
   │                           │        │ 2. Rider replies
   │                           │        │ "5 mins away"
   │                           │        │         │
   │                           │        │         ▼
   │                           │        │   useSendMessage
   │                           │        │         │
   │                           │        │         ▼
   │                           │        │   INSERT into
   │                           │        │   messages
   │                           │        │         │
   │   Message appears ◄───────┴────────┴─────────┤
   │   LEFT side                                   │
   │   (rider perspective)                         │
   │   INSTANTLY ⚡                                │
   │                                               │ Message appears
   │                                               │ RIGHT side
   │                                               │ (rider)
   │                                               │ INSTANTLY ⚡
   ▼                                               ▼

UI Layout (STRICT):
┌─────────────────────────────┐
│  Header (Fixed Top)         │
├─────────────────────────────┤
│  📍 Map (Collapsible)       │ ← ABOVE messages
├─────────────────────────────┤
│  Messages (Scrollable)      │
│  ┌────────────────┐         │
│  │  Rider: Hi  ◄──┤         │ ← LEFT
│  └────────────────┘         │
│         ┌────────────────┐  │
│         │ Customer: Hi ►─┤  │ ← RIGHT
│         └────────────────┘  │
├─────────────────────────────┤
│  Input + Send (Fixed Bottom)│
└─────────────────────────────┘
```

---

## 🔔 Push Notification Flow

```
ADMIN PANEL                    PUSH SERVICE              ALL USERS
     │                              │                       │
     │ 1. Send Notification         │                       │
     │ Target: All Riders            │                       │
     │         │                     │                       │
     │         ▼                     │                       │
     │   Invoke Supabase             │                       │
     │   Edge Function               │                       │
     │   send-push-notification      │                       │
     │         │                     │                       │
     │         ├────────►            │                       │
     │         │          2. Query   │                       │
     │         │          push_device_tokens                 │
     │         │          WHERE role='rider'                 │
     │         │                 │   │                       │
     │         │                 ▼   │                       │
     │         │          3. OneSignal API                   │
     │         │          POST /notifications                │
     │         │                 │   │                       │
     │         │                 └───┼───────────►           │
     │         │                     │          4. Push      │
     │         │                     │          received     │
     │         │                     │          INSTANTLY ⚡ │
     │         │                     │                 │     │
     │         │                     │                 ▼     │
     │         │                     │          Notification │
     │         │                     │          appears      │
     │         │                     │          Sound plays  │
     │         │                     │          Bell count++ │
     │         │                     │                 │     │
     │         │                     │          5. Click     │
     │         │                     │          opens route  │
     │         │                     │                 │     │
     │         ◄───────────────────────────────────────┘     │
     │   6. Success count                                    │
     │   updated in DB                                       │
     ▼                                                        ▼
```

---

## 📊 Data Synchronization Points

### 1. Businesses Table
```
Admin adds → REALTIME → Customer sees (home page)
Admin removes → REALTIME → Customer doesn't see
Admin activates/deactivates → REALTIME → Visibility changes
Business updates menu → REALTIME → Customer sees new items
```

### 2. Riders Table
```
Rider goes online → REALTIME → Appears in assign rider list
Rider goes offline → REALTIME → Disappears from list
Admin adds rider → REALTIME → Rider can login
Admin activates/deactivates → REALTIME → Rider access changes
Location updates → REALTIME → Customer sees on map
```

### 3. Orders Table
```
Customer places → REALTIME → Business sees
Business updates status → REALTIME → Customer sees
Rider accepts → REALTIME → All parties see
Status changes → REALTIME → Everyone updated
```

### 4. Messages Table
```
Customer sends → REALTIME → Rider receives
Rider sends → REALTIME → Customer receives
Business sends → REALTIME → Customer receives
```

### 5. Menu Items Table
```
Business adds item → REALTIME → Customer sees in menu
Business marks unavailable → REALTIME → Customer can't order
Business changes price → REALTIME → Customer sees new price
```

---

## ✅ All Connections Verified

1. **Customer ↔ Business**: ✅ Orders, Menu, Chat
2. **Customer ↔ Rider**: ✅ Orders, Location, Chat
3. **Customer ↔ Admin**: ✅ Sees live data
4. **Business ↔ Admin**: ✅ Menu, Orders, Settings
5. **Rider ↔ Admin**: ✅ Assignments, Status, Settings
6. **Rider ↔ Business**: ✅ Order pickup
7. **Push Notifications**: ✅ All roles

**All realtime subscriptions active ⚡**
**All connections working 🚀**
**System 100% live 🎯**
