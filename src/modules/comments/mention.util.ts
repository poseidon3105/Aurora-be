export interface MentionableUser {
  id: number;
  fullName: string;
  email: string;
}

function normalizeMentionName(name: string): string {
  return name
    .normalize('NFKC')
    .trim()
    .replace(/\s+/gu, ' ')
    .toLocaleLowerCase();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Resolves mentions against the active project-member list.
 *
 * Only exact full-name matches are accepted. When more than one active member
 * shares the same normalized full name, that name is intentionally ignored so
 * a mention cannot notify an arbitrary user.
 */
export function resolveMentionedUsers(
  content: string,
  users: MentionableUser[],
): MentionableUser[] {
  const usersByName = new Map<string, MentionableUser>();
  const ambiguousNames = new Set<string>();

  for (const user of users) {
    const normalizedName = normalizeMentionName(user.fullName);
    if (!normalizedName || ambiguousNames.has(normalizedName)) continue;

    if (usersByName.has(normalizedName)) {
      usersByName.delete(normalizedName);
      ambiguousNames.add(normalizedName);
      continue;
    }

    usersByName.set(normalizedName, user);
  }

  const mentionableNames = [...usersByName.entries()]
    .sort(([left], [right]) => right.length - left.length)
    .map(([name]) => escapeRegex(name));

  if (mentionableNames.length === 0) return [];

  // A mention ends at whitespace, punctuation, another @, or end of content.
  const mentionRegex = new RegExp(
    `@(${mentionableNames.join('|')})(?=$|[\\s.,!?;:()[\\]{}"'“”‘’@])`,
    'giu',
  );
  const mentionedUsers = new Map<number, MentionableUser>();
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(content)) !== null) {
    const user = usersByName.get(normalizeMentionName(match[1]));
    if (user) {
      mentionedUsers.set(user.id, user);
    }
  }

  return [...mentionedUsers.values()];
}