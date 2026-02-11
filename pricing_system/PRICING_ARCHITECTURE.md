# Scalable Fintech Pricing & Wallet System Architecture
**Project: Fast Haazir | Role: Senior Backend Architect & Fintech Strategist**

## 1. Backend Architecture Flow

This system is designed for **high-integrity financial transactions** where every rupee is accounted for.

### Service Flow
1.  **Pricing Engine (Stateless)**:
    *   Receives `pickup`, `dropoff`, `service_type`.
    *   Calculates `distance_km` via Map Service (Google Distance Matrix / OSRM).
    *   Queries `pricing_config` table for base rates & multipliers.
    *   Returns `estimated_fare` and `estimated_earning` with breakdown.

2.  **Order Processing (Stateful)**:
    *   Locks the estimated price for 5 minutes (`quote_id`).
    *   Upon confirmation, creates an Order record with frozen financial snapshot.

3.  **Wallet Ledger (ACID Transactional)**:
    *   Listens for `order_completed` events.
    *   Executes atomic transaction:
        *   Credit Rider Wallet (`pending_balance`).
        *   Debit Company Wallet (if online payment) OR Adjust Cash collected.
        *   Create immutable `wallet_ledger` entry.

---

## 2. Pricing Calculation Formulas

### A. Customer Cost (What User Pays)
```javascript
const distCharge = Math.max(0, (distanceKm - baseKm)) * perKmRate;
let totalFare = baseFare + distCharge;

// Dynamic Multipliers
totalFare = totalFare * surgeMultiplier * weatherMultiplier * peakHourMultiplier;

// Floor/Ceiling
totalFare = Math.max(totalFare, minimumFare);

// Final Rounding (to nearest 10 PKR for cash ease)
finalCustomerFare = Math.ceil(totalFare / 10) * 10;
```

### B. Rider Earning (What Rider Gets)
```javascript
const riderDistCharge = Math.max(0, (distanceKm - baseKm)) * riderPerKmRate;
let totalEarning = riderBasePay + riderDistCharge;

// Bonuses
if (isPeakHour) totalEarning += peakBonus;
if (weeklyTargetMet) totalEarning += incentiveBonus;

// Guarantee
finalRiderEarning = Math.max(totalEarning, minimumRiderEarning);
```

### C. Company Commission (Revenue)
```javascript
companyRevenue = finalCustomerFare - finalRiderEarning;
// Note: Revenue can be negative if we are subsidizing a ride (Promo/Growth phase)
```

---

## 3. Database Schema (PostgreSQL)

### `pricing_plans`
Defines the base logic for different services (Bike, Car, Parcel).
- `id` (PK), `service_type` (enum), `base_fare`, `per_km_rate`, `min_fare`, `surge_multiplier`, `active`.

### `rider_wallets`
The master account for each rider.
- `rider_id` (PK, FK -> auth.users)
- `balance` (numeric, 2 decimals) - Available for withdrawal.
- `pending_balance` (numeric) - Not yet cleared (e.g., weekly hold).
- `lifetime_earnings` (numeric) - Reporting only.

### `wallet_transactions` (The Ledger)
Immutable record of EVERY movement.
- `id` (PK), `wallet_id` (FK), `order_id` (FK), `amount` (numeric), `type` (credit/debit), `category` (fare, tip, bonus, adjustment), `balance_after`, `created_at`.

### `dynamic_pricing_rules` (Future Proofing)
- `rule_name`, `multiplier`, `start_time`, `end_time`, `geofence_polygon` (PostGIS), `priority`.

---

## 4. Wallet Logic & Atomic Transactions

To prevent race conditions (double spending), we use database-level locking or atomic updates.

```sql
-- ATOMIC CREDIT FUNCTION
CREATE OR REPLACE FUNCTION credit_rider_wallet(rider_uuid UUID, amount DECIMAL, order_ref UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert into ledger
  INSERT INTO wallet_transactions (wallet_id, amount, type, category, order_id, balance_after)
  VALUES (
    rider_uuid, 
    amount, 
    'credit', 
    'fare_earning', 
    order_ref,
    (SELECT balance + amount FROM rider_wallets WHERE rider_id = rider_uuid) -- Calculated snapshot
  );
  
  -- Update actual balance
  UPDATE rider_wallets 
  SET balance = balance + amount, lifetime_earnings = lifetime_earnings + amount
  WHERE rider_id = rider_uuid;
END;
$$ LANGUAGE plpgsql;
```

---

## 5. Security & Guardrails

1.  **Server-Side Only**: Pricing logic NEVER runs on the client. Client only receives the final number.
2.  **Signature Verification**: Quotes are signed (HMAC) to prevent altering price between "View" and "Confirm" screens.
3.  **Distance Validation**:
    *   Compare `GPS_Distance` vs `Map_Road_Distance`.
    *   If variance > 20%, flag for manual review (Order Audit).
4.  **Commission Floor**: Alert Admin if `Commission < 0` (negative margin) unless explicitly authorized by a Promo Code.

---
*Architected by Antigravity for Fast Haazir*
