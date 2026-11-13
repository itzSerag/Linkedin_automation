import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { loadEnv, loadConfig, loadInspiration, loadPosts } from '../config.js';

function getGeminiClient() {
  const env = loadEnv();
  if (!env.GEMINI_API_KEY) return null;
  return new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
}

function getOpenAIClient() {
  const env = loadEnv();
  if (!env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

export function safeJsonParse(rawText) {
  if (!rawText) throw new Error('Empty AI response text');
  let text = String(rawText).trim();

  // Strip markdown code block wrappers
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    try {
      let inString = false;
      let escaped = false;
      let result = '';

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"' && !escaped) {
          inString = !inString;
          result += char;
        } else if (inString) {
          if (char === '\n') {
            result += '\\n';
          } else if (char === '\r') {
            result += '\\r';
          } else if (char === '\t') {
            result += '\\t';
          } else if (char.charCodeAt(0) < 32) {
            // Drop invalid ASCII control characters
          } else {
            result += char;
          }
        } else {
          result += char;
        }
        escaped = (char === '\\' && !escaped);
      }

      return JSON.parse(result);
    } catch (sanitizedErr) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw err;
    }
  }
}

export async function generatePostWithAI({ topic, language = 'EN', level = 'Mid' }) {
  const config = loadConfig();
  const env = loadEnv();
  const inspiration = loadInspiration();
  const pastPosts = loadPosts().slice(-5);
  const profile = config.profile || {};
  const style = config.style || {};
  const isArabic = language === 'AR';

  const aiConfig = config.ai || { provider: 'gemini', geminiModel: 'gemini-2.5-pro', openaiModel: 'gpt-4o' };
  const provider = aiConfig.provider || 'gemini';

  const endingStyle = style.endingStyle || 'strong_conclusion';
  const includeGithub = style.includeGithubInComment === true;

  let endingRule = '';
  if (endingStyle === 'strong_conclusion') {
    endingRule = `DO NOT end with a question! Do NOT ask "What do you think?", "Thoughts?", or "Drop your thoughts below". Instead, conclude with a memorable, sharp, opinionated engineering takeaway or golden principle (e.g., "The best architecture is the one that prevents bugs before you even write tests."). Senior engineers state strong conclusions rather than begging for comments.`;
  } else if (endingStyle === 'question') {
    endingRule = `End with a specific, thought-provoking technical trade-off question addressed to senior developers.`;
  } else {
    endingRule = `Either end with a sharp opinionated engineering conclusion OR a deep technical trade-off question.`;
  }

  let commentRule = '';
  if (includeGithub && profile.githubUrl) {
    commentRule = `Generate a concise, natural first comment with context linking to the author's GitHub/portfolio: "${profile.githubUrl}".`;
  } else {
    commentRule = `DO NOT include any GitHub, portfolio, or external links in the first comment! Leave firstCommentText as "" (empty string) or a tiny 1-line technical afterthought.`;
  }

  const languageRule = isArabic
    ? `CRITICAL ARABIC & TERMINOLOGY RULES (SERAG'S SIGNATURE EGYPTIAN TECH STYLE):
1. WRITE IN AUTHENTIC EGYPTIAN TECH DIALECT (العامية المصرية التقنية السلسة والمحبوبة جداً في الكميونيتي).
   - Talk like a smart, friendly peer chatting over coffee, NOT a textbook professor or corporate bot.
   - Use natural Egyptian developer expressions naturally: "حوار كبير", "المشروع وسع مني حبتين 😅", "على قد ما تقدررر", "فى التمااام", "اداا مين ده", "بسس", "ع الضيق", "الفكرة مش في... لكن إن...", "دايماً كنت فاكر إن... لكن مع الوقت اكتشفت...".
2. MANDATORY: ALL technical terms, architectural patterns, tool names, libraries, metrics, protocols, and keywords MUST BE IN ENGLISH with Latin letters (e.g. "NestJS", "Node.js", "PostgreSQL", "Redis", "Docker", "Dockerfile", "JWT", "Refresh Token", "Zod", "Joi", "Multi-stage Build", "Alpine", "Slim", "musl", "glibc", "Stateless", "Connection Pool", "Composite Index", "Race Condition", "Idempotency", "CI/CD").
3. NEVER use literal or stiff Arabic translations for tech terms (NEVER say "حوض اتصالات" or "فهرس مركب", write "Connection Pool" and "Composite Index").
4. EMOJIS: Use subtle, natural developer emojis (😅, 🔹, 🚀, 👇) sparingly where appropriate, just like in real relatable posts.`
    : `CRITICAL ENGLISH RULES:
1. Write in an authentic, conversational, highly relatable developer voice.
2. Tell a real production story or share an honest developer battle scar ("The first time I Dockerized NestJS, I thought a 5-line Dockerfile was all it took... 😅").
3. BAN CORPORATE AI CLICHÉS: NEVER use buzzwords like "delve", "testament", "revolutionize", "game-changer", "tapestry", "landscape", "in conclusion", "vital", "in today's fast-paced world", "harness", "leverage".`;

  const systemInstruction = `
You are Serag, a passionate, highly relatable Backend & Fullstack Software Engineer writing personal, highly engaging, community-loved LinkedIn posts.
Your posts frequently go viral among developers, engineering managers, and tech recruiters because you share real production battle scars, honest trial-and-error, and practical architectural schemas with zero corporate fluff or academic lecturing.

AUTHOR PERSONA:
- Name: ${profile.name || 'Serag'}
- Current Role: ${profile.currentRole || 'Backend & Fullstack Software Engineer'}
- Years of Experience: ${profile.yearsOfExperience || 'Junior to Mid-Senior'}
- Primary Tech Stack: ${profile.primaryTechStack || 'Node.js, NestJS, Express, PostgreSQL, Redis, Docker, System Design, MongoDB, Clean Architecture'}
- Target Audience: Software Engineers, Engineering Managers, Tech Recruiters, and Fellow Builders

AUTHENTIC WRITING BLUEPRINT:
1. ${languageRule}
2. THE HOOK (CRITICAL - NEVER BE BALD OR TEXTBOOK-LIKE):
   The post MUST start with one of Serag's 4 signature storytelling hooks:
   - Hook Type 1 (The Battle Scar / Initial Misconception):
     "في أول مرة عملت [X] كنت فاكر إن الموضوع هيخلص في كام سطر.. لكن بعد شوية Deploys بدأت تظهر المشاكل:"
     / "The first time I tried [X] in production, I honestly thought it would take 10 minutes and 5 lines of code. Then reality hit hard:"
   - Hook Type 2 (The Project Escalation / Practical Passion):
     "أنا من الناس اللي لما بحب أعمل حاجة، لازم أشوف أحسن طريقة بتتعمل بيها حالياً.. كنت عايز أعمل [X] بس المهم إن المشروع وسع مني حبتين 😅"
     / "I started building a simple [X] last weekend to see how it's best done in production today. But things escalated quickly 😅:"
   - Hook Type 3 (The Wasted Cost / Effort Revelation):
     "في حاجة من فترة كبيرة كنت بعملها وأنا مش واخد بالي وبتكلف Cost / وقت على الفاضي:"
     / "We were bleeding dev hours / cloud spend on [X] for months without even realizing it. Here is the realization that changed everything:"
   - Hook Type 4 (The Conversational Community Breakdown):
     "يا جماعة، إيه حوار [X] مع [Y]؟ ليه تيمات كتير بتستخدم [X] بدل [Y] العادي؟ الموضوع أبسط بكتير مما تتخيل:"
     / "Quick question for backend engineers: what's the actual deal with [X] vs [Y] in production? It’s much simpler than it seems:"

3. PACING & STRUCTURE (CRITICAL - NEVER LEAVE THE SOLUTION INCOMPLETE):
   - Short, punchy opening hook (1-3 lines) using Serag's signature storytelling style.
   - The Reality / Symptoms: Concrete bullet points of what actually went wrong in production and why the naive assumption failed.
   - MANDATORY: THE FULL PRACTICAL PRODUCTION FIX (الحل العملي الكامل والمفصل في قلب البوست):
     * NEVER stop after stating the problem. NEVER leave the solution vague, cut short, or deferred to a card/comment!
     * The post body MUST deliver the complete, actionable, step-by-step production fix with clear bold headers or numbered points (e.g. "1. ضبط الـ Threadpool:", "2. فصل الـ CPU Tasks بـ Worker Threads:", "3. التحويل لـ Background Queue مع Redis & BullMQ:").
     * Include exact configuration decisions, technical trade-offs, and practical reasoning so the reader gets a complete, high-value engineering playbook.
   - The Senior Pragmatic Takeaway: A relatable analogy or philosophical engineering rule (e.g., "في الآخر، الـ Main Thread في Node.js زي الكاشير في المطعم: وظيفته ياخد الأوردرات بسرعة ويسلمها للمطبخ، مش يدخل المطبخ يطبخ بنفسه 😅").
   - Friendly Community Sign-off: An open invitation for peer thoughts or production experiences (e.g., "قابلت المشكلة دي قبل كده؟ وبتحلها إزاي عندك في Production؟").
   - Post Length: Between ${style.targetCharMin || 1050} and ${style.targetCharMax || 1650} characters with plenty of depth and breathing room.

4. HASHTAGS: Exactly 3 to 5 relevant technical hashtags at the very bottom (e.g. #nodejs #backend #systemdesign #docker #devops).
5. ${commentRule}
6. VISUAL CARD SPEC: Provide data for a modern technical visual card (code snippet, benchmark comparison, or key takeaways). Select a diverse visual style from: 'paper' (warm notebook / handwritten notes / sticky pads), 'painted' (vibrant artistic canvas poster), 'blueprint' (CAD architectural blueprint), 'brutalist' (high-contrast neo-brutalism creator card), or 'terminal' (dark cyber IDE studio). All visualCard text, titles, snippets, and takeaways MUST be in English Latin letters even if the post body is Arabic.

REFERENCE INSPIRATION POSTS (ACTUAL HIGH-PERFORMING EXAMPLES):
${inspiration || 'No past inspiration posts provided.'}

RECENT PAST POSTS FOR CONTINUITY:
${JSON.stringify(pastPosts.map(p => ({ topic: p.topic, hook: p.hook })), null, 2)}
`;

  const userPrompt = `
Generate a LinkedIn post about this topic:
Topic: "${topic}"
Technical Target Level: ${level}
Target Language: ${isArabic ? 'Arabic (مع الحفاظ الكامل على كافة المصطلحات التقنية بالحروف الإنجليزية)' : 'English'}

You MUST respond strictly in valid JSON matching this schema:
{
  "hook": "The first 1-2 lines of the post",
  "postText": "The complete full post text including hook, body, conclusion, and 2-3 hashtags",
  "firstCommentText": "The first comment text (empty string if no link requested)",
  "charCount": 1100,
  "visualCard": {
    "style": "paper" or "painted" or "blueprint" or "brutalist" or "terminal",
    "type": "code" or "takeaways" or "benchmark",
    "theme": "indigo" or "emerald" or "violet" or "amber" or "cyan",
    "title": "Short punchy card title (max 5 words, in English)",
    "subtitle": "Short punchy subtitle or core question (max 8 words, in English)",
    "language": "typescript / sql / bash / javascript",
    "codeSnippet": "6-10 lines of realistic code snippet (if type is code, else empty string)",
    "takeaways": [
      { "tag": "ROOT CAUSE", "text": "Core insight (max 8 words)", "detail": "Context or impact (max 10 words)" },
      { "tag": "SYSTEM FIX", "text": "Core insight (max 8 words)", "detail": "Context or impact (max 10 words)" },
      { "tag": "GOLDEN RULE", "text": "Core insight (max 8 words)", "detail": "Context or impact (max 10 words)" }
    ],
    "comparison": {
      "beforeLabel": "Naive / Bottleneck",
      "beforeText": "Sequential Full Table Scan blocking event loop threads",
      "afterLabel": "Optimized Architecture",
      "afterText": "Composite B-Tree Index with constant memory consumption",
      "metric": "99.4% Latency Reduction (1,450ms -> 4ms)"
    }
  }
}
`;

  // Path A: OpenAI ChatGPT
  if (provider === 'openai') {
    const openai = getOpenAIClient();
    if (!openai) {
      console.warn('[AI] OPENAI_API_KEY is missing. Using template fallback.');
      return getFallbackDraft({ topic, language, level, profile, style });
    }

    try {
      const model = aiConfig.openaiModel || 'gpt-4o';
      console.log(`[AI] Generating post with OpenAI model: ${model}`);
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      });

      const parsed = safeJsonParse(completion.choices[0].message.content);
      return {
        success: true,
        ...parsed,
        language,
        topic,
        modelUsed: `OpenAI ${model}`
      };
    } catch (error) {
      console.error('OpenAI generation error:', error);
      const fallback = getFallbackDraft({ topic, language, level, profile, style });
      return {
        ...fallback,
        warning: `OpenAI API call failed: ${error.message}. Returned template preview.`
      };
    }
  }

  // Path B: Google Gemini
  const ai = getGeminiClient();
  if (!ai) {
    console.warn('[AI] GEMINI_API_KEY is missing. Using template fallback.');
    return getFallbackDraft({ topic, language, level, profile, style });
  }

  const primaryModel = aiConfig.geminiModel || 'gemini-3.5-flash';
  const candidateModels = Array.from(new Set([
    primaryModel,
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite'
  ]));

  let lastError = null;
  for (const model of candidateModels) {
    try {
      console.log(`[AI] Generating post with Gemini model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json'
        }
      });

      const parsed = safeJsonParse(response.text);
      return {
        success: true,
        ...parsed,
        language,
        topic,
        modelUsed: `Gemini ${model}`
      };
    } catch (error) {
      console.warn(`[AI] Gemini model ${model} failed: ${error.message}. Trying next candidate...`);
      lastError = error;
    }
  }

  console.error('All Gemini candidate models failed:', lastError);
  const fallback = getFallbackDraft({ topic, language, level, profile, style });
  return {
    ...fallback,
    warning: `Gemini API call failed: ${lastError?.message}. Returned template preview.`
  };
}

// Backward-compatible alias
export const generatePostWithGemini = generatePostWithAI;

function getFallbackDraft({ topic, language, level, profile, style = {} }) {
  const isArabic = language === 'AR';
  const endingStyle = style.endingStyle || 'strong_conclusion';
  const includeGithub = style.includeGithubInComment === true;

  if (isArabic) {
    const ending = endingStyle === 'strong_conclusion'
      ? 'الحل مش دائماً إنك تدفع أكتر لـ AWS. الحل إنك تفهم الـ Bottleneck الحقيقي وتعالجه في الـ Code والـ Database أولاً.'
      : 'إيه أكتر Performance Bottleneck قابلته في شغلك وكان حله مجرد سطر واحد؟';

    return {
      success: true,
      isMock: true,
      topic,
      language: 'AR',
      hook: 'أغلب المشاكل في الـ Backend مش بتتحل بسيرفرات أكبر، بتتحل بكود أحسن.',
      postText: `أغلب المشاكل في الـ Backend مش بتتحل بسيرفرات أكبر، بتتحل بكود أحسن.

أول ما الـ API يبدأ يستجيب ببطء مع ضغط الترافيك، أول حل بيخطر على البال: "نزود RAM أو نعمل Horizontal Scaling لسيرفرات جديدة".

بس لما تعمل Profiling حقيقي، بتكتشف 3 أسباب شائعة:

1. الـ N+1 Query Problem:
بدل ما تجيب البيانات بـ JOIN أو بـ Query واحد، الـ ORM بيبعت 150 استعلام للـ Database في كل Request.

2. غياب الـ Composite Indexes:
فلترة على أكتر من حقل بدون فهرس مركب بتجبر الـ Database تعمل Full Table Scan على ملايين السجلات.

3. غياب الـ Connection Pooling المناسب:
كل Request بيحاول يفتح TCP Connection جديد للـ Database بدل ما يستغل الـ Pool المفتوح مسبقاً.

${ending}

#backend #softwareengineering #databases`,
      firstCommentText: includeGithub && profile.githubUrl ? `لو حابب تشوف مشاريع عملية بنيتها، تصفح الـ GitHub بتاعي هنا: ${profile.githubUrl}` : '',
      charCount: 980,
      visualCard: {
        type: 'takeaways',
        title: 'Backend Scaling Bottlenecks',
        language: 'sql',
        codeSnippet: '',
        takeaways: [
          'Fix N+1 queries before scaling instances',
          'Add composite indexes for compound filters',
          'Tune database connection pool limits'
        ]
      }
    };
  } else {
    const ending = endingStyle === 'strong_conclusion'
      ? 'Writing clean, atomic primitives will always scale better than throwing hardware at concurrency bugs.'
      : 'What is your most non-standard use case for Redis in production?';

    return {
      success: true,
      isMock: true,
      topic,
      language: 'EN',
      hook: 'Most junior developers think Redis is just for caching.',
      postText: `Most junior developers think Redis is just for caching.

Here is how experienced backend engineers actually leverage it:

1. Distributed Locks (Redlock)
Preventing two background workers from charging the same credit card or modifying inventory simultaneously.

2. Sliding Window Rate Limiting
Protecting critical endpoints using atomic ZADD and ZREMRANGEBYSCORE.

3. Ephemeral Idempotency Keys
Storing deduplication tokens with a 120-second TTL to safely ignore duplicate network retries.

4. Pub/Sub & Lightweight Task Buffers
Handling high-throughput messaging before needing the operational overhead of Kafka.

Caching key-value pairs is merely 10% of Redis's power.
The real superpower is atomic, in-memory concurrency primitives.

${ending}

#backend #systemdesign #softwareengineering`,
      firstCommentText: includeGithub && profile.githubUrl ? `Check out full architectural implementations on my GitHub: ${profile.githubUrl}` : '',
      charCount: 950,
      visualCard: {
        type: 'code',
        title: 'Redis Distributed Locking',
        language: 'typescript',
        codeSnippet: `// Acquire atomic distributed lock with 5s TTL
const acquired = await redis.set(
  \`lock:\${resourceId}\`,
  workerId,
  'NX',
  'PX',
  5000
);

if (!acquired) {
  throw new ConcurrencyConflictError();
}

try {
  await processPayment(resourceId);
} finally {
  await releaseLock(resourceId, workerId);
}`,
        takeaways: []
      }
    };
  }
}

