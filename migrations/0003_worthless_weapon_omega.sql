CREATE TABLE `account_deletion` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`requested_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`purge_after` integer NOT NULL,
	`canceled_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_deletion_user_id_idx` ON `account_deletion` (`user_id`);