# Fast Haazir Backend

This is the Node.js backend for Fast Haazir, primarily used for payment processing (PayUp QR).

## Setup

1.  Navigate to `backend` folder:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure `.env`:
    (Already created)
    ```env
    SUPABASE_URL=...
    SUPABASE_SERVICE_KEY=...
    PAYUP_API_KEY=...
    PORT=5000
    ```

## Run

Start the server:
```bash
node server.js
```
Or with nodemon (if installed):
```bash
npx nodemon server.js
```

## API Endpoints

*   `POST /api/payments/create`: Create a payment request and generate QR code.
    *   Body: `{ order_id, user_id, amount }`
    *   Returns: `{ transaction_id, qr_url, payment_url, expires_in }`
*   `POST /api/payments/webhook`: Handle PayUp webhook notifications.
*   `GET /api/payments/verify/:transaction_id`: Check payment status.
*   `POST /api/payments/claim`: Manual payment claim (fallback).

## Frontend Connection

Update `frontend/.env` (or `.env.production`) for deployment:
```env
VITE_BACKEND_URL=https://your-deployed-backend.com
```
For local testing, `http://localhost:5000` is used by default.

## PayUp QR Code Format

The backend generates QR codes in the following JSON format that can be scanned by any banking app:

```json
{
  "m": "PK",
  "am": "100.00",
  "mn": "FastHaazir",
  "rd": "Y",
  "rq": "order-id",
  "tn": "Order #order-id"
}
```

This format works with JazzCash, Easypaisa, and other banking apps that support QR payments.
