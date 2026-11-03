import { describe, it, expect } from 'vitest';
import { countWords } from '../src/model/wordcount.js';

describe('countWords', () => {
  it('counts runs of letters and digits', () => {
    expect(countWords('Sleep is a core process.')).toBe(5);
    expect(countWords('')).toBe(0);
    expect(countWords(null)).toBe(0);
    expect(countWords('   \n\t ')).toBe(0);
  });
  it('keeps apostrophes and hyphens inside a word', () => {
    expect(countWords("don't stop the x-ray")).toBe(4);
    expect(countWords('rock’n’roll')).toBe(1);
    expect(countWords('a - b')).toBe(2);
  });
  it('counts non-English letters and numbers', () => {
    expect(countWords('Åkerjord och crème brûlée')).toBe(4);
    expect(countWords('24 h clock, 5,5 mg')).toBe(6);
  });
  it('ignores markdown syntax and images (a list number counts as a word)', () => {
    expect(countWords('**bold** and *italic*\n- item one\n1. item two')).toBe(8);
    expect(countWords('before ![a photo](http://x.y/z.png) after')).toBe(2);
    expect(countWords('See [[n4]] and [1]')).toBe(4);
  });
});
