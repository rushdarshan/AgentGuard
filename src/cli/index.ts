#!/usr/bin/env node
import { Command } from "commander";
import { testCommand } from "./test";
import { analyzeCommand } from "./analyze";
import { publishCommand } from "./publish";
import { validateCommand } from "./validate";
import { hardenCommand } from "./harden";
import { prePushCommand } from "./pre-push";
import { proxyCommand } from "./proxy";

const program = new Command();

program
  .name("agentguard")
  .description("CI for your AI agents — reliability testing, runtime protection, and hardening")
  .version("1.0.0");

program
  .command("test")
  .description("Run adversarial attack tests against an agent endpoint")
  .requiredOption("--url <url>", "Agent endpoint URL")
  .option("--description <desc>", "Agent description")
  .option("--output <format>", "Output format (json or text)", "json")
  .option("--intensity <level>", "Attack intensity (low, medium, high)", "medium")
  .option("--count <n>", "Tests per category", parseInt, "5")
  .action(testCommand);

program
  .command("proxy")
  .description("Run a forward proxy that judges agent→API traffic in real time")
  .option("--port <n>", "Port to listen on", "9090")
  .option("--allowlist <domains>", "Comma-separated list of allowed domains")
  .action(proxyCommand);

program
  .command("pre-push")
  .description("Gate a git push on agent readiness score")
  .option("--url <url>", "Agent endpoint URL (or AGENTGUARD_URL env)")
  .option("--threshold <n>", "Minimum score to allow push", parseInt, "80")
  .option("--install", "Install as a git pre-push hook instead of running")
  .action(prePushCommand);

program
  .command("analyze")
  .description("Run full analysis pipeline: test → cascade → report (one step)")
  .requiredOption("--url <url>", "Agent endpoint URL")
  .option("--description <desc>", "Agent description")
  .option("--intensity <level>", "Attack intensity (low, medium, high)", "medium")
  .option("--count <n>", "Tests per category", parseInt, "5")
  .option("--output <path>", "Output HTML report path")
  .action(analyzeCommand);

program
  .command("harden")
  .description("Generate a hardening config from a test run JSON file")
  .argument("<file>", "Path to test run JSON file")
  .option("--json", "Output as JSON")
  .action(hardenCommand);

program
  .command("publish")
  .description("Deploy an HTML report to a public URL")
  .argument("<file>", "Path to HTML report file")
  .option("--json", "Output as JSON")
  .action(publishCommand);

program
  .command("mcp")
  .description("Start an MCP (Model Context Protocol) server over stdio — exposes agentguard tools for MCP-aware agents")
  .action(async () => {
    const { connect } = await import("./mcp");
    await connect();
  });

program
  .command("validate")
  .description("Validate a report JSON file against the schema")
  .argument("<file>", "Path to report JSON file")
  .action(validateCommand);

program.parse();