export async function testGeminiConnection() {
  const ai = getGeminiClient();
  const config = loadConfig();
  if (!ai) return { success: false, message: 'GEMINI_API_KEY is not set in .env' };

  const preferredModel = config.ai?.geminiModel && config.ai.geminiModel !== 'gemini-2.5-pro'
    ? config.ai.geminiModel
    : 'gemini-3.8-flash';

  const candidateModels = [
    preferredModel,
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite'
  ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

  let lastError = null;
  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: 'Ping test. Reply with: OK',
      });
      return { success: true, message: `Connected to Gemini (${model})!`, reply: response.text?.trim() };
    } catch (error) {
      lastError = error;
    }
  }

  return { success: false, message: lastError?.message || 'Gemini connection failed' };
}

export async function generateIdeasWithAI({ count = 5 } = {}) {
  const config = loadConfig();
  const profile = config.profile || {};
  const currentEnv = loadEnv();

  const prompt = `
Generate ${count} viral, highly technical post topic ideas for a ${profile.currentRole || 'Backend/Fullstack'} engineer with stack: ${profile.primaryTechStack || 'Node, PostgreSQL, Docker, Redis'}.
Include a mix of:
- 2 topics in Arabic (العربية التقنية المتخصصة مع المصطلحات الإنجليزية)
- 3 topics in English
Each topic must be specific, counter-intuitive or architecture/performance focused (no generic beginner fluff).

Return strictly a JSON array:
[
  {
    "topic": "...",
    "category": "Backend / Database / System Design",
    "level": "Junior/Mid" or "Mid/Senior",
    "language": "EN" or "AR"
  }
]
`;

  if (config.ai?.provider === 'openai' && currentEnv.OPENAI_API_KEY) {
    const openai = getOpenAIClient();
    const comp = await openai.chat.completions.create({
      model: config.ai?.openaiModel || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });
    const parsed = safeJsonParse(comp.choices[0].message.content);
    return Array.isArray(parsed) ? parsed : (parsed.topics || parsed.ideas || []);
  }

  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured in Settings');
  }

  const preferredModel = config.ai?.geminiModel && config.ai.geminiModel !== 'gemini-2.5-pro'
    ? config.ai.geminiModel
    : 'gemini-3.8-flash';

  const candidateModels = [
    preferredModel,
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite'
  ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

  let lastError = null;
  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      const parsed = safeJsonParse(response.text);
      return Array.isArray(parsed) ? parsed : (parsed.topics || parsed.ideas || []);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(lastError?.message || 'Failed to generate ideas with Gemini');
}

export async function testOpenAIConnection() {
  const openai = getOpenAIClient();
  const config = loadConfig();
  const model = config.ai?.openaiModel || 'gpt-4o';
  if (!openai) return { success: false, message: 'OPENAI_API_KEY is not set in .env' };
  try {
    const completion = await openai.chat.completions.create({
      model: model.startsWith('o') ? model : 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Ping test. Reply with: OK' }],
      max_tokens: 10
    });
    return {
      success: true,
      message: `Connected to OpenAI (${model})!`,
      reply: completion.choices[0].message.content.trim()
    };
  } catch (error) {
    return { success: false, message: error.message || 'OpenAI connection failed' };
  }
}
