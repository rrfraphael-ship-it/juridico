ALTER TABLE `contract_review_comments` ADD `selectedText` text;--> statement-breakpoint
ALTER TABLE `contract_review_comments` ADD `selectionStart` int;--> statement-breakpoint
ALTER TABLE `contract_review_comments` ADD `selectionEnd` int;--> statement-breakpoint
ALTER TABLE `contract_review_links` ADD `approvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `contract_review_links` ADD `approvedBy` varchar(180);--> statement-breakpoint
ALTER TABLE `contract_review_links` ADD `approvalNote` text;