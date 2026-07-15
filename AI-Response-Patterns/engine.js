/**
 * LikeWay AI - Pattern Engine
 * 
 * Automatically selects the best response pattern based on:
 * - User's plan (Core/Go/Plus/Pro)
 * - User's intent
 * - Query complexity
 */

import { ALL_PATTERNS, FREE_PATTERNS, canUsePattern } from './patterns.js';

class PatternEngine {
  constructor() {
    this.intentKeywords = {
      'how-to': ['how do i', 'how to', 'steps to', 'guide to', 'tutorial', 'teach me'],
      'comparison': ['vs', 'compare', 'difference', 'versus', 'better', 'which', 'choose'],
      'error': ['error', 'fix', 'bug', 'debug', 'issue', 'problem', 'crash', 'not working'],
      'code': ['code', 'implement', 'function', 'script', 'program', 'write code', 'create'],
      'learning': ['learn', 'study', 'master', 'path', 'roadmap', 'curriculum', 'course'],
      'planning': ['plan', 'roadmap', 'timeline', 'schedule', 'phases', 'strategy'],
      'decision': ['decide', 'choose', 'select', 'best option', 'recommendation', 'suggest'],
      'explanation': ['what is', 'what are', 'how does', 'explain', 'define', 'meaning'],
      'summary': ['summary', 'overview', 'brief', 'report', 'analyze', 'summarize'],
      'creative': ['write', 'draft', 'create', 'generate', 'compose', 'story', 'blog'],
      'business': ['business', 'marketing', 'sales', 'revenue', 'customer', 'strategy'],
      'technical': ['api', 'database', 'algorithm', 'architecture', 'deploy', 'server']
    };
  }

  /**
   * Detect user intent from query
   */
  detectIntent(query) {
    const lowerQuery = query.toLowerCase();
    const detectedIntents = [];

    for (const [intent, keywords] of Object.entries(this.intentKeywords)) {
      const matches = keywords.filter(keyword => lowerQuery.includes(keyword));
      if (matches.length > 0) {
        detectedIntents.push({ intent, score: matches.length });
      }
    }

    detectedIntents.sort((a, b) => b.score - a.score);
    return detectedIntents[0]?.intent || 'explanation';
  }

  /**
   * Select best pattern based on plan and intent
   */
  selectPattern(plan, query) {
    const intent = this.detectIntent(query);
    
    // Intent to pattern mapping
    const intentPatternMap = {
      'how-to': 'numbered-steps',
      'comparison': 'comparison-table',
      'error': 'error-analysis',
      'code': 'code-explanation',
      'learning': 'roadmap',
      'planning': 'timeline',
      'decision': 'decision-matrix',
      'explanation': 'paragraph',
      'summary': 'executive-summary',
      'creative': 'blog-post',
      'business': 'business-proposal',
      'technical': 'code-explanation'
    };

    let selectedPatternId = intentPatternMap[intent] || 'paragraph';

    // Check if user can use this pattern
    if (!canUsePattern(plan, selectedPatternId)) {
      // Find a free alternative
      selectedPatternId = this.findFreeAlternative(intent);
    }

    return {
      pattern: ALL_PATTERNS[Object.keys(ALL_PATTERNS).find(k => ALL_PATTERNS[k].id === selectedPatternId)],
      intent,
      isPremium: !FREE_PATTERNS.includes(selectedPatternId)
    };
  }

  /**
   * Find free alternative for premium patterns
   */
  findFreeAlternative(intent) {
    const freeAlternatives = {
      'how-to': 'numbered-steps',
      'comparison': 'comparison-table',
      'error': 'faq',
      'code': 'code-explanation',
      'learning': 'numbered-steps',
      'planning': 'bullet-points',
      'decision': 'pros-cons',
      'explanation': 'paragraph',
      'summary': 'bullet-points',
      'creative': 'paragraph',
      'business': 'bullet-points',
      'technical': 'code-only'
    };

    return freeAlternatives[intent] || 'paragraph';
  }

  /**
   * Generate response using selected pattern
   */
  generateResponse(plan, query, data) {
    const { pattern, intent, isPremium } = this.selectPattern(plan, query);

    // Check if user has access
    if (isPremium && plan === 'core') {
      return {
        success: false,
        message: 'This pattern requires a paid plan',
        upgradeRequired: true,
        suggestedPlan: 'go',
        freeAlternative: this.findFreeAlternative(intent)
      };
    }

    // Generate response based on pattern
    let content = '';
    
    if (pattern.template) {
      content = pattern.template(data);
    } else {
      content = this.formatBasicPattern(pattern.id, data);
    }

    return {
      success: true,
      pattern: pattern.name,
      patternId: pattern.id,
      icon: pattern.icon,
      content,
      intent
    };
  }

