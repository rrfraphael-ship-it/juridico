CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`dealId` int,
	`type` enum('intake_recebido','prazo_proximo','risco_documental','acao_pendente') NOT NULL,
	`severity` enum('info','atencao','critico') NOT NULL DEFAULT 'info',
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`actionPath` varchar(512),
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `notifications_owner_created_idx` ON `notifications` (`ownerId`,`createdAt`);