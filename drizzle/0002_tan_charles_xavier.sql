CREATE TABLE `deal_parties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dealId` int NOT NULL,
	`role` enum('comprador','vendedor','locador','locatario','procurador','corretor','outro') NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`documentNumber` varchar(40),
	`email` varchar(320),
	`phone` varchar(40),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deal_parties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `deal_parties_deal_idx` ON `deal_parties` (`dealId`);