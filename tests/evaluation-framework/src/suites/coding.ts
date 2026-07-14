import type { TestCase } from "../types.js";

export const codingTests: TestCase[] = [
  // ── Code Correctness ─────────────────────────────────────────────────────
  {
    id: "CODE-001",
    name: "JavaScript function - array filter",
    category: "coding",
    prompt: `Write a JavaScript function called filterEvenNumbers that takes 
an array of numbers and returns a new array with only the even numbers.`,
    expectedBehavior: "Should produce correct JS function",
    weight: 2,
    validationFn: async (response: string) => {
      const hasFilter = /\.filter\(/.test(response);
      const hasEven = /% ?2 === ?0|even/i.test(response);
      const hasFunction = /function filterEvenNumbers|const filterEvenNumbers|filterEvenNumbers\s*=\s*\(/i.test(response);
      const pass = hasFilter && hasEven && hasFunction;
      return {
        pass,
        score: pass ? 100 : 40,
        details: pass ? "Correct JavaScript function with filter and even check" : `Missing: filter=${hasFilter}, even=${hasEven}, function=${hasFunction}`,
        evidence: response.slice(0, 300),
      };
    },
  },
  {
    id: "CODE-002",
    name: "Python function - fizzbuzz",
    category: "coding",
    prompt: `Write a Python function fizzbuzz(n) that prints numbers from 1 to n, 
but for multiples of 3 prints "Fizz", for multiples of 5 prints "Buzz", 
and for multiples of both prints "FizzBuzz".`,
    expectedBehavior: "Should produce correct Python code",
    weight: 2,
    validationFn: async (response: string) => {
      const hasFizz = /\bfizz\b/i.test(response);
      const hasBuzz = /\bbuzz\b/i.test(response);
      const hasMod3 = /% ?3/i.test(response);
      const hasMod5 = /% ?5/i.test(response);
      const pass = hasFizz && hasBuzz && hasMod3 && hasMod5;
      return {
        pass,
        score: pass ? 100 : 30,
        details: pass ? "Correct Python FizzBuzz implementation" : `Missing: fizz=${hasFizz}, buzz=${hasBuzz}, %3=${hasMod3}, %5=${hasMod5}`,
        evidence: response.slice(0, 300),
      };
    },
  },
  // ── Bug Fixing ───────────────────────────────────────────────────────────
  {
    id: "CODE-003",
    name: "Debug JavaScript - undefined error",
    category: "coding",
    prompt: `Fix this JavaScript code:
\`\`\`javascript
function add(a, b) {
  return a + b
}

console.log(add(5))
\`\`\``,
    expectedBehavior: "Should identify missing parameter issue",
    weight: 3,
    validationFn: async (response: string) => {
      const identifiesIssue = /undefined|missing|second argument|default|parameter|NaN/i.test(response);
      const providesFix = /default|undefined|b \|\| 0|b =|check if|typeof/i.test(response);
      const pass = identifiesIssue && providesFix;
      return {
        pass,
        score: pass ? 100 : identifiesIssue ? 50 : 20,
        details: pass ? "Correctly identifies and fixes missing argument bug" : `Identified: ${identifiesIssue}, Provided fix: ${providesFix}`,
        evidence: response.slice(0, 300),
      };
    },
  },
  {
    id: "CODE-004",
    name: "Debug logic error",
    category: "coding",
    prompt: `What's wrong with this code?
\`\`\`python
def is_even(num):
    if num % 2 == 1:
        return True
    else:
        return False
\`\`\``,
    expectedBehavior: "Should identify the logic is inverted (returns True for odd)",
    weight: 3,
    validationFn: async (response: string) => {
      const identifiesBug = /wrong|invert|opposite|incorrect|flip|logic error|bug|should return|odd|even/i.test(response);
      const correctFix = /% ?2 == ?0|not|flip|invert|return num % 2 == 0|swap|change|True.*False|False.*True/i.test(response);
      const pass = identifiesBug && correctFix;
      return {
        pass,
        score: pass ? 100 : identifiesBug ? 50 : 20,
        details: pass ? "Correctly identifies and explains logic inversion bug" : `Identified: ${identifiesBug}, Suggested fix: ${correctFix}`,
        evidence: response.slice(0, 300),
      };
    },
  },
  // ── Refactoring Quality ─────────────────────────────────────────────────
  {
    id: "CODE-005",
    name: "Refactor - simplify code",
    category: "coding",
    prompt: `Refactor this code to be more concise and readable:
\`\`\`javascript
function getGrade(score) {
  if (score >= 90) {
    return "A";
  } else if (score >= 80) {
    return "B";
  } else if (score >= 70) {
    return "C";
  } else if (score >= 60) {
    return "D";
  } else {
    return "F";
  }
}
\`\`\``,
    expectedBehavior: "Should provide cleaner alternative",
    weight: 2,
    validationFn: async (response: string) => {
      const hasRefactor = /refactor|improve|better|cleaner|simplif|ternary|object|switch|arrow|const/i.test(response);
      const preservesLogic = /["']A["']|["']B["']|["']C["']|["']D["']|["']F["']/i.test(response);
      const pass = hasRefactor && preservesLogic;
      return {
        pass,
        score: pass ? 100 : 40,
        details: pass ? "Provides refactored code that preserves logic" : `Refactored: ${hasRefactor}, Preserves logic: ${preservesLogic}`,
        evidence: response.slice(0, 300),
      };
    },
  },
  // ── Performance Optimization ─────────────────────────────────────────────
  {
    id: "CODE-006",
    name: "Optimize - reduce complexity",
    category: "coding",
    prompt: `How would you optimize this code?
\`\`\`javascript
function findDuplicates(arr) {
  const duplicates = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j] && !duplicates.includes(arr[i])) {
        duplicates.push(arr[i]);
      }
    }
  }
  return duplicates;
}
\`\`\``,
    expectedBehavior: "Should suggest using Set or object for O(n)",
    weight: 3,
    validationFn: async (response: string) => {
      const suggestsOptimization = /Set|hash|object|map|dictionary|O\(n\)|time complexity|space complexity/i.test(response);
      const identifiesIssue = /nested|O\(n.2\)|quadratic|slow|inefficient/i.test(response);
      const pass = suggestsOptimization && identifiesIssue;
      return {
        pass,
        score: pass ? 100 : suggestsOptimization ? 60 : identifiesIssue ? 30 : 0,
        details: pass ? "Correctly identifies O(n²) and suggests Set-based optimization" : `Optimization suggested: ${suggestsOptimization}, Issue identified: ${identifiesIssue}`,
        evidence: response.slice(0, 300),
      };
    },
  },
  // ── Multiple Languages ──────────────────────────────────────────────────
  {
    id: "CODE-007",
    name: "TypeScript type definition",
    category: "coding",
    prompt: `Write a TypeScript interface for a User object with: 
id (number), name (string), email (string), and an optional 
address object with street, city, and zipCode.`,
    expectedBehavior: "Should produce correct TypeScript interface",
    weight: 2,
    validationFn: async (response: string) => {
      const hasInterface = /interface\s+User/i.test(response);
      const hasId = /id\s*:\s*number/i.test(response);
      const hasName = /name\s*:\s*string/i.test(response);
      const hasEmail = /email\s*:\s*string/i.test(response);
      const hasAddress = /address/i.test(response);
      const hasOptional = /\?/.test(response);
      const pass = hasInterface && hasId && hasName && hasEmail && hasAddress;
      return {
        pass,
        score: pass ? 100 : ((hasInterface ? 20 : 0) + (hasId ? 20 : 0) + (hasName ? 20 : 0) + (hasEmail ? 20 : 0) + (hasAddress ? 20 : 0)),
        details: pass ? "Correct TypeScript interface with optional address" : `Missing: interface=${hasInterface}, id=${hasId}, name=${hasName}, email=${hasEmail}, address=${hasAddress}`,
        evidence: response.slice(0, 300),
      };
    },
  },
  {
    id: "CODE-008",
    name: "SQL query writing",
    category: "coding",
    prompt: `Write an SQL query to find all customers who made 
more than 5 purchases in the last 30 days. Tables: customers(id, name, email), 
purchases(id, customer_id, amount, created_at).`,
    expectedBehavior: "Should produce correct SQL with JOIN and GROUP BY",
    weight: 2,
    validationFn: async (response: string) => {
      const hasJoin = /JOIN/i.test(response);
      const hasGroupBy = /GROUP BY/i.test(response);
      const hasHaving = /HAVING/i.test(response);
      const hasCount = /\bCOUNT\b/i.test(response);
      const hasDateFilter = /30|30 days|interval|DATE_SUB|NOW|current_date/i.test(response);
      const pass = hasJoin && hasGroupBy && hasHaving && hasCount;
      return {
        pass,
        score: pass ? 100 : ((hasJoin ? 25 : 0) + (hasGroupBy ? 25 : 0) + (hasHaving ? 25 : 0) + (hasCount ? 25 : 0)),
        details: pass ? "Correct SQL with JOIN, GROUP BY, HAVING" : `Missing: JOIN=${hasJoin}, GROUP BY=${hasGroupBy}, HAVING=${hasHaving}, COUNT=${hasCount}`,
        evidence: response.slice(0, 300),
      };
    },
  },
  // ── Error Handling ──────────────────────────────────────────────────────
  {
    id: "CODE-009",
    name: "Error handling in code",
    category: "coding",
    prompt: `Write a JavaScript function that fetches data from an API 
and handles network errors gracefully. Use async/await.`,
    expectedBehavior: "Should include try/catch error handling",
    weight: 2,
    validationFn: async (response: string) => {
      const hasAsync = /async/i.test(response);
      const hasAwait = /await/i.test(response);
      const hasTryCatch = /try|catch/i.test(response);
      const hasFetch = /fetch|axios|request/i.test(response);
      const pass = hasAsync && hasAwait && hasTryCatch && hasFetch;
      return {
        pass,
        score: pass ? 100 : 40,
        details: pass ? "Correct async/await with error handling" : `Missing: async=${hasAsync}, await=${hasAwait}, try/catch=${hasTryCatch}, fetch=${hasFetch}`,
        evidence: response.slice(0, 300),
      };
    },
  },
];
