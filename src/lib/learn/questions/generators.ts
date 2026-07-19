import { Question, Difficulty } from "../subjects";

function hashStr(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function detInt(seed: string, min: number, max: number): number {
  return (hashStr(seed) % (max - min + 1)) + min;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = b; b = a % b; a = t; }
  return a;
}

function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

function getDifficulty(i: number, total: number): Difficulty {
  if (i < total * 0.4) return "beginner";
  if (i < total * 0.7) return "intermediate";
  return "master";
}

function getXP(d: Difficulty): number {
  return d === "beginner" ? 10 : d === "intermediate" ? 15 : 20;
}

function numOpts(correct: number, seed: string): string[] {
  const set = new Set<number>();
  set.add(correct);
  const tries = [correct + 1, correct - 1, correct + 2, correct - 2, correct + 5, correct - 5, correct + 10, correct - 10];
  for (const t of tries) { if (t > 0 && t !== correct) set.add(t); if (set.size >= 5) break; }
  let i = 0;
  while (set.size < 5) { const v = correct + detInt(seed + "x" + i, -20, 20); if (v > 0 && v !== correct) set.add(v); i++; }
  const arr = [...set].filter(v => v !== correct).slice(0, 3);
  for (let j = arr.length - 1; j > 0; j--) {
    const k = detInt(seed + "s" + j, 0, j);
    [arr[j], arr[k]] = [arr[k], arr[j]];
  }
  return arr.map(String);
}

function strOpts(correct: string, wrong: string[], seed: string): string[] {
  const all = [correct, ...wrong.filter(w => w !== correct)];
  for (let i = all.length - 1; i > 0; i--) {
    const j = detInt(seed + i, 0, i);
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, 4);
}
// ══════════════════════════════════════════════════════════════════════
// LCM / HCF GENERATOR
// ══════════════════════════════════════════════════════════════════════

export function generateLCMHCFQuestions(baseId: string, count: number): Question[] {
  const qs: Question[] = [];
  for (let i = 0; i < count; i++) {
    const a = 6 + detInt(baseId + "a" + i, 1, 40);
    const b = 6 + detInt(baseId + "b" + i, 1, 40);
    const g = gcd(a, b);
    const l = lcm(a, b);
    const diff = getDifficulty(i, count);
    if (detInt(baseId + "t" + i, 0, 1) === 0) {
      qs.push({
        id: baseId + "-lcm-" + i, type: "mcq",
        question: "What is the LCM of " + a + " and " + b + "?",
        options: numOpts(l, baseId + "o" + i),
        answer: String(l),
        explanation: "LCM(" + a + ", " + b + ") = " + a + " × " + b + " / HCF(" + a + ", " + b + ") = " + (a*b) + " / " + g + " = " + l + ".",
        difficulty: diff, xp: getXP(diff)
      });
    } else {
      qs.push({
        id: baseId + "-hcf-" + i, type: "mcq",
        question: "What is the HCF of " + a + " and " + b + "?",
        options: numOpts(g, baseId + "o" + i),
        answer: String(g),
        explanation: "HCF(" + a + ", " + b + ") = " + g + ".",
        difficulty: diff, xp: getXP(diff)
      });
    }
  }
  return qs;
}

export function generateDivisibilityQuestions(baseId: string, count: number): Question[] {
  const qs: Question[] = [];
  const rules = [
    { divisor: 2, rule: "last digit is even" },
    { divisor: 3, rule: "sum of digits divisible by 3" },
    { divisor: 4, rule: "last two digits divisible by 4" },
    { divisor: 5, rule: "last digit is 0 or 5" },
    { divisor: 6, rule: "divisible by both 2 and 3" },
    { divisor: 9, rule: "sum of digits divisible by 9" },
    { divisor: 10, rule: "last digit is 0" },
    { divisor: 11, rule: "alternate sum difference is 0 or multiple of 11" }
  ];
  for (let i = 0; i < count; i++) {
    const r = rules[i % rules.length];
    const diff = getDifficulty(i, count);
    const num = r.divisor * (10 + detInt(baseId + "n" + i, 1, 100));
    qs.push({
      id: baseId + "-div-" + i, type: "mcq",
      question: "Is " + num + " divisible by " + r.divisor + "?",
      options: ["Yes", "No", "Cannot determine", "Only if " + (detInt(baseId + "x" + i, 0, 1) === 0 ? "even" : "odd")],
      answer: "Yes",
      explanation: "A number is divisible by " + r.divisor + " if " + r.rule + ". " + num + " satisfies this.",
      difficulty: "beginner", xp: 10
    });
  }
  return qs;
}

export function generateRemainderQuestions(baseId: string, count: number): Question[] {
  const qs: Question[] = [];
  for (let i = 0; i < count; i++) {
    const divisor = 3 + detInt(baseId + "d" + i, 1, 12);
    const quotient = 5 + detInt(baseId + "q" + i, 1, 20);
    const remainder = detInt(baseId + "r" + i, 1, divisor - 1);
    const num = divisor * quotient + remainder;
    const diff = getDifficulty(i, count);
    qs.push({
      id: baseId + "-rem-" + i, type: "mcq",
      question: "What is the remainder when " + num + " is divided by " + divisor + "?",
      options: numOpts(remainder, baseId + "o" + i),
      answer: String(remainder),
      explanation: num + " = " + divisor + " × " + quotient + " + " + remainder + ". Remainder = " + remainder + ".",
      difficulty: diff, xp: getXP(diff)
    });
  }
  return qs;
}

// ══════════════════════════════════════════════════════════════════════
// PERCENTAGE GENERATOR
// ══════════════════════════════════════════════════════════════════════

export function generatePercentageQuestions(baseId: string, count: number): Question[] {
  const qs: Question[] = [];
  const pcts = [5,10,12,15,20,25,30,33,35,40,45,50,55,60,65,70,75,80,85,90];
  for (let i = 0; i < count; i++) {
    const diff = getDifficulty(i, count);
    const p = pcts[i % pcts.length];
    const b = (5 + detInt(baseId + "b" + i, 1, 40)) * 20;
    const result = Math.round((p * b) / 100);
    qs.push({
      id: baseId + "-pct-" + i, type: "mcq",
      question: "What is " + p + "% of " + b + "?",
      options: numOpts(result, baseId + "o" + i),
      answer: String(result),
      explanation: p + "% of " + b + " = (" + p + "/100) × " + b + " = " + result + ".",
      difficulty: diff, xp: getXP(diff)
    });
  }
  return qs;
}

export function generatePercentChangeQuestions(baseId: string, count: number): Question[] {
  const qs: Question[] = [];
  for (let i = 0; i < count; i++) {
    const diff = getDifficulty(i, count);
    const orig = (10 + detInt(baseId + "o" + i, 1, 40)) * 20;
    const pct = 5 + detInt(baseId + "p" + i, 1, 20);
    const change = Math.round(orig * pct / 100);
    const isInc = detInt(baseId + "d" + i, 0, 1) === 0;
    if (isInc) {
      const newVal = orig + change;
      qs.push({
        id: baseId + "-inc-" + i, type: "mcq",
        question: "If " + orig + " increases by " + pct + "%, what is the new value?",
        options: numOpts(newVal, baseId + "x" + i),
        answer: String(newVal),
        explanation: "Increase = " + pct + "% of " + orig + " = " + change + ". New = " + orig + " + " + change + " = " + newVal + ".",
        difficulty: diff, xp: getXP(diff)
      });
    } else {
      const newVal = orig - change;
      qs.push({
        id: baseId + "-dec-" + i, type: "mcq",
        question: "If " + orig + " decreases by " + pct + "%, what is the new value?",
        options: numOpts(newVal, baseId + "x" + i),
        answer: String(newVal),
        explanation: "Decrease = " + pct + "% of " + orig + " = " + change + ". New = " + orig + " - " + change + " = " + newVal + ".",
        difficulty: diff, xp: getXP(diff)
      });
    }
  }
  return qs;
}

