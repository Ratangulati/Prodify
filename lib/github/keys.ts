export type KeySource = 'branch name' | 'title' | 'description'

/**
 * Finds task keys like PROD-42 in a PR's branch name, title and description.
 * Matching ignores case (branch names are usually lowercase: prod-42-fix-x).
 * Returns each task number once, with the first place it was found.
 */
export function findTaskKeys(
  prefix: string,
  pr: { branch: string; title: string; body: string },
): Map<number, KeySource> {
  // Escape the prefix so it's matched literally, e.g. "PROD" → /\bPROD-(\d+)\b/gi
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`\\b${escaped}-(\\d+)\\b`, 'gi')

  const found = new Map<number, KeySource>()
  const sources: [KeySource, string][] = [['branch name', pr.branch], ['title', pr.title], ['description', pr.body]]
  for (const [source, text] of sources) {
    for (const match of Array.from(text.matchAll(pattern))) {
      const number = Number(match[1])
      if (!found.has(number)) found.set(number, source)
    }
  }
  return found
}
