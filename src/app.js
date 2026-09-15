(() => {
  "use strict";

  const stage = document.querySelector("#story-grid");
  const loading = document.querySelector("#grid-loading");
  const feedState = document.querySelector("#feed-state");
  const refreshTime = document.querySelector("#refresh-time");
  const sourceTotal = document.querySelector("#source-total");
  const feedNote = document.querySelector("#feed-note");
  const toast = document.querySelector("#toast");
  const moodHappyFilter = document.querySelector("#mood-filter-happy");
  const moodSadFilter = document.querySelector("#mood-filter-sad");
  const moodFilterStatus = document.querySelector("#mood-filter-status");
  const filterEmpty = document.querySelector("#filter-empty");
  const API_BASE = (document.querySelector('meta[name="moodwire-api-base"]')?.content || "").trim().replace(/\/+$/, "");
  const VISITOR_ID = readVisitorId();

  const ICONS = {
    flip: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 8.2A7.5 7.5 0 0 1 19.7 12M4.3 12A7.5 7.5 0 0 0 17.9 15.8"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 8.2A7.5 7.5 0 0 1 19.7 12M4.3 12A7.5 7.5 0 0 0 17.9 15.8"/></svg>',
  };

  const directory = {
    BBC: "https://www.bbc.com/news",
    NPR: "https://www.npr.org/sections/news/",
    NYT: "https://www.nytimes.com/",
    Guardian: "https://www.theguardian.com/international",
    "Al Jazeera": "https://www.aljazeera.com/",
    DW: "https://www.dw.com/en/",
    PBS: "https://www.pbs.org/newshour/",
    "Sky News": "https://news.sky.com/",
    CBC: "https://www.cbc.ca/news",
    NBC: "https://www.nbcnews.com/",
    TIME: "https://time.com/",
    "France 24": "https://www.france24.com/en/",
  };

  const source = (name) => ({ name, url: directory[name], domain: new URL(directory[name]).hostname });
  const SEED_STORIES = [
    { id: "preview-markets", headline: "Global markets rise as investors weigh a cooler inflation outlook", publishedAt: Date.now() - 12 * 60e3, sources: [source("BBC"), source("NYT"), source("Guardian"), source("NPR"), source("DW"), source("NBC"), source("CBC"), source("Sky News")] },
    { id: "preview-climate", headline: "Cities accelerate heat plans ahead of another record summer", publishedAt: Date.now() - 18 * 60e3, sources: [source("Guardian"), source("Al Jazeera"), source("BBC"), source("PBS"), source("France 24"), source("TIME")] },
    { id: "preview-science", headline: "Deep-sea expedition finds life thriving beyond the reach of light", publishedAt: Date.now() - 31 * 60e3, sources: [source("NPR"), source("BBC"), source("NYT"), source("DW")] },
    { id: "preview-talks", headline: "Leaders reopen talks with a narrow path toward an agreement", publishedAt: Date.now() - 43 * 60e3, sources: [source("Al Jazeera"), source("France 24"), source("BBC"), source("Guardian"), source("NPR")] },
    { id: "preview-storm", headline: "Coastal communities prepare as a powerful storm changes course", publishedAt: Date.now() - 54 * 60e3, sources: [source("NBC"), source("CBC"), source("BBC"), source("Sky News"), source("NYT"), source("PBS"), source("TIME")] },
    { id: "preview-energy", headline: "A new battery design promises faster charging with fewer rare materials", publishedAt: Date.now() - 71 * 60e3, sources: [source("DW"), source("BBC"), source("TIME"), source("NPR") ] },
    { id: "preview-housing", headline: "Housing costs cool in some cities while pressure grows elsewhere", publishedAt: Date.now() - 88 * 60e3, sources: [source("NYT"), source("CBC"), source("Guardian"), source("NBC"), source("BBC") ] },
    { id: "preview-health", headline: "Health agencies widen access to a promising preventive treatment", publishedAt: Date.now() - 104 * 60e3, sources: [source("NPR"), source("PBS"), source("BBC"), source("TIME"), source("France 24"), source("Al Jazeera") ] },
    { id: "preview-space", headline: "Mission controllers celebrate a spacecraft’s precise return home", publishedAt: Date.now() - 127 * 60e3, sources: [source("BBC"), source("NPR"), source("DW"), source("NYT"), source("Guardian"), source("CBC"), source("NBC"), source("Sky News"), source("TIME") ] },
  ];

  const SHAPES = [
    { area: 4, w: 2, h: 2 }, { area: 6, w: 3, h: 2 }, { area: 6, w: 2, h: 3 },
    { area: 8, w: 4, h: 2 }, { area: 8, w: 2, h: 4 }, { area: 9, w: 3, h: 3 },
    { area: 10, w: 5, h: 2 }, { area: 10, w: 2, h: 5 },
    { area: 12, w: 4, h: 3 }, { area: 12, w: 3, h: 4 },
    { area: 15, w: 5, h: 3 }, { area: 15, w: 3, h: 5 }, { area: 16, w: 4, h: 4 },
  ];
  const state = {
    stories: [],
    elements: new Map(),
    placements: new Map(),
    humanVotes: readStoredVotes(),
    tick: 0,
    toastTimer: 0,
    resizeTimer: 0,
    live: false,
    moodMinPosition: Number(moodHappyFilter?.value || 0),
    moodMaxPosition: Number(moodSadFilter?.value || 100),
    voteQueues: new Map(),
    voteVersions: new Map(),
  };

  function hash(value) {
    let result = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      result ^= value.charCodeAt(i);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function readVisitorId() {
    const fallback = () => {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    };
    try {
      const stored = localStorage.getItem("moodwire-visitor");
      if (stored && /^[a-z0-9_-]{16,128}$/i.test(stored)) return stored;
      const created = crypto.randomUUID?.() || fallback();
      localStorage.setItem("moodwire-visitor", created);
      return created;
    } catch { return fallback(); }
  }

  function apiUrl(path) { return API_BASE ? `${API_BASE}${path}` : `.${path}`; }

  function apiFetch(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("x-moodwire-visitor", VISITOR_ID);
    return fetch(apiUrl(path), { ...options, headers });
  }

  function mixRgb(left, right, amount) {
    return left.map((channel, index) => Math.round(channel + (right[index] - channel) * amount));
  }

  function moodPalette(score) {
    const neutral = [67, 136, 245];
    const endpoint = score >= 0 ? [53, 208, 127] : [240, 91, 102];
    const accent = mixRgb(neutral, endpoint, Math.abs(clamp(score, -1, 1)));
    return {
      accent,
      surface: mixRgb([18, 27, 39], accent, .28),
      deep: mixRgb([9, 14, 21], accent, .12),
      border: mixRgb([75, 88, 105], accent, .62),
    };
  }

  function readStoredVotes() {
    try { return JSON.parse(localStorage.getItem("moodwire-votes") || "{}"); }
    catch { return {}; }
  }

  function sentimentCue(headline) {
    const text = headline.toLowerCase();
    const positive = ["rise", "gain", "agree", "agreement", "rescue", "recover", "finds", "promising", "celebrate", "return", "peace", "breakthrough", "expand", "cool"];
    const negative = ["storm", "war", "attack", "death", "crisis", "fire", "warning", "collapse", "fear", "loss", "threat", "heat", "pressure"];
    return positive.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0) - negative.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
  }

  function simulatedChoice(actor, story, salt = 0) {
    const cue = sentimentCue(story.headline);
    const personality = (hash(`actor-${actor}`) % 31) - 15;
    const roll = hash(`${story.id}:${actor}:${salt}`) % 100;
    const happyCutoff = clamp(32 + cue * 7 + personality * .35, 12, 62);
    const sadCutoff = clamp(70 + cue * 4 + personality * .15, 43, 88);
    if (roll < happyCutoff) return "happy";
    if (roll < sadCutoff) return "neutral";
    return "sad";
  }

  function normalizeStory(raw, index, isLive) {
    const userVote = ["happy", "neutral", "sad"].includes(raw.userVote) ? raw.userVote : null;
    const story = {
      id: String(raw.id || `story-${index}`),
      headline: String(raw.headline || raw.title || "Untitled news story"),
      publishedAt: Number(raw.publishedAt || Date.now()),
      sources: Array.isArray(raw.sources) ? raw.sources.filter(Boolean).slice(0, 16) : [],
      community: {
        happy: Number(raw.ratings?.happy || 0),
        neutral: Number(raw.ratings?.neutral || 0),
        sad: Number(raw.ratings?.sad || 0),
      },
      serverInteractions: Number(raw.interactions || 0),
      simVotes: { happy: 0, neutral: 0, sad: 0 },
      agentVotes: new Map(),
      interactions: 0,
      isLive,
      humanApplied: Boolean(userVote),
    };
    if (userVote) state.humanVotes[story.id] = userVote;
    for (let actor = 0; actor < 30; actor += 1) {
      const participation = hash(`${story.id}:seen:${actor}`) % 100;
      const threshold = clamp(44 + (9 - index) * 3, 30, 82);
      if (participation > threshold) continue;
      const choice = simulatedChoice(actor, story);
      story.agentVotes.set(actor, choice);
      story.simVotes[choice] += 1;
    }
    story.interactions = story.serverInteractions + story.agentVotes.size + story.sources.length * 3 + (hash(story.id) % 24);
    return story;
  }

  function totals(story) {
    const result = {
      happy: story.community.happy + story.simVotes.happy,
      neutral: story.community.neutral + story.simVotes.neutral,
      sad: story.community.sad + story.simVotes.sad,
    };
    if (!story.humanApplied && state.humanVotes[story.id]) result[state.humanVotes[story.id]] += 1;
    return result;
  }

  function moodFor(story) {
    const count = totals(story);
    const total = Math.max(1, count.happy + count.neutral + count.sad);
    const score = (count.happy - count.sad) / total;
    if (score > .11) return { tone: "happy", label: "Happy", score };
    if (score < -.11) return { tone: "sad", label: "Sad", score };
    return { tone: "neutral", label: "Neutral", score };
  }

  function moodPosition(story) {
    return ((1 - clamp(moodFor(story).score, -1, 1)) / 2) * 100;
  }

  function visibleStories() {
    return state.stories.filter((story) => {
      const position = moodPosition(story);
      return position >= state.moodMinPosition && position <= state.moodMaxPosition;
    });
  }

  function describeMoodBoundary(value) {
    if (value === 0) return "Happiest";
    if (value === 50) return "Neutral";
    if (value === 100) return "Saddest";
    if (value < 50) return `${Math.round(value * 2)}% from Happy toward Neutral`;
    return `${Math.round((value - 50) * 2)}% from Neutral toward Sad`;
  }

  function applyMoodFilter(changedBoundary = "both") {
    let left = clamp(Number(moodHappyFilter?.value || 0), 0, 100);
    let right = clamp(Number(moodSadFilter?.value || 100), 0, 100);
    if (left > right && changedBoundary === "left") left = right;
    if (right < left && changedBoundary === "right") right = left;
    if (left > right) [left, right] = [right, left];
    state.moodMinPosition = left;
    state.moodMaxPosition = right;
    if (moodHappyFilter) {
      moodHappyFilter.value = String(left);
      moodHappyFilter.max = String(right);
      moodHappyFilter.setAttribute("aria-valuetext", describeMoodBoundary(left));
    }
    if (moodSadFilter) {
      moodSadFilter.value = String(right);
      moodSadFilter.min = String(left);
      moodSadFilter.setAttribute("aria-valuetext", describeMoodBoundary(right));
    }
    document.documentElement.style.setProperty("--mood-filter-start", `${left}%`);
    document.documentElement.style.setProperty("--mood-filter-end", `${right}%`);
    const shown = visibleStories().length;
    if (moodFilterStatus) moodFilterStatus.textContent = `Showing ${shown} of ${state.stories.length} stories in the selected mood range`;
    layoutCards();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function safeUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : "#";
    } catch { return "#"; }
  }

  function sourceMarkup(item) {
    const url = safeUrl(item.url || item.link);
    let domain = item.domain || "";
    try { domain = domain || new URL(url).hostname; } catch { domain = ""; }
    const name = String(item.name || domain || "Source");
    const short = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase();
    const favicon = domain ? `https://${domain}/favicon.ico` : "";
    return `<a class="source-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" data-action="source" title="Open ${escapeHtml(name)} in a new tab"><span class="source-icon"><b>${escapeHtml(short)}</b>${favicon ? `<img class="source-favicon" src="${escapeHtml(favicon)}" alt="">` : ""}</span><span class="source-name">${escapeHtml(name)}</span><span class="open-glyph" aria-hidden="true">↗</span></a>`;
  }

  function createCard(story) {
    const article = document.createElement("article");
    article.className = "story-card";
    article.dataset.id = story.id;
    article.innerHTML = `
      <div class="card-rotator">
        <section class="card-face card-front">
          <div class="card-body">
            <h2></h2>
            <div class="card-meta"><span class="reaction-count"></span><span class="mood-meter" aria-hidden="true"><i class="meter-happy"></i><i class="meter-neutral"></i><i class="meter-sad"></i></span></div>
          </div>
          <button class="touch-rate" type="button" data-action="touch-rate" aria-label="Show reaction choices">React</button>
          <div class="reaction-panel" role="group" aria-label="How does this story make you feel?">
            <button class="reaction-button" type="button" data-action="rate" data-value="happy"><span>Happy</span></button>
            <button class="reaction-button" type="button" data-action="rate" data-value="neutral"><span>Neutral</span></button>
            <button class="reaction-button" type="button" data-action="rate" data-value="sad"><span>Sad</span></button>
          </div>
          <button class="flip-button" type="button" data-action="flip" aria-label="Turn card over to view sources"><span class="flip-count"></span>${ICONS.flip}</button>
        </section>
        <section class="card-face card-back" aria-hidden="true">
          <h3 class="back-headline"></h3>
          <div class="source-grid"></div>
          <button class="back-button" type="button" data-action="back" aria-label="Turn card back to the headline">${ICONS.back}</button>
        </section>
      </div>`;
    article.querySelector(".card-back").inert = true;
    stage.append(article);
    state.elements.set(story.id, article);
    requestAnimationFrame(() => article.classList.add("is-ready"));
    return article;
  }

  function updateCard(story) {
    const card = state.elements.get(story.id) || createCard(story);
    const count = totals(story);
    const total = Math.max(1, count.happy + count.neutral + count.sad);
    const mood = moodFor(story);
    const palette = moodPalette(mood.score);
    const selected = state.humanVotes[story.id];
    const sourceCount = story.sources.length;
    card.dataset.mood = mood.tone;
    card.dataset.userVote = selected || "";
    card.style.setProperty("--mood-color", `rgb(${palette.accent.join(", ")})`);
    card.style.setProperty("--mood-surface", `rgb(${palette.surface.join(", ")})`);
    card.style.setProperty("--mood-deep", `rgb(${palette.deep.join(", ")})`);
    card.style.setProperty("--mood-border", `rgb(${palette.border.join(", ")})`);
    card.setAttribute("aria-label", `${story.headline}. ${total} reactions. Mood: ${mood.label}.`);
    card.style.setProperty("--happy-pct", `${(count.happy / total) * 100}%`);
    card.style.setProperty("--neutral-pct", `${(count.neutral / total) * 100}%`);
    card.style.setProperty("--sad-pct", `${(count.sad / total) * 100}%`);
    card.querySelector(".flip-count").textContent = String(sourceCount);
    card.querySelector(".flip-button").setAttribute("aria-label", `Turn card over to view ${sourceCount} ${sourceCount === 1 ? "source" : "sources"}`);
    card.querySelector("h2").textContent = story.headline;
    card.querySelector(".back-headline").textContent = story.headline;
    card.querySelector(".reaction-count").textContent = `${total} reactions`;
    card.querySelectorAll(".reaction-button").forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.value === selected);
      button.setAttribute("aria-pressed", String(button.dataset.value === selected));
    });
    const sourceGrid = card.querySelector(".source-grid");
    const signature = story.sources.map((item) => `${item.name}:${item.url || item.link}`).join("|");
    if (sourceGrid.dataset.signature !== signature) {
      sourceGrid.dataset.signature = signature;
      sourceGrid.innerHTML = story.sources.length ? story.sources.map(sourceMarkup).join("") : '<p class="source-empty">Source links are still arriving.</p>';
    }
  }

  function fitHeadline(card, story, cardWidth, cardHeight) {
    const heading = card.querySelector("h2");
    const body = card.querySelector(".card-body");
    if (!heading || !body) return;
    const lengthPenalty = Math.max(0, story.headline.length - 52) * .095;
    const areaBonus = clamp((cardWidth * cardHeight - 42_000) / 18_000, 0, 4);
    const maximum = clamp(27 - lengthPenalty + areaBonus, 14, 30);
    const findLargestFit = () => {
      let low = .75;
      let high = maximum;
      let best = low;
      heading.style.fontSize = `${low}px`;
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const size = (low + high) / 2;
        heading.style.fontSize = `${size}px`;
        if (body.scrollHeight <= body.clientHeight + 1) {
          best = size;
          low = size;
        } else {
          high = size;
        }
      }
      heading.style.fontSize = `${best.toFixed(2)}px`;
      return best;
    };
    card.classList.remove("headline-tight");
    let best = findLargestFit();
    if (body.scrollHeight > body.clientHeight + 1) {
      card.classList.add("headline-tight");
      best = findLargestFit();
    }
    for (let attempt = 0; attempt < 4 && body.scrollHeight > body.clientHeight + 1; attempt += 1) {
      const ratio = clamp(body.clientHeight / Math.max(1, body.scrollHeight), .15, .96);
      best = Math.max(.35, best * ratio * .96);
      heading.style.fontSize = `${best.toFixed(2)}px`;
    }
    const backHeading = card.querySelector(".back-headline");
    if (backHeading) {
      const backPenalty = Math.max(0, story.headline.length - 48) * .065;
      const backAreaBonus = clamp((cardWidth * cardHeight - 42_000) / 30_000, 0, 1.5);
      backHeading.style.fontSize = `${clamp(14 - backPenalty + backAreaBonus, 9.5, 15.5).toFixed(1)}px`;
    }
  }

  function renderCards() {
    const active = new Set(state.stories.map((story) => story.id));
    for (const [id, element] of state.elements) {
      if (!active.has(id)) {
        element.remove();
        state.elements.delete(id);
        state.placements.delete(id);
      }
    }
    const ranked = [...state.stories].sort((a, b) => b.interactions - a.interactions || a.id.localeCompare(b.id));
    ranked.forEach((story) => updateCard(story));
    layoutCards();
    stage.setAttribute("aria-busy", "false");
    loading?.classList.add("is-hidden");
  }

  function desiredShape(story, cols) {
    const desired = clamp(Math.round(story.sources.length || 4), 4, 16);
    const preferredRatio = story.headline.length > 78 ? 1.55 : story.sources.length >= 8 ? .78 : 1.15;
    const options = SHAPES.filter((shape) => shape.w <= cols).sort((a, b) => {
      const area = Math.abs(a.area - desired) - Math.abs(b.area - desired);
      if (area) return area;
      return Math.abs(a.w / a.h - preferredRatio) - Math.abs(b.w / b.h - preferredRatio);
    });
    return options.slice(0, 5);
  }

  function fits(rows, col, row, width, height, cols) {
    if (col < 0 || col + width > cols) return false;
    const mask = ((1 << width) - 1) << col;
    for (let y = row; y < row + height; y += 1) if ((rows[y] || 0) & mask) return false;
    return true;
  }

  function occupy(rows, placement) {
    const mask = ((1 << placement.w) - 1) << placement.col;
    for (let y = placement.row; y < placement.row + placement.h; y += 1) rows[y] = (rows[y] || 0) | mask;
  }

  function layoutCards() {
    const width = stage.clientWidth;
    if (!width || !state.stories.length) return;
    const ranked = visibleStories().sort((a, b) => b.interactions - a.interactions || a.id.localeCompare(b.id));
    const visibleIds = new Set(ranked.map((story) => story.id));
    for (const [id, card] of state.elements) card.hidden = !visibleIds.has(id);
    if (filterEmpty) filterEmpty.hidden = ranked.length > 0;
    if (moodFilterStatus) moodFilterStatus.textContent = `Showing ${ranked.length} of ${state.stories.length} stories in the selected mood range`;
    if (!ranked.length) {
      const stageTop = stage.getBoundingClientRect().top + window.scrollY;
      stage.style.height = `${Math.max(360, document.documentElement.clientHeight - stageTop - 10)}px`;
      return;
    }
    const gap = width < 640 ? 9 : 12;
    const minCell = width < 640 ? 68 : width < 960 ? 76 : 86;
    const cols = clamp(Math.floor((width + gap) / (minCell + gap)), 4, 14);
    const cellW = (width - gap * (cols - 1)) / cols;
    const rowH = clamp(cellW * .84, 72, 108);
    const rows = [];
    let prefixArea = 0;
    let maxRow = 0;

    ranked.forEach((story) => {
      const shapes = desiredShape(story, cols);
      const mood = moodFor(story);
      const targetRow = prefixArea / cols;
      prefixArea += clamp(story.sources.length || 4, 4, 16);
      let best = null;
      for (const shape of shapes) {
        const targetCol = ((1 - clamp(mood.score, -1, 1)) / 2) * Math.max(0, cols - shape.w);
        const searchRows = Math.max(maxRow + 6, Math.ceil(prefixArea / cols) + 5);
        for (let row = 0; row <= searchRows; row += 1) {
          for (let col = 0; col <= cols - shape.w; col += 1) {
            if (!fits(rows, col, row, shape.w, shape.h, cols)) continue;
            const old = state.placements.get(story.id);
            const xError = Math.abs(col - targetCol) / Math.max(1, cols - shape.w);
            const yError = Math.abs(row - targetRow) / Math.max(1, ranked.length);
            const heightGrowth = Math.max(0, row + shape.h - maxRow);
            const movement = old ? (Math.abs(col - old.col) + Math.abs(row - old.row)) / Math.max(1, cols) : 0;
            const score = xError * xError * 9 + yError * yError * 15 + heightGrowth * .7 + movement * .45 + row * .012;
            if (!best || score < best.score) best = { col, row, ...shape, score };
          }
        }
      }
      if (!best) best = { col: 0, row: maxRow, w: Math.min(2, cols), h: 2, area: 4, score: 0 };
      occupy(rows, best);
      maxRow = Math.max(maxRow, best.row + best.h);
      state.placements.set(story.id, best);
      const card = state.elements.get(story.id);
      const cardWidth = best.w * cellW + (best.w - 1) * gap;
      const cardHeight = best.h * rowH + (best.h - 1) * gap;
      card.style.width = `${cardWidth}px`;
      card.style.height = `${cardHeight}px`;
      card.style.setProperty("--x", `${best.col * (cellW + gap)}px`);
      card.style.setProperty("--y", `${best.row * (rowH + gap)}px`);
      card.classList.toggle("size-small", cardWidth < 245 || cardHeight < 205);
      fitHeadline(card, story, cardWidth, cardHeight);
    });

    const cardDimensions = new Map(ranked.map((story) => {
      const placement = state.placements.get(story.id);
      return [story.id, {
        width: placement.w * cellW + (placement.w - 1) * gap,
        height: placement.h * rowH + (placement.h - 1) * gap,
      }];
    }));
    const widestHalf = Math.max(...[...cardDimensions.values()].map(({ width: cardWidth }) => cardWidth / 2));
    const placedRects = [];
    maxRow = 0;
    ranked.forEach((story) => {
      const placement = state.placements.get(story.id);
      const dimensions = cardDimensions.get(story.id);
      const moodCenter = widestHalf + (moodPosition(story) / 100) * Math.max(0, width - widestHalf * 2);
      const x = clamp(moodCenter - dimensions.width / 2, 0, width - dimensions.width);
      let row = placement.row;
      while (placedRects.some((rect) => (
        x < rect.x + rect.width + gap
        && x + dimensions.width + gap > rect.x
        && row < rect.row + rect.heightRows
        && row + placement.h > rect.row
      ))) row += 1;
      placement.row = row;
      placement.moodCenter = moodCenter;
      placedRects.push({ x, width: dimensions.width, row, heightRows: placement.h });
      maxRow = Math.max(maxRow, row + placement.h);
      const card = state.elements.get(story.id);
      card.style.setProperty("--x", `${x}px`);
      card.style.setProperty("--y", `${row * (rowH + gap)}px`);
      fitHeadline(card, story, dimensions.width, dimensions.height);
    });
    const contentHeight = maxRow * rowH + Math.max(0, maxRow - 1) * gap + 18;
    const stageTop = stage.getBoundingClientRect().top + window.scrollY;
    const viewportFloor = Math.max(360, document.documentElement.clientHeight - stageTop - 10);
    stage.style.height = `${Math.max(viewportFloor, contentHeight)}px`;
  }

  function mergeStories(rawStories, isLive) {
    const oldById = new Map(state.stories.map((story) => [story.id, story]));
    state.stories = rawStories.slice(0, 18).map((raw, index) => {
      const normalized = normalizeStory(raw, index, isLive);
      const old = oldById.get(normalized.id);
      if (!old) return normalized;
      normalized.simVotes = old.simVotes;
      normalized.agentVotes = old.agentVotes;
      normalized.interactions = Math.max(old.interactions, normalized.interactions);
      normalized.humanApplied = normalized.humanApplied || old.humanApplied;
      return normalized;
    });
    state.live = isLive;
    renderCards();
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2400);
  }

  async function rateStory(storyId, value, fromTool = false) {
    const story = state.stories.find((item) => item.id === storyId);
    if (!story || !["happy", "neutral", "sad"].includes(value)) throw new Error("Unknown story or reaction");
    const previousVote = state.humanVotes[storyId] || null;
    const previousInteractions = story.interactions;
    const version = (state.voteVersions.get(storyId) || 0) + 1;
    state.voteVersions.set(storyId, version);
    state.humanVotes[storyId] = value;
    try { localStorage.setItem("moodwire-votes", JSON.stringify(state.humanVotes)); } catch {}
    story.interactions += 1;
    const card = state.elements.get(storyId);
    card?.classList.remove("rating-open");
    card?.classList.add("rating-dismissed");
    if (card?.contains(document.activeElement)) document.activeElement.blur();
    updateCard(story);
    layoutCards();
    if (!fromTool) showToast("The map is adjusting while your reaction saves…");
    if (!story.isLive) {
      if (!fromTool) showToast(`You marked this story ${value}. Saved on this device.`);
      return { storyId, emotion: value, mood: moodFor(story).label, persisted: false };
    }
    const saveReaction = async () => {
      const response = await apiFetch("/api/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ storyId, emotion: value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.persisted !== true) throw new Error(data.error || "Reaction could not be saved");
      return data;
    };
    const previousRequest = state.voteQueues.get(storyId) || Promise.resolve();
    const queuedRequest = previousRequest.catch(() => {}).then(saveReaction);
    state.voteQueues.set(storyId, queuedRequest);
    try {
      const data = await queuedRequest;
      if (state.voteVersions.get(storyId) === version && data.ratings) {
        story.community = data.ratings;
        story.humanApplied = true;
        updateCard(story);
      }
      if (!fromTool && state.voteVersions.get(storyId) === version) showToast(`You marked this story ${value}. Reaction synced.`);
      return { storyId, emotion: value, mood: moodFor(story).label, persisted: true };
    } catch (error) {
      const isLatest = state.voteVersions.get(storyId) === version;
      if (fromTool && isLatest) {
        if (previousVote) state.humanVotes[storyId] = previousVote;
        else delete state.humanVotes[storyId];
        story.interactions = previousInteractions;
        try { localStorage.setItem("moodwire-votes", JSON.stringify(state.humanVotes)); } catch {}
        updateCard(story);
        layoutCards();
        throw new Error(error instanceof Error ? error.message : "Reaction could not be saved");
      }
      if (!fromTool && isLatest) showToast("The map changed locally; this reaction could not sync yet.");
      return { storyId, emotion: value, mood: moodFor(story).label, persisted: false };
    } finally {
      if (state.voteQueues.get(storyId) === queuedRequest) state.voteQueues.delete(storyId);
    }
  }

  function postInteraction(storyId, kind) {
    const story = state.stories.find((item) => item.id === storyId);
    if (story) {
      story.interactions += 1;
      updateCard(story);
      setTimeout(layoutCards, 80);
    }
    if (!story?.isLive) return;
    apiFetch("/api/interaction", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ storyId, kind }),
      keepalive: true,
    }).catch(() => {});
  }

  function simulationStep() {
    if (!state.stories.length || document.hidden) return;
    const actor = state.tick % 30;
    const story = state.stories[hash(`tick:${state.tick}:actor:${actor}`) % state.stories.length];
    const previous = story.agentVotes.get(actor);
    const next = simulatedChoice(actor, story, Math.floor(state.tick / 30) + 1);
    if (previous && previous !== next) story.simVotes[previous] = Math.max(0, story.simVotes[previous] - 1);
    if (previous !== next) {
      story.agentVotes.set(actor, next);
      story.simVotes[next] += 1;
    }
    story.interactions += 1;
    state.tick += 1;
    updateCard(story);
    layoutCards();
  }

  function relativeTime(timestamp) {
    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (seconds < 8) return "Updated just now";
    if (seconds < 60) return `Updated ${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `Updated ${minutes}m ago`;
  }

  async function fetchNews(initial = false) {
    try {
      const response = await apiFetch("/api/news", { cache: "no-store" });
      if (!response.ok) throw new Error("Feed unavailable");
      const data = await response.json();
      if (!Array.isArray(data.stories) || !data.stories.length) throw new Error("No stories");
      mergeStories(data.stories, data.mode === "live" || data.mode === "cached");
      feedState.textContent = data.mode === "live" || data.mode === "cached" ? "LIVE FEEDS" : "PREVIEW SIGNAL";
      sourceTotal.textContent = String(data.activeSources || data.totalSources || 20);
      feedNote.textContent = data.mode === "live" || data.mode === "cached" ? "checked every minute" : "preview data; reconnecting automatically";
      const refreshed = Number(data.refreshedAt || Date.now());
      refreshTime.dataset.timestamp = String(refreshed);
      refreshTime.textContent = relativeTime(refreshed);
    } catch {
      if (initial || !state.stories.length) {
        mergeStories(SEED_STORIES, false);
        feedState.textContent = "OFFLINE SAMPLE";
        sourceTotal.textContent = "20";
        feedNote.textContent = "sample stories; reconnecting automatically";
        refreshTime.textContent = "Live feeds reconnect automatically";
      }
    }
  }

  stage.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]");
    const card = event.target.closest(".story-card");
    if (!action || !card) return;
    const storyId = card.dataset.id;
    if (action.dataset.action === "rate") rateStory(storyId, action.dataset.value);
    if (action.dataset.action === "flip") {
      card.classList.add("is-flipped");
      card.classList.remove("rating-open");
      card.querySelector(".card-back")?.setAttribute("aria-hidden", "false");
      card.querySelector(".card-front")?.setAttribute("aria-hidden", "true");
      if (card.querySelector(".card-back")) card.querySelector(".card-back").inert = false;
      if (card.querySelector(".card-front")) card.querySelector(".card-front").inert = true;
      setTimeout(() => card.querySelector(".back-button")?.focus(), 320);
      postInteraction(storyId, "flip");
    }
    if (action.dataset.action === "back") {
      card.classList.remove("is-flipped");
      card.querySelector(".card-back")?.setAttribute("aria-hidden", "true");
      card.querySelector(".card-front")?.setAttribute("aria-hidden", "false");
      if (card.querySelector(".card-back")) card.querySelector(".card-back").inert = true;
      if (card.querySelector(".card-front")) card.querySelector(".card-front").inert = false;
      setTimeout(() => card.querySelector(".flip-button")?.focus(), 120);
    }
    if (action.dataset.action === "touch-rate") card.classList.toggle("rating-open");
    if (action.dataset.action === "source") postInteraction(storyId, "source_open");
  });

  stage.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const card = event.target.closest(".story-card");
    card?.classList.remove("is-flipped", "rating-open");
    card?.querySelector(".card-back")?.setAttribute("aria-hidden", "true");
    card?.querySelector(".card-front")?.setAttribute("aria-hidden", "false");
    if (card?.querySelector(".card-back")) card.querySelector(".card-back").inert = true;
    if (card?.querySelector(".card-front")) card.querySelector(".card-front").inert = false;
  });

  stage.addEventListener("pointerleave", (event) => {
    if (event.target.classList?.contains("story-card")) event.target.classList.remove("rating-dismissed");
  }, true);

  stage.addEventListener("load", (event) => {
    if (event.target.classList?.contains("source-favicon")) event.target.classList.add("is-loaded");
  }, true);

  function registerWebMcp() {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(context.registerTool({
      name: "list_visible_stories",
      title: "List visible stories",
      description: "List the news stories currently visible in Moodwire with their aggregate mood and source count.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute() {
        return visibleStories().map((story) => ({ id: story.id, headline: story.headline, mood: moodFor(story).label, sources: story.sources.length, reactions: totals(story) }));
      },
    }, { signal: lifecycle.signal })).catch(() => {});
    Promise.resolve(context.registerTool({
      name: "rate_story",
      title: "Rate a story",
      description: "Mark one visible Moodwire story as happy, neutral, or sad and update the map.",
      inputSchema: { type: "object", properties: { storyId: { type: "string" }, emotion: { type: "string", enum: ["happy", "neutral", "sad"] } }, required: ["storyId", "emotion"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        if (!input || typeof input.storyId !== "string" || !["happy", "neutral", "sad"].includes(input.emotion)) throw new Error("storyId and a valid emotion are required");
        return rateStory(input.storyId, input.emotion, true);
      },
    }, { signal: lifecycle.signal })).catch(() => {});
  }

  const dateFormatter = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
  document.querySelector("#date-stamp").textContent = dateFormatter.format(new Date()).toUpperCase();
  moodHappyFilter?.addEventListener("input", () => applyMoodFilter("left"));
  moodSadFilter?.addEventListener("input", () => applyMoodFilter("right"));
  applyMoodFilter();
  mergeStories(SEED_STORIES, false);
  fetchNews(true);
  registerWebMcp();
  setInterval(simulationStep, 2400);
  setInterval(() => fetchNews(false), 60_000);
  setInterval(() => {
    const timestamp = Number(refreshTime.dataset.timestamp);
    if (timestamp) refreshTime.textContent = relativeTime(timestamp);
  }, 10_000);
  new ResizeObserver(() => {
    clearTimeout(state.resizeTimer);
    state.resizeTimer = setTimeout(layoutCards, 100);
  }).observe(stage);
})();
