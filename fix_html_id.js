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
  if (content.includes('mobile-menu-btn') && content.includes('<ul class="nav-links">')) {
     content = content.replace('<ul class="nav-links">', '<ul class="nav-links" id="nav-links">');
     fs.writeFileSync(file, content);
     console.log('Restored ID nav-links in ' + file);
     count++;
  }
});
