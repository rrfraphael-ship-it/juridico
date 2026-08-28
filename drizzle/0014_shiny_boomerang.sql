CREATE TABLE `proposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`code` varchar(32) NOT NULL,
	`title` varchar(255) NOT NULL,
	`transactionType` enum('venda','locacao','outro') NOT NULL,
	`status` enum('rascunho','enviada','aceita','recusada','convertida') NOT NULL DEFAULT 'rascunho',
	`propertyAddress` text NOT NULL,
	`propertyIdentification` text,
	`offerAmount` bigint,
	`paymentMethod` varchar(120),
	`paymentFlow` text,
	`conditions` text,
	`expiresAt` timestamp,
	`futureParties` json NOT NULL,
	`accessToken` varchar(64) NOT NULL,
	`recipientName` varchar(180),
	`respondedBy` varchar(180),
	`responseNote` text,
	`respondedAt` timestamp,
	`dealId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `proposals_id` PRIMARY KEY(`id`),
	CONSTRAINT `proposals_code_unique` UNIQUE(`code`),
	CONSTRAINT `proposals_accessToken_unique` UNIQUE(`accessToken`)
);
--> statement-breakpoint
CREATE INDEX `proposals_owner_status_idx` ON `proposals` (`ownerId`,`status`);--> statement-breakpoint
CREATE INDEX `proposals_access_token_idx` ON `proposals` (`accessToken`);--> statement-breakpoint
CREATE INDEX `proposals_deal_idx` ON `proposals` (`dealId`);