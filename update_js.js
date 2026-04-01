const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    if (file === 'node_modules' || file === '.git') return;
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      if (dirFile.endsWith('.js')) filelist.push(dirFile);
    }
  });
  return filelist;
}

const jsFiles = walkSync('.');
let count = 0;
jsFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('const dados = userDoc.data();') && !content.includes('user-greeting')) {
     const injection = "\n" +
"           // Injeta a saudacao do usuario na navbar\n" +
"           if (dados && (dados.nome || dados.nomeCompleto)) {\n" +
"               const nomeExibicao = dados.nome || dados.nomeCompleto;\n" +
"               const pNome = nomeExibicao.split(' ')[0];\n" +
"               document.querySelectorAll('.user-greeting').forEach(el => el.textContent = 'Olá, ' + pNome);\n" +
"           }\n";
     content = content.replace('const dados = userDoc.data();', 'const dados = userDoc.data();' + injection);
     fs.writeFileSync(file, content);
     console.log('Updated JS ' + file);
     count++;
  }
});
console.log('Total JS modified: ' + count);
