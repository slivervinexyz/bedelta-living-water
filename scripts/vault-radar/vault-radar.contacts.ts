import type { PublicContactTags } from "./vault-radar.types";

export function extractPublicContacts(text: string): PublicContactTags {
  const websites: string[] = [];
  const rawHandles: string[] = [];
  let twitter: string | undefined;
  let discord: string | undefined;
  let telegram: string | undefined;

  const urlRe =
    /https?:\/\/(?:twitter\.com|x\.com)\/([A-Za-z0-9_]{1,15})/gi;
  const discordRe =
    /(?:https?:\/\/)?(?:discord\.gg|discord\.com\/invite)\/([A-Za-z0-9-]+)/gi;
  const tgRe = /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([A-Za-z0-9_]{3,})/gi;
  const siteRe = /https?:\/\/[^\s)]+/gi;
  const handleRe = /@([A-Za-z0-9_]{2,15})/g;

  for (const m of text.matchAll(urlRe)) {
    twitter = `@${m[1]}`;
  }
  for (const m of text.matchAll(discordRe)) {
    discord = `discord.gg/${m[1]}`;
  }
  for (const m of text.matchAll(tgRe)) {
    telegram = `t.me/${m[1]}`;
  }
  for (const m of text.matchAll(siteRe)) {
    const url = m[0]!.replace(/[.,]+$/, "");
    if (!/twitter|x\.com|discord|t\.me|telegram/.test(url)) websites.push(url);
  }
  for (const m of text.matchAll(handleRe)) {
    rawHandles.push(`@${m[1]}`);
    if (!twitter) twitter = `@${m[1]}`;
  }

  return { twitter, discord, telegram, websites, rawHandles };
}

export function leaderDisplayName(
  contacts: PublicContactTags,
  leaderAddress: string,
): string {
  if (contacts.twitter) return contacts.twitter.replace(/^@/, "");
  if (contacts.rawHandles[0]) return contacts.rawHandles[0]!.replace(/^@/, "");
  return `${leaderAddress.slice(0, 6)}…${leaderAddress.slice(-4)}`;
}
