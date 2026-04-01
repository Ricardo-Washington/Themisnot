const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    if (file === 'node_modules' || file === '.git') return;
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      if (dirFile.endsWith('.html')) filelist.push(dirFile);
    }
  });
  return filelist;
}

const htmlFiles = walkSync('.');
let count = 0;
htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('<li class="user-greeting"') && !content.includes('<ul class="nav-links">')) {
     content = content.replace('<li class="user-greeting"', '<ul class="nav-links">\n                <li class="user-greeting"');
     fs.writeFileSync(file, content);
     console.log('Fixed HTML ' + file);
     count++;
  }
});
console.log('Total HTML fixed: ' + count);
