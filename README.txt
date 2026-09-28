OM BANNA REAL STORE SETUP

This project is the production-ready STARTER architecture, but it cannot be fully live until you create your own accounts/keys.

1. SUPABASE
Create a Supabase project, then open SQL Editor and run supabase/schema.sql.
Supabase provides Auth + Postgres database. Put the project's URL and publishable key in config.js.
Do NOT put service_role keys in browser code.

2. AUTH
Enable Email/Password in Supabase Authentication. Signup/login in the site uses Supabase Auth.
You can enable/disable email confirmations in the Auth settings.

3. PRODUCTS
Admin page can insert products after you add proper admin RLS. For a public production site,
do NOT leave product INSERT open to everyone.

4. PAYMENT
For automatic UPI verification, connect a payment provider with server-side order creation
and signed webhook verification. Razorpay documents payment webhooks and backend signature validation.
The static QR image cannot perform automatic verification.
Keep API secret only in a server/Edge Function secret.
The exact payment provider account and onboarding/KYC requirements are outside this code.

5. DEPLOYMENT
Host the static files on a static host such as GitHub Pages, Netlify, or Cloudflare Pages.
Connect ombannajewellerystore.com at your domain registrar.

6. IMPORTANT
Do not treat a browser redirect as proof of payment. Only a verified server-side payment event
should change payment_status to paid.

Files:
index.html
style.css
config.js
app.js
admin.html
assets/upi-qr.jpg
supabase/schema.sql
supabase/payment-function-setup.txt
