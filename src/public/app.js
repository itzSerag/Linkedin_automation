// Client-side Application Logic for LinkedIn Automation Studio

let currentConfig = null;
let currentStatus = null;
let currentDraft = null;

document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  checkAuthParams();
  await refreshAll();
  setupEventListeners();
  lucide.createIcons();
});

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-blue-600';
  toast.className = `${bg} text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0 pointer-events-auto`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Tab navigation
function initTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      switchTab(targetId);
    });
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('text-blue-400', 'bg-blue-500/10');
    b.classList.add('text-slate-400');
  });

  const targetPane = document.getElementById(tabId);
  if (targetPane) targetPane.classList.remove('hidden');

  const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
  if (activeBtn) {
    activeBtn.classList.remove('text-slate-400');
    activeBtn.classList.add('text-blue-400', 'bg-blue-500/10');
  }

  lucide.createIcons();
}

// Check OAuth callback parameters in URL
function checkAuthParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('auth_success')) {
    const member = params.get('member') || 'User';
    showToast(`🎉 LinkedIn Connected Successfully as ${member}!`, 'success');
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (params.get('auth_error')) {
    showToast(`❌ LinkedIn Connection Error: ${params.get('auth_error')}`, 'error');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// Refresh all dashboard data
async function refreshAll() {
  await Promise.all([
    fetchStatus(),
    fetchConfig(),
    fetchIdeas(),
    fetchPosts()
  ]);
  lucide.createIcons();
}

// 1. Fetch System Status
async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    currentStatus = data;

    // LinkedIn
    const liText = document.getElementById('statusLinkedinText');
    const liPill = document.getElementById('statusLinkedinPill');
    const liBadge = document.getElementById('settingsLinkedinBadge');
    const liExpiry = document.getElementById('linkedinTokenExpiryText');

    if (data.linkedin.isConnected) {
      const days = data.linkedin.daysRemaining !== null ? `${data.linkedin.daysRemaining} days remaining` : 'Active';
      liText.innerText = `Connected (${days})`;
      liPill.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50';
      liBadge.innerText = 'Connected';
      liBadge.className = 'text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      if (liExpiry && data.linkedin.daysRemaining !== null) {
        liExpiry.innerHTML = `Connected to Member ID: <code>${data.linkedin.memberId}</code> &bull; Token valid for <b>${data.linkedin.daysRemaining} days</b>.`;
      }
    } else {
      liText.innerText = 'Not Connected';
      liPill.className = 'w-2.5 h-2.5 rounded-full bg-amber-500';
      liBadge.innerText = 'Not Connected';
      liBadge.className = 'text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20';
    }

    // Gemini
    const gemText = document.getElementById('statusGeminiText');
    const gemPill = document.getElementById('statusGeminiPill');
    if (data.gemini.isConfigured) {
      gemText.innerText = 'Active (Gemini 2.5)';
      gemPill.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50';
    } else {
      gemText.innerText = 'API Key Missing';
      gemPill.className = 'w-2.5 h-2.5 rounded-full bg-amber-500';
    }

    // Cloudinary
    const cldText = document.getElementById('statusCloudinaryText');
    const cldPill = document.getElementById('statusCloudinaryPill');
    if (data.cloudinary.isConfigured) {
      cldText.innerText = `Connected (${data.cloudinary.cloudName})`;
      cldPill.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50';
    } else {
      cldText.innerText = 'Using Local Storage';
      cldPill.className = 'w-2.5 h-2.5 rounded-full bg-slate-600';
    }

    // Telegram
    const tgText = document.getElementById('statusTelegramText');
    const tgPill = document.getElementById('statusTelegramPill');
    if (data.telegram.isConfigured) {
      tgText.innerText = 'Alerts Enabled';
      tgPill.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50';
    } else {
      tgText.innerText = 'Disabled';
      tgPill.className = 'w-2.5 h-2.5 rounded-full bg-slate-600';
    }

    // Badges & Counters
    document.getElementById('badgePendingIdeas').innerText = data.stats.pendingIdeas;
    document.getElementById('statIdeasCount').innerText = `${data.stats.pendingIdeas} Ideas Available`;
    document.getElementById('badgePublishedPosts').innerText = data.stats.publishedPosts;

    const nextLang = data.automation?.nextLanguage === 'AR' ? '🇸🇦 Arabic' : '🇬🇧 English';
    document.getElementById('nextLanguageBadge').innerText = `Next Post: ${nextLang}`;

  } catch (error) {
    console.error('Error fetching status:', error);
  }
}

