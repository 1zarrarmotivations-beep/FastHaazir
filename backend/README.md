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

*   `POST /api/payments/create`: Create a payment request.
*   `POST /api/payments/webhook`: Handle PayUp webhook.
*   `GET /api/payments/verify/:transaction_id`: Check payment status.

## Frontend Connection

Update `frontend/.env` (or `.env.production`) for deployment:
```env
VITE_BACKEND_URL=https://your-deployed-backend.com
```
For local testing, `http://localhost:5000` is used by default.
