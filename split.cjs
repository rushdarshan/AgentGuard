const fs = require('fs');

const content = fs.readFileSync('src/routers.ts', 'utf8');
const parts = content.split(/\/\/ ============ .* ROUTER ============\r?\n/);
const header = parts[0];

// We need to make sure to export each sub-router so we can import it in appRouter.
// They are currently defined as `const agentRouter = router({ ... });`
// We will replace `const xxxRouter = router` with `export const xxxRouter = router`
function makeExport(str) {
  return str.replace(/const (\w+Router)\s*=\s*router/, 'export const $1 = router');
}

const agentStr = header + '\n// ============ AGENT ROUTER ============\n' + makeExport(parts[1]);
const testSuiteStr = header + '\n// ============ TEST SUITE ROUTER ============\n' + makeExport(parts[2]);
const testRunStr = header + '\n// ============ TEST RUN ROUTER ============\n' + makeExport(parts[3]);
const demoStr = header + '\n// ============ DEMO/INSECURE ROUTER ============\n' + makeExport(parts[4]);
const playgroundStr = header + '\n// ============ PLAYGROUND ROUTER ============\n' + makeExport(parts[5]);

let appStr = parts[6];
appStr = header + '\n' + 
"import { agentRouter } from './routers/agent';\n" +
"import { testSuiteRouter } from './routers/testSuite';\n" +
"import { testRunRouter } from './routers/testRun';\n" +
"import { demoRouter } from './routers/demo';\n" +
"import { playgroundRouter } from './routers/playground';\n" +
'\n// ============ APP ROUTER ============\n' + appStr;

// Replace the sub-router definitions inside appStr's router({ ... }) to just use the imported ones.
// Actually, `appStr` already has:
// export const appRouter = router({
//   agents: agentRouter,
//   testSuites: testSuiteRouter, ...
// So they will just reference the imported ones.

fs.mkdirSync('src/routers', { recursive: true });
fs.writeFileSync('src/routers/agent.ts', agentStr);
fs.writeFileSync('src/routers/testSuite.ts', testSuiteStr);
fs.writeFileSync('src/routers/testRun.ts', testRunStr);
fs.writeFileSync('src/routers/demo.ts', demoStr);
fs.writeFileSync('src/routers/playground.ts', playgroundStr);
fs.writeFileSync('src/routers.ts', appStr);

console.log('Splitting done.');
