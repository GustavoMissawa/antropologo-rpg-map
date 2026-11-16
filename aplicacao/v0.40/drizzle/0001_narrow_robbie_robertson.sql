CREATE TABLE `demo_accounts` (
	`handle` text PRIMARY KEY NOT NULL,
	`calendar_key` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `demo_accounts_calendar_key_unique` ON `demo_accounts` (`calendar_key`);--> statement-breakpoint
CREATE TABLE `demo_auth_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `demo_auth_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`handle` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`handle`) REFERENCES `demo_accounts`(`handle`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `demo_calendar_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`data` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `demo_accounts`(`calendar_key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `demo_calendar_user_date_idx` ON `demo_calendar_events` (`user_id`,`date`);