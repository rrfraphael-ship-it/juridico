CREATE TABLE `copilot_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`mimeType` varchar(160) NOT NULL,
	`byteSize` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` varchar(512) NOT NULL,
	`extractedText` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `copilot_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `legal_messages` MODIFY COLUMN `agent` enum('venda','locacao','diligencia','comparador') NOT NULL;--> statement-breakpoint
CREATE INDEX `copilot_attachments_owner_session_idx` ON `copilot_attachments` (`ownerId`,`sessionId`);