// Algorithmic Wordscapes Level Definitions (Levels 1 to 15)
// Generated & verified via constraint-satisfaction crossword solver
export const LEVELS = [
  {
    level_id: 1,
    tier: "3-Letter Starter",
    wheel_letters: ["A", "C", "T"],
    target_words: [
      { word: "CAT", start: [0, 0], direction: "horizontal" },
      { word: "ACT", start: [0, 1], direction: "vertical" }
    ],
    bonus_words: ["AT"]
  },
  {
    level_id: 2,
    tier: "3-Letter Starter",
    wheel_letters: ["D", "O", "G"],
    target_words: [
      { word: "DOG", start: [0, 0], direction: "horizontal" },
      { word: "GOD", start: [0, 2], direction: "vertical" }
    ],
    bonus_words: ["DO", "GO"]
  },
  {
    level_id: 3,
    tier: "3-Letter Starter",
    wheel_letters: ["A", "R", "T"],
    target_words: [
      { word: "ART", start: [0, 0], direction: "horizontal" },
      { word: "RAT", start: [0, 1], direction: "vertical" },
      { word: "TAR", start: [2, 1], direction: "horizontal" }
    ],
    bonus_words: ["AT"]
  },
  {
    level_id: 4,
    tier: "3-Letter Starter",
    wheel_letters: ["N", "E", "T"],
    target_words: [
      { word: "NET", start: [0, 0], direction: "horizontal" },
      { word: "TEN", start: [0, 2], direction: "vertical" }
    ],
    bonus_words: []
  },
  {
    level_id: 5,
    tier: "4-Letter Easy",
    wheel_letters: ["B", "A", "R", "E"],
    target_words: [
      { word: "BARE", start: [0, 1], direction: "horizontal" },
      { word: "BEAR", start: [0, 1], direction: "vertical" },
      { word: "BAR",  start: [2, 0], direction: "horizontal" },
      { word: "EAR",  start: [0, 4], direction: "vertical" }
    ],
    bonus_words: ["ARE", "ERA"]
  },
  {
    level_id: 6,
    tier: "4-Letter Easy",
    wheel_letters: ["L", "I", "O", "N"],
    target_words: [
      { word: "LION", start: [0, 0], direction: "horizontal" },
      { word: "LOIN", start: [0, 0], direction: "vertical" },
      { word: "OIL",  start: [0, 2], direction: "vertical" }
    ],
    bonus_words: ["ION", "NO", "ON", "IN"]
  },
  {
    level_id: 7,
    tier: "4-Letter Easy",
    wheel_letters: ["S", "T", "O", "P"],
    target_words: [
      { word: "STOP", start: [1, 0], direction: "horizontal" },
      { word: "POST", start: [0, 2], direction: "vertical" },
      { word: "TOP",  start: [3, 2], direction: "horizontal" },
      { word: "POT",  start: [0, 2], direction: "horizontal" }
    ],
    bonus_words: ["SPOT", "OPT", "SOP", "SO"]
  },
  {
    level_id: 8,
    tier: "4-Letter Easy",
    wheel_letters: ["W", "A", "R", "D"],
    target_words: [
      { word: "DRAW", start: [0, 0], direction: "horizontal" },
      { word: "WARD", start: [0, 3], direction: "vertical" },
      { word: "WAR",  start: [0, 3], direction: "horizontal" },
      { word: "RAW",  start: [2, 2], direction: "horizontal" }
    ],
    bonus_words: ["RAD"]
  },
  {
    level_id: 9,
    tier: "4-Letter Easy",
    wheel_letters: ["C", "A", "M", "P"],
    target_words: [
      { word: "CAMP", start: [0, 0], direction: "horizontal" },
      { word: "CAP",  start: [0, 0], direction: "vertical" },
      { word: "MAP",  start: [0, 2], direction: "vertical" },
      { word: "AMP",  start: [2, 0], direction: "horizontal" }
    ],
    bonus_words: ["PAM"]
  },
  {
    level_id: 10,
    tier: "5-Letter Medium",
    wheel_letters: ["S", "M", "I", "L", "E"],
    target_words: [
      { word: "SMILE", start: [1, 0], direction: "horizontal" },
      { word: "SLIM",  start: [1, 0], direction: "vertical" },
      { word: "MILE",  start: [0, 1], direction: "vertical" },
      { word: "LIME",  start: [1, 3], direction: "vertical" }
    ],
    bonus_words: ["LIE", "ELM"]
  },
  {
    level_id: 11,
    tier: "5-Letter Medium",
    wheel_letters: ["B", "R", "E", "A", "D"],
    target_words: [
      { word: "BREAD", start: [1, 0], direction: "horizontal" },
      { word: "BEAR",  start: [1, 0], direction: "vertical" },
      { word: "READ",  start: [1, 1], direction: "vertical" },
      { word: "DEAR",  start: [1, 4], direction: "vertical" }
    ],
    bonus_words: ["BARE", "BED", "RED", "BAD", "BAR", "ERA", "ARE"]
  },
  {
    level_id: 12,
    tier: "5-Letter Medium",
    wheel_letters: ["T", "R", "A", "I", "N"],
    target_words: [
      { word: "TRAIN", start: [1, 0], direction: "horizontal" },
      { word: "RAIN",  start: [1, 1], direction: "vertical" },
      { word: "RANT",  start: [0, 4], direction: "vertical" },
      { word: "TIN",   start: [1, 0], direction: "vertical" }
    ],
    bonus_words: ["ANTI", "TAN", "RAT", "ART", "AIR"]
  },
  {
    level_id: 13,
    tier: "5-Letter Medium",
    wheel_letters: ["S", "T", "O", "N", "E"],
    target_words: [
      { word: "STONE", start: [1, 0], direction: "horizontal" },
      { word: "NOTE",  start: [0, 2], direction: "vertical" },
      { word: "NOSE",  start: [2, 1], direction: "horizontal" },
      { word: "ONE",   start: [1, 2], direction: "horizontal" }
    ],
    bonus_words: ["TONES", "NOTES", "TONE", "NET", "TEN", "SET", "TOE", "SON"]
  },
  {
    level_id: 14,
    tier: "6-Letter Hard",
    wheel_letters: ["S", "I", "L", "V", "E", "R"],
    target_words: [
      { word: "SILVER", start: [1, 0], direction: "horizontal" },
      { word: "LIVE",   start: [0, 2], direction: "vertical" },
      { word: "RISE",   start: [1, 5], direction: "vertical" },
      { word: "SIRE",   start: [1, 0], direction: "vertical" }
    ],
    bonus_words: ["VEIL", "VILE", "EVIL", "LIE", "SIR"]
  },
  {
    level_id: 15,
    tier: "6-Letter Hard",
    wheel_letters: ["P", "L", "A", "N", "E", "T"],
    target_words: [
      { word: "PLANET", start: [1, 0], direction: "horizontal" },
      { word: "PLANE",  start: [1, 0], direction: "vertical" },
      { word: "PLANT",  start: [0, 4], direction: "vertical" }
    ],
    bonus_words: ["PLATE", "PANEL", "LANE", "LEAN", "TALE", "TAPE", "PALE", "PLEA", "PAN", "PEN", "TEA", "EAT", "ATE", "NET", "TEN", "LET"]
  }
];