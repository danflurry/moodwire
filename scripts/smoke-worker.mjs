import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

globalThis.fetch = async () => new Response("Feed unavailable", { status: 503 });
const moduleUrl = pathToFileURL(resolve(import.meta.dirname, "../dist/server/index.js"));
const { default: worker } = await import(`${moduleUrl.href}?smoke=${Date.now()}`);
const context = { waitUntil() {} };

const page = await worker.fetch(new Request("https://moodwire.test/"), {}, context);
assert.equal(page.status, 200);
assert.match(await page.text(), /How the news feels, right now\./);

const script = await worker.fetch(new Request("https://moodwire.test/app.js"), {}, context);
assert.equal(script.headers.get("content-type"), "text/javascript; charset=utf-8");

const news = await worker.fetch(new Request("https://moodwire.test/api/news"), {}, context);
const payload = await news.json();
assert.equal(payload.mode, "demo");
assert.ok(payload.stories.length >= 4);

const sampleFeed = `<?xml version="1.0"?><rss><channel><item><title>Coastal cities prepare as powerful storm changes course</title><link>https://example.com/storm</link><pubDate>${new Date().toUTCString()}</pubDate></item><item><title>Researchers announce promising battery material breakthrough</title><link>https://example.com/battery</link><pubDate>${new Date().toUTCString()}</pubDate></item></channel></rss>`;
globalThis.fetch = async () => new Response(sampleFeed, { status: 200, headers: { "content-type": "application/rss+xml" } });
const liveNews = await worker.fetch(new Request("https://moodwire.test/api/news"), {}, context);
const livePayload = await liveNews.json();
assert.equal(livePayload.mode, "live");
assert.equal(livePayload.activeSources, 20);
assert.ok(livePayload.stories.some((story) => story.sources.length === 16));

const vote = await worker.fetch(new Request("https://moodwire.test/api/vote", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ storyId: payload.stories[0].id, emotion: "happy" }),
}), {}, context);
assert.equal(vote.status, 200);

console.log(`Smoke test passed: fallback, 20-feed aggregation, assets, and voting routes.`);