  /**
   * Format basic patterns without templates
   */
  formatBasicPattern(patternId, data) {
    const formatters = {
      'business-proposal': () => `**Business Proposal**\n\n${data.title}\n\n${data.description}\n\n**Objectives:**\n${data.objectives?.map(o => `• ${o}`).join('\n') || ''}`,
      'marketing-strategy': () => `**Marketing Strategy**\n\n**Target Audience:** ${data.audience}\n\n**Channels:**\n${data.channels?.map(c => `• ${c}`).join('\n') || ''}\n\n**Budget:** ${data.budget}`,
      'social-media-plan': () => `**Social Media Content Plan**\n\n${data.posts?.map(p => `**${p.platform}:** ${p.content}`).join('\n\n') || ''}`,
      'investment-analysis': () => `**Investment Analysis**\n\n**Asset:** ${data.asset}\n**Risk Level:** ${data.risk}\n**Expected Return:** ${data.return}\n\n**Recommendation:** ${data.recommendation}`,
      'financial-planning': () => `**Financial Plan**\n\n**Monthly Income:** ${data.income}\n**Expenses:** ${data.expenses}\n**Savings Goal:** ${data.goal}\n\n**Action Items:**\n${data.actions?.map(a => `• ${a}`).join('\n') || ''}`,
      'resume-review': () => `**Resume Review**\n\n**Strengths:**\n${data.strengths?.map(s => `✅ ${s}`).join('\n') || ''}\n\n**Areas for Improvement:**\n${data.improvements?.map(i => `⚠️ ${i}`).join('\n') || ''}`,
      'cover-letter': () => `**Cover Letter**\n\nDear ${data.hiringManager || 'Hiring Manager'},\n\n${data.body}\n\nSincerely,\n${data.name}`,
      'email-draft': () => `**Subject:** ${data.subject}\n\nDear ${data.recipient},\n\n${data.body}\n\nBest regards,\n${data.sender}`,
      'travel-itinerary': () => `**Travel Itinerary**\n\n**Destination:** ${data.destination}\n**Duration:** ${data.duration}\n\n${data.days?.map(d => `**Day ${d.day}:**\n${d.activities?.map(a => `• ${a}`).join('\n') || ''}`).join('\n\n') || ''}`,
      'meal-plan': () => `**Meal Plan**\n\n${data.days?.map(d => `**${d.day}:**\nBreakfast: ${d.breakfast}\nLunch: ${d.lunch}\nDinner: ${d.dinner}`).join('\n\n') || ''}`,
      'workout-plan': () => `**Workout Plan**\n\n**Goal:** ${data.goal}\n**Duration:** ${data.duration}\n\n${data.days?.map(d => `**${d.day}:**\n${d.exercises?.map(e => `• ${e}`).join('\n') || ''}`).join('\n\n') || ''}`,
      'ai-prompt-engineering': () => `**AI Prompt Template**\n\n**Context:** ${data.context}\n**Task:** ${data.task}\n**Output Format:** ${data.format}\n\n**Prompt:**\n${data.prompt}`,
      'architecture-design': () => `**Architecture Design**\n\n**System:** ${data.system}\n\n**Components:**\n${data.components?.map(c => `• ${c}`).join('\n') || ''}\n\n**Technology Stack:**\n${data.stack?.map(s => `• ${s}`).join('\n') || ''}`,
      'deployment-guide': () => `**Deployment Guide**\n\n**Prerequisites:**\n${data.prerequisites?.map(p => `• ${p}`).join('\n') || ''}\n\n**Steps:**\n${data.steps?.map((s, i) => `${i + 1}. ${s}`).join('\n') || ''}`
    };

    return formatters[patternId]?.() || JSON.stringify(data, null, 2);
  }

  /**
   * Get available patterns for user's plan
   */
  getAvailablePatterns(plan) {
    if (plan === 'core') {
      return FREE_PATTERNS.map(id => 
        Object.values(ALL_PATTERNS).find(p => p.id === id)
      ).filter(Boolean);
    }
    return Object.values(ALL_PATTERNS);
  }

  /**
   * Check if pattern is available for plan
   */
  isPatternAvailable(plan, patternId) {
    return canUsePattern(plan, patternId);
  }
}

export default new PatternEngine();