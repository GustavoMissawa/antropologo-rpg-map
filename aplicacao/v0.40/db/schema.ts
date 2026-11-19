import { sqliteTable,text,index,integer } from 'drizzle-orm/sqlite-core';
import type { Session } from '../lib/schedule';
import { FIRST_STEPS_STATES } from '../lib/orbital-first-steps';
export const playerProfiles=sqliteTable('player_profiles',{
 userId:text('user_id').primaryKey(),name:text('name').notNull(),email:text('email').notNull(),updatedAt:text('updated_at').notNull(),
});
export const rpgSessions=sqliteTable('rpg_sessions',{
 id:text('id').primaryKey(),userId:text('user_id').notNull(),date:text('date').notNull(),data:text('data',{mode:'json'}).$type<Session>().notNull(),updatedAt:text('updated_at').notNull(),
},table=>[index('rpg_sessions_user_date_idx').on(table.userId,table.date)]);

// Isolated, expiring demo identities. Never reuse a prior account's calendar key.
export const demoAccounts=sqliteTable('demo_accounts',{
 handle:text('handle').primaryKey(),calendarKey:text('calendar_key').notNull().unique(),passwordHash:text('password_hash').notNull(),passwordSalt:text('password_salt').notNull(),createdAt:integer('created_at').notNull(),expiresAt:integer('expires_at').notNull(),
});
export const demoAuthSessions=sqliteTable('demo_auth_sessions',{
 tokenHash:text('token_hash').primaryKey(),handle:text('handle').notNull().references(()=>demoAccounts.handle,{onDelete:'cascade'}),expiresAt:integer('expires_at').notNull(),
});
export const demoFirstSteps = sqliteTable('demo_first_steps', {
 userId: text('user_id').primaryKey().references(() => demoAccounts.calendarKey, {onDelete: 'cascade'}),
 settings: text('settings', {enum: FIRST_STEPS_STATES}).notNull().default('pending'),
 systems: text('systems', {enum: FIRST_STEPS_STATES}).notNull().default('pending'),
 disk: text('disk', {enum: FIRST_STEPS_STATES}).notNull().default('pending'),
});
export const demoCalendarEvents=sqliteTable('demo_calendar_events',{
 id:text('id').primaryKey(),userId:text('user_id').notNull().references(()=>demoAccounts.calendarKey,{onDelete:'cascade'}),date:text('date').notNull(),data:text('data',{mode:'json'}).$type<Session>().notNull(),updatedAt:text('updated_at').notNull(),
},table=>[index('demo_calendar_user_date_idx').on(table.userId,table.date)]);
export const demoAuthLimits=sqliteTable('demo_auth_limits',{
 key:text('key').primaryKey(),attempts:integer('attempts').notNull(),expiresAt:integer('expires_at').notNull(),
});
