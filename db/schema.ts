import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const feedCache = sqliteTable("feed_cache", {
  cacheKey: text("cache_key").primaryKey(),
  payload: text("payload").notNull(),
  refreshedAt: integer("refreshed_at").notNull(),
});

export const userProfiles = sqliteTable("user_profiles", {
  userId: text("user_id").primaryKey(),
  email: text("email"),
  displayName: text("display_name").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  lastSeenAt: integer("last_seen_at").notNull(),
});

export const votes = sqliteTable("votes", {
  storyId: text("story_id").notNull(),
  actorId: text("actor_id").notNull(),
  emotion: text("emotion", { enum: ["happy", "neutral", "sad"] }).notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.storyId, table.actorId] }),
  index("idx_votes_story_id").on(table.storyId),
]);

export const interactions = sqliteTable("interactions", {
  storyId: text("story_id").notNull(),
  actorId: text("actor_id").notNull(),
  kind: text("kind", { enum: ["flip", "source_open"] }).notNull(),
  count: integer("count").notNull().default(1),
  lastAt: integer("last_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.storyId, table.actorId, table.kind] }),
  index("idx_interactions_story_id").on(table.storyId),
]);

export const mutationLimits = sqliteTable("mutation_limits", {
  actorId: text("actor_id").primaryKey(),
  windowStartedAt: integer("window_started_at").notNull(),
  requestCount: integer("request_count").notNull().default(1),
});

export const jobs = sqliteTable("jobs", {
  name: text("name").primaryKey(),
  lockedUntil: integer("locked_until").notNull().default(0),
  lastStartedAt: integer("last_started_at"),
  lastFinishedAt: integer("last_finished_at"),
  lastError: text("last_error"),
});
