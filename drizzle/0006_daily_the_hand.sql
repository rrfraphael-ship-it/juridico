CREATE TABLE `contract_review_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reviewLinkId` int NOT NULL,
	`authorName` varchar(180) NOT NULL,
	`content` text NOT NULL,
	`status` enum('novo','resolvido') NOT NULL DEFAULT 'novo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contract_review_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contract_review_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`dealId` int NOT NULL,
	`contractId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`contractVersion` int NOT NULL,
	`titleSnapshot` varchar(180) NOT NULL,
	`contentSnapshot` text NOT NULL,
	`status` enum('ativo','enviado','revogado') NOT NULL DEFAULT 'ativo',
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contract_review_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `contract_review_links_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE INDEX `contract_review_comment_link_idx` ON `contract_review_comments` (`reviewLinkId`);--> statement-breakpoint
CREATE INDEX `contract_review_deal_idx` ON `contract_review_links` (`dealId`);--> statement-breakpoint
CREATE INDEX `contract_review_contract_idx` ON `contract_review_links` (`contractId`);