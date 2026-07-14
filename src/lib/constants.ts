// Shared constants for search and time keywords
export const SEARCH_KEYWORDS = [
  "latest news", "flash news", "today's news", "current news", "headlines",
  "box office", "stock price", "share price", "weather", "score", "live score",
  "match result", "election result", "breaking news", "usd to inr", "exchange rate",
  "currency rate", "gold price", "silver price", "petrol price", "diesel price"
];

export const TIME_KEYWORDS = [
  "latest", "2026", "today", "current", "recent", "release date", "released",
  "new movie", "new film", "upcoming", "just announced", "this week", "this month"
];

export const CODING_KEYWORDS_PATTERN = /\b(javascript|typescript|python|java|rust|golang|c\+\+|html|css|react|nextjs|sql|database|programming|regex|compiler|runtime|npm|pip|git|github|docker|api endpoint)\b/i;
export const CODING_ACTION_PATTERN = /\b(code|function|class|method|variable|debug|error|fix|implement)\b/i;

export const REAL_TIME_TERM_PATTERN = /\b(usd|inr|eur|gbp|currency|exchange|forex|stock|share price|ticker|nasdaq|crypto|bitcoin|btc|weather|temperature|forecast|ipl|t20|world cup|live score|elections|chief minister|prime minister|who is current|gold price|silver price|petrol price|diesel price)\b/i;