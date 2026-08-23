import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const games = sqliteTable('games', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	year: integer('year').notNull(),
	category: text('category').notNull(),
	coverUrl: text('cover_url'),
	coverLicense: text('cover_license'),
	gameId: integer('game_id'),
	wikipediaUrl: text('wikipedia_url'),
	description: text('description'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;

/** Single-row table (id always 1) holding site-wide settings editable from the admin area. */
export const settings = sqliteTable('settings', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	siteTitle: text('site_title'),
	heroHeadline: text('hero_headline'),
	accentColor: text('accent_color'),
	backgroundColor: text('background_color'),
	adminUsername: text('admin_username'),
	adminPasswordHash: text('admin_password_hash')
});

export type Settings = typeof settings.$inferSelect;
