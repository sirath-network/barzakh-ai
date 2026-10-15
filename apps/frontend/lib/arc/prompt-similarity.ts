/** Ignore cosmetic edits when deciding whether the model actually rewrote a draft. */
export function isRepeatedPrompt(previous: string, candidate: string): boolean {
	const words = (text: string) =>
		text
			.toLowerCase()
			.normalize("NFKC")
			.match(/[\p{L}\p{N}]+/gu) || [];
	const before = words(previous);
	const after = words(candidate);
	if (!before.length) return false;
	if (before.join(" ") === after.join(" ")) return true;
	if (before.length < 5 || after.length < 5) return false;
	const shingles = (tokens: string[]) =>
		new Set(
			tokens.slice(0, -2).map((_, i) => tokens.slice(i, i + 3).join(" ")),
		);
	const a = shingles(before);
	const b = shingles(after);
	const overlap = [...a].filter((item) => b.has(item)).length;
	return (2 * overlap) / (a.size + b.size) >= 0.8;
}
