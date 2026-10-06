// Default map colours by kind of line, guessed from the layer name. The admin can change any colour.
// Names are matched from the start of a word, so "AIR VALVE" does not count as low voltage.
const starts = (words: string) => new RegExp(`(^|[^a-z])(${words})`, "i");
const KEYWORDS: [RegExp, string][] = [
  [starts("elec|dewa|sewa|lv([^a-z]|$)|mv([^a-z]|$)|hv([^a-z]|$)|kv|pwr|power"), "#e53935"], // power: red
  [starts("irr"), "#2e9e4f"],                                                               // irrigation: green
  [starts("pw([^a-z]|$)|water|wtr|potable"), "#1e88e5"],                                    // potable water: blue
  [starts("etc|etisalat|tel|fib|comm"), "#8e44ad"],                                         // telecom: purple
  [starts("sew|swd|drain|storm|ssd"), "#8d6e63"],                                           // sewer and drainage: brown
  [starts("gas"), "#f9a825"],                                                               // gas: yellow
];
const PALETTE = ["#00acc1", "#fb8c00", "#3949ab", "#d81b60", "#546e7a", "#c0ca33", "#6d4c41", "#43a047"];

export function colorFor(layer: string, index: number): string {
  for (const [re, color] of KEYWORDS) if (re.test(layer)) return color;
  return PALETTE[index % PALETTE.length];
}