export function generateProfitLossQuestions(baseId: string, count: number): Question[] {
  const qs: Question[] = [];
  for (let i = 0; i < count; i++) {
    const diff = getDifficulty(i, count);
    const cp = (10 + detInt(baseId + "c" + i, 1, 30)) * 20;
    const pct = 5 + detInt(baseId + "p" + i, 1, 20);
    const isProf = detInt(baseId + "t" + i, 0, 1) === 0;
    if (isProf) {
      const sp = Math.round(cp * (100 + pct) / 100);
      qs.push({
        id: baseId + "-prof-" + i, type: "mcq",
        question: "CP = ₹" + cp + ", Profit = " + pct + "%. SP = ?",
        options: numOpts(sp, baseId + "o" + i),
        answer: "₹" + sp,
        explanation: "SP = CP × (100+P%)/100 = " + cp + " × " + (100 + pct) + "/100 = ₹" + sp + ".",
        difficulty: diff, xp: getXP(diff)
      });
    } else {
      const sp = Math.round(cp * (100 - pct) / 100);
      qs.push({
        id: baseId + "-loss-" + i, type: "mcq",
        question: "CP = ₹" + cp + ", Loss = " + pct + "%. SP = ?",
        options: numOpts(sp, baseId + "o" + i),
        answer: "₹" + sp,
        explanation: "SP = CP × (100-L%)/100 = " + cp + " × " + (100 - pct) + "/100 = ₹" + sp + ".",
        difficulty: diff, xp: getXP(diff)
      });
    }
  }
  return qs;
}

// ══════════════════════════════════════════════════════════════════════
// RATIO GENERATOR
// ══════════════════════════════════════════════════════════════════════

export function generateRatioQuestions(baseId: string, count: number): Question[] {
  const qs: Question[] = [];
  for (let i = 0; i < count; i++) {
    const diff = getDifficulty(i, count);
    const a = 1 + detInt(baseId + "a" + i, 1, 15);
    const b = 1 + detInt(baseId + "b" + i, 1, 15);
    const total = a + b;
    const amount = (10 + detInt(baseId + "am" + i, 1, 30)) * 10;
    const shareB = Math.round(amount * b / total);
    const type = detInt(baseId + "t" + i, 0, 2);
    if (type === 0) {
      qs.push({
        id: baseId + "-simpl-" + i, type: "mcq",
        question: "Simplify ratio " + (a*2) + ":" + (b*2),
        options: [a + ":" + b, (a+1) + ":" + (b+1), a + ":" + (b+2), (a*3) + ":" + (b*3)].sort(() => detInt(baseId + "z" + i, -1, 1)),
        answer: a + ":" + b,
        explanation: (a*2) + ":" + (b*2) + " = " + a + ":" + b + " (divide both by 2).",
        difficulty: "beginner", xp: 10
      });
    } else if (type === 1) {
      qs.push({
        id: baseId + "-share-" + i, type: "mcq",
        question: "₹" + amount + " divided in ratio " + a + ":" + b + ". What is the larger share?",
        options: numOpts(Math.max(Math.round(amount * a / total), shareB), baseId + "o" + i),
        answer: "₹" + Math.max(Math.round(amount * a / total), shareB),
        explanation: "Larger share = " + Math.max(a, b) + "/" + total + " × " + amount + " = ₹" + Math.max(Math.round(amount * a / total), shareB) + ".",
        difficulty: diff, xp: getXP(diff)
      });
    } else {
      const mult = 1 + detInt(baseId + "m" + i, 0, 4);
      qs.push({
        id: baseId + "-findx-" + i, type: "mcq",
        question: "If " + a + ":" + b + " = " + (a*mult) + ":x, find x.",
        options: numOpts(b*mult, baseId + "o" + i),
        answer: String(b*mult),
        explanation: "x = " + b + " × " + mult + " = " + (b*mult) + ".",
        difficulty: diff, xp: getXP(diff)
      });
    }
  }
  return qs;
}

// ══════════════════════════════════════════════════════════════════════
// TIME & WORK GENERATOR
// ══════════════════════════════════════════════════════════════════════

export function generateTimeWorkQuestions(baseId: string, count: number): Question[] {
  const qs: Question[] = [];
  const names = ["A","B","C","P","Q","R","X","Y","M","N"];
  for (let i = 0; i < count; i++) {
    const diff = getDifficulty(i, count);
    const dA = 6 + detInt(baseId + "a" + i, 1, 24);
    const dB = 6 + detInt(baseId + "b" + i, 1, 24);
    const together = Math.round((dA * dB) / (dA + dB) * 100) / 100;
    const n1 = names[i % names.length];
    const n2 = names[(i + 1) % names.length];
    qs.push({
      id: baseId + "-tw-" + i, type: "mcq",
      question: n1 + " does work in " + dA + " days, " + n2 + " in " + dB + " days. Together?",
      options: [String(Math.ceil(together)), String(Math.ceil(together)+1), String(Math.ceil(together)-1), String(Math.ceil(together)+2)].filter((v,idx,a) => a.indexOf(v)===idx).slice(0,4),
      answer: String(Math.ceil(together)),
      explanation: "Together = 1/(" + dA + ") + 1/(" + dB + ") = " + (dA+dB) + "/" + (dA*dB) + ". Days = " + (dA*dB) + "/" + (dA+dB) + " = " + Math.ceil(together) + ".",
      difficulty: diff, xp: getXP(diff)
    });
  }
  return qs;
}

// ══════════════════════════════════════════════════════════════════════
// SPEED, TIME & DISTANCE GENERATOR
// ══════════════════════════════════════════════════════════════════════

export function generateSpeedDistanceQuestions(baseId: string, count: number): Question[] {
  const qs: Question[] = [];
  for (let i = 0; i < count; i++) {
    const diff = getDifficulty(i, count);
    const speed = 10 + detInt(baseId + "s" + i, 1, 20) * 5;
    const time = 1 + detInt(baseId + "t" + i, 1, 10);
    const dist = speed * time;
    qs.push({
      id: baseId + "-sd-" + i, type: "mcq",
      question: "Speed = " + speed + " km/h, Time = " + time + " h. Distance?",
      options: numOpts(dist, baseId + "o" + i),
      answer: dist + " km",
      explanation: "Distance = " + speed + " × " + time + " = " + dist + " km.",
      difficulty: diff, xp: getXP(diff)
    });
  }
  return qs;
}

// ══════════════════════════════════════════════════════════════════════
// AVERAGE GENERATOR
// ══════════════════════════════════════════════════════════════════════

export function generateAverageQuestions(baseId: string, count: number): Question[] {
  const qs: Question[] = [];
  for (let i = 0; i < count; i++) {
    const diff = getDifficulty(i, count);
    const n = 3 + detInt(baseId + "n" + i, 0, 8);
    const avg = 10 + detInt(baseId + "a" + i, 1, 40);
    const total = n * avg;
    qs.push({
      id: baseId + "-avg-" + i, type: "mcq",
      question: "Average of " + n + " numbers is " + avg + ". Sum?",
      options: numOpts(total, baseId + "o" + i),
      answer: String(total),
      explanation: "Sum = " + avg + " × " + n + " = " + total + ".",
      difficulty: diff, xp: getXP(diff)
    });
  }
  return qs;
}

// ══════════════════════════════════════════════════════════════════════
// INTEREST GENERATOR
// ══════════════════════════════════════════════════════════════════════

