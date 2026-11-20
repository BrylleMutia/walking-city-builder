// The app's tsconfig has no Node types (it's React Native code), so type the
// little of `fs` this test needs here. Jest runs it in Node from the project root.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as {
  readdirSync(path: string): string[];
  readFileSync(path: string, encoding: 'utf8'): string;
  statSync(path: string): { isDirectory(): boolean };
};
const join = (...parts: string[]) => parts.join('/');

/**
 * Guards against "mojibake": UTF-8 text that was read as Windows-1252/Latin-1
 * and saved back as UTF-8, so a ’ turns into â€™ on screen. It slipped into
 * player-facing toasts once (2026-11-20) and nothing else catches it: the
 * garbled text is still valid TypeScript.
 */
const ROOT = 'src';
// A lead byte of a 2–4 byte UTF-8 sequence (as a Latin-1 char) followed by a
// continuation byte (as a C1 control or Latin-1 char): never legitimate copy.
const GARBLED = /[Â-ô][\u0080-¿]/;

function files(dir: string): string[] {
  return fs.readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (fs.statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx|json)$/.test(name) ? [path] : [];
  });
}

it('source files contain no double-encoded UTF-8', () => {
  const bad = files(ROOT).flatMap((path) =>
    fs.readFileSync(path, 'utf8')
      .split('\n')
      .flatMap((line, i) => (GARBLED.test(line) ? [`${path.slice(ROOT.length + 1)}:${i + 1}`] : [])),
  );
  expect(bad).toEqual([]);
});
