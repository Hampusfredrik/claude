// Words in a box's notes, as shown on the box ("12 words"). A word is a run of
// letters/digits, optionally joined by an apostrophe or hyphen (don't, x-ray).
// Markdown image syntax ![alt](url) is not counted.
export const countWords = (text) => ((text || '').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || []).length;
