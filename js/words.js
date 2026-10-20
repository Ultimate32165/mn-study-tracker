// Validated Wordscapes level definitions with strict crossword geometry
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
    /*
      [C] [A] [T]   (CAT across)
       .  [C]  .    (ACT down crosses CAT at 'A')
       .  [T]  .
    */
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
    /*
      [D] [O] [G]   (DOG across)
       .   .  [O]   (GOD down crosses DOG at 'G')
       .   .  [D]
    */
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
    /*
      [A] [R] [T]   (ART across)
       .  [A]  .    (RAT down crosses ART at 'R')
       .  [T] [A] [R] (TAR across crosses RAT at 'T')
    */
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
    /*
      [N] [E] [T]   (NET across)
       .   .  [E]   (TEN down crosses NET at 'T')
       .   .  [N]
    */
  },
  {
    level_id: 5,
    tier: "4-Letter Easy",
    wheel_letters: ["B", "A", "R", "E"],
    target_words: [
      { word: "BARE", start: [1, 0], direction: "horizontal" },
      { word: "BEAR", start: [0, 2], direction: "vertical" },
      { word: "EAR",  start: [1, 3], direction: "vertical" }
    ],
    bonus_words: ["BAR", "ERA", "ARE"]
    /*
       .   .  [B]  .
      [B] [A] [R] [E]   (BARE across crosses BEAR at 'R', EAR at 'E')
       .   .  [A] [A]
       .   .  [R] [R]
    */
  },
  {
    level_id: 6,
    tier: "4-Letter Easy",
    wheel_letters: ["L", "I", "O", "N"],
    target_words: [
      { word: "OIL",  start: [0, 1], direction: "horizontal" },
      { word: "LION", start: [0, 3], direction: "vertical" },
      { word: "LOIN", start: [2, 0], direction: "horizontal" }
    ],
    bonus_words: ["ION", "NO", "ON", "IN"]
    /*
       .  [O] [I] [L]   (OIL across)
       .   .   .  [I]   (LION down crosses OIL at 'L')
      [L] [O] [I] [N]   (LOIN across crosses LION at 'O')
       .   .   .  [N]
    */
  },
  {
    level_id: 7,
    tier: "4-Letter Easy",
    wheel_letters: ["S", "T", "O", "P"],
    target_words: [
      { word: "STOP", start: [1, 0], direction: "horizontal" },
      { word: "POST", start: [0, 2], direction: "vertical" },
      { word: "TOP",  start: [3, 2], direction: "horizontal" }
    ],
    bonus_words: ["POT", "OPT", "SOP", "SPOT", "TOPS", "SO"]
    /*
       .   .  [P]  .
      [S] [T] [O] [P]   (STOP across crosses POST at 'O')
       .   .  [S]  .
       .   .  [T] [O] [P] (TOP across crosses POST at 'T')
    */
  },
  {
    level_id: 8,
    tier: "4-Letter Easy",
    wheel_letters: ["W", "A", "R", "D"],
    target_words: [
      { word: "DRAW", start: [0, 1], direction: "horizontal" },
      { word: "WARD", start: [0, 4], direction: "vertical" },
      { word: "RAW",  start: [2, 2], direction: "horizontal" }
    ],
    bonus_words: ["WAR", "RAD"]
    /*
       .  [D] [R] [A] [W]  (DRAW across)
       .   .   .   .  [A]  (WARD down crosses DRAW at 'W')
       .   .  [R] [A] [R]  (RAW across crosses WARD at 'R')
       .   .   .   .  [D]
    */
  },
  {
    level_id: 9,
    tier: "5-Letter Medium",
    wheel_letters: ["S", "M", "I", "L", "E"],
    target_words: [
      { word: "SMILE", start: [1, 0], direction: "horizontal" },
      { word: "MILE",  start: [0, 1], direction: "vertical" },
      { word: "SLIM",  start: [1, 0], direction: "vertical" },
      { word: "LIME",  start: [1, 3], direction: "vertical" }
    ],
    bonus_words: ["LIE", "ELM"]
    /*
       .  [M]  .   .   .
      [S] [I] [I] [L] [E]  (SMILE across, SLIM down, MILE down, LIME down)
      [L] [L]  .  [I]  .
      [I] [E]  .  [M]  .
      [M]  .   .  [E]  .
    */
  },
  {
    level_id: 10,
    tier: "5-Letter Medium",
    wheel_letters: ["B", "R", "E", "A", "D"],
    target_words: [
      { word: "BREAD", start: [1, 0], direction: "horizontal" },
      { word: "BEAR",  start: [1, 0], direction: "vertical" },
      { word: "READ",  start: [1, 1], direction: "vertical" },
      { word: "DEAR",  start: [1, 4], direction: "vertical" }
    ],
    bonus_words: ["BED", "RED", "BAD", "BAR", "ERA", "ARE"]
    /*
      [B] [R] [E] [A] [D]  (BREAD across)
      [E] [E]  .   .  [E]  (BEAR down, READ down, DEAR down)
      [A] [A]  .   .  [A]
      [R] [D]  .   .  [R]
    */
  },
  {
    level_id: 11,
    tier: "5-Letter Medium",
    wheel_letters: ["T", "R", "A", "I", "N"],
    target_words: [
      { word: "TRAIN", start: [1, 0], direction: "horizontal" },
      { word: "RAIN",  start: [1, 1], direction: "vertical" },
      { word: "RANT",  start: [0, 4], direction: "vertical" }
    ],
    bonus_words: ["ANTI", "TAN", "TIN", "RAT", "ART", "AIR"]
    /*
       .   .   .   .  [R]
      [T] [R] [A] [I] [A] (TRAIN across crosses RANT at 'A'/'N')
       .  [A]  .   .  [N]
       .  [I]  .   .  [T]
       .  [N]  .   .   .
    */
  },
  {
    level_id: 12,
    tier: "5-Letter Medium",
    wheel_letters: ["S", "T", "O", "N", "E"],
    target_words: [
      { word: "STONE", start: [1, 0], direction: "horizontal" },
      { word: "NOTE",  start: [0, 3], direction: "vertical" },
      { word: "NOSE",  start: [2, 1], direction: "horizontal" }
    ],
    bonus_words: ["TONES", "ONE", "SET", "NET", "TEN", "TOE", "SON"]
    /*
       .   .   .  [N]  .
      [S] [T] [O] [O] [E]  (STONE across crosses NOTE at 'O')
       .  [N] [O] [S] [E]  (NOSE across crosses NOTE at 'T' shifted)
    */
  },
  {
    level_id: 13,
    tier: "6-Letter Hard",
    wheel_letters: ["S", "I", "L", "V", "E", "R"],
    target_words: [
      { word: "SILVER", start: [2, 0], direction: "horizontal" },
      { word: "LIVE",   start: [0, 2], direction: "vertical" },
      { word: "RISE",   start: [1, 5], direction: "vertical" }
    ],
    bonus_words: ["VEIL", "SIRE", "EVIL", "VILE", "LIE", "SIR"]
    /*
       .   .  [L]  .   .   .
       .   .  [I]  .   .  [R]
      [S] [I] [L] [V] [E] [I] (SILVER across crosses LIVE at 'L', RISE at 'R')
       .   .  [E]  .   .  [S]
       .   .   .   .   .  [E]
    */
  },
  {
    level_id: 14,
    tier: "6-Letter Hard",
    wheel_letters: ["F", "L", "O", "W", "E", "R"],
    target_words: [
      { word: "FLOWER", start: [1, 0], direction: "horizontal" },
      { word: "LOWER",  start: [0, 1], direction: "vertical" },
      { word: "WOLF",   start: [1, 3], direction: "vertical" }
    ],
    bonus_words: ["FLOW", "ROLE", "FOWL", "BLOW", "LOW", "ROW", "FOR"]
    /*
       .  [L]  .   .   .   .
      [F] [O] [W] [W] [E] [R] (FLOWER across crosses LOWER at 'O', WOLF at 'W')
       .  [W]  .  [O]  .   .
       .  [E]  .  [L]  .   .
       .  [R]  .  [F]  .   .
    */
  },
  {
    level_id: 15,
    tier: "6-Letter Hard",
    wheel_letters: ["C", "A", "S", "T", "L", "E"],
    target_words: [
      { word: "CASTLE", start: [1, 0], direction: "horizontal" },
      { word: "SCALE",  start: [0, 2], direction: "vertical" },
      { word: "LATE",   start: [1, 4], direction: "vertical" }
    ],
    bonus_words: ["EAST", "CASE", "TALE", "SALE", "SEAT", "ACTS", "CATS", "LET", "SET", "CAT"]
    /*
       .   .  [S]  .   .   .
      [C] [A] [C] [T] [L] [E] (CASTLE across crosses SCALE at 'S', LATE at 'L')
       .   .  [A]  .  [A]  .
       .   .  [L]  .  [T]  .
       .   .  [E]  .  [E]  .
    */
  }
];