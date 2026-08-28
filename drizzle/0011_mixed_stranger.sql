ALTER TABLE `contract_exceptions` ADD `requiredApprovalLevel` enum('operacional','juridico','diretoria') DEFAULT 'juridico' NOT NULL;--> statement-breakpoint
ALTER TABLE `contract_exceptions` ADD `approvedByLevel` enum('operacional','juridico','diretoria');--> statement-breakpoint
ALTER TABLE `deal_work_items` ADD `slaAt` timestamp;