export function generateInterestQuestions(baseId: string, count: number): Question[] {
  const qs: Question[] = [];
  for (let i = 0; i < count; i++) {
    const diff = getDifficulty(i, count);
    const p = (10 + detInt(baseId + "p" + i, 1, 20)) * 500;
    const r = 5 + detInt(baseId + "r" + i, 1, 10);
    const t = 1 + detInt(baseId + "t" + i, 1, 5);
    if (detInt(baseId + "ty" + i, 0, 1) === 0) {
      const si = Math.round(p * r * t / 100);
      qs.push({
        id: baseId + "-si-" + i, type: "mcq",
        question: "SI on ₹" + p + " at " + r + "% for " + t + " years?",
        options: numOpts(si, baseId + "o" + i),
        answer: "₹" + si,
        explanation: "SI = " + p + "×" + r + "×" + t + "/100 = ₹" + si + ".",
        difficulty: diff, xp: getXP(diff)
      });
    } else {
      const ci = Math.round(p * Math.pow(1 + r/100, t) - p);
      qs.push({
        id: baseId + "-ci-" + i, type: "mcq",
        question: "CI on ₹" + p + " at " + r + "% for " + t + " years?",
        options: numOpts(ci, baseId + "o" + i),
        answer: "₹" + ci,
        explanation: "Amount = " + p + "(1+" + r + "/100)^" + t + " = ₹" + Math.round(p * Math.pow(1+r/100, t)) + ". CI = " + Math.round(p * Math.pow(1+r/100, t)) + " - " + p + " = ₹" + ci + ".",
        difficulty: diff, xp: getXP(diff)
      });
    }
  }
  return qs;
}

// ══════════════════════════════════════════════════════════════════════
// ALGEBRA GENERATOR
// ══════════════════════════════════════════════════════════════════════

export function generateAlgebraQuestions(baseId: string, count: number): Question[] {
  const qs: Question[] = [];
  for (let i = 0; i < count; i++) {
    const diff = getDifficulty(i, count);
    const xVal = 1 + detInt(baseId + "x" + i, 1, 15);
    const coeff = 1 + detInt(baseId + "c" + i, 1, 10);
    const ct = 1 + detInt(baseId + "ct" + i, 1, 20);
    const rhs = coeff * xVal + ct;
    if (detInt(baseId + "t" + i, 0, 2) === 0) {
      qs.push({
        id: baseId + "-lin-" + i, type: "mcq",
        question: "Solve: " + coeff + "x + " + ct + " = " + rhs,
        options: numOpts(xVal, baseId + "o" + i),
        answer: String(xVal),
        explanation: coeff + "x = " + rhs + " - " + ct + " = " + (rhs-ct) + ". x = " + (rhs-ct) + "/" + coeff + " = " + xVal + ".",
        difficulty: diff, xp: getXP(diff)
      });
    } else if (detInt(baseId + "t" + i, 0, 2) === 1) {
      const a = 1 + detInt(baseId + "a" + i, 1, 6);
      const b = 1 + detInt(baseId + "b" + i, 1, 6);
      const sum = a + b;
      const prod = a * b;
      qs.push({
        id: baseId + "-quad-" + i, type: "mcq",
        question: "Roots of x² - " + sum + "x + " + prod + " = 0?",
        options: [a + "," + b, (a+1) + "," + b, a + "," + (b+2), (a+2) + "," + (b-1)].sort(() => detInt(baseId + "y" + i, -1, 1)),
        answer: a + "," + b,
        explanation: "x² - " + sum + "x + " + prod + " = (x-" + a + ")(x-" + b + "). Roots: " + a + ", " + b + ".",
        difficulty: "intermediate", xp: 15
      });
    } else {
      const polyVal = 2 + detInt(baseId + "pv" + i, 1, 8);
      const polyCoeff = 2 + detInt(baseId + "pc" + i, 1, 8);
      const result = polyCoeff * polyVal * polyVal + 3 * polyVal - 5;
      qs.push({
        id: baseId + "-poly-" + i, type: "mcq",
        question: "If f(x) = " + polyCoeff + "x² + 3x - 5, find f(" + polyVal + ").",
        options: numOpts(result, baseId + "o" + i),
        answer: String(result),
        explanation: "f(" + polyVal + ") = " + polyCoeff + "(" + polyVal + ")² + 3(" + polyVal + ") - 5 = " + polyCoeff*polyVal*polyVal + " + " + (3*polyVal) + " - 5 = " + result + ".",
        difficulty: diff, xp: getXP(diff)
      });
    }
  }
  return qs;
}

// ══════════════════════════════════════════════════════════════════════
// GEOMETRY GENERATOR
// ══════════════════════════════════════════════════════════════════════

export function generateGeometryQuestions(baseId: string, count: number): Question[] {
  const qs: Question[] = [];
  for (let i = 0; i < count; i++) {
    const diff = getDifficulty(i, count);
    const gt = detInt(baseId + "gt" + i, 0, 6);
    if (gt === 0) {
      const r = 3 + detInt(baseId + "r" + i, 1, 12);
      const a = Math.round(Math.PI * r * r);
      qs.push({
        id: baseId + "-ca-" + i, type: "mcq",
        question: "Area of circle radius " + r + " (π≈3.14)?",
        options: numOpts(a, baseId + "o" + i),
        answer: String(a),
        explanation: "Area = πr² = 3.14 × " + r + "² = " + a + ".",
        difficulty: diff, xp: getXP(diff)
      });
    } else if (gt === 1) {
      const l = 5 + detInt(baseId + "l" + i, 1, 15);
      const w = 3 + detInt(baseId + "w" + i, 1, 12);
      qs.push({
        id: baseId + "-ra-" + i, type: "mcq",
        question: "Area of rectangle " + l + "×" + w + "?",
        options: numOpts(l*w, baseId + "o" + i),
        answer: String(l*w),
        explanation: "Area = " + l + " × " + w + " = " + (l*w) + ".",
        difficulty: diff, xp: getXP(diff)
      });
    } else if (gt === 2) {
      const s = 4 + detInt(baseId + "s" + i, 1, 15);
      qs.push({
        id: baseId + "-sa-" + i, type: "mcq",
        question: "Area of square side " + s + "?",
        options: numOpts(s*s, baseId + "o" + i),
        answer: String(s*s),
        explanation: "Area = " + s + "² = " + (s*s) + ".",
        difficulty: diff, xp: getXP(diff)
      });
    } else if (gt === 3) {
      const ba = 4 + detInt(baseId + "ba" + i, 1, 12);
      const h = 3 + detInt(baseId + "h" + i, 1, 10);
      const a = Math.round((ba * h) / 2);
      qs.push({
        id: baseId + "-ta-" + i, type: "mcq",
        question: "Area of triangle base=" + ba + " height=" + h + "?",
        options: numOpts(a, baseId + "o" + i),
        answer: String(a),
        explanation: "Area = ½ × " + ba + " × " + h + " = " + a + ".",
        difficulty: diff, xp: getXP(diff)
      });
    } else if (gt === 4) {
      const s = 3 + detInt(baseId + "s" + i, 1, 10);
      qs.push({
        id: baseId + "-sp-" + i, type: "mcq",
        question: "Perimeter of square side " + s + "?",
        options: numOpts(4*s, baseId + "o" + i),
        answer: String(4*s),
        explanation: "Perimeter = 4 × " + s + " = " + (4*s) + ".",
        difficulty: diff, xp: getXP(diff)
      });
    } else if (gt === 5) {
      const l = 5 + detInt(baseId + "l" + i, 1, 12);
      const w = 3 + detInt(baseId + "w" + i, 1, 10);
      qs.push({
        id: baseId + "-rp-" + i, type: "mcq",
        question: "Perimeter of rectangle " + l + "×" + w + "?",
        options: numOpts(2*(l+w), baseId + "o" + i),
        answer: String(2*(l+w)),
        explanation: "Perimeter = 2(" + l + "+" + w + ") = " + (2*(l+w)) + ".",
        difficulty: diff, xp: getXP(diff)
      });
    } else {
      const r = 2 + detInt(baseId + "r" + i, 1, 8);
      const v = Math.round((4/3) * Math.PI * r * r * r);
      qs.push({
        id: baseId + "-sv-" + i, type: "mcq",
        question: "Volume of sphere radius " + r + "?",
        options: numOpts(v, baseId + "o" + i),
        answer: String(v),
        explanation: "Volume = (4/3)πr³ = (4/3)×3.14×" + r + "³ = " + v + ".",
        difficulty: diff, xp: getXP(diff)
      });
    }
  }
  return qs;
}

