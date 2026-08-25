# Sales Book

A simple sales & receipt tracker for your restaurant. Works on any phone,
no app install needed — just a link.

This guide has two parts. Do them in order. Neither costs money.

- **Part 1** — Firebase (5 minutes): where your sales data is stored.
- **Part 2** — Vercel (5 minutes): puts your app online at its own link.

You don't need to know how to code. Just follow the steps.

---

## Part 1: Create your free Firebase project

Firebase is Google's storage service — this is where every sale you record
gets saved, so all your staff see the same numbers on their own phones.

1. Go to https://console.firebase.google.com and sign in with any Google account.
2. Click **Add project**. Give it any name, e.g. `my-restaurant-sales`.
3. You can turn off Google Analytics when asked — you don't need it. Click **Create project**.
4. Once it's ready, click the **web icon** (`</>`) to add a web app. Give it any nickname and click **Register app**.
5. Firebase will show you a block of code with values like this:

   ```
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "my-restaurant-sales.firebaseapp.com",
     projectId: "my-restaurant-sales",
     storageBucket: "my-restaurant-sales.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123",
   };
   ```

   Keep this tab open — you'll need these values in a moment.

6. In the left sidebar, click **Build → Firestore Database → Create database**.
   Choose any region close to you, and start in **test mode** (this lets your
   app read and write data — fine for a small business tool).

7. Now open the file **`src/firebase.js`** in this project, and replace the
   placeholder values with the real ones from step 5. It should look like this
   when you're done:

   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "my-restaurant-sales.firebaseapp.com",
     projectId: "my-restaurant-sales",
     storageBucket: "my-restaurant-sales.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123",
   };
   ```

That's it for Firebase — save the file.

---

## Part 2: Put it online with Vercel

1. Go to https://vercel.com and sign up (you can sign up with GitHub, GitLab, or email).
2. Install the Vercel command-line tool. On your computer, open Terminal
   (Mac) or Command Prompt (Windows) and run:

   ```
   npm install -g vercel
   ```

   (If `npm` isn't recognized, install Node.js first from https://nodejs.org — it's free.)

3. In Terminal, go into this project folder, then run:

   ```
   cd path/to/sales-book-app
   npm install
   vercel
   ```

4. It will ask a few questions — press Enter to accept the defaults each time.
5. When it finishes, it gives you a link like `https://sales-book-xyz.vercel.app`.
   That's your app's permanent address — share that link with your staff.

To publish updates later (after any change), just run `vercel --prod` again
from the same folder.

---

## Using the app day to day

- Open the link on any phone's browser — no install needed.
- Tap the restaurant name at the top to set or change it.
- "New sale" records a transaction and shows a receipt you can screenshot.
- "Today" shows a running total split by Cash and M-Pesa.
- "History" shows every past day.
- Everyone who opens the link sees and adds to the same shared records.

## Working offline

The app is built to keep working with no internet connection:

- You can record sales, view today's totals, and see history with no signal.
- Anything you save offline is queued and automatically synced the moment
  your phone reconnects — nothing is lost.

A few things worth knowing:

- **The very first time** a phone opens the app, it needs internet once to
  download the existing records. After that, it keeps a copy on the phone
  and works fine offline.
- Offline mode works with **one browser tab open at a time**. If you open
  the app in two tabs on the same phone at once, offline saving may not work
  in both.
- If two people add sales offline at the same time on different phones,
  both sales are kept — nothing overwrites the other — they just both show
  up once everyone's back online.

## A note on privacy

Anyone with the link can add or delete sales — same as handing someone the
physical book. Only share the link with staff you trust with the till.
If you ever want to lock it down further (e.g. a password), let me know and
I can help add that.
Deploy trigger