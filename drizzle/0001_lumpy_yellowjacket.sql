CREATE TABLE `contract_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`transactionType` enum('venda','locacao','outro') NOT NULL,
	`content` text NOT NULL,
	`fields` json NOT NULL,
	`version` varchar(24) NOT NULL DEFAULT '1.0',
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contract_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dealId` int NOT NULL,
	`templateId` int,
	`title` varchar(180) NOT NULL,
	`content` text NOT NULL,
	`status` enum('rascunho','revisao_interna','revisao_cliente','finalizado') NOT NULL DEFAULT 'rascunho',
	`version` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contracts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`code` varchar(32) NOT NULL,
	`title` varchar(255) NOT NULL,
	`transactionType` enum('venda','locacao','outro') NOT NULL,
	`stage` enum('intake','diligence','draft','internal_review','client_review','signed','archived') NOT NULL DEFAULT 'intake',
	`propertyAddress` text NOT NULL,
	`deadline` timestamp,
	`estimatedValue` bigint,
	`clientToken` varchar(64) NOT NULL,
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deals_id` PRIMARY KEY(`id`),
	CONSTRAINT `deals_code_unique` UNIQUE(`code`),
	CONSTRAINT `deals_clientToken_unique` UNIQUE(`clientToken`)
);
--> statement-breakpoint
CREATE TABLE `diligence_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dealId` int NOT NULL,
	`category` enum('federal','trabalhista','estadual','municipal','registral','imovel','outro') NOT NULL,
	`title` varchar(255) NOT NULL,
	`issuer` varchar(180),
	`status` enum('pendente','em_revisao','aprovado','dispensado') NOT NULL DEFAULT 'pendente',
	`attachedDocumentId` int,
	`expiresAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `diligence_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dealId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`kind` enum('certidao','contrato','intake','outro') NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` varchar(512) NOT NULL,
	`mimeType` varchar(160) NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `intakes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`dealId` int,
	`token` varchar(64) NOT NULL,
	`source` enum('corretor','parceiro','operador') NOT NULL DEFAULT 'corretor',
	`contactName` varchar(160),
	`contactEmail` varchar(320),
	`contactPhone` varchar(40),
	`payload` json,
	`submittedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `intakes_id` PRIMARY KEY(`id`),
	CONSTRAINT `intakes_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `legal_library` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`category` enum('legislacao','jurisprudencia','clausula','procedimento','nota') NOT NULL,
	`content` text NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `legal_library_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `legal_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`agent` enum('venda','locacao','diligencia') NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `legal_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `obligations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`dealId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`dueAt` timestamp NOT NULL,
	`status` enum('pendente','concluida','atrasada') NOT NULL DEFAULT 'pendente',
	`alertDaysBefore` int NOT NULL DEFAULT 3,
	`schedule_cron_task_uid` varchar(65),
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `obligations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspace_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`key` varchar(120) NOT NULL,
	`value` json NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspace_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `template_owner_idx` ON `contract_templates` (`ownerId`);--> statement-breakpoint
CREATE INDEX `contracts_deal_idx` ON `contracts` (`dealId`);--> statement-breakpoint
CREATE INDEX `deals_owner_stage_idx` ON `deals` (`ownerId`,`stage`);--> statement-breakpoint
CREATE INDEX `diligence_deal_idx` ON `diligence_items` (`dealId`);--> statement-breakpoint
CREATE INDEX `documents_deal_idx` ON `documents` (`dealId`);--> statement-breakpoint
CREATE INDEX `intakes_deal_idx` ON `intakes` (`dealId`);--> statement-breakpoint
CREATE INDEX `intakes_token_idx` ON `intakes` (`token`);--> statement-breakpoint
CREATE INDEX `library_owner_idx` ON `legal_library` (`ownerId`);--> statement-breakpoint
CREATE INDEX `messages_owner_session_idx` ON `legal_messages` (`ownerId`,`sessionId`);--> statement-breakpoint
CREATE INDEX `obligation_owner_due_idx` ON `obligations` (`ownerId`,`dueAt`);--> statement-breakpoint
CREATE INDEX `settings_owner_key_idx` ON `workspace_settings` (`ownerId`,`key`);