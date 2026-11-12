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
const FONT_HANDWRITTEN = `'Segoe Print', 'Ink Free', 'Comic Sans MS', 'Caveat', cursive, sans-serif`;
const FONT_SERIF = `'Georgia', 'Cambria', 'Times New Roman', serif`;

/**
 * Clean word-wrapping helper for SVG text rendering
 */
function wrapText(text, maxCharsPerLine = 34, maxLines = 3) {
  if (!text) return [];
  const words = String(text).trim().split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (candidate.length <= maxCharsPerLine) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;

      if (lines.length === maxLines - 1) {
        // Last line: pack remaining words up to maxCharsPerLine
        const remainingWords = words.slice(i);
        let lastLine = '';
        let overflow = false;
        for (const remWord of remainingWords) {
          const testLast = lastLine ? `${lastLine} ${remWord}` : remWord;
          if (testLast.length <= maxCharsPerLine) {
            lastLine = testLast;
          } else {
            overflow = true;
            break;
          }
        }
        if (overflow) {
          lastLine = lastLine.slice(0, Math.max(10, maxCharsPerLine - 3)).trim() + '...';
        }
        lines.push(lastLine);
        return lines;
      }
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  return lines;
}

function renderWrappedText({
  text,
  x,
  startY,
  lineSpacing = 24,
  maxCharsPerLine = 34,
  maxLines = 2,
  fill = '#F8FAFC',
  fontSize = 18,
  fontWeight = '700',
  font = FONT_SANS
}) {
  const lines = wrapText(text, maxCharsPerLine, maxLines);
  return lines.map((line, idx) => {
    const y = startY + idx * lineSpacing;
    return `<text x="${x}" y="${y}" fill="${fill}" font-family="${font}" font-weight="${fontWeight}" font-size="${fontSize}">${escapeXml(line)}</text>`;
  }).join('\n');
}

function highlightCodeLine(line, isLightBg = false) {
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('--') || trimmed.startsWith('#')) {
    const commentColor = isLightBg ? '#DC2626' : '#64748B'; // Red pen on paper, slate on dark
    return `<tspan fill="${commentColor}" font-style="italic">${escapeXml(line)}</tspan>`;
  }

  const tokenRegex = /(\/\/[^\n]*|--[^\n]*)|("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|`[^`\\]*(?:\\.[^`\\]*)*`)|(\b(?:const|let|var|function|async|await|return|if|else|try|catch|finally|throw|new|class|import|export|from|default|type|interface|extends|implements|SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|ON|ORDER|BY|GROUP|LIMIT|INDEX|CREATE|TABLE|BEGIN|COMMIT|ROLLBACK|CASCADE|PRIMARY|KEY)\b)|(\b(?:true|false|null|undefined|nil)\b)|(\b\d+(?:\.\d+)?(?:ms|s|mb|gb|kb)?\b)|(\b[a-zA-Z0-9_$]+(?=\s*\())|(\b[A-Z][a-zA-Z0-9_$]*\b)|([^a-zA-Z0-9_$\s"'\`]+|\s+|[a-zA-Z0-9_$]+)/g;

  let result = '';
  let match;
  while ((match = tokenRegex.exec(line)) !== null) {
    const [full, comment, str, keyword, boolNull, number, func, typeIdent, other] = match;
    if (comment) {
      const commentColor = isLightBg ? '#DC2626' : '#64748B';
      result += `<tspan fill="${commentColor}" font-style="italic">${escapeXml(comment)}</tspan>`;
    } else if (str) {
      const strColor = isLightBg ? '#047857' : '#34D399';
      result += `<tspan fill="${strColor}">${escapeXml(str)}</tspan>`;
    } else if (keyword) {
      const kwColor = isLightBg ? '#1D4ED8' : '#C084FC';
      result += `<tspan fill="${kwColor}" font-weight="600">${escapeXml(keyword)}</tspan>`;
    } else if (boolNull) {
      const bnColor = isLightBg ? '#D97706' : '#F59E0B';
      result += `<tspan fill="${bnColor}">${escapeXml(boolNull)}</tspan>`;
    } else if (number) {
      const numColor = isLightBg ? '#B45309' : '#FBBF24';
      result += `<tspan fill="${numColor}">${escapeXml(number)}</tspan>`;
    } else if (func) {
      const fnColor = isLightBg ? '#0284C7' : '#38BDF8';
      result += `<tspan fill="${fnColor}">${escapeXml(func)}</tspan>`;
    } else if (typeIdent) {
      const typeColor = isLightBg ? '#2563EB' : '#60A5FA';
      result += `<tspan fill="${typeColor}">${escapeXml(typeIdent)}</tspan>`;
    } else {
      const otherColor = isLightBg ? '#0F172A' : '#CBD5E1';
      result += `<tspan fill="${otherColor}">${escapeXml(other)}</tspan>`;
    }
  }

  return result || escapeXml(line);
}

const THEMES = {
  indigo: {
    name: 'indigo',
    bg1: '#070A14',
    bg2: '#0D1426',
    cardBg: '#0F172A',
    cardBorder: '#1E293B',
    accent1: '#38BDF8',
    accent2: '#6366F1',
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
    accent1: '#10B981',
    accent2: '#14B8A6',
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
    accent1: '#A855F7',
    accent2: '#EC4899',
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
    accent1: '#F59E0B',
    accent2: '#F97316',
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
    accent1: '#06B6D4',
    accent2: '#3B82F6',
    glow1: '#0891B2',
    glow2: '#1D4ED8',
    badgeBg: 'rgba(6, 182, 212, 0.12)',
    badgeBorder: '#0891B2',
    badgeText: '#22D3EE',
    categoryLabel: 'API ARCHITECTURE'
  }
};

const STYLES = ['paper', 'painted', 'blueprint', 'brutalist', 'terminal'];

