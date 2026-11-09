import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, LinkedInIcon } from './ui';
import {
  Cpu,
  CloudLightning,
  Send,
  Clock,
  Lightbulb,
  TrendingUp,
  Sparkles,
  Play,
  Eye,
  ExternalLink,
  Flame
} from 'lucide-react';

export default function OverviewTab({
  status = {},
  config = {},
  posts = [],
  onOpenPreview,
  onPublishNow,
  onSwitchTab
}) {
  const linkedin = status.linkedin || {};
  const ai = status.ai || {};
  const cloudinary = status.cloudinary || {};
  const telegram = status.telegram || {};
  const automation = status.automation || {};
  const stats = status.stats || {};

  const nextLang = automation.nextLanguage === 'AR' ? '🇸🇦 Arabic' : '🇬🇧 English';
  const recentPosts = posts.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* 4 Status Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* LinkedIn */}
        <Card className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
              <LinkedInIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">LinkedIn API</p>
              <p className="text-xs font-semibold text-slate-200">
                {linkedin.isConnected ? `Connected (${linkedin.daysRemaining ?? 60}d left)` : 'Not Connected'}
              </p>
            </div>
          </div>
          <span
            className={`w-2.5 h-2.5 rounded-full ${linkedin.isConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-amber-500'}`}
          />
        </Card>

        {/* AI Model */}
        <Card className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Active AI Model</p>
              <p className="text-xs font-semibold text-slate-200">
                {ai.provider === 'openai' ? `ChatGPT (${ai.openaiModel})` : `Gemini (${ai.geminiModel})`}
              </p>
            </div>
          </div>
          <span
            className={`w-2.5 h-2.5 rounded-full ${ai.isGeminiConfigured || ai.isOpenAIConfigured ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-amber-500'}`}
          />
        </Card>

        {/* Cloudinary */}
        <Card className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <CloudLightning className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Cloudinary Media</p>
              <p className="text-xs font-semibold text-slate-200">
                {cloudinary.isConfigured ? 'CDN Active' : 'Local Fallback'}
              </p>
            </div>
          </div>
          <span
            className={`w-2.5 h-2.5 rounded-full ${cloudinary.isConfigured ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-600'}`}
          />
        </Card>

        {/* Telegram */}
        <Card className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Telegram Bot</p>
              <p className="text-xs font-semibold text-slate-200">
                {telegram.isConfigured ? 'Alerts Active' : 'Disabled'}
              </p>
            </div>
          </div>
          <span
            className={`w-2.5 h-2.5 rounded-full ${telegram.isConfigured ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-600'}`}
          />
        </Card>
      </div>

      {/* Hero Callout */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="default">Autonomous Daily Engine</Badge>
            <Badge variant="purple">Next Post: {nextLang}</Badge>
            <Badge variant="success">Cloud 24/7 Enabled</Badge>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Daily Recruiter Visibility Pipeline
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Posts 1 high-impact engineering post every day alternating between English and Arabic. Generates a dark-mode code/takeaway card, uploads to Cloudinary, adds your GitHub link in the first comment, and alerts you on Telegram. Works 24/7 even when your laptop is turned off via GitHub Actions!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <Button variant="secondary" onClick={onOpenPreview} className="w-full sm:w-auto">
            <Eye className="w-4 h-4 text-slate-400" /> Preview Next Post
          </Button>
          <Button variant="default" onClick={onPublishNow} className="w-full sm:w-auto">
            <Play className="w-4 h-4" /> Publish Next Post
          </Button>
        </div>
      </div>

      {/* Golden Window Banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-300">Golden Slot Strategy Active: 08:45 AM Africa/Cairo</p>
            <p className="text-xs text-slate-400">
              Captures morning Cairo standup commuters, peak Saudi/UAE hiring hours (09:45 AM), and European early feeds.
            </p>
          </div>
        </div>
        <Badge variant="warning" className="hidden sm:inline-flex">High Virality</Badge>
      </div>

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cron Schedule</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white">Daily at 08:45 AM</div>
          <p className="text-xs text-slate-500">Timezone: Africa/Cairo (UTC+2)</p>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Idea Bank</span>
            <Lightbulb className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white">{stats.pendingIdeas || 0} Ideas Available</div>
          <p className="text-xs text-slate-500">Auto-picks next pending topic</p>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Posts Published</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white">{stats.publishedPosts || 0} Posts</div>
          <p className="text-xs text-slate-500">View detailed analytics in Analytics tab</p>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            Recent Post Activity
          </CardTitle>
          <button onClick={() => onSwitchTab('posts')} className="text-xs text-blue-400 hover:text-blue-300 font-medium">
            View All &rarr;
          </button>
        </div>

        <div className="space-y-3">
          {recentPosts.length > 0 ? (
            recentPosts.map((post) => (
              <div
                key={post.id}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-200 line-clamp-1">{post.hook || post.topic}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(post.createdAt).toLocaleDateString()} &bull; {post.language === 'AR' ? 'Arabic' : 'English'} &bull; {post.postText?.length || 0} chars
                  </p>
                </div>
                {post.postUrl && post.postUrl.startsWith('http') ? (
                  <a
                    href={post.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Post
                  </a>
                ) : (
                  <Badge variant="secondary">Draft</Badge>
                )}
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500 italic">No posts published yet. Tap "Preview Next Post" to test!</p>
          )}
        </div>
      </Card>
    </div>
  );
}
