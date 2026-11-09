import sharp from 'sharp';

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function hashString(str) {
  let hash = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

const FONT_SANS = `'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
const FONT_MONO = `'JetBrains Mono', 'Cascadia Code', Consolas, monospace`;

const THEMES = {
  indigo: {
    name: 'indigo',
    bg1: '#070A14',
    bg2: '#0D1426',
    cardBg: '#0F172A',
    cardBorder: '#1E293B',
    accent1: '#38BDF8', // Sky
    accent2: '#6366F1', // Indigo
    glow1: '#1D4ED8',
    glow2: '#0E7490',
    badgeBg: 'rgba(56, 189, 248, 0.12)',
    badgeBorder: '#0284C7',
    badgeText: '#38BDF8',
    categoryLabel: 'SYSTEM ARCHITECTURE'
  },
  emerald: {
    name: 'emerald',
    bg1: '#040E0A',
    bg2: '#071E16',
    cardBg: '#092118',
    cardBorder: '#0E3A2B',
    accent1: '#10B981', // Emerald
    accent2: '#14B8A6', // Teal
    glow1: '#065F46',
    glow2: '#047857',
    badgeBg: 'rgba(16, 185, 129, 0.12)',
    badgeBorder: '#059669',
    badgeText: '#34D399',
    categoryLabel: 'DATABASE PERFORMANCE'
  },
  violet: {
    name: 'violet',
    bg1: '#0A0716',
    bg2: '#160E2E',
    cardBg: '#1A1235',
    cardBorder: '#2E1E54',
    accent1: '#A855F7', // Violet
    accent2: '#EC4899', // Pink
    glow1: '#6B21A8',
    glow2: '#9D174D',
    badgeBg: 'rgba(168, 85, 247, 0.12)',
    badgeBorder: '#9333EA',
    badgeText: '#C084FC',
    categoryLabel: 'DISTRIBUTED SYSTEMS'
  },
  amber: {
    name: 'amber',
    bg1: '#0E0905',
    bg2: '#201509',
    cardBg: '#23180D',
    cardBorder: '#3E2816',
    accent1: '#F59E0B', // Amber
    accent2: '#F97316', // Orange
    glow1: '#B45309',
    glow2: '#C2410C',
    badgeBg: 'rgba(245, 158, 11, 0.12)',
    badgeBorder: '#D97706',
    badgeText: '#FBBF24',
    categoryLabel: 'BACKEND RESILIENCE'
  },
  cyan: {
    name: 'cyan',
    bg1: '#050D14',
    bg2: '#081D2A',
    cardBg: '#0D2636',
    cardBorder: '#143C54',
    accent1: '#06B6D4', // Cyan
    accent2: '#3B82F6', // Blue
    glow1: '#0891B2',
    glow2: '#1D4ED8',
    badgeBg: 'rgba(6, 182, 212, 0.12)',
    badgeBorder: '#0891B2',
    badgeText: '#22D3EE',
    categoryLabel: 'API ARCHITECTURE'
  }
};

function highlightCodeLine(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('--') || trimmed.startsWith('#')) {
    return `<tspan fill="#64748B" font-style="italic">${escapeXml(line)}</tspan>`;
  }

  const tokenRegex = /(\/\/[^\n]*|--[^\n]*)|("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|`[^`\\]*(?:\\.[^`\\]*)*`)|(\b(?:const|let|var|function|async|await|return|if|else|try|catch|finally|throw|new|class|import|export|from|default|type|interface|extends|implements|SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|ON|ORDER|BY|GROUP|LIMIT|INDEX|CREATE|TABLE|BEGIN|COMMIT|ROLLBACK|CASCADE|PRIMARY|KEY)\b)|(\b(?:true|false|null|undefined|nil)\b)|(\b\d+(?:\.\d+)?(?:ms|s|mb|gb|kb)?\b)|(\b[a-zA-Z0-9_$]+(?=\s*\())|(\b[A-Z][a-zA-Z0-9_$]*\b)|([^a-zA-Z0-9_$\s"'\`]+|\s+|[a-zA-Z0-9_$]+)/g;

  let result = '';
  let match;
  while ((match = tokenRegex.exec(line)) !== null) {
    const [full, comment, str, keyword, boolNull, number, func, typeIdent, other] = match;
    if (comment) {
      result += `<tspan fill="#64748B" font-style="italic">${escapeXml(comment)}</tspan>`;
    } else if (str) {
      result += `<tspan fill="#34D399">${escapeXml(str)}</tspan>`;
    } else if (keyword) {
      result += `<tspan fill="#C084FC" font-weight="600">${escapeXml(keyword)}</tspan>`;
    } else if (boolNull) {
      result += `<tspan fill="#F59E0B">${escapeXml(boolNull)}</tspan>`;
    } else if (number) {
      result += `<tspan fill="#FBBF24">${escapeXml(number)}</tspan>`;
    } else if (func) {
      result += `<tspan fill="#38BDF8">${escapeXml(func)}</tspan>`;
    } else if (typeIdent) {
      result += `<tspan fill="#60A5FA">${escapeXml(typeIdent)}</tspan>`;
    } else {
      result += `<tspan fill="#CBD5E1">${escapeXml(other)}</tspan>`;
    }
  }

  return result || escapeXml(line);
}

export async function generateVisualCard({
  type = 'code',
  theme = null,
  category = null,
  title = 'System Architecture & High Concurrency',
  subtitle = '',
  codeSnippet = '',
  language = 'TypeScript',
  takeaways = [],
  comparison = null,
  authorName = 'Serag',
  authorRole = 'Backend & Fullstack Software Engineer',
  isArabic = false
}) {
  const width = 1200;
  const height = 630;

  // Enforce Author Name as Serag if empty or default generic
  const cleanAuthorName = (!authorName || authorName === 'Software Engineer') ? 'Serag' : authorName;
  const cleanAuthorRole = authorRole || 'Backend & Fullstack Software Engineer';

  // Deterministic or specified theme
  const themeKeys = Object.keys(THEMES);
  const activeTheme = (theme && THEMES[theme])
    ? THEMES[theme]
    : THEMES[themeKeys[Math.abs(hashString(title || 'default')) % themeKeys.length]];

  // Clean category tag
  const rawCat = category || activeTheme.categoryLabel || 'SYSTEM ARCHITECTURE';
  const categoryLabel = rawCat.replace(/WAR STORIES|& RESILIENCE/gi, 'ARCHITECTURE').trim().toUpperCase();
  const badgeWidth = Math.max(130, Math.min(260, categoryLabel.length * 8 + 36));

  // Clean title & subtitle
  const cleanTitle = (title || 'Scalable Backend Architecture').slice(0, 52);
  const cleanSubtitle = (subtitle || 'Clean Architecture • Zero Downtime • High Throughput').slice(0, 75);

  let centerContentSvg = '';

  // Determine layout archetype
  const effectiveType = (type === 'code' && codeSnippet)
    ? 'code'
    : (type === 'benchmark' || (comparison && comparison.beforeText && comparison.afterText))
      ? 'benchmark'
      : 'takeaways';

  if (effectiveType === 'code' && codeSnippet) {
    // ----------------------------------------------------
    // LAYOUT 1: MODERN CODE STUDIO (Ray.so / Carbon Dark)
    // ----------------------------------------------------
    const rawLines = codeSnippet
      .split('\n')
      .map(l => l.replace(/\t/g, '  '))
      .slice(0, 10);

    const codeExt = (language.toLowerCase().includes('sql'))
      ? 'sql'
      : (language.toLowerCase().includes('bash') || language.toLowerCase().includes('sh'))
        ? 'sh'
        : (language.toLowerCase().includes('python'))
          ? 'py'
          : 'ts';

    const tabFileName = `${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 22)}.${codeExt}`;
    const lineSpacing = rawLines.length <= 7 ? 34 : (rawLines.length <= 9 ? 30 : 27);
    const startY = 220;

    const codeLinesSvg = rawLines
      .map((line, idx) => {
        const y = startY + idx * lineSpacing;
        const highlighted = highlightCodeLine(line.slice(0, 74));
        return `
          <text x="122" y="${y}" text-anchor="end" fill="#475569" font-family="${FONT_MONO}" font-size="14">${idx + 1}</text>
          <text x="145" y="${y}" font-family="${FONT_MONO}" font-size="15" xml:space="preserve">${highlighted}</text>
        `;
      })
      .join('\n');

    centerContentSvg = `
      <!-- Code Window Outer Frame -->
      <rect x="70" y="145" width="1060" height="385" rx="16" fill="#0B0F19" stroke="#1E293B" stroke-width="2" />
      <line x1="90" y1="145" x2="1110" y2="145" stroke="url(#accentGrad)" stroke-width="2" opacity="0.7" />

      <!-- Window Title Bar -->
      <path d="M 70 161 A 16 16 0 0 1 86 145 L 1114 145 A 16 16 0 0 1 1130 161 L 1130 188 L 70 188 Z" fill="#111827" />
      <line x1="70" y1="188" x2="1130" y2="188" stroke="#1F2937" stroke-width="1.5" />

      <!-- macOS Traffic Lights -->
      <circle cx="98" cy="166" r="6" fill="#EF4444" />
      <circle cx="118" cy="166" r="6" fill="#F59E0B" />
      <circle cx="138" cy="166" r="6" fill="#10B981" />

      <!-- Tab File Pill -->
      <rect x="165" y="152" width="220" height="26" rx="6" fill="#0B0F19" stroke="#374151" stroke-width="1" />
      <text x="178" y="169" fill="#9CA3AF" font-family="${FONT_SANS}" font-size="12">📄</text>
      <text x="198" y="169" fill="#E5E7EB" font-family="${FONT_MONO}" font-weight="600" font-size="12">${escapeXml(tabFileName)}</text>

      <!-- Language Badge on Right -->
      <rect x="990" y="152" width="120" height="26" rx="6" fill="${activeTheme.badgeBg}" stroke="${activeTheme.badgeBorder}" stroke-width="1" />
      <text x="1050" y="169" text-anchor="middle" fill="${activeTheme.accent1}" font-family="${FONT_SANS}" font-weight="700" font-size="12" letter-spacing="1.2">${escapeXml(language.toUpperCase())}</text>

      <!-- Line Numbers Gutter Divider -->
      <line x1="132" y1="188" x2="132" y2="495" stroke="#1E293B" stroke-width="1" stroke-dasharray="2 3" />

      <!-- Code Lines Content -->
      ${codeLinesSvg}

      <!-- Bottom Code Window Status Bar -->
      <line x1="70" y1="495" x2="1130" y2="495" stroke="#1F2937" stroke-width="1" />
      <circle cx="95" cy="512" r="3.5" fill="${activeTheme.accent1}" />
      <text x="108" y="516" fill="#94A3B8" font-family="${FONT_SANS}" font-weight="600" font-size="12" letter-spacing="0.5">PRODUCTION PATTERN • ASYNC NON-BLOCKING</text>
      <text x="1105" y="516" text-anchor="end" fill="#64748B" font-family="${FONT_MONO}" font-size="12">O(1) ATOMIC COMPLEXITY</text>
    `;
  } else if (effectiveType === 'benchmark' && comparison) {
    // ----------------------------------------------------
    // LAYOUT 2: BENCHMARK / BEFORE VS AFTER BATTLE
    // ----------------------------------------------------
    const beforeLabel = comparison.beforeLabel || 'NAIVE / COMMON APPROACH';
    const beforeText = (comparison.beforeText || 'Full Table Scan & High Memory Usage').slice(0, 90);
    const afterLabel = comparison.afterLabel || 'OPTIMIZED ARCHITECTURE';
    const afterText = (comparison.afterText || 'Composite Index & Zero Memory Spikes').slice(0, 90);
    const metricText = (comparison.metric || '99.4% Latency Drop & O(1) Scalability').slice(0, 60);

    centerContentSvg = `
      <!-- Left Card: Before / Bottleneck -->
      <g transform="translate(70, 145)">
        <rect width="485" height="285" rx="16" fill="#160D11" stroke="#7F1D1D" stroke-width="1.8" />
        <rect x="0" y="0" width="485" height="42" rx="16" fill="#2A1218" />
        <line x1="0" y1="42" x2="485" y2="42" stroke="#7F1D1D" stroke-width="1" />
        
        <circle cx="28" cy="21" r="5" fill="#EF4444" />
        <text x="44" y="26" fill="#FCA5A5" font-family="${FONT_SANS}" font-weight="700" font-size="13" letter-spacing="1">❌ ${escapeXml(beforeLabel.toUpperCase())}</text>
        
        <text x="25" y="80" fill="#94A3B8" font-family="${FONT_SANS}" font-weight="500" font-size="14">THE BOTTLENECK:</text>
        <text x="25" y="112" fill="#F8FAFC" font-family="${FONT_SANS}" font-weight="700" font-size="20">${escapeXml(beforeText)}</text>
        
        <rect x="25" y="175" width="435" height="85" rx="12" fill="#1F1317" stroke="#991B1B" stroke-width="1" />
        <text x="45" y="210" fill="#EF4444" font-family="${FONT_MONO}" font-weight="800" font-size="28">1,450 ms</text>
        <text x="45" y="238" fill="#F87171" font-family="${FONT_SANS}" font-size="13">Full Table Scan • Thread Contention</text>
      </g>

      <!-- Right Card: After / Solution -->
      <g transform="translate(645, 145)">
        <rect width="485" height="285" rx="16" fill="#0A1C16" stroke="#065F46" stroke-width="1.8" />
        <rect x="0" y="0" width="485" height="42" rx="16" fill="#0F2E24" />
        <line x1="0" y1="42" x2="485" y2="42" stroke="#065F46" stroke-width="1" />
        
        <circle cx="28" cy="21" r="5" fill="#10B981" />
        <text x="44" y="26" fill="#6EE7B7" font-family="${FONT_SANS}" font-weight="700" font-size="13" letter-spacing="1">⚡ ${escapeXml(afterLabel.toUpperCase())}</text>
        
        <text x="25" y="80" fill="#94A3B8" font-family="${FONT_SANS}" font-weight="500" font-size="14">ENGINEERING SOLUTION:</text>
        <text x="25" y="112" fill="#F8FAFC" font-family="${FONT_SANS}" font-weight="700" font-size="20">${escapeXml(afterText)}</text>
        
        <rect x="25" y="175" width="435" height="85" rx="12" fill="#0C251C" stroke="#059669" stroke-width="1" />
        <text x="45" y="210" fill="#10B981" font-family="${FONT_MONO}" font-weight="800" font-size="28">4 ms</text>
        <text x="45" y="238" fill="#34D399" font-family="${FONT_SANS}" font-size="13">B-Tree Index • Constant Memory O(1)</text>
      </g>

      <!-- Bottom Impact Ribbon -->
      <g transform="translate(70, 452)">
        <rect width="1060" height="68" rx="14" fill="#0F172A" stroke="url(#accentGrad)" stroke-width="1.8" />
        <circle cx="45" cy="34" r="16" fill="url(#accentGrad)" />
        <text x="45" y="40" text-anchor="middle" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="800" font-size="18">🚀</text>
        <text x="80" y="32" fill="${activeTheme.accent1}" font-family="${FONT_SANS}" font-weight="700" font-size="13" letter-spacing="1.2">SYSTEM PERFORMANCE RESULT</text>
        <text x="80" y="52" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="800" font-size="18">${escapeXml(metricText)}</text>
      </g>
    `;
  } else {
    // ----------------------------------------------------
    // LAYOUT 3: SENIOR TAKEAWAYS & ARCHITECTURE (Linear Dark)
    // ----------------------------------------------------
    const defaultItems = [
      { tag: 'ROOT CAUSE', text: 'Identify DB lock contention before horizontally scaling servers', detail: 'Avoid masking architectural bottlenecks behind expensive hardware' },
      { tag: 'SYSTEM FIX', text: 'Apply composite indexes & atomic operations (Redis NX / DB Locks)', detail: 'Cut latency from 1,200ms to 4ms with deterministic indexing' },
      { tag: 'GOLDEN RULE', text: 'Isolate heavy asynchronous jobs into background event queues', detail: 'Protect the HTTP event loop for sub-50ms API response times' }
    ];

    const rawTakeaways = (takeaways && takeaways.length > 0) ? takeaways : defaultItems;
    const formattedTakeaways = rawTakeaways.slice(0, 3).map((item, idx) => {
      if (typeof item === 'string') {
        const tags = ['ROOT CAUSE', 'SYSTEM DESIGN', 'GOLDEN RULE'];
        return {
          tag: tags[idx] || `STEP 0${idx + 1}`,
          text: item.slice(0, 68),
          detail: 'High scalability architectural standard for distributed environments'
        };
      }
      return {
        tag: (item.tag || `STEP 0${idx + 1}`).slice(0, 20),
        text: (item.text || item.title || '').slice(0, 68),
        detail: (item.detail || 'Standard best practice in production web services').slice(0, 80)
      };
    });

    const cardsSvg = formattedTakeaways.map((item, idx) => {
      const y = 145 + idx * 125;
      const num = `0${idx + 1}`;
      return `
        <!-- Takeaway Card ${num} -->
        <g transform="translate(70, ${y})">
          <rect width="1060" height="112" rx="16" fill="#0D1527" stroke="#1E293B" stroke-width="1.5" />
          <rect x="0" y="0" width="6" height="112" rx="3" fill="url(#accentGrad)" />

          <!-- Number Pill -->
          <rect x="28" y="24" width="64" height="64" rx="14" fill="#131F38" stroke="#1E293B" stroke-width="1" />
          <text x="60" y="64" text-anchor="middle" fill="url(#accentGrad)" font-family="${FONT_SANS}" font-weight="900" font-size="24">${num}</text>

          <!-- Category Pill -->
          <rect x="110" y="24" width="130" height="22" rx="5" fill="${activeTheme.badgeBg}" stroke="${activeTheme.badgeBorder}" stroke-width="1" />
          <text x="175" y="39" text-anchor="middle" fill="${activeTheme.accent1}" font-family="${FONT_SANS}" font-weight="700" font-size="11" letter-spacing="1.2">${escapeXml(item.tag.toUpperCase())}</text>

          <!-- Core Insight -->
          <text x="110" y="70" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="700" font-size="19">${escapeXml(item.text)}</text>
          <text x="110" y="94" fill="#94A3B8" font-family="${FONT_SANS}" font-weight="400" font-size="13">${escapeXml(item.detail)}</text>

          <!-- Right Arrow Accent -->
          <circle cx="1020" cy="56" r="16" fill="#131F38" stroke="#1E293B" stroke-width="1" />
          <path d="M 1016 50 L 1024 56 L 1016 62" fill="none" stroke="${activeTheme.accent1}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      `;
    }).join('\n');

    centerContentSvg = cardsSvg;
  }

  // Complete SVG Assembly
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Background Gradients -->
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${activeTheme.bg1}" />
          <stop offset="60%" stop-color="${activeTheme.bg2}" />
          <stop offset="100%" stop-color="#030508" />
        </linearGradient>

        <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${activeTheme.accent1}" />
          <stop offset="100%" stop-color="${activeTheme.accent2}" />
        </linearGradient>

        <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2563EB" />
          <stop offset="50%" stop-color="${activeTheme.accent2}" />
          <stop offset="100%" stop-color="${activeTheme.accent1}" />
        </linearGradient>

        <linearGradient id="brandPillGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#111827" />
          <stop offset="100%" stop-color="#1E293B" />
        </linearGradient>

        <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="20" r="1" fill="#FFFFFF" fill-opacity="0.05" />
        </pattern>

        <filter id="auroraGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="90" result="blur" />
        </filter>
      </defs>

      <!-- 1. Deep Space Base Background -->
      <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

      <!-- 2. Subtle Blueprint Grid Pattern -->
      <rect width="${width}" height="${height}" fill="url(#gridPattern)" />

      <!-- 3. Ambient Aurora Glows -->
      <circle cx="1080" cy="90" r="220" fill="${activeTheme.glow1}" opacity="0.28" filter="url(#auroraGlow)" />
      <circle cx="90" cy="540" r="200" fill="${activeTheme.glow2}" opacity="0.22" filter="url(#auroraGlow)" />

      <!-- 4. Framing Reticles (High-Tech Engineering Detail) -->
      <path d="M 35 45 L 35 25 L 55 25" fill="none" stroke="#334155" stroke-width="1.5" />
      <path d="M 1165 45 L 1165 25 L 1145 25" fill="none" stroke="#334155" stroke-width="1.5" />
      <path d="M 35 585 L 35 605 L 55 605" fill="none" stroke="#334155" stroke-width="1.5" />
      <path d="M 1165 585 L 1165 605 L 1145 605" fill="none" stroke="#334155" stroke-width="1.5" />

      <!-- 5. Top Header Section -->
      <g transform="translate(70, 36)">
        <!-- Category Badge -->
        <rect x="0" y="0" width="${badgeWidth}" height="26" rx="6" fill="${activeTheme.badgeBg}" stroke="${activeTheme.badgeBorder}" stroke-width="1" />
        <circle cx="14" cy="13" r="3.5" fill="${activeTheme.accent1}" />
        <text x="26" y="17" fill="${activeTheme.accent1}" font-family="${FONT_SANS}" font-weight="700" font-size="11" letter-spacing="1.2">${escapeXml(categoryLabel)}</text>

        <!-- Main Punchy Title -->
        <text x="0" y="58" fill="#F8FAFC" font-family="${FONT_SANS}" font-weight="700" font-size="28" letter-spacing="-0.4">${escapeXml(cleanTitle)}</text>

        <!-- Context Subtitle -->
        <text x="0" y="84" fill="#94A3B8" font-family="${FONT_SANS}" font-weight="400" font-size="14">${escapeXml(cleanSubtitle)}</text>
      </g>

      <!-- 6. Center Dynamic Content (Code / Takeaways / Benchmark) -->
      ${centerContentSvg}

      <!-- 7. Bottom Author & Personal Branding Bar -->
      <!-- Divider Lines -->
      <line x1="70" y1="548" x2="1130" y2="548" stroke="#1E293B" stroke-width="1.5" />
      <line x1="480" y1="548" x2="720" y2="548" stroke="url(#accentGrad)" stroke-width="2" />

      <!-- Left Side: Author Identity (SERAG) - Clean with NO blue check -->
      <g transform="translate(70, 560)">
        <!-- Glowing Avatar Circle with S -->
        <circle cx="24" cy="28" r="23" fill="none" stroke="url(#accentGrad)" stroke-width="1.5" opacity="0.8" />
        <circle cx="24" cy="28" r="20" fill="url(#avatarGrad)" />
        <text x="24" y="35" text-anchor="middle" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="800" font-size="18">S</text>

        <!-- Author Name: SERAG -->
        <text x="58" y="24" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="700" font-size="20" letter-spacing="0.2">${escapeXml(cleanAuthorName)}</text>

        <!-- Role / Title -->
        <text x="58" y="44" fill="#94A3B8" font-family="${FONT_SANS}" font-weight="400" font-size="13">${escapeXml(cleanAuthorRole)}</text>
      </g>

      <!-- Right Side: LinkedIn Engineering Badge -->
      <g transform="translate(850, 566)">
        <rect width="280" height="38" rx="19" fill="url(#brandPillGrad)" stroke="#334155" stroke-width="1" />
        <circle cx="20" cy="19" r="4" fill="${activeTheme.accent1}" />
        <text x="34" y="24" fill="#F1F5F9" font-family="${FONT_SANS}" font-weight="700" font-size="12" letter-spacing="0.8">LINKEDIN ENGINEERING</text>
        <text x="260" y="24" text-anchor="end" fill="${activeTheme.accent1}" font-family="${FONT_SANS}" font-weight="800" font-size="14">⚡</text>
      </g>
    </svg>
  `;

  const pngBuffer = await sharp(Buffer.from(svg))
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();

  return pngBuffer;
}