// ============================================================================
// 1. PAPER & HANDWRITTEN NOTEBOOK STYLE (Warm Paper, Tape, Pen & Sticky Notes)
// ============================================================================
function renderPaperStyle({
  width,
  height,
  effectiveType,
  cleanTitle,
  cleanSubtitle,
  categoryLabel,
  codeSnippet,
  language,
  comparison,
  formattedTakeaways,
  cleanAuthorName,
  cleanAuthorRole
}) {
  let centerContent = '';

  if (effectiveType === 'code' && codeSnippet) {
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
        const highlighted = highlightCodeLine(line.slice(0, 70), true);
        return `
          <text x="122" y="${y}" text-anchor="end" fill="#9CA3AF" font-family="${FONT_MONO}" font-size="14">${idx + 1}</text>
          <text x="145" y="${y}" font-family="${FONT_MONO}" font-size="15" xml:space="preserve">${highlighted}</text>
        `;
      })
      .join('\n');

    centerContent = `
      <!-- Paper Cutout Outer Card -->
      <g filter="url(#paperShadow)">
        <rect x="70" y="145" width="1060" height="385" rx="12" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.8" />
      </g>

      <!-- Tape Strip at Top Center -->
      <rect x="540" y="134" width="120" height="24" rx="3" fill="#FEF08A" opacity="0.85" transform="rotate(-2 600 146)" />

      <!-- Notebook Lined Header -->
      <path d="M 70 157 A 12 12 0 0 1 82 145 L 1118 145 A 12 12 0 0 1 1130 157 L 1130 188 L 70 188 Z" fill="#F8FAFC" />
      <line x1="70" y1="188" x2="1130" y2="188" stroke="#E2E8F0" stroke-width="1.5" />

      <!-- Hand-drawn Style Dots -->
      <circle cx="98" cy="166" r="6" fill="#FCA5A5" stroke="#EF4444" stroke-width="1.2" />
      <circle cx="118" cy="166" r="6" fill="#FDE68A" stroke="#F59E0B" stroke-width="1.2" />
      <circle cx="138" cy="166" r="6" fill="#A7F3D0" stroke="#10B981" stroke-width="1.2" />

      <!-- File Tab Tag -->
      <rect x="165" y="153" width="220" height="25" rx="6" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="1" />
      <text x="180" y="170" fill="#64748B" font-family="${FONT_SANS}" font-size="12">📄</text>
      <text x="200" y="170" fill="#1E293B" font-family="${FONT_MONO}" font-weight="600" font-size="12">${escapeXml(tabFileName)}</text>

      <!-- Language Pill -->
      <rect x="990" y="153" width="120" height="25" rx="6" fill="#EFF6FF" stroke="#93C5FD" stroke-width="1" />
      <text x="1050" y="170" text-anchor="middle" fill="#1D4ED8" font-family="${FONT_SANS}" font-weight="700" font-size="12">${escapeXml(language.toUpperCase())}</text>

      <!-- Gutter Divider -->
      <line x1="132" y1="188" x2="132" y2="495" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="3 3" />

      <!-- Code Content -->
      ${codeLinesSvg}

      <!-- Bottom Lined Annotation -->
      <line x1="70" y1="495" x2="1130" y2="495" stroke="#E2E8F0" stroke-width="1" />
      <text x="95" y="516" fill="#DC2626" font-family="${FONT_HANDWRITTEN}" font-weight="700" font-size="16">✏️ Hand-verified in production // Atomic non-blocking pattern</text>
      <text x="1105" y="516" text-anchor="end" fill="#64748B" font-family="${FONT_MONO}" font-size="12">O(1) ATOMIC COMPLEXITY</text>
    `;
  } else if (effectiveType === 'benchmark' && comparison) {
    const beforeLabel = (comparison.beforeLabel || 'NAIVE PATTERN').slice(0, 24);
    const beforeText = comparison.beforeText || 'Full Table Scan & High Memory Usage';
    const afterLabel = (comparison.afterLabel || 'PRODUCTION FIX').slice(0, 24);
    const afterText = comparison.afterText || 'Composite Index & Zero Memory Spikes';
    const metricText = (comparison.metric || '99.4% Latency Drop & O(1) Scalability').slice(0, 68);

    const beforeMetric = comparison.beforeMetric || (beforeText.toLowerCase().includes('connection') ? 'UNCAPPED' : '1,450 ms');
    const beforeMetricDetail = comparison.beforeMetricDetail || 'High Resource Contention & Latency Spikes';
    const afterMetric = comparison.afterMetric || (afterText.toLowerCase().includes('pool') || afterText.toLowerCase().includes('connection') ? 'BOUNDED POOL' : '4 ms');
    const afterMetricDetail = comparison.afterMetricDetail || 'Sub-Millisecond Queuing & Stable Memory';

    const wrappedBeforeText = renderWrappedText({
      text: beforeText,
      x: 25,
      startY: 96,
      lineSpacing: 24,
      maxCharsPerLine: 34,
      maxLines: 2,
      fill: '#881337',
      fontSize: 18,
      fontWeight: '700',
      font: FONT_SANS
    });

    const wrappedAfterText = renderWrappedText({
      text: afterText,
      x: 25,
      startY: 96,
      lineSpacing: 24,
      maxCharsPerLine: 34,
      maxLines: 2,
      fill: '#064E3B',
      fontSize: 18,
      fontWeight: '700',
      font: FONT_SANS
    });

    centerContent = `
      <!-- Left Sticky Note: Before / Bottleneck -->
      <g transform="translate(70, 145)" filter="url(#paperShadow)">
        <rect width="485" height="285" rx="14" fill="#FFF1F2" stroke="#FDA4AF" stroke-width="1.8" />
        <!-- Masking Tape on Top -->
        <rect x="180" y="-12" width="120" height="24" rx="3" fill="#FDE047" opacity="0.85" transform="rotate(-3 240 0)" />
        
        <rect x="0" y="0" width="485" height="42" rx="14" fill="#FFE4E6" />
        <line x1="0" y1="42" x2="485" y2="42" stroke="#FDA4AF" stroke-width="1" />
        
        <text x="25" y="27" fill="#E11D48" font-family="${FONT_HANDWRITTEN}" font-weight="700" font-size="17">❌ ${escapeXml(beforeLabel)} (WHAT BROKE)</text>
        
        <text x="25" y="70" fill="#9F1239" font-family="${FONT_SANS}" font-weight="700" font-size="12" letter-spacing="0.5">THE BOTTLENECK:</text>
        ${wrappedBeforeText}
        
        <rect x="25" y="160" width="435" height="100" rx="10" fill="#FFFFFF" stroke="#FECDD3" stroke-width="1.5" />
        <text x="45" y="202" fill="#E11D48" font-family="${FONT_MONO}" font-weight="800" font-size="24">${escapeXml(beforeMetric)}</text>
        <text x="45" y="234" fill="#9F1239" font-family="${FONT_SANS}" font-size="13">${escapeXml(beforeMetricDetail)}</text>
      </g>

      <!-- Right Sticky Note: After / Solution -->
      <g transform="translate(645, 145)" filter="url(#paperShadow)">
        <rect width="485" height="285" rx="14" fill="#F0FDF4" stroke="#86EFAC" stroke-width="1.8" />
        <!-- Masking Tape on Top -->
        <rect x="180" y="-12" width="120" height="24" rx="3" fill="#FDE047" opacity="0.85" transform="rotate(2 240 0)" />
        
        <rect x="0" y="0" width="485" height="42" rx="14" fill="#DCFCE7" />
        <line x1="0" y1="42" x2="485" y2="42" stroke="#86EFAC" stroke-width="1" />
        
        <text x="25" y="27" fill="#059669" font-family="${FONT_HANDWRITTEN}" font-weight="700" font-size="17">⚡ ${escapeXml(afterLabel)} (THE FIX)</text>
        
        <text x="25" y="70" fill="#065F46" font-family="${FONT_SANS}" font-weight="700" font-size="12" letter-spacing="0.5">ENGINEERING SOLUTION:</text>
        ${wrappedAfterText}
        
        <rect x="25" y="160" width="435" height="100" rx="10" fill="#FFFFFF" stroke="#BBF7D0" stroke-width="1.5" />
        <text x="45" y="202" fill="#059669" font-family="${FONT_MONO}" font-weight="800" font-size="24">${escapeXml(afterMetric)}</text>
        <text x="45" y="234" fill="#065F46" font-family="${FONT_SANS}" font-size="13">${escapeXml(afterMetricDetail)}</text>
      </g>

      <!-- Bottom Highlighter Ribbon -->
      <g transform="translate(70, 452)" filter="url(#paperShadow)">
        <rect width="1060" height="68" rx="12" fill="#FEF08A" stroke="#FACC15" stroke-width="1.8" />
        <circle cx="45" cy="34" r="16" fill="#F59E0B" />
        <text x="45" y="41" text-anchor="middle" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="800" font-size="16">🚀</text>
        <text x="75" y="30" fill="#B45309" font-family="${FONT_SANS}" font-weight="800" font-size="12" letter-spacing="1">SYSTEM PERFORMANCE RESULT</text>
        <text x="75" y="52" fill="#78350F" font-family="${FONT_SANS}" font-weight="800" font-size="17">${escapeXml(metricText)}</text>
      </g>
    `;
  } else {
    // Takeaways on Lined Note Cards
    const cardsSvg = formattedTakeaways.map((item, idx) => {
      const y = 145 + idx * 125;
      const num = idx + 1;
      return `
        <!-- Note Card ${num} -->
        <g transform="translate(70, ${y})" filter="url(#paperShadow)">
          <rect width="1060" height="112" rx="12" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" />
          <rect x="0" y="0" width="6" height="112" rx="3" fill="#EA580C" />

          <!-- Stamped Red Number Circle -->
          <circle cx="56" cy="56" r="24" fill="#FFF7ED" stroke="#FDBA74" stroke-width="1.5" />
          <text x="56" y="64" text-anchor="middle" fill="#EA580C" font-family="${FONT_HANDWRITTEN}" font-weight="900" font-size="24">${num}</text>

          <!-- Tag Pill -->
          <rect x="105" y="24" width="130" height="22" rx="5" fill="#FEF3C7" stroke="#FCD34D" stroke-width="1" />
          <text x="170" y="39" text-anchor="middle" fill="#B45309" font-family="${FONT_SANS}" font-weight="800" font-size="11" letter-spacing="1.2">${escapeXml(item.tag.toUpperCase())}</text>

          <!-- Insight -->
          <text x="105" y="70" fill="#0F172A" font-family="${FONT_SANS}" font-weight="700" font-size="18">${escapeXml(item.text)}</text>
          <text x="105" y="94" fill="#64748B" font-family="${FONT_SANS}" font-weight="500" font-size="13">${escapeXml(item.detail)}</text>

          <!-- Right Marker Arrow -->
          <path d="M 1014 50 L 1024 56 L 1014 62" fill="none" stroke="#EA580C" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      `;
    }).join('\n');

    centerContent = cardsSvg;
  }

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Paper Grid Pattern -->
        <pattern id="paperGrid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#E6DFD1" stroke-width="0.8" />
        </pattern>

        <filter id="paperShadow" x="-5%" y="-5%" width="110%" height="118%">
          <feDropShadow dx="2" dy="4" stdDeviation="5" flood-color="#44403C" flood-opacity="0.08" />
        </filter>
      </defs>

      <!-- Warm Paper Base -->
      <rect width="${width}" height="${height}" fill="#FBF8F1" />
      <rect width="${width}" height="${height}" fill="url(#paperGrid)" />

      <!-- Corner Pins / Paper Clips -->
      <rect x="40" y="20" width="8" height="24" rx="4" fill="#94A3B8" />
      <rect x="1152" y="20" width="8" height="24" rx="4" fill="#94A3B8" />

      <!-- Top Header -->
      <g transform="translate(70, 36)">
        <rect x="0" y="0" width="230" height="26" rx="6" fill="#F5F0E4" stroke="#D6D3D1" stroke-width="1.2" stroke-dasharray="3 3" />
        <text x="14" y="17" fill="#78716C" font-family="${FONT_HANDWRITTEN}" font-weight="700" font-size="13">📓 ARCHITECT NOTEBOOK</text>

        <text x="0" y="58" fill="#18181B" font-family="${FONT_SANS}" font-weight="800" font-size="28" letter-spacing="-0.4">${escapeXml(cleanTitle)}</text>
        <text x="0" y="84" fill="#57534E" font-family="${FONT_HANDWRITTEN}" font-weight="700" font-size="15">✏️ ${escapeXml(cleanSubtitle)}</text>
      </g>

      <!-- Center Content -->
      ${centerContent}

      <!-- Bottom Author Bar -->
      <line x1="70" y1="548" x2="1130" y2="548" stroke="#D6D3D1" stroke-width="1.5" stroke-dasharray="4 3" />

      <g transform="translate(70, 560)">
        <circle cx="24" cy="28" r="22" fill="#EA580C" />
        <text x="24" y="35" text-anchor="middle" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="800" font-size="18">S</text>

        <text x="58" y="25" fill="#18181B" font-family="${FONT_SANS}" font-weight="800" font-size="20">${escapeXml(cleanAuthorName)} ✍️</text>
        <text x="58" y="45" fill="#78716C" font-family="${FONT_HANDWRITTEN}" font-weight="700" font-size="14">${escapeXml(cleanAuthorRole)}</text>
      </g>

      <g transform="translate(850, 566)">
        <rect width="280" height="38" rx="10" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" />
        <circle cx="20" cy="19" r="4" fill="#EA580C" />
        <text x="34" y="24" fill="#334155" font-family="${FONT_SANS}" font-weight="800" font-size="12" letter-spacing="0.5">ENGINEERING NOTEBOOK</text>
        <text x="260" y="24" text-anchor="end" fill="#EA580C" font-family="${FONT_SANS}" font-weight="800" font-size="14">⚡</text>
      </g>
    </svg>
  `;
}

// ============================================================================
// 2. PAINTED / MODERN ARTISTIC CANVAS STYLE (Fluid Gradients & Colorful Poster)
// ============================================================================
function renderPaintedStyle({
  width,
  height,
  effectiveType,
  cleanTitle,
  cleanSubtitle,
  categoryLabel,
  codeSnippet,
  language,
  comparison,
  formattedTakeaways,
  cleanAuthorName,
  cleanAuthorRole
}) {
  let centerContent = '';

  if (effectiveType === 'code' && codeSnippet) {
    const rawLines = codeSnippet
      .split('\n')
      .map(l => l.replace(/\t/g, '  '))
      .slice(0, 10);

    const lineSpacing = rawLines.length <= 7 ? 34 : (rawLines.length <= 9 ? 30 : 27);
    const startY = 220;

    const codeLinesSvg = rawLines
      .map((line, idx) => {
        const y = startY + idx * lineSpacing;
        const highlighted = highlightCodeLine(line.slice(0, 70), false);
        return `
          <text x="122" y="${y}" text-anchor="end" fill="#64748B" font-family="${FONT_MONO}" font-size="14">${idx + 1}</text>
          <text x="145" y="${y}" font-family="${FONT_MONO}" font-size="15" xml:space="preserve">${highlighted}</text>
        `;
      })
      .join('\n');

    centerContent = `
      <!-- Painted Frosted Card -->
      <rect x="70" y="145" width="1060" height="385" rx="20" fill="#0C1021" fill-opacity="0.88" stroke="url(#paintGrad)" stroke-width="2" />

      <!-- Top Window Bar -->
      <path d="M 70 165 A 20 20 0 0 1 90 145 L 1110 145 A 20 20 0 0 1 1130 165 L 1130 190 L 70 190 Z" fill="#13192E" />
      <line x1="70" y1="190" x2="1130" y2="190" stroke="#1E293B" stroke-width="1.5" />

      <circle cx="100" cy="167" r="6" fill="#F43F5E" />
      <circle cx="120" cy="167" r="6" fill="#FBBF24" />
      <circle cx="140" cy="167" r="6" fill="#34D399" />

      <!-- Pill -->
      <rect x="980" y="154" width="130" height="26" rx="13" fill="url(#paintGrad)" />
      <text x="1045" y="171" text-anchor="middle" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="800" font-size="12">${escapeXml(language.toUpperCase())}</text>

      <line x1="132" y1="190" x2="132" y2="495" stroke="#1E293B" stroke-width="1" stroke-dasharray="2 3" />
      ${codeLinesSvg}

      <line x1="70" y1="495" x2="1130" y2="495" stroke="#1E293B" stroke-width="1" />
      <circle cx="95" cy="512" r="4" fill="#F43F5E" />
      <text x="110" y="516" fill="#E2E8F0" font-family="${FONT_SANS}" font-weight="700" font-size="12">ARTISTIC CODE BLUEPRINT • HIGH CONCURRENCY</text>
      <text x="1105" y="516" text-anchor="end" fill="#94A3B8" font-family="${FONT_MONO}" font-size="12">O(1) ATOMIC</text>
    `;
  } else if (effectiveType === 'benchmark' && comparison) {
    const beforeLabel = (comparison.beforeLabel || 'NAIVE PATTERN').slice(0, 24);
    const beforeText = comparison.beforeText || 'Full Table Scan & High Memory Usage';
    const afterLabel = (comparison.afterLabel || 'OPTIMIZED ARCHITECTURE').slice(0, 24);
    const afterText = comparison.afterText || 'Composite Index & Zero Memory Spikes';
    const metricText = (comparison.metric || '99.4% Latency Drop & O(1) Scalability').slice(0, 68);

    const beforeMetric = comparison.beforeMetric || '1,450 ms';
    const beforeMetricDetail = comparison.beforeMetricDetail || 'High Resource Contention';
    const afterMetric = comparison.afterMetric || '4 ms';
    const afterMetricDetail = comparison.afterMetricDetail || 'Sub-Millisecond Queuing';

    const wrappedBeforeText = renderWrappedText({
      text: beforeText,
      x: 25,
      startY: 96,
      lineSpacing: 24,
      maxCharsPerLine: 34,
      maxLines: 2,
      fill: '#F8FAFC',
      fontSize: 18,
      fontWeight: '700'
    });

    const wrappedAfterText = renderWrappedText({
      text: afterText,
      x: 25,
      startY: 96,
      lineSpacing: 24,
      maxCharsPerLine: 34,
      maxLines: 2,
      fill: '#F8FAFC',
      fontSize: 18,
      fontWeight: '700'
    });

    centerContent = `
      <g transform="translate(70, 145)">
        <rect width="485" height="285" rx="18" fill="#1A0D18" stroke="#BE123C" stroke-width="2" />
        <rect x="0" y="0" width="485" height="42" rx="18" fill="#2E1123" />
        <circle cx="28" cy="21" r="5" fill="#F43F5E" />
        <text x="44" y="26" fill="#FDA4AF" font-family="${FONT_SANS}" font-weight="800" font-size="12">❌ ${escapeXml(beforeLabel.toUpperCase())}</text>
        <text x="25" y="70" fill="#CBD5E1" font-family="${FONT_SANS}" font-weight="700" font-size="12">BOTTLENECK:</text>
        ${wrappedBeforeText}
        <rect x="25" y="160" width="435" height="100" rx="12" fill="#2E1123" stroke="#9F1239" stroke-width="1" />
        <text x="45" y="202" fill="#FB7185" font-family="${FONT_MONO}" font-weight="900" font-size="26">${escapeXml(beforeMetric)}</text>
        <text x="45" y="234" fill="#FDA4AF" font-family="${FONT_SANS}" font-size="13">${escapeXml(beforeMetricDetail)}</text>
      </g>

      <g transform="translate(645, 145)">
        <rect width="485" height="285" rx="18" fill="#061A1D" stroke="#0D9488" stroke-width="2" />
        <rect x="0" y="0" width="485" height="42" rx="18" fill="#0C2D32" />
        <circle cx="28" cy="21" r="5" fill="#2DD4BF" />
        <text x="44" y="26" fill="#99F6E4" font-family="${FONT_SANS}" font-weight="800" font-size="12">⚡ ${escapeXml(afterLabel.toUpperCase())}</text>
        <text x="25" y="70" fill="#CBD5E1" font-family="${FONT_SANS}" font-weight="700" font-size="12">ENGINEERING SOLUTION:</text>
        ${wrappedAfterText}
        <rect x="25" y="160" width="435" height="100" rx="12" fill="#0C2D32" stroke="#14B8A6" stroke-width="1" />
        <text x="45" y="202" fill="#2DD4BF" font-family="${FONT_MONO}" font-weight="900" font-size="26">${escapeXml(afterMetric)}</text>
        <text x="45" y="234" fill="#99F6E4" font-family="${FONT_SANS}" font-size="13">${escapeXml(afterMetricDetail)}</text>
      </g>

      <g transform="translate(70, 452)">
        <rect width="1060" height="68" rx="16" fill="#0F172A" stroke="url(#paintGrad)" stroke-width="2" />
        <circle cx="45" cy="34" r="16" fill="url(#paintGrad)" />
        <text x="45" y="41" text-anchor="middle" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="800" font-size="16">🎨</text>
        <text x="75" y="30" fill="#F43F5E" font-family="${FONT_SANS}" font-weight="800" font-size="12" letter-spacing="1">SYSTEM PERFORMANCE RESULT</text>
        <text x="75" y="52" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="800" font-size="17">${escapeXml(metricText)}</text>
      </g>
    `;
  } else {
    centerContent = formattedTakeaways.map((item, idx) => {
      const y = 145 + idx * 125;
      const num = `0${idx + 1}`;
      return `
        <g transform="translate(70, ${y})">
          <rect width="1060" height="112" rx="16" fill="#0C1021" stroke="url(#paintGrad)" stroke-width="1.5" />
          <rect x="0" y="0" width="8" height="112" rx="4" fill="url(#paintGrad)" />

          <rect x="28" y="24" width="64" height="64" rx="16" fill="#13192E" stroke="#334155" stroke-width="1" />
          <text x="60" y="64" text-anchor="middle" fill="url(#paintGrad)" font-family="${FONT_SANS}" font-weight="900" font-size="24">${num}</text>

          <rect x="110" y="24" width="130" height="22" rx="6" fill="#1E1B4B" stroke="#6366F1" stroke-width="1" />
          <text x="175" y="39" text-anchor="middle" fill="#A5B4FC" font-family="${FONT_SANS}" font-weight="800" font-size="11" letter-spacing="1">${escapeXml(item.tag.toUpperCase())}</text>

          <text x="110" y="70" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="800" font-size="18">${escapeXml(item.text)}</text>
          <text x="110" y="94" fill="#94A3B8" font-family="${FONT_SANS}" font-weight="500" font-size="13">${escapeXml(item.detail)}</text>

          <circle cx="1020" cy="56" r="16" fill="#13192E" />
          <path d="M 1016 50 L 1024 56 L 1016 62" fill="none" stroke="#F43F5E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      `;
    }).join('\n');
  }

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="paintBase" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#080B1A" />
          <stop offset="50%" stop-color="#180B26" />
          <stop offset="100%" stop-color="#050814" />
        </linearGradient>

        <linearGradient id="paintGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#F43F5E" />
          <stop offset="50%" stop-color="#A855F7" />
          <stop offset="100%" stop-color="#06B6D4" />
        </linearGradient>

        <filter id="paintBlur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="80" result="blur" />
        </filter>
      </defs>

      <!-- Base Canvas -->
      <rect width="${width}" height="${height}" fill="url(#paintBase)" />

      <!-- Glowing Color Blobs (Painted Vibe) -->
      <circle cx="1100" cy="100" r="240" fill="#F43F5E" opacity="0.25" filter="url(#paintBlur)" />
      <circle cx="100" cy="550" r="220" fill="#06B6D4" opacity="0.22" filter="url(#paintBlur)" />
      <circle cx="600" cy="300" r="180" fill="#8B5CF6" opacity="0.18" filter="url(#paintBlur)" />

      <!-- Top Header -->
      <g transform="translate(70, 36)">
        <rect x="0" y="0" width="220" height="26" rx="13" fill="url(#paintGrad)" />
        <text x="110" y="17" text-anchor="middle" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="800" font-size="11" letter-spacing="1">🎨 ENGINEERING CANVAS</text>

        <text x="0" y="58" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="800" font-size="28" letter-spacing="-0.4">${escapeXml(cleanTitle)}</text>
        <text x="0" y="84" fill="#CBD5E1" font-family="${FONT_SANS}" font-weight="500" font-size="14">${escapeXml(cleanSubtitle)}</text>
      </g>

      <!-- Center Content -->
      ${centerContent}

      <!-- Bottom Author Bar -->
      <line x1="70" y1="548" x2="1130" y2="548" stroke="#1E293B" stroke-width="1.5" />
      <line x1="450" y1="548" x2="750" y2="548" stroke="url(#paintGrad)" stroke-width="2.5" />

      <g transform="translate(70, 560)">
        <circle cx="24" cy="28" r="22" fill="url(#paintGrad)" />
        <text x="24" y="35" text-anchor="middle" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="800" font-size="18">S</text>

        <text x="58" y="24" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="800" font-size="20">${escapeXml(cleanAuthorName)}</text>
        <text x="58" y="44" fill="#94A3B8" font-family="${FONT_SANS}" font-weight="500" font-size="13">${escapeXml(cleanAuthorRole)}</text>
      </g>

      <g transform="translate(850, 566)">
        <rect width="280" height="38" rx="19" fill="#13192E" stroke="url(#paintGrad)" stroke-width="1.5" />
        <circle cx="20" cy="19" r="4" fill="#F43F5E" />
        <text x="34" y="24" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="800" font-size="12" letter-spacing="0.8">ARTISTIC ENGINEERING</text>
        <text x="260" y="24" text-anchor="end" fill="#06B6D4" font-family="${FONT_SANS}" font-weight="800" font-size="14">⚡</text>
      </g>
    </svg>
  `;
}

// ============================================================================
// 3. BLUEPRINT STYLE (Technical CAD / Architectural Blueprint)
// ============================================================================
function renderBlueprintStyle({
  width,
  height,
  effectiveType,
  cleanTitle,
  cleanSubtitle,
  categoryLabel,
  codeSnippet,
  language,
  comparison,
  formattedTakeaways,
  cleanAuthorName,
  cleanAuthorRole
}) {
  let centerContent = '';

  if (effectiveType === 'code' && codeSnippet) {
    const rawLines = codeSnippet
      .split('\n')
      .map(l => l.replace(/\t/g, '  '))
      .slice(0, 10);

    const lineSpacing = rawLines.length <= 7 ? 34 : (rawLines.length <= 9 ? 30 : 27);
    const startY = 220;

    const codeLinesSvg = rawLines
      .map((line, idx) => {
        const y = startY + idx * lineSpacing;
        const highlighted = highlightCodeLine(line.slice(0, 70), false);
        return `
          <text x="122" y="${y}" text-anchor="end" fill="#38BDF8" font-family="${FONT_MONO}" font-size="14">${idx + 1}</text>
          <text x="145" y="${y}" font-family="${FONT_MONO}" font-size="15" xml:space="preserve">${highlighted}</text>
        `;
      })
      .join('\n');

    centerContent = `
      <rect x="70" y="145" width="1060" height="385" rx="8" fill="#07192F" stroke="#0284C7" stroke-width="2" />
      <path d="M 70 153 A 8 8 0 0 1 78 145 L 1122 145 A 8 8 0 0 1 1130 153 L 1130 188 L 70 188 Z" fill="#0A2544" />
      <line x1="70" y1="188" x2="1130" y2="188" stroke="#0284C7" stroke-width="1.5" />

      <text x="95" y="170" fill="#38BDF8" font-family="${FONT_MONO}" font-weight="700" font-size="13">FIG 01 // ARCHITECTURAL CODE SPECIFICATION</text>
      <rect x="990" y="153" width="120" height="24" rx="4" fill="#07192F" stroke="#38BDF8" stroke-width="1" />
      <text x="1050" y="170" text-anchor="middle" fill="#38BDF8" font-family="${FONT_MONO}" font-weight="700" font-size="12">${escapeXml(language.toUpperCase())}</text>

      <line x1="132" y1="188" x2="132" y2="495" stroke="#0F355C" stroke-width="1" stroke-dasharray="2 3" />
      ${codeLinesSvg}

      <line x1="70" y1="495" x2="1130" y2="495" stroke="#0284C7" stroke-width="1" />
      <text x="95" y="516" fill="#7DD3FC" font-family="${FONT_MONO}" font-size="12">STATUS: COMPILED &amp; TESTED • ZERO CONCURRENCY RACE CONDITIONS</text>
      <text x="1105" y="516" text-anchor="end" fill="#38BDF8" font-family="${FONT_MONO}" font-size="12">SCALE: 1:1</text>
    `;
  } else if (effectiveType === 'benchmark' && comparison) {
    const beforeLabel = (comparison.beforeLabel || 'LEGACY ARCHITECTURE').slice(0, 24);
    const beforeText = comparison.beforeText || 'Full Table Scan & High Memory Usage';
    const afterLabel = (comparison.afterLabel || 'OPTIMIZED SPECIFICATION').slice(0, 24);
    const afterText = comparison.afterText || 'Composite Index & Zero Memory Spikes';
    const metricText = (comparison.metric || '99.4% Latency Drop & O(1) Scalability').slice(0, 68);

    const beforeMetric = comparison.beforeMetric || '1,450 ms';
    const beforeMetricDetail = comparison.beforeMetricDetail || 'High Resource Contention';
    const afterMetric = comparison.afterMetric || '4 ms';
    const afterMetricDetail = comparison.afterMetricDetail || 'Sub-Millisecond Queuing';

    const wrappedBeforeText = renderWrappedText({
      text: beforeText,
      x: 25,
      startY: 96,
      lineSpacing: 24,
      maxCharsPerLine: 34,
      maxLines: 2,
      fill: '#F8FAFC',
      fontSize: 18,
      fontWeight: '700'
    });

    const wrappedAfterText = renderWrappedText({
      text: afterText,
      x: 25,
      startY: 96,
      lineSpacing: 24,
      maxCharsPerLine: 34,
      maxLines: 2,
      fill: '#F8FAFC',
      fontSize: 18,
      fontWeight: '700'
    });

    centerContent = `
      <g transform="translate(70, 145)">
        <rect width="485" height="285" rx="8" fill="#081A30" stroke="#EF4444" stroke-width="1.8" />
        <rect x="0" y="0" width="485" height="40" rx="8" fill="#1E1524" />
        <text x="25" y="26" fill="#FCA5A5" font-family="${FONT_MONO}" font-weight="700" font-size="12">DEFECT: ${escapeXml(beforeLabel.toUpperCase())}</text>
        <text x="25" y="70" fill="#94A3B8" font-family="${FONT_MONO}" font-size="12">OBSERVED BOTTLENECK:</text>
        ${wrappedBeforeText}
        <rect x="25" y="160" width="435" height="100" rx="6" fill="#141E30" stroke="#EF4444" stroke-width="1" />
        <text x="45" y="202" fill="#F87171" font-family="${FONT_MONO}" font-weight="800" font-size="24">${escapeXml(beforeMetric)}</text>
        <text x="45" y="234" fill="#FCA5A5" font-family="${FONT_SANS}" font-size="13">${escapeXml(beforeMetricDetail)}</text>
      </g>

      <g transform="translate(645, 145)">
        <rect width="485" height="285" rx="8" fill="#081A30" stroke="#38BDF8" stroke-width="1.8" />
        <rect x="0" y="0" width="485" height="40" rx="8" fill="#0B2B4C" />
        <text x="25" y="26" fill="#7DD3FC" font-family="${FONT_MONO}" font-weight="700" font-size="12">TARGET: ${escapeXml(afterLabel.toUpperCase())}</text>
        <text x="25" y="70" fill="#94A3B8" font-family="${FONT_MONO}" font-size="12">ENGINEERED SOLUTION:</text>
        ${wrappedAfterText}
        <rect x="25" y="160" width="435" height="100" rx="6" fill="#09223D" stroke="#0284C7" stroke-width="1" />
        <text x="45" y="202" fill="#38BDF8" font-family="${FONT_MONO}" font-weight="800" font-size="24">${escapeXml(afterMetric)}</text>
        <text x="45" y="234" fill="#7DD3FC" font-family="${FONT_SANS}" font-size="13">${escapeXml(afterMetricDetail)}</text>
      </g>

      <g transform="translate(70, 452)">
        <rect width="1060" height="68" rx="8" fill="#0B2544" stroke="#0284C7" stroke-width="1.8" />
        <text x="35" y="30" fill="#38BDF8" font-family="${FONT_MONO}" font-weight="700" font-size="12">VERIFIED IMPACT BENCHMARK</text>
        <text x="35" y="52" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="800" font-size="17">${escapeXml(metricText)}</text>
      </g>
    `;
  } else {
    centerContent = formattedTakeaways.map((item, idx) => {
      const y = 145 + idx * 125;
      const num = `SPEC 0${idx + 1}`;
      return `
        <g transform="translate(70, ${y})">
          <rect width="1060" height="112" rx="8" fill="#07192F" stroke="#0284C7" stroke-width="1.5" />
          <rect x="0" y="0" width="6" height="112" fill="#38BDF8" />

          <text x="30" y="64" fill="#38BDF8" font-family="${FONT_MONO}" font-weight="800" font-size="16">${num}</text>

          <rect x="130" y="24" width="140" height="22" rx="4" fill="#0B2B4C" stroke="#38BDF8" stroke-width="1" />
          <text x="200" y="39" text-anchor="middle" fill="#7DD3FC" font-family="${FONT_MONO}" font-weight="700" font-size="11">[ ${escapeXml(item.tag.toUpperCase())} ]</text>

          <text x="130" y="70" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="700" font-size="18">${escapeXml(item.text)}</text>
          <text x="130" y="94" fill="#94A3B8" font-family="${FONT_SANS}" font-weight="400" font-size="13">${escapeXml(item.detail)}</text>
        </g>
      `;
    }).join('\n');
  }

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Blueprint Grid Pattern -->
        <pattern id="bpGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#0F355C" stroke-width="0.8" />
        </pattern>
        <pattern id="bpMajorGrid" width="100" height="100" patternUnits="userSpaceOnUse">
          <rect width="100" height="100" fill="url(#bpGrid)" />
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#0284C7" stroke-width="1.2" opacity="0.4" />
        </pattern>
      </defs>

      <rect width="${width}" height="${height}" fill="#0A1C36" />
      <rect width="${width}" height="${height}" fill="url(#bpMajorGrid)" />

      <!-- Corner Crosshairs -->
      <path d="M 30 25 L 50 25 M 40 15 L 40 35" stroke="#38BDF8" stroke-width="1.5" />
      <path d="M 1150 25 L 1170 25 M 1160 15 L 1160 35" stroke="#38BDF8" stroke-width="1.5" />
      <path d="M 30 605 L 50 605 M 40 595 L 40 615" stroke="#38BDF8" stroke-width="1.5" />
      <path d="M 1150 605 L 1170 605 M 1160 595 L 1160 615" stroke="#38BDF8" stroke-width="1.5" />

      <!-- Top Header -->
      <g transform="translate(70, 36)">
        <rect x="0" y="0" width="260" height="26" rx="4" fill="#0B2B4C" stroke="#38BDF8" stroke-width="1" />
        <text x="14" y="17" fill="#7DD3FC" font-family="${FONT_MONO}" font-weight="700" font-size="11">📐 ARCHITECTURAL BLUEPRINT</text>

        <text x="0" y="58" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="800" font-size="28">${escapeXml(cleanTitle)}</text>
        <text x="0" y="84" fill="#93C5FD" font-family="${FONT_MONO}" font-size="13">${escapeXml(cleanSubtitle)}</text>
      </g>

      <!-- Center Content -->
      ${centerContent}

      <!-- Bottom Author Bar -->
      <line x1="70" y1="548" x2="1130" y2="548" stroke="#0284C7" stroke-width="1.5" />

      <g transform="translate(70, 560)">
        <circle cx="24" cy="28" r="20" fill="#0284C7" />
        <text x="24" y="35" text-anchor="middle" fill="#FFFFFF" font-family="${FONT_MONO}" font-weight="800" font-size="18">S</text>

        <text x="58" y="24" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="800" font-size="20">${escapeXml(cleanAuthorName)}</text>
        <text x="58" y="44" fill="#7DD3FC" font-family="${FONT_MONO}" font-size="12">ARCHITECT // ${escapeXml(cleanAuthorRole)}</text>
      </g>

      <g transform="translate(850, 566)">
        <rect width="280" height="38" rx="6" fill="#0B2B4C" stroke="#38BDF8" stroke-width="1" />
        <text x="20" y="24" fill="#38BDF8" font-family="${FONT_MONO}" font-weight="700" font-size="12">SPEC REV: 4.2 • LINKEDIN</text>
        <text x="260" y="24" text-anchor="end" fill="#38BDF8" font-family="${FONT_MONO}" font-size="14">⚡</text>
      </g>
    </svg>
  `;
}

