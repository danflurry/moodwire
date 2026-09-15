import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

globalThis.fetch = async () => new Response("Feed unavailable", { status: 503 });
const moduleUrl = pathToFileURL(resolve(import.meta.dirname, "../dist/server/index.js"));
const { default: worker } = await import(`${moduleUrl.href}?smoke=${Date.now()}`);
const context = { waitUntil() {} };

const page = await worker.fetch(new Request("https://moodwire.test/"), {}, context);
assert.equal(page.status, 200);
const pageText = await page.text();
assert.match(pageText, /Moodwire live emotional news map/);
assert.match(pageText, /MORE POPULAR/);
assert.match(pageText, /LESS POPULAR/);
assert.match(pageText, /id="mood-filter-happy"/);
assert.match(pageText, /id="mood-filter-sad"/);
assert.match(pageText, /id="mood-filter-happy"[^>]+min="0" max="100"/);
assert.match(pageText, /id="mood-filter-sad"[^>]+min="0" max="100"/);
assert.match(pageText, /Filter stories by aggregate mood/);

const script = await worker.fetch(new Request("https://moodwire.test/app.js"), {}, context);
assert.equal(script.headers.get("content-type"), "text/javascript; charset=utf-8");
const scriptText = await script.text();
assert.match(scriptText, /class="back-headline"/);
assert.match(scriptText, /class="flip-count"/);
assert.match(scriptText, /card\.dataset\.userVote = selected \|\| ""/);
assert.match(scriptText, /area: 4, w: 2, h: 2/);
assert.match(scriptText, /preferredRatio/);
assert.match(scriptText, /function visibleStories\(\)/);
assert.match(scriptText, /moodMinPosition/);
assert.match(scriptText, /moodMaxPosition/);
assert.match(scriptText, /moodHappyFilter\?\.addEventListener\("input", \(\) => applyMoodFilter\("left"\)\)/);
assert.match(scriptText, /moodSadFilter\?\.addEventListener\("input", \(\) => applyMoodFilter\("right"\)\)/);
assert.match(scriptText, /moodHappyFilter\.max = String\(right\)/);
assert.match(scriptText, /moodSadFilter\.min = String\(left\)/);
assert.match(scriptText, /let low = \.75/);
assert.match(scriptText, /card\.classList\.add\("headline-tight"\)/);
assert.match(scriptText, /const moodCenter = widestHalf \+ \(moodPosition\(story\) \/ 100\)/);
assert.match(scriptText, /placement\.moodCenter = moodCenter/);
assert.match(scriptText, /return visibleStories\(\)\.map/);
assert.doesNotMatch(scriptText, /class="card-index"/);
assert.doesNotMatch(scriptText, /class="consensus"/);
assert.doesNotMatch(scriptText, /class="back-kicker"/);
assert.doesNotMatch(scriptText, /class="mood-word"/);
assert.doesNotMatch(scriptText, /ICONS\.(?:happy|neutral|sad)/);
assert.doesNotMatch(scriptText, /label: "(?:hopeful|concerned|uplifted|heavy|balanced)"/);

