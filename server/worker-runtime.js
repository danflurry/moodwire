const FEEDS = [
  { name: "BBC", url: "https://feeds.bbci.co.uk/news/rss.xml", site: "https://www.bbc.com/news" },
  { name: "NPR", url: "https://feeds.npr.org/1001/rss.xml", site: "https://www.npr.org/sections/news/" },
  { name: "The New York Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", site: "https://www.nytimes.com/" },
  { name: "The Guardian", url: "https://www.theguardian.com/international/rss", site: "https://www.theguardian.com/international" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", site: "https://www.aljazeera.com/" },
  { name: "Deutsche Welle", url: "https://rss.dw.com/rdf/rss-en-all", site: "https://www.dw.com/en/" },
  { name: "France 24", url: "https://www.france24.com/en/rss", site: "https://www.france24.com/en/" },
  { name: "CBC News", url: "https://www.cbc.ca/webfeed/rss/rss-topstories", site: "https://www.cbc.ca/news" },
  { name: "ABC News", url: "https://abcnews.go.com/abcnews/topstories", site: "https://abcnews.go.com/" },
  { name: "NBC News", url: "https://feeds.nbcnews.com/nbcnews/public/news", site: "https://www.nbcnews.com/" },
  { name: "Fox News", url: "https://moxie.foxnews.com/google-publisher/latest.xml", site: "https://www.foxnews.com/" },
  { name: "PBS News", url: "https://www.pbs.org/newshour/feeds/rss/headlines", site: "https://www.pbs.org/newshour/" },
  { name: "Sky News", url: "https://feeds.skynews.com/feeds/rss/home.xml", site: "https://news.sky.com/" },
  { name: "Politico", url: "https://rss.politico.com/politics-news.xml", site: "https://www.politico.com/" },
  { name: "ProPublica", url: "https://www.propublica.org/feeds/propublica/main", site: "https://www.propublica.org/" },
  { name: "TIME", url: "https://time.com/feed/", site: "https://time.com/" },
  { name: "Financial Times", url: "https://www.ft.com/rss/home/international", site: "https://www.ft.com/" },
  { name: "RNZ News", url: "https://www.rnz.co.nz/rss/news.xml", site: "https://www.rnz.co.nz/news" },
  { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", site: "https://arstechnica.com/" },
  { name: "The Conversation", url: "https://theconversation.com/us/articles.atom", site: "https://theconversation.com/us" },
];

const STOP_WORDS = new Set("a an and are as at be been being but by for from had has have he her hers him his how i if in into is it its just may more most new no not of on or our out over she so than that the their them there they this to under up was we were what when where which who why will with would you your after before amid across says say said latest live news update updates".split(" "));
const MAX_CACHE_AGE = 60_000;
const MAX_FEED_BYTES = 1_100_000;
let memorySnapshot = null;
let refreshPromise = null;
const mutationWindows = new Map();
const LOCAL_MUTATION_LIMIT = 12;
const LOCAL_MUTATION_WINDOW = 10_000;
const GLOBAL_MUTATION_LIMIT = 60;
const GLOBAL_MUTATION_WINDOW = 60_000;

const demoSource = (name, url) => ({ name, url, domain: new URL(url).hostname });
const DEMO_STORIES = [
  { id: "preview-markets", headline: "Global markets rise as investors weigh a cooler inflation outlook", sources: [demoSource("BBC", "https://www.bbc.com/news"), demoSource("The New York Times", "https://www.nytimes.com/"), demoSource("The Guardian", "https://www.theguardian.com/international"), demoSource("NPR", "https://www.npr.org/sections/news/"), demoSource("Deutsche Welle", "https://www.dw.com/en/"), demoSource("NBC News", "https://www.nbcnews.com/"), demoSource("CBC News", "https://www.cbc.ca/news"), demoSource("Sky News", "https://news.sky.com/")], publishedAt: Date.now() - 12 * 60_000 },
  { id: "preview-climate", headline: "Cities accelerate heat plans ahead of another record summer", sources: [demoSource("The Guardian", "https://www.theguardian.com/international"), demoSource("Al Jazeera", "https://www.aljazeera.com/"), demoSource("BBC", "https://www.bbc.com/news"), demoSource("PBS News", "https://www.pbs.org/newshour/"), demoSource("France 24", "https://www.france24.com/en/"), demoSource("TIME", "https://time.com/")], publishedAt: Date.now() - 18 * 60_000 },
  { id: "preview-science", headline: "Deep-sea expedition finds life thriving beyond the reach of light", sources: [demoSource("NPR", "https://www.npr.org/sections/news/"), demoSource("BBC", "https://www.bbc.com/news"), demoSource("The New York Times", "https://www.nytimes.com/"), demoSource("Deutsche Welle", "https://www.dw.com/en/")], publishedAt: Date.now() - 31 * 60_000 },
  { id: "preview-talks", headline: "Leaders reopen talks with a narrow path toward an agreement", sources: [demoSource("Al Jazeera", "https://www.aljazeera.com/"), demoSource("France 24", "https://www.france24.com/en/"), demoSource("BBC", "https://www.bbc.com/news"), demoSource("The Guardian", "https://www.theguardian.com/international"), demoSource("NPR", "https://www.npr.org/sections/news/")], publishedAt: Date.now() - 43 * 60_000 },
  { id: "preview-storm", headline: "Coastal communities prepare as a powerful storm changes course", sources: [demoSource("NBC News", "https://www.nbcnews.com/"), demoSource("CBC News", "https://www.cbc.ca/news"), demoSource("BBC", "https://www.bbc.com/news"), demoSource("Sky News", "https://news.sky.com/"), demoSource("The New York Times", "https://www.nytimes.com/"), demoSource("PBS News", "https://www.pbs.org/newshour/"), demoSource("TIME", "https://time.com/")], publishedAt: Date.now() - 54 * 60_000 },
  { id: "preview-energy", headline: "A new battery design promises faster charging with fewer rare materials", sources: [demoSource("Ars Technica", "https://arstechnica.com/"), demoSource("BBC", "https://www.bbc.com/news"), demoSource("TIME", "https://time.com/"), demoSource("NPR", "https://www.npr.org/sections/news/")], publishedAt: Date.now() - 71 * 60_000 },
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...securityHeaders() } });
}

