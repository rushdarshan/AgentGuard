import { validateReportFile } from "../_core/report";

export async function validateCommand(file: string) {
  const { valid, errors } = validateReportFile(file);
  if (valid) {
    console.log("Report is valid.");
    process.exit(0);
  }
  console.error(`Report validation failed (${errors.length} error${errors.length === 1 ? "" : "s"}):`);
  for (const e of errors) console.error("  " + e);
  process.exit(1);
}