// ══════════════════════════════════════════════════════════════════════
// PERMUTATION & COMBINATION GENERATOR
// ══════════════════════════════════════════════════════════════════════

export function generatePermutationQuestions(baseId: string, count: number): Question[] {
  const qs: Question[] = [];
  for (let i = 0; i < count; i++) {
    const diff = getDifficulty(i, count);
    const n = 4 + detInt(baseId + "n" + i, 1, 7);
    const r = 2 + detInt(baseId + "r" + i, 0, Math.min(3, n - 1));
    if (detInt(baseId + "tp" + i, 0, 1) === 0) {
      const perm = Math.round(factorial(n) / factorial(n - r));
      qs.push({
        id: baseId + "-perm-" + i, type: "mcq",
        question: "Ways to arrange " + r + " from " + n + " distinct items?",
        options: numOpts(perm, baseId + "o" + i),
        answer: String(perm),
        explanation: "P(" + n + "," + r + ") = " + n + "! / " + (n-r) + "! = " + perm + ".",
        difficulty: diff, xp: getXP(diff)
      });
    } else {
      const comb = Math.round(factorial(n) / (factorial(r) * factorial(n - r)));
      qs.push({
        id: baseId + "-comb-" + i, type: "mcq",
        question: "Ways to choose " + r + " from " + n + " items?",
        options: numOpts(comb, baseId + "o" + i),
        answer: String(comb),
        explanation: "C(" + n + "," + r + ") = " + n + "! / (" + r + "! × " + (n-r) + "!) = " + comb + ".",
        difficulty: diff, xp: getXP(diff)
      });
    }
  }
  return qs;
}

// ══════════════════════════════════════════════════════════════════════
// NUMBER & LETTER SERIES GENERATOR
// ══════════════════════════════════════════════════════════════════════

export function generateSeriesQuestions(baseId: string, count: number): Question[] {
  const qs: Question[] = [];
  for (let i = 0; i < count; i++) {
    const diff = getDifficulty(i, count);
    const st = detInt(baseId + "st" + i, 1, 5);
    const step = 2 + detInt(baseId + "stp" + i, 1, 8);
    const start = 1 + detInt(baseId + "str" + i, 1, 10);
    if (st <= 3) {
      const seq: number[] = [];
      for (let j = 0; j < 5; j++) seq.push(start + j * step);
      const next = start + 5 * step;
      qs.push({
        id: baseId + "-ap-" + i, type: "mcq",
        question: "Next: " + seq.join(", ") + ", ?",
        options: numOpts(next, baseId + "o" + i),
        answer: String(next),
        explanation: "Pattern: +" + step + ". Next = " + seq[4] + " + " + step + " = " + next + ".",
        difficulty: diff, xp: getXP(diff)
      });
    } else if (st <= 4) {
      const ratio = 2 + detInt(baseId + "rt" + i, 1, 4);
      const seq: number[] = [];
      for (let j = 0; j < 5; j++) seq.push(start * Math.pow(ratio, j));
      const next = start * Math.pow(ratio, 5);
      qs.push({
        id: baseId + "-gp-" + i, type: "mcq",
        question: "Next: " + seq.map(n => Math.round(n)).join(", ") + ", ?",
        options: numOpts(Math.round(next), baseId + "o" + i),
        answer: String(Math.round(next)),
        explanation: "Pattern: ×" + ratio + ". Next = " + Math.round(seq[4]) + " × " + ratio + " = " + Math.round(next) + ".",
        difficulty: diff, xp: getXP(diff)
      });
    } else {
      const seq: number[] = [start, start];
      for (let j = 2; j < 6; j++) seq.push(seq[j-1] + seq[j-2]);
      const next = seq[5] + seq[4];
      qs.push({
        id: baseId + "-fib-" + i, type: "mcq",
        question: "Next: " + seq.join(", ") + ", ?",
        options: numOpts(next, baseId + "o" + i),
        answer: String(next),
        explanation: "Fibonacci pattern: each term is sum of previous two. Next = " + seq[5] + " + " + seq[4] + " = " + next + ".",
        difficulty: diff, xp: getXP(diff)
      });
    }
  }
  return qs;
}

// ══════════════════════════════════════════════════════════════════════
// CODING-DECODING GENERATOR
// ══════════════════════════════════════════════════════════════════════

export function generateCodingDecodingQuestions(baseId: string, count: number): Question[] {
  const qs: Question[] = [];
  const words = ["CAT","DOG","SUN","RUN","HAT","BIG","JAM","KEY","LIP","MOP","NET","OWL","PEN","RUG","TIE","VAN","WAX","ZAP","FUN","KIT"];
  for (let i = 0; i < count; i++) {
    const diff = getDifficulty(i, count);
    const word = words[i % words.length];
    const shift = 1 + detInt(baseId + "sh" + i, 0, 3);
    const coded = word.split("").map(ch => String.fromCharCode(ch.charCodeAt(0) + shift)).join("");
    qs.push({
      id: baseId + "-cd-" + i, type: "mcq",
      question: "If " + word + " is coded as " + coded + ", how is " + coded + " coded?",
      options: [word, word.split("").reverse().join(""), String.fromCharCode(word.charCodeAt(0) + shift + 1) + word.slice(1), word.toLowerCase()].sort(() => detInt(baseId + "z" + i, -1, 1)),
      answer: word.split("").map(ch => String.fromCharCode(ch.charCodeAt(0) + shift)).join(""),
      explanation: "Each letter is shifted by " + shift + ". " + word + " → " + coded + ".",
      difficulty: diff, xp: getXP(diff)
    });
  }
  return qs;
}

// ══════════════════════════════════════════════════════════════════════
// BLOOD RELATION GENERATOR
// ══════════════════════════════════════════════════════════════════════

export function generateBloodRelationQuestions(baseId: string, count: number): Question[] {
  const qs: Question[] = [];
  const templates = [
    { desc: "A is B's father. B is C's mother. C is D's brother.", q: "How is A related to D?", a: "Grandfather", opts: ["Father","Grandfather","Uncle","Brother"] },
    { desc: "P is Q's sister. Q is R's mother. R is S's brother.", q: "How is P related to R?", a: "Aunt", opts: ["Mother","Aunt","Sister","Grandmother"] },
    { desc: "X is Y's brother. Y is Z's father. Z is W's son.", q: "How is X related to W?", a: "Uncle", opts: ["Father","Uncle","Brother","Grandfather"] },
    { desc: "M is N's mother. N is O's sister. O is P's father.", q: "How is M related to P?", a: "Grandmother", opts: ["Mother","Grandmother","Aunt","Sister"] },
    { desc: "D is E's son. E is F's sister. F is G's mother.", q: "How is D related to G?", a: "Cousin", opts: ["Brother","Cousin","Nephew","Son"] },
    { desc: "J is K's father. K is L's brother. L is M's mother.", q: "How is J related to M?", a: "Grandfather", opts: ["Father","Grandfather","Uncle","Brother"] },
    { desc: "R is S's aunt. S is T's daughter. T is U's brother.", q: "How is R related to U?", a: "Sister", opts: ["Sister","Aunt","Cousin","Mother"] },
    { desc: "A is B's grandfather. B is C's father. C is D's brother.", q: "How is A related to D?", a: "Great-grandfather", opts: ["Grandfather","Father","Great-grandfather","Uncle"] }
  ];
  for (let i = 0; i < Math.min(count, templates.length); i++) {
    const t = templates[i % templates.length];
    qs.push({
      id: baseId + "-bl-" + i, type: "mcq",
      question: t.desc + " " + t.q,
      options: strOpts(t.a, t.opts.filter(o => o !== t.a), baseId + "o" + i),
      answer: t.a,
      explanation: t.desc + " Therefore, " + t.q + " " + t.a + ".",
      difficulty: i < count * 0.4 ? "beginner" : i < count * 0.7 ? "intermediate" : "master",
      xp: i < count * 0.4 ? 10 : i < count * 0.7 ? 15 : 20
    });
  }
  return qs;
}

