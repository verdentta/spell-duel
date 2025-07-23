export function parseUnicodeRange(range: string): [number, number] {
  if (range.includes('-')) {
    const [start, end] = range.split('-');

    const parsedStart = parseInt(start.replace('U+', ''), 16);
    const parsedEnd = parseInt(end.replace('U+', ''), 16);

    return [parsedStart, parsedEnd];
  }

  const parsedStart = parseInt(range.replace('U+', ''), 16);
  const parsedEnd = parsedStart;

  return [parsedStart, parsedEnd];
}

export function isCharacterInUnicodeRange(
  char: string,
  range: [number, number]
) {
  const charCode = char.charCodeAt(0);
  return charCode >= range[0] && charCode <= range[1];
}
