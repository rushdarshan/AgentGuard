const fs = require('fs');
const files = fs.readdirSync('src/routers').filter(f => f.endsWith('.ts'));
for (const file of files) {
  let content = fs.readFileSync('src/routers/' + file, 'utf8');
  const original = content;
  content = content.replace(/from "\.\/_core\//g, 'from "../_core/');
  content = content.replace(/from "\.\/db"/g, 'from "../db"');
  content = content.replace(/from "\.\/schema"/g, 'from "../schema"');
  content = content.replace(/export export /g, 'export ');
  if (content !== original) {
    fs.writeFileSync('src/routers/' + file, content);
    console.log('Fixed imports in ' + file);
  }
}