// ══════════════════════════════════════════════════════════════════════
// DIRECTION GENERATOR
// ══════════════════════════════════════════════════════════════════════

export function generateDirectionQuestions(baseId: string, count: number): Question[] {
  const qs: Question[] = [];
  const dirData = [
    { turns: ["North","East","South","West"], q: "A walks 5km North, turns right, walks 3km. Direction from start?", a: "North-East" },
    { turns: ["South","West","North"], q: "A walks 4km South, turns right, walks 4km, turns left, walks 2km. Direction?", a: "South-West" },
    { turns: ["East","North","West"], q: "A walks 3km East, turns left, walks 4km, turns left, walks 3km. Direction?", a: "West" },
    { turns: ["North","East","South"], q: "A walks 6km North, turns right, walks 8km, turns right, walks 6km. Direction?", a: "East" },
    { turns: ["West","North","East"], q: "A walks 2km West, turns right, walks 5km, turns right, walks 2km. Direction?", a: "South" },
    { turns: ["South","East","North"], q: "A walks 7km South, turns left, walks 3km, turns left, walks 7km. Direction?", a: "East" }
  ];
  for (let i = 0; i < Math.min(count, dirData.length); i++) {
    const t = dirData[i % dirData.length];
    const wrong = ["North","South","East","West","North-East","North-West","South-East","South-West"].filter(d => d !== t.a);
    qs.push({
      id: baseId + "-dir-" + i, type: "mcq",
      question: t.q,
      options: strOpts(t.a, wrong.slice(0, 3), baseId + "o" + i),
      answer: t.a,
      explanation: "After following the given directions, the person is to the " + t.a + " of the starting point.",
      difficulty: "beginner", xp: 10
    });
  }
  return qs;
}

// ══════════════════════════════════════════════════════════════════════
// CALENDAR GENERATOR
// ══════════════════════════════════════════════════════════════════════

export function generateCalendarQuestions(baseId: string, count: number): Question[] {
  const qs: Question[] = [];
  const calData = [
    { q: "If 1st January is Monday, what day is 1st February (non-leap)?", a: "Thursday" },
    { q: "If 1st day of year is Sunday, what day is 1st March (leap year)?", a: "Tuesday" },
    { q: "How many days in a leap year?", a: "366", opts: ["365","366","364","360"] },
    { q: "Which year is a leap year?", a: "2024", opts: ["2023","2024","2025","2026"] },
    { q: "If today is Wednesday, what day after 50 days?", a: "Thursday" },
    { q: "How many odd days in 100 years?", a: "5", opts: ["3","4","5","6"] },
    { q: "If 15 Aug 1947 was Friday, what day was 15 Aug 1948?", a: "Sunday" },
    { q: "Angle between hour and minute hand at 3:00?", a: "90°", opts: ["0°","45°","90°","180°"] },
    { q: "Angle between hands at 6:00?", a: "180°", opts: ["0°","90°","180°","270°"] },
    { q: "Angle between hands at 12:30?", a: "165°", opts: ["150°","165°","180°","195°"] }
  ];
  for (let i = 0; i < Math.min(count, calData.length); i++) {
    const t = calData[i % calData.length];
    const wrongs = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday","365","364","360","2023","2025","2026","4","6","3","0°","45°","180°","150°","195°","270°"].filter(d => d !== t.a);
    qs.push({
      id: baseId + "-cal-" + i, type: "mcq",
      question: t.q,
      options: t.opts ? t.opts : strOpts(t.a, wrongs.slice(0, 3), baseId + "o" + i),
      answer: t.a,
      explanation: "Based on calendar calculations.",
      difficulty: i < count * 0.4 ? "beginner" : i < count * 0.7 ? "intermediate" : "master",
      xp: i < count * 0.4 ? 10 : i < count * 0.7 ? 15 : 20
    });
  }
  return qs;
}

// ══════════════════════════════════════════════════════════════════════
// GRAMMAR GENERATOR
// ══════════════════════════════════════════════════════════════════════

export function generateGrammarQuestions(baseId: string, count: number): Question[] {
  const qs: Question[] = [];
  const items = [
    { q: "She ___ to school every day.", opts: ["go","goes","going","gone"], a: "goes", exp: "Third person singular present simple takes 'goes'." },
    { q: "He is ___ honest man.", opts: ["a","an","the","no article"], a: "an", exp: "Use 'an' before 'honest' (vowel sound)." },
    { q: "The book is ___ the table.", opts: ["in","on","at","by"], a: "on", exp: "Use 'on' for surfaces." },
    { q: "I ___ dinner when the phone rang.", opts: ["cook","cooked","was cooking","have cooked"], a: "was cooking", exp: "Past continuous for interrupted ongoing action." },
    { q: "They ___ already ___ when I arrived.", opts: ["have,left","had,left","were,leaving","did,leave"], a: "had,left", exp: "Past perfect for action before another past action." },
    { q: "Neither he nor I ___ going.", opts: ["is","am","are","be"], a: "am", exp: "Verb agrees with nearer subject 'I'." },
    { q: "The news ___ shocking.", opts: ["is","are","were","has"], a: "is", exp: "'News' is singular." },
    { q: "Each of the students ___ a book.", opts: ["have","has","are","were"], a: "has", exp: "'Each' is singular." },
    { q: "If I ___ rich, I would travel.", opts: ["am","was","were","be"], a: "were", exp: "Second conditional uses 'were'." },
    { q: "She asked me where I ___ from.", opts: ["am","was","have been","will be"], a: "was", exp: "Reported speech shifts tense back." },
    { q: "The boy ___ smart.", opts: ["look","looks","looking","looked"], a: "looks", exp: "Third person singular." },
    { q: "She is ___ best student.", opts: ["a","an","the","no article"], a: "the", exp: "Use 'the' with superlatives." },
    { q: "I arrived ___ Monday.", opts: ["in","on","at","by"], a: "on", exp: "Use 'on' with days." },
    { q: "She ___ here since 2020.", opts: ["lives","lived","has lived","is living"], a: "has lived", exp: "Present perfect for ongoing action from past." },
    { q: "The team ___ playing well.", opts: ["is","are","were","have"], a: "is", exp: "Collective noun 'team' is singular." },
    { q: "I wish I ___ a bird.", opts: ["am","was","were","be"], a: "were", exp: "Wish uses past subjunctive 'were'." },
    { q: "He is one of those who ___ hard.", opts: ["work","works","working","worked"], a: "work", exp: "'Who' refers to 'those' (plural)." },
    { q: "The furniture ___ expensive.", opts: ["is","are","were","have"], a: "is", exp: "'Furniture' is uncountable." },
    { q: "She will come if she ___ time.", opts: ["has","have","had","having"], a: "has", exp: "First conditional uses present in if-clause." },
    { q: "I am used to ___ early.", opts: ["wake","waking","waked","woken"], a: "waking", exp: "'Used to' is followed by gerund." },
    { q: "She ___ her homework yet.", opts: ["didn't finish","hasn't finished","doesn't finish","isn't finishing"], a: "hasn't finished", exp: "Present perfect with 'yet'." },
    { q: "The movie ___ by the time we reached.", opts: ["starts","started","had started","was starting"], a: "had started", exp: "Past perfect for action completed before another." },
    { q: "He ___ since morning.", opts: ["works","worked","has been working","is working"], a: "has been working", exp: "Present perfect continuous for ongoing action." },
    { q: "This is the ___ painting I've ever seen.", opts: ["beautiful","more beautiful","most beautiful","beautifully"], a: "most beautiful", exp: "Superlative form: the most beautiful." },
    { q: "She speaks English ___ than him.", opts: ["fluent","fluently","more fluent","more fluently"], a: "more fluently", exp: "Comparative adverb: more fluently." },
    { q: "Neither the teacher nor the students ___ present.", opts: ["was","were","is","has"], a: "were", exp: "Verb agrees with nearer 'students' (plural)." },
    { q: "My mother, along with my sisters, ___ coming.", opts: ["is","are","were","have"], a: "is", exp: "Subject is 'mother' (singular)." },
    { q: "Each of the boys ___ given a prize.", opts: ["was","were","have","are"], a: "was", exp: "'Each' takes singular verb." },
    { q: "She said that she ___ help me.", opts: ["will","would","can","shall"], a: "would", exp: "Reported speech: 'will' becomes 'would'." },
    { q: "If he ___ earlier, he wouldn't miss the bus.", opts: ["leaves","left","had left","has left"], a: "had left", exp: "Third conditional: if + past perfect." }
  ];
  for (let i = 0; i < Math.min(count, items.length * 3); i++) {
    const t = items[i % items.length];
    const diff: Difficulty = i < count * 0.3 ? "beginner" : i < count * 0.7 ? "intermediate" : "master";
    const id = baseId + "-gram-" + i;
    const existing = qs.some(q => q.id === id);
    if (existing) continue;
    qs.push({
      id, type: "mcq",
      question: t.q,
      options: t.opts,
      answer: t.a,
      explanation: t.exp,
      difficulty: diff, xp: getXP(diff)
    });
  }
  return qs;
}