function securityHeaders() {
  return {
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  };
}

function decodeXml(value = "") {
  const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(x?[0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code.replace(/^x/i, ""), code[0]?.toLowerCase() === "x" ? 16 : 10)))
    .replace(/&([a-z]+);/gi, (match, name) => entities[name.toLowerCase()] ?? match)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tagValue(block, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function canonicalUrl(value) {
  try {
    const url = new URL(decodeXml(value));
    if (!/^https?:$/.test(url.protocol)) return "";
    for (const key of [...url.searchParams.keys()]) if (/^(utm_|gclid|fbclid|cmpid|ocid)/i.test(key)) url.searchParams.delete(key);
    url.hash = "";
    return url.href;
  } catch { return ""; }
}

function parseFeed(xml, feed) {
  const itemBlocks = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi);
  const entryBlocks = xml.match(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi);
  const blocks = itemBlocks?.length ? itemBlocks : entryBlocks || [];
  const items = [];
  for (const block of blocks.slice(0, 10)) {
    const title = tagValue(block, "title").replace(/\s[-|]\s[^-|]{2,35}$/u, "").trim();
    const rssLink = tagValue(block, "link") || tagValue(block, "guid");
    const atomLink = block.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i)?.[1] || "";
    const link = canonicalUrl(rssLink || atomLink);
    const dateText = tagValue(block, "pubDate") || tagValue(block, "dc:date") || tagValue(block, "published") || tagValue(block, "updated");
    const publishedAt = Number.isFinite(Date.parse(dateText)) ? Date.parse(dateText) : Date.now();
    if (title.length < 14 || !link) continue;
    items.push({ title, link, publishedAt, source: { name: feed.name, domain: new URL(feed.site).hostname } });
  }
  return items;
}

function titleTokens(title) {
  return new Set(title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((token) => token.length > 2 && !STOP_WORDS.has(token)));
}

function similarity(left, right) {
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  const smaller = Math.max(1, Math.min(left.size, right.size));
  const union = Math.max(1, left.size + right.size - shared);
  return { shared, score: (shared / smaller) * .72 + (shared / union) * .28 };
}

