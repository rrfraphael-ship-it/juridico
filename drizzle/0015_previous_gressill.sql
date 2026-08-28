CREATE TABLE `proposal_broker_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`proposalId` int,
	`token` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `proposal_broker_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `proposal_broker_links_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE INDEX `proposal_broker_links_owner_idx` ON `proposal_broker_links` (`ownerId`);--> statement-breakpoint
CREATE INDEX `proposal_broker_links_proposal_idx` ON `proposal_broker_links` (`proposalId`);