// ══════════════════════════════════════════════════════════════════════
// VOCABULARY GENERATOR
// ══════════════════════════════════════════════════════════════════════

export function generateVocabularyQuestions(baseId: string, count: number): Question[] {
  const qs: Question[] = [];
  const synItems = [
    { w: "Happy", opts: ["Sad","Joyful","Angry","Tired"], a: "Joyful" },
    { w: "Abundant", opts: ["Scarce","Plentiful","Limited","Rare"], a: "Plentiful" },
    { w: "Benevolent", opts: ["Kind","Cruel","Mean","Harsh"], a: "Kind" },
    { w: "Diligent", opts: ["Lazy","Hardworking","Careless","Slow"], a: "Hardworking" },
    { w: "Eloquent", opts: ["Silent","Fluent speaker","Angry","Confused"], a: "Fluent speaker" },
    { w: "Ephemeral", opts: ["Lasting","Short-lived","Permanent","Eternal"], a: "Short-lived" },
    { w: "Pragmatic", opts: ["Idealistic","Practical","Theoretical","Imaginative"], a: "Practical" },
    { w: "Resilient", opts: ["Weak","Recover quickly","Slow","Fragile"], a: "Recover quickly" },
    { w: "Ambiguous", opts: ["Clear","Uncertain","Definite","Obvious"], a: "Uncertain" },
    { w: "Ubiquitous", opts: ["Rare","Everywhere","Unique","Old"], a: "Everywhere" },
    { w: "Audacious", opts: ["Bold","Fearful","Timid","Shy"], a: "Bold" },
    { w: "Candid", opts: ["Honest","Dishonest","Secretive","Deceitful"], a: "Honest" },
    { w: "Voracious", opts: ["Hungry","Full","Satisfied","Bloated"], a: "Hungry" },
    { w: "Tenacious", opts: ["Determined","Weak","Lazy","Careless"], a: "Determined" },
    { w: "Prudent", opts: ["Careful","Reckless","Foolish","Hasty"], a: "Careful" }
  ];
  const antItems = [
    { w: "Brave", opts: ["Courageous","Cowardly","Fearless","Bold"], a: "Cowardly" },
    { w: "Generous", opts: ["Kind","Selfish","Giving","Charitable"], a: "Selfish" },
    { w: "Ancient", opts: ["Old","Modern","Antique","Historic"], a: "Modern" },
    { w: "Transparent", opts: ["Clear","Opaque","Visible","See-through"], a: "Opaque" },
    { w: "Optimistic", opts: ["Positive","Pessimistic","Hopeful","Cheerful"], a: "Pessimistic" },
    { w: "Vivid", opts: ["Bright","Dull","Colorful","Lively"], a: "Dull" },
    { w: "Genuine", opts: ["Real","Fake","Authentic","True"], a: "Fake" },
    { w: "Expand", opts: ["Grow","Contract","Increase","Extend"], a: "Contract" },
    { w: "Abundant", opts: ["Plentiful","Scarce","Ample","Rich"], a: "Scarce" },
    { w: "Temporary", opts: ["Brief","Permanent","Short","Transient"], a: "Permanent" }
  ];
  const subItems = [
    { q: "One who loves books", opts: ["Bibliophile","Philanthropist","Misanthrope","Anglophile"], a: "Bibliophile" },
    { q: "One who hates women", opts: ["Misogynist","Philanthropist","Misanthrope","Feminist"], a: "Misogynist" },
    { q: "One who loves mankind", opts: ["Philanthropist","Misanthrope","Egotist","Narcissist"], a: "Philanthropist" },
    { q: "One who looks at dark side", opts: ["Optimist","Pessimist","Realist","Idealist"], a: "Pessimist" },
    { q: "One who knows everything", opts: ["Omniscient","Omnipotent","Omnipresent","Intelligent"], a: "Omniscient" },
    { q: "One who is all-powerful", opts: ["Omniscient","Omnipotent","Omnipresent","Invincible"], a: "Omnipotent" },
    { q: "One who is everywhere", opts: ["Omniscient","Omnipotent","Omnipresent","Universal"], a: "Omnipresent" },
    { q: "One who walks in sleep", opts: ["Insomniac","Somnambulist","Lunatic","Hypnotist"], a: "Somnambulist" },
    { q: "One who cannot be corrected", opts: ["Incorrigible","Invincible","Indefatigable","Infallible"], a: "Incorrigible" },
    { q: "One who cannot be defeated", opts: ["Invincible","Incorrigible","Indefatigable","Infallible"], a: "Invincible" }
  ];
  const idiomItems = [
    { q: "Meaning of 'Hit the nail on the head'", opts: ["Miss the target","Do exactly right","Break something","Hit hard"], a: "Do exactly right" },
    { q: "Meaning of 'Bite the bullet'", opts: ["Eat quickly","Face difficulty","Get injured","Give up"], a: "Face difficulty" },
    { q: "Meaning of 'Break the ice'", opts: ["Break something cold","Start conversation","End friendship","Freeze water"], a: "Start conversation" },
    { q: "Meaning of 'Piece of cake'", opts: ["Delicious food","Very easy task","Sweet treat","Small portion"], a: "Very easy task" },
    { q: "Meaning of 'Once in a blue moon'", opts: ["Every month","Very rarely","Every day","At night"], a: "Very rarely" },
    { q: "Meaning of 'Spill the beans'", opts: ["Drop food","Reveal a secret","Make a mess","Cook badly"], a: "Reveal a secret" },
    { q: "Meaning of 'Cost an arm and a leg'", opts: ["Cheap","Very expensive","Painful","Free"], a: "Very expensive" },
    { q: "Meaning of 'Let the cat out of the bag'", opts: ["Free a cat","Reveal secret","Catch a thief","Buy a pet"], a: "Reveal secret" }
  ];
  for (let i = 0; i < count; i++) {
    const diff: Difficulty = i < count * 0.3 ? "beginner" : i < count * 0.7 ? "intermediate" : "master";
    const cat = detInt(baseId + "cat" + i, 0, 3);
    if (cat === 0) {
      const t = synItems[i % synItems.length];
      qs.push({ id: baseId + "-syn-" + i, type: "mcq", question: "Synonym of '" + t.w + "'?", options: t.opts, answer: t.a, explanation: "'" + t.w + "' means " + t.a.toLowerCase() + ".", difficulty: diff, xp: getXP(diff) });
    } else if (cat === 1) {
      const t = antItems[i % antItems.length];
      qs.push({ id: baseId + "-ant-" + i, type: "mcq", question: "Antonym of '" + t.w + "'?", options: t.opts, answer: t.a, explanation: "'" + t.a + "' is the opposite of '" + t.w + "'.", difficulty: diff, xp: getXP(diff) });
    } else if (cat === 2) {
      const t = subItems[i % subItems.length];
      qs.push({ id: baseId + "-sub-" + i, type: "mcq", question: t.q + "?", options: t.opts, answer: t.a, explanation: "A person who " + t.q.toLowerCase() + " is called a " + t.a + ".", difficulty: diff, xp: getXP(diff) });
    } else {
      const t = idiomItems[i % idiomItems.length];
      qs.push({ id: baseId + "-idio-" + i, type: "mcq", question: t.q + "?", options: t.opts, answer: t.a, explanation: "The idiom means '" + t.a.toLowerCase() + "'.", difficulty: diff, xp: getXP(diff) });
    }
  }
  return qs;
}