function hashId(value) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) { result ^= value.charCodeAt(index); result = Math.imul(result, 16777619); }
  return (result >>> 0).toString(36);
}

function chooseConsensus(members) {
  let best = members[0];
  let bestScore = -1;
  for (const candidate of members) {
    let score = 0;
    for (const other of members) score += similarity(candidate.tokens, other.tokens).score;
    score += candidate.title.length >= 42 && candidate.title.length <= 115 ? .35 : 0;
    if (score > bestScore) { best = candidate; bestScore = score; }
  }
  return best.title;
}

function clusterEntries(entries) {
  const clusters = [];
  const cutoff = Date.now() - 48 * 60 * 60_000;
  for (const item of entries.filter((entry) => entry.publishedAt >= cutoff).sort((a, b) => b.publishedAt - a.publishedAt)) {
    item.tokens = titleTokens(item.title);
    if (item.tokens.size < 2) continue;
    let best = null;
    for (const cluster of clusters) {
      const match = similarity(item.tokens, cluster.seed.tokens);
      const acceptable = match.shared >= 3 && match.score >= .48 || match.shared >= 5;
      if (acceptable && (!best || match.score > best.score)) best = { cluster, score: match.score };
    }
    if (best) best.cluster.members.push(item);
    else clusters.push({ seed: item, members: [item] });
  }

  return clusters.map((cluster) => {
    const bySource = new Map();
    for (const member of cluster.members) {
      const current = bySource.get(member.source.name);
      if (!current || member.publishedAt > current.publishedAt) bySource.set(member.source.name, member);
    }
    const members = [...bySource.values()];
    const headline = chooseConsensus(members);
    const terms = [...titleTokens(headline)].sort().slice(0, 10).join("-") || members[0].link;
    const publishedAt = Math.max(...members.map((member) => member.publishedAt));
    const ageHours = Math.max(0, (Date.now() - publishedAt) / 3_600_000);
    return {
      id: `story-${hashId(terms)}`,
      headline,
      publishedAt,
      sources: members.slice(0, 16).map((member) => ({ name: member.source.name, url: member.link, domain: member.source.domain, publishedAt: member.publishedAt })),
      interactions: Math.round(members.length * 4 + Math.max(0, 24 - ageHours)),
    };
  }).sort((a, b) => {
    const multiA = a.sources.length > 1 ? 1 : 0;
    const multiB = b.sources.length > 1 ? 1 : 0;
    return multiB - multiA || b.sources.length - a.sources.length || b.publishedAt - a.publishedAt;
  }).slice(0, 18);
}

function reconcileStoryIds(stories, previousStories = []) {
  const available = new Map(previousStories.map((story) => [story.id, story]));
  return stories.map((story) => {
    const currentTokens = titleTokens(story.headline);
    const currentUrls = new Set(story.sources.map((source) => canonicalUrl(source.url) || source.url));
    let best = null;
    for (const previous of available.values()) {
      const urlOverlap = previous.sources?.some((source) => currentUrls.has(canonicalUrl(source.url) || source.url));
      const match = similarity(currentTokens, titleTokens(previous.headline || ""));
      if (!urlOverlap && (match.shared < 3 || match.score < .55)) continue;
      const score = match.score + (urlOverlap ? 2 : 0);
      if (!best || score > best.score) best = { previous, score };
    }
    if (!best) return story;
    available.delete(best.previous.id);
    return { ...story, id: best.previous.id };
  });
}

async function readLimitedText(response, limit) {
  if (!response.body?.getReader) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > limit) throw new Error("feed too large");
    return text;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new Error("feed too large");
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

async function fetchOneFeed(feed) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(feed.url, { headers: { accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9", "user-agent": "Moodwire/1.0 (+news aggregation; headline links only)" }, signal: controller.signal, redirect: "follow" });
    if (!response.ok) throw new Error(`${response.status}`);
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > MAX_FEED_BYTES) throw new Error("feed too large");
    const xml = await readLimitedText(response, MAX_FEED_BYTES);
    return { ok: true, items: parseFeed(xml, feed) };
  } catch (error) {
    return { ok: false, items: [], error: error instanceof Error ? error.message : "fetch failed" };
  } finally { clearTimeout(timer); }
}

