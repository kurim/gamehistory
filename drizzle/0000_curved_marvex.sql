CREATE TABLE `games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`year` integer NOT NULL,
	`category` text NOT NULL,
	`cover_url` text,
	`cover_license` text,
	`game_id` integer,
	`wikipedia_url` text,
	`description` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site_title` text,
	`hero_headline` text,
	`accent_color` text,
	`background_color` text,
	`admin_username` text,
	`admin_password_hash` text
);
