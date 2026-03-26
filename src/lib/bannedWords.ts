// ---------------------------------------------------------------------------
// Banned word list — client-side content filter for the avatar generator.
//
// This is a base list covering common English profanity and obscene terms.
//
// HOW TO EXPAND:
//   Option A — Remote list (recommended for production):
//     Fetch a JSON array from your API on app init, e.g.:
//       const res = await fetch('/api/moderation/banned-words');
//       const words = await res.json();  // string[]
//     Merge with or replace BASE_BANNED_WORDS before the first generate call.
//
//   Option B — Database-backed (Rundot server route or external service):
//     Add a server handler that queries a `banned_words` table and returns
//     the list. The client calls it once and caches the result in memory or
//     appStorage. This lets you add/remove words without a client deploy.
//
//   Option C — Third-party moderation API (e.g. OpenAI Moderation, AWS Comprehend):
//     Replace or supplement checkForBannedWords() with an async call to the
//     moderation endpoint. The generator flow already awaits before sending
//     to the avatar API, so plugging in an async check is straightforward.
// ---------------------------------------------------------------------------

const BASE_BANNED_WORDS: string[] = [
  'ass', 'asshole', 'bastard', 'bitch', 'bollocks', 'bullshit',
  'cock', 'crap', 'cunt', 'damn', 'dick', 'dildo', 'dyke',
  'fag', 'faggot', 'fuck', 'fucker', 'fucking',
  'goddamn', 'hell', 'jizz', 'kike', 'motherfucker',
  'nigga', 'nigger', 'penis', 'piss', 'prick', 'pussy',
  'shit', 'slut', 'spic', 'twat', 'vagina', 'whore', 'wank', 'wanker',
  'naked',
];

/**
 * Check a string for banned words.
 *
 * Uses whole-word, case-insensitive matching so substrings inside
 * legitimate words (e.g. "classic", "scunthorpe") are not flagged.
 *
 * @returns Array of unique banned words found — empty means clean.
 */
export function checkForBannedWords(text: string): string[] {
  const found = new Set<string>();
  for (const word of BASE_BANNED_WORDS) {
    const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
    if (pattern.test(text)) {
      found.add(word);
    }
  }
  return [...found];
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
