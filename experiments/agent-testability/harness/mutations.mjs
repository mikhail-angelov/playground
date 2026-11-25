export const controls = {
  add: { statement: "case '+': return a + b;", correct: 20, wrong: 4, operator: "-" },
  multiply: { statement: "case '×': return a * b;", correct: 42, wrong: 13, operator: "+" },
};

export function mutate(fixture, kind) {
  const control = controls[kind];
  const original = fixture.upstreamChunks.map(({ text }) => text).join("");
  const deltas = [];
  let source = "";
  for (const match of original.matchAll(/^data: (\{[^\r\n]*\})/gm)) {
    const content = match[1].match(/"delta":\{"content":("(?:[^"\\]|\\.)*")/u);
    if (!content) continue;
    const text = JSON.parse(content[1]);
    deltas.push({ offset: match.index + 6 + content.index + content[0].length - content[1].length, raw: content[1], text });
    source += text;
  }
  if (source.split(control.statement).length !== 2) throw new Error(`Could not uniquely find the ${kind} computation.`);

  // The substitution is one ASCII operator. Keep all recorded SSE and timing boundaries intact.
  const operatorAt = source.indexOf(control.statement) + control.statement.indexOf(" b") - 1;
  let cursor = 0;
  for (const { offset, raw, text } of deltas) {
    if (cursor + text.length > operatorAt) {
      const within = operatorAt - cursor;
      const replacement = JSON.stringify(text.slice(0, within) + control.operator + text.slice(within + 1));
      if (replacement.length !== raw.length ||
          [...raw].filter((character, index) => character !== replacement[index]).length !== 1) {
        throw new Error("Mutation would alter the recorded SSE representation.");
      }
      const altered = original.slice(0, offset) + replacement + original.slice(offset + raw.length);
      let start = 0;
      const upstreamChunks = fixture.upstreamChunks.map(({ atMs, text }) => {
        const mutated = altered.slice(start, start + text.length);
        start += text.length;
        return { atMs, text: mutated };
      });
      return { ...fixture, upstreamChunks };
    }
    cursor += text.length;
  }
  throw new Error("Mutation offset was lost in the recording.");
}
