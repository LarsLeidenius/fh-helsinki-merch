# FH Helsinki Merch: Drop 01

Public voting page for the Founders House Helsinki shirts. Anyone with the link can vote, no account needed.

- `index.html`: the page
- `tees/`, `logos/`: shirt cut-outs and official FH logos (keep files inside these folders)
- `api/votes.js`: the vote counter (runs on Vercel)
- `package.json`: tells Vercel to install the database client

## Put it live (about 15 minutes, all free)

### 1. Upload to GitHub
1. Make a free account at github.com.
2. Click **+** (top right) → **New repository**. Name it `fh-helsinki-merch`. Public or Private both work. Click **Create repository**.
3. On the empty repo page, click **uploading an existing file**.
4. Drag in **everything inside this folder** (`index.html`, `package.json`, `README.md`, and the `api`, `logos` and `tees` folders). Don't drag the folder itself.
5. Click **Commit changes**.

### 2. Publish with Vercel
1. Go to vercel.com → **Sign up** → **Continue with GitHub**.
2. **Add New… → Project** → find `fh-helsinki-merch` → **Import**.
3. Framework Preset: **Other**. Leave everything else as it is → **Deploy**.
4. You get a link like `fh-helsinki-merch.vercel.app`. The page shows now, but votes won't work until step 3.

### 3. Add the vote database
1. In your Vercel project, open the **Storage** tab → **Create Database** (or **Browse Marketplace**) → choose **Upstash → Redis** (free plan) → create it.
2. When asked, **connect it to this project** (all environments).
3. Go to **Deployments** → the latest one → **⋯ → Redeploy**. This is needed so the site picks up the database keys.
4. Open your link, vote on a shirt, and reload. The vote should still be there.

### 4. Optional: your own address
Project → **Settings → Domains** → add e.g. `merch.foundershouse.fi` and follow the DNS instructions.

## Changing the page later
Edit or re-upload files in the GitHub repo. Vercel publishes every change automatically within a minute.

## Good to know
- One vote per shirt per browser. Someone could vote again from another browser or a private window. Fine for a merch vote, not for anything binding.
- To reset all votes: Vercel → Storage → your Redis database → open it in Upstash → **Data Browser** → delete all keys.
- Vercel's free Hobby plan is meant for non-commercial use. If FH starts selling through this page, move to the Pro plan.
