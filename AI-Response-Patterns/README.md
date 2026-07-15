# LikeWay AI - Response Patterns System

## Overview

200 intelligent response patterns that automatically adapt based on user intent and subscription plan.

## Plan Limits

| Plan | Patterns | Status |
|------|----------|--------|
| **Core (Free)** | 10 patterns | ✅ Available |
| **Go (₹299)** | 200 patterns | ✅ All unlocked |
| **Plus (₹799)** | 200 patterns | ✅ All unlocked |
| **Pro (₹1,999)** | 200 patterns | ✅ All unlocked |

---

## Free Patterns (10)

These patterns are available to all users:

1. `paragraph` - General explanations
2. `bullet-points` - Lists and features
3. `numbered-steps` - Tutorials and guides
4. `checklist` - Task tracking
5. `table` - Data comparisons
6. `comparison-table` - Side-by-side analysis
7. `pros-cons` - Decision making
8. `faq` - Common questions
9. `code-only` - Quick code solutions
10. `code-explanation` - Learning programming

---

## Premium Patterns (190 additional)

Unlock 190 more patterns with paid plans:

### Categories

| Category | Patterns | Examples |
|----------|----------|----------|
| **Basic** | 15 | Timeline, Flowchart, Tree Structure |
| **Technical** | 35 | API Docs, SQL, Architecture Design |
| **Business** | 30 | Marketing Strategy, Financial Planning |
| **Creative** | 40 | Blog Post, Email Draft, Resume Review |
| **Education** | 30 | Learning Plan, Study Guide, Flashcards |
| **Lifestyle** | 30 | Travel Itinerary, Meal Plan, Workout |
| **AI/Tech** | 20 | Prompt Engineering, DevOps, ML Models |

---

## Usage

### Basic Usage

```javascript
import patternEngine from './AI-Response-Patterns/engine.js';

// Get response for user query
const response = patternEngine.generateResponse(
  'go',  // User's plan
  'How do I install Node.js?',  // User's query
  { steps: ['Download Node.js', 'Run installer', 'Verify installation'] }
);

console.log(response.pattern);  // "Numbered Steps"
console.log(response.content);  // Formatted response
```

### Check Pattern Availability

```javascript
import { canUsePattern } from './AI-Response-Patterns/patterns.js';

// Check if user can use a pattern
const canUse = canUsePattern('core', 'business-proposal');
console.log(canUse);  // false - requires paid plan
```

### Get Available Patterns

```javascript
import patternEngine from './AI-Response-Patterns/engine.js';

// Get all patterns for user's plan
const patterns = patternEngine.getAvailablePatterns('go');
console.log(patterns.length);  // 200
```

---

## Intent Detection

The engine automatically detects user intent:

| Query | Detected Intent | Pattern Used |
|-------|-----------------|--------------|
| "How to install Node.js" | how-to | Numbered Steps |
| "React vs Vue" | comparison | Comparison Table |
| "Fix this error" | error | Error Analysis |
| "Create an API" | code | Code + Explanation |
| "Learn JavaScript" | learning | Learning Roadmap |
| "Plan a project" | planning | Timeline |

---

## Pattern Selection Logic

```
User Query
    ↓
Intent Detection
    ↓
Best Pattern Selection
    ↓
Check Plan Access
    ↓
┌─────────────────────────────┐
│ Free Plan → Use Free Pattern│
│ Paid Plan → Use Best Pattern│
└─────────────────────────────┘
    ↓
Generate Response
```

---

## Files

| File | Description |
|------|-------------|
| `patterns.js` | All 200 patterns with metadata |
| `engine.js` | Pattern selection and generation logic |
| `README.md` | This documentation |

---

## Example Patterns

### Free User Query: "How do I install Python?"

**Response (Numbered Steps):**
```
1. Visit python.org
2. Download the latest version
3. Run the installer
4. Add Python to PATH
5. Verify: python --version
```

### Paid User Query: "Create a marketing strategy"

**Response (Marketing Strategy):**
```
**Marketing Strategy**

**Target Audience:** Tech professionals aged 25-40

**Channels:**
• LinkedIn Ads
• Twitter Marketing
• Content Marketing
• Email Campaigns

**Budget:** ₹50,000/month

**KPIs:**
• 20% increase in leads
• 15% improvement in engagement
```

---

## Integration with LikeWay AI

1. **Import patterns** in your main app
2. **Check user plan** from localStorage or API
3. **Generate response** using pattern engine
4. **Display formatted response** in chat interface

---

## Adding New Patterns

To add a new pattern:

1. Open `patterns.js`
2. Add pattern to `ALL_PATTERNS` object
3. Add template function
4. Update category if needed

```javascript
201: {
  id: 'new-pattern',
  name: 'New Pattern',
  category: 'custom',
  icon: '🆕',
  bestFor: 'Specific use case',
  premium: true,
  template: (data) => `Formatted content here`
}
```

---

## Support

For questions or issues, contact the LikeWay AI team.