// 2. Fetch Config & Profile
async function fetchConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    currentConfig = data.config;

    // Populate Persona
    const prof = data.config.profile || {};
    document.getElementById('profName').value = prof.name || '';
    document.getElementById('profHeadline').value = prof.headline || '';
    document.getElementById('profRole').value = prof.currentRole || '';
    document.getElementById('profExp').value = prof.yearsOfExperience || 'Junior to Mid-Senior';
    document.getElementById('profStack').value = prof.primaryTechStack || '';
    document.getElementById('profGithub').value = prof.githubUrl || '';
    document.getElementById('profPortfolio').value = prof.portfolioUrl || '';
    document.getElementById('profBio').value = prof.resumeBio || '';

    // Populate Settings
    const env = data.env || {};
    document.getElementById('setLinkedinClientId').value = env.LINKEDIN_CLIENT_ID || '';
    document.getElementById('setLinkedinRedirect').value = env.LINKEDIN_REDIRECT_URI || '';
    document.getElementById('setGeminiKey').value = env.GEMINI_API_KEY || '';
    document.getElementById('setCloudName').value = env.CLOUDINARY_CLOUD_NAME || '';
    document.getElementById('setCloudKey').value = env.CLOUDINARY_API_KEY || '';
    document.getElementById('setCloudSecret').value = '';
    document.getElementById('setTgToken').value = env.TELEGRAM_BOT_TOKEN || '';
    document.getElementById('setTgChatId').value = env.TELEGRAM_CHAT_ID || '';

    // Automation
    const auto = data.config.automation || {};
    document.getElementById('setAutoSchedule').value = String(auto.enabled ?? false);
    document.getElementById('setCronSchedule').value = auto.cronSchedule || '0 10 * * *';
    document.getElementById('setLangMode').value = auto.languageMode || 'alternate';
    document.getElementById('setAutoFirstComment').value = String(auto.autoPostFirstComment ?? true);

    document.getElementById('statSchedule').innerText = auto.enabled ? `Cron: ${auto.cronSchedule}` : 'Manual Trigger Only';
    document.getElementById('statTimezone').innerText = `Timezone: ${auto.timezone || 'Africa/Cairo'}`;

    // Update LinkedIn Connect URL
    const authUrlRes = await fetch('/api/auth/linkedin/url');
    const authUrlData = await authUrlRes.json();
    document.getElementById('btnConnectLinkedIn').href = authUrlData.url;

  } catch (error) {
    console.error('Error fetching config:', error);
  }
}

// 3. Fetch Ideas
async function fetchIdeas() {
  try {
    const res = await fetch('/api/ideas');
    const ideas = await res.json();
    const container = document.getElementById('ideasList');
    container.innerHTML = '';

    if (ideas.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-slate-500 bg-dark-card rounded-xl border border-dark-border text-xs">Idea bank is empty. Tap "Add Idea" or "AI Brainstorm" to populate ideas!</div>`;
      return;
    }

    ideas.forEach(idea => {
      const isPending = idea.status === 'pending';
      const langBadge = idea.language === 'AR' ? '🇸🇦 Arabic' : '🇬🇧 English';
      const card = document.createElement('div');
      card.className = `p-4 rounded-xl bg-dark-card border ${isPending ? 'border-dark-border' : 'border-dark-border opacity-50'} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`;
      card.innerHTML = `
        <div class="space-y-1 max-w-3xl">
          <div class="flex items-center gap-2">
            <span class="text-xs px-2 py-0.5 rounded-full ${idea.language === 'AR' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'} font-semibold">${langBadge}</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">${idea.category || 'Tech'}</span>
            <span class="text-xs px-2 py-0.5 rounded-full ${isPending ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}">${isPending ? 'Pending' : 'Used'}</span>
          </div>
          <p class="text-sm font-medium text-slate-200">${idea.topic}</p>
        </div>
        <div class="flex items-center gap-2 self-end sm:self-center">
          ${isPending ? `<button onclick="triggerDraftForIdea('${encodeURIComponent(idea.topic)}', '${idea.language}')" class="px-2.5 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-xs font-medium transition flex items-center gap-1"><i data-lucide="sparkles" class="w-3.5 h-3.5"></i> Draft</button>` : ''}
          <button onclick="deleteIdea('${idea.id}')" class="p-1.5 rounded-lg bg-dark-hover hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-xs transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
      `;
      container.appendChild(card);
    });

  } catch (error) {
    console.error('Error fetching ideas:', error);
  }
}

