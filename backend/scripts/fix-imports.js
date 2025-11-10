#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function fixImports(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await fixImports(fullPath);
    } else if (entry.name.endsWith('.js')) {
      let content = await readFile(fullPath, 'utf-8');
      
      // Fix relative imports: add .js extension
      content = content.replace(
        /from\s+(['"])(\.\.[\/\\].*?)(['"])/g,
        (match, quote1, path, quote2) => {
          if (!path.endsWith('.js')) {
            return `from ${quote1}${path}.js${quote2}`;
          }
          return match;
        }
      );
      
      content = content.replace(
        /from\s+(['"])(\.[\/\\].*?)(['"])/g,
        (match, quote1, path, quote2) => {
          if (!path.endsWith('.js')) {
            return `from ${quote1}${path}.js${quote2}`;
          }
          return match;
        }
      );
      
      await writeFile(fullPath, content, 'utf-8');
    }
  }
}

const distPath = join(__dirname, '..', 'dist');
console.log('Fixing ES module imports in:', distPath);

fixImports(distPath)
  .then(() => console.log('✅ Import paths fixed'))
  .catch(err => {
    console.error('❌ Error fixing imports:', err);
    process.exit(1);
  });