async function mapLimit(items, concurrency, task) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index]);
    }
  }));
  return results;
}

async function readStoredSnapshot(env) {
  if (!env?.DB) return null;
  try {
    const row = await env.DB.prepare("SELECT payload, refreshed_at AS refreshedAt FROM feed_cache WHERE cache_key = ?").bind("front-page").first();
    if (!row?.payload) return null;
    const payload = JSON.parse(row.payload);
    payload.refreshedAt = Number(row.refreshedAt || payload.refreshedAt || 0);
    return payload;
  } catch { return null; }
}

async function storeSnapshot(env, snapshot) {
  if (!env?.DB) return;
  try {
    await env.DB.prepare("INSERT INTO feed_cache (cache_key, payload, refreshed_at) VALUES (?, ?, ?) ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload, refreshed_at = excluded.refreshed_at").bind("front-page", JSON.stringify(snapshot), snapshot.refreshedAt).run();
  } catch {}
}

async function acquirePollLease(env) {
  if (!env?.DB) return true;
  const now = Date.now();
  try {
    const row = await env.DB.prepare("INSERT INTO jobs (name, locked_until, last_started_at) VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET locked_until = excluded.locked_until, last_started_at = excluded.last_started_at WHERE jobs.locked_until < ? RETURNING name").bind("feed-poll", now + 55_000, now, now).first();
    return Boolean(row);
  } catch { return true; }
}

async function releasePollLease(env, error = null) {
  if (!env?.DB) return;
  try { await env.DB.prepare("UPDATE jobs SET locked_until = 0, last_finished_at = ?, last_error = ? WHERE name = ?").bind(Date.now(), error, "feed-poll").run(); }
  catch {}
}

function demoSnapshot() {
  return { mode: "demo", stories: DEMO_STORIES, refreshedAt: Date.now(), activeSources: 0, totalSources: FEEDS.length };
}

async function refreshFeeds(env) {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const acquired = await acquirePollLease(env);
    if (!acquired) return memorySnapshot || await readStoredSnapshot(env) || demoSnapshot();
    let failure = null;
    try {
      const previous = memorySnapshot || await readStoredSnapshot(env);
      const results = await mapLimit(FEEDS, 5, fetchOneFeed);
      const entries = results.flatMap((result) => result.items);
      const activeSources = results.filter((result) => result.ok && result.items.length).length;
      const stories = reconcileStoryIds(clusterEntries(entries), previous?.stories || []);
      if (!stories.length) throw new Error("No current feed items could be parsed");
      const snapshot = { mode: "live", stories, refreshedAt: Date.now(), activeSources, totalSources: FEEDS.length };
      memorySnapshot = snapshot;
      await storeSnapshot(env, snapshot);
      return snapshot;
    } catch (error) {
      failure = error instanceof Error ? error.message : "Feed refresh failed";
      const fallback = memorySnapshot || await readStoredSnapshot(env) || demoSnapshot();
      memorySnapshot = fallback;
      return fallback;
    } finally {
      await releasePollLease(env, failure);
    }
  })();
  try { return await refreshPromise; }
  finally { refreshPromise = null; }
}

async function snapshotForRequest(env, ctx) {
  const now = Date.now();
  let snapshot = memorySnapshot || await readStoredSnapshot(env);
  if (snapshot && now - Number(snapshot.refreshedAt || 0) < MAX_CACHE_AGE) return { ...snapshot, mode: snapshot.mode === "live" ? "cached" : snapshot.mode };
  if (snapshot) {
    ctx?.waitUntil?.(refreshFeeds(env));
    return { ...snapshot, mode: snapshot.mode === "live" ? "cached" : snapshot.mode };
  }
  return await refreshFeeds(env);
}

async function visitorId(request) {
  const authenticatedId = request.headers.get("oai-authenticated-user-id");
  if (!authenticatedId) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(authenticatedId));
  return `member-${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function storyIsKnown(env, storyId) {
  const snapshot = memorySnapshot || await readStoredSnapshot(env);
  return Boolean(snapshot?.stories?.some((story) => story.id === storyId));
}

async function allowMutation(env, actor) {
  const now = Date.now();
  const current = mutationWindows.get(actor);
  if (!current || now - current.startedAt >= LOCAL_MUTATION_WINDOW) {
    mutationWindows.set(actor, { startedAt: now, count: 1 });
  } else {
    if (current.count >= LOCAL_MUTATION_LIMIT) return false;
    current.count += 1;
  }
  if (mutationWindows.size > 1_000) {
    for (const [key, value] of mutationWindows) if (now - value.startedAt >= LOCAL_MUTATION_WINDOW) mutationWindows.delete(key);
  }
  try {
    const cutoff = now - GLOBAL_MUTATION_WINDOW;
    const row = await env.DB.prepare("INSERT INTO mutation_limits (actor_id, window_started_at, request_count) VALUES (?, ?, 1) ON CONFLICT(actor_id) DO UPDATE SET window_started_at = CASE WHEN mutation_limits.window_started_at <= ? THEN excluded.window_started_at ELSE mutation_limits.window_started_at END, request_count = CASE WHEN mutation_limits.window_started_at <= ? THEN 1 ELSE mutation_limits.request_count + 1 END RETURNING request_count AS requestCount").bind(actor, now, cutoff, cutoff).first();
    return Number(row?.requestCount || 0) <= GLOBAL_MUTATION_LIMIT;
  } catch {
    return false;
  }
}

async function attachCommunityStats(env, request, stories) {
  if (!env?.DB || !stories.length) return stories;
  const ids = stories.map((story) => story.id);
  const placeholders = ids.map(() => "?").join(",");
  const ratings = new Map();
  const interactionCounts = new Map();
  let userVotes = new Map();
  try {
    const ratingRows = await env.DB.prepare(`SELECT story_id AS storyId, emotion, COUNT(*) AS count FROM votes WHERE story_id IN (${placeholders}) GROUP BY story_id, emotion`).bind(...ids).all();
    for (const row of ratingRows.results || []) {
      const current = ratings.get(row.storyId) || { happy: 0, neutral: 0, sad: 0 };
      current[row.emotion] = Number(row.count || 0);
      ratings.set(row.storyId, current);
    }
    const interactionRows = await env.DB.prepare(`SELECT story_id AS storyId, SUM(count) AS count FROM interactions WHERE story_id IN (${placeholders}) GROUP BY story_id`).bind(...ids).all();
    for (const row of interactionRows.results || []) interactionCounts.set(row.storyId, Number(row.count || 0));
    const actor = await visitorId(request);
    if (actor) {
      const voteRows = await env.DB.prepare(`SELECT story_id AS storyId, emotion FROM votes WHERE actor_id = ? AND story_id IN (${placeholders})`).bind(actor, ...ids).all();
      userVotes = new Map((voteRows.results || []).map((row) => [row.storyId, row.emotion]));
    }
  } catch { return stories; }
  return stories.map((story) => ({ ...story, ratings: ratings.get(story.id) || { happy: 0, neutral: 0, sad: 0 }, userVote: userVotes.get(story.id) || null, interactions: Number(story.interactions || 0) + (interactionCounts.get(story.id) || 0) }));
}

async function handleNews(request, env, ctx) {
  const snapshot = await snapshotForRequest(env, ctx) || demoSnapshot();
  const stories = await attachCommunityStats(env, request, snapshot.stories || DEMO_STORIES);
  return json({ ...snapshot, stories });
}

async function parseBody(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 4_096) throw new Error("Request too large");
  const text = await readLimitedText(request, 4_096);
  const body = JSON.parse(text);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid JSON object");
  return body;
}

async function handleVote(request, env) {
  const actor = env?.DB ? await visitorId(request) : null;
  if (env?.DB && !actor) return json({ error: "Authentication required" }, 401);
  let body;
  try { body = await parseBody(request); }
  catch { return json({ error: "Invalid request" }, 400); }
  const storyId = typeof body.storyId === "string" ? body.storyId : "";
  const emotion = typeof body.emotion === "string" ? body.emotion : "";
  if (!/^[a-z0-9_-]{3,100}$/i.test(storyId) || !["happy", "neutral", "sad"].includes(emotion)) return json({ error: "A valid story and emotion are required" }, 400);
  if (!env?.DB) return json({ persisted: false, ratings: null });
  if (!await allowMutation(env, actor)) return json({ error: "Too many updates; please wait a moment" }, 429);
  if (!await storyIsKnown(env, storyId)) return json({ error: "Story not found" }, 404);
  try {
    await env.DB.prepare("INSERT INTO votes (story_id, actor_id, emotion, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(story_id, actor_id) DO UPDATE SET emotion = excluded.emotion, updated_at = excluded.updated_at").bind(storyId, actor, emotion, Date.now()).run();
    const rows = await env.DB.prepare("SELECT emotion, COUNT(*) AS count FROM votes WHERE story_id = ? GROUP BY emotion").bind(storyId).all();
    const ratings = { happy: 0, neutral: 0, sad: 0 };
    for (const row of rows.results || []) ratings[row.emotion] = Number(row.count || 0);
    return json({ persisted: true, storyId, emotion, ratings });
  } catch { return json({ persisted: false, ratings: null }); }
}

async function handleInteraction(request, env) {
  const actor = env?.DB ? await visitorId(request) : null;
  if (env?.DB && !actor) return json({ error: "Authentication required" }, 401);
  let body;
  try { body = await parseBody(request); }
  catch { return json({ error: "Invalid request" }, 400); }
  const storyId = typeof body.storyId === "string" ? body.storyId : "";
  const kind = typeof body.kind === "string" ? body.kind : "";
  if (!/^[a-z0-9_-]{3,100}$/i.test(storyId) || !["flip", "source_open"].includes(kind)) return json({ error: "Invalid interaction" }, 400);
  if (!env?.DB) return json({ persisted: false });
  if (!await allowMutation(env, actor)) return json({ error: "Too many updates; please wait a moment" }, 429);
  if (!await storyIsKnown(env, storyId)) return json({ error: "Story not found" }, 404);
  try {
    await env.DB.prepare("INSERT INTO interactions (story_id, actor_id, kind, count, last_at) VALUES (?, ?, ?, 1, ?) ON CONFLICT(story_id, actor_id, kind) DO UPDATE SET count = CASE WHEN interactions.last_at <= excluded.last_at - 750 THEN interactions.count + 1 ELSE interactions.count END, last_at = CASE WHEN interactions.last_at <= excluded.last_at - 750 THEN excluded.last_at ELSE interactions.last_at END").bind(storyId, actor, kind, Date.now()).run();
    return json({ persisted: true });
  } catch { return json({ persisted: false }); }
}

async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/") return new Response(INDEX_HTML, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache", ...securityHeaders() } });
  if (request.method === "GET" && url.pathname === "/styles.css") return new Response(STYLES_CSS, { headers: { "content-type": "text/css; charset=utf-8", "cache-control": "public, max-age=300", ...securityHeaders() } });
  if (request.method === "GET" && url.pathname === "/app.js") return new Response(CLIENT_JS, { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=300", ...securityHeaders() } });
  if (request.method === "GET" && url.pathname === "/api/news") return handleNews(request, env, ctx);
  if (request.method === "POST" && url.pathname === "/api/vote") return handleVote(request, env);
  if (request.method === "POST" && url.pathname === "/api/interaction") return handleInteraction(request, env);
  if (request.method === "GET" && url.pathname === "/api/health") {
    const snapshot = memorySnapshot || await readStoredSnapshot(env);
    return json({ ok: true, refreshedAt: snapshot?.refreshedAt || null, activeSources: snapshot?.activeSources || 0, totalSources: FEEDS.length });
  }
  if (request.method === "GET" && url.pathname === "/robots.txt") return new Response("User-agent: *\nDisallow:\n", { headers: { "content-type": "text/plain; charset=utf-8" } });
  return new Response("Not found", { status: 404, headers: securityHeaders() });
}

export default {
  fetch(request, env, ctx) { return handleRequest(request, env, ctx); },
  scheduled(_controller, env, ctx) { ctx.waitUntil(refreshFeeds(env)); },
};
