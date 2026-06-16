const fs = require('fs');
let code = fs.readFileSync('app/[locale]/layout.tsx', 'utf8');
code = code.replace(/<html lang=\{locale\} dir=\{direction\}>/, "<>");
code = code.replace(/<body className=\{`\$\{inter\.className\} dashcode-app `\}>/, "");
code = code.replace(/<\/body>\s*<\/html>/, "</>");
fs.writeFileSync('app/[locale]/layout.tsx', code);
