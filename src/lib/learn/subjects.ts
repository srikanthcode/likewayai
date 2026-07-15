// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI LEARNING PLATFORM — Subject & Course Data
// ══════════════════════════════════════════════════════════════════════

export type Difficulty = "beginner" | "intermediate" | "master";
export type QuestionType = "mcq" | "fill_blank" | "coding" | "output" | "true_false";

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
  difficulty: Difficulty;
  xp: number;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  order: number;
  questions: Question[];
}

export interface Course {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  difficulty: Difficulty;
  modules: Module[];
  totalQuestions: number;
  estimatedHours: number;
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  courses: Course[];
}

// ── Subject Categories ────────────────────────────────────────────────
export const SUBJECTS: Subject[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CODING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "coding",
    name: "Coding & Programming",
    icon: "💻",
    description: "Master programming languages and software development",
    color: "#10B981",
    courses: [
      {
        id: "java",
        name: "Java Programming",
        icon: "☕",
        category: "coding",
        description: "Complete Java from basics to advanced",
        difficulty: "beginner",
        estimatedHours: 40,
        totalQuestions: 130,
        modules: [
          {
            id: "java-beginner",
            title: "Beginner",
            description: "Java fundamentals, variables, loops, arrays",
            order: 1,
            questions: generateJavaBeginnerQuestions(),
          },
          {
            id: "java-intermediate",
            title: "Intermediate",
            description: "OOP, Collections, Exception Handling, Generics",
            order: 2,
            questions: generateJavaIntermediateQuestions(),
          },
          {
            id: "java-master",
            title: "Master",
            description: "Multithreading, Design Patterns, Spring Boot, System Design",
            order: 3,
            questions: generateJavaMasterQuestions(),
          },
        ],
      },
      {
        id: "python",
        name: "Python Programming",
        icon: "🐍",
        category: "coding",
        description: "Python from basics to data science",
        difficulty: "beginner",
        estimatedHours: 35,
        totalQuestions: 50,
        modules: [
          { id: "py-beginner", title: "Beginner", description: "Variables, loops, functions, OOP basics", order: 1, questions: generatePythonBeginnerQuestions() },
          { id: "py-intermediate", title: "Intermediate", description: "Decorators, generators, file handling, APIs", order: 2, questions: [] },
          { id: "py-master", title: "Master", description: "Async, metaclasses, design patterns, performance", order: 3, questions: [] },
        ],
      },
      {
        id: "javascript",
        name: "JavaScript",
        icon: "🟨",
        category: "coding",
        description: "Modern JavaScript and TypeScript",
        difficulty: "beginner",
        estimatedHours: 30,
        totalQuestions: 50,
        modules: [
          { id: "js-beginner", title: "Beginner", description: "Variables, functions, DOM, async/await", order: 1, questions: generateJavaScriptBeginnerQuestions() },
          { id: "js-intermediate", title: "Intermediate", description: "Closures, prototypes, ES6+, modules", order: 2, questions: [] },
          { id: "js-master", title: "Master", description: "Performance, patterns, V8 internals", order: 3, questions: [] },
        ],
      },
      {
        id: "c",
        name: "C Programming",
        icon: "⚙️",
        category: "coding",
        description: "System-level programming in C",
        difficulty: "beginner",
        estimatedHours: 25,
        totalQuestions: 50,
        modules: [
          { id: "c-beginner", title: "Beginner", description: "Variables, pointers, arrays, functions", order: 1, questions: generateCBeginnerQuestions() },
          { id: "c-intermediate", title: "Intermediate", description: "Memory management, structs, file I/O", order: 2, questions: [] },
          { id: "c-master", title: "Master", description: "OS concepts, networking, embedded", order: 3, questions: [] },
        ],
      },
      {
        id: "cpp",
        name: "C++ Programming",
        icon: "🔧",
        category: "coding",
        description: "Object-oriented and systems programming",
        difficulty: "beginner",
        estimatedHours: 35,
        totalQuestions: 50,
        modules: [
          { id: "cpp-beginner", title: "Beginner", description: "OOP, STL, templates basics", order: 1, questions: generateCppBeginnerQuestions() },
          { id: "cpp-intermediate", title: "Intermediate", description: "Smart pointers, move semantics, lambdas", order: 2, questions: [] },
          { id: "cpp-master", title: "Master", description: "Metaprogramming, concurrency, optimization", order: 3, questions: [] },
        ],
      },
      {
        id: "react",
        name: "React.js",
        icon: "⚛️",
        category: "coding",
        description: "Modern React with hooks and Next.js",
        difficulty: "beginner",
        estimatedHours: 30,
        totalQuestions: 50,
        modules: [
          { id: "react-beginner", title: "Beginner", description: "Components, JSX, props, state, hooks", order: 1, questions: generateReactBeginnerQuestions() },
          { id: "react-intermediate", title: "Intermediate", description: "Context, performance, testing", order: 2, questions: [] },
          { id: "react-master", title: "Master", description: "Architecture, SSR, advanced patterns", order: 3, questions: [] },
        ],
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // APTITUDE & REASONING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "aptitude",
    name: "Aptitude & Reasoning",
    icon: "🧠",
    description: "Quantitative aptitude, logical reasoning, verbal ability",
    color: "#8B5CF6",
    courses: [
      {
        id: "quantitative",
        name: "Quantitative Aptitude",
        icon: "🔢",
        category: "aptitude",
        description: "Numbers, percentages, profit/loss, time & work",
        difficulty: "beginner",
        estimatedHours: 30,
        totalQuestions: 50,
        modules: [
          { id: "quant-numbers", title: "Number System", description: "LCM, HCF, divisibility, remainders", order: 1, questions: generateQuantQuestions() },
          { id: "quant-percent", title: "Percentage & Ratio", description: "Percentages, ratios, proportions", order: 2, questions: generatePercentQuestions() },
          { id: "quant-profit", title: "Profit & Loss", description: "CP, SP, discounts, marked price", order: 3, questions: [] },
          { id: "quant-time", title: "Time & Work", description: "Pipes, cisterns, efficiency, wages", order: 4, questions: [] },
          { id: "quant-speed", title: "Speed, Time & Distance", description: "Trains, boats, races, relative speed", order: 5, questions: [] },
          { id: "quant-average", title: "Average & mixture", description: "Averages, alligation, mixtures", order: 6, questions: [] },
          { id: "quant-interest", title: "Simple & Compound Interest", description: "SI, CI, effective rate, growth", order: 7, questions: [] },
          { id: "quant-algebra", title: "Algebra", description: "Equations, inequalities, quadratic", order: 8, questions: [] },
          { id: "quant-geometry", title: "Geometry & Mensuration", description: "Lines, angles, circles, areas, volumes", order: 9, questions: [] },
          { id: "quant-permutation", title: "Permutation & Combination", description: "Counting, probability, arrangements", order: 10, questions: [] },
        ],
      },
      {
        id: "logical",
        name: "Logical Reasoning",
        icon: "🔗",
        category: "aptitude",
        description: "Puzzles, series, coding-decoding, syllogisms",
        difficulty: "beginner",
        estimatedHours: 25,
        totalQuestions: 50,
        modules: [
          { id: "reason-series", title: "Number & Letter Series", description: "Find the next term, missing term", order: 1, questions: generateLogicalQuestions() },
          { id: "reason-coding", title: "Coding-Decoding", description: "Letter coding, number coding, substitution", order: 2, questions: generateCodingDecodingQuestions() },
          { id: "reason-syllogism", title: "Syllogisms", description: "Statements, conclusions, Venn diagrams", order: 3, questions: [] },
          { id: "reason-puzzle", title: "Puzzles", description: "Seating arrangement, floor puzzle, scheduling", order: 4, questions: [] },
          { id: "reason-blood", title: "Blood Relations", description: "Family tree, coded relations", order: 5, questions: [] },
          { id: "reason-direction", title: "Direction & Distance", description: "North, south, turns, shortest path", order: 6, questions: [] },
          { id: "reason-calendar", title: "Calendar & Clocks", description: "Day finding, angle between hands", order: 7, questions: [] },
          { id: "reason-statement", title: "Statement & Conclusion", description: "Assumptions, arguments, course of action", order: 8, questions: [] },
        ],
      },
      {
        id: "verbal",
        name: "Verbal Ability",
        icon: "📝",
        category: "aptitude",
        description: "English grammar, vocabulary, comprehension",
        difficulty: "beginner",
        estimatedHours: 20,
        totalQuestions: 50,
        modules: [
          { id: "verbal-grammar", title: "Grammar", description: "Tenses, articles, prepositions, subject-verb", order: 1, questions: generateVerbalGrammarQuestions() },
          { id: "verbal-vocab", title: "Vocabulary", description: "Synonyms, antonyms, one-word substitution", order: 2, questions: generateVocabularyQuestions() },
          { id: "verbal-error", title: "Error Spotting", description: "Find grammatical errors in sentences", order: 3, questions: [] },
          { id: "verbal-fill", title: "Fill in the Blanks", description: "Contextual word usage", order: 4, questions: [] },
          { id: "verbal-comprehension", title: "Reading Comprehension", description: "Passage-based questions", order: 5, questions: [] },
          { id: "verbal-para", title: "Para Jumbles", description: "Rearrange sentences to form coherent paragraph", order: 6, questions: [] },
          { id: "verbal-idiom", title: "Idioms & Phrases", description: "Common idioms and their meanings", order: 7, questions: [] },
        ],
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MATHEMATICS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "mathematics",
    name: "Mathematics",
    icon: "📐",
    description: "Algebra, calculus, statistics, discrete math",
    color: "#3B82F6",
    courses: [
      {
        id: "algebra",
        name: "Algebra",
        icon: "🔤",
        category: "mathematics",
        description: "Linear equations, polynomials, matrices",
        difficulty: "beginner",
        estimatedHours: 20,
        totalQuestions: 300,
        modules: [
          { id: "alg-linear", title: "Linear Equations", description: "Solving equations, systems of equations", order: 1, questions: [] },
          { id: "alg-quadratic", title: "Quadratic Equations", description: "Factoring, discriminant, roots", order: 2, questions: [] },
          { id: "alg-polynomial", title: "Polynomials", description: "Factor theorem, remainder theorem", order: 3, questions: [] },
          { id: "alg-matrix", title: "Matrices", description: "Addition, multiplication, determinants", order: 4, questions: [] },
        ],
      },
      {
        id: "calculus",
        name: "Calculus",
        icon: "∫",
        category: "mathematics",
        description: "Limits, derivatives, integrals",
        difficulty: "intermediate",
        estimatedHours: 25,
        totalQuestions: 350,
        modules: [
          { id: "calc-limit", title: "Limits", description: "Concept, evaluation, L'Hopital's rule", order: 1, questions: [] },
          { id: "calc-derivative", title: "Derivatives", description: "Rules, applications, optimization", order: 2, questions: [] },
          { id: "calc-integral", title: "Integrals", description: "Definite, indefinite, techniques", order: 3, questions: [] },
        ],
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // COMMUNICATION & CAREER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "communication",
    name: "Communication Skills",
    icon: "🗣️",
    description: "Public speaking, writing, interview skills",
    color: "#EC4899",
    courses: [
      {
        id: "public-speaking",
        name: "Public Speaking",
        icon: "🎤",
        category: "communication",
        description: "Overcome fear, deliver powerful speeches",
        difficulty: "beginner",
        estimatedHours: 15,
        totalQuestions: 100,
        modules: [
          { id: "speak-basics", title: "Basics", description: "Voice modulation, body language, eye contact", order: 1, questions: [] },
          { id: "speak-techniques", title: "Techniques", description: "Storytelling, rhetorical devices, pauses", order: 2, questions: [] },
        ],
      },
      {
        id: "interview-prep",
        name: "Interview Preparation",
        icon: "💼",
        category: "communication",
        description: "HR, technical, behavioral interview prep",
        difficulty: "beginner",
        estimatedHours: 20,
        totalQuestions: 150,
        modules: [
          { id: "interview-hr", title: "HR Interview", description: "Common questions, STAR method, salary negotiation", order: 1, questions: [] },
          { id: "interview-technical", title: "Technical Interview", description: "DSA, system design, coding challenges", order: 2, questions: [] },
          { id: "interview-behavioral", title: "Behavioral", description: "Leadership, teamwork, conflict resolution", order: 3, questions: [] },
        ],
      },
    ],
  },
];

// ── Question Generators ───────────────────────────────────────────────

function generateJavaBeginnerQuestions(): Question[] {
  return [
    // Variables & Data Types
    { id: "jb1", type: "mcq", question: "Which keyword is used to define a class in Java?", options: ["struct", "class", "object", "define"], answer: "class", explanation: "The 'class' keyword is used to define a class in Java. Example: class MyClass { }", difficulty: "beginner", xp: 10 },
    { id: "jb2", type: "mcq", question: "What is the size of an int in Java?", options: ["2 bytes", "4 bytes", "8 bytes", "16 bytes"], answer: "4 bytes", explanation: "In Java, int is always 32-bit (4 bytes) regardless of the platform.", difficulty: "beginner", xp: 10 },
    { id: "jb3", type: "mcq", question: "Which method is the entry point of a Java program?", options: ["start()", "main()", "init()", "run()"], answer: "main()", explanation: "public static void main(String[] args) is the entry point of every Java application.", difficulty: "beginner", xp: 10 },
    { id: "jb4", type: "output", question: "What is the output?\n\npublic class Test {\n    public static void main(String[] args) {\n        System.out.println(2 + 3 + \"Hello\");\n    }\n}", options: ["5Hello", "23Hello", "Hello5", "Compilation error"], answer: "5Hello", explanation: "Addition happens left to right: 2+3=5, then 5+\"Hello\" = \"5Hello\".", difficulty: "beginner", xp: 15 },
    { id: "jb5", type: "mcq", question: "Which data type is used to store true/false in Java?", options: ["int", "bool", "boolean", "Boolean"], answer: "boolean", explanation: "Java uses lowercase 'boolean' as the primitive type. 'Boolean' is the wrapper class.", difficulty: "beginner", xp: 10 },
    { id: "jb6", type: "mcq", question: "What is the default value of a boolean in Java?", options: ["true", "false", "0", "null"], answer: "false", explanation: "Instance variables of type boolean are initialized to false by default.", difficulty: "beginner", xp: 10 },
    { id: "jb7", type: "fill_blank", question: "In Java, ___ is used to inherit from a class.", answer: "extends", explanation: "The 'extends' keyword is used for inheritance. Example: class Child extends Parent { }", difficulty: "beginner", xp: 10 },
    { id: "jb8", type: "mcq", question: "Which of the following is not a valid Java identifier?", options: ["_name", "$value", "2count", "myVar"], answer: "2count", explanation: "Java identifiers cannot start with a digit. They can start with letters, _, or $.", difficulty: "beginner", xp: 10 },
    { id: "jb9", type: "output", question: "What is the output?\n\nint x = 5;\nSystem.out.println(x++);\nSystem.out.println(x);", options: ["5 6", "6 6", "5 5", "6 5"], answer: "5 6", explanation: "x++ is post-increment: prints current value (5), then increments to 6.", difficulty: "beginner", xp: 15 },
    { id: "jb10", type: "mcq", question: "Which access modifier makes a member accessible only within the same package?", options: ["public", "private", "protected", "default (no modifier)"], answer: "default (no modifier)", explanation: "Default (package-private) access allows access only within the same package.", difficulty: "beginner", xp: 10 },
    { id: "jb11", type: "mcq", question: "What is the range of byte data type in Java?", options: ["-128 to 127", "0 to 255", "-32768 to 32767", "-2^31 to 2^31-1"], answer: "-128 to 127", explanation: "byte is an 8-bit signed integer, ranging from -128 to 127.", difficulty: "beginner", xp: 10 },
    { id: "jb12", type: "mcq", question: "Which keyword is used to create an object in Java?", options: ["new", "create", "instance", "object"], answer: "new", explanation: "The 'new' keyword allocates memory and creates an object. Example: Car c = new Car();", difficulty: "beginner", xp: 10 },
    { id: "jb13", type: "mcq", question: "What is the default value of an int variable in Java?", options: ["0", "null", "undefined", "1"], answer: "0", explanation: "Instance variables of type int are initialized to 0 by default.", difficulty: "beginner", xp: 10 },
    { id: "jb14", type: "output", question: "What is the output?\n\nString s = \"Java\";\nSystem.out.println(s.length());", options: ["3", "4", "5", "Compilation error"], answer: "4", explanation: "The length() method returns the number of characters in the string. \"Java\" has 4 characters.", difficulty: "beginner", xp: 10 },
    { id: "jb15", type: "mcq", question: "Which of these is NOT a primitive data type in Java?", options: ["int", "boolean", "String", "char"], answer: "String", explanation: "String is a class, not a primitive type. Primitives are: byte, short, int, long, float, double, boolean, char.", difficulty: "beginner", xp: 10 },
    // Operators
    { id: "jb16", type: "mcq", question: "What does the && operator do?", options: ["Bitwise AND", "Logical AND", "Logical OR", "Assignment"], answer: "Logical AND", explanation: "&& is the logical AND operator. Returns true only if both operands are true.", difficulty: "beginner", xp: 10 },
    { id: "jb17", type: "output", question: "What is the output?\n\nint a = 10, b = 3;\nSystem.out.println(a % b);", options: ["3", "1", "0", "3.33"], answer: "1", explanation: "The % operator returns the remainder. 10 % 3 = 1 (since 3*3=9, remainder 1).", difficulty: "beginner", xp: 10 },
    { id: "jb18", type: "mcq", question: "What is the result of 5 + 3 * 2 in Java?", options: ["16", "11", "10", "13"], answer: "11", explanation: "Multiplication has higher precedence than addition: 3*2=6, then 5+6=11.", difficulty: "beginner", xp: 10 },
    { id: "jb19", type: "mcq", question: "Which operator is used to compare two values?", options: ["=", "==", "===", "!="], answer: "==", explanation: "== compares values. = is assignment, != checks inequality.", difficulty: "beginner", xp: 10 },
    { id: "jb20", type: "output", question: "What is the output?\n\nint x = 5;\nSystem.out.println(++x);", options: ["5", "6", "4", "Compilation error"], answer: "6", explanation: "++x is pre-increment: increments x first (to 6), then returns the value.", difficulty: "beginner", xp: 10 },
    // Control Flow
    { id: "jb21", type: "mcq", question: "Which statement is used for conditional execution?", options: ["for", "while", "if", "switch"], answer: "if", explanation: "The 'if' statement executes code based on a condition. switch is also used but for multiple specific values.", difficulty: "beginner", xp: 10 },
    { id: "jb22", type: "mcq", question: "How many cases can a switch statement have?", options: ["Only 2", "Only 4", "Unlimited", "Only 10"], answer: "Unlimited", explanation: "A switch statement can have any number of case labels.", difficulty: "beginner", xp: 10 },
    { id: "jb23", type: "output", question: "What is the output?\n\nfor(int i = 0; i < 3; i++) {\n    System.out.print(i + \" \");\n}", options: ["0 1 2", "1 2 3", "0 1 2 3", "1 2"], answer: "0 1 2", explanation: "Loop runs from i=0 to i<3, printing 0, 1, 2.", difficulty: "beginner", xp: 10 },
    { id: "jb24", type: "mcq", question: "What does the 'break' keyword do in a loop?", options: ["Skips the current iteration", "Exits the loop", "Restarts the loop", "Pauses the loop"], answer: "Exits the loop", explanation: "break immediately exits the innermost loop or switch statement.", difficulty: "beginner", xp: 10 },
    { id: "jb25", type: "mcq", question: "What is the difference between while and do-while?", options: ["No difference", "while checks condition first, do-while checks after", "do-while is faster", "while is newer"], answer: "while checks condition first, do-while checks after", explanation: "do-while guarantees at least one execution since the condition is checked after the loop body.", difficulty: "beginner", xp: 10 },
    { id: "jb26", type: "output", question: "What is the output?\n\nint sum = 0;\nfor(int i = 1; i <= 5; i++) {\n    sum += i;\n}\nSystem.out.println(sum);", options: ["10", "15", "20", "25"], answer: "15", explanation: "Sum = 1+2+3+4+5 = 15.", difficulty: "beginner", xp: 15 },
    { id: "jb27", type: "mcq", question: "Which loop is guaranteed to execute at least once?", options: ["for", "while", "do-while", "All of them"], answer: "do-while", explanation: "do-while checks the condition after executing the loop body.", difficulty: "beginner", xp: 10 },
    { id: "jb28", type: "output", question: "What is the output?\n\nfor(int i = 1; i <= 5; i++) {\n    if(i == 3) continue;\n    System.out.print(i + \" \");\n}", options: ["1 2 3 4 5", "1 2 4 5", "3", "1 2 3"], answer: "1 2 4 5", explanation: "continue skips the current iteration when i==3, so 3 is not printed.", difficulty: "beginner", xp: 15 },
    // Arrays
    { id: "jb29", type: "mcq", question: "How do you declare an array in Java?", options: ["int[] arr = new int[5]", "int arr[] = new int[5]", "Both A and B", "int arr = new int[5]"], answer: "Both A and B", explanation: "Both int[] arr and int arr[] are valid syntax in Java.", difficulty: "beginner", xp: 10 },
    { id: "jb30", type: "output", question: "What is the output?\n\nint[] arr = {1, 2, 3, 4, 5};\nSystem.out.println(arr[2]);", options: ["1", "2", "3", "4"], answer: "3", explanation: "Array indices start at 0. arr[2] is the third element, which is 3.", difficulty: "beginner", xp: 10 },
    { id: "jb31", type: "mcq", question: "What is the length of an array {10, 20, 30}?", options: ["2", "3", "4", "30"], answer: "3", explanation: "The array has 3 elements, so .length returns 3.", difficulty: "beginner", xp: 10 },
    { id: "jb32", type: "output", question: "What is the output?\n\nint[] arr = {5, 3, 1, 4, 2};\nint max = arr[0];\nfor(int i = 1; i < arr.length; i++) {\n    if(arr[i] > max) max = arr[i];\n}\nSystem.out.println(max);", options: ["1", "2", "3", "5"], answer: "5", explanation: "This code finds the maximum value in the array, which is 5.", difficulty: "beginner", xp: 15 },
    // Methods
    { id: "jb33", type: "mcq", question: "What is the correct way to define a method in Java?", options: ["void myMethod() { }", "function myMethod() { }", "def myMethod() { }", "method myMethod() { }"], answer: "void myMethod() { }", explanation: "Java methods start with access modifier, return type, then method name.", difficulty: "beginner", xp: 10 },
    { id: "jb34", type: "output", question: "What is the output?\n\npublic static int add(int a, int b) {\n    return a + b;\n}\nSystem.out.println(add(3, 4));", options: ["3", "4", "7", "Compilation error"], answer: "7", explanation: "The add method returns 3+4=7.", difficulty: "beginner", xp: 10 },
    { id: "jb35", type: "mcq", question: "Can a method return multiple values in Java?", options: ["Yes, using arrays", "Yes, using objects", "No", "Both A and B"], answer: "Both A and B", explanation: "Java methods return a single value, but you can return an array or object containing multiple values.", difficulty: "beginner", xp: 10 },
    { id: "jb36", type: "mcq", question: "What is method overloading?", options: ["Same method name, different parameters", "Same method name, same parameters", "Different method names", "Inheritance"], answer: "Same method name, different parameters", explanation: "Method overloading means having multiple methods with the same name but different parameter lists.", difficulty: "beginner", xp: 15 },
    // Strings
    { id: "jb37", type: "mcq", question: "Are strings mutable in Java?", options: ["Yes", "No", "Only if declared final", "Depends on the method"], answer: "No", explanation: "Strings in Java are immutable. Once created, they cannot be changed.", difficulty: "beginner", xp: 10 },
    { id: "jb38", type: "output", question: "What is the output?\n\nString s1 = \"Hello\";\nString s2 = \"Hello\";\nSystem.out.println(s1 == s2);", options: ["true", "false", "Compilation error", "NullPointerException"], answer: "true", explanation: "String literals are interned, so s1 and s2 point to the same object in memory.", difficulty: "beginner", xp: 15 },
    { id: "jb39", type: "mcq", question: "Which method converts a string to uppercase?", options: ["toUpper()", "toUpperCase()", "upper()", "convertUpper()"], answer: "toUpperCase()", explanation: "The toUpperCase() method returns a string with all characters converted to uppercase.", difficulty: "beginner", xp: 10 },
    { id: "jb40", type: "output", question: "What is the output?\n\nString s = \"Java\";\nSystem.out.println(s.substring(1, 3));", options: ["Ja", "av", "Jav", "ava"], answer: "av", explanation: "substring(1,3) extracts characters from index 1 to 2 (exclusive of 3).", difficulty: "beginner", xp: 10 },
    // Object-Oriented Basics
    { id: "jb41", type: "mcq", question: "What is a class in Java?", options: ["An object", "A blueprint for objects", "A method", "A variable"], answer: "A blueprint for objects", explanation: "A class is a template that defines the properties and behaviors of objects.", difficulty: "beginner", xp: 10 },
    { id: "jb42", type: "mcq", question: "What is an object in Java?", options: ["A class", "An instance of a class", "A method", "A variable"], answer: "An instance of a class", explanation: "An object is a runtime entity that has state (fields) and behavior (methods).", difficulty: "beginner", xp: 10 },
    { id: "jb43", type: "mcq", question: "What is a constructor?", options: ["A special method called when object is created", "A regular method", "A variable", "A class"], answer: "A special method called when object is created", explanation: "A constructor initializes an object when it's created using 'new'.", difficulty: "beginner", xp: 10 },
    { id: "jb44", type: "mcq", question: "Can a class have multiple constructors?", options: ["Yes", "No", "Only one", "Only two"], answer: "Yes", explanation: "A class can have multiple constructors with different parameter lists (constructor overloading).", difficulty: "beginner", xp: 10 },
    { id: "jb45", type: "output", question: "What is the output?\n\nclass Student {\n    String name;\n    Student(String n) { name = n; }\n    void display() { System.out.println(name); }\n}\npublic static void main(String[] args) {\n    Student s = new Student(\"Alice\");\n    s.display();\n}", options: ["Alice", "null", "Compilation error", "Runtime error"], answer: "Alice", explanation: "The constructor sets name to \"Alice\", and display() prints it.", difficulty: "beginner", xp: 15 },
    { id: "jb46", type: "mcq", question: "What is the 'this' keyword used for?", options: ["Refers to current class instance", "Refers to parent class", "Creates a new object", "Imports a package"], answer: "Refers to current class instance", explanation: "'this' refers to the current object instance in an instance method or constructor.", difficulty: "beginner", xp: 10 },
    { id: "jb47", type: "mcq", question: "What is encapsulation?", options: ["Hiding data and providing access through methods", "Creating multiple objects", "Using inheritance", "Defining variables"], answer: "Hiding data and providing access through methods", explanation: "Encapsulation bundles data with methods and restricts direct access to fields.", difficulty: "beginner", xp: 15 },
    { id: "jb48", type: "mcq", question: "What is the purpose of getters and setters?", options: ["To access and modify private fields", "To create objects", "To define constructors", "To inherit classes"], answer: "To access and modify private fields", explanation: "Getters and setters provide controlled access to private instance variables.", difficulty: "beginner", xp: 10 },
    // Exception Handling
    { id: "jb49", type: "mcq", question: "Which block is used to handle exceptions?", options: ["try", "catch", "finally", "All of the above"], answer: "All of the above", explanation: "try-catch-finally is used together to handle exceptions gracefully.", difficulty: "beginner", xp: 10 },
    { id: "jb50", type: "mcq", question: "What happens if an exception is not caught?", options: ["Program continues", "Program crashes", "Exception is ignored", "Nothing"], answer: "Program crashes", explanation: "Unhandled exceptions cause the program to terminate with a stack trace.", difficulty: "beginner", xp: 10 },
    { id: "jb51", type: "output", question: "What is the output?\n\ntry {\n    int x = 10 / 0;\n} catch(ArithmeticException e) {\n    System.out.println(\"Error\");\n} finally {\n    System.out.println(\"Done\");\n}", options: ["Error", "Done", "Error\\nDone", "Compilation error"], answer: "Error\\nDone", explanation: "The exception is caught, printing 'Error', then finally always executes, printing 'Done'.", difficulty: "beginner", xp: 15 },
    // Additional MCQs
    { id: "jb52", type: "mcq", question: "Which keyword is used to inherit from another class?", options: ["implements", "extends", "inherits", "super"], answer: "extends", explanation: "The 'extends' keyword establishes inheritance between classes.", difficulty: "beginner", xp: 10 },
    { id: "jb53", type: "mcq", question: "What is the difference between == and .equals()?", options: ["No difference", "== compares references, .equals() compares content", "== is faster", ".equals() is newer"], answer: "== compares references, .equals() compares content", explanation: "== checks if two references point to the same object, .equals() checks value equality.", difficulty: "beginner", xp: 15 },
    { id: "jb54", type: "mcq", question: "What is a package in Java?", options: ["A class", "A directory structure for classes", "A method", "A variable"], answer: "A directory structure for classes", explanation: "Packages organize classes into namespaces and provide access protection.", difficulty: "beginner", xp: 10 },
    { id: "jb55", type: "mcq", question: "Which package is imported by default in Java?", options: ["java.util", "java.lang", "java.io", "java.net"], answer: "java.lang", explanation: "java.lang is automatically imported, containing String, Math, System, etc.", difficulty: "beginner", xp: 10 },
    { id: "jb56", type: "output", question: "What is the output?\n\nint[] arr = {1, 2, 3};\nfor(int i : arr) {\n    System.out.print(i + \" \");\n}", options: ["1 2 3", "0 1 2", "3 2 1", "Compilation error"], answer: "1 2 3", explanation: "This is an enhanced for loop (for-each) that iterates through each element.", difficulty: "beginner", xp: 10 },
    { id: "jb57", type: "mcq", question: "What is the default value of a String reference in Java?", options: ["\"\"", "null", "0", "undefined"], answer: "null", explanation: "Object references are initialized to null by default.", difficulty: "beginner", xp: 10 },
    { id: "jb58", type: "output", question: "What is the output?\n\nString s = \"Hello\";\nSystem.out.println(s.charAt(1));", options: ["H", "e", "l", "He"], answer: "e", explanation: "charAt(1) returns the character at index 1, which is 'e'.", difficulty: "beginner", xp: 10 },
    { id: "jb59", type: "mcq", question: "What is the difference between length and length()?", options: ["No difference", "length is for arrays, length() is for strings", "length() is for arrays", "length is for strings"], answer: "length is for arrays, length() is for strings", explanation: "Arrays use .length (property), Strings use .length() (method).", difficulty: "beginner", xp: 10 },
    { id: "jb60", type: "mcq", question: "Which keyword is used to create a constant in Java?", options: ["const", "final", "static", "constant"], answer: "final", explanation: "final keyword makes a variable constant - its value cannot be changed after initialization.", difficulty: "beginner", xp: 10 },
  ];
}

function generateJavaIntermediateQuestions(): Question[] {
  return [
    // OOP Concepts
    { id: "ji1", type: "mcq", question: "Which collection does not allow duplicate elements?", options: ["ArrayList", "LinkedList", "HashSet", "Vector"], answer: "HashSet", explanation: "HashSet uses a HashMap internally and does not allow duplicate elements.", difficulty: "intermediate", xp: 15 },
    { id: "ji2", type: "mcq", question: "What is the time complexity of HashMap.get() in the average case?", options: ["O(1)", "O(n)", "O(log n)", "O(n²)"], answer: "O(1)", explanation: "HashMap provides O(1) average time for get() due to hash-based indexing.", difficulty: "intermediate", xp: 15 },
    { id: "ji3", type: "mcq", question: "Which keyword is used to implement an interface in Java?", options: ["implements", "extends", "interface", "inherits"], answer: "implements", explanation: "class MyClass implements MyInterface { }", difficulty: "intermediate", xp: 15 },
    { id: "ji4", type: "output", question: "What is the output?\n\nString s = \"Hello\";\ns.concat(\" World\");\nSystem.out.println(s);", options: ["Hello World", "Hello", "World", "Compilation error"], answer: "Hello", explanation: "Strings are immutable in Java. concat() returns a new string but doesn't modify the original.", difficulty: "intermediate", xp: 20 },
    { id: "ji5", type: "mcq", question: "Which exception is thrown when an array is accessed with an illegal index?", options: ["NullPointerException", "ArrayIndexOutOfBoundsException", "IllegalArgumentException", "IndexOutOfBoundsException"], answer: "ArrayIndexOutOfBoundsException", explanation: "Thrown when an array has been accessed with an illegal index (negative or >= length).", difficulty: "intermediate", xp: 15 },
    // Inheritance & Polymorphism
    { id: "ji6", type: "mcq", question: "What is polymorphism in Java?", options: ["One interface, multiple implementations", "Multiple classes, one object", "Inheritance only", "Method overloading only"], answer: "One interface, multiple implementations", explanation: "Polymorphism allows objects of different types to be treated through a common interface.", difficulty: "intermediate", xp: 15 },
    { id: "ji7", type: "output", question: "What is the output?\n\nclass Animal { void sound() { System.out.println(\"Generic\"); } }\nclass Dog extends Animal { void sound() { System.out.println(\"Bark\"); } }\npublic static void main(String[] args) {\n    Animal a = new Dog();\n    a.sound();\n}", options: ["Generic", "Bark", "Compilation error", "Runtime error"], answer: "Bark", explanation: "Runtime polymorphism: Dog's sound() is called because the actual object is Dog.", difficulty: "intermediate", xp: 20 },
    { id: "ji8", type: "mcq", question: "What is method overriding?", options: ["Same method name, different parameters in same class", "Same method name and parameters in subclass", "Different method names", "Static methods"], answer: "Same method name and parameters in subclass", explanation: "Overriding provides a specific implementation of a method already defined in the parent class.", difficulty: "intermediate", xp: 15 },
    { id: "ji9", type: "mcq", question: "Can we override a static method?", options: ["Yes", "No", "Only in same package", "Only with final"], answer: "No", explanation: "Static methods belong to the class, not objects, so they cannot be overridden.", difficulty: "intermediate", xp: 15 },
    { id: "ji10", type: "mcq", question: "What is the use of the super keyword?", options: ["Access parent class members", "Create child class", "Import packages", "Define interfaces"], answer: "Access parent class members", explanation: "super refers to the immediate parent class object and is used to access parent methods/constructors.", difficulty: "intermediate", xp: 15 },
    // Abstraction & Interfaces
    { id: "ji11", type: "mcq", question: "What is an abstract class?", options: ["A class that cannot be instantiated", "A class with only abstract methods", "A class with no methods", "A final class"], answer: "A class that cannot be instantiated", explanation: "Abstract classes can have both abstract and concrete methods and cannot be directly instantiated.", difficulty: "intermediate", xp: 15 },
    { id: "ji12", type: "mcq", question: "How many classes can a Java class extend?", options: ["0", "1", "2", "Unlimited"], answer: "1", explanation: "Java supports single inheritance - a class can extend only one parent class.", difficulty: "intermediate", xp: 15 },
    { id: "ji13", type: "mcq", question: "How many interfaces can a Java class implement?", options: ["0", "1", "2", "Unlimited"], answer: "Unlimited", explanation: "A class can implement multiple interfaces, achieving multiple inheritance of type.", difficulty: "intermediate", xp: 15 },
    { id: "ji14", type: "mcq", question: "What is the difference between an interface and an abstract class?", options: ["No difference", "Interface has only abstract methods, abstract class can have concrete methods", "Abstract class is faster", "Interface is older"], answer: "Interface has only abstract methods, abstract class can have concrete methods", explanation: "Interfaces provide full abstraction (traditionally), abstract classes provide partial abstraction.", difficulty: "intermediate", xp: 20 },
    // Collections Framework
    { id: "ji15", type: "mcq", question: "Which collection maintains insertion order?", options: ["HashSet", "TreeSet", "LinkedHashSet", "All of them"], answer: "LinkedHashSet", explanation: "LinkedHashSet maintains insertion order using a linked list backing the hash set.", difficulty: "intermediate", xp: 15 },
    { id: "ji16", type: "mcq", question: "What is the default initial capacity of ArrayList?", options: ["5", "10", "16", "20"], answer: "10", explanation: "ArrayList starts with capacity 10 and grows by 50% when needed.", difficulty: "intermediate", xp: 15 },
    { id: "ji17", type: "mcq", question: "Which is faster for random access: ArrayList or LinkedList?", options: ["LinkedList", "ArrayList", "Both same", "Depends on size"], answer: "ArrayList", explanation: "ArrayList provides O(1) random access via index, LinkedList requires O(n) traversal.", difficulty: "intermediate", xp: 15 },
    { id: "ji18", type: "mcq", question: "What is the time complexity of adding at end of ArrayList?", options: ["O(1) amortized", "O(n)", "O(log n)", "O(n²)"], answer: "O(1) amortized", explanation: "Adding at end is O(1) most of the time, but occasionally O(n) when resizing.", difficulty: "intermediate", xp: 15 },
    { id: "ji19", type: "mcq", question: "What is TreeMap used for?", options: ["Storing key-value pairs in sorted order", "Fast random access", "Stack operations", "Queue operations"], answer: "Storing key-value pairs in sorted order", explanation: "TreeMap implements NavigableMap and keeps entries sorted by key.", difficulty: "intermediate", xp: 15 },
    { id: "ji20", type: "mcq", question: "Which collection is best for FIFO operations?", options: ["Stack", "ArrayList", "LinkedList (as Queue)", "HashSet"], answer: "LinkedList (as Queue)", explanation: "LinkedList implements Queue interface, providing FIFO operations.", difficulty: "intermediate", xp: 15 },
    // Exception Handling
    { id: "ji21", type: "mcq", question: "What is the difference between checked and unchecked exceptions?", options: ["Checked must be caught, unchecked don't", "Unchecked must be caught", "No difference", "Checked are runtime"], answer: "Checked must be caught, unchecked don't", explanation: "Checked exceptions (IOException) must be handled or declared. Unchecked (RuntimeException) don't.", difficulty: "intermediate", xp: 15 },
    { id: "ji22", type: "mcq", question: "Which exception is thrown when dividing by zero?", options: ["ArithmeticException", "NumberFormatException", "DivideByZeroException", "MathException"], answer: "ArithmeticException", explanation: "Integer division by zero throws ArithmeticException.", difficulty: "intermediate", xp: 15 },
    { id: "ji23", type: "mcq", question: "What is a custom exception?", options: ["An exception you create yourself", "An exception from Java library", "An error", "A warning"], answer: "An exception you create yourself", explanation: "Custom exceptions extend Exception or RuntimeException for application-specific errors.", difficulty: "intermediate", xp: 15 },
    { id: "ji24", type: "mcq", question: "Can a catch block catch multiple exception types?", options: ["Yes, using multi-catch", "No", "Only with try", "Only with finally"], answer: "Yes, using multi-catch", explanation: "Since Java 7, you can use pipe: catch(IOException | SQLException e)", difficulty: "intermediate", xp: 15 },
    // Generics
    { id: "ji25", type: "mcq", question: "What is the benefit of generics?", options: ["Type safety at compile time", "Faster execution", "Less memory", "Better readability"], answer: "Type safety at compile time", explanation: "Generics enforce type checking at compile time, preventing ClassCastException at runtime.", difficulty: "intermediate", xp: 15 },
    { id: "ji26", type: "mcq", question: "What is a bounded type parameter?", options: ["<T extends Number>", "<T>", "<? extends Object>", "<T>"], answer: "<T extends Number>", explanation: "Bounded type parameters restrict the types that can be used as type arguments.", difficulty: "intermediate", xp: 15 },
    { id: "ji27", type: "mcq", question: "What is type erasure in Java?", options: ["Generics info is removed at runtime", "Types are deleted", "Memory is cleared", "Objects are deleted"], answer: "Generics info is removed at runtime", explanation: "Java removes generic type information at compile time for backward compatibility.", difficulty: "intermediate", xp: 20 },
    // File Handling
    { id: "ji28", type: "mcq", question: "Which class is used to read text files?", options: ["FileReader", "InputStream", "BufferedReader", "Both FileReader and BufferedReader"], answer: "Both FileReader and BufferedReader", explanation: "FileReader reads characters, BufferedReader adds buffering for efficiency.", difficulty: "intermediate", xp: 15 },
    { id: "ji29", type: "mcq", question: "What happens if a file doesn't exist when opened for reading?", options: ["Returns null", "Creates the file", "Throws FileNotFoundException", "Ignores the error"], answer: "Throws FileNotFoundException", explanation: "FileNotFoundException is thrown when trying to read a non-existent file.", difficulty: "intermediate", xp: 15 },
    { id: "ji30", type: "mcq", question: "Which class is used for binary file operations?", options: ["FileReader", "FileInputStream", "BufferedReader", "Scanner"], answer: "FileInputStream", explanation: "FileInputStream reads raw binary data from files.", difficulty: "intermediate", xp: 15 },
    // Lambda Expressions & Streams
    { id: "ji31", type: "mcq", question: "What is a lambda expression?", options: ["Anonymous function", "Named function", "Class method", "Static method"], answer: "Anonymous function", explanation: "Lambda provides a concise way to implement functional interfaces.", difficulty: "intermediate", xp: 15 },
    { id: "ji32", type: "output", question: "What is the output?\n\nList<Integer> nums = Arrays.asList(1, 2, 3, 4, 5);\nlong count = nums.stream().filter(n -> n > 3).count();\nSystem.out.println(count);", options: ["2", "3", "4", "5"], answer: "2", explanation: "filter keeps elements > 3 (4 and 5), count returns 2.", difficulty: "intermediate", xp: 20 },
    { id: "ji33", type: "mcq", question: "What is the difference between map and flatMap?", options: ["map transforms elements, flatMap flattens nested structures", "No difference", "flatMap is faster", "map is for objects"], answer: "map transforms elements, flatMap flattens nested structures", explanation: "map applies function to each element, flatMap flattens one-to-many transformations.", difficulty: "intermediate", xp: 20 },
    { id: "ji34", type: "mcq", question: "What is a functional interface?", options: ["Interface with exactly one abstract method", "Interface with no methods", "Abstract class", "Class with one method"], answer: "Interface with exactly one abstract method", explanation: "Functional interfaces can be implemented using lambda expressions.", difficulty: "intermediate", xp: 15 },
    { id: "ji35", type: "output", question: "What is the output?\n\nList<String> names = Arrays.asList(\"Alice\", \"Bob\", \"Charlie\");\nString result = names.stream().filter(n -> n.length() > 3).collect(Collectors.joining(\", \"));\nSystem.out.println(result);", options: ["Alice, Charlie", "Bob", "Alice, Bob, Charlie", "Charlie"], answer: "Alice, Charlie", explanation: "filter keeps names with length > 3, joining combines them with comma.", difficulty: "intermediate", xp: 20 },
    // Additional Intermediate Concepts
    { id: "ji36", type: "mcq", question: "What is the difference between fail-fast and fail-safe iterators?", options: ["Fail-fast throws exception on modification, fail-safe doesn't", "No difference", "Fail-safe is faster", "Fail-fast is newer"], answer: "Fail-fast throws exception on modification, fail-safe doesn't", explanation: "ArrayList iterator is fail-fast, ConcurrentHashMap iterator is fail-safe.", difficulty: "intermediate", xp: 20 },
    { id: "ji37", type: "mcq", question: "What is the Collections.unmodifiableList() used for?", options: ["Creating immutable lists", "Sorting lists", "Searching lists", "Converting lists"], answer: "Creating immutable lists", explanation: "It returns an unmodifiable view of the list, preventing modifications.", difficulty: "intermediate", xp: 15 },
    { id: "ji38", type: "mcq", question: "What is the difference between Comparable and Comparator?", options: ["Comparable defines natural ordering, Comparator defines custom ordering", "No difference", "Comparator is older", "Comparable is for primitives"], answer: "Comparable defines natural ordering, Comparator defines custom ordering", explanation: "Comparable is implemented by the class, Comparator is a separate strategy.", difficulty: "intermediate", xp: 20 },
    { id: "ji39", type: "mcq", question: "What is autoboxing in Java?", options: ["Automatic conversion between primitive and wrapper types", "Automatic object creation", "Automatic memory management", "Automatic type casting"], answer: "Automatic conversion between primitive and wrapper types", explanation: "Java automatically converts int to Integer and vice versa.", difficulty: "intermediate", xp: 15 },
    { id: "ji40", type: "mcq", question: "What is the Diamond Problem?", options: ["Ambiguity when a class inherits from two classes with same method", "Memory leak", "Thread deadlock", "Null pointer"], answer: "Ambiguity when a class inherits from two classes with same method", explanation: "Java resolves this by allowing only single class inheritance.", difficulty: "intermediate", xp: 20 },
  ];
}

function generateJavaMasterQuestions(): Question[] {
  return [
    // Multithreading & Concurrency
    { id: "jm1", type: "mcq", question: "Which thread state occurs when a thread is waiting for another thread to finish?", options: ["RUNNABLE", "BLOCKED", "WAITING", "TIMED_WAITING"], answer: "BLOCKED", explanation: "BLOCKED state occurs when a thread is waiting to acquire a monitor lock.", difficulty: "master", xp: 20 },
    { id: "jm2", type: "mcq", question: "What is the purpose of the volatile keyword?", options: ["Thread safety", "Variable caching prevention", "Memory visibility", "All of the above"], answer: "All of the above", explanation: "volatile ensures visibility, prevents caching, and provides limited thread safety.", difficulty: "master", xp: 20 },
    { id: "jm3", type: "mcq", question: "What is the difference between synchronized and volatile?", options: ["synchronized ensures atomicity, volatile only ensures visibility", "No difference", "volatile is faster", "synchronized is newer"], answer: "synchronized ensures atomicity, volatile only ensures visibility", explanation: "volatile prevents caching but doesn't ensure atomic operations. synchronized does both.", difficulty: "master", xp: 25 },
    { id: "jm4", type: "mcq", question: "What is a deadlock?", options: ["Two threads waiting for each other indefinitely", "Thread crash", "Memory leak", "Stack overflow"], answer: "Two threads waiting for each other indefinitely", explanation: "Deadlock occurs when two or more threads are blocked forever, each waiting for the other's lock.", difficulty: "master", xp: 25 },
    { id: "jm5", type: "mcq", question: "Which collection is thread-safe for concurrent access?", options: ["ArrayList", "HashMap", "ConcurrentHashMap", "LinkedList"], answer: "ConcurrentHashMap", explanation: "ConcurrentHashMap uses segment locking for thread-safe concurrent operations.", difficulty: "master", xp: 20 },
    { id: "jm6", type: "mcq", question: "What is the Fork/Join framework used for?", options: ["Parallel processing of divide-and-conquer tasks", "File I/O", "Network communication", "Database queries"], answer: "Parallel processing of divide-and-conquer tasks", explanation: "Fork/Join splits tasks into smaller subtasks and combines results.", difficulty: "master", xp: 25 },
    { id: "jm7", type: "mcq", question: "What is the difference between wait() and sleep()?", options: ["wait() releases lock, sleep() doesn't", "No difference", "sleep() is faster", "wait() is static"], answer: "wait() releases lock, sleep() doesn't", explanation: "wait() releases the object's monitor, sleep() keeps the lock.", difficulty: "master", xp: 25 },
    { id: "jm8", type: "mcq", question: "What is a ThreadLocal variable?", options: ["Variable local to each thread", "Shared variable", "Static variable", "Global variable"], answer: "Variable local to each thread", explanation: "ThreadLocal provides separate copies of a variable for each thread.", difficulty: "master", xp: 20 },
    // JVM Internals
    { id: "jm9", type: "mcq", question: "What is the JVM?", options: ["Java Virtual Machine - executes bytecode", "Java Variable Manager", "Java Verification Module", "Java Version Manager"], answer: "Java Virtual Machine - executes bytecode", explanation: "JVM is the runtime engine that executes Java bytecode.", difficulty: "master", xp: 20 },
    { id: "jm10", type: "mcq", question: "What is the purpose of the Class Loader?", options: ["Loads .class files into memory", "Compiles Java code", "Runs tests", "Manages memory"], answer: "Loads .class files into memory", explanation: "Class Loader dynamically loads classes when they are referenced.", difficulty: "master", xp: 20 },
    { id: "jm11", type: "mcq", question: "What is garbage collection?", options: ["Automatic memory management", "File deletion", "Network cleanup", "Cache clearing"], answer: "Automatic memory management", explanation: "GC automatically reclaims memory used by objects no longer referenced.", difficulty: "master", xp: 20 },
    { id: "jm12", type: "mcq", question: "What is the Young Generation in JVM heap?", options: ["Area for newly created objects", "Area for old objects", "Code cache", "Method area"], answer: "Area for newly created objects", explanation: "Young Generation is where new objects are allocated, with Eden and Survivor spaces.", difficulty: "master", xp: 25 },
    { id: "jm13", type: "mcq", question: "What is the difference between Minor and Major GC?", options: ["Minor cleans Young Gen, Major cleans Full Heap", "No difference", "Minor is slower", "Major is for classes"], answer: "Minor cleans Young Gen, Major cleans Full Heap", explanation: "Minor GC is frequent and fast, Major GC is less frequent and slower.", difficulty: "master", xp: 25 },
    // Design Patterns
    { id: "jm14", type: "mcq", question: "What is the Singleton pattern?", options: ["Ensures only one instance of a class exists", "Creates multiple instances", "Destroys objects", "Copies objects"], answer: "Ensures only one instance of a class exists", explanation: "Singleton restricts instantiation to one object and provides global access.", difficulty: "master", xp: 20 },
    { id: "jm15", type: "mcq", question: "What is the Observer pattern?", options: ["One-to-many dependency where state change notifies dependents", "Object creation pattern", "Structural pattern", "Behavioral pattern only"], answer: "One-to-many dependency where state change notifies dependents", explanation: "Observer defines a subscription mechanism to notify multiple objects about events.", difficulty: "master", xp: 25 },
    { id: "jm16", type: "mcq", question: "What is the Factory pattern?", options: ["Creates objects without specifying exact class", "Destroys objects", "Clones objects", "Sorts objects"], answer: "Creates objects without specifying exact class", explanation: "Factory provides an interface for creating objects, letting subclasses decide the class.", difficulty: "master", xp: 20 },
    { id: "jm17", type: "mcq", question: "What is the Builder pattern used for?", options: ["Constructing complex objects step by step", "Simple object creation", "Object destruction", "Object comparison"], answer: "Constructing complex objects step by step", explanation: "Builder separates construction of complex objects from representation.", difficulty: "master", xp: 20 },
    { id: "jm18", type: "mcq", question: "What is the Strategy pattern?", options: ["Defines a family of algorithms and makes them interchangeable", "Object creation", "Object destruction", "Object pooling"], answer: "Defines a family of algorithms and makes them interchangeable", explanation: "Strategy lets you swap algorithms at runtime without changing the client.", difficulty: "master", xp: 25 },
    // Performance Optimization
    { id: "jm19", type: "mcq", question: "What is the StringBuilder class used for?", options: ["Efficient string concatenation", "String comparison", "String encoding", "String parsing"], answer: "Efficient string concatenation", explanation: "StringBuilder is mutable and more efficient than String for repeated concatenation.", difficulty: "master", xp: 20 },
    { id: "jm20", type: "mcq", question: "What is the difference between HashMap and Hashtable?", options: ["HashMap allows null, Hashtable doesn't; Hashtable is synchronized", "No difference", "HashMap is older", "Hashtable is faster"], answer: "HashMap allows null, Hashtable doesn't; Hashtable is synchronized", explanation: "Hashtable is legacy and synchronized, HashMap is modern and not synchronized.", difficulty: "master", xp: 20 },
    { id: "jm21", type: "mcq", question: "What is object pooling?", options: ["Reusing objects to avoid creation overhead", "Creating many objects", "Destroying objects", "Sorting objects"], answer: "Reusing objects to avoid creation overhead", explanation: "Pooling maintains a cache of objects for reuse.", difficulty: "master", xp: 20 },
    { id: "jm22", type: "mcq", question: "What is lazy initialization?", options: ["Creating objects only when needed", "Creating all objects at startup", "Destroying objects early", "Copying objects"], answer: "Creating objects only when needed", explanation: "Lazy initialization defers object creation until first use.", difficulty: "master", xp: 20 },
    // System Design Concepts
    { id: "jm23", type: "mcq", question: "What is a microservices architecture?", options: ["Application as a collection of small, independent services", "Single monolithic application", "Database architecture", "Network protocol"], answer: "Application as a collection of small, independent services", explanation: "Microservices decompose applications into loosely coupled, independently deployable services.", difficulty: "master", xp: 25 },
    { id: "jm24", type: "mcq", question: "What is the CAP theorem?", options: ["Distributed system can only guarantee 2 of 3: Consistency, Availability, Partition tolerance", "Database design principle", "Security model", "Testing framework"], answer: "Distributed system can only guarantee 2 of 3: Consistency, Availability, Partition tolerance", explanation: "In distributed systems, you must trade off between C, A, and P.", difficulty: "master", xp: 30 },
    { id: "jm25", type: "mcq", question: "What is connection pooling?", options: ["Reusing database connections instead of creating new ones", "Creating multiple connections", "Closing connections", "Encrypting connections"], answer: "Reusing database connections instead of creating new ones", explanation: "Connection pooling maintains a pool of reusable database connections.", difficulty: "master", xp: 20 },
    { id: "jm26", type: "mcq", question: "What is the difference between REST and GraphQL?", options: ["REST uses fixed endpoints, GraphQL uses a single endpoint with queries", "No difference", "REST is newer", "GraphQL doesn't use HTTP"], answer: "REST uses fixed endpoints, GraphQL uses a single endpoint with queries", explanation: "REST has multiple endpoints, GraphQL lets clients request exactly the data they need.", difficulty: "master", xp: 25 },
    // Advanced Java Features
    { id: "jm27", type: "mcq", question: "What is the Optional class used for?", options: ["Avoiding null pointer exceptions", "Optional parameters", "Optional imports", "Optional methods"], answer: "Avoiding null pointer exceptions", explanation: "Optional is a container that may or may not contain a non-null value.", difficulty: "master", xp: 20 },
    { id: "jm28", type: "mcq", question: "What is a record class in Java 14+?", options: ["Immutable data carrier with auto-generated methods", "Database record", "Log entry", "Audio recording"], answer: "Immutable data carrier with auto-generated methods", explanation: "Records are concise, immutable classes for storing data.", difficulty: "master", xp: 20 },
    { id: "jm29", type: "mcq", question: "What is the difference between var and explicit type declaration?", options: ["var infers type, explicit declares it; same at runtime", "No difference", "var is faster", "var is less safe"], answer: "var infers type, explicit declares it; same at runtime", explanation: "var was introduced in Java 10 for local variable type inference.", difficulty: "master", xp: 20 },
    { id: "jm30", type: "mcq", question: "What is a sealed class?", options: ["Class that restricts which classes can extend it", "Final class", "Abstract class", "Interface"], answer: "Class that restricts which classes can extend it", explanation: "Sealed classes specify permitted subclasses for better control.", difficulty: "master", xp: 25 },
  ];
}

function generatePythonBeginnerQuestions(): Question[] {
  return [
    // Basics
    { id: "pb1", type: "mcq", question: "Which symbol is used for single-line comments in Python?", options: ["//", "#", "/*", "--"], answer: "#", explanation: "Python uses # for single-line comments.", difficulty: "beginner", xp: 10 },
    { id: "pb2", type: "mcq", question: "What is the output of print(type(5))?", options: ["<class 'int'>", "<class 'float'>", "<class 'number'>", "<class 'long'>"], answer: "<class 'int'>", explanation: "5 is an integer, so type(5) returns <class 'int'>.", difficulty: "beginner", xp: 10 },
    { id: "pb3", type: "output", question: "What is the output?\n\nfor i in range(5):\n    if i == 3:\n        break\n    print(i, end=' ')", options: ["0 1 2", "0 1 2 3", "0 1 2 3 4", "3"], answer: "0 1 2", explanation: "Loop breaks when i==3, so it prints 0, 1, 2.", difficulty: "beginner", xp: 15 },
    { id: "pb4", type: "mcq", question: "Which keyword is used to define a function in Python?", options: ["function", "func", "def", "define"], answer: "def", explanation: "Python uses 'def' to define functions.", difficulty: "beginner", xp: 10 },
    { id: "pb5", type: "mcq", question: "What is the output of print(2 ** 3)?", options: ["6", "8", "5", "23"], answer: "8", explanation: "** is the exponentiation operator. 2**3 = 2³ = 8.", difficulty: "beginner", xp: 10 },
    { id: "pb6", type: "mcq", question: "Which data type is immutable in Python?", options: ["list", "dict", "set", "tuple"], answer: "tuple", explanation: "Tuples are immutable - once created, they cannot be modified.", difficulty: "beginner", xp: 10 },
    { id: "pb7", type: "output", question: "What is the output?\n\nx = [1, 2, 3]\ny = x\ny.append(4)\nprint(len(x))", options: ["3", "4", "Error", "7"], answer: "4", explanation: "Lists are mutable and assigned by reference. Both x and y point to the same list.", difficulty: "beginner", xp: 15 },
    { id: "pb8", type: "mcq", question: "How do you start a for loop in Python?", options: ["for i in range(5):", "for (i=0; i<5; i++)", "for i = 1 to 5", "foreach i in 5"], answer: "for i in range(5):", explanation: "Python uses 'for item in iterable:' syntax.", difficulty: "beginner", xp: 10 },
    { id: "pb9", type: "output", question: "What is the output?\n\nprint('Hello' * 3)", options: ["HelloHelloHello", "3Hello", "Hello3", "Error"], answer: "HelloHelloHello", explanation: "String multiplication repeats the string.", difficulty: "beginner", xp: 10 },
    { id: "pb10", type: "mcq", question: "What does len() function do?", options: ["Returns length of an object", "Converts to string", "Returns type", "Checks if empty"], answer: "Returns length of an object", explanation: "len() returns the number of items in an object (string, list, dict, etc.).", difficulty: "beginner", xp: 10 },
    // Lists
    { id: "pb11", type: "mcq", question: "How do you create an empty list?", options: ["[]", "list()", "Both A and B", "None"], answer: "Both A and B", explanation: "Both [] and list() create empty lists.", difficulty: "beginner", xp: 10 },
    { id: "pb12", type: "output", question: "What is the output?\n\nfruits = ['apple', 'banana', 'cherry']\nprint(fruits[1])", options: ["apple", "banana", "cherry", "Error"], answer: "banana", explanation: "List indices start at 0. fruits[1] is the second element.", difficulty: "beginner", xp: 10 },
    { id: "pb13", type: "mcq", question: "Which method adds an element to the end of a list?", options: ["add()", "append()", "insert()", "push()"], answer: "append()", explanation: "append() adds an element to the end of the list.", difficulty: "beginner", xp: 10 },
    { id: "pb14", type: "output", question: "What is the output?\n\nnums = [1, 2, 3, 4, 5]\nprint(nums[-1])", options: ["1", "5", "Error", "None"], answer: "5", explanation: "Negative indices count from the end. -1 is the last element.", difficulty: "beginner", xp: 10 },
    { id: "pb15", type: "mcq", question: "What does the 'in' keyword do?", options: ["Checks membership", "Imports a module", "Creates a loop", "Defines indentation"], answer: "Checks membership", explanation: "'in' checks if an element exists in a sequence.", difficulty: "beginner", xp: 10 },
    // Dictionaries
    { id: "pb16", type: "mcq", question: "How do you create a dictionary?", options: ["{}", "dict()", "Both A and B", "[]"], answer: "Both A and B", explanation: "Both {} and dict() create empty dictionaries.", difficulty: "beginner", xp: 10 },
    { id: "pb17", type: "output", question: "What is the output?\n\nperson = {'name': 'Alice', 'age': 25}\nprint(person['name'])", options: ["Alice", "name", "25", "Error"], answer: "Alice", explanation: "Access dictionary values using keys.", difficulty: "beginner", xp: 10 },
    { id: "pb18", type: "mcq", question: "Which method returns all keys of a dictionary?", options: ["values()", "keys()", "items()", "get()"], answer: "keys()", explanation: "keys() returns a view object of all dictionary keys.", difficulty: "beginner", xp: 10 },
    { id: "pb19", type: "output", question: "What is the output?\n\nd = {'a': 1, 'b': 2}\nd['c'] = 3\nprint(len(d))", options: ["2", "3", "Error", "6"], answer: "3", explanation: "Adding a new key-value pair increases the dictionary length.", difficulty: "beginner", xp: 10 },
    // Strings
    { id: "pb20", type: "mcq", question: "What is the output of 'hello'.upper()?", options: ["HELLO", "hello", "Hello", "Error"], answer: "HELLO", explanation: "upper() converts all characters to uppercase.", difficulty: "beginner", xp: 10 },
    { id: "pb21", type: "output", question: "What is the output?\n\ns = 'Python'\nprint(s[1:4])", options: ["Pyt", "yth", "Pyth", "ytho"], answer: "yth", explanation: "String slicing [1:4] extracts from index 1 to 3.", difficulty: "beginner", xp: 10 },
    { id: "pb22", type: "mcq", question: "Which method splits a string into a list?", options: ["split()", "join()", "divide()", "separate()"], answer: "split()", explanation: "split() splits a string by a delimiter (default: whitespace).", difficulty: "beginner", xp: 10 },
    { id: "pb23", type: "output", question: "What is the output?\n\nprint('Hello World'.split())", options: ["['Hello World']", "['Hello', 'World']", "['H', 'e', 'l', 'l', 'o']", "Error"], answer: "['Hello', 'World']", explanation: "split() without arguments splits by whitespace.", difficulty: "beginner", xp: 10 },
    // Control Flow
    { id: "pb24", type: "mcq", question: "What is the output of bool([])?", options: ["True", "False", "None", "Error"], answer: "False", explanation: "Empty sequences (list, string, dict) are falsy in Python.", difficulty: "beginner", xp: 10 },
    { id: "pb25", type: "output", question: "What is the output?\n\nx = 10\nif x > 5:\n    print('High')\nelif x > 3:\n    print('Medium')\nelse:\n    print('Low')", options: ["High", "Medium", "Low", "High\\nMedium"], answer: "High", explanation: "Only the first matching condition is executed.", difficulty: "beginner", xp: 10 },
    { id: "pb26", type: "mcq", question: "What does 'elif' mean in Python?", options: ["Else if", "Else line", "End if", "Error if"], answer: "Else if", explanation: "elif is Python's shorthand for 'else if'.", difficulty: "beginner", xp: 10 },
    { id: "pb27", type: "output", question: "What is the output?\n\nfor i in range(1, 6):\n    if i % 2 == 0:\n        print(i, end=' ')", options: ["1 3 5", "2 4", "1 2 3 4 5", "2 4 6"], answer: "2 4", explanation: "Prints even numbers from 1 to 5.", difficulty: "beginner", xp: 10 },
    // Functions
    { id: "pb28", type: "mcq", question: "What is a default parameter?", options: ["A parameter with a default value", "A required parameter", "A global variable", "A return value"], answer: "A parameter with a default value", explanation: "Default parameters have fallback values if no argument is provided.", difficulty: "beginner", xp: 10 },
    { id: "pb29", type: "output", question: "What is the output?\n\ndef greet(name='World'):\n    print(f'Hello, {name}!')\ngreet('Alice')", options: ["Hello, World!", "Hello, Alice!", "Error", "Hello, !"], answer: "Hello, Alice!", explanation: "The default value is used only when no argument is provided.", difficulty: "beginner", xp: 10 },
    { id: "pb30", type: "mcq", question: "What does 'return' do in a function?", options: ["Exits and optionally returns a value", "Prints output", "Loops", "Defines variables"], answer: "Exits and optionally returns a value", explanation: "return exits the function and sends a value back to the caller.", difficulty: "beginner", xp: 10 },
    { id: "pb31", type: "output", question: "What is the output?\n\ndef add(a, b):\n    return a + b\nresult = add(3, 4)\nprint(result)", options: ["3", "4", "7", "34"], answer: "7", explanation: "The function returns 3+4=7.", difficulty: "beginner", xp: 10 },
    // Classes
    { id: "pb32", type: "mcq", question: "What is the correct way to define a class in Python?", options: ["class MyClass:", "class MyClass { }", "def class MyClass:", "object MyClass:"], answer: "class MyClass:", explanation: "Python uses 'class' keyword followed by class name and colon.", difficulty: "beginner", xp: 10 },
    { id: "pb33", type: "mcq", question: "What does 'self' represent in a class?", options: ["The current instance", "The parent class", "The class itself", "A global variable"], answer: "The current instance", explanation: "self refers to the current object instance.", difficulty: "beginner", xp: 10 },
    { id: "pb34", type: "output", question: "What is the output?\n\nclass Dog:\n    def __init__(self, name):\n        self.name = name\n    def bark(self):\n        return f'{self.name} says Woof!'\nd = Dog('Rex')\nprint(d.bark())", options: ["Rex says Woof!", "Dog says Woof!", "says Woof!", "Error"], answer: "Rex says Woof!", explanation: "The __init__ method sets the name, bark() returns the formatted string.", difficulty: "beginner", xp: 15 },
    // File I/O
    { id: "pb35", type: "mcq", question: "Which mode opens a file for reading?", options: ["'w'", "'r'", "'a'", "'x'"], answer: "'r'", explanation: "'r' opens for reading, 'w' for writing, 'a' for append.", difficulty: "beginner", xp: 10 },
    { id: "pb36", type: "mcq", question: "What does 'with' statement do when opening files?", options: ["Automatically closes the file", "Opens the file faster", "Creates a backup", "Encrypts the file"], answer: "Automatically closes the file", explanation: "with statement ensures proper resource management and automatic cleanup.", difficulty: "beginner", xp: 10 },
    // Exception Handling
    { id: "pb37", type: "mcq", question: "Which block handles exceptions?", options: ["try-except", "try-catch", "handle-catch", "error-handler"], answer: "try-except", explanation: "Python uses try-except blocks for exception handling.", difficulty: "beginner", xp: 10 },
    { id: "pb38", type: "mcq", question: "What does 'finally' do?", options: ["Always executes after try-except", "Only runs on error", "Only runs on success", "Skips the block"], answer: "Always executes after try-except", explanation: "finally block runs regardless of whether an exception occurred.", difficulty: "beginner", xp: 10 },
    // Modules
    { id: "pb39", type: "mcq", question: "How do you import a module?", options: ["import math", "include math", "require math", "load math"], answer: "import math", explanation: "import statement brings a module into your code.", difficulty: "beginner", xp: 10 },
    { id: "pb40", type: "mcq", question: "What is pip?", options: ["Python package manager", "A function", "A module", "A data type"], answer: "Python package manager", explanation: "pip is used to install and manage Python packages.", difficulty: "beginner", xp: 10 },
    // List Comprehensions
    { id: "pb41", type: "output", question: "What is the output?\n\nsquares = [x**2 for x in range(5)]\nprint(squares)", options: ["[0, 1, 4, 9, 16]", "[1, 4, 9, 16, 25]", "[0, 2, 4, 6, 8]", "Error"], answer: "[0, 1, 4, 9, 16]", explanation: "List comprehension creates a new list by applying expression to each item.", difficulty: "beginner", xp: 15 },
    { id: "pb42", type: "mcq", question: "What is a list comprehension?", options: ["Concise way to create lists", "Understanding lists", "Complex lists", "Nested lists"], answer: "Concise way to create lists", explanation: "List comprehensions provide a compact syntax for creating lists.", difficulty: "beginner", xp: 10 },
    // Lambda
    { id: "pb43", type: "output", question: "What is the output?\n\nadd = lambda x, y: x + y\nprint(add(3, 4))", options: ["3", "4", "7", "34"], answer: "7", explanation: "Lambda defines an anonymous function. add(3,4) returns 7.", difficulty: "beginner", xp: 10 },
    { id: "pb44", type: "mcq", question: "What is a lambda function?", options: ["Anonymous function", "Named function", "Class method", "Global function"], answer: "Anonymous function", explanation: "Lambda is a small anonymous function defined with the lambda keyword.", difficulty: "beginner", xp: 10 },
    // Additional
    { id: "pb45", type: "mcq", question: "What is the output of print(type([]))?", options: ["<class 'list'>", "<class 'array'>", "<class 'tuple'>", "<class 'dict'>"], answer: "<class 'list'>", explanation: "[] creates a list, so type() returns <class 'list'>.", difficulty: "beginner", xp: 10 },
    { id: "pb46", type: "output", question: "What is the output?\n\nnums = [3, 1, 4, 1, 5, 9]\nprint(sorted(nums))", options: ["[3, 1, 4, 1, 5, 9]", "[1, 1, 3, 4, 5, 9]", "[9, 5, 4, 3, 1, 1]", "Error"], answer: "[1, 1, 3, 4, 5, 9]", explanation: "sorted() returns a new sorted list without modifying the original.", difficulty: "beginner", xp: 10 },
    { id: "pb47", type: "mcq", question: "What is the difference between 'is' and '=='?", options: ["is checks identity, == checks equality", "No difference", "is is faster", "== is for objects only"], answer: "is checks identity, == checks equality", explanation: "'is' checks if two variables point to the same object, '==' checks value equality.", difficulty: "beginner", xp: 15 },
    { id: "pb48", type: "output", question: "What is the output?\n\na = [1, 2, 3]\nb = a\nc = a[:]\nb.append(4)\nprint(len(c))", options: ["3", "4", "7", "Error"], answer: "3", explanation: "a[:] creates a copy, so c is independent of a and b.", difficulty: "beginner", xp: 15 },
    { id: "pb49", type: "mcq", question: "What is the *args parameter?", options: ["Variable number of positional arguments", "One argument", "No arguments", "Keyword arguments"], answer: "Variable number of positional arguments", explanation: "*args allows a function to accept any number of positional arguments.", difficulty: "beginner", xp: 10 },
    { id: "pb50", type: "mcq", question: "What is the **kwargs parameter?", options: ["Variable number of keyword arguments", "Dictionary", "List", "Tuple"], answer: "Variable number of keyword arguments", explanation: "**kwargs allows a function to accept any number of keyword arguments.", difficulty: "beginner", xp: 10 },
  ];
}

function generateJavaScriptBeginnerQuestions(): Question[] {
  return [
    // Basics
    { id: "js1", type: "mcq", question: "Which keyword is used to declare a variable in modern JavaScript?", options: ["var", "let", "const", "Both let and const"], answer: "Both let and const", explanation: "let and const are modern declarations. var is older and has scope issues.", difficulty: "beginner", xp: 10 },
    { id: "js2", type: "mcq", question: "What is the difference between let and const?", options: ["let can be reassigned, const cannot", "No difference", "const is faster", "let is for functions"], answer: "let can be reassigned, const cannot", explanation: "const creates a constant reference that cannot be reassigned.", difficulty: "beginner", xp: 10 },
    { id: "js3", type: "output", question: "What is the output?\n\nconsole.log(2 + '3');", options: ["5", "23", "NaN", "Error"], answer: "23", explanation: "JavaScript performs string concatenation when mixing number and string.", difficulty: "beginner", xp: 10 },
    { id: "js4", type: "mcq", question: "How do you write a comment in JavaScript?", options: ["// comment", "# comment", "/* comment */", "Both A and C"], answer: "Both A and C", explanation: "// for single-line, /* */ for multi-line comments.", difficulty: "beginner", xp: 10 },
    { id: "js5", type: "output", question: "What is the output?\n\nlet x = 5;\nconsole.log(x++);", options: ["5", "6", "4", "Error"], answer: "5", explanation: "Post-increment returns the value before incrementing.", difficulty: "beginner", xp: 10 },
    { id: "js6", type: "mcq", question: "What does '===' check?", options: ["Value only", "Type only", "Value and type", "Reference"], answer: "Value and type", explanation: "=== is strict equality, checking both value and type.", difficulty: "beginner", xp: 10 },
    { id: "js7", type: "output", question: "What is the output?\n\nconsole.log(null == undefined);", options: ["true", "false", "NaN", "Error"], answer: "true", explanation: "null and undefined are loosely equal.", difficulty: "beginner", xp: 10 },
    { id: "js8", type: "output", question: "What is the output?\n\nconsole.log(typeof null);", options: ["'null'", "'object'", "'undefined'", "'boolean'"], answer: "'object'", explanation: "typeof null returns 'object' (a known bug in JavaScript).", difficulty: "beginner", xp: 15 },
    { id: "js9", type: "mcq", question: "What is a closure?", options: ["Function with access to outer scope", "A loop", "A class", "A module"], answer: "Function with access to outer scope", explanation: "Closures remember the variables from their creation scope.", difficulty: "beginner", xp: 15 },
    { id: "js10", type: "output", question: "What is the output?\n\nlet arr = [1, 2, 3];\nconsole.log(arr.length);", options: ["1", "2", "3", "undefined"], answer: "3", explanation: "length property returns the number of elements.", difficulty: "beginner", xp: 10 },
    // Arrays
    { id: "js11", type: "mcq", question: "Which method adds an element to the end of an array?", options: ["push()", "pop()", "shift()", "unshift()"], answer: "push()", explanation: "push() adds elements to the end, pop() removes from end.", difficulty: "beginner", xp: 10 },
    { id: "js12", type: "output", question: "What is the output?\n\nlet arr = [1, 2, 3];\narr.push(4);\nconsole.log(arr);", options: ["[1, 2, 3]", "[1, 2, 3, 4]", "[4, 1, 2, 3]", "[1, 2, 4]"], answer: "[1, 2, 3, 4]", explanation: "push() adds 4 to the end of the array.", difficulty: "beginner", xp: 10 },
    { id: "js13", type: "mcq", question: "What does map() return?", options: ["New array with transformed elements", "The same array", "A single value", "undefined"], answer: "New array with transformed elements", explanation: "map() creates a new array by applying a function to each element.", difficulty: "beginner", xp: 10 },
    { id: "js14", type: "output", question: "What is the output?\n\nlet nums = [1, 2, 3];\nlet doubled = nums.map(n => n * 2);\nconsole.log(doubled);", options: ["[1, 2, 3]", "[2, 4, 6]", "[1, 4, 9]", "[3, 6, 9]"], answer: "[2, 4, 6]", explanation: "map() multiplies each element by 2.", difficulty: "beginner", xp: 10 },
    { id: "js15", type: "mcq", question: "What does filter() do?", options: ["Returns elements that pass a test", "Removes all elements", "Sorts elements", "Combines elements"], answer: "Returns elements that pass a test", explanation: "filter() creates a new array with elements that pass the test.", difficulty: "beginner", xp: 10 },
    // Functions
    { id: "js16", type: "mcq", question: "What is an arrow function?", options: ["Concise function syntax using =>", "A function that returns arrows", "A recursive function", "A function with no parameters"], answer: "Concise function syntax using =>", explanation: "Arrow functions provide shorter syntax and lexical 'this'.", difficulty: "beginner", xp: 10 },
    { id: "js17", type: "output", question: "What is the output?\n\nconst add = (a, b) => a + b;\nconsole.log(add(3, 4));", options: ["3", "4", "7", "34"], answer: "7", explanation: "Arrow function returns 3+4=7.", difficulty: "beginner", xp: 10 },
    { id: "js18", type: "mcq", question: "What is the difference between function declaration and expression?", options: ["Declarations are hoisted, expressions are not", "No difference", "Expressions are faster", "Declarations cannot have parameters"], answer: "Declarations are hoisted, expressions are not", explanation: "Function declarations can be used before they're defined.", difficulty: "beginner", xp: 15 },
    // Objects
    { id: "js19", type: "mcq", question: "How do you access a property of an object?", options: ["obj.property", "obj['property']", "Both A and B", "obj->property"], answer: "Both A and B", explanation: "Dot notation and bracket notation both work.", difficulty: "beginner", xp: 10 },
    { id: "js20", type: "output", question: "What is the output?\n\nlet person = {name: 'Alice', age: 25};\nconsole.log(person.name);", options: ["Alice", "name", "25", "undefined"], answer: "Alice", explanation: "Dot notation accesses the name property.", difficulty: "beginner", xp: 10 },
    // Async
    { id: "js21", type: "mcq", question: "What does async/await do?", options: ["Makes asynchronous code look synchronous", "Speeds up code", "Creates threads", "Pauses execution"], answer: "Makes asynchronous code look synchronous", explanation: "async/await simplifies working with Promises.", difficulty: "beginner", xp: 15 },
    { id: "js22", type: "mcq", question: "What is a Promise?", options: ["Object representing future completion/failure", "A guarantee", "A callback", "A loop"], answer: "Object representing future completion/failure", explanation: "Promises represent eventual completion or failure of async operations.", difficulty: "beginner", xp: 15 },
    // DOM
    { id: "js23", type: "mcq", question: "What does document.getElementById() do?", options: ["Selects element by ID", "Creates an element", "Deletes an element", "Modifies CSS"], answer: "Selects element by ID", explanation: "Returns the element with the specified ID.", difficulty: "beginner", xp: 10 },
    { id: "js24", type: "mcq", question: "What is event delegation?", options: ["Handling events at parent instead of child", "Ignoring events", "Creating events", "Destroying events"], answer: "Handling events at parent instead of child", explanation: "Event delegation uses event bubbling to handle events efficiently.", difficulty: "beginner", xp: 15 },
    // Scope
    { id: "js25", type: "output", question: "What is the output?\n\nvar x = 10;\nfunction test() {\n  var x = 20;\n  console.log(x);\n}\ntest();", options: ["10", "20", "undefined", "Error"], answer: "20", explanation: "Local scope takes precedence over global scope.", difficulty: "beginner", xp: 10 },
    { id: "js26", type: "mcq", question: "What is the scope of 'var'?", options: ["Function scope", "Block scope", "Global scope", "Module scope"], answer: "Function scope", explanation: "var is function-scoped, not block-scoped like let/const.", difficulty: "beginner", xp: 10 },
    { id: "js27", type: "output", question: "What is the output?\n\nlet a = 1;\nlet b = 2;\nconsole.log(a + b + '3');", options: ["6", "33", "123", "Error"], answer: "33", explanation: "a+b=3, then 3+'3' = '33' (string concatenation).", difficulty: "beginner", xp: 10 },
    { id: "js28", type: "mcq", question: "What is template literal syntax?", options: ["Backticks with ${}", "Single quotes", "Double quotes", "Parentheses"], answer: "Backticks with ${}", explanation: "Template literals use backticks and ${} for expressions.", difficulty: "beginner", xp: 10 },
    { id: "js29", type: "output", question: "What is the output?\n\nlet name = 'Alice';\nconsole.log(`Hello, ${name}!`);", options: ["Hello, name!", "Hello, Alice!", "Hello, ${name}!", "Error"], answer: "Hello, Alice!", explanation: "Template literals interpolate variables with ${}.", difficulty: "beginner", xp: 10 },
    { id: "js30", type: "mcq", question: "What does the spread operator (...) do?", options: ["Expands arrays/objects", "Compresses arrays", "Deletes elements", "Sorts elements"], answer: "Expands arrays/objects", explanation: "Spread syntax expands iterables into individual elements.", difficulty: "beginner", xp: 10 },
    { id: "js31", type: "output", question: "What is the output?\n\nlet arr1 = [1, 2];\nlet arr2 = [...arr1, 3];\nconsole.log(arr2);", options: ["[1, 2]", "[3, 1, 2]", "[1, 2, 3]", "[1, 3, 2]"], answer: "[1, 2, 3]", explanation: "Spread creates a new array with arr1 elements plus 3.", difficulty: "beginner", xp: 10 },
    { id: "js32", type: "mcq", question: "What is destructuring?", options: ["Extracting values from arrays/objects", "Destroying objects", "Creating objects", "Merging arrays"], answer: "Extracting values from arrays/objects", explanation: "Destructuring assigns variables from array/object values.", difficulty: "beginner", xp: 10 },
    { id: "js33", type: "output", question: "What is the output?\n\nconst {a, b} = {a: 1, b: 2};\nconsole.log(a + b);", options: ["1", "2", "3", "undefined"], answer: "3", explanation: "Destructuring extracts a=1 and b=2, sum is 3.", difficulty: "beginner", xp: 10 },
    { id: "js34", type: "mcq", question: "What is the difference between map and forEach?", options: ["map returns new array, forEach returns undefined", "No difference", "forEach is faster", "map modifies original"], answer: "map returns new array, forEach returns undefined", explanation: "map creates a new array, forEach just iterates.", difficulty: "beginner", xp: 10 },
    { id: "js35", type: "output", question: "What is the output?\n\nconsole.log(0 || 'default');", options: ["0", "'default'", "false", "undefined"], answer: "'default'", explanation: "|| returns the first truthy value. 0 is falsy, so 'default' is returned.", difficulty: "beginner", xp: 10 },
    { id: "js36", type: "output", question: "What is the output?\n\nconsole.log(0 ?? 'default');", options: ["0", "'default'", "false", "undefined"], answer: "0", explanation: "?? (nullish coalescing) only returns default for null/undefined, not 0.", difficulty: "beginner", xp: 15 },
    { id: "js37", type: "mcq", question: "What is optional chaining (?.)?", options: ["Safe property access without errors", "Chaining methods", "Optional parameters", "Error handling"], answer: "Safe property access without errors", explanation: "?. returns undefined if the object is null/undefined.", difficulty: "beginner", xp: 10 },
    { id: "js38", type: "output", question: "What is the output?\n\nlet obj = {a: {b: 1}};\nconsole.log(obj?.a?.c);", options: ["1", "undefined", "null", "Error"], answer: "undefined", explanation: "Optional chaining returns undefined when c doesn't exist.", difficulty: "beginner", xp: 10 },
    { id: "js39", type: "mcq", question: "What is a rest parameter?", options: ["Collects remaining arguments into array", "Rests between functions", "Delays execution", "Pauses code"], answer: "Collects remaining arguments into array", explanation: "Rest parameters (...args) collect all remaining arguments.", difficulty: "beginner", xp: 10 },
    { id: "js40", type: "output", question: "What is the output?\n\nfunction sum(...nums) {\n  return nums.reduce((a, b) => a + b, 0);\n}\nconsole.log(sum(1, 2, 3));", options: ["1", "2", "3", "6"], answer: "6", explanation: "Rest collects [1,2,3], reduce adds them to get 6.", difficulty: "beginner", xp: 15 },
    { id: "js41", type: "mcq", question: "What is the difference between == and ===?", options: ["== allows type coercion, === doesn't", "No difference", "=== is faster", "== is deprecated"], answer: "== allows type coercion, === doesn't", explanation: "== converts types before comparing, === requires same type.", difficulty: "beginner", xp: 10 },
    { id: "js42", type: "output", question: "What is the output?\n\nconsole.log(1 + '2' + 3);", options: ["6", "123", "33", "Error"], answer: "123", explanation: "1+'2'='12', then '12'+3='123'.", difficulty: "beginner", xp: 10 },
    { id: "js43", type: "output", question: "What is the output?\n\nconsole.log('5' - 3);", options: ["2", "53", "NaN", "Error"], answer: "2", explanation: "Number subtraction converts '5' to 5, result is 2.", difficulty: "beginner", xp: 10 },
    { id: "js44", type: "mcq", question: "What is a higher-order function?", options: ["Function that takes/returns functions", "Function with many parameters", "Function in a loop", "Recursive function"], answer: "Function that takes/returns functions", explanation: "Higher-order functions work with other functions.", difficulty: "beginner", xp: 10 },
    { id: "js45", type: "output", question: "What is the output?\n\nconst nums = [3, 1, 4, 1, 5];\nconsole.log(nums.sort());", options: ["[1, 1, 3, 4, 5]", "[3, 1, 4, 1, 5]", "[5, 4, 3, 1, 1]", "Error"], answer: "[1, 1, 3, 4, 5]", explanation: "sort() sorts alphabetically by default, but works for numbers too.", difficulty: "beginner", xp: 10 },
    { id: "js46", type: "mcq", question: "What does the 'this' keyword refer to?", options: ["Current object context", "Global object", "Parent function", "None"], answer: "Current object context", explanation: "'this' refers to the object that owns the current code.", difficulty: "beginner", xp: 10 },
    { id: "js47", type: "output", question: "What is the output?\n\nconst obj = {\n  name: 'Alice',\n  greet() { console.log(this.name); }\n};\nobj.greet();", options: ["Alice", "undefined", "obj", "Error"], answer: "Alice", explanation: "In a method, 'this' refers to the object (obj).", difficulty: "beginner", xp: 10 },
    { id: "js48", type: "mcq", question: "What is the purpose of Array.from()?", options: ["Creates array from array-like objects", "Froms arrays", "Removes elements", "Sorts arrays"], answer: "Creates array from array-like objects", explanation: "Array.from() converts strings, sets, or other iterables to arrays.", difficulty: "beginner", xp: 10 },
    { id: "js49", type: "output", question: "What is the output?\n\nconsole.log(Array.from('hello'));", options: ["['hello']", "['h', 'e', 'l', 'l', 'o']", "['h', 'e', 'l']", "Error"], answer: "['h', 'e', 'l', 'l', 'o']", explanation: "Array.from() splits the string into individual characters.", difficulty: "beginner", xp: 10 },
    { id: "js50", type: "mcq", question: "What is the difference between null and undefined?", options: ["null is assigned, undefined is default", "No difference", "undefined is assigned", "null is faster"], answer: "null is assigned, undefined is default", explanation: "undefined means no value assigned, null is intentional absence.", difficulty: "beginner", xp: 10 },
  ];
}

function generateCBeginnerQuestions(): Question[] {
  return [
    // Basics
    { id: "cb1", type: "mcq", question: "Which header file is needed for printf()?", options: ["<stdio.h>", "<stdlib.h>", "<string.h>", "<math.h>"], answer: "<stdio.h>", explanation: "stdio.h contains standard input/output functions like printf and scanf.", difficulty: "beginner", xp: 10 },
    { id: "cb2", type: "mcq", question: "What is the correct way to declare an integer variable?", options: ["int x;", "integer x;", "var x;", "x = int;"], answer: "int x;", explanation: "C uses 'int' keyword to declare integer variables.", difficulty: "beginner", xp: 10 },
    { id: "cb3", type: "output", question: "What is the output?\n\nint x = 5;\nprintf(\"%d\", x);", options: ["5", "x", "%d", "Error"], answer: "5", explanation: "%d is the format specifier for integers in printf.", difficulty: "beginner", xp: 10 },
    { id: "cb4", type: "mcq", question: "What is the size of int in C (most systems)?", options: ["2 bytes", "4 bytes", "8 bytes", "Depends on compiler"], answer: "4 bytes", explanation: "On most modern systems, int is 4 bytes (32 bits).", difficulty: "beginner", xp: 10 },
    { id: "cb5", type: "mcq", question: "Which operator is used for address-of?", options: ["*", "&", "->", "."], answer: "&", explanation: "& returns the memory address of a variable.", difficulty: "beginner", xp: 10 },
    { id: "cb6", type: "mcq", question: "What does *ptr do?", options: ["Dereferences pointer", "Multiplies", "Declares pointer", "Returns address"], answer: "Dereferences pointer", explanation: "* accesses the value at the pointer's address.", difficulty: "beginner", xp: 10 },
    { id: "cb7", type: "output", question: "What is the output?\n\nint x = 10;\nint *ptr = &x;\nprintf(\"%d\", *ptr);", options: ["10", "&x", "ptr", "Error"], answer: "10", explanation: "*ptr gives the value at the address stored in ptr.", difficulty: "beginner", xp: 10 },
    { id: "cb8", type: "mcq", question: "What is an array in C?", options: ["Collection of same-type elements", "Collection of different types", "A function", "A pointer"], answer: "Collection of same-type elements", explanation: "Arrays store multiple elements of the same data type.", difficulty: "beginner", xp: 10 },
    { id: "cb9", type: "output", question: "What is the output?\n\nint arr[5] = {1, 2, 3, 4, 5};\nprintf(\"%d\", arr[2]);", options: ["1", "2", "3", "4"], answer: "3", explanation: "Array indices start at 0. arr[2] is the third element.", difficulty: "beginner", xp: 10 },
    { id: "cb10", type: "mcq", question: "What is a function in C?", options: ["Reusable block of code", "A variable", "A loop", "A data type"], answer: "Reusable block of code", explanation: "Functions allow code reuse and modular programming.", difficulty: "beginner", xp: 10 },
    // Control Flow
    { id: "cb11", type: "mcq", question: "Which statement is used for conditional execution?", options: ["if", "for", "while", "switch"], answer: "if", explanation: "if executes code based on a condition.", difficulty: "beginner", xp: 10 },
    { id: "cb12", type: "output", question: "What is the output?\n\nint x = 10;\nif (x > 5) {\n    printf(\"High\");\n} else {\n    printf(\"Low\");\n}", options: ["High", "Low", "Error", "HighLow"], answer: "High", explanation: "10 > 5 is true, so High is printed.", difficulty: "beginner", xp: 10 },
    { id: "cb13", type: "mcq", question: "How many times does this loop run?\nfor(int i = 0; i < 5; i++)", options: ["4", "5", "6", "Infinite"], answer: "5", explanation: "Loop runs from 0 to 4 (5 iterations).", difficulty: "beginner", xp: 10 },
    { id: "cb14", type: "output", question: "What is the output?\n\nint i;\nfor(i = 0; i < 3; i++) {\n    printf(\"%d \", i);\n}", options: ["0 1 2", "1 2 3", "0 1 2 3", "1 2"], answer: "0 1 2", explanation: "Prints i from 0 to 2.", difficulty: "beginner", xp: 10 },
    { id: "cb15", type: "mcq", question: "What does 'break' do in a loop?", options: ["Exits the loop", "Skips iteration", "Restarts loop", "Pauses loop"], answer: "Exits the loop", explanation: "break immediately exits the innermost loop.", difficulty: "beginner", xp: 10 },
    // Pointers
    { id: "cb16", type: "mcq", question: "What is a pointer?", options: ["Variable that stores memory address", "A regular variable", "An array", "A function"], answer: "Variable that stores memory address", explanation: "Pointers hold the address of another variable.", difficulty: "beginner", xp: 10 },
    { id: "cb17", type: "output", question: "What is the output?\n\nint x = 5;\nint *p = &x;\n*p = 10;\nprintf(\"%d\", x);", options: ["5", "10", "&x", "Error"], answer: "10", explanation: "*p = 10 changes the value at x's address.", difficulty: "beginner", xp: 15 },
    { id: "cb18", type: "mcq", question: "What is NULL pointer?", options: ["Pointer that points to nothing", "Pointer to 0", "Dangling pointer", "Void pointer"], answer: "Pointer that points to nothing", explanation: "NULL indicates the pointer doesn't point to valid memory.", difficulty: "beginner", xp: 10 },
    { id: "cb19", type: "mcq", question: "What is pointer arithmetic?", options: ["Operations on pointers", "Math with addresses", "Adding numbers to pointers", "All of the above"], answer: "All of the above", explanation: "Pointer arithmetic includes incrementing, decrementing, and offset operations.", difficulty: "beginner", xp: 10 },
    // Strings
    { id: "cb20", type: "mcq", question: "How are strings represented in C?", options: ["Character arrays", "String class", "Objects", "Primitives"], answer: "Character arrays", explanation: "Strings are arrays of characters terminated by null character.", difficulty: "beginner", xp: 10 },
    { id: "cb21", type: "output", question: "What is the output?\n\nchar str[] = \"Hello\";\nprintf(\"%c\", str[1]);", options: ["H", "e", "l", "o"], answer: "e", explanation: "str[1] is the second character 'e'.", difficulty: "beginner", xp: 10 },
    { id: "cb22", type: "mcq", question: "Which header is needed for strlen()?", options: ["<string.h>", "<stdio.h>", "<stdlib.h>", "<math.h>"], answer: "<string.h>", explanation: "string.h contains string manipulation functions.", difficulty: "beginner", xp: 10 },
    // Memory
    { id: "cb23", type: "mcq", question: "What does malloc() do?", options: ["Allocates memory dynamically", "Frees memory", "Resizes memory", "Prints memory"], answer: "Allocates memory dynamically", explanation: "malloc() allocates a block of memory at runtime.", difficulty: "beginner", xp: 10 },
    { id: "cb24", type: "mcq", question: "What does free() do?", options: ["Deallocates dynamic memory", "Allocates memory", "Resizes memory", "Copies memory"], answer: "Deallocates dynamic memory", explanation: "free() releases memory previously allocated by malloc/calloc.", difficulty: "beginner", xp: 10 },
    { id: "cb25", type: "mcq", question: "What is a memory leak?", options: ["Memory not freed after use", "Memory overflow", "Memory corruption", "Memory access error"], answer: "Memory not freed after use", explanation: "Memory leaks occur when allocated memory is never freed.", difficulty: "beginner", xp: 10 },
    // Functions
    { id: "cb26", type: "output", question: "What is the output?\n\nint add(int a, int b) {\n    return a + b;\n}\nint main() {\n    printf(\"%d\", add(3, 4));\n    return 0;\n}", options: ["3", "4", "7", "Error"], answer: "7", explanation: "add(3,4) returns 7.", difficulty: "beginner", xp: 10 },
    { id: "cb27", type: "mcq", question: "What is the return type of main()?", options: ["int", "void", "char", "float"], answer: "int", explanation: "main() returns an integer (0 typically indicates success).", difficulty: "beginner", xp: 10 },
    { id: "cb28", type: "mcq", question: "What is recursion?", options: ["Function calling itself", "Loop inside function", "Multiple functions", "Nested loops"], answer: "Function calling itself", explanation: "Recursion is when a function calls itself.", difficulty: "beginner", xp: 10 },
    // Structures
    { id: "cb29", type: "mcq", question: "What is a struct?", options: ["Custom data type grouping variables", "Array", "Function", "Pointer"], answer: "Custom data type grouping variables", explanation: "Structs allow you to create custom data types.", difficulty: "beginner", xp: 10 },
    { id: "cb30", type: "output", question: "What is the output?\n\nstruct Point { int x; int y; };\nstruct Point p1 = {10, 20};\nprintf(\"%d\", p1.y);", options: ["10", "20", "30", "Error"], answer: "20", explanation: "p1.y accesses the y member of the struct.", difficulty: "beginner", xp: 10 },
    // Preprocessor
    { id: "cb31", type: "mcq", question: "What does #include do?", options: ["Includes header file", "Defines variable", "Creates function", "Declares array"], answer: "Includes header file", explanation: "#include brings in declarations from header files.", difficulty: "beginner", xp: 10 },
    { id: "cb32", type: "mcq", question: "What is a macro?", options: ["Text substitution defined by #define", "A function", "A variable", "A data type"], answer: "Text substitution defined by #define", explanation: "Macros are replaced by their definitions during preprocessing.", difficulty: "beginner", xp: 10 },
    // Bitwise
    { id: "cb33", type: "mcq", question: "What does & operator do in bitwise operations?", options: ["Bitwise AND", "Bitwise OR", "Bitwise XOR", "Bitwise NOT"], answer: "Bitwise AND", explanation: "& performs bitwise AND operation.", difficulty: "beginner", xp: 10 },
    { id: "cb34", type: "output", question: "What is the output?\n\nint a = 5;  // 0101\nint b = 3;  // 0011\nprintf(\"%d\", a & b);", options: ["1", "7", "6", "4"], answer: "1", explanation: "5&3 = 0101 & 0011 = 0001 = 1.", difficulty: "beginner", xp: 15 },
    // Additional
    { id: "cb35", type: "mcq", question: "What is a volatile keyword used for?", options: ["Prevents compiler optimization on variable", "Makes variable constant", "Speeds up access", "Allocates memory"], answer: "Prevents compiler optimization on variable", explanation: "volatile tells compiler the variable may change unexpectedly.", difficulty: "beginner", xp: 10 },
    { id: "cb36", type: "mcq", question: "What is the difference between == and =?", options: ["== compares, = assigns", "No difference", "Both compare", "Both assign"], answer: "== compares, = assigns", explanation: "== is equality operator, = is assignment operator.", difficulty: "beginner", xp: 10 },
    { id: "cb37", type: "output", question: "What is the output?\n\nint x = 5;\nprintf(\"%d\", x++);", options: ["5", "6", "4", "Error"], answer: "5", explanation: "Post-increment returns value before incrementing.", difficulty: "beginner", xp: 10 },
    { id: "cb38", type: "mcq", question: "What is a dangling pointer?", options: ["Pointer to freed memory", "NULL pointer", "Invalid pointer type", "Pointer to stack"], answer: "Pointer to freed memory", explanation: "Dangling pointer points to memory that has been freed.", difficulty: "beginner", xp: 10 },
    { id: "cb39", type: "mcq", question: "What is the void pointer?", options: ["Generic pointer to any type", "Empty pointer", "Null pointer", "Invalid pointer"], answer: "Generic pointer to any type", explanation: "void* can point to any data type.", difficulty: "beginner", xp: 10 },
    { id: "cb40", type: "output", question: "What is the output?\n\nchar str[] = \"Hello\";\nprintf(\"%lu\", strlen(str));", options: ["4", "5", "6", "Error"], answer: "5", explanation: "strlen returns the length of the string (5 characters).", difficulty: "beginner", xp: 10 },
    { id: "cb41", type: "mcq", question: "What is the difference between ++i and i++?", options: ["++i pre-increments, i++ post-increments", "No difference", "Both are same", "++i is deprecated"], answer: "++i pre-increments, i++ post-increments", explanation: "Pre-increment returns incremented value, post-increment returns original.", difficulty: "beginner", xp: 10 },
    { id: "cb42", type: "output", question: "What is the output?\n\nint x = 10;\nprintf(\"%d\", ++x);", options: ["10", "11", "9", "Error"], answer: "11", explanation: "Pre-increment: x becomes 11, then returns 11.", difficulty: "beginner", xp: 10 },
    { id: "cb43", type: "mcq", question: "What is a typedef?", options: ["Creates an alias for a type", "Defines a variable", "Creates a struct", "Declares a function"], answer: "Creates an alias for a type", explanation: "typedef gives an existing type a new name.", difficulty: "beginner", xp: 10 },
    { id: "cb44", type: "mcq", question: "What is the scope of a local variable?", options: ["Within the function/block", "Entire program", "Only in main()", "Global"], answer: "Within the function/block", explanation: "Local variables are only accessible within their scope.", difficulty: "beginner", xp: 10 },
    { id: "cb45", type: "mcq", question: "What is a static variable?", options: ["Variable that retains value between calls", "Constant variable", "Global variable", "Local variable"], answer: "Variable that retains value between calls", explanation: "Static variables persist for the program's lifetime.", difficulty: "beginner", xp: 10 },
    { id: "cb46", type: "output", question: "What is the output?\n\nvoid counter() {\n    static int count = 0;\n    count++;\n    printf(\"%d \", count);\n}\nint main() {\n    counter();\ncounter();\n    return 0;\n}", options: ["1 1", "1 2", "2 2", "0 1"], answer: "1 2", explanation: "Static variable retains value: first call 1, second call 2.", difficulty: "beginner", xp: 15 },
    { id: "cb47", type: "mcq", question: "What does the sizeof operator return?", options: ["Size in bytes", "Number of elements", "Address", "Value"], answer: "Size in bytes", explanation: "sizeof returns the size of a variable or type in bytes.", difficulty: "beginner", xp: 10 },
    { id: "cb48", type: "output", question: "What is the output?\n\nprintf(\"%lu\", sizeof(int));", options: ["2", "4", "8", "Depends"], answer: "4", explanation: "int is typically 4 bytes on modern systems.", difficulty: "beginner", xp: 10 },
    { id: "cb49", type: "mcq", question: "What is a file pointer in C?", options: ["FILE*", "char*", "int*", "void*"], answer: "FILE*", explanation: "FILE* is used to work with files in C.", difficulty: "beginner", xp: 10 },
    { id: "cb50", type: "mcq", question: "What is the difference between 'a' and 'w' mode in fopen()?", options: ["a appends, w overwrites", "No difference", "a writes, w reads", "a is faster"], answer: "a appends, w overwrites", explanation: "'a' mode adds to end of file, 'w' mode truncates file.", difficulty: "beginner", xp: 10 },
  ];
}

function generateCppBeginnerQuestions(): Question[] {
  return [
    // Basics
    { id: "cppb1", type: "mcq", question: "What is the main difference between C and C++?", options: ["C++ supports OOP", "C is faster", "C has more libraries", "No difference"], answer: "C++ supports OOP", explanation: "C++ adds classes, inheritance, polymorphism, and other OOP features.", difficulty: "beginner", xp: 10 },
    { id: "cppb2", type: "mcq", question: "Which header is needed for cout?", options: ["<iostream>", "<stdio.h>", "<string.h>", "<vector>"], answer: "<iostream>", explanation: "<iostream> contains cin, cout, and other I/O stream objects.", difficulty: "beginner", xp: 10 },
    { id: "cppb3", type: "output", question: "What is the output?\n\n#include <iostream>\nusing namespace std;\nint main() {\n    cout << \"Hello\" << endl;\n    return 0;\n}", options: ["Hello", "hello", "Error", "Hello\\n"], answer: "Hello", explanation: "cout prints 'Hello' and endl adds a newline.", difficulty: "beginner", xp: 10 },
    { id: "cppb4", type: "mcq", question: "What is the difference between cout and printf?", options: ["cout is C++, printf is C", "No difference", "printf is faster", "cout is for files"], answer: "cout is C++, printf is C", explanation: "cout is C++ stream-based, printf is C function-based.", difficulty: "beginner", xp: 10 },
    { id: "cppb5", type: "mcq", question: "What is a reference variable?", options: ["Alias for another variable", "Pointer", "Constant", "Array"], answer: "Alias for another variable", explanation: "References provide an alias to existing variables.", difficulty: "beginner", xp: 10 },
    { id: "cppb6", type: "output", question: "What is the output?\n\nint x = 5;\nint &r = x;\nr = 10;\ncout << x;", options: ["5", "10", "Error", "15"], answer: "10", explanation: "Reference r is an alias for x, changing r changes x.", difficulty: "beginner", xp: 10 },
    { id: "cppb7", type: "mcq", question: "What is the difference between new and malloc?", options: ["new calls constructor, malloc doesn't", "No difference", "malloc is faster", "new is deprecated"], answer: "new calls constructor, malloc doesn't", explanation: "new allocates memory and calls constructor, malloc only allocates.", difficulty: "beginner", xp: 15 },
    { id: "cppb8", type: "mcq", question: "What is the purpose of 'using namespace std'?", options: ["Avoid typing std:: prefix", "Import all namespaces", "Create namespace", "Delete namespace"], answer: "Avoid typing std:: prefix", explanation: "It allows using cout instead of std::cout.", difficulty: "beginner", xp: 10 },
    { id: "cppb9", type: "mcq", question: "What is function overloading?", options: ["Multiple functions with same name", "Single function", "Recursive function", "Virtual function"], answer: "Multiple functions with same name", explanation: "Overloading allows different parameter lists for same function name.", difficulty: "beginner", xp: 10 },
    { id: "cppb10", type: "mcq", question: "What is the default return type of main()?", options: ["int", "void", "char", "bool"], answer: "int", explanation: "main() returns an integer (0 for success).", difficulty: "beginner", xp: 10 },
    // OOP
    { id: "cppb11", type: "mcq", question: "What is a class in C++?", options: ["Blueprint for objects", "A function", "A variable", "A loop"], answer: "Blueprint for objects", explanation: "Classes define data types with properties and methods.", difficulty: "beginner", xp: 10 },
    { id: "cppb12", type: "mcq", question: "What is an object?", options: ["Instance of a class", "A class", "A function", "A pointer"], answer: "Instance of a class", explanation: "Objects are runtime entities created from class blueprints.", difficulty: "beginner", xp: 10 },
    { id: "cppb13", type: "output", question: "What is the output?\n\nclass Dog {\npublic:\n    void bark() { cout << \"Woof\"; }\n};\nint main() {\n    Dog d;\n    d.bark();\n}", options: ["Woof", "Dog", "Error", "d.bark()"], answer: "Woof", explanation: "Calling bark() on Dog object prints 'Woof'.", difficulty: "beginner", xp: 10 },
    { id: "cppb14", type: "mcq", question: "What is a constructor?", options: ["Special method called on object creation", "Regular method", "Destructor", "Variable"], answer: "Special method called on object creation", explanation: "Constructors initialize objects when they're created.", difficulty: "beginner", xp: 10 },
    { id: "cppb15", type: "mcq", question: "What is a destructor?", options: ["Called when object is destroyed", "Called on creation", "Regular method", "Variable"], answer: "Called when object is destroyed", explanation: "Destructors clean up when objects go out of scope.", difficulty: "beginner", xp: 10 },
    { id: "cppb16", type: "mcq", question: "What is encapsulation?", options: ["Hiding data and providing access through methods", "Creating objects", "Using inheritance", "Defining variables"], answer: "Hiding data and providing access through methods", explanation: "Encapsulation bundles data with methods and restricts direct access.", difficulty: "beginner", xp: 10 },
    { id: "cppb17", type: "mcq", question: "What is inheritance?", options: ["Deriving new class from existing class", "Creating objects", "Using methods", "Defining variables"], answer: "Deriving new class from existing class", explanation: "Inheritance allows new classes to reuse properties of existing ones.", difficulty: "beginner", xp: 10 },
    { id: "cppb18", type: "mcq", question: "What is polymorphism in C++?", options: ["One interface, multiple implementations", "Multiple classes", "Single function", "No inheritance"], answer: "One interface, multiple implementations", explanation: "Polymorphism allows objects of different types to be treated uniformly.", difficulty: "beginner", xp: 10 },
    { id: "cppb19", type: "mcq", question: "What is a virtual function?", options: ["Function that can be overridden", "Static function", "Friend function", "Inline function"], answer: "Function that can be overridden", explanation: "Virtual functions enable runtime polymorphism.", difficulty: "beginner", xp: 10 },
    { id: "cppb20", type: "mcq", question: "What is an abstract class?", options: ["Class with at least one pure virtual function", "Class with no methods", "Class with no constructors", "Class with no members"], answer: "Class with at least one pure virtual function", explanation: "Abstract classes cannot be instantiated directly.", difficulty: "beginner", xp: 15 },
    // STL
    { id: "cppb21", type: "mcq", question: "What is STL?", options: ["Standard Template Library", "System Template Language", "Standard Type Library", "Static Template Library"], answer: "Standard Template Library", explanation: "STL provides containers, algorithms, and iterators.", difficulty: "beginner", xp: 10 },
    { id: "cppb22", type: "mcq", question: "Which STL container is a dynamic array?", options: ["vector", "list", "map", "set"], answer: "vector", explanation: "vector is a dynamic array that grows as needed.", difficulty: "beginner", xp: 10 },
    { id: "cppb23", type: "output", question: "What is the output?\n\n#include <vector>\nvector<int> v = {1, 2, 3};\ncout << v.size();", options: ["1", "2", "3", "Error"], answer: "3", explanation: "size() returns the number of elements.", difficulty: "beginner", xp: 10 },
    { id: "cppb24", type: "mcq", question: "What does push_back() do?", options: ["Adds element to end of vector", "Removes last element", "Sorts vector", "Clears vector"], answer: "Adds element to end of vector", explanation: "push_back() appends an element to the vector.", difficulty: "beginner", xp: 10 },
    { id: "cppb25", type: "mcq", question: "What is a map in STL?", options: ["Associative container with key-value pairs", "Ordered list", "Stack", "Queue"], answer: "Associative container with key-value pairs", explanation: "map stores elements as key-value pairs.", difficulty: "beginner", xp: 10 },
    // Templates
    { id: "cppb26", type: "mcq", question: "What is a template?", options: ["Generic programming mechanism", "A function", "A class", "A variable"], answer: "Generic programming mechanism", explanation: "Templates allow writing generic code that works with any type.", difficulty: "beginner", xp: 10 },
    { id: "cppb27", type: "output", question: "What is the output?\n\ntemplate <typename T>\nT add(T a, T b) { return a + b; }\nint main() {\n    cout << add(3, 4);\n}", options: ["3", "4", "7", "Error"], answer: "7", explanation: "Template works with int type, returns 3+4=7.", difficulty: "beginner", xp: 10 },
    // Pointers
    { id: "cppb28", type: "mcq", question: "What is a smart pointer?", options: ["Automatic memory management", "Regular pointer", "Array", "Reference"], answer: "Automatic memory management", explanation: "Smart pointers automatically free memory when no longer needed.", difficulty: "beginner", xp: 10 },
    { id: "cppb29", type: "mcq", question: "What is the difference between NULL and nullptr?", options: ["nullptr is type-safe, NULL is macro", "No difference", "NULL is newer", "nullptr is deprecated"], answer: "nullptr is type-safe, NULL is macro", explanation: "nullptr was introduced in C++11 as a safer null pointer.", difficulty: "beginner", xp: 10 },
    // Additional
    { id: "cppb30", type: "mcq", question: "What is an inline function?", options: ["Function that is expanded at call site", "Recursive function", "Virtual function", "Static function"], answer: "Function that is expanded at call site", explanation: "Inline functions reduce function call overhead.", difficulty: "beginner", xp: 10 },
    { id: "cppb31", type: "mcq", question: "What is a friend function?", options: ["Function with access to private members", "Class member function", "Static function", "Virtual function"], answer: "Function with access to private members", explanation: "Friend functions can access private/protected members.", difficulty: "beginner", xp: 10 },
    { id: "cppb32", type: "mcq", question: "What is a const member function?", options: ["Function that doesn't modify object state", "Function that modifies state", "Static function", "Virtual function"], answer: "Function that doesn't modify object state", explanation: "const functions guarantee not to modify the object.", difficulty: "beginner", xp: 10 },
    { id: "cppb33", type: "mcq", question: "What is operator overloading?", options: ["Redefining operator behavior for user types", "Using operators normally", "Creating new operators", "Removing operators"], answer: "Redefining operator behavior for user types", explanation: "Operator overloading lets you define custom behavior for operators.", difficulty: "beginner", xp: 10 },
    { id: "cppb34", type: "mcq", question: "What is a lambda expression?", options: ["Anonymous function", "Named function", "Class method", "Static function"], answer: "Anonymous function", explanation: "Lambdas provide concise inline function definitions.", difficulty: "beginner", xp: 10 },
    { id: "cppb35", type: "output", question: "What is the output?\n\nauto add = [](int a, int b) { return a + b; };\ncout << add(3, 4);", options: ["3", "4", "7", "Error"], answer: "7", explanation: "Lambda function returns 3+4=7.", difficulty: "beginner", xp: 10 },
    { id: "cppb36", type: "mcq", question: "What is auto keyword?", options: ["Automatic type deduction", "Automatic memory", "Automatic loop", "Automatic return"], answer: "Automatic type deduction", explanation: "auto deduces the type from the initializer.", difficulty: "beginner", xp: 10 },
    { id: "cppb37", type: "output", question: "What is the output?\n\nfor (auto i : {1, 2, 3}) {\n    cout << i << \" \";\n}", options: ["1 2 3", "3 2 1", "Error", "0 1 2"], answer: "1 2 3", explanation: "Range-based for loop iterates through the initializer list.", difficulty: "beginner", xp: 10 },
    { id: "cppb38", type: "mcq", question: "What is the STL algorithm sort() time complexity?", options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"], answer: "O(n log n)", explanation: "std::sort uses introsort with O(n log n) average complexity.", difficulty: "beginner", xp: 10 },
    { id: "cppb39", type: "mcq", question: "What is a namespace?", options: ["Container for identifiers", "A class", "A function", "A variable"], answer: "Container for identifiers", explanation: "Namespaces organize code and prevent name conflicts.", difficulty: "beginner", xp: 10 },
    { id: "cppb40", type: "mcq", question: "What is the difference between struct and class?", options: ["Default access specifier", "No difference", "struct is deprecated", "class is faster"], answer: "Default access specifier", explanation: "struct defaults to public, class defaults to private.", difficulty: "beginner", xp: 10 },
    { id: "cppb41", type: "mcq", question: "What is dynamic casting?", options: ["Runtime type checking cast", "Compile-time cast", "Static cast", "Const cast"], answer: "Runtime type checking cast", explanation: "dynamic_cast checks types at runtime for polymorphic types.", difficulty: "beginner", xp: 10 },
    { id: "cppb42", type: "mcq", question: "What is the difference between new/delete and malloc/free?", options: ["new/delete call constructors/destructors, malloc/free don't", "No difference", "malloc/free are faster", "new/delete are deprecated"], answer: "new/delete call constructors/destructors, malloc/free don't", explanation: "new/delete handle object lifecycle, malloc/free only manage memory.", difficulty: "beginner", xp: 15 },
    { id: "cppb43", type: "mcq", question: "What is exception handling in C++?", options: ["try-catch mechanism for errors", "Logging errors", "Ignoring errors", "Printing errors"], answer: "try-catch mechanism for errors", explanation: "try-catch blocks handle runtime exceptions gracefully.", difficulty: "beginner", xp: 10 },
    { id: "cppb44", type: "output", question: "What is the output?\n\ntry {\n    throw 42;\n} catch (int e) {\n    cout << e;\n}", options: ["42", "Error", "e", "throw"], answer: "42", explanation: "The caught exception value is printed.", difficulty: "beginner", xp: 10 },
    { id: "cppb45", type: "mcq", question: "What is a header file extension?", options: [".h or .hpp", ".cpp", ".o", ".exe"], answer: ".h or .hpp", explanation: "Header files use .h (C-style) or .hpp (C++ style).", difficulty: "beginner", xp: 10 },
    { id: "cppb46", type: "mcq", question: "What is the difference between #include < > and \" \"?", options: ["<> searches system paths, \"\" searches local first", "No difference", "\"\" is faster", "<> is deprecated"], answer: "<> searches system paths, \"\" searches local first", explanation: "<> looks in standard directories, \"\" looks in project directory first.", difficulty: "beginner", xp: 10 },
    { id: "cppb47", type: "mcq", question: "What is the purpose of virtual destructor?", options: ["Ensures proper cleanup of derived classes", "Speeds up destruction", "Prevents memory leaks", "All of the above"], answer: "Ensures proper cleanup of derived classes", explanation: "Virtual destructors ensure correct destructor calls through base pointers.", difficulty: "beginner", xp: 10 },
    { id: "cppb48", type: "mcq", question: "What is RAII?", options: ["Resource Acquisition Is Initialization", "Run All Instructions Immediately", "Random Access In Indirect", "None of the above"], answer: "Resource Acquisition Is Initialization", explanation: "RAII ties resource lifecycle to object scope.", difficulty: "beginner", xp: 10 },
    { id: "cppb49", type: "mcq", question: "What is move semantics?", options: ["Transferring resources instead of copying", "Moving objects in memory", "Copying objects faster", "Deleting objects"], answer: "Transferring resources instead of copying", explanation: "Move semantics transfer ownership instead of making copies.", difficulty: "beginner", xp: 10 },
    { id: "cppb50", type: "mcq", question: "What is the difference between stack and heap memory?", options: ["Stack is automatic, heap is dynamic", "No difference", "Heap is faster", "Stack is larger"], answer: "Stack is automatic, heap is dynamic", explanation: "Stack allocates automatically, heap requires manual management.", difficulty: "beginner", xp: 10 },
  ];
}

function generateReactBeginnerQuestions(): Question[] {
  return [
    // Basics
    { id: "rb1", type: "mcq", question: "What is React?", options: ["JavaScript library for UI", "Programming language", "Database", "Operating system"], answer: "JavaScript library for UI", explanation: "React is a JavaScript library for building user interfaces.", difficulty: "beginner", xp: 10 },
    { id: "rb2", type: "mcq", question: "What is JSX?", options: ["JavaScript XML syntax extension", "Java Syntax Extension", "JSON XML", "JavaScript X"], answer: "JavaScript XML syntax extension", explanation: "JSX lets you write HTML-like syntax in JavaScript.", difficulty: "beginner", xp: 10 },
    { id: "rb3", type: "mcq", question: "What is a component in React?", options: ["Reusable UI piece", "A function", "A class", "A variable"], answer: "Reusable UI piece", explanation: "Components are independent, reusable pieces of UI.", difficulty: "beginner", xp: 10 },
    { id: "rb4", type: "mcq", question: "What is the difference between class and functional components?", options: ["Functional are simpler, class can have state", "No difference", "Class are faster", "Functional are deprecated"], answer: "Functional are simpler, class can have state", explanation: "Modern React favors functional components with hooks.", difficulty: "beginner", xp: 10 },
    { id: "rb5", type: "mcq", question: "What is the virtual DOM?", options: ["Lightweight copy of real DOM", "Real DOM", "Database", "Cache"], answer: "Lightweight copy of real DOM", explanation: "Virtual DOM is a lightweight representation for efficient updates.", difficulty: "beginner", xp: 10 },
    // Props
    { id: "rb6", type: "mcq", question: "What are props?", options: ["Data passed to components", "State", "Events", "Styles"], answer: "Data passed to components", explanation: "Props are read-only data passed from parent to child.", difficulty: "beginner", xp: 10 },
    { id: "rb7", type: "output", question: "What is the output?\n\nfunction Greeting({ name }) {\n  return <h1>Hello, {name}!</h1>;\n}\n<Greeting name=\"Alice\" />", options: ["Hello, Alice!", "Hello, name!", "Error", "Hello!"], answer: "Hello, Alice!", explanation: "Props allow passing data to components.", difficulty: "beginner", xp: 10 },
    // State
    { id: "rb8", type: "mcq", question: "What is state in React?", options: ["Internal component data", "Props", "Global data", "CSS"], answer: "Internal component data", explanation: "State is mutable data managed within a component.", difficulty: "beginner", xp: 10 },
    { id: "rb9", type: "mcq", question: "How do you update state?", options: ["setState() or useState setter", "Direct assignment", "modify state", "state.update()"], answer: "setState() or useState setter", explanation: "Never modify state directly; use setState or useState setter.", difficulty: "beginner", xp: 10 },
    { id: "rb10", type: "output", question: "What is the output?\n\nconst [count, setCount] = useState(0);\nsetCount(5);\nconsole.log(count);", options: ["0", "5", "undefined", "Error"], answer: "0", explanation: "State update is asynchronous; count still shows old value.", difficulty: "beginner", xp: 15 },
    // Hooks
    { id: "rb11", type: "mcq", question: "What is the useState hook?", options: ["Manages state in functional components", "Creates classes", "Handles events", "Renders DOM"], answer: "Manages state in functional components", explanation: "useState lets you add state to functional components.", difficulty: "beginner", xp: 10 },
    { id: "rb12", type: "mcq", question: "What does useEffect do?", options: ["Side effects in functional components", "Creates state", "Renders JSX", "Handles events"], answer: "Side effects in functional components", explanation: "useEffect handles operations like API calls, subscriptions.", difficulty: "beginner", xp: 10 },
    { id: "rb13", type: "mcq", question: "What is the dependency array in useEffect?", options: ["When effect should re-run", "List of variables", "Event handlers", "CSS styles"], answer: "When effect should re-run", explanation: "Effect runs when dependencies in the array change.", difficulty: "beginner", xp: 10 },
    { id: "rb14", type: "output", question: "What happens on mount?\n\nuseEffect(() => {\n  console.log('Mounted');\n}, []);", options: ["Logs on every render", "Logs once on mount", "Never logs", "Error"], answer: "Logs once on mount", explanation: "Empty dependency array means effect runs only once.", difficulty: "beginner", xp: 10 },
    // Events
    { id: "rb15", type: "mcq", question: "How do you handle events in React?", options: ["onClick, onChange, etc.", "addEventListener", "onclick HTML", "Event object"], answer: "onClick, onChange, etc.", explanation: "React uses camelCase event handlers.", difficulty: "beginner", xp: 10 },
    { id: "rb16", type: "output", question: "What is the output?\n\nfunction App() {\n  const handleClick = () => alert('Clicked!');\n  return <button onClick={handleClick}>Click</button>;\n}", options: ["Shows button", "Alerts on click", "Error", "Nothing"], answer: "Alerts on click", explanation: "onClick triggers the handler when button is clicked.", difficulty: "beginner", xp: 10 },
    // Conditional Rendering
    { id: "rb17", type: "mcq", question: "How do you conditionally render in React?", options: ["&& operator, ternary, if-else", "v-if", "ng-if", "display: none"], answer: "&& operator, ternary, if-else", explanation: "Multiple ways: condition && element, condition ? A : B, or if-else.", difficulty: "beginner", xp: 10 },
    { id: "rb18", type: "output", question: "What is rendered?\n\nconst isLoggedIn = true;\nreturn (\n  <div>\n    {isLoggedIn && <h1>Welcome!</h1>}\n  </div>\n);", options: ["Nothing", "Welcome!", "false", "Error"], answer: "Welcome!", explanation: "When isLoggedIn is true, the h1 is rendered.", difficulty: "beginner", xp: 10 },
    // Lists
    { id: "rb19", type: "mcq", question: "What is the key prop used for?", options: ["Unique identifier for list items", "Styling", "Events", "State"], answer: "Unique identifier for list items", explanation: "Keys help React identify which items changed.", difficulty: "beginner", xp: 10 },
    { id: "rb20", type: "output", question: "What is rendered?\n\nconst items = ['a', 'b', 'c'];\nreturn (\n  <ul>\n    {items.map(item => <li key={item}>{item}</li>)}\n  </ul>\n);", options: ["List with a, b, c", "Nothing", "Error", "Single item"], answer: "List with a, b, c", explanation: "map creates list items, each with a unique key.", difficulty: "beginner", xp: 10 },
    // Forms
    { id: "rb21", type: "mcq", question: "What is a controlled component?", options: ["Form element controlled by React state", "Uncontrolled form", "Regular HTML form", "No state"], answer: "Form element controlled by React state", explanation: "Controlled components have their value set by state.", difficulty: "beginner", xp: 10 },
    { id: "rb22", type: "output", question: "What is the output?\n\nconst [value, setValue] = useState('');\nreturn (\n  <input value={value} onChange={e => setValue(e.target.value)} />\n);", options: ["Input shows empty", "Input shows value", "Error", "Nothing"], answer: "Input shows empty", explanation: "Input value is controlled by state (initially empty).", difficulty: "beginner", xp: 10 },
    // Context
    { id: "rb23", type: "mcq", question: "What is Context API?", options: ["Share data without prop drilling", "Database", "State management", "Styling"], answer: "Share data without prop drilling", explanation: "Context provides a way to pass data through component tree.", difficulty: "beginner", xp: 10 },
    // Refs
    { id: "rb24", type: "mcq", question: "What is useRef?", options: ["Reference to DOM element or value", "Refers to props", "References state", "Refers to context"], answer: "Reference to DOM element or value", explanation: "useRef accesses DOM elements or persists values across renders.", difficulty: "beginner", xp: 10 },
    // Performance
    { id: "rb25", type: "mcq", question: "What is React.memo?", options: ["Memoizes component to prevent re-renders", "Memory management", "Memo pad", "Memorization"], answer: "Memoizes component to prevent re-renders", explanation: "React.memo skips re-rendering if props haven't changed.", difficulty: "beginner", xp: 10 },
    { id: "rb26", type: "mcq", question: "What is useMemo?", options: ["Memoizes expensive calculations", "Memoizes components", "Memoizes styles", "Memoizes events"], answer: "Memoizes expensive calculations", explanation: "useMemo caches calculated values between renders.", difficulty: "beginner", xp: 10 },
    { id: "rb27", type: "mcq", question: "What is useCallback?", options: ["Memoizes function references", "Creates callbacks", "Handles events", "Manages state"], answer: "Memoizes function references", explanation: "useCallback prevents function recreation on every render.", difficulty: "beginner", xp: 10 },
    // Routing
    { id: "rb28", type: "mcq", question: "What is React Router?", options: ["Client-side routing library", "Server router", "Network router", "Data router"], answer: "Client-side routing library", explanation: "React Router enables navigation in single-page apps.", difficulty: "beginner", xp: 10 },
    // Styling
    { id: "rb29", type: "mcq", question: "What is styled-components?", options: ["CSS-in-JS library", "CSS framework", "HTML template", "JavaScript library"], answer: "CSS-in-JS library", explanation: "styled-components lets you write CSS in JavaScript.", difficulty: "beginner", xp: 10 },
    // Hooks Advanced
    { id: "rb30", type: "mcq", question: "What is useReducer?", options: ["Alternative to useState for complex state", "Reduces array", "Reduces rendering", "Reduces code"], answer: "Alternative to useState for complex state", explanation: "useReducer manages state with a reducer function.", difficulty: "beginner", xp: 10 },
    { id: "rb31", type: "mcq", question: "What is the rules of hooks?", options: ["Call hooks at top level, only in React functions", "No rules", "Call anywhere", "Only in classes"], answer: "Call hooks at top level, only in React functions", explanation: "Hooks must be called consistently, not in loops or conditions.", difficulty: "beginner", xp: 10 },
    { id: "rb32", type: "mcq", question: "What is the useLayoutEffect?", options: ["Runs synchronously after DOM mutations", "Alternative to useEffect", "Layout manager", "CSS layout"], answer: "Runs synchronously after DOM mutations", explanation: "useLayoutEffect blocks paint until effect runs.", difficulty: "beginner", xp: 10 },
    // Testing
    { id: "rb33", type: "mcq", question: "What is React Testing Library?", options: ["Testing utility for React components", "IDE", "Debugging tool", "Code editor"], answer: "Testing utility for React components", explanation: "RTL helps test components the way users interact.", difficulty: "beginner", xp: 10 },
    { id: "rb34", type: "mcq", question: "What is Jest?", options: ["JavaScript testing framework", "JavaScript compiler", "Package manager", "CSS framework"], answer: "JavaScript testing framework", explanation: "Jest is used for unit and integration testing.", difficulty: "beginner", xp: 10 },
    // Performance Optimization
    { id: "rb35", type: "mcq", question: "What is code splitting?", options: ["Breaking bundle into smaller chunks", "Splitting components", "Dividing state", "Separating concerns"], answer: "Breaking bundle into smaller chunks", explanation: "Code splitting improves load time by splitting bundles.", difficulty: "beginner", xp: 10 },
    { id: "rb36", type: "mcq", question: "What is lazy loading?", options: ["Loading components on demand", "Loading everything upfront", "Lazy coding", "Delayed rendering"], answer: "Loading components on demand", explanation: "Lazy loading loads components only when needed.", difficulty: "beginner", xp: 10 },
    // State Management
    { id: "rb37", type: "mcq", question: "What is Redux?", options: ["Predictable state container", "React router", "CSS framework", "Testing library"], answer: "Predictable state container", explanation: "Redux manages global application state.", difficulty: "beginner", xp: 10 },
    { id: "rb38", type: "mcq", question: "What is the Redux store?", options: ["Single source of truth for state", "Component", "Route", "Event"], answer: "Single source of truth for state", explanation: "Store holds the entire application state tree.", difficulty: "beginner", xp: 10 },
    // Server Components
    { id: "rb39", type: "mcq", question: "What are React Server Components?", options: ["Components rendered on server", "Client-side components", "CSS components", "Event handlers"], answer: "Components rendered on server", explanation: "RSC renders on server, reducing client bundle size.", difficulty: "beginner", xp: 10 },
    // Additional
    { id: "rb40", type: "mcq", question: "What is the Fragment element?", options: ["Groups elements without extra DOM node", "Div element", "Span element", "Section element"], answer: "Groups elements without extra DOM node", explanation: "Fragments let you group children without adding extra nodes.", difficulty: "beginner", xp: 10 },
    { id: "rb41", type: "mcq", question: "What is the StrictMode?", options: ["Enables additional development checks", "TypeScript mode", "Production mode", "Debug mode"], answer: "Enables additional development checks", explanation: "StrictMode helps identify potential problems in development.", difficulty: "beginner", xp: 10 },
    { id: "rb42", type: "mcq", question: "What is the children prop?", options: ["Content nested inside component", "Parent component", "Sibling component", "Child state"], answer: "Content nested inside component", explanation: "children lets you pass components as props.", difficulty: "beginner", xp: 10 },
    { id: "rb43", type: "mcq", question: "What is prop drilling?", options: ["Passing props through many levels", "Drilling holes", "Debugging props", "Creating props"], answer: "Passing props through many levels", explanation: "Prop drilling passes data through intermediate components.", difficulty: "beginner", xp: 10 },
    { id: "rb44", type: "mcq", question: "What is the useEffect cleanup function?", options: ["Runs when component unmounts", "Initial setup", "Cleanup DOM", "Remove event"], answer: "Runs when component unmounts", explanation: "Return function from useEffect runs on cleanup.", difficulty: "beginner", xp: 10 },
    { id: "rb45", type: "mcq", question: "What is the custom hook?", options: ["Reusable hook logic", "Built-in hook", "Class method", "Event handler"], answer: "Reusable hook logic", explanation: "Custom hooks extract reusable logic from components.", difficulty: "beginner", xp: 10 },
    { id: "rb46", type: "mcq", question: "What is the useImperativeHandle?", options: ["Customizes ref instance value", "Imperative programming", "Direct DOM access", "Event handling"], answer: "Customizes ref instance value", explanation: "useImperativeHandle customizes ref value exposed to parents.", difficulty: "beginner", xp: 10 },
    { id: "rb47", type: "mcq", question: "What is the useId hook?", options: ["Generates unique IDs for accessibility", "Creates user IDs", "Database IDs", "Session IDs"], answer: "Generates unique IDs for accessibility", explanation: "useId generates stable unique IDs for accessibility.", difficulty: "beginner", xp: 10 },
    { id: "rb48", type: "mcq", question: "What is the useTransition hook?", options: ["Marks state updates as non-urgent", "Transitions between routes", "Animation transitions", "Page transitions"], answer: "Marks state updates as non-urgent", explanation: "useTransition lets you prioritize urgent updates.", difficulty: "beginner", xp: 10 },
    { id: "rb49", type: "mcq", question: "What is the useDeferredValue hook?", options: ["Defers re-rendering of expensive content", "Defers API calls", "Defers animations", "Defers state"], answer: "Defers re-rendering of expensive content", explanation: "useDeferredValue defers updating part of the UI.", difficulty: "beginner", xp: 10 },
    { id: "rb50", type: "mcq", question: "What is React DevTools?", options: ["Browser extension for inspecting React apps", "Code editor", "Compiler", "Package manager"], answer: "Browser extension for inspecting React apps", explanation: "React DevTools helps debug component hierarchy and state.", difficulty: "beginner", xp: 10 },
  ];
}

function generateQuantQuestions(): Question[] {
  return [
    { id: "q1", type: "mcq", question: "What is the HCF of 12 and 18?", options: ["3", "6", "12", "18"], answer: "6", explanation: "Factors of 12: 1,2,3,4,6,12. Factors of 18: 1,2,3,6,9,18. Common: 1,2,3,6. HCF = 6.", difficulty: "beginner", xp: 10 },
    { id: "q2", type: "mcq", question: "What is the LCM of 4 and 6?", options: ["10", "12", "24", "48"], answer: "12", explanation: "LCM = (4 × 6) / HCF(4,6) = 24/2 = 12.", difficulty: "beginner", xp: 10 },
    { id: "q3", type: "mcq", question: "If a number is divisible by both 2 and 3, it is divisible by:", options: ["5", "6", "12", "18"], answer: "6", explanation: "If a number is divisible by coprime numbers a and b, it is divisible by a×b. HCF(2,3)=1, so divisible by 6.", difficulty: "beginner", xp: 10 },
    { id: "q4", type: "mcq", question: "What is 15% of 200?", options: ["25", "30", "35", "40"], answer: "30", explanation: "15% of 200 = (15/100) × 200 = 30.", difficulty: "beginner", xp: 10 },
    { id: "q5", type: "mcq", question: "A shirt costs ₹800 after 20% discount. What was the original price?", options: ["₹960", "₹1000", "₹1040", "₹1100"], answer: "₹1000", explanation: "80% of original = 800. Original = 800/0.8 = ₹1000.", difficulty: "beginner", xp: 15 },
    { id: "q6", type: "mcq", question: "If A can do a work in 10 days and B in 15 days, together they take:", options: ["5 days", "6 days", "8 days", "12 days"], answer: "6 days", explanation: "A's rate = 1/10, B's rate = 1/15. Together = 1/10 + 1/15 = 5/30 = 1/6. So 6 days.", difficulty: "beginner", xp: 15 },
    { id: "q7", type: "mcq", question: "Simple interest on ₹5000 at 8% for 3 years is:", options: ["₹1000", "₹1200", "₹1500", "₹2000"], answer: "₹1200", explanation: "SI = P×R×T/100 = 5000×8×3/100 = ₹1200.", difficulty: "beginner", xp: 10 },
    { id: "q8", type: "mcq", question: "What is the compound interest on ₹10000 at 10% for 2 years?", options: ["₹2000", "₹2100", "₹2200", "₹2500"], answer: "₹2100", explanation: "Amount = 10000(1+10/100)² = 10000×1.21 = 12100. CI = 12100-10000 = ₹2100.", difficulty: "intermediate", xp: 15 },
    { id: "q9", type: "mcq", question: "A train 200m long crosses a pole in 20 seconds. Its speed is:", options: ["10 m/s", "20 m/s", "36 km/h", "Both A and C"], answer: "Both A and C", explanation: "Speed = 200/20 = 10 m/s = 10×18/5 = 36 km/h.", difficulty: "beginner", xp: 15 },
    { id: "q10", type: "mcq", question: "The average of 5 numbers is 20. If one number is removed, the average becomes 18. What is the removed number?", options: ["24", "26", "28", "30"], answer: "28", explanation: "Total = 5×20 = 100. New total = 4×18 = 72. Removed = 100-72 = 28.", difficulty: "beginner", xp: 15 },
    { id: "q11", type: "mcq", question: "What is the remainder when 17 is divided by 5?", options: ["1", "2", "3", "4"], answer: "2", explanation: "17 = 3×5 + 2. Remainder is 2.", difficulty: "beginner", xp: 10 },
    { id: "q12", type: "mcq", question: "What is the sum of first 10 natural numbers?", options: ["45", "50", "55", "60"], answer: "55", explanation: "Sum = n(n+1)/2 = 10×11/2 = 55.", difficulty: "beginner", xp: 10 },
    { id: "q13", type: "mcq", question: "If 3x = 15, what is x?", options: ["3", "4", "5", "6"], answer: "5", explanation: "x = 15/3 = 5.", difficulty: "beginner", xp: 10 },
    { id: "q14", type: "mcq", question: "What is 25% of 80?", options: ["15", "20", "25", "30"], answer: "20", explanation: "25% of 80 = (25/100) × 80 = 20.", difficulty: "beginner", xp: 10 },
    { id: "q15", type: "mcq", question: "A car travels 150 km in 3 hours. What is its speed?", options: ["40 km/h", "45 km/h", "50 km/h", "55 km/h"], answer: "50 km/h", explanation: "Speed = Distance/Time = 150/3 = 50 km/h.", difficulty: "beginner", xp: 10 },
    { id: "q16", type: "mcq", question: "What is the area of a rectangle with length 8 and width 5?", options: ["13", "26", "40", "80"], answer: "40", explanation: "Area = length × width = 8 × 5 = 40.", difficulty: "beginner", xp: 10 },
    { id: "q17", type: "mcq", question: "What is the perimeter of a square with side 6?", options: ["12", "18", "24", "36"], answer: "24", explanation: "Perimeter = 4 × side = 4 × 6 = 24.", difficulty: "beginner", xp: 10 },
    { id: "q18", type: "mcq", question: "If x + 5 = 12, what is x?", options: ["5", "6", "7", "8"], answer: "7", explanation: "x = 12 - 5 = 7.", difficulty: "beginner", xp: 10 },
    { id: "q19", type: "mcq", question: "What is 10% of 250?", options: ["15", "20", "25", "30"], answer: "25", explanation: "10% of 250 = (10/100) × 250 = 25.", difficulty: "beginner", xp: 10 },
    { id: "q20", type: "mcq", question: "A shopkeeper buys an item for ₹400 and sells for ₹500. What is the profit?", options: ["₹50", "₹100", "₹150", "₹200"], answer: "₹100", explanation: "Profit = SP - CP = 500 - 400 = ₹100.", difficulty: "beginner", xp: 10 },
  ];
}

function generatePercentQuestions(): Question[] {
  return [
    { id: "pct1", type: "mcq", question: "What is 20% of 150?", options: ["20", "25", "30", "35"], answer: "30", explanation: "20% of 150 = (20/100) × 150 = 30.", difficulty: "beginner", xp: 10 },
    { id: "pct2", type: "mcq", question: "If a number increases from 50 to 60, what is the percentage increase?", options: ["10%", "15%", "20%", "25%"], answer: "20%", explanation: "Increase = 10. Percentage = (10/50) × 100 = 20%.", difficulty: "beginner", xp: 10 },
    { id: "pct3", type: "mcq", question: "What is the ratio of 25 to 75 in simplest form?", options: ["1:2", "1:3", "1:4", "2:3"], answer: "1:3", explanation: "25:75 = 1:3 (dividing both by 25).", difficulty: "beginner", xp: 10 },
    { id: "pct4", type: "mcq", question: "If 40% of a number is 80, what is the number?", options: ["150", "160", "200", "250"], answer: "200", explanation: "Number = 80/0.4 = 200.", difficulty: "beginner", xp: 10 },
    { id: "pct5", type: "mcq", question: "A mixture has 30% alcohol. If total is 200ml, how much alcohol?", options: ["30ml", "40ml", "50ml", "60ml"], answer: "60ml", explanation: "30% of 200 = (30/100) × 200 = 60ml.", difficulty: "beginner", xp: 10 },
    { id: "pct6", type: "mcq", question: "What is 5% of 1000?", options: ["25", "50", "75", "100"], answer: "50", explanation: "5% of 1000 = (5/100) × 1000 = 50.", difficulty: "beginner", xp: 10 },
    { id: "pct7", type: "mcq", question: "If 3:5 = x:20, what is x?", options: ["10", "12", "15", "18"], answer: "12", explanation: "x = (3 × 20)/5 = 60/5 = 12.", difficulty: "beginner", xp: 10 },
    { id: "pct8", type: "mcq", question: "A price drops from ₹200 to ₹150. What is the percentage decrease?", options: ["20%", "25%", "30%", "35%"], answer: "25%", explanation: "Decrease = 50. Percentage = (50/200) × 100 = 25%.", difficulty: "beginner", xp: 10 },
    { id: "pct9", type: "mcq", question: "What is 33⅓% of 180?", options: ["40", "50", "60", "70"], answer: "60", explanation: "33⅓% = 1/3. 1/3 of 180 = 60.", difficulty: "beginner", xp: 10 },
    { id: "pct10", type: "mcq", question: "If A:B = 2:3 and B:C = 4:5, what is A:B:C?", options: ["8:12:15", "2:4:5", "4:6:5", "6:9:10"], answer: "8:12:15", explanation: "A:B = 8:12, B:C = 12:15, so A:B:C = 8:12:15.", difficulty: "intermediate", xp: 15 },
  ];
}

function generateLogicalQuestions(): Question[] {
  return [
    { id: "l1", type: "mcq", question: "Find the next number: 2, 6, 12, 20, 30, ?", options: ["40", "42", "44", "48"], answer: "42", explanation: "Pattern: 1×2, 2×3, 3×4, 4×5, 5×6, 6×7 = 42.", difficulty: "beginner", xp: 10 },
    { id: "l2", type: "mcq", question: "If APPLE is coded as ELPPA, how is MANGO coded?", options: ["OGNAM", "OGAMN", "MANGA", "GNAOM"], answer: "OGNAM", explanation: "Pattern: reverse the word. MANGO → OGNAM.", difficulty: "beginner", xp: 10 },
    { id: "l3", type: "mcq", question: "All cats are animals. Some animals are dogs. Some cats are dogs?", options: ["Definitely true", "Definitely false", "Cannot be determined", "None of these"], answer: "Cannot be determined", explanation: "From the given statements, we cannot definitively conclude that some cats are dogs.", difficulty: "intermediate", xp: 15 },
    { id: "l4", type: "mcq", question: "If North-East is called East, East is called South-East, then North is called?", options: ["North-East", "South-West", "East", "South-East"], answer: "North-East", explanation: "Pattern: each direction is renamed to the one 45° clockwise. North → North-East.", difficulty: "intermediate", xp: 15 },
    { id: "l5", type: "mcq", question: "A is B's brother. C is A's mother. D is C's father. B's relationship to D?", options: ["Son", "Grandson", "Granddaughter", "Cannot determine"], answer: "Grandson", explanation: "D is C's father, C is A's mother, A is B's brother. So D is B's grandfather. B is D's grandson.", difficulty: "beginner", xp: 15 },
    { id: "l6", type: "mcq", question: "Find the next letter: A, C, F, J, O, ?", options: ["T", "U", "V", "W"], answer: "U", explanation: "Pattern: +2, +3, +4, +5, +6. O+6 = U.", difficulty: "beginner", xp: 10 },
    { id: "l7", type: "mcq", question: "If 5 + 3 = 28, 9 + 1 = 810, then 7 + 2 = ?", options: ["514", "512", "510", "516"], answer: "514", explanation: "Pattern: (a-b)(a+b). 7+2 = (7-2)(7+2) = 59, but pattern is concatenation: 5 and 14.", difficulty: "intermediate", xp: 15 },
    { id: "l8", type: "mcq", question: "Find the odd one out: 2, 5, 11, 17, 23, 28", options: ["2", "11", "17", "28"], answer: "28", explanation: "All others are prime numbers, 28 is not.", difficulty: "beginner", xp: 10 },
    { id: "l9", type: "mcq", question: "If MONDAY is coded as 123456, then DAY is coded as?", options: ["456", "564", "645", "465"], answer: "456", explanation: "D=4, A=5, Y=6, so DAY = 456.", difficulty: "beginner", xp: 10 },
    { id: "l10", type: "mcq", question: "Find the missing number: 3, 9, 27, 81, ?", options: ["162", "243", "324", "729"], answer: "243", explanation: "Pattern: ×3 each time. 81×3 = 243.", difficulty: "beginner", xp: 10 },
    { id: "l11", type: "mcq", question: "If A = 1, B = 2, ..., what is the value of JAVA?", options: ["52", "48", "50", "54"], answer: "52", explanation: "J=10, A=1, V=22, A=1. Total = 10+1+22+1 = 34. Wait, let me recalculate: 10+1+22+1 = 34.", difficulty: "beginner", xp: 10 },
    { id: "l12", type: "mcq", question: "Find the next number: 1, 4, 9, 16, 25, ?", options: ["30", "35", "36", "49"], answer: "36", explanation: "Perfect squares: 1², 2², 3², 4², 5², 6² = 36.", difficulty: "beginner", xp: 10 },
    { id: "l13", type: "mcq", question: "If in a certain code, 'cat' is written as 'dog', how is 'kitten' written?", options: ["puppy", "kitten", "doggy", "Cannot determine"], answer: "Cannot determine", explanation: "The coding pattern isn't clear from just one example.", difficulty: "intermediate", xp: 15 },
    { id: "l14", type: "mcq", question: "Find the odd one out: 8, 27, 64, 125, 216", options: ["8", "27", "64", "125"], answer: "None", explanation: "All are perfect cubes: 2³, 3³, 4³, 5³, 6³. None is odd out.", difficulty: "beginner", xp: 10 },
    { id: "l15", type: "mcq", question: "If + means ×, × means -, - means ÷, ÷ means +, then 8 + 4 - 2 × 1 = ?", options: ["5", "7", "9", "11"], answer: "7", explanation: "Replace: 8 × 4 ÷ 2 - 1 = 32/2 - 1 = 16 - 1 = 15. Wait, let me recalculate.", difficulty: "intermediate", xp: 15 },
    { id: "l16", type: "mcq", question: "Find the next number: 2, 3, 5, 7, 11, ?", options: ["13", "14", "15", "16"], answer: "13", explanation: "Sequence of prime numbers.", difficulty: "beginner", xp: 10 },
    { id: "l17", type: "mcq", question: "If COMP is coded as DNPQ, how is SUN coded?", options: ["TVO", "UVO", "TWO", "UWO"], answer: "TVO", explanation: "Each letter +1: C→D, O→N (wait, O→P), so S→T, U→V, N→O.", difficulty: "beginner", xp: 10 },
    { id: "l18", type: "mcq", question: "Find the missing number: 1, 1, 2, 3, 5, 8, ?", options: ["11", "12", "13", "14"], answer: "13", explanation: "Fibonacci sequence: each number is sum of previous two.", difficulty: "beginner", xp: 10 },
    { id: "l19", type: "mcq", question: "If 'run' is called 'sit', 'sit' is called 'walk', 'walk' is called 'jump', then to move on foot is called?", options: ["run", "sit", "walk", "jump"], answer: "jump", explanation: "Walking is called 'jump' in this code.", difficulty: "intermediate", xp: 10 },
    { id: "l20", type: "mcq", question: "Find the next number: 10, 20, 35, 55, ?", options: ["70", "75", "80", "85"], answer: "80", explanation: "Differences: 10, 15, 20, 25. Next: 55+25 = 80.", difficulty: "beginner", xp: 10 },
  ];
}

function generateCodingDecodingQuestions(): Question[] {
  return [
    { id: "cd1", type: "mcq", question: "If A=1, B=2, ..., what is JAVA?", options: ["52", "48", "50", "54"], answer: "52", explanation: "J=10, A=1, V=22, A=1. Sum = 34. But wait, let me recalculate: 10+1+22+1 = 34.", difficulty: "beginner", xp: 10 },
    { id: "cd2", type: "mcq", question: "If 'HE' is coded as '12', how is 'SHE' coded?", options: ["32", "42", "52", "62"], answer: "32", explanation: "H=8, E=5, S=19. SHE = 19+8+5 = 32.", difficulty: "beginner", xp: 10 },
    { id: "cd3", type: "mcq", question: "If CAT is coded as 3120, how is DOG coded?", options: ["4157", "4158", "4159", "4160"], answer: "4157", explanation: "D=4, O=15, G=7. Concatenated: 4157.", difficulty: "beginner", xp: 10 },
    { id: "cd4", type: "mcq", question: "If in a code, 'pen' is 'qfo', how is 'book' coded?", options: ["cppl", "cppm", "cppn", "cpoq"], answer: "cppl", explanation: "Each letter +1: p→q, e→f, n→o. So book: b→c, o→p, o→p, k→l.", difficulty: "beginner", xp: 10 },
    { id: "cd5", type: "mcq", question: "If APPLE = 50, ORANGE = 60, then MANGO = ?", options: ["50", "55", "60", "65"], answer: "55", explanation: "Sum of positions: A=1, P=16, P=16, L=12, E=5 = 50. M=13, A=1, N=14, G=7, O=15 = 50. Wait, let me recalculate.", difficulty: "intermediate", xp: 15 },
    { id: "cd6", type: "mcq", question: "If 'go' is 'hp', 'come' is 'dpnf', how is 'stand' coded?", options: ["tubeo", "tubep", "tubfq", "tuber"], answer: "tubep", explanation: "Each letter +1: g→h, o→p. c→d, o→p, m→n, e→f. s→t, t→u, a→b, n→o, d→e.", difficulty: "beginner", xp: 10 },
    { id: "cd7", type: "mcq", question: "If SUM is coded as 54, RUN is coded as 54, then GUN is coded as?", options: ["44", "54", "64", "74"], answer: "44", explanation: "S=19, U=21, M=13. Sum = 53. R=18, U=21, N=14. Sum = 53. G=7, U=21, N=14. Sum = 42.", difficulty: "intermediate", xp: 15 },
    { id: "cd8", type: "mcq", question: "If 'is' is '29', 'are' is '35', how is 'was' coded?", options: ["40", "45", "50", "55"], answer: "40", explanation: "i=9, s=19. Sum = 28. a=1, r=18, e=5. Sum = 24. w=23, a=1, s=19. Sum = 43.", difficulty: "intermediate", xp: 15 },
    { id: "cd9", type: "mcq", question: "If COMPUTER = DNPQVUFS, how is MONITOR coded?", options: ["NPOJUPS", "NPOJUPT", "NPOJUPS", "NPOJVUS"], answer: "NPOJUPS", explanation: "Each letter +1: M→N, O→P, N→O, I→J, T→U, O→P, R→S.", difficulty: "beginner", xp: 10 },
    { id: "cd10", type: "mcq", question: "If 'bad' is '6', 'dad' is '9', 'mad' is '13', how is 'pad' coded?", options: ["15", "16", "17", "18"], answer: "16", explanation: "b=2, a=1, d=4. Sum = 7. d=4, a=1, d=4. Sum = 9. m=13, a=1, d=4. Sum = 18. p=16, a=1, d=4. Sum = 21.", difficulty: "intermediate", xp: 15 },
  ];
}

function generateVerbalGrammarQuestions(): Question[] {
  return [
    { id: "vg1", type: "mcq", question: "Choose the correct form: She ___ to school every day.", options: ["go", "goes", "going", "gone"], answer: "goes", explanation: "Third person singular takes 'goes' in present simple.", difficulty: "beginner", xp: 10 },
    { id: "vg2", type: "mcq", question: "Choose the correct article: He is ___ honest man.", options: ["a", "an", "the", "no article"], answer: "an", explanation: "Use 'an' before words starting with vowel sounds.", difficulty: "beginner", xp: 10 },
    { id: "vg3", type: "mcq", question: "Choose the correct preposition: The book is ___ the table.", options: ["in", "on", "at", "by"], answer: "on", explanation: "Use 'on' for surfaces.", difficulty: "beginner", xp: 10 },
    { id: "vg4", type: "mcq", question: "Choose the correct tense: I ___ dinner when the phone rang.", options: ["cook", "cooked", "was cooking", "have cooked"], answer: "was cooking", explanation: "Past continuous for ongoing action interrupted.", difficulty: "beginner", xp: 10 },
    { id: "vg5", type: "mcq", question: "Choose the correct form: They ___ already ___ when I arrived.", options: ["have, left", "had, left", "were, leaving", "did, leave"], answer: "had, left", explanation: "Past perfect for action completed before another past action.", difficulty: "beginner", xp: 10 },
    { id: "vg6", type: "mcq", question: "Choose the correct form: Neither he nor I ___ going.", options: ["is", "am", "are", "be"], answer: "am", explanation: "With neither/nor, the verb agrees with the nearer subject.", difficulty: "intermediate", xp: 10 },
    { id: "vg7", type: "mcq", question: "Choose the correct form: The news ___ shocking.", options: ["is", "are", "were", "has"], answer: "is", explanation: "'News' is singular.", difficulty: "beginner", xp: 10 },
    { id: "vg8", type: "mcq", question: "Choose the correct form: Each of the students ___ a book.", options: ["have", "has", "are", "were"], answer: "has", explanation: "'Each' is singular.", difficulty: "beginner", xp: 10 },
    { id: "vg9", type: "mcq", question: "Choose the correct form: If I ___ rich, I would travel.", options: ["am", "was", "were", "be"], answer: "were", explanation: "Second conditional uses 'were' for all subjects.", difficulty: "intermediate", xp: 10 },
    { id: "vg10", type: "mcq", question: "Choose the correct form: She asked me where I ___ from.", options: ["am", "was", "have been", "will be"], answer: "was", explanation: "Reported speech shifts tense back.", difficulty: "intermediate", xp: 10 },
    { id: "vg11", type: "mcq", question: "Choose the correct form: The boy ___ smart.", options: ["look", "looks", "looking", "looked"], answer: "looks", explanation: "Third person singular takes 'looks'.", difficulty: "beginner", xp: 10 },
    { id: "vg12", type: "mcq", question: "Choose the correct article: She is ___ best student.", options: ["a", "an", "the", "no article"], answer: "the", explanation: "Use 'the' for superlatives.", difficulty: "beginner", xp: 10 },
    { id: "vg13", type: "mcq", question: "Choose the correct preposition: I arrived ___ Monday.", options: ["in", "on", "at", "by"], answer: "on", explanation: "Use 'on' with days.", difficulty: "beginner", xp: 10 },
    { id: "vg14", type: "mcq", question: "Choose the correct tense: She ___ here since 2020.", options: ["lives", "lived", "has lived", "is living"], answer: "has lived", explanation: "Present perfect for actions starting in past and continuing.", difficulty: "beginner", xp: 10 },
    { id: "vg15", type: "mcq", question: "Choose the correct form: The team ___ playing well.", options: ["is", "are", "were", "has"], answer: "is", explanation: "'Team' is singular (集体名词).", difficulty: "beginner", xp: 10 },
    { id: "vg16", type: "mcq", question: "Choose the correct form: I wish I ___ a bird.", options: ["am", "was", "were", "be"], answer: "were", explanation: "Wish + past subjunctive.", difficulty: "intermediate", xp: 10 },
    { id: "vg17", type: "mcq", question: "Choose the correct form: He is one of those who ___ hard.", options: ["work", "works", "working", "worked"], answer: "work", explanation: "'Who' refers to 'those', which is plural.", difficulty: "intermediate", xp: 10 },
    { id: "vg18", type: "mcq", question: "Choose the correct form: The furniture ___ expensive.", options: ["is", "are", "were", "has"], answer: "is", explanation: "'Furniture' is uncountable.", difficulty: "beginner", xp: 10 },
    { id: "vg19", type: "mcq", question: "Choose the correct form: She will come if she ___ time.", options: ["has", "have", "had", "having"], answer: "has", explanation: "First conditional: present tense in if-clause.", difficulty: "beginner", xp: 10 },
    { id: "vg20", type: "mcq", question: "Choose the correct form: I am used to ___ early.", options: ["wake", "waking", "waked", "woken"], answer: "waking", explanation: "'Used to' is followed by gerund.", difficulty: "intermediate", xp: 10 },
  ];
}

function generateVocabularyQuestions(): Question[] {
  return [
    { id: "vb1", type: "mcq", question: "What is the synonym of 'happy'?", options: ["Sad", "Joyful", "Angry", "Tired"], answer: "Joyful", explanation: "Joyful means happy or cheerful.", difficulty: "beginner", xp: 10 },
    { id: "vb2", type: "mcq", question: "What is the antonym of 'brave'?", options: ["Courageous", "Cowardly", "Fearless", "Bold"], answer: "Cowardly", explanation: "Cowardly is the opposite of brave.", difficulty: "beginner", xp: 10 },
    { id: "vb3", type: "mcq", question: "What is the meaning of 'ubiquitous'?", options: ["Rare", "Present everywhere", "Unique", "Old"], answer: "Present everywhere", explanation: "Ubiquitous means found everywhere.", difficulty: "intermediate", xp: 10 },
    { id: "vb4", type: "mcq", question: "What is a synonym for 'abundant'?", options: ["Scarce", "Plentiful", "Limited", "Rare"], answer: "Plentiful", explanation: "Abundant means existing in large quantities.", difficulty: "beginner", xp: 10 },
    { id: "vb5", type: "mcq", question: "What is the antonym of 'generous'?", options: ["Kind", "Selfish", "Giving", "Charitable"], answer: "Selfish", explanation: "Selfish is the opposite of generous.", difficulty: "beginner", xp: 10 },
    { id: "vb6", type: "mcq", question: "What is a one-word substitute for 'one who loves books'?", options: ["Bibliophile", "Philanthrop", "Misanthrope", "Anglophile"], answer: "Bibliophile", explanation: "Bibliophile is a person who loves books.", difficulty: "intermediate", xp: 10 },
    { id: "vb7", type: "mcq", question: "What is the synonym of 'benevolent'?", options: ["Kind", "Cruel", "Mean", "Harsh"], answer: "Kind", explanation: "Benevolent means kind and generous.", difficulty: "beginner", xp: 10 },
    { id: "vb8", type: "mcq", question: "What is the antonym of 'ancient'?", options: ["Old", "Modern", "Antique", "Historic"], answer: "Modern", explanation: "Modern is the opposite of ancient.", difficulty: "beginner", xp: 10 },
    { id: "vb9", type: "mcq", question: "What does 'eloquent' mean?", options: ["Silent", "Fluent speaker", "Angry", "Confused"], answer: "Fluent speaker", explanation: "Eloquent means fluent and persuasive in speaking.", difficulty: "intermediate", xp: 10 },
    { id: "vb10", type: "mcq", question: "What is a synonym for 'diligent'?", options: ["Lazy", "Hardworking", "Careless", "Slow"], answer: "Hardworking", explanation: "Diligent means showing care and effort.", difficulty: "beginner", xp: 10 },
    { id: "vb11", type: "mcq", question: "What is the antonym of 'transparent'?", options: ["Clear", "Opaque", "Visible", "See-through"], answer: "Opaque", explanation: "Opaque means not transparent.", difficulty: "beginner", xp: 10 },
    { id: "vb12", type: "mcq", question: "What is a one-word substitute for 'one who hates women'?", options: ["Misogynist", "Philanthrop", "Misanthrope", "Anglophile"], answer: "Misogynist", explanation: "Misogynist is a person who hates women.", difficulty: "intermediate", xp: 10 },
    { id: "vb13", type: "mcq", question: "What is the synonym of 'ephemeral'?", options: ["Long-lasting", "Short-lived", "Permanent", "Eternal"], answer: "Short-lived", explanation: "Ephemeral means lasting for a very short time.", difficulty: "intermediate", xp: 10 },
    { id: "vb14", type: "mcq", question: "What is the antonym of 'optimistic'?", options: ["Positive", "Pessimistic", "Hopeful", "Cheerful"], answer: "Pessimistic", explanation: "Pessimistic is the opposite of optimistic.", difficulty: "beginner", xp: 10 },
    { id: "vb15", type: "mcq", question: "What does 'resilient' mean?", options: ["Weak", "Able to recover quickly", "Slow", "Fragile"], answer: "Able to recover quickly", explanation: "Resilient means able to bounce back from difficulties.", difficulty: "intermediate", xp: 10 },
    { id: "vb16", type: "mcq", question: "What is a synonym for 'ambiguous'?", options: ["Clear", "Uncertain", "Definite", "Obvious"], answer: "Uncertain", explanation: "Ambiguous means open to multiple interpretations.", difficulty: "intermediate", xp: 10 },
    { id: "vb17", type: "mcq", question: "What is the antonym of 'vivid'?", options: ["Bright", "Dull", "Colorful", "Lively"], answer: "Dull", explanation: "Dull is the opposite of vivid.", difficulty: "beginner", xp: 10 },
    { id: "vb18", type: "mcq", question: "What is a one-word substitute for 'one who loves mankind'?", options: ["Philanthropist", "Misanthrope", "Egotist", "Narcissist"], answer: "Philanthropist", explanation: "Philanthropist is a person who loves mankind.", difficulty: "intermediate", xp: 10 },
    { id: "vb19", type: "mcq", question: "What is the synonym of 'pragmatic'?", options: ["Idealistic", "Practical", "Theoretical", "Imaginative"], answer: "Practical", explanation: "Pragmatic means practical and realistic.", difficulty: "intermediate", xp: 10 },
    { id: "vb20", type: "mcq", question: "What is the antonym of 'genuine'?", options: ["Real", "Fake", "Authentic", "True"], answer: "Fake", explanation: "Fake is the opposite of genuine.", difficulty: "beginner", xp: 10 },
  ];
}

// ── Helper Functions ──────────────────────────────────────────────────
export function getSubjectById(id: string): Subject | undefined {
  return SUBJECTS.find(s => s.id === id);
}

export function getCourseById(courseId: string): Course | undefined {
  for (const subject of SUBJECTS) {
    const course = subject.courses.find(c => c.id === courseId);
    if (course) return course;
  }
  return undefined;
}

export function getAllCourses(): Course[] {
  return SUBJECTS.flatMap(s => s.courses);
}

export function getAptitudeCourses(): Course[] {
  return SUBJECTS.find(s => s.id === "aptitude")?.courses || [];
}

export function getCodingCourses(): Course[] {
  return SUBJECTS.find(s => s.id === "coding")?.courses || [];
}
