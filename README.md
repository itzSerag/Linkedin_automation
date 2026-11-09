# LinkedIn Growth & Personal Branding Automation Studio

An autonomous, engineer-first personal branding pipeline designed to post daily high-impact technical content on LinkedIn to maximize recruiter reach, interviews, and professional engagement.

---

## 🌟 Key Features

1. **Dual Language Engine (Arabic 🇸🇦 & English 🇬🇧):**
   - Alternates daily between Arabic and English.
   - Smooth Arabic technical discourse with industry terms preserved in Latin letters (*Query, Database, Redis, Connection Pool*).
2. **Interactive Local Web Dashboard (`http://localhost:3000`):**
   - **Persona & Resume Editor:** Configure your name, headline, current role, years of experience (junior/mid-senior), tech stack tags, portfolio, and resume bio.
   - **Idea Bank:** Add ideas manually or click **"✨ AI Brainstorm 5 Ideas"** to generate fresh architecture topics.
   - **LinkedIn 1-Click OAuth Connect:** Automatically handles token exchange, stores your Member ID, and tracks token expiry (60 days).
   - **Post History & Analytics Loop:** Record views and reactions to train your writing style.
3. **Automated Visual Card Engine:**
   - Automatically generates 1200x630 dark-mode technical graphics (syntax-highlighted code snapshots or 3 core takeaway bullet cards) using `sharp`.
4. **Cloudinary Media Hosting:**
   - All generated visual cards are uploaded to Cloudinary CDN and attached to your LinkedIn posts.
5. **Zero External Links in Post Body:**
   - Automatically publishes your GitHub / portfolio link in the **first comment** 4 seconds after posting.
6. **Real-time Telegram Alerts:**
   - Sends you an instant notification with the direct post URL, snippet, and image preview whenever a post is published.
7. **Configurable Daily Scheduler:**
   - Built-in `node-cron` runner with timezone support (e.g. daily at 10:00 AM Cairo time).

---

## 🚀 Quick Start Guide

### 1. Start the Studio
From the project folder, run:
```bash
npm start
```
Then open your browser at:
👉 **`http://localhost:3000`**

---

### 2. Connect Your LinkedIn Account (1-Click)

Your LinkedIn App credentials have already been configured in `.env`:
* **Client ID:** `78rbhrm4ar71mn`
* **Redirect URI:** `http://localhost:3000/api/auth/linkedin/callback`

**Important check in LinkedIn Developer Portal:**
1. Open [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps).
2. Click your App $\rightarrow$ **Auth** tab.
3. Under **Authorized redirect URLs for your app**, ensure you added:
   `http://localhost:3000/api/auth/linkedin/callback`
4. Under **Products** tab, verify **Share on LinkedIn** and **Sign In with LinkedIn using OpenID Connect** are approved.
5. Open your Dashboard at `http://localhost:3000` $\rightarrow$ Go to **Integrations & Auth** $\rightarrow$ Click **"Connect LinkedIn Account (1-Click)"**.

Once connected, your Member ID and 60-day token countdown will appear on the Dashboard!

---

### 3. Add Free API Keys

In the **Integrations & Auth** tab of the dashboard:
* **Gemini API Key:** Get your free key at [Google AI Studio](https://aistudio.google.com/). Click **Test Gemini** to verify.
* **Cloudinary CDN:** Get free credentials at [Cloudinary](https://cloudinary.com/) (Cloud Name, API Key, API Secret). Click **Test Cloudinary** to verify. *(If left empty, images are saved locally as fallback).*
* **Telegram Notifications:**
  1. Create a bot with [@BotFather](https://t.me/botfather) and copy the Bot Token.
  2. Send `/start` to your bot, then message [@userinfobot](https://t.me/userinfobot) to get your numerical Chat ID.
  3. Paste both into the dashboard and click **Test Telegram**.

---

### 4. How to Run & Schedule

* **Test Preview:** Tap **"Preview Next Post"** on the dashboard to inspect the Gemini-generated post and first comment before posting.
* **Publish Now:** Tap **"Generate & Post Now"** to execute the entire pipeline immediately.
* **Autonomous Cron:** In **Integrations & Auth**, set **Auto-Schedule** to **Enabled**. The app will run daily at the specified time (default: 10:00 AM).

---

## 📁 Project Architecture

```
Linkedin_automation/
├── .env                       # App secrets & tokens (auto-updated by dashboard)
├── config.json               # Profile settings, tech stack, resume, cron schedule
├── data/
│   ├── ideas.json            # Topic idea bank (pending / used)
│   ├── posts.json            # Post history & feedback loop analytics
│   └── inspiration.md        # Reference high-performing posts for voice training
├── src/
│   ├── server.js             # Express API & Dashboard backend
│   ├── config.js             # Configuration & environment manager
│   ├── services/
│   │   ├── gemini.js         # Gemini 2.5 Flash engineering content writer
│   │   ├── visualCard.js     # High-converting dark mode technical card generator
│   │   ├── cloudinary.js     # Cloudinary media uploader
│   │   ├── linkedin.js       # LinkedIn OAuth 2.0, post & comment publisher
│   │   ├── telegram.js       # Real-time alerts with live links & previews
│   │   └── scheduler.js      # Daily node-cron scheduler
│   └── public/               # Modern Dashboard frontend (HTML5, Tailwind, JS)
└── package.json
```