// 4. Fetch Posts
async function fetchPosts() {
  try {
    const res = await fetch('/api/posts');
    const posts = await res.json();
    const container = document.getElementById('postsHistoryList');
    const miniContainer = document.getElementById('miniPostsList');

    container.innerHTML = '';
    miniContainer.innerHTML = '';

    let totalImpressions = 0;

    if (posts.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-slate-500 bg-dark-card rounded-xl border border-dark-border text-xs">No posts generated yet. Tap "Generate & Post Now" to create your first post!</div>`;
      return;
    }

    posts.forEach((post, idx) => {
      totalImpressions += (post.metrics?.impressions || 0);

      // Populate Full History Card
      const card = document.createElement('div');
      card.className = 'p-6 rounded-xl bg-dark-card border border-dark-border space-y-4';
      const langBadge = post.language === 'AR' ? '🇸🇦 Arabic' : '🇬🇧 English';

      card.innerHTML = `
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-dark-border pb-3">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full ${post.language === 'AR' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}">${langBadge}</span>
            <span class="text-xs text-slate-400">${new Date(post.createdAt).toLocaleDateString()}</span>
            ${post.publishedToLinkedIn ? `<span class="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">Published on LinkedIn</span>` : `<span class="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">Local Draft</span>`}
          </div>
          ${post.postUrl && post.postUrl.startsWith('http') ? `<a href="${post.postUrl}" target="_blank" class="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"><i data-lucide="external-link" class="w-3.5 h-3.5"></i> Open in LinkedIn</a>` : ''}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Text Preview -->
          <div class="md:col-span-2 space-y-2">
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hook</p>
            <p class="text-sm font-bold text-white">"${post.hook || ''}"</p>
            <div class="p-3 rounded-lg bg-dark-base border border-dark-border text-xs text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto font-sans leading-relaxed">${post.postText}</div>
            ${post.firstCommentText ? `<p class="text-xs text-slate-400 mt-2"><b>1st Comment:</b> <span class="italic text-slate-300">${post.firstCommentText}</span></p>` : ''}
          </div>

          <!-- Media / Card Preview -->
          <div class="space-y-2">
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Visual Card</p>
            ${post.mediaUrl ? `
              <img src="${post.mediaUrl}" alt="Post Visual" class="w-full h-auto rounded-lg border border-dark-border object-cover shadow-md hover:scale-105 transition duration-200">
              <a href="${post.mediaUrl}" target="_blank" class="block text-center text-xs text-blue-400 hover:underline pt-1">View Full Media</a>
            ` : `<div class="p-8 text-center text-xs text-slate-500 bg-dark-base rounded-lg border border-dark-border">No Media Card</div>`}
          </div>
        </div>

        <!-- Metrics Recorder (Learning Loop) -->
        <div class="pt-3 border-t border-dark-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-dark-base/40 p-3 rounded-lg">
          <div class="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <i data-lucide="bar-chart-2" class="w-4 h-4 text-emerald-400"></i>
            <span>Log Engagement for Learning Loop:</span>
          </div>
          <div class="flex items-center gap-3 w-full sm:w-auto">
            <div class="flex items-center gap-1">
              <span class="text-xs text-slate-400">Views:</span>
              <input type="number" id="imp_${post.id}" value="${post.metrics?.impressions || 0}" class="w-20 px-2 py-1 rounded bg-dark-card border border-dark-border text-xs text-slate-200 text-center">
            </div>
            <div class="flex items-center gap-1">
              <span class="text-xs text-slate-400">Reactions:</span>
              <input type="number" id="react_${post.id}" value="${post.metrics?.reactions || 0}" class="w-16 px-2 py-1 rounded bg-dark-card border border-dark-border text-xs text-slate-200 text-center">
            </div>
            <button onclick="saveMetrics('${post.id}')" class="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition">Save</button>
          </div>
        </div>
      `;
      container.appendChild(card);

      // Mini list (first 3 posts)
      if (idx < 3) {
        const miniCard = document.createElement('div');
        miniCard.className = 'p-3 rounded-lg bg-dark-base border border-dark-border flex items-center justify-between gap-2';
        miniCard.innerHTML = `
          <div class="space-y-0.5">
            <p class="text-xs font-semibold text-slate-200 line-clamp-1">${post.hook || post.topic}</p>
            <p class="text-xs text-slate-500">${new Date(post.createdAt).toLocaleDateString()} &bull; ${post.language === 'AR' ? 'Arabic' : 'English'}</p>
          </div>
          ${post.postUrl && post.postUrl.startsWith('http') ? `<a href="${post.postUrl}" target="_blank" class="text-xs text-blue-400 hover:underline flex items-center gap-1"><i data-lucide="external-link" class="w-3.5 h-3.5"></i> Post</a>` : `<span class="text-xs text-slate-500">Draft</span>`}
        `;
        miniContainer.appendChild(miniCard);
      }
    });

    document.getElementById('statTotalImpressions').innerText = `${totalImpressions.toLocaleString()} Impressions`;

  } catch (error) {
    console.error('Error fetching posts:', error);
  }
}

