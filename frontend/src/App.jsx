import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  LayoutDashboard,
  BarChart2,
  UserCheck,
  Lightbulb,
  History,
  Settings,
  Send
} from 'lucide-react';
import OverviewTab from './components/OverviewTab';
import AnalyticsTab from './components/AnalyticsTab';
import PersonaTab from './components/PersonaTab';
import IdeaBankTab from './components/IdeaBankTab';
import PostsTab from './components/PostsTab';
import SettingsTab from './components/SettingsTab';
import PostPreviewModal from './components/PostPreviewModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [status, setStatus] = useState({});
  const [config, setConfig] = useState({});
  const [env, setEnv] = useState({});
  const [ideas, setIdeas] = useState([]);
  const [posts, setPosts] = useState([]);

  // Modal & Draft state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDraft, setCurrentDraft] = useState(null);
  const [isDraftLoading, setIsDraftLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const fetchAll = async () => {
    try {
      const [resStatus, resConfig, resIdeas, resPosts] = await Promise.all([
        fetch('/api/status').then(r => r.json()),
        fetch('/api/config').then(r => r.json()),
        fetch('/api/ideas').then(r => r.json()),
        fetch('/api/posts').then(r => r.json())
      ]);

      setStatus(resStatus);
      setConfig(resConfig.config || {});
      setEnv(resConfig.env || {});
      setIdeas(resIdeas);
      setPosts(resPosts);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  useEffect(() => {
    fetchAll();

    // Check OAuth return params
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth_success')) {
      const member = params.get('member') || 'User';
      addToast(`🎉 LinkedIn Connected Successfully as ${member}!`, 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('auth_error')) {
      addToast(`❌ LinkedIn Connection Error: ${params.get('auth_error')}`, 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Save Settings / Persona
  const handleSaveConfig = async (payload) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        addToast('✅ Configuration updated successfully!', 'success');
        await fetchAll();
      } else {
        addToast('❌ Failed to update settings', 'error');
      }
    } catch (e) {
      addToast('❌ Error connecting to backend', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Test Buttons
  const handleTestGemini = async () => {
    addToast('Testing Gemini API...', 'info');
    const res = await fetch('/api/test/gemini', { method: 'POST' }).then(r => r.json());
    if (res.success) {
      addToast(`✅ ${res.message} Reply: ${res.reply}`, 'success');
    } else {
      addToast(`❌ Gemini: ${res.message}`, 'error');
    }
  };

  const handleTestOpenAI = async () => {
    addToast('Testing OpenAI API...', 'info');
    const res = await fetch('/api/test/openai', { method: 'POST' }).then(r => r.json());
    if (res.success) {
      addToast(`✅ ${res.message} Reply: ${res.reply}`, 'success');
    } else {
      addToast(`❌ OpenAI: ${res.message}`, 'error');
    }
  };

  const handleTestCloudinary = async () => {
    addToast('Testing Cloudinary...', 'info');
    const res = await fetch('/api/test/cloudinary', { method: 'POST' }).then(r => r.json());
    if (res.success) {
      addToast('✅ Cloudinary connected successfully!', 'success');
    } else {
      addToast(`❌ Cloudinary: ${res.message}`, 'error');
    }
  };

  const handleTestTelegram = async () => {
    addToast('Sending Telegram test ping...', 'info');
    const res = await fetch('/api/test/telegram', { method: 'POST' }).then(r => r.json());
    if (res.success) {
      addToast('✅ Telegram ping delivered to your chat!', 'success');
    } else {
      addToast(`❌ Telegram: ${res.message}`, 'error');
    }
  };

  const handleAutoDetectTg = async () => {
    addToast('Checking for messages in @Linkedin_Antigravity_bot...', 'info');
    const res = await fetch('/api/telegram/auto-detect').then(r => r.json());
    if (res.found) {
      addToast(`🎉 Detected Chat ID: ${res.chatId} for ${res.senderName}!`, 'success');
      await fetchAll();
    } else {
      addToast(`ℹ️ ${res.message}`, 'info');
    }
  };

  // Ideas
  const handleAddIdea = async (newIdea) => {
    const res = await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newIdea)
    });
    if (res.ok) {
      addToast('✅ Idea saved to bank!', 'success');
      await fetchAll();
    }
  };

  const handleDeleteIdea = async (id) => {
    if (!window.confirm('Delete this idea?')) return;
    const res = await fetch(`/api/ideas/${id}`, { method: 'DELETE' });
    if (res.ok) {
      addToast('Idea removed', 'info');
      await fetchAll();
    }
  };

  const handleAiBrainstorm = async () => {
    setIsGeneratingAi(true);
    addToast('✨ AI is brainstorming 5 architecture topics...', 'info');
    try {
      const res = await fetch('/api/ideas/ai-generate', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        addToast('🎉 Added 5 fresh ideas to your idea bank!', 'success');
        await fetchAll();
      } else {
        addToast(`❌ ${data.error}`, 'error');
      }
    } catch (e) {
      addToast('❌ Brainstorm failed', 'error');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Post Preview & Publish
  const openPreview = async (topic = null, lang = null) => {
    setIsModalOpen(true);
    setIsDraftLoading(true);
    try {
      let targetLang = lang;
      if (!targetLang) {
        if (config.automation?.languageMode === 'EN') targetLang = 'EN';
        else if (config.automation?.languageMode === 'AR') targetLang = 'AR';
        else targetLang = status.automation?.nextLanguage || 'EN';
      }
      const res = await fetch('/api/generate-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, language: targetLang })
      });
      const data = await res.json();
      setCurrentDraft(data.draft);
    } catch (e) {
      addToast('Failed to generate preview', 'error');
    } finally {
      setIsDraftLoading(false);
    }
  };

  const handlePublishFromModal = async () => {
    if (!currentDraft || isPublishing) return;
    setIsPublishing(true);
    addToast('🚀 Publishing previewed post to LinkedIn...', 'info');
    try {
      const res = await fetch('/api/publish-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: currentDraft })
      });
      const data = await res.json();
      setIsModalOpen(false);
      if (data.publishResult?.success) {
        addToast('🎉 Published to LinkedIn successfully!', 'success');
      } else if (data.isDuplicate) {
        addToast(`⚠️ ${data.message}`, 'warning');
      } else {
        addToast(`ℹ️ ${data.publishResult?.message || data.message || 'Saved as draft'}`, 'info');
      }
      await fetchAll();
    } catch (e) {
      addToast('❌ Failed to publish', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyText = () => {
    if (currentDraft?.postText) {
      navigator.clipboard.writeText(currentDraft.postText);
      addToast('📋 Post text copied to clipboard!', 'success');
    }
  };

  // Metrics Save
  const handleSaveMetrics = async (postId, metrics) => {
    const res = await fetch(`/api/posts/${postId}/metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metrics)
    });
    if (res.ok) {
      addToast('✅ Metrics updated! Feedback loop trained.', 'success');
      await fetchAll();
    }
  };

  // CSV Import
  const handleImportCsv = async (csvContent) => {
    addToast('Processing CSV & training voice on top posts...', 'info');
    try {
      const res = await fetch('/api/posts/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent })
      });
      const data = await res.json();
      if (res.ok) {
        addToast(`🎉 ${data.message}`, 'success');
        await fetchAll();
      } else {
        addToast(`❌ ${data.error}`, 'error');
      }
    } catch (e) {
      addToast('❌ Failed to process CSV', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-sans">
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-4 py-2.5 rounded-xl text-white text-xs font-semibold shadow-2xl pointer-events-auto transition-all ${
              t.type === 'success' ? 'bg-emerald-600' : t.type === 'error' ? 'bg-rose-600' : 'bg-blue-600'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                LinkedIn Growth Studio
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                  Fullstack React
                </span>
              </h1>
              <p className="text-xs text-slate-400">Engineering Personal Brand & Recruiter Reach</p>
            </div>
          </div>

          <button
            onClick={() => openPreview()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition shadow-md shadow-blue-600/25 active:scale-95 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Generate & Post Now</span>
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-800 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-2 py-2 overflow-x-auto text-xs font-medium">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'overview' ? 'text-blue-400 bg-blue-500/10 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Overview
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'analytics' ? 'text-blue-400 bg-blue-500/10 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-4 h-4" /> Analytics & Charts
            </button>

            <button
              onClick={() => setActiveTab('persona')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'persona' ? 'text-blue-400 bg-blue-500/10 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" /> Persona & Resume
            </button>

            <button
              onClick={() => setActiveTab('ideas')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'ideas' ? 'text-blue-400 bg-blue-500/10 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lightbulb className="w-4 h-4" /> Idea Bank
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                {status.stats?.pendingIdeas || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('posts')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'posts' ? 'text-blue-400 bg-blue-500/10 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4" /> Posts & Feedback Loop
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                {status.stats?.publishedPosts || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'settings' ? 'text-blue-400 bg-blue-500/10 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings className="w-4 h-4" /> Integrations & Multi-AI
            </button>
          </nav>
        </div>
      </div>

      {/* Main Tab Pane */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {activeTab === 'overview' && (
          <OverviewTab
            status={status}
            config={config}
            posts={posts}
            onOpenPreview={() => openPreview()}
            onPublishNow={() => openPreview()}
            onSwitchTab={setActiveTab}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab posts={posts} />
        )}

        {activeTab === 'persona' && (
          <PersonaTab config={config} onSave={handleSaveConfig} isSaving={isSaving} />
        )}

        {activeTab === 'ideas' && (
          <IdeaBankTab
            ideas={ideas}
            onAddIdea={handleAddIdea}
            onDeleteIdea={handleDeleteIdea}
            onAiBrainstorm={handleAiBrainstorm}
            onDraftIdea={(topic, lang) => openPreview(topic, lang)}
            isGeneratingAi={isGeneratingAi}
          />
        )}

        {activeTab === 'posts' && (
          <PostsTab
            posts={posts}
            onSaveMetrics={handleSaveMetrics}
            onImportCsv={handleImportCsv}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            config={config}
            env={env}
            status={status}
            onSave={handleSaveConfig}
            onTestGemini={handleTestGemini}
            onTestOpenAI={handleTestOpenAI}
            onTestCloudinary={handleTestCloudinary}
            onTestTelegram={handleTestTelegram}
            onAutoDetectTg={handleAutoDetectTg}
            isSaving={isSaving}
          />
        )}
      </main>

      {/* Post Preview & Publish Modal */}
      <PostPreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        draft={currentDraft}
        isLoading={isDraftLoading}
        isPublishing={isPublishing}
        onRegenerate={() => openPreview(null, null)}
        onPublish={handlePublishFromModal}
        onCopy={handleCopyText}
        onUpdateDraftText={(newText) => setCurrentDraft(prev => prev ? ({ ...prev, postText: newText }) : prev)}
      />
    </div>
  );
}
