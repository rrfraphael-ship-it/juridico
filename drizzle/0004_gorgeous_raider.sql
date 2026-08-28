CREATE TABLE `diligence_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dealId` int NOT NULL,
	`diligenceItemId` int NOT NULL,
	`documentId` int NOT NULL,
	`status` enum('processando','concluida','falha','nao_suportado') NOT NULL DEFAULT 'processando',
	`riskLevel` enum('baixo','moderado','alto','indeterminado') NOT NULL DEFAULT 'indeterminado',
	`summary` text,
	`findings` json,
	`limitations` text,
	`errorMessage` text,
	`analyzedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `diligence_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `diligence_analyses_document_idx` ON `diligence_analyses` (`documentId`);--> statement-breakpoint
CREATE INDEX `diligence_analyses_deal_idx` ON `diligence_analyses` (`dealId`);