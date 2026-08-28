CREATE TABLE `contract_exceptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`dealId` int NOT NULL,
	`contractId` int,
	`topicId` enum('partes','objeto','compromisso','preco','posse','titulo','comissoes','cominacoes','foro_privacidade','formatacoes') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`riskLevel` enum('baixo','moderado','alto') NOT NULL DEFAULT 'moderado',
	`justification` text,
	`status` enum('aberta','aprovada','rejeitada','resolvida') NOT NULL DEFAULT 'aberta',
	`approverName` varchar(180),
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contract_exceptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deal_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`dealId` int NOT NULL,
	`type` enum('intake','diligencia','documento','minuta','revisao','tarefa','excecao','assinatura','marco','sistema') NOT NULL,
	`title` varchar(255) NOT NULL,
	`detail` text,
	`actorName` varchar(180),
	`payload` json,
	`clientVisible` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deal_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deal_work_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`dealId` int NOT NULL,
	`milestone` enum('intake','diligencia','minuta','revisao','assinatura','fechamento') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('pendente','em_andamento','bloqueado','concluido') NOT NULL DEFAULT 'pendente',
	`priority` enum('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
	`dueAt` timestamp,
	`assigneeName` varchar(180),
	`assigneeEmail` varchar(320),
	`blocking` boolean NOT NULL DEFAULT false,
	`clientVisible` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deal_work_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `diligence_kits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`transactionType` enum('venda','locacao','outro') NOT NULL,
	`description` text,
	`items` json NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `diligence_kits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `signature_envelopes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`dealId` int NOT NULL,
	`contractId` int NOT NULL,
	`provider` enum('clicksign','d4sign','zapsign','outro') NOT NULL,
	`status` enum('rascunho','pronto','enviado','visualizado','assinado','cancelado','falha') NOT NULL DEFAULT 'rascunho',
	`externalId` varchar(255),
	`signingUrl` varchar(1024),
	`signers` json NOT NULL,
	`expiresAt` timestamp,
	`sentAt` timestamp,
	`signedAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `signature_envelopes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `documents` MODIFY COLUMN `kind` enum('certidao','contrato','intake','assinatura','outro') NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `category` enum('partes','imovel','certidoes','contrato','financeiro','fechamento','outro') DEFAULT 'outro' NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `visibility` enum('interno','cliente') DEFAULT 'cliente' NOT NULL;--> statement-breakpoint
CREATE INDEX `contract_exceptions_deal_idx` ON `contract_exceptions` (`dealId`);--> statement-breakpoint
CREATE INDEX `contract_exceptions_contract_idx` ON `contract_exceptions` (`contractId`);--> statement-breakpoint
CREATE INDEX `deal_events_deal_created_idx` ON `deal_events` (`dealId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `work_items_deal_status_idx` ON `deal_work_items` (`dealId`,`status`);--> statement-breakpoint
CREATE INDEX `work_items_owner_due_idx` ON `deal_work_items` (`ownerId`,`dueAt`);--> statement-breakpoint
CREATE INDEX `diligence_kits_owner_type_idx` ON `diligence_kits` (`ownerId`,`transactionType`);--> statement-breakpoint
CREATE INDEX `signature_envelopes_deal_idx` ON `signature_envelopes` (`dealId`);--> statement-breakpoint
CREATE INDEX `signature_envelopes_contract_idx` ON `signature_envelopes` (`contractId`);