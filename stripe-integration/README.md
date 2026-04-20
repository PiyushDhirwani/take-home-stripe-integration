# Subscription Management API

A minimal subscription management system built with **NestJS**, **MongoDB**, and **Stripe**. Supports JWT authentication, subscription billing via Stripe Checkout Sessions, webhook handling, and role-based access control.

## Tech Stack

- **Framework**: NestJS (TypeScript)
- **Database**: MongoDB (Mongoose ODM)
- **Payments**: Stripe (Checkout Sessions + Webhooks)
- **Auth**: JWT (Passport)
- **Docs**: Swagger (OpenAPI)

## Prerequisites

- **Node.js** >= 18
- **MongoDB** running locally (or a remote URI)
- **Stripe account** with test keys ([dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys))
- **Stripe CLI** for local webhook testing ([docs.stripe.com/stripe-cli](https://docs.stripe.com/stripe-cli))

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/PiyushDhirwani/take-home-stripe-integration.git
cd take-home-stripe-integration/stripe-integration
npm install
```

### 2. Environment Variables

Create a `.env` file in the `stripe-integration/` directory:

```env
MONGO_URI=mongodb://127.0.0.1:27017/stripe-integration
JWT_SECRET=your_random_secret_string
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CHECKOUT_SUCCESS_URL=http://localhost:3000/success
CHECKOUT_CANCEL_URL=http://localhost:3000/cancel
PORT=3000
```

| Variable | Where to get it |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → API Keys → **Secret key** (starts with `sk_test_`) |
| `STRIPE_WEBHOOK_SECRET` | From running `stripe listen` (starts with `whsec_`) |
| `JWT_SECRET` | Any random string (e.g. run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |

### 3. Start MongoDB

```bash
# macOS (Homebrew)
brew services start mongodb-community@7.0

# Or use Docker
docker run -d -p 27017:27017 mongo:7
```

### 4. Start Stripe Webhook Listener

In a **separate terminal**:

```bash
stripe listen --forward-to localhost:3000/webhook
```

Copy the `whsec_...` secret it prints into your `.env` file.

### 5. Start the App

```bash
npm run start:dev
```

The server runs on `http://localhost:3000`.

## API Documentation

Swagger UI is available at: **http://localhost:3000/api**

## API Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/auth/signup` | Create account & get JWT | No |
| POST | `/auth/login` | Login & get JWT | No |

### Plans
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/plans` | List available plans | No |

### Subscription
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/checkout` | Create Stripe Checkout Session | Bearer |
| GET | `/subscription` | Get current user subscription | Bearer |
| POST | `/subscription/cancel` | Cancel active subscription | Bearer |
| POST | `/subscription/cancel-by-id` | Cancel specific subscription | Bearer |

### Admin (RBAC)
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/admin/subscriptions` | View all subscriptions | Bearer (admin) |

### Webhook
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/webhook` | Stripe webhook handler | Stripe signature |

## Testing

```bash
# Unit tests (20 tests)
npm test

# Integration tests with Supertest (12 tests)
npm run test:e2e

# Test coverage
npm run test:cov
```

## Usage Example (cURL)

```bash
# 1. Signup
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Response: {"accessToken":"eyJhbG..."}

# 2. Get Plans
curl http://localhost:3000/plans

# 3. Create Checkout Session (replace <TOKEN>)
curl -X POST http://localhost:3000/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"planId": "basic"}'

# Response: {"id":"cs_test_...","url":"https://checkout.stripe.com/..."}
# Open the URL in browser, use test card: 4242 4242 4242 4242

# 4. Check Subscription
curl http://localhost:3000/subscription \
  -H "Authorization: Bearer <TOKEN>"

# 5. Cancel Subscription
curl -X POST http://localhost:3000/subscription/cancel \
  -H "Authorization: Bearer <TOKEN>"
```

## Stripe Test Cards

| Card Number | Scenario |
|---|---|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 3220` | 3D Secure required |
| `4000 0000 0000 0002` | Declined |

Use any future expiry date and any 3-digit CVC.

## Project Structure

```
src/
├── auth/              # JWT authentication (signup, login, guards)
├── common/
│   ├── decorators/    # @Roles() decorator
│   ├── filters/       # Global exception filter
│   └── guards/        # RBAC roles guard
├── plans/             # Hardcoded subscription plans
├── stripe/            # Stripe service (lazy-initialized client)
├── subscription/      # Checkout, subscription CRUD, webhook handler
├── users/             # User schema & service (MongoDB)
├── app.module.ts      # Root module
└── main.ts            # Bootstrap (body parser, Swagger, global filter)
```

## MongoDB Collections

The following collections are created **automatically** by Mongoose on first use — no manual setup required:

| Collection | Description |
|---|---|
| `users` | Stores user accounts (email, passwordHash, role) |
| `subscriptions` | Stores subscription records (userId, planId, status, stripeSubscriptionId) |

To verify in `mongosh`:
```bash
mongosh
use stripe-integration
show collections
db.users.find().pretty()
db.subscriptions.find().pretty()
```

## Making a User Admin

```bash
mongosh
use stripe-integration
db.users.updateOne({ email: "user@example.com" }, { $set: { role: "admin" } })
```

## References & Documentation

- [MongoDB Community Download](https://www.mongodb.com/try/download/community)
- [Stripe Checkout Sessions API](https://docs.stripe.com/api/checkout/sessions/object)
- [Stripe Development Dashboard](https://docs.stripe.com/development/dashboard)
- [Stripe Checkout Session Flow (Medium)](https://medium.com/@surajit.das0320/stripe-checkout-session-flow-b83bd87d22e2)
- [Stripe Java - Checkout Session Model](https://stripe.dev/stripe-java/com/stripe/model/checkout/Session.html)
- [How to Install and Setup NestJS (GeeksForGeeks)](https://www.geeksforgeeks.org/javascript/how-to-install-and-setup-first-nestjs-application/)
- [Next.js - Create Next App (GeeksForGeeks)](https://www.geeksforgeeks.org/nextjs/next-js-create-next-app/)

## License

MIT