// Event Listeners setup
function setupEventListeners() {
  // Save Persona
  document.getElementById('btnSavePersona').addEventListener('click', async () => {
    const profile = {
      name: document.getElementById('profName').value,
      headline: document.getElementById('profHeadline').value,
      currentRole: document.getElementById('profRole').value,
      yearsOfExperience: document.getElementById('profExp').value,
      primaryTechStack: document.getElementById('profStack').value,
      githubUrl: document.getElementById('profGithub').value,
      portfolioUrl: document.getElementById('profPortfolio').value,
      resumeBio: document.getElementById('profBio').value
    };

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile })
      });
      if (res.ok) {
        showToast('✅ Persona profile saved successfully!', 'success');
      }
    } catch (e) {
      showToast('❌ Failed to save persona profile', 'error');
    }
  });

  // Save Settings
  document.getElementById('btnSaveSettings').addEventListener('click', async () => {
    const automation = {
      enabled: document.getElementById('setAutoSchedule').value === 'true',
      cronSchedule: document.getElementById('setCronSchedule').value,
      languageMode: document.getElementById('setLangMode').value,
      autoPostFirstComment: document.getElementById('setAutoFirstComment').value === 'true'
    };

    const envUpdates = {
      GEMINI_API_KEY: document.getElementById('setGeminiKey').value,
      CLOUDINARY_CLOUD_NAME: document.getElementById('setCloudName').value,
      CLOUDINARY_API_KEY: document.getElementById('setCloudKey').value,
      CLOUDINARY_API_SECRET: document.getElementById('setCloudSecret').value,
      TELEGRAM_BOT_TOKEN: document.getElementById('setTgToken').value,
      TELEGRAM_CHAT_ID: document.getElementById('setTgChatId').value
    };

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automation, envUpdates })
      });
      if (res.ok) {
        showToast('✅ Settings updated and applied!', 'success');
        await refreshAll();
      }
    } catch (e) {
      showToast('❌ Failed to update settings', 'error');
    }
  });

  // Test Buttons
  document.getElementById('btnTestGemini').addEventListener('click', async () => {
    showToast('Testing Gemini API...', 'info');
    const res = await fetch('/api/test/gemini', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast(`✅ Gemini connected! Reply: ${data.reply}`, 'success');
    } else {
      showToast(`❌ Gemini Error: ${data.message}`, 'error');
    }
  });

  document.getElementById('btnTestCloudinary').addEventListener('click', async () => {
    showToast('Testing Cloudinary...', 'info');
    const res = await fetch('/api/test/cloudinary', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('✅ Cloudinary connected successfully!', 'success');
    } else {
      showToast(`❌ Cloudinary: ${data.message}`, 'error');
    }
  });

  document.getElementById('btnTestTelegram').addEventListener('click', async () => {
    showToast('Sending Telegram test ping...', 'info');
    const res = await fetch('/api/test/telegram', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('✅ Telegram ping delivered to your chat!', 'success');
    } else {
      showToast(`❌ Telegram: ${data.message}`, 'error');
    }
  });

  // Add Idea Collapsible
  document.getElementById('btnOpenAddIdea').addEventListener('click', () => {
    const card = document.getElementById('addIdeaCard');
    card.classList.toggle('hidden');
    document.getElementById('newIdeaTopic').focus();
  });

  document.getElementById('btnCancelAddIdea').addEventListener('click', () => {
    document.getElementById('addIdeaCard').classList.add('hidden');
  });

  document.getElementById('btnSubmitAddIdea').addEventListener('click', async () => {
    const topic = document.getElementById('newIdeaTopic').value.trim();
    const language = document.getElementById('newIdeaLang').value;
    if (!topic) return showToast('Please enter an idea topic', 'error');

    const res = await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, language })
    });
    if (res.ok) {
      showToast('✅ Idea saved to bank!', 'success');
      document.getElementById('newIdeaTopic').value = '';
      document.getElementById('addIdeaCard').classList.add('hidden');
      await refreshAll();
    }
  });

  // AI Brainstorm 5 Ideas
  document.getElementById('btnAiIdeas').addEventListener('click', async () => {
    showToast('✨ Gemini is brainstorming 5 architecture topics...', 'info');
    try {
      const res = await fetch('/api/ideas/ai-generate', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast('🎉 Added 5 fresh ideas to your idea bank!', 'success');
        await fetchIdeas();
        await fetchStatus();
      } else {
        showToast(`❌ ${data.error}`, 'error');
      }
    } catch (e) {
      showToast('❌ Failed to brainstorm ideas', 'error');
    }
  });

  // Modal Buttons & Triggers
  document.getElementById('btnTriggerPreview').addEventListener('click', () => openPreviewModal(false));
  document.getElementById('btnQuickPost').addEventListener('click', () => openPreviewModal(true));
  document.getElementById('btnTriggerFullRun').addEventListener('click', () => openPreviewModal(true));
  document.getElementById('btnCloseModal').addEventListener('click', closeModal);

  document.getElementById('btnCopyModalText').addEventListener('click', () => {
    const text = document.getElementById('modalPostText').value;
    navigator.clipboard.writeText(text);
    showToast('📋 Post text copied to clipboard!', 'success');
  });

  document.getElementById('btnPublishModal').addEventListener('click', async () => {
    const text = document.getElementById('modalPostText').value;
    const firstComment = document.getElementById('modalFirstComment').value;
    
    showToast('🚀 Publishing to LinkedIn & notifying Telegram...', 'info');
    closeModal();

    try {
      const res = await fetch('/api/run-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: currentDraft?.topic || null,
          language: currentDraft?.language || null,
          forcePublish: true
        })
      });
      const data = await res.json();
      if (data.publishResult?.success) {
        showToast('🎉 Published to LinkedIn successfully!', 'success');
      } else {
        showToast(`ℹ️ ${data.publishResult?.message || 'Generated as draft'}`, 'info');
      }
      await refreshAll();
    } catch (e) {
      showToast('❌ Failed to publish', 'error');
    }
  });
}

