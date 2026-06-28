const fs = require('fs');
const path = require('path');

const content = fs.readFileSync('src/routers.ts', 'utf8');
const lines = content.split('\n');

// Find boundaries
const agentStart = lines.findIndex(l => l.includes('const agentRouter = router({'));
const tsStart = lines.findIndex(l => l.includes('const testSuiteRouter = router({'));
const trStart = lines.findIndex(l => l.includes('const testRunRouter = router({'));
const demoStart = lines.findIndex(l => l.includes('const demoRouter = router({'));
const generateStart = lines.findIndex(l => l.includes('async function generateMockTests'));
const playgroundStart = lines.findIndex(l => l.includes('const playgroundRouter = router({'));
const appStart = lines.findIndex(l => l.includes('export const appRouter = router({'));

const header = lines.slice(0, agentStart).join('\n');

const agentBody = lines.slice(agentStart, tsStart).join('\n').replace('const agentRouter', 'export const agentRouter');
const tsBody = lines.slice(tsStart, trStart).join('\n').replace('const testSuiteRouter', 'export const testSuiteRouter');
const trBody = lines.slice(trStart, demoStart).join('\n').replace('const testRunRouter', 'export const testRunRouter');
const demoBody = lines.slice(demoStart, generateStart).join('\n').replace('const demoRouter', 'export const demoRouter');

const sharedBody = lines.slice(generateStart, playgroundStart).join('\n')
  .replace(/async function /g, 'export async function ')
  .replace(/function /g, 'export function ')
  .replace(/export export/g, 'export');

const playgroundBody = lines.slice(playgroundStart, appStart).join('\n').replace('const playgroundRouter', 'export const playgroundRouter');
const appBody = lines.slice(appStart).join('\n');

fs.mkdirSync('src/routers', { recursive: true });

const sharedImports = `import { generateMockTests, simulateDemoRun, executeTestRunAsync, getAttacksForCategory, testAgentEndpoint, calculateSeverity, getGraphComparison } from "./shared";\n`;

fs.writeFileSync('src/routers/shared.ts', header + '\n' + sharedBody);
fs.writeFileSync('src/routers/agent.ts', header + '\n' + sharedImports + agentBody);
fs.writeFileSync('src/routers/testSuite.ts', header + '\n' + sharedImports + tsBody);
fs.writeFileSync('src/routers/testRun.ts', header + '\n' + sharedImports + trBody);
fs.writeFileSync('src/routers/demo.ts', header + '\n' + sharedImports + demoBody);
fs.writeFileSync('src/routers/playground.ts', header + '\n' + sharedImports + playgroundBody);

const indexContent = header + '\n' + 
`import { agentRouter } from "./agent";
import { testSuiteRouter } from "./testSuite";
import { testRunRouter } from "./testRun";
import { demoRouter } from "./demo";
import { playgroundRouter } from "./playground";
` + '\n' + appBody;

fs.writeFileSync('src/routers.ts', indexContent);

console.log("Refactoring complete");
