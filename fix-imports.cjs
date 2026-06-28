const fs = require('fs');
const files = fs.readdirSync('src/routers').filter(f => f.endsWith('.ts'));
for (const file of files) {
  let content = fs.readFileSync('src/routers/' + file, 'utf8');
  const original = content;
  content = content.replace(/from "\.\//g, 'from "../');
  content = content.replace(/from "\.\.\/shared"/g, 'from "./shared"');
  if (content !== original) {
    fs.writeFileSync('src/routers/' + file, content);
    console.log('Fixed imports in ' + file);
  }
}
