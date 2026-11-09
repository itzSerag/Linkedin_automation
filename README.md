# LinkedIn Growth & Personal Branding Studio (Fullstack React + Node.js)

An autonomous, engineer-first personal branding pipeline designed to post daily high-impact technical content on LinkedIn to maximize recruiter reach, interviews, and professional engagement.

---

## 🌟 Architecture & Best Practices

* **Frontend:** React 19, Vite, Tailwind CSS, shadcn/ui-inspired primitives, Recharts, and Lucide Icons.
* **Backend:** Node.js, Express, Google GenAI SDK, OpenAI SDK, LinkedIn OAuth 2.0 & UGC Posts API, Cloudinary, Sharp, and node-cron.
* **Analytics Engine:** Interactive graphs for impression velocity, reactions, and Arabic 🇸🇦 vs. English 🇬🇧 reach comparisons.
* **Autonomous Cloud Runner:** GitHub Actions 24/7 cron (`.github/workflows/daily-post.yml`) that posts daily at **08:45 AM Africa/Cairo (The Golden Recruiter Slot)** even if your laptop is completely turned off.
* **AI Hook & Viral Strength Scorer:** Automatically scores posts (1-10) before publishing based on hook curiosity, character count (850-1300), and discussion triggers.
* **Telegram Bot Integration:** Sends instant post confirmations, live LinkedIn links, visual cards, and a 45-minute post-publish alert to reply to comments.

---

## 🚀 Running the Studio

From the project root:

```bash
# Start both Backend API (:3001) and React Frontend (:3000) concurrently:
npm run dev
```

Then open your browser at:
👉 **`http://localhost:3000`**

### Other Handy Scripts
* `npm run build`: Builds the production bundle of the React frontend into `frontend/dist`.
* `npm run server`: Starts only the Node.js API server.
* `npm run client`: Starts only the Vite React frontend.

---

## 📁 Repository Structure

```
Linkedin_automation/
├── backend/
│   ├── src/
│   │   ├── server.js             # Express API & proxy routes
│   │   ├── config.js             # Environment & settings loader
│   │   ├── services/
│   │   │   ├── ai.js             # Gemini & OpenAI multi-model provider
│   │   │   ├── visualCard.js     # Dark-mode technical card generator (Sharp)
│   │   │   ├── cloudinary.js     # Cloudinary CDN uploader
│   │   │   ├── linkedin.js       # LinkedIn OAuth & first-comment publisher
│   │   │   ├── telegram.js       # Real-time alerts with live links & previews
│   │   │   └── scheduler.js      # Daily node-cron scheduler (08:45 AM Cairo)
│   │   └── scripts/
│   │       └── cli-post.js       # Headless CLI for GitHub Actions
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/               # shadcn/ui components (Card, Button, Badge, etc.)
│   │   │   ├── OverviewTab.jsx   # Status badges, quick actions, activity
│   │   │   ├── AnalyticsTab.jsx  # Recharts graphs & engagement metrics
│   │   │   ├── PersonaTab.jsx    # Engineering resume & background editor
│   │   │   ├── IdeaBankTab.jsx   # Topic manager & AI brainstormer
│   │   │   ├── PostsTab.jsx      # Post history, feedback loop, CSV importer
│   │   │   ├── SettingsTab.jsx   # Multi-AI model selection & API keys
│   │   │   └── PostPreviewModal.jsx # Viral score analyzer & preview modal
│   │   ├── App.jsx               # Main React dashboard
│   │   └── index.css             # Tailwind CSS & animations
│   └── vite.config.js
├── data/
│   ├── ideas.json                # Topic idea bank (pending / used)
│   ├── posts.json                # Post history & feedback loop analytics
│   └── inspiration.md            # Reference high-performing posts
├── .github/workflows/
│   └── daily-post.yml            # 24/7 cloud runner for GitHub Actions
└── config.json
```
