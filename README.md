# LinkedIn Growth Studio

A local React dashboard and Node.js API for drafting, previewing, and publishing LinkedIn posts, with a GitHub Actions workflow for scheduled publishing.

## Run locally

Requires Node.js 22 or later.

From the project root:

```bash
npm run dev
```

Open `http://localhost:3000`. The Vite frontend proxies API and media requests to the Node server on port `3001`.

Other commands:

- `npm run build` builds the React frontend into `frontend/dist`.
- `npm run server` starts the Node server and serves `frontend/dist` when it has been built.
- `npm run client` starts only the Vite frontend; it expects the API server on port `3001`.

## Scheduled publishing

GitHub Actions is the sole scheduled runner. The local server does not start a second timer. The schedule is defined in `.github/workflows/daily-post.yml` using UTC; edit that workflow to change the run time. The **Automated Publishing** setting in the dashboard enables or pauses the workflow’s publishing pipeline.

Workflow runs share a concurrency group, and the pipeline skips scheduled runs when automation is disabled, LinkedIn is disconnected, or the AI provider only returns fallback text. Fallback text remains available as a preview and cannot be published.

The workflow needs the LinkedIn, AI provider, and optional Cloudinary and Telegram credentials configured as GitHub repository secrets. It commits updated post history, ideas, and language rotation back to the repository. Commit and push `config.json` after changing the persona, writing prompt, or visual preferences if you want scheduled posts to use them.

## Project layout

```text
src/
  server.js               Express API and local static serving
  config.js               JSON and environment persistence
  services/
    gemini.js             Gemini/OpenAI generation and connection checks
    scheduler.js          Shared scheduled and manual post pipeline
    linkedin.js           OAuth and LinkedIn publishing
    visualCard.js         Post image generation
    cloudinary.js         Image upload and local fallback
    telegram.js           Notifications
  scripts/cli-post.js     GitHub Actions entry point
  public/media/           Generated local media files
frontend/
  src/                    React dashboard and components
data/
  ideas.json              Topic idea bank
  posts.json              Post history and engagement metrics
  inspiration.md          Imported reference posts
.github/workflows/
  daily-post.yml          Scheduled GitHub Actions runner
```

The older standalone HTML files under `src/public` are no longer served as a dashboard fallback; the React app is the active UI.
