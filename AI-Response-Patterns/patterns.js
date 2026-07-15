/**
 * LikeWay AI - Response Patterns System
 * 
 * 200 Patterns for Paid Users (Go/Plus/Pro)
 * 10 Patterns for Free Users (Core)
 */

// ============================================
// FREE USER PATTERNS (10 only)
// ============================================
export const FREE_PATTERNS = [
  'paragraph',
  'bullet-points',
  'numbered-steps',
  'faq',
  'code-only',
  'code-explanation',
  'terminal-commands',
  'json-response',
  'markdown-document',
  'summary-details'
];

// ============================================
// ALL 200 PATTERNS
// ============================================
export const ALL_PATTERNS = {
  // ========================================
  // BASIC PATTERNS (1-20)
  // ========================================
  1: {
    id: 'paragraph',
    name: 'Paragraph',
    category: 'basic',
    icon: '📝',
    bestFor: 'General explanations, descriptions',
    premium: false,
    template: (content) => content
  },
  2: {
    id: 'bullet-points',
    name: 'Bullet Points',
    category: 'basic',
    icon: '•',
    bestFor: 'Lists, features, options',
    premium: false,
    template: (items) => items.map(i => `• ${i}`).join('\n')
  },
  3: {
    id: 'numbered-steps',
    name: 'Numbered Steps',
    category: 'basic',
    icon: '🔢',
    bestFor: 'Tutorials, how-to guides',
    premium: false,
    template: (steps) => steps.map((s, i) => `${i + 1}. ${s}`).join('\n')
  },
  4: {
    id: 'checklist',
    name: 'Checklist',
    category: 'basic',
    icon: '☐',
    bestFor: 'Task tracking, setup guides',
    premium: false,
    template: (items) => items.map(i => `☐ ${i}`).join('\n')
  },
  5: {
    id: 'table',
    name: 'Table',
    category: 'basic',
    icon: '📊',
    bestFor: 'Structured data, comparisons',
    premium: false,
    template: (headers, rows) => {
      const header = `| ${headers.join(' | ')} |`;
      const divider = `| ${headers.map(() => '---').join(' | ')} |`;
      const body = rows.map(r => `| ${r.join(' | ')} |`).join('\n');
      return `${header}\n${divider}\n${body}`;
    }
  },
  6: {
    id: 'comparison-table',
    name: 'Comparison Table',
    category: 'basic',
    icon: '⚖️',
    bestFor: 'Comparing two options',
    premium: false,
    template: (item1, item2, features) => {
      const headers = ['Feature', item1, item2];
      const rows = features.map(f => [f.name, f.item1, f.item2]);
      return ALL_PATTERNS[5].template(headers, rows);
    }
  },
  7: {
    id: 'pros-cons',
    name: 'Pros & Cons',
    category: 'basic',
    icon: '👍',
    bestFor: 'Decision making, reviews',
    premium: false,
    template: (pros, cons) => {
      const prosList = pros.map(p => `✅ ${p}`).join('\n');
      const consList = cons.map(c => `❌ ${c}`).join('\n');
      return `**Pros:**\n${prosList}\n\n**Cons:**\n${consList}`;
    }
  },
  8: {
    id: 'before-after',
    name: 'Before vs After',
    category: 'basic',
    icon: '🔄',
    bestFor: 'Transformations, improvements',
    premium: false,
    template: (before, after) => `**Before:**\n${before}\n\n⬇️\n\n**After:**\n${after}`
  },
  9: {
    id: 'timeline',
    name: 'Timeline',
    category: 'basic',
    icon: '📅',
    bestFor: 'Chronological events, project phases',
    premium: false,
    template: (events) => events.map((e, i) => `**${e.date}**\n${e.title}\n${i < events.length - 1 ? '⬇️' : ''}`).join('\n\n')
  },
  10: {
    id: 'flowchart',
    name: 'Flowchart',
    category: 'basic',
    icon: '🔀',
    bestFor: 'Processes, decision flows',
    premium: false,
    template: (steps) => steps.map((s, i) => `${s}\n${i < steps.length - 1 ? '⬇️' : ''}`).join('\n\n')
  },
  11: {
    id: 'tree-structure',
    name: 'Tree Structure',
    category: 'basic',
    icon: '🌳',
    bestFor: 'Hierarchical data, file structures',
    premium: false,
    template: (root, children) => {
      const lines = [root];
      children.forEach((child, i) => {
        const prefix = i === children.length - 1 ? '└──' : '├──';
        lines.push(`${prefix} ${child}`);
      });
      return lines.join('\n');
    }
  },
  12: {
    id: 'faq',
    name: 'FAQ',
    category: 'basic',
    icon: '❓',
    bestFor: 'Documentation, common questions',
    premium: false,
    template: (faqs) => faqs.map(f => `**Q: ${f.question}**\nA: ${f.answer}`).join('\n\n')
  },
  13: {
    id: 'accordion',
    name: 'Accordion Style',
    category: 'basic',
    icon: '▶',
    bestFor: 'Expandable content, FAQs',
    premium: true,
    template: (sections) => sections.map(s => `▶ ${s.title}\n${s.content}`).join('\n\n')
  },
  14: {
    id: 'expandable-sections',
    name: 'Expandable Sections',
    category: 'basic',
    icon: '📂',
    bestFor: 'Progressive disclosure',
    premium: true,
    template: (sections) => sections.map(s => `**${s.title}**\n${s.content}`).join('\n\n')
  },
  15: {
    id: 'summary-details',
    name: 'Summary + Details',
    category: 'basic',
    icon: '📋',
    bestFor: 'Quick overviews with depth',
    premium: true,
    template: (summary, details) => `**Quick Summary:**\n${summary}\n\n**Detailed Explanation:**\n${details}`
  },

  // ========================================
  // TECHNICAL PATTERNS (16-50)
  // ========================================
  16: {
    id: 'executive-summary',
    name: 'Executive Summary',
    category: 'technical',
    icon: '📈',
    bestFor: 'Business reports, overviews',
    premium: true,
    template: (data) => `**Executive Summary**\n\n${data.summary}\n\n**Key Findings:**\n${data.findings.map(f => `• ${f}`).join('\n')}\n\n**Recommendations:**\n${data.recommendations.map(r => `• ${r}`).join('\n')}`
  },
  17: {
    id: 'beginner-explanation',
    name: 'Beginner Explanation',
    category: 'technical',
    icon: '🌱',
    bestFor: 'Simple concepts for newcomers',
    premium: false,
    template: (concept) => `**For Beginners:**\n\n${concept}\n\n**Think of it like this:**\n${concept.analogy}`
  },
  18: {
    id: 'expert-explanation',
    name: 'Expert Explanation',
    category: 'technical',
    icon: '🎓',
    bestFor: 'Advanced topics, deep dives',
    premium: true,
    template: (concept) => `**Technical Deep Dive:**\n\n${concept.technical}\n\n**Implementation Details:**\n${concept.details}`
  },
  19: {
    id: 'eli5',
    name: 'ELI5 (Explain Like I\'m 5)',
    category: 'technical',
    icon: '👶',
    bestFor: 'Very simple explanations',
    premium: false,
    template: (concept) => `**Simple Explanation:**\n\n${concept.simple}\n\n**Example:**\n${concept.example}`
  },
  20: {
    id: 'deep-technical',
    name: 'Deep Technical',
    category: 'technical',
    icon: '🔬',
    bestFor: 'Complex implementations, algorithms',
    premium: true,
    template: (topic) => `**Technical Analysis:**\n\n${topic.analysis}\n\n**Implementation:**\n${topic.code}\n\n**Performance:**\n${topic.performance}`
  },
  21: {
    id: 'code-only',
    name: 'Code Only',
    category: 'technical',
    icon: '💻',
    bestFor: 'Quick code solutions',
    premium: false,
    template: (code, language) => `\`\`\`${language}\n${code}\n\`\`\``
  },
  22: {
    id: 'code-explanation',
    name: 'Code + Explanation',
    category: 'technical',
    icon: '📖',
    bestFor: 'Learning programming',
    premium: false,
    template: (code, language, explanation) => `**Code:**\n\`\`\`${language}\n${code}\n\`\`\`\n\n**Explanation:**\n${explanation}`
  },
  23: {
    id: 'multiple-code-files',
    name: 'Multiple Code Files',
    category: 'technical',
    icon: '📁',
    bestFor: 'Multi-file projects',
    premium: true,
    template: (files) => files.map(f => `**${f.name}**\n\`\`\`${f.language}\n${f.code}\n\`\`\``).join('\n\n')
  },
  24: {
    id: 'folder-structure',
    name: 'Folder Structure',
    category: 'technical',
    icon: '🗂️',
    bestFor: 'Project organization',
    premium: true,
    template: (structure) => `\`\`\`\n${structure}\n\`\`\``
  },
  25: {
    id: 'api-documentation',
    name: 'API Documentation',
    category: 'technical',
    icon: '🔌',
    bestFor: 'Backend development, REST APIs',
    premium: true,
    template: (endpoint) => `**${endpoint.method} ${endpoint.path}**\n\n**Description:** ${endpoint.description}\n\n**Parameters:**\n${endpoint.params.map(p => `• ${p.name} (${p.type}): ${p.description}`).join('\n')}\n\n**Response:**\n\`\`\`json\n${JSON.stringify(endpoint.response, null, 2)}\n\`\`\``
  },
  26: {
    id: 'json-response',
    name: 'JSON Response',
    category: 'technical',
    icon: '{}',
    bestFor: 'API responses, data formats',
    premium: false,
    template: (data) => `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``
  },
  27: {
    id: 'xml-response',
    name: 'XML Response',
    category: 'technical',
    icon: '< >',
    bestFor: 'Legacy systems, SOAP APIs',
    premium: true,
    template: (xml) => `\`\`\`xml\n${xml}\n\`\`\``
  },
  28: {
    id: 'yaml-response',
    name: 'YAML Response',
    category: 'technical',
    icon: '📋',
    bestFor: 'Config files, Docker',
    premium: true,
    template: (yaml) => `\`\`\`yaml\n${yaml}\n\`\`\``
  },
  29: {
    id: 'markdown-document',
    name: 'Markdown Document',
    category: 'technical',
    icon: '📝',
    bestFor: 'Documentation, READMEs',
    premium: false,
    template: (markdown) => markdown
  },
  30: {
    id: 'html-output',
    name: 'HTML Output',
    category: 'technical',
    icon: '🌐',
    bestFor: 'Web development',
    premium: true,
    template: (html) => `\`\`\`html\n${html}\n\`\`\``
  },
  31: {
    id: 'css-only',
    name: 'CSS Only',
    category: 'technical',
    icon: '🎨',
    bestFor: 'Styling solutions',
    premium: true,
    template: (css) => `\`\`\`css\n${css}\n\`\`\``
  },
  32: {
    id: 'sql-query',
    name: 'SQL Query',
    category: 'technical',
    icon: '🗄️',
    bestFor: 'Database operations',
    premium: true,
    template: (query, explanation) => `\`\`\`sql\n${query}\n\`\`\`\n\n**Explanation:** ${explanation}`
  },
  33: {
    id: 'terminal-commands',
    name: 'Terminal Commands',
    category: 'technical',
    icon: '⌨️',
    bestFor: 'CLI operations, DevOps',
    premium: false,
    template: (commands) => `\`\`\`bash\n${commands.join('\n')}\n\`\`\``
  },
  34: {
    id: 'decision-tree',
    name: 'Decision Tree',
    category: 'technical',
    icon: '🔀',
    bestFor: 'Choice logic, recommendations',
    premium: true,
    template: (tree) => tree.map(t => `**If ${t.condition}:**\n${t.result}`).join('\n\n')
  },
  35: {
    id: 'recommendation',
    name: 'Recommendation',
    category: 'technical',
    icon: '⭐',
    bestFor: 'Product suggestions, tool selection',
    premium: true,
    template: (best, alternative, budget) => `**Best Choice:** ${best}\n\n**Alternative:** ${alternative}\n\n**Budget Option:** ${budget}`
  },
  36: {
    id: 'priority-list',
    name: 'Priority List',
    category: 'technical',
    icon: '🎯',
    bestFor: 'Task ordering, sprint planning',
    premium: true,
    template: (high, medium, low) => `**High Priority:**\n${high.map(h => `🔴 ${h}`).join('\n')}\n\n**Medium Priority:**\n${medium.map(m => `🟡 ${m}`).join('\n')}\n\n**Low Priority:**\n${low.map(l => `🟢 ${l}`).join('\n')}`
  },
  37: {
    id: 'ranking',
    name: 'Ranking',
    category: 'technical',
    icon: '🏆',
    bestFor: 'Comparison results, top lists',
    premium: true,
    template: (items) => items.map((item, i) => `#${i + 1} ${item}`).join('\n')
  },
  38: {
    id: 'swot-analysis',
    name: 'SWOT Analysis',
    category: 'technical',
    icon: '📊',
    bestFor: 'Business strategy, market analysis',
    premium: true,
    template: (swot) => `**Strengths:**\n${swot.strengths.map(s => `✅ ${s}`).join('\n')}\n\n**Weaknesses:**\n${swot.weaknesses.map(w => `❌ ${w}`).join('\n')}\n\n**Opportunities:**\n${swot.opportunities.map(o => `💡 ${o}`).join('\n')}\n\n**Threats:**\n${swot.threats.map(t => `⚠️ ${t}`).join('\n')}`
  },
  39: {
    id: 'roadmap',
    name: 'Roadmap',
    category: 'technical',
    icon: '🗺️',
    bestFor: 'Project planning, learning paths',
    premium: true,
    template: (phases) => phases.map((p, i) => `**Phase ${i + 1}: ${p.title}**\n${p.duration}\n${p.tasks.map(t => `• ${t}`).join('\n')}`).join('\n\n')
  },
  40: {
    id: 'learning-plan',
    name: 'Learning Plan',
    category: 'technical',
    icon: '📚',
    bestFor: 'Education, skill development',
    premium: true,
    template: (weeks) => weeks.map(w => `**${w.title}**\n${w.topics.map(t => `• ${t}`).join('\n')}`).join('\n\n')
  },
  41: {
    id: 'daily-schedule',
    name: 'Daily Schedule',
    category: 'technical',
    icon: '⏰',
    bestFor: 'Time management, routines',
    premium: true,
    template: (schedule) => `**Morning:**\n${schedule.morning.map(m => `• ${m}`).join('\n')}\n\n**Afternoon:**\n${schedule.afternoon.map(a => `• ${a}`).join('\n')}\n\n**Evening:**\n${schedule.evening.map(e => `• ${e}`).join('\n')}`
  },
  42: {
    id: 'troubleshooting-guide',
    name: 'Troubleshooting Guide',
    category: 'technical',
    icon: '🔧',
    bestFor: 'Problem solving, debugging',
    premium: true,
    template: (issues) => issues.map(i => `**Problem:** ${i.problem}\n**Cause:** ${i.cause}\n**Solution:** ${i.solution}`).join('\n\n')
  },
  43: {
    id: 'error-analysis',
    name: 'Error Analysis',
    category: 'technical',
    icon: '🔍',
    bestFor: 'Debugging, error messages',
    premium: true,
    template: (error) => `**Error:** ${error.message}\n\n**Reason:** ${error.reason}\n\n**Fix:**\n${error.fix}`
  },
  44: {
    id: 'decision-matrix',
    name: 'Decision Matrix',
    category: 'technical',
    icon: '📐',
    bestFor: 'Complex decisions, technology selection',
    premium: true,
    template: (matrix) => ALL_PATTERNS[5].template(matrix.headers, matrix.rows)
  },
  45: {
    id: 'risk-analysis',
    name: 'Risk Analysis',
    category: 'technical',
    icon: '⚠️',
    bestFor: 'Project planning, risk assessment',
    premium: true,
    template: (risks) => risks.map(r => `**Risk:** ${r.risk}\n**Impact:** ${r.impact}\n**Mitigation:** ${r.mitigation}`).join('\n\n')
  },
  46: {
    id: 'best-practices',
    name: 'Best Practices',
    category: 'technical',
    icon: '✨',
    bestFor: 'Guidelines, coding standards',
    premium: true,
    template: (practices) => practices.map(p => `✅ ${p}`).join('\n')
  },
  47: {
    id: 'dos-donts',
    name: "Do's and Don'ts",
    category: 'technical',
    icon: '⚖️',
    bestFor: 'Best practices, guidelines',
    premium: true,
    template: (dos, donts) => `**Do:**\n${dos.map(d => `✅ ${d}`).join('\n')}\n\n**Don't:**\n${donts.map(d => `❌ ${d}`).join('\n')}`
  },
  48: {
    id: 'interview-qa',
    name: 'Interview Q&A',
    category: 'technical',
    icon: '🎤',
    bestFor: 'Job preparation, career',
    premium: true,
    template: (questions) => questions.map(q => `**Q: ${q.question}**\n\nA: ${q.answer}`).join('\n\n')
  },
  49: {
    id: 'quiz-format',
    name: 'Quiz Format',
    category: 'technical',
    icon: '📝',
    bestFor: 'Learning assessment, education',
    premium: true,
    template: (quizzes) => quizzes.map(q => `**Q: ${q.question}**\n\n${q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}\n\n**Answer:** ${q.answer}`).join('\n\n')
  },
  50: {
    id: 'interactive-chat',
    name: 'Interactive Chat Mode',
    category: 'technical',
    icon: '💬',
    bestFor: 'Guided conversations, onboarding',
    premium: true,
    template: (message) => message
  },

  // ========================================
  // BUSINESS PATTERNS (51-80)
  // ========================================
  51: { id: 'business-proposal', name: 'Business Proposal', category: 'business', icon: '💼', premium: true },
  52: { id: 'marketing-strategy', name: 'Marketing Strategy', category: 'business', icon: '📣', premium: true },
  53: { id: 'social-media-plan', name: 'Social Media Content Plan', category: 'business', icon: '📱', premium: true },
  54: { id: 'investment-analysis', name: 'Investment Analysis', category: 'business', icon: '💰', premium: true },
  55: { id: 'financial-planning', name: 'Financial Planning', category: 'business', icon: '🏦', premium: true },
  56: { id: 'cost-breakdown', name: 'Cost Breakdown', category: 'business', icon: '💵', premium: true },
  57: { id: 'revenue-model', name: 'Revenue Model', category: 'business', icon: '📈', premium: true },
  58: { id: 'competitor-analysis', name: 'Competitor Analysis', category: 'business', icon: '🔍', premium: true },
  59: { id: 'market-research', name: 'Market Research', category: 'business', icon: '📊', premium: true },
  60: { id: 'customer-persona', name: 'Customer Persona', category: 'business', icon: '👤', premium: true },
  61: { id: 'sales-pitch', name: 'Sales Pitch', category: 'business', icon: '🎯', premium: true },
  62: { id: 'elevator-pitch', name: 'Elevator Pitch', category: 'business', icon: '🚀', premium: true },
  63: { id: 'meeting-notes', name: 'Meeting Notes', category: 'business', icon: '📋', premium: true },
  64: { id: 'sprint-plan', name: 'Sprint Plan', category: 'business', icon: '🏃', premium: true },
  65: { id: 'okr-framework', name: 'OKR Framework', category: 'business', icon: '🎯', premium: true },
  66: { id: 'kpi-dashboard', name: 'KPI Dashboard', category: 'business', icon: '📊', premium: true },
  67: { id: 'quarterly-report', name: 'Quarterly Report', category: 'business', icon: '📈', premium: true },
  68: { id: 'annual-review', name: 'Annual Review', category: 'business', icon: '📅', premium: true },
  69: { id: 'project-timeline', name: 'Project Timeline', category: 'business', icon: '🗓️', premium: true },
  70: { id: 'gantt-chart', name: 'Gantt Chart', category: 'business', icon: '📊', premium: true },
  71: { id: 'stakeholder-analysis', name: 'Stakeholder Analysis', category: 'business', icon: '👥', premium: true },
  72: { id: 'change-management', name: 'Change Management', category: 'business', icon: '🔄', premium: true },
  73: { id: 'risk-assessment', name: 'Risk Assessment', category: 'business', icon: '⚠️', premium: true },
  74: { id: 'business-continuity', name: 'Business Continuity Plan', category: 'business', icon: '🛡️', premium: true },
  75: { id: 'disaster-recovery', name: 'Disaster Recovery Plan', category: 'business', icon: '🔧', premium: true },
  76: { id: 'compliance-checklist', name: 'Compliance Checklist', category: 'business', icon: '✅', premium: true },
  77: { id: 'audit-report', name: 'Audit Report', category: 'business', icon: '📋', premium: true },
  78: { id: 'vendor-evaluation', name: 'Vendor Evaluation', category: 'business', icon: '🔍', premium: true },
  79: { id: 'contract-review', name: 'Contract Review', category: 'business', icon: '📄', premium: true },
  80: { id: 'legal-summary', name: 'Legal Document Summary', category: 'business', icon: '⚖️', premium: true },

  // ========================================
  // CREATIVE PATTERNS (81-120)
  // ========================================
  81: { id: 'email-draft', name: 'Email Draft', category: 'creative', icon: '📧', premium: true },
  82: { id: 'cover-letter', name: 'Cover Letter', category: 'creative', icon: '✉️', premium: true },
  83: { id: 'resume-review', name: 'Resume Review', category: 'creative', icon: '📄', premium: true },
  84: { id: 'blog-post', name: 'Blog Post', category: 'creative', icon: '✍️', premium: true },
  85: { id: 'article-outline', name: 'Article Outline', category: 'creative', icon: '📝', premium: true },
  86: { id: 'content-calendar', name: 'Content Calendar', category: 'creative', icon: '📅', premium: true },
  87: { id: 'story-outline', name: 'Story Outline', category: 'creative', icon: '📖', premium: true },
  88: { id: 'character-profile', name: 'Character Profile', category: 'creative', icon: '👤', premium: true },
  89: { id: 'plot-development', name: 'Plot Development', category: 'creative', icon: '🎭', premium: true },
  90: { id: 'dialogue-script', name: 'Dialogue Script', category: 'creative', icon: '💬', premium: true },
  91: { id: 'video-script', name: 'Video Script', category: 'creative', icon: '🎬', premium: true },
  92: { id: 'podcast-outline', name: 'Podcast Outline', category: 'creative', icon: '🎙️', premium: true },
  93: { id: 'presentation-slides', name: 'Presentation Slides', category: 'creative', icon: '📊', premium: true },
  94: { id: 'infographic-data', name: 'Infographic Data', category: 'creative', icon: '📊', premium: true },
  95: { id: 'design-brief', name: 'Design Brief', category: 'creative', icon: '🎨', premium: true },
  96: { id: 'ui-mockup', name: 'UI Mockup Description', category: 'creative', icon: '🖼️', premium: true },
  97: { id: 'brand-guidelines', name: 'Brand Guidelines', category: 'creative', icon: '🏷️', premium: true },
  98: { id: 'product-description', name: 'Product Description', category: 'creative', icon: '📦', premium: true },
  99: { id: 'ad-copy', name: 'Ad Copy', category: 'creative', icon: '📢', premium: true },
  100: { id: 'social-media-post', name: 'Social Media Post', category: 'creative', icon: '📱', premium: true },
  101: { id: 'hashtag-strategy', name: 'Hashtag Strategy', category: 'creative', icon: '#️⃣', premium: true },
  102: { id: 'caption-writing', name: 'Caption Writing', category: 'creative', icon: '✍️', premium: true },
  103: { id: 'headline-generator', name: 'Headline Generator', category: 'creative', icon: '📰', premium: true },
  104: { id: 'slogan-creator', name: 'Slogan Creator', category: 'creative', icon: '💡', premium: true },
  105: { id: 'tagline-generator', name: 'Tagline Generator', category: 'creative', icon: '🏷️', premium: true },
  106: { id: 'creative-writing', name: 'Creative Writing', category: 'creative', icon: '✍️', premium: true },
  107: { id: 'poetry-format', name: 'Poetry Format', category: 'creative', icon: '📜', premium: true },
  108: { id: 'song-lyrics', name: 'Song Lyrics', category: 'creative', icon: '🎵', premium: true },
  109: { id: 'joke-format', name: 'Joke Format', category: 'creative', icon: '😄', premium: true },
  110: { id: 'riddle-format', name: 'Riddle Format', category: 'creative', icon: '🤔', premium: true },
  111: { id: 'game-design', name: 'Game Design Document', category: 'creative', icon: '🎮', premium: true },
  112: { id: 'world-building', name: 'World Building', category: 'creative', icon: '🌍', premium: true },
  113: { id: 'user-persona', name: 'User Persona', category: 'creative', icon: '👤', premium: true },
  114: { id: 'customer-journey', name: 'Customer Journey Map', category: 'creative', icon: '🗺️', premium: true },
  115: { id: 'user-story', name: 'User Story', category: 'creative', icon: '📖', premium: true },
  116: { id: 'use-case', name: 'Use Case', category: 'creative', icon: '📋', premium: true },
  117: { id: 'feature-spec', name: 'Feature Specification', category: 'creative', icon: '📦', premium: true },
  118: { id: 'release-notes', name: 'Release Notes', category: 'creative', icon: '📝', premium: true },
  119: { id: 'changelog', name: 'Changelog', category: 'creative', icon: '📋', premium: true },
  120: { id: 'documentation', name: 'Documentation', category: 'creative', icon: '📚', premium: true },

  // ========================================
  // EDUCATION PATTERNS (121-150)
  // ========================================
  121: { id: 'weekly-study-plan', name: 'Weekly Study Plan', category: 'education', icon: '📚', premium: true },
  122: { id: 'personalized-learning', name: 'Personalized Learning Path', category: 'education', icon: '🎯', premium: true },
  123: { id: 'interactive-tutor', name: 'Interactive Tutor', category: 'education', icon: '👨‍🏫', premium: true },
  124: { id: 'flashcard-set', name: 'Flashcard Set', category: 'education', icon: '🃏', premium: true },
  125: { id: 'mind-map', name: 'Mind Map', category: 'education', icon: '🧠', premium: true },
  126: { id: 'concept-map', name: 'Concept Map', category: 'education', icon: '🗺️', premium: true },
  127: { id: 'comparison-chart', name: 'Comparison Chart', category: 'education', icon: '📊', premium: true },
  128: { id: 'process-diagram', name: 'Process Diagram', category: 'education', icon: '🔀', premium: true },
  129: { id: 'workflow-diagram', name: 'Workflow Diagram', category: 'education', icon: '📈', premium: true },
  130: { id: 'sequence-diagram', name: 'Sequence Diagram', category: 'education', icon: '📊', premium: true },
  131: { id: 'mermaid-diagram', name: 'Mermaid Diagram', category: 'education', icon: '📊', premium: true },
  132: { id: 'ascii-art', name: 'ASCII Art', category: 'education', icon: '🎨', premium: true },
  133: { id: 'visual-hierarchy', name: 'Visual Hierarchy', category: 'education', icon: '📐', premium: true },
  134: { id: 'step-by-step-tutorial', name: 'Step-by-Step Tutorial', category: 'education', icon: '📖', premium: true },
  135: { id: 'hands-on-exercise', name: 'Hands-on Exercise', category: 'education', icon: '🔧', premium: true },
  136: { id: 'practice-problems', name: 'Practice Problems', category: 'education', icon: '📝', premium: true },
  137: { id: 'challenge-activity', name: 'Challenge Activity', category: 'education', icon: '🏆', premium: true },
  138: { id: 'assessment-rubric', name: 'Assessment Rubric', category: 'education', icon: '📋', premium: true },
  139: { id: 'grading-criteria', name: 'Grading Criteria', category: 'education', icon: '✅', premium: true },
  140: { id: 'feedback-template', name: 'Feedback Template', category: 'education', icon: '💬', premium: true },
  141: { id: 'reflection-prompt', name: 'Reflection Prompt', category: 'education', icon: '🤔', premium: true },
  142: { id: 'discussion-guide', name: 'Discussion Guide', category: 'education', icon: '💬', premium: true },
  143: { id: 'debate-format', name: 'Debate Format', category: 'education', icon: '⚔️', premium: true },
  144: { id: 'case-study', name: 'Case Study', category: 'education', icon: '📋', premium: true },
  145: { id: 'research-methodology', name: 'Research Methodology', category: 'education', icon: '🔬', premium: true },
  146: { id: 'literature-review', name: 'Literature Review', category: 'education', icon: '📚', premium: true },
  147: { id: 'citation-format', name: 'Citation Format', category: 'education', icon: '📖', premium: true },
  148: { id: 'bibliography', name: 'Bibliography', category: 'education', icon: '📚', premium: true },
  149: { id: 'abstract-writing', name: 'Abstract Writing', category: 'education', icon: '📝', premium: true },
  150: { id: 'thesis-statement', name: 'Thesis Statement', category: 'education', icon: '🎯', premium: true },

  // ========================================
  // LIFESTYLE PATTERNS (151-180)
  // ========================================
  151: { id: 'travel-itinerary', name: 'Travel Itinerary', category: 'lifestyle', icon: '✈️', premium: true },
  152: { id: 'meal-plan', name: 'Meal Plan', category: 'lifestyle', icon: '🍽️', premium: true },
  153: { id: 'workout-plan', name: 'Workout Plan', category: 'lifestyle', icon: '💪', premium: true },
  154: { id: 'fitness-routine', name: 'Fitness Routine', category: 'lifestyle', icon: '🏃', premium: true },
  155: { id: 'meditation-guide', name: 'Meditation Guide', category: 'lifestyle', icon: '🧘', premium: true },
  156: { id: 'sleep-schedule', name: 'Sleep Schedule', category: 'lifestyle', icon: '😴', premium: true },
  157: { id: 'habit-tracker', name: 'Habit Tracker', category: 'lifestyle', icon: '✅', premium: true },
  158: { id: 'goal-setting', name: 'Goal Setting', category: 'lifestyle', icon: '🎯', premium: true },
  159: { id: 'productivity-system', name: 'Productivity System', category: 'lifestyle', icon: '⚡', premium: true },
  160: { id: 'time-blocking', name: 'Time Blocking', category: 'lifestyle', icon: '⏰', premium: true },
  161: { id: 'budget-planner', name: 'Budget Planner', category: 'lifestyle', icon: '💰', premium: true },
  162: { id: 'savings-plan', name: 'Savings Plan', category: 'lifestyle', icon: '🏦', premium: true },
  163: { id: 'debt-payoff', name: 'Debt Payoff Strategy', category: 'lifestyle', icon: '💳', premium: true },
  164: { id: 'investment-portfolio', name: 'Investment Portfolio', category: 'lifestyle', icon: '📈', premium: true },
  165: { id: 'emergency-fund', name: 'Emergency Fund Plan', category: 'lifestyle', icon: '🛡️', premium: true },
  166: { id: 'home-organization', name: 'Home Organization', category: 'lifestyle', icon: '🏠', premium: true },
  167: { id: 'cleaning-schedule', name: 'Cleaning Schedule', category: 'lifestyle', icon: '🧹', premium: true },
  168: { id: 'gardening-guide', name: 'Gardening Guide', category: 'lifestyle', icon: '🌱', premium: true },
  169: { id: 'cooking-recipe', name: 'Cooking Recipe', category: 'lifestyle', icon: '👨‍🍳', premium: true },
  170: { id: 'recipe-collection', name: 'Recipe Collection', category: 'lifestyle', icon: '📖', premium: true },
  171: { id: 'party-planning', name: 'Party Planning', category: 'lifestyle', icon: '🎉', premium: true },
  172: { id: 'event-checklist', name: 'Event Checklist', category: 'lifestyle', icon: '✅', premium: true },
  173: { id: 'gift-ideas', name: 'Gift Ideas', category: 'lifestyle', icon: '🎁', premium: true },
  174: { id: 'date-night-ideas', name: 'Date Night Ideas', category: 'lifestyle', icon: '❤️', premium: true },
  175: { id: 'family-activity', name: 'Family Activity Ideas', category: 'lifestyle', icon: '👨‍👩‍👧‍👦', premium: true },
  176: { id: 'pet-care-guide', name: 'Pet Care Guide', category: 'lifestyle', icon: '🐾', premium: true },
  177: { id: 'DIY-project', name: 'DIY Project', category: 'lifestyle', icon: '🔧', premium: true },
  178: { id: 'craft-instructions', name: 'Craft Instructions', category: 'lifestyle', icon: '🎨', premium: true },
  179: { id: 'home-decor', name: 'Home Decor Ideas', category: 'lifestyle', icon: '🏠', premium: true },
  180: { id: 'wardrobe-planner', name: 'Wardrobe Planner', category: 'lifestyle', icon: '👗', premium: true },

  // ========================================
  // AI/TECH PATTERNS (181-200)
  // ========================================
  181: { id: 'ai-prompt-engineering', name: 'AI Prompt Engineering', category: 'ai-tech', icon: '🤖', premium: true },
  182: { id: 'prompt-template', name: 'Prompt Template', category: 'ai-tech', icon: '📝', premium: true },
  183: { id: 'ai-workflow', name: 'AI Workflow', category: 'ai-tech', icon: '🔀', premium: true },
  184: { id: 'automation-script', name: 'Automation Script', category: 'ai-tech', icon: '⚙️', premium: true },
  185: { id: 'chatbot-flow', name: 'Chatbot Flow', category: 'ai-tech', icon: '💬', premium: true },
  186: { id: 'api-integration', name: 'API Integration Guide', category: 'ai-tech', icon: '🔌', premium: true },
  187: { id: 'webhook-setup', name: 'Webhook Setup', category: 'ai-tech', icon: '🔗', premium: true },
  188: { id: 'data-pipeline', name: 'Data Pipeline', category: 'ai-tech', icon: '📊', premium: true },
  189: { id: 'ml-model', name: 'ML Model Description', category: 'ai-tech', icon: '🧠', premium: true },
  190: { id: 'neural-network', name: 'Neural Network Diagram', category: 'ai-tech', icon: '🧠', premium: true },
  191: { id: 'algorithm-explanation', name: 'Algorithm Explanation', category: 'ai-tech', icon: '🔢', premium: true },
  192: { id: 'code-review', name: 'Code Review', category: 'ai-tech', icon: '🔍', premium: true },
  193: { id: 'security-audit', name: 'Security Audit', category: 'ai-tech', icon: '🔒', premium: true },
  194: { id: 'performance-analysis', name: 'Performance Analysis', category: 'ai-tech', icon: '⚡', premium: true },
  195: { id: 'scalability-plan', name: 'Scalability Plan', category: 'ai-tech', icon: '📈', premium: true },
  196: { id: 'architecture-design', name: 'Architecture Design', category: 'ai-tech', icon: '🏗️', premium: true },
  197: { id: 'system-design', name: 'System Design', category: 'ai-tech', icon: '🔧', premium: true },
  198: { id: 'devops-pipeline', name: 'DevOps Pipeline', category: 'ai-tech', icon: '🔄', premium: true },
  199: { id: 'ci-cd-setup', name: 'CI/CD Setup', category: 'ai-tech', icon: '⚙️', premium: true },
  200: { id: 'deployment-guide', name: 'Deployment Guide', category: 'ai-tech', icon: '🚀', premium: true }
};

// ============================================
// PATTERN ACCESS CONTROL
// ============================================
export function canUsePattern(plan, patternId) {
  // Free plan - only 10 patterns
  if (plan === 'core') {
    return FREE_PATTERNS.includes(patternId);
  }
  
  // Paid plans - all 200 patterns
  return true;
}

export function getPatternById(id) {
  return ALL_PATTERNS[id];
}

export function getPatternsByCategory(category) {
  return Object.values(ALL_PATTERNS).filter(p => p.category === category);
}

export function getFreePatterns() {
  return FREE_PATTERNS.map(id => Object.values(ALL_PATTERNS).find(p => p.id === id));
}

export function getPremiumPatterns() {
  return Object.values(ALL_PATTERNS).filter(p => p.premium);
}

export default ALL_PATTERNS;