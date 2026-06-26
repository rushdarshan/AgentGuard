CREATE TABLE `agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`url` varchar(2048) NOT NULL,
	`authHeaders` text,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attackCorpus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(100) NOT NULL,
	`prompt` text NOT NULL,
	`description` text,
	`severity` enum('critical','high','medium','low') NOT NULL DEFAULT 'medium',
	`isBuiltIn` int NOT NULL DEFAULT 1,
	`generatedForAgentId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attackCorpus_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `failureCascades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`testRunId` int NOT NULL,
	`sourceResultId` int NOT NULL,
	`targetResultId` int NOT NULL,
	`confidence` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `failureCascades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`testRunId` int NOT NULL,
	`category` varchar(100) NOT NULL,
	`passed` int NOT NULL DEFAULT 0,
	`failed` int NOT NULL DEFAULT 0,
	`severity` enum('critical','high','medium','low') NOT NULL,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `testResults_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentId` int NOT NULL,
	`testSuiteId` int,
	`status` enum('pending','running','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`totalTests` int NOT NULL DEFAULT 0,
	`passedTests` int NOT NULL DEFAULT 0,
	`failedTests` int NOT NULL DEFAULT 0,
	`reliabilityScore` int,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `testRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testSuites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`config` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `testSuites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