// ══════════════════════════════════════════════════════════════════════
// ERROR SPOTTING GENERATOR
// ══════════════════════════════════════════════════════════════════════

export function generateErrorSpottingQuestions(baseId: string, count: number): Question[] {
  const qs: Question[] = [];
  const errors = [
    { q: "Find the error: He don't like coffee.", opts: ["He","don't","like","coffee"], a: "don't", exp: "Should be 'doesn't' with third person singular." },
    { q: "Find the error: She is more taller than him.", opts: ["She","is","more taller","than him"], a: "more taller", exp: "Double comparative: use 'taller' not 'more taller'." },
    { q: "Find the error: I have went to the store.", opts: ["I","have","went","to the store"], a: "went", exp: "Should be 'gone' – past participle of 'go'." },
    { q: "Find the error: Neither of them are coming.", opts: ["Neither","of them","are","coming"], a: "are", exp: "Should be 'is' – 'neither' is singular." },
    { q: "Find the error: The team are playing good.", opts: ["The team","are","playing","good"], a: "are", exp: "Should be 'is' – collective noun 'team' is singular." },
    { q: "Find the error: Each of the boys have a book.", opts: ["Each","of the boys","have","a book"], a: "have", exp: "Should be 'has' – 'each' is singular." },
    { q: "Find the error: She is looking forward to meet you.", opts: ["She","is looking forward","to meet","you"], a: "to meet", exp: "Should be 'to meeting' – 'look forward to' takes gerund." },
    { q: "Find the error: I am used to wake up early.", opts: ["I","am used to","wake up","early"], a: "wake up", exp: "Should be 'waking up' – 'used to' takes gerund." },
    { q: "Find the error: He has visited the USA in 2019.", opts: ["He","has visited","the USA","in 2019"], a: "has visited", exp: "Should be 'visited' – past tense with specific time." },
    { q: "Find the error: The furniture are very expensive.", opts: ["The furniture","are","very","expensive"], a: "are", exp: "Should be 'is' – 'furniture' is uncountable." },
    { q: "Find the error: You, he and I am going.", opts: ["You","he and I","am","going"], a: "am", exp: "Should be 'are' – with multiple subjects." },
    { q: "Find the error: She don't have any money.", opts: ["She","don't","have","any money"], a: "don't", exp: "Should be 'doesn't' – third person singular." },
    { q: "Find the error: I prefer tea than coffee.", opts: ["I","prefer","tea than","coffee"], a: "tea than", exp: "Should be 'tea to' – 'prefer to' is correct." },
    { q: "Find the error: He was more smarter than his brother.", opts: ["He","was","more smarter","than his brother"], a: "more smarter", exp: "Double comparative: use 'smarter'." },
    { q: "Find the error: She told that she will come.", opts: ["She","told","that she will","come"], a: "told", exp: "Should be 'said' – 'tell' requires an indirect object." },
    { q: "Find the error: I have seen him yesterday.", opts: ["I","have seen","him","yesterday"], a: "have seen", exp: "Should be 'saw' – past tense with specific time." },
    { q: "Find the error: He is suffering from fever since Monday.", opts: ["He","is suffering","from fever","since Monday"], a: "is suffering", exp: "Should be 'has been suffering' – present perfect continuous." },
    { q: "Find the error: The sceneries here are beautiful.", opts: ["The sceneries","here","are","beautiful"], a: "The sceneries", exp: "'Scenery' is uncountable – no plural." },
    { q: "Find the error: He gave me an advice.", opts: ["He","gave","me","an advice"], a: "an advice", exp: "'Advice' is uncountable – use 'some advice'." },
    { q: "Find the error: This is the best of the two options.", opts: ["This","is","the best","of the two"], a: "the best", exp: "Should be 'the better' – comparative for two items." }
  ];
  for (let i = 0; i < Math.min(count, errors.length * 2); i++) {
    const t = errors[i % errors.length];
    const diff: Difficulty = i < count * 0.4 ? "beginner" : i < count * 0.7 ? "intermediate" : "master";
    qs.push({
      id: baseId + "-err-" + i, type: "mcq",
      question: t.q,
      options: t.opts,
      answer: t.a,
      explanation: t.exp,
      difficulty: diff, xp: getXP(diff)
    });
  }
  return qs;
}

// ══════════════════════════════════════════════════════════════════════
// CODING: JAVA GENERATOR
// ══════════════════════════════════════════════════════════════════════

export function generateJavaQuestions(baseId: string, count: number, diff: Difficulty): Question[] {
  const qs: Question[] = [];
  const xp = getXP(diff);
  const topics = [
    // Java Basics
    { q: "Which keyword is used to define a constant in Java?", o: ["const","final","static","constant"], a: "final" },
    { q: "What is the default value of a boolean?", o: ["true","false","0","null"], a: "false" },
    { q: "Size of 'char' in Java?", o: ["1 byte","2 bytes","4 bytes","8 bytes"], a: "2 bytes" },
    { q: "Which package contains the Math class?", o: ["java.util","java.lang","java.io","java.math"], a: "java.lang" },
    { q: "Is Java platform independent?", o: ["Yes","No","Only on Windows","Only on Linux"], a: "Yes" },
    { q: "What is JIT compiler?", o: ["Just-In-Time compiler","Java Interpreter Tool","Java Integrated Tool","None"], a: "Just-In-Time compiler" },
    { q: "Which method is called when an object is created?", o: ["main()","start()","constructor","init()"], a: "constructor" },
    { q: "Can constructors be overloaded?", o: ["Yes","No","Only in abstract classes","Only in interfaces"], a: "Yes" },
    { q: "What is method overloading?", o: ["Same name, different params","Same name, same params","Different names","Different classes"], a: "Same name, different params" },
    { q: "What is method overriding?", o: ["Subclass redefines parent method","Same class method","Static method","Final method"], a: "Subclass redefines parent method" },
    // OOP
    { q: "Which Java feature supports multiple inheritance?", o: ["Classes","Interfaces","Abstract classes","Objects"], a: "Interfaces" },
    { q: "Can an abstract class have constructors?", o: ["Yes","No","Only private","Only public"], a: "Yes" },
    { q: "What is the 'super' keyword used for?", o: ["Access parent","Access child","Create object","Destroy object"], a: "Access parent" },
    { q: "What is encapsulation?", o: ["Hiding data","Showing data","Copying data","Deleting data"], a: "Hiding data" },
    { q: "What is polymorphism?", o: ["One interface many forms","Many interfaces one form","One class","Many objects"], a: "One interface many forms" },
    { q: "What is an interface?", o: ["Abstract type with methods","Concrete class","Final class","Array"], a: "Abstract type with methods" },
    { q: "Can we create an instance of an abstract class?", o: ["No","Yes","Only with new","With clone()"], a: "No" },
    { q: "Which keyword prevents inheritance?", o: ["final","static","private","abstract"], a: "final" },
    // Collections
    { q: "Which collection is synchronized?", o: ["ArrayList","LinkedList","Vector","HashSet"], a: "Vector" },
    { q: "Which Set maintains insertion order?", o: ["HashSet","TreeSet","LinkedHashSet","EnumSet"], a: "LinkedHashSet" },
    { q: "HashMap default initial capacity?", o: ["10","16","20","32"], a: "16" },
    { q: "Which Map maintains sorted keys?", o: ["HashMap","TreeMap","LinkedHashMap","Hashtable"], a: "TreeMap" },
    { q: "ArrayList time complexity for get()?", o: ["O(1)","O(n)","O(log n)","O(n²)"], a: "O(1)" },
    { q: "LinkedList time complexity for add() at end?", o: ["O(1)","O(n)","O(log n)","O(n²)"], a: "O(1)" },
    // Exception Handling
    { q: "Which exception is thrown for array bounds?", o: ["NullPointer","ArrayIndexOutOfBounds","Arithmetic","ClassCast"], a: "ArrayIndexOutOfBounds" },
    { q: "Can multiple exceptions be caught in one catch?", o: ["Yes since Java 7","No","Only with throws","Only checked"], a: "Yes since Java 7" },
    { q: "What is the parent class of all exceptions?", o: ["Exception","Throwable","Error","RuntimeException"], a: "Throwable" },
    { q: "Finally block always executes?", o: ["Yes","No","Only on success","Only on failure"], a: "Yes" },
    // Multithreading
    { q: "Which method starts a thread?", o: ["run()","start()","begin()","execute()"], a: "start()" },
    { q: "What does synchronized do?", o: ["Thread safety","Speed up","Memory management","Serialization"], a: "Thread safety" },
    { q: "What is deadlock?", o: ["Threads waiting forever","Thread crash","Memory leak","Stack overflow"], a: "Threads waiting forever" },
    { q: "Which keyword provides visibility guarantee?", o: ["volatile","synchronized","transient","static"], a: "volatile" },
    // Advanced Java
    { q: "What are lambda expressions?", o: ["Anonymous functions","Named functions","Classes","Objects"], a: "Anonymous functions" },
    { q: "What is a functional interface?", o: ["One abstract method","No methods","Only static","Only default"], a: "One abstract method" },
    { q: "What is Stream API used for?", o: ["Functional operations","File I/O","Networking","Database"], a: "Functional operations" },
    { q: "What is Optional class for?", o: ["Avoid null","Handle errors","Create objects","Manage memory"], a: "Avoid null" },
    { q: "What is a record in Java 14+?", o: ["Immutable data carrier","Database record","Audio recording","Log entry"], a: "Immutable data carrier" },
    { q: "What is var keyword?", o: ["Local type inference","Variable declaration","Variant type","Volatile"], a: "Local type inference" },
    { q: "What is a sealed class?", o: ["Restricts subclasses","Final class","Abstract class","Interface"], a: "Restricts subclasses" },
    { q: "What is garbage collection?", o: ["Auto memory management","File cleanup","Network cleanup","Code cleanup"], a: "Auto memory management" },
  ];
  for (let i = 0; i < Math.min(count, topics.length); i++) {
    const t = topics[i];
    qs.push({
      id: baseId + "-java-" + i, type: "mcq",
      question: t.q,
      options: t.o,
      answer: t.a,
      explanation: t.a + " is correct.",
      difficulty: diff, xp
    });
  }
  return qs;
}

// ══════════════════════════════════════════════════════════════════════
// CODING: PYTHON GENERATOR
// ══════════════════════════════════════════════════════════════════════

export function generatePythonQuestions(baseId: string, count: number, diff: Difficulty): Question[] {
  const qs: Question[] = [];
  const xp = getXP(diff);
  const topics = [
    { q: "Which keyword defines a function in Python?", o: ["function","def","func","define"], a: "def" },
    { q: "What is the output of type(5)?", o: ["<class 'int'>","<class 'float'>","<class 'number'>","<class 'long'>"], a: "<class 'int'>" },
    { q: "Which data type is immutable?", o: ["list","dict","set","tuple"], a: "tuple" },
    { q: "What does len() return?", o: ["Length","Type","Memory","Address"], a: "Length" },
    { q: "How do you create an empty list?", o: ["[]","list()","Both","{}"], a: "Both" },
    { q: "Which method adds to list end?", o: ["add()","append()","insert()","push()"], a: "append()" },
    { q: "What does 'in' check?", o: ["Membership","Import","Loop","Indentation"], a: "Membership" },
    { q: "What does 'is' compare?", o: ["Identity","Equality","Value","Type"], a: "Identity" },
    { q: "What is a lambda?", o: ["Anonymous function","Named function","Class","Module"], a: "Anonymous function" },
    { q: "What is *args?", o: ["Variable positional args","Keyword args","Default arg","Required arg"], a: "Variable positional args" },
    { q: "What is **kwargs?", o: ["Variable keyword args","Positional args","List","Tuple"], a: "Variable keyword args" },
    { q: "What does 'with' do for files?", o: ["Auto close","Fast open","Create backup","Encrypt"], a: "Auto close" },
    { q: "What is a decorator?", o: ["Modifies function","Creates function","Deletes function","Copies function"], a: "Modifies function" },
    { q: "What is a generator?", o: ["Yields values","Returns list","Creates dict","Defines class"], a: "Yields values" },
    { q: "What is __init__ called?", o: ["Constructor","Destructor","Method","Function"], a: "Constructor" },
    { q: "Which is True about Python?", o: ["Interpreted","Compiled","Both","Neither"], a: "Interpreted" },
    { q: "What is PIP?", o: ["Package manager","Function","Module","Data type"], a: "Package manager" },
    { q: "What is a list comprehension?", o: ["Concise list creation","List sorting","List copying","List deletion"], a: "Concise list creation" },
    { q: "What does zip() do?", o: ["Pairs iterables","Compresses data","Sorts data","Encrypts"], a: "Pairs iterables" },
    { q: "What is a set?", o: ["Unique elements","Ordered list","Key-value pairs","Mutable sequence"], a: "Unique elements" }
  ];
  for (let i = 0; i < Math.min(count, topics.length); i++) {
    const t = topics[i];
    qs.push({
      id: baseId + "-py-" + i, type: "mcq",
      question: t.q,
      options: t.o,
      answer: t.a,
      explanation: t.a + " is correct.",
      difficulty: diff, xp
    });
  }
  return qs;
}