// ============================================================================
// 4. BRUTALIST STYLE (Neo-Brutalism High-Contrast Creator Card)
// ============================================================================
function renderBrutalistStyle({
  width,
  height,
  effectiveType,
  cleanTitle,
  cleanSubtitle,
  categoryLabel,
  codeSnippet,
  language,
  comparison,
  formattedTakeaways,
  cleanAuthorName,
  cleanAuthorRole
}) {
  let centerContent = '';

  if (effectiveType === 'code' && codeSnippet) {
    const rawLines = codeSnippet
      .split('\n')
      .map(l => l.replace(/\t/g, '  '))
      .slice(0, 10);

    const lineSpacing = rawLines.length <= 7 ? 34 : (rawLines.length <= 9 ? 30 : 27);
    const startY = 220;

    const codeLinesSvg = rawLines
      .map((line, idx) => {
        const y = startY + idx * lineSpacing;
        const highlighted = highlightCodeLine(line.slice(0, 70), true);
        return `
          <text x="122" y="${y}" text-anchor="end" fill="#71717A" font-family="${FONT_MONO}" font-size="14">${idx + 1}</text>
          <text x="145" y="${y}" font-family="${FONT_MONO}" font-size="15" xml:space="preserve">${highlighted}</text>
        `;
      })
      .join('\n');

    centerContent = `
      <!-- Brutalist Shadow -->
      <rect x="76" y="151" width="1060" height="385" fill="#000000" />
      <rect x="70" y="145" width="1060" height="385" fill="#FFFFFF" stroke="#000000" stroke-width="3" />

      <path d="M 70 145 L 1130 145 L 1130 188 L 70 188 Z" fill="#FDE047" stroke="#000000" stroke-width="3" />
      
      <circle cx="98" cy="166" r="6" fill="#000000" />
      <circle cx="118" cy="166" r="6" fill="#000000" />
      <circle cx="138" cy="166" r="6" fill="#000000" />

      <rect x="990" y="153" width="120" height="26" fill="#000000" />
      <text x="1050" y="171" text-anchor="middle" fill="#FFFFFF" font-family="${FONT_MONO}" font-weight="900" font-size="13">${escapeXml(language.toUpperCase())}</text>

      <line x1="132" y1="188" x2="132" y2="495" stroke="#E4E4E7" stroke-width="1.5" />
      ${codeLinesSvg}

      <line x1="70" y1="495" x2="1130" y2="495" stroke="#000000" stroke-width="2" />
      <text x="95" y="516" fill="#000000" font-family="${FONT_MONO}" font-weight="800" font-size="12">PRODUCTION PATTERN // HIGH CONCURRENCY</text>
      <text x="1105" y="516" text-anchor="end" fill="#000000" font-family="${FONT_MONO}" font-weight="800" font-size="12">O(1)</text>
    `;
  } else if (effectiveType === 'benchmark' && comparison) {
    const beforeLabel = (comparison.beforeLabel || 'NAIVE PATTERN').slice(0, 24);
    const beforeText = comparison.beforeText || 'Full Table Scan & High Memory Usage';
    const afterLabel = (comparison.afterLabel || 'OPTIMIZED FIX').slice(0, 24);
    const afterText = comparison.afterText || 'Composite Index & Zero Memory Spikes';
    const metricText = (comparison.metric || '99.4% Latency Drop & O(1) Scalability').slice(0, 68);

    const beforeMetric = comparison.beforeMetric || '1,450 ms';
    const beforeMetricDetail = comparison.beforeMetricDetail || 'High Resource Contention';
    const afterMetric = comparison.afterMetric || '4 ms';
    const afterMetricDetail = comparison.afterMetricDetail || 'Sub-Millisecond Queuing';

    const wrappedBeforeText = renderWrappedText({
      text: beforeText,
      x: 25,
      startY: 96,
      lineSpacing: 24,
      maxCharsPerLine: 34,
      maxLines: 2,
      fill: '#000000',
      fontSize: 18,
      fontWeight: '800'
    });

    const wrappedAfterText = renderWrappedText({
      text: afterText,
      x: 25,
      startY: 96,
      lineSpacing: 24,
      maxCharsPerLine: 34,
      maxLines: 2,
      fill: '#000000',
      fontSize: 18,
      fontWeight: '800'
    });

    centerContent = `
      <g transform="translate(70, 145)">
        <rect x="6" y="6" width="485" height="285" fill="#000000" />
        <rect width="485" height="285" fill="#FECDD3" stroke="#000000" stroke-width="3" />
        <rect x="0" y="0" width="485" height="42" fill="#FB7185" stroke="#000000" stroke-width="3" />
        <text x="25" y="27" fill="#000000" font-family="${FONT_SANS}" font-weight="900" font-size="13">❌ ${escapeXml(beforeLabel.toUpperCase())}</text>
        <text x="25" y="70" fill="#000000" font-family="${FONT_MONO}" font-weight="800" font-size="12">THE BOTTLENECK:</text>
        ${wrappedBeforeText}
        <rect x="25" y="160" width="435" height="100" fill="#FFFFFF" stroke="#000000" stroke-width="2.5" />
        <text x="45" y="202" fill="#E11D48" font-family="${FONT_MONO}" font-weight="900" font-size="26">${escapeXml(beforeMetric)}</text>
        <text x="45" y="234" fill="#000000" font-family="${FONT_SANS}" font-weight="700" font-size="13">${escapeXml(beforeMetricDetail)}</text>
      </g>

      <g transform="translate(645, 145)">
        <rect x="6" y="6" width="485" height="285" fill="#000000" />
        <rect width="485" height="285" fill="#A7F3D0" stroke="#000000" stroke-width="3" />
        <rect x="0" y="0" width="485" height="42" fill="#34D399" stroke="#000000" stroke-width="3" />
        <text x="25" y="27" fill="#000000" font-family="${FONT_SANS}" font-weight="900" font-size="13">⚡ ${escapeXml(afterLabel.toUpperCase())}</text>
        <text x="25" y="70" fill="#000000" font-family="${FONT_MONO}" font-weight="800" font-size="12">ENGINEERING SOLUTION:</text>
        ${wrappedAfterText}
        <rect x="25" y="160" width="435" height="100" fill="#FFFFFF" stroke="#000000" stroke-width="2.5" />
        <text x="45" y="202" fill="#059669" font-family="${FONT_MONO}" font-weight="900" font-size="26">${escapeXml(afterMetric)}</text>
        <text x="45" y="234" fill="#000000" font-family="${FONT_SANS}" font-weight="700" font-size="13">${escapeXml(afterMetricDetail)}</text>
      </g>

      <g transform="translate(70, 452)">
        <rect x="6" y="6" width="1060" height="68" fill="#000000" />
        <rect width="1060" height="68" fill="#FDE047" stroke="#000000" stroke-width="3" />
        <text x="35" y="30" fill="#000000" font-family="${FONT_MONO}" font-weight="900" font-size="12">SYSTEM PERFORMANCE RESULT</text>
        <text x="35" y="52" fill="#000000" font-family="${FONT_SANS}" font-weight="900" font-size="18">${escapeXml(metricText)}</text>
      </g>
    `;
  } else {
    centerContent = formattedTakeaways.map((item, idx) => {
      const y = 145 + idx * 125;
      const num = `0${idx + 1}`;
      return `
        <g transform="translate(70, ${y})">
          <rect x="6" y="6" width="1060" height="112" fill="#000000" />
          <rect width="1060" height="112" fill="#FFFFFF" stroke="#000000" stroke-width="3" />

          <rect x="28" y="24" width="64" height="64" fill="#FDE047" stroke="#000000" stroke-width="2.5" />
          <text x="60" y="64" text-anchor="middle" fill="#000000" font-family="${FONT_MONO}" font-weight="900" font-size="24">${num}</text>

          <rect x="110" y="24" width="140" height="22" fill="#000000" />
          <text x="180" y="39" text-anchor="middle" fill="#FFFFFF" font-family="${FONT_MONO}" font-weight="800" font-size="11">${escapeXml(item.tag.toUpperCase())}</text>

          <text x="110" y="70" fill="#000000" font-family="${FONT_SANS}" font-weight="900" font-size="18">${escapeXml(item.text)}</text>
          <text x="110" y="94" fill="#52525B" font-family="${FONT_SANS}" font-weight="600" font-size="13">${escapeXml(item.detail)}</text>
        </g>
      `;
    }).join('\n');
  }

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Cream Canvas -->
      <rect width="${width}" height="${height}" fill="#FFFDF5" />

      <!-- Top Header -->
      <g transform="translate(70, 36)">
        <rect x="0" y="0" width="220" height="26" fill="#000000" />
        <text x="110" y="17" text-anchor="middle" fill="#FDE047" font-family="${FONT_MONO}" font-weight="900" font-size="11">⚡ BRUTALIST ARCHITECTURE</text>

        <text x="0" y="58" fill="#000000" font-family="${FONT_SANS}" font-weight="900" font-size="28" letter-spacing="-0.5">${escapeXml(cleanTitle)}</text>
        <text x="0" y="84" fill="#3F3F46" font-family="${FONT_SANS}" font-weight="700" font-size="14">${escapeXml(cleanSubtitle)}</text>
      </g>

      <!-- Center Content -->
      ${centerContent}

      <!-- Bottom Author Bar -->
      <line x1="70" y1="548" x2="1130" y2="548" stroke="#000000" stroke-width="2.5" />

      <g transform="translate(70, 560)">
        <rect x="2" y="6" width="44" height="44" fill="#000000" />
        <rect x="0" y="4" width="44" height="44" fill="#FDE047" stroke="#000000" stroke-width="2" />
        <text x="22" y="32" text-anchor="middle" fill="#000000" font-family="${FONT_MONO}" font-weight="900" font-size="20">S</text>

        <text x="60" y="25" fill="#000000" font-family="${FONT_SANS}" font-weight="900" font-size="20">${escapeXml(cleanAuthorName)}</text>
        <text x="60" y="45" fill="#52525B" font-family="${FONT_SANS}" font-weight="700" font-size="13">${escapeXml(cleanAuthorRole)}</text>
      </g>

      <g transform="translate(850, 566)">
        <rect x="4" y="4" width="280" height="38" fill="#000000" />
        <rect width="280" height="38" fill="#FFFFFF" stroke="#000000" stroke-width="2.5" />
        <text x="20" y="24" fill="#000000" font-family="${FONT_MONO}" font-weight="900" font-size="12">CREATOR EDITION ⚡</text>
        <text x="260" y="24" text-anchor="end" fill="#000000" font-family="${FONT_MONO}" font-weight="900" font-size="14">★</text>
      </g>
    </svg>
  `;
}

// ============================================================================
// 5. TERMINAL / DARK CYBER STUDIO STYLE (Ray.so / Carbon Dark Mode)
// ============================================================================
function renderTerminalStyle({
  width,
  height,
  activeTheme,
  effectiveType,
  cleanTitle,
  cleanSubtitle,
  categoryLabel,
  codeSnippet,
  language,
  comparison,
  formattedTakeaways,
  cleanAuthorName,
  cleanAuthorRole
}) {
  const badgeWidth = Math.max(130, Math.min(260, categoryLabel.length * 8 + 36));
  let centerContentSvg = '';

  if (effectiveType === 'code' && codeSnippet) {
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
        const highlighted = highlightCodeLine(line.slice(0, 70), false);
        return `
          <text x="122" y="${y}" text-anchor="end" fill="#475569" font-family="${FONT_MONO}" font-size="14">${idx + 1}</text>
          <text x="145" y="${y}" font-family="${FONT_MONO}" font-size="15" xml:space="preserve">${highlighted}</text>
        `;
      })
      .join('\n');

    centerContentSvg = `
      <rect x="70" y="145" width="1060" height="385" rx="16" fill="#0B0F19" stroke="#1E293B" stroke-width="2" />
      <line x1="90" y1="145" x2="1110" y2="145" stroke="url(#accentGrad)" stroke-width="2" opacity="0.7" />

      <path d="M 70 161 A 16 16 0 0 1 86 145 L 1114 145 A 16 16 0 0 1 1130 161 L 1130 188 L 70 188 Z" fill="#111827" />
      <line x1="70" y1="188" x2="1130" y2="188" stroke="#1F2937" stroke-width="1.5" />

      <circle cx="98" cy="166" r="6" fill="#EF4444" />
      <circle cx="118" cy="166" r="6" fill="#F59E0B" />
      <circle cx="138" cy="166" r="6" fill="#10B981" />

      <rect x="165" y="152" width="220" height="26" rx="6" fill="#0B0F19" stroke="#374151" stroke-width="1" />
      <text x="178" y="169" fill="#9CA3AF" font-family="${FONT_SANS}" font-size="12">📄</text>
      <text x="198" y="169" fill="#E5E7EB" font-family="${FONT_MONO}" font-weight="600" font-size="12">${escapeXml(tabFileName)}</text>

      <rect x="990" y="152" width="120" height="26" rx="6" fill="${activeTheme.badgeBg}" stroke="${activeTheme.badgeBorder}" stroke-width="1" />
      <text x="1050" y="169" text-anchor="middle" fill="${activeTheme.accent1}" font-family="${FONT_SANS}" font-weight="700" font-size="12" letter-spacing="1.2">${escapeXml(language.toUpperCase())}</text>

      <line x1="132" y1="188" x2="132" y2="495" stroke="#1E293B" stroke-width="1" stroke-dasharray="2 3" />
      ${codeLinesSvg}

      <line x1="70" y1="495" x2="1130" y2="495" stroke="#1F2937" stroke-width="1" />
      <circle cx="95" cy="512" r="3.5" fill="${activeTheme.accent1}" />
      <text x="108" y="516" fill="#94A3B8" font-family="${FONT_SANS}" font-weight="600" font-size="12" letter-spacing="0.5">PRODUCTION PATTERN • ASYNC NON-BLOCKING</text>
      <text x="1105" y="516" text-anchor="end" fill="#64748B" font-family="${FONT_MONO}" font-size="12">O(1) ATOMIC COMPLEXITY</text>
    `;
  } else if (effectiveType === 'benchmark' && comparison) {
    const beforeLabel = (comparison.beforeLabel || 'NAIVE PATTERN').slice(0, 24);
    const beforeText = comparison.beforeText || 'Full Table Scan & High Memory Usage';
    const afterLabel = (comparison.afterLabel || 'OPTIMIZED ARCHITECTURE').slice(0, 24);
    const afterText = comparison.afterText || 'Composite Index & Zero Memory Spikes';
    const metricText = (comparison.metric || '99.4% Latency Drop & O(1) Scalability').slice(0, 68);

    const beforeMetric = comparison.beforeMetric || (beforeText.toLowerCase().includes('connection') ? 'UNCAPPED' : '1,450 ms');
    const beforeMetricDetail = comparison.beforeMetricDetail || 'High Resource Contention & Latency Spikes';
    const afterMetric = comparison.afterMetric || (afterText.toLowerCase().includes('pool') || afterText.toLowerCase().includes('connection') ? 'BOUNDED POOL' : '4 ms');
    const afterMetricDetail = comparison.afterMetricDetail || 'Sub-Millisecond Queuing & Stable Memory';

    const wrappedBeforeTextSvg = renderWrappedText({
      text: beforeText,
      x: 25,
      startY: 96,
      lineSpacing: 24,
      maxCharsPerLine: 34,
      maxLines: 2,
      fill: '#F8FAFC',
      fontSize: 18,
      fontWeight: '700'
    });

    const wrappedAfterTextSvg = renderWrappedText({
      text: afterText,
      x: 25,
      startY: 96,
      lineSpacing: 24,
      maxCharsPerLine: 34,
      maxLines: 2,
      fill: '#F8FAFC',
      fontSize: 18,
      fontWeight: '700'
    });

    centerContentSvg = `
      <g transform="translate(70, 145)">
        <rect width="485" height="285" rx="16" fill="#160D11" stroke="#7F1D1D" stroke-width="1.8" />
        <rect x="0" y="0" width="485" height="42" rx="16" fill="#2A1218" />
        <line x1="0" y1="42" x2="485" y2="42" stroke="#7F1D1D" stroke-width="1" />
        
        <circle cx="28" cy="21" r="5" fill="#EF4444" />
        <text x="44" y="26" fill="#FCA5A5" font-family="${FONT_SANS}" font-weight="700" font-size="12" letter-spacing="1">❌ ${escapeXml(beforeLabel.toUpperCase())}</text>
        
        <text x="25" y="70" fill="#94A3B8" font-family="${FONT_SANS}" font-weight="600" font-size="12" letter-spacing="1">THE BOTTLENECK:</text>
        ${wrappedBeforeTextSvg}
        
        <rect x="25" y="160" width="435" height="100" rx="12" fill="#1F1317" stroke="#991B1B" stroke-width="1" />
        <text x="45" y="202" fill="#EF4444" font-family="${FONT_MONO}" font-weight="800" font-size="24">${escapeXml(beforeMetric)}</text>
        <text x="45" y="234" fill="#F87171" font-family="${FONT_SANS}" font-size="13">${escapeXml(beforeMetricDetail)}</text>
      </g>

      <g transform="translate(645, 145)">
        <rect width="485" height="285" rx="16" fill="#0A1C16" stroke="#065F46" stroke-width="1.8" />
        <rect x="0" y="0" width="485" height="42" rx="16" fill="#0F2E24" />
        <line x1="0" y1="42" x2="485" y2="42" stroke="#065F46" stroke-width="1" />
        
        <circle cx="28" cy="21" r="5" fill="#10B981" />
        <text x="44" y="26" fill="#6EE7B7" font-family="${FONT_SANS}" font-weight="700" font-size="12" letter-spacing="1">⚡ ${escapeXml(afterLabel.toUpperCase())}</text>
        
        <text x="25" y="70" fill="#94A3B8" font-family="${FONT_SANS}" font-weight="600" font-size="12" letter-spacing="1">ENGINEERING SOLUTION:</text>
        ${wrappedAfterTextSvg}
        
        <rect x="25" y="160" width="435" height="100" rx="12" fill="#0C251C" stroke="#059669" stroke-width="1" />
        <text x="45" y="202" fill="#10B981" font-family="${FONT_MONO}" font-weight="800" font-size="24">${escapeXml(afterMetric)}</text>
        <text x="45" y="234" fill="#34D399" font-family="${FONT_SANS}" font-size="13">${escapeXml(afterMetricDetail)}</text>
      </g>

      <g transform="translate(70, 452)">
        <rect width="1060" height="68" rx="14" fill="#0F172A" stroke="url(#accentGrad)" stroke-width="1.8" />
        <circle cx="45" cy="34" r="16" fill="url(#accentGrad)" />
        <text x="45" y="40" text-anchor="middle" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="800" font-size="18">🚀</text>
        <text x="80" y="30" fill="${activeTheme.accent1}" font-family="${FONT_SANS}" font-weight="700" font-size="12" letter-spacing="1.2">SYSTEM PERFORMANCE RESULT</text>
        <text x="80" y="52" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="800" font-size="17">${escapeXml(metricText)}</text>
      </g>
    `;
  } else {
    centerContentSvg = formattedTakeaways.map((item, idx) => {
      const y = 145 + idx * 125;
      const num = `0${idx + 1}`;
      return `
        <g transform="translate(70, ${y})">
          <rect width="1060" height="112" rx="16" fill="#0D1527" stroke="#1E293B" stroke-width="1.5" />
          <rect x="0" y="0" width="6" height="112" rx="3" fill="url(#accentGrad)" />

          <rect x="28" y="24" width="64" height="64" rx="14" fill="#131F38" stroke="#1E293B" stroke-width="1" />
          <text x="60" y="64" text-anchor="middle" fill="url(#accentGrad)" font-family="${FONT_SANS}" font-weight="900" font-size="24">${num}</text>

          <rect x="110" y="24" width="130" height="22" rx="5" fill="${activeTheme.badgeBg}" stroke="${activeTheme.badgeBorder}" stroke-width="1" />
          <text x="175" y="39" text-anchor="middle" fill="${activeTheme.accent1}" font-family="${FONT_SANS}" font-weight="700" font-size="11" letter-spacing="1.2">${escapeXml(item.tag.toUpperCase())}</text>

          <text x="110" y="70" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="700" font-size="18">${escapeXml(item.text)}</text>
          <text x="110" y="94" fill="#94A3B8" font-family="${FONT_SANS}" font-weight="400" font-size="13">${escapeXml(item.detail)}</text>

          <circle cx="1020" cy="56" r="16" fill="#131F38" stroke="#1E293B" stroke-width="1" />
          <path d="M 1016 50 L 1024 56 L 1016 62" fill="none" stroke="${activeTheme.accent1}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      `;
    }).join('\n');
  }

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
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

      <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
      <rect width="${width}" height="${height}" fill="url(#gridPattern)" />

      <circle cx="1080" cy="90" r="220" fill="${activeTheme.glow1}" opacity="0.28" filter="url(#auroraGlow)" />
      <circle cx="90" cy="540" r="200" fill="${activeTheme.glow2}" opacity="0.22" filter="url(#auroraGlow)" />

      <path d="M 35 45 L 35 25 L 55 25" fill="none" stroke="#334155" stroke-width="1.5" />
      <path d="M 1165 45 L 1165 25 L 1145 25" fill="none" stroke="#334155" stroke-width="1.5" />
      <path d="M 35 585 L 35 605 L 55 605" fill="none" stroke="#334155" stroke-width="1.5" />
      <path d="M 1165 585 L 1165 605 L 1145 605" fill="none" stroke="#334155" stroke-width="1.5" />

      <g transform="translate(70, 36)">
        <rect x="0" y="0" width="${badgeWidth}" height="26" rx="6" fill="${activeTheme.badgeBg}" stroke="${activeTheme.badgeBorder}" stroke-width="1" />
        <circle cx="14" cy="13" r="3.5" fill="${activeTheme.accent1}" />
        <text x="26" y="17" fill="${activeTheme.accent1}" font-family="${FONT_SANS}" font-weight="700" font-size="11" letter-spacing="1.2">${escapeXml(categoryLabel)}</text>

        <text x="0" y="58" fill="#F8FAFC" font-family="${FONT_SANS}" font-weight="700" font-size="28" letter-spacing="-0.4">${escapeXml(cleanTitle)}</text>
        <text x="0" y="84" fill="#94A3B8" font-family="${FONT_SANS}" font-weight="400" font-size="14">${escapeXml(cleanSubtitle)}</text>
      </g>

      ${centerContentSvg}

      <line x1="70" y1="548" x2="1130" y2="548" stroke="#1E293B" stroke-width="1.5" />
      <line x1="480" y1="548" x2="720" y2="548" stroke="url(#accentGrad)" stroke-width="2" />

      <g transform="translate(70, 560)">
        <circle cx="24" cy="28" r="23" fill="none" stroke="url(#accentGrad)" stroke-width="1.5" opacity="0.8" />
        <circle cx="24" cy="28" r="20" fill="url(#avatarGrad)" />
        <text x="24" y="35" text-anchor="middle" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="800" font-size="18">S</text>

        <text x="58" y="24" fill="#FFFFFF" font-family="${FONT_SANS}" font-weight="700" font-size="20" letter-spacing="0.2">${escapeXml(cleanAuthorName)}</text>
        <text x="58" y="44" fill="#94A3B8" font-family="${FONT_SANS}" font-weight="400" font-size="13">${escapeXml(cleanAuthorRole)}</text>
      </g>

      <g transform="translate(850, 566)">
        <rect width="280" height="38" rx="19" fill="url(#brandPillGrad)" stroke="#334155" stroke-width="1" />
        <circle cx="20" cy="19" r="4" fill="${activeTheme.accent1}" />
        <text x="34" y="24" fill="#F1F5F9" font-family="${FONT_SANS}" font-weight="700" font-size="12" letter-spacing="0.8">LINKEDIN ENGINEERING</text>
        <text x="260" y="24" text-anchor="end" fill="${activeTheme.accent1}" font-family="${FONT_SANS}" font-weight="800" font-size="14">⚡</text>
      </g>
    </svg>
  `;
}

// ============================================================================
// MAIN GENERATOR EXPORT (DISPATCHES BETWEEN THE 5 DIVERSE STYLES)
// ============================================================================
export async function generateVisualCard({
  style = null,
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

  const cleanAuthorName = (!authorName || authorName === 'Software Engineer') ? 'Serag' : authorName;
  const cleanAuthorRole = authorRole || 'Backend & Fullstack Software Engineer';

  // Determine Visual Style (paper, painted, blueprint, brutalist, terminal)
  // If not explicitly provided, rotate / pick deterministically from STYLES based on title hash
  const normalizedStyle = (style && STYLES.includes(style.toLowerCase()))
    ? style.toLowerCase()
    : STYLES[Math.abs(hashString(title || 'default')) % STYLES.length];

  // Theme (used primarily by terminal style and theme colors)
  const themeKeys = Object.keys(THEMES);
  const activeTheme = (theme && THEMES[theme])
    ? THEMES[theme]
    : THEMES[themeKeys[Math.abs(hashString(title || 'default')) % themeKeys.length]];

  const rawCat = category || activeTheme.categoryLabel || 'SYSTEM ARCHITECTURE';
  const categoryLabel = rawCat.replace(/WAR STORIES|& RESILIENCE/gi, 'ARCHITECTURE').trim().toUpperCase();

  const cleanTitle = (title || 'Scalable Backend Architecture').slice(0, 50);
  const cleanSubtitle = (subtitle || 'Clean Architecture • Zero Downtime • High Throughput').slice(0, 72);

  // Determine layout archetype
  const effectiveType = (type === 'code' && codeSnippet)
    ? 'code'
    : (type === 'benchmark' || (comparison && comparison.beforeText && comparison.afterText))
      ? 'benchmark'
      : 'takeaways';

  // Format default takeaways if needed
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

  const styleParams = {
    width,
    height,
    activeTheme,
    effectiveType,
    cleanTitle,
    cleanSubtitle,
    categoryLabel,
    codeSnippet,
    language,
    comparison,
    formattedTakeaways,
    cleanAuthorName,
    cleanAuthorRole
  };

  let svg = '';
  switch (normalizedStyle) {
    case 'paper':
      svg = renderPaperStyle(styleParams);
      break;
    case 'painted':
      svg = renderPaintedStyle(styleParams);
      break;
    case 'blueprint':
      svg = renderBlueprintStyle(styleParams);
      break;
    case 'brutalist':
      svg = renderBrutalistStyle(styleParams);
      break;
    case 'terminal':
    default:
      svg = renderTerminalStyle(styleParams);
      break;
  }

  const pngBuffer = await sharp(Buffer.from(svg))
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();

  return pngBuffer;
}
