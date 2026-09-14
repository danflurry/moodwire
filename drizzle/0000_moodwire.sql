CREATE TABLE `feed_cache` (
	`cache_key` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`refreshed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `votes` (
	`story_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`emotion` text NOT NULL CHECK (`emotion` IN ('happy', 'neutral', 'sad')),
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`story_id`, `actor_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_votes_story_id` ON `votes` (`story_id`);
--> statement-breakpoint
CREATE TABLE `interactions` (
	`story_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`kind` text NOT NULL CHECK (`kind` IN ('flip', 'source_open')),
	`count` integer DEFAULT 1 NOT NULL,
	`last_at` integer NOT NULL,
	PRIMARY KEY(`story_id`, `actor_id`, `kind`)
);
--> statement-breakpoint
CREATE INDEX `idx_interactions_story_id` ON `interactions` (`story_id`);
--> statement-breakpoint
CREATE TABLE `mutation_limits` (
	`actor_id` text PRIMARY KEY NOT NULL,
	`window_started_at` integer NOT NULL,
	`request_count` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`name` text PRIMARY KEY NOT NULL,
	`locked_until` integer DEFAULT 0 NOT NULL,
	`last_started_at` integer,
	`last_finished_at` integer,
	`last_error` text
);
--> statement-breakpoint
PRAGMA optimize;
