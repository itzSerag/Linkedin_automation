import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Select, Badge, LinkedInIcon } from './ui';
import {
  Settings,
  Cpu,
  Cloud,
  Send,
  ExternalLink,
  FlaskConical,
  Check,
  Scan
} from 'lucide-react';

export default function SettingsTab({
  config = {},
  env = {},
  status = {},
  onSave,
  onTestGemini,
  onTestOpenAI,
  onTestCloudinary,
  onTestTelegram,
  onAutoDetectTg,
  isSaving
}) {
  const [aiProvider, setAiProvider] = useState('gemini');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-pro');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o');

  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [cloudName, setCloudName] = useState('');
  const [cloudKey, setCloudKey] = useState('');
  const [cloudSecret, setCloudSecret] = useState('');
  const [tgToken, setTgToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');

  const [autoSchedule, setAutoSchedule] = useState('false');
  const [cronSchedule, setCronSchedule] = useState('45 8 * * *');
  const [langMode, setLangMode] = useState('alternate');
  const [autoFirstComment, setAutoFirstComment] = useState('true');
  const [goldenHourAlert, setGoldenHourAlert] = useState('true');

  const [endingStyle, setEndingStyle] = useState('strong_conclusion');
  const [includeGithubInComment, setIncludeGithubInComment] = useState('false');

  useEffect(() => {
    if (config.ai) {
      setAiProvider(config.ai.provider || 'gemini');
      setGeminiModel(config.ai.geminiModel || 'gemini-2.5-pro');
      setOpenaiModel(config.ai.openaiModel || 'gpt-4o');
    }
    if (config.style) {
      setEndingStyle(config.style.endingStyle || 'strong_conclusion');
      setIncludeGithubInComment(String(config.style.includeGithubInComment ?? false));
    }
    if (config.automation) {
      setAutoSchedule(String(config.automation.enabled ?? false));
      setCronSchedule(config.automation.cronSchedule || '45 8 * * *');
      setLangMode(config.automation.languageMode || 'alternate');
      setAutoFirstComment(String(config.automation.autoPostFirstComment ?? true));
      setGoldenHourAlert(String(config.automation.goldenHourAlert ?? true));
    }
    if (env) {
      setGeminiKey(env.GEMINI_API_KEY || '');
      setOpenaiKey(env.OPENAI_API_KEY || '');
      setCloudName(env.CLOUDINARY_CLOUD_NAME || '');
      setCloudKey(env.CLOUDINARY_API_KEY || '');
      setTgToken(env.TELEGRAM_BOT_TOKEN || '');
      setTgChatId(env.TELEGRAM_CHAT_ID || '');
    }
  }, [config, env]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ai: { provider: aiProvider, geminiModel, openaiModel },
      style: {
        endingStyle,
        includeGithubInComment: includeGithubInComment === 'true',
        preserveEnglishConcepts: true,
        tone: 'Ultra-human, pragmatic, engineering-first, zero corporate buzzwords'
      },
      automation: {
        enabled: autoSchedule === 'true',
        cronSchedule,
        languageMode: langMode,
        autoPostFirstComment: autoFirstComment === 'true',
        goldenHourAlert: goldenHourAlert === 'true'
      },
      envUpdates: {
        GEMINI_API_KEY: geminiKey,
        OPENAI_API_KEY: openaiKey,
        CLOUDINARY_CLOUD_NAME: cloudName,
        CLOUDINARY_API_KEY: cloudKey,
        CLOUDINARY_API_SECRET: cloudSecret,
        TELEGRAM_BOT_TOKEN: tgToken,
        TELEGRAM_CHAT_ID: tgChatId
      }
    });
  };

  const linkedin = status.linkedin || {};

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            Integrations & Multi-AI Controls
          </h2>
          <p className="text-xs text-slate-400">
            Configure Google Gemini, ChatGPT, LinkedIn OAuth, Cloudinary, and Telegram.
          </p>
        </div>
        <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save All Settings'}</span>
        </Button>
      </div>

      <div className="space-y-6">
        {/* Multi-AI Model Selection */}
        <Card className="p-6 border-emerald-500/30 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">AI Content Generation Engine</h3>
                <p className="text-xs text-slate-400">Choose between Google Gemini or OpenAI ChatGPT</p>
              </div>
            </div>
            <Badge variant="success">Multi-Model Engine</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Primary AI Provider</label>
              <Select value={aiProvider} onChange={(e) => setAiProvider(e.target.value)}>
                <option value="gemini">Google Gemini (Free tier available)</option>
                <option value="openai">OpenAI ChatGPT</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Gemini Model</label>
              <Select value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)}>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Senior Voice)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra Fast)</option>
                <option value="gemini-3.8-flash">Gemini 3.8 Flash (Preview)</option>
                <option value="gemini-2.0-flash-thinking-exp">Gemini 2.0 Flash Thinking</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">ChatGPT Model</label>
              <Select value={openaiModel} onChange={(e) => setOpenaiModel(e.target.value)}>
                <option value="gpt-4o">GPT-4o (Flagship - Recommended)</option>
                <option value="gpt-4o-mini">GPT-4o Mini (Fast & Cheap)</option>
                <option value="o3-mini">o3-mini (High Technical Reasoning)</option>
                <option value="o1">o1 (Full Reasoning)</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800">
            {/* Gemini Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-400">Google Gemini API Key</label>
                <button
                  type="button"
                  onClick={onTestGemini}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <FlaskConical className="w-3 h-3" /> Test Gemini
                </button>
              </div>
              <Input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="font-mono text-xs"
              />
              <p className="text-xs text-slate-500">
                Get free key from <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-blue-400 underline">aistudio.google.com</a>
              </p>
            </div>

            {/* OpenAI Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-400">OpenAI API Key (ChatGPT)</label>
                <button
                  type="button"
                  onClick={onTestOpenAI}
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  <FlaskConical className="w-3 h-3" /> Test OpenAI
                </button>
              </div>
              <Input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="font-mono text-xs"
              />
              <p className="text-xs text-slate-500">
                Get key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-purple-400 underline">platform.openai.com</a>
              </p>
            </div>
          </div>
        </Card>

        {/* LinkedIn OAuth */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center font-bold">
                <LinkedInIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">LinkedIn Official API Connection</h3>
                <p className="text-xs text-slate-400">OAuth 2.0 with w_member_social scope for posting and media</p>
              </div>
            </div>
            <Badge variant={linkedin.isConnected ? 'success' : 'warning'}>
              {linkedin.isConnected ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Client ID</label>
              <Input value={env.LINKEDIN_CLIENT_ID || '78rbhrm4ar71mn'} readOnly className="font-mono text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Authorized Redirect URI</label>
              <Input value={env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/api/auth/linkedin/callback'} readOnly className="font-mono text-xs" />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              {linkedin.isConnected ? (
                <span>Connected to Member ID: <code>{linkedin.memberId}</code> &bull; Valid for <b>{linkedin.daysRemaining ?? 60} days</b>.</span>
              ) : (
                <span>Tokens last 60 days. Connect once to automatically store the token.</span>
              )}
            </div>
            <a
              href="/api/auth/linkedin/url"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition shadow-lg shadow-blue-600/20"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Connect LinkedIn Account (1-Click)</span>
            </a>
          </div>
        </Card>

        {/* Telegram Notifications */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Telegram Notifications</h3>
                <p className="text-xs text-slate-400">Sends instant post confirmation, live LinkedIn link, and visual card</p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onTestTelegram} className="flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5" /> Test Telegram
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Telegram Bot Token (from @BotFather)</label>
              <Input
                type="password"
                value={tgToken}
                onChange={(e) => setTgToken(e.target.value)}
                placeholder="8952730984:AAHg..."
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-400">Your Telegram Chat ID</label>
                <button
                  type="button"
                  onClick={onAutoDetectTg}
                  className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
                >
                  <Scan className="w-3 h-3" /> Auto-Detect
                </button>
              </div>
              <Input
                value={tgChatId}
                onChange={(e) => setTgChatId(e.target.value)}
                placeholder="8454017635"
                className="font-mono text-xs"
              />
            </div>
          </div>
        </Card>

        {/* Cloudinary CDN */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Cloudinary CDN Media Storage</h3>
                <p className="text-xs text-slate-400">Hosts all generated visual cards and post media</p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onTestCloudinary} className="flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5" /> Test Cloudinary
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Cloud Name</label>
              <Input value={cloudName} onChange={(e) => setCloudName(e.target.value)} placeholder="demo-cloud" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">API Key</label>
              <Input value={cloudKey} onChange={(e) => setCloudKey(e.target.value)} placeholder="API Key" className="font-mono text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">API Secret</label>
              <Input type="password" value={cloudSecret} onChange={(e) => setCloudSecret(e.target.value)} placeholder="API Secret" className="font-mono text-xs" />
            </div>
          </div>
        </Card>

        {/* Human Voice & Post Style */}
        <Card className="p-6 border-blue-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Human Voice & Post Structure Rules
            </h3>
            <Badge variant="default">Anti-AI Fluff</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Post Ending Style</label>
              <Select value={endingStyle} onChange={(e) => setEndingStyle(e.target.value)}>
                <option value="strong_conclusion">Strong Engineering Conclusion (No Question - 100% Human)</option>
                <option value="question">Thought-Provoking Question (Interactive)</option>
                <option value="mixed">Mixed / Alternating</option>
              </Select>
              <p className="text-xs text-slate-500">Eliminates robotic "What do you think?" endings.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Include GitHub Link in 1st Comment</label>
              <Select value={includeGithubInComment} onChange={(e) => setIncludeGithubInComment(e.target.value)}>
                <option value="false">No (Clean / Zero self-promotion in comment)</option>
                <option value="true">Yes (Post GitHub / Portfolio link in 1st comment)</option>
              </Select>
              <p className="text-xs text-slate-500">Keeps posts non-promotional when disabled.</p>
            </div>

            <div className="sm:col-span-2 p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-200">Preserve Technical Terms in English</span>
                <p className="text-xs text-slate-500">
                  In Arabic posts, terms like <code>PostgreSQL</code>, <code>Redis</code>, <code>Connection Pool</code>, <code>Index</code>, <code>Race Condition</code>, and <code>Query</code> will always stay in English with Latin letters.
                </p>
              </div>
              <Badge variant="success">Always Active</Badge>
            </div>
          </div>
        </Card>

        {/* Scheduling Rules */}
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">Scheduler & Golden Slot Rules</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Auto-Schedule Status</label>
              <Select value={autoSchedule} onChange={(e) => setAutoSchedule(e.target.value)}>
                <option value="false">Disabled (Manual Only)</option>
                <option value="true">Enabled (Autonomous Cron)</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Daily Post Time (Cron)</label>
              <Input value={cronSchedule} onChange={(e) => setCronSchedule(e.target.value)} className="font-mono text-xs" />
              <p className="text-xs text-slate-500">Default: `45 8 * * *` (08:45 AM Cairo - Golden Recruiter Slot)</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Language Mode</label>
              <Select value={langMode} onChange={(e) => setLangMode(e.target.value)}>
                <option value="alternate">Alternate Daily (AR &harr; EN)</option>
                <option value="EN">Always English</option>
                <option value="AR">Always Arabic</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Golden 1st Hour Engagement Reminder</label>
              <Select value={goldenHourAlert} onChange={(e) => setGoldenHourAlert(e.target.value)}>
                <option value="true">Yes (Telegram alert 45m after posting to reply to comments)</option>
                <option value="false">No</option>
              </Select>
            </div>
          </div>
        </Card>
      </div>
    </form>
  );
}