// Open Preview Modal
async function openPreviewModal(isPublishMode = false) {
  const modal = document.getElementById('previewModal');
  const loading = document.getElementById('modalLoading');
  const content = document.getElementById('modalContent');
  
  modal.classList.remove('hidden');
  loading.classList.remove('hidden');
  content.classList.add('hidden');

  try {
    const nextLang = currentStatus?.automation?.nextLanguage || 'EN';
    const res = await fetch('/api/generate-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: nextLang })
    });
    const data = await res.json();
    currentDraft = data.draft;

    document.getElementById('modalTopic').innerText = `Topic: ${data.draft.topic || 'Engineering Architecture'}`;
    document.getElementById('modalCharCount').innerText = `${data.draft.postText?.length || 0} chars`;
    document.getElementById('modalPostText').value = data.draft.postText || '';
    document.getElementById('modalFirstComment').value = data.draft.firstCommentText || '';

    loading.classList.add('hidden');
    content.classList.remove('hidden');
  } catch (error) {
    loading.classList.add('hidden');
    showToast('Failed to generate preview', 'error');
  }
}

function closeModal() {
  document.getElementById('previewModal').classList.add('hidden');
}

// Global window actions
window.deleteIdea = async function(id) {
  if (!confirm('Are you sure you want to remove this idea?')) return;
  const res = await fetch(`/api/ideas/${id}`, { method: 'DELETE' });
  if (res.ok) {
    showToast('Idea removed', 'info');
    await refreshAll();
  }
};

window.triggerDraftForIdea = function(encodedTopic, lang) {
  const topic = decodeURIComponent(encodedTopic);
  openPreviewModal();
};

window.saveMetrics = async function(postId) {
  const imp = document.getElementById(`imp_${postId}`).value;
  const react = document.getElementById(`react_${postId}`).value;

  const res = await fetch(`/api/posts/${postId}/metrics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ impressions: imp, reactions: react, comments: 0 })
  });

  if (res.ok) {
    showToast('✅ Metrics updated! Feedback loop trained.', 'success');
    await fetchPosts();
  }
};

window.switchTab = switchTab;
