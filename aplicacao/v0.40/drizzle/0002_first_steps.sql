CREATE TABLE `demo_first_steps` (
	`user_id` text PRIMARY KEY NOT NULL,
	`settings` text DEFAULT 'pending' NOT NULL,
	`systems` text DEFAULT 'pending' NOT NULL,
	`disk` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `demo_accounts`(`calendar_key`) ON UPDATE no action ON DELETE cascade
);