const stylesheet = await worker.fetch(new Request("https://moodwire.test/styles.css"), {}, context);
const stylesheetText = await stylesheet.text();
assert.doesNotMatch(stylesheetText, /-webkit-line-clamp/);
assert.match(stylesheetText, /\.flip-button::before/);
assert.match(stylesheetText, /data-user-vote="happy"/);
assert.match(stylesheetText, /\.card-front[^\n]*background-color: var\(--mood-color\)/);
assert.match(stylesheetText, /\.card-back[^\n]*background-color: var\(--mood-deep\)/);
assert.match(stylesheetText, /\.card-front[^\n]*background-image: none/);
assert.match(stylesheetText, /\.card-back[^\n]*background-image: none/);
assert.match(stylesheetText, /background-color: #242a32/);
assert.match(stylesheetText, /\.card-front::after, \.card-back::after/);
assert.match(stylesheetText, /\.vertical-axis/);
assert.match(stylesheetText, /\.story-card\.is-flipped \.card-back \{ visibility: visible/);
assert.match(stylesheetText, /\.story-card\.is-flipped \.card-front \{ visibility: hidden/);
assert.match(stylesheetText, /\.flip-button::before, \.back-button::before/);
assert.match(stylesheetText, /\.mood-filter-range\.left-boundary::/);
assert.match(stylesheetText, /\.mood-filter-range\.right-boundary::/);
assert.match(stylesheetText, /\.story-card\.headline-tight \.card-meta \{ display: none/);
assert.match(stylesheetText, /clip-path: polygon\(0 0, 100% 50%, 0 100%\)/);
assert.match(stylesheetText, /clip-path: polygon\(100% 0, 0 50%, 100% 100%\)/);
assert.match(stylesheetText, /\.reaction-button\[data-value="happy"\] \{ background:/);
assert.match(stylesheetText, /\.reaction-button\[data-value="neutral"\] \{ background:/);
assert.match(stylesheetText, /\.reaction-button\[data-value="sad"\] \{ background:/);
assert.doesNotMatch(stylesheetText, /\.card-face::before/);
assert.doesNotMatch(stylesheetText, /@media \(hover: none\), \(pointer: coarse\) \{\s*\.touch-rate/);
assert.match(stylesheetText, /\.map-body[^\n]*display: block/);
assert.doesNotMatch(stylesheetText, /\.flip-button[^\n]*transform:/);

const news = await worker.fetch(new Request("https://moodwire.test/api/news"), {}, context);
const payload = await news.json();
assert.equal(payload.mode, "demo");
assert.ok(payload.stories.length >= 4);

const sampleFeed = `<?xml version="1.0"?><rss><channel><item><title>Coastal cities prepare as powerful storm changes course</title><link>https://example.com/storm</link><pubDate>${new Date().toUTCString()}</pubDate></item><item><title>Researchers announce promising battery material breakthrough</title><link>https://example.com/battery</link><pubDate>${new Date().toUTCString()}</pubDate></item></channel></rss>`;
globalThis.fetch = async () => new Response(sampleFeed, { status: 200, headers: { "content-type": "application/rss+xml" } });
const { default: liveWorker } = await import(`${moduleUrl.href}?smoke-live=${Date.now()}`);
const liveNews = await liveWorker.fetch(new Request("https://moodwire.test/api/news"), {}, context);
const livePayload = await liveNews.json();
assert.equal(livePayload.mode, "live");
assert.equal(livePayload.activeSources, 20);
assert.ok(livePayload.stories.some((story) => story.sources.length === 16));

const clusteringTitles = new Map([
  ["feeds.bbci.co.uk", "Supreme Court rejects Trump's mail-in ballot restrictions for midterms"],
  ["feeds.npr.org", "Supreme Court blocks Trump's plan to restrict mail-in ballots"],
  ["rss.nytimes.com", "US confirms for first time it has deployed weapons in space"],
  ["www.theguardian.com", "US confirms it has weapons in space to counter hostile powers"],
  ["www.aljazeera.com", "Supreme Court hears challenge to online age verification law"],
]);
globalThis.fetch = async (url) => {
  const hostname = new URL(String(url)).hostname;
  const title = clusteringTitles.get(hostname);
  if (!title) return new Response("Unavailable", { status: 503 });
  const feed = `<?xml version="1.0"?><rss><channel><item><title>${title}</title><link>https://${hostname}/story-${encodeURIComponent(title)}</link><pubDate>${new Date().toUTCString()}</pubDate></item></channel></rss>`;
  return new Response(feed, { status: 200, headers: { "content-type": "application/rss+xml" } });
};
const { default: clusteringWorker } = await import(`${moduleUrl.href}?smoke-clustering=${Date.now()}`);
const clusteredNews = await clusteringWorker.fetch(new Request("https://moodwire.test/api/news"), {}, context);
const clusteredPayload = await clusteredNews.json();
assert.equal(clusteredPayload.mode, "live");
assert.equal(clusteredPayload.activeSources, clusteringTitles.size);
assert.deepEqual(clusteredPayload.stories.map((story) => story.sources.length).sort((a, b) => b - a), [2, 2, 1]);
assert.ok(clusteredPayload.stories.some((story) => /mail-in ballot/i.test(story.headline) && story.sources.length === 2));
assert.ok(clusteredPayload.stories.some((story) => /weapons in space/i.test(story.headline) && story.sources.length === 2));

const localVote = await liveWorker.fetch(new Request("https://moodwire.test/api/vote", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ storyId: livePayload.stories[0].id, emotion: "happy" }),
}), {}, context);
assert.equal(localVote.status, 200);
assert.equal((await localVote.json()).persisted, false);

const storedVotes = new Map();
const globalRateCounts = new Map();
const fakeDb = {
  prepare(sql) {
    return {
      bind(...args) {
        return {
          async first() {
            if (sql.includes("INSERT INTO mutation_limits")) {
              const actor = args[0];
              const count = (globalRateCounts.get(actor) || 0) + 1;
              globalRateCounts.set(actor, count);
              return { requestCount: count };
            }
            if (sql.includes("SELECT payload")) return { payload: JSON.stringify(livePayload), refreshedAt: livePayload.refreshedAt };
            return null;
          },
          async run() {
            if (sql.includes("INSERT INTO votes")) storedVotes.set(`${args[0]}:${args[1]}`, args[2]);
            return { success: true };
          },
          async all() {
            if (sql.includes("SELECT emotion, COUNT(*)")) {
              const counts = new Map();
              for (const [key, emotion] of storedVotes) if (key.startsWith(`${args[0]}:`)) counts.set(emotion, (counts.get(emotion) || 0) + 1);
              return { results: [...counts].map(([emotion, count]) => ({ emotion, count })) };
            }
            return { results: [] };
          },
        };
      },
    };
  },
};
const dbEnv = { DB: fakeDb };
const knownStoryId = livePayload.stories[0].id;
const pagesOrigin = "https://danflurry.github.io";
const voteRequest = (storyId, extraHeaders = {}, body = { storyId, emotion: "happy" }) => new Request("https://moodwire.test/api/vote", {
  method: "POST",
  headers: { "content-type": "application/json", ...extraHeaders },
  body: JSON.stringify(body),
});

const unauthenticated = await liveWorker.fetch(voteRequest(knownStoryId), dbEnv, context);
assert.equal(unauthenticated.status, 401);
const preflight = await liveWorker.fetch(new Request("https://moodwire.test/api/vote", {
  method: "OPTIONS",
  headers: { origin: pagesOrigin, "access-control-request-method": "POST", "access-control-request-headers": "content-type,x-moodwire-visitor" },
}), dbEnv, context);
assert.equal(preflight.status, 204);
assert.equal(preflight.headers.get("access-control-allow-origin"), pagesOrigin);
const deniedPreflight = await liveWorker.fetch(new Request("https://moodwire.test/api/vote", {
  method: "OPTIONS",
  headers: { origin: "https://example.com" },
}), dbEnv, context);
assert.equal(deniedPreflight.status, 403);
assert.equal(deniedPreflight.headers.get("access-control-allow-origin"), null);
const nullBody = await liveWorker.fetch(voteRequest(knownStoryId, { "oai-authenticated-user-id": "reviewer-null" }, null), dbEnv, context);
assert.equal(nullBody.status, 400);
const unknownStory = await liveWorker.fetch(voteRequest("story-does-not-exist", { "oai-authenticated-user-id": "reviewer-unknown" }), dbEnv, context);
assert.equal(unknownStory.status, 404);
const savedVote = await liveWorker.fetch(voteRequest(knownStoryId, { "oai-authenticated-user-id": "reviewer-rate" }), dbEnv, context);
assert.equal(savedVote.status, 200);
assert.equal((await savedVote.json()).persisted, true);
const anonymousVote = await liveWorker.fetch(voteRequest(knownStoryId, { origin: pagesOrigin, "x-moodwire-visitor": "anonymous-smoke-reviewer" }, { storyId: knownStoryId, emotion: "neutral" }), dbEnv, context);
assert.equal(anonymousVote.status, 200);
assert.equal(anonymousVote.headers.get("access-control-allow-origin"), pagesOrigin);
assert.equal((await anonymousVote.json()).persisted, true);

let throttled = false;
for (let index = 0; index < 20; index += 1) {
  const response = await liveWorker.fetch(voteRequest(knownStoryId, { "oai-authenticated-user-id": "reviewer-rate" }, { storyId: knownStoryId, emotion: index % 2 ? "neutral" : "happy" }), dbEnv, context);
  if (response.status === 429) { throttled = true; break; }
}
assert.equal(throttled, true);

let globalThrottleStatus = 0;
for (let index = 0; index < 61; index += 1) {
  const { default: isolatedWorker } = await import(`${moduleUrl.href}?smoke-global=${index}-${Date.now()}`);
  const response = await isolatedWorker.fetch(voteRequest(knownStoryId, { "oai-authenticated-user-id": "reviewer-global" }), dbEnv, context);
  globalThrottleStatus = response.status;
}
assert.equal(globalThrottleStatus, 429);

console.log(`Smoke test passed: fallback, 20-feed aggregation, assets, CORS, authenticated and anonymous voting, validation, and throttling.`);
