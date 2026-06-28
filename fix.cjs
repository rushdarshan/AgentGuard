const fs = require('fs');

let content = fs.readFileSync('src/routers.ts', 'utf8');
const original = content;

// Phase 2: deduplicate builtInCorpus
content = content.replace(
  'import { getOpenHackPrompts, type OpenHackPrompt } from "./_core/prompts/openhack";',
  'import { getOpenHackPrompts, type OpenHackPrompt } from "./_core/prompts/openhack";\nimport { builtInCorpus } from "./_core/corpus";\nimport type { Agent, TestRun, TestResult, FailureCascade } from "./schema";\n'
);

content = content.replace(/const builtInCorpus: Record<string, string\[\]> = \{[\s\S]*?\};\r?\n/, '');
content = content.replace(/builtInCorpus\[category\]/g, 'builtInCorpus[category]');

// Fix empty catch blocks
content = content.replace(/catch\s*\{\s*\}/g, 'catch (err) { console.error(err); }');
content = content.replace(/catch\s*\{\s*(\/\*[\s\S]*?\*\/|\/\/[^\n]*)\s*\}/g, 'catch (err) { console.warn(err); $1 }');
content = content.replace(/catch\s*\{/g, 'catch (err) { console.warn(err); ');

// Fix as any
content = content.replace(/\(results as any\[\]\)/g, '(results as TestResult[])');
content = content.replace(/\(cascades as any\[\]\)/g, '(cascades as FailureCascade[])');
content = content.replace(/\(allResults as any\[\]\)/g, '(allResults as TestResult[])');
content = content.replace(/\(allGraphResults as any\[\]\)/g, '(allGraphResults as TestResult[])');

// InsertResult type workaround
const insertResultType = '{ insertId?: number, id?: number }';
content = content.replace(/\(result as any\)/g, '(result as ' + insertResultType + ')');
content = content.replace(/\(res as any\)/g, '(res as ' + insertResultType + ')');
content = content.replace(/\(testRes as any\)/g, '(testRes as ' + insertResultType + ')');

content = content.replace(/\(demoAgent as any\)/g, '(demoAgent as Agent)');
content = content.replace(/\(r as any\)/g, '(r as TestResult)');
content = content.replace(/\(c as any\)/g, '(c as FailureCascade)');

content = content.replace(/\(categoryConfig as any\)/g, '(categoryConfig as { count?: number })');
content = content.replace(/\(sttData as any\)/g, '(sttData as { text?: string })');
content = content.replace(/\(judgeData as any\)/g, '(judgeData as { passed?: boolean; reasoning?: string; score?: number })');
content = content.replace(/\(globalThis as any\)/g, '(globalThis as typeof globalThis & { __requestHost?: string })');

if (content !== original) {
  fs.writeFileSync('src/routers.ts', content);
  console.log('Fixed routers.ts successfully.');
} else {
  console.log('No changes made to routers.ts');
}
