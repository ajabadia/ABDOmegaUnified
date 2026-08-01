#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const APP_DIR = path.join(PROJECT_ROOT, 'app');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'docs', 'grafos');

// Files that are expected to have no imports/dependents (framework entry points, ambient types, etc.)
// These are excluded from the orphan list to reduce noise.
const ORPHAN_EXCLUSIONS = [
  'app/',                    // Next.js entry points (page.tsx, robots.ts, api/*, etc.)
  'src/types/global.d.ts',   // Ambient global type declarations — discovered by TypeScript, not imported
];

// Ensure output directory exists
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Read tsconfig.json to handle path aliases
let pathsConfig = {};
try {
  const tsconfig = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'tsconfig.json'), 'utf8'));
  pathsConfig = tsconfig.compilerOptions?.paths || {};
} catch (e) {
  console.warn('Could not load tsconfig.json paths:', e.message);
}

// Extracted files and their dependencies
const dependencies = new Map(); // file -> Set of resolved dependencies
const dependents = new Map(); // file -> Set of resolved dependents
const purposes = new Map(); // file -> purpose string
const purposesEn = new Map(); // file -> purposeEn string
const refactorables = new Map(); // file -> refactorable string
const classifications = new Map(); // file -> classification string
const complexities = new Map(); // file -> complexity string
const fileStats = new Map(); // file -> { sizeKb, linesCount, tag, categoryLabel, exportsList }
const externalDeps = new Map(); // file -> Set of external packages


function getExternalPackage(importPath) {
  if (importPath.startsWith('.') || importPath.startsWith('@/')) {
    return null;
  }
  if (importPath.startsWith('node:')) {
    return importPath;
  }
  const parts = importPath.split('/');
  if (importPath.startsWith('@')) {
    return parts.slice(0, 2).join('/');
  }
  return parts[0];
}


function getFileCategory(file) {
  const name = path.basename(file);
  if (file.startsWith('app/')) {
    return { tag: 'route', label: 'Next.js App Route 🌐' };
  }
  if (file.includes('/components/') || file.includes('/ui/')) {
    return { tag: 'component', label: 'Componente de Interfaz (UI) 🎨' };
  }
  if (name.startsWith('use') && file.includes('/hooks/')) {
    return { tag: 'hook', label: 'Custom Hook ⚓' };
  }
  if (file.includes('/services/') || file.includes('/rpc/')) {
    return { tag: 'service', label: 'Servicio de Negocio ⚙️' };
  }
  if (file.includes('/types/') || name.endsWith('types.ts') || name.endsWith('Types.ts') || file.endsWith('.d.ts')) {
    return { tag: 'types', label: 'Declaraciones de Tipo 🏷️' };
  }
  return { tag: 'utility', label: 'Utilidades / Lógica de Soporte 🛠️' };
}

function extractExports(content) {
  const exportsList = [];
  let match;

  // Regex for named exports
  const namedExportRegex = /^\s*export\s+(?:type|interface|const|let|var|function|class|enum|async\s+function)\s+([a-zA-Z0-9_$]+)/gm;
  while ((match = namedExportRegex.exec(content)) !== null) {
    exportsList.push(match[1]);
  }

  // Regex for export default
  const defaultExportRegex = /^\s*export\s+default\s+(?:async\s+)?(?:function|class|const|let)?\s*([a-zA-Z0-9_$]+)?/gm;
  while ((match = defaultExportRegex.exec(content)) !== null) {
    const name = match[1] ? `${match[1]} (Default)` : 'default';
    exportsList.push(name);
  }

  return Array.from(new Set(exportsList)).slice(0, 15);
}


// Walk directory recursively
function walk(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git' && file !== 'dist' && file !== 'docs') {
        walk(filePath, fileList);
      }
    } else {
      const ext = path.extname(file);
      if (['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(ext) && !file.endsWith('.test.ts') && !file.endsWith('.test.tsx') && !file.endsWith('.spec.ts') && !file.endsWith('.spec.tsx')) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

// Get all files
const allFiles = [...walk(SRC_DIR), ...walk(APP_DIR)];
const relativeFiles = allFiles.map(f => path.relative(PROJECT_ROOT, f).replace(/\\/g, '/'));

// Initialize maps
for (const file of relativeFiles) {
  dependencies.set(file, new Set());
  dependents.set(file, new Set());
  externalDeps.set(file, new Set());
}

// Resolve import path to a relative file path in the project
function resolveImport(importPath, currentFileDir) {
  // 1. Resolve path aliases (e.g. @/components/ui/button)

  for (const alias of Object.keys(pathsConfig)) {
    const aliasPrefix = alias.replace('*', '');
    if (importPath.startsWith(aliasPrefix)) {
      const targetPrefixes = pathsConfig[alias].map(p => p.replace('*', ''));
      for (const targetPrefix of targetPrefixes) {
        // Try resolving by replacing aliasPrefix with targetPrefix
        const candidate = path.join(PROJECT_ROOT, importPath.replace(aliasPrefix, targetPrefix));
        const resolvedPath = checkFileExistence(candidate);
        if (resolvedPath) {
          return path.relative(PROJECT_ROOT, resolvedPath).replace(/\\/g, '/');
        }
      }
    }
  }

  // 2. Resolve relative imports (e.g. ./utils, ../types)
  if (importPath.startsWith('.')) {
    const candidate = path.resolve(currentFileDir, importPath);
    const resolved = checkFileExistence(candidate);
    if (resolved) {
      return path.relative(PROJECT_ROOT, resolved).replace(/\\/g, '/');
    }
  }

  return null;
}

function checkFileExistence(basePath) {
  const extensions = ['.tsx', '.ts', '.jsx', '.js', '.d.ts', '.mjs'];
  
  // Direct file check
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
    return basePath;
  }
  // Try extensions
  for (const ext of extensions) {
    if (fs.existsSync(basePath + ext)) {
      return basePath + ext;
    }
  }
  // Try index files
  for (const ext of extensions) {
    const indexFile = path.join(basePath, 'index' + ext);
    if (fs.existsSync(indexFile)) {
      return indexFile;
    }
  }
  return null;
}

// Parse imports from file content
const importRegex = /(?:import|export)\s+?(?:type\s+?)?(?:[^'"]+|{[\s\S]*?})\s+?from\s+?['"]([^'"]+)['"]/g;
const simpleImportRegex = /import\s+?['"]([^'"]+)['"]/g;
const dynamicImportRegex = /import\((?:['"]([^'"]+)['"])\)/g;

function extractImports(content) {
  const imports = new Set();
  let match;
  
  // Reset regex indices
  importRegex.lastIndex = 0;
  simpleImportRegex.lastIndex = 0;
  dynamicImportRegex.lastIndex = 0;

  while ((match = importRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }
  while ((match = simpleImportRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }
  while ((match = dynamicImportRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }
  return Array.from(imports);
}

// Analyze all files
console.log(`Scanning ${allFiles.length} files for dependencies...`);
for (let i = 0; i < allFiles.length; i++) {
  const filePath = allFiles[i];
  const relativePath = relativeFiles[i];
  const fileDir = path.dirname(filePath);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract metadata metrics
    const linesCount = content.split(/\r?\n/).length;
    const sizeBytes = fs.statSync(filePath).size;
    const sizeKb = (sizeBytes / 1024).toFixed(1);
    const cat = getFileCategory(relativePath);
    const exportsList = extractExports(content);

    const purposeMatch = content.match(/@purpose\s+(.+)/);
    if (purposeMatch) {
      purposes.set(relativePath, purposeMatch[1].trim());
    }
    const purposeEnMatch = content.match(/@purpose_en\s+(.+)/);
    if (purposeEnMatch) {
      purposesEn.set(relativePath, purposeEnMatch[1].trim());
    }
    const refactorableMatch = content.match(/@refactorable\s+(.+)/);
    if (refactorableMatch) {
      refactorables.set(relativePath, refactorableMatch[1].trim());
    }
    const classificationMatch = content.match(/@classification\s+(.+)/);
    if (classificationMatch) {
      classifications.set(relativePath, classificationMatch[1].trim());
    }
    const complexityMatch = content.match(/@complexity\s+(.+)/);
    if (complexityMatch) {
      complexities.set(relativePath, complexityMatch[1].trim());
    }

    fileStats.set(relativePath, {
      sizeKb,
      linesCount,
      tag: cat.tag,
      categoryLabel: cat.label,
      exportsList
    });

    const importedPaths = extractImports(content);
    
    for (const imp of importedPaths) {
      const extPkg = getExternalPackage(imp);
      if (extPkg) {
        externalDeps.get(relativePath).add(extPkg);
      }
      
      const resolved = resolveImport(imp, fileDir);
      if (resolved && resolved !== relativePath) {
        dependencies.get(relativePath).add(resolved);
        if (!dependents.has(resolved)) {
          dependents.set(resolved, new Set());
        }
        dependents.get(resolved).add(relativePath);
      }
    }
  } catch (e) {
    console.error(`Error reading ${relativePath}:`, e.message);
  }
}

// Generate Markdown files mirroring the project structure
console.log('Generating Obsidian Markdown graph files...');
for (const file of relativeFiles) {
  const outputFilePath = path.join(OUTPUT_DIR, file + '.md');
  const outputFileDir = path.dirname(outputFilePath);
  
  if (!fs.existsSync(outputFileDir)) {
    fs.mkdirSync(outputFileDir, { recursive: true });
  }
  
  const fileDeps = Array.from(dependencies.get(file) || []).sort();
  const fileDepsOf = Array.from(dependents.get(file) || []).sort();
  const fileExtDeps = Array.from(externalDeps.get(file) || []).sort();
  const stats = fileStats.get(file) || { sizeKb: '0.0', linesCount: 0, tag: 'general', categoryLabel: 'Archivo 📁', exportsList: [] };
  const filePurpose = purposes.get(file);
  const filePurposeEn = purposesEn.get(file);
  const fileRefactorable = refactorables.get(file);
  const fileClassification = classifications.get(file);
  const fileComplexity = complexities.get(file);
  
  let mdContent = `---\n`;
  mdContent += `tags: [${stats.tag}]\n`;
  mdContent += `---\n`;
  mdContent += `# ${file}\n\n`;

  const isExcluded = ORPHAN_EXCLUSIONS.some(pattern => {
    if (pattern.endsWith('/')) {
      return file.startsWith(pattern);
    }
    return file === pattern;
  });
  if (fileDepsOf.length === 0 && !isExcluded) {
    mdContent += `> [!WARNING] Archivo Aislado o Huérfano\n`;
    mdContent += `> Este archivo no es importado por ningún otro archivo del proyecto. Podría ser código muerto o un punto de entrada independiente.\n\n`;
  }

  mdContent += `> [!NOTE]\n`;
  mdContent += `> - **Ruta:** \`${file}\`\n`;
  mdContent += `> - **Categoría:** ${stats.categoryLabel}\n`;
  mdContent += `> - **Dimensiones:** ${stats.sizeKb} KB (${stats.linesCount} líneas de código)\n`;
  mdContent += `> - **Acoplamiento:** ${fileDeps.length} dependencias internas, ${fileDepsOf.length} dependientes\n`;
  if (filePurpose) {
    mdContent += `> - **Propósito (ES):** ${filePurpose}\n`;
  }
  if (filePurposeEn) {
    mdContent += `> - **Purpose (EN):** ${filePurposeEn}\n`;
  }
  if (fileRefactorable) {
    mdContent += `> - **Refactorizable:** ${fileRefactorable}\n`;
  }
  if (fileClassification) {
    mdContent += `> - **Clasificación:** ${fileClassification}\n`;
  }
  if (fileComplexity) {
    mdContent += `> - **Complejidad:** ${fileComplexity}\n`;
  }
  if (stats.exportsList.length > 0) {
    mdContent += `> - **API Pública (Exports):** \`${stats.exportsList.join('`, `')}\`\n`;
  }
  mdContent += `\n`;
  
  mdContent += `## 🔌 Dependencias (Imports / Usos)\n`;
  if (fileDeps.length === 0) {
    mdContent += `*Este archivo no tiene dependencias de otros archivos del proyecto.*\n`;
  } else {
    for (const dep of fileDeps) {
      const displayName = path.basename(dep);
      mdContent += `- [[docs/grafos/${dep}|${displayName}]] (\`${dep}\`)\n`;
    }
  }
  
  mdContent += `\n### 📦 Librerías Externas (npm)\n`;
  if (fileExtDeps.length === 0) {
    mdContent += `*Este archivo no depende de librerías externas de npm.*\n`;
  } else {
    for (const extDep of fileExtDeps) {
      mdContent += `- \`${extDep}\`\n`;
    }
  }
  
  mdContent += `\n## 🧲 Dependientes (Importado por / Usado por)\n`;
  if (fileDepsOf.length === 0) {
    mdContent += `*Ningún otro archivo del proyecto importa este archivo directamente.*\n`;
  } else {
    for (const depOf of fileDepsOf) {
      const displayName = path.basename(depOf);
      mdContent += `- [[docs/grafos/${depOf}|${displayName}]] (\`${depOf}\`)\n`;
    }
  }
  
  fs.writeFileSync(outputFilePath, mdContent, 'utf8');
}

// Generate master GRAPH.md
const orphans = [];
const orphansExcluded = [];
let totalConnections = 0;
for (const file of relativeFiles) {
  const depsCount = dependencies.get(file)?.size || 0;
  const depsOfCount = dependents.get(file)?.size || 0;
  totalConnections += depsCount;
  if (depsCount === 0 && depsOfCount === 0) {
    const isExcluded = ORPHAN_EXCLUSIONS.some(pattern => file.startsWith(pattern));
    if (isExcluded) {
      orphansExcluded.push(file);
    } else {
      orphans.push(file);
    }
  }
}

// Build module level graph (e.g. src/components, src/lib, app)
const moduleConnections = new Map(); // "moduleA -> moduleB" -> count
function getModuleName(filePath) {
  const parts = filePath.split('/');
  if (parts[0] === 'src') {
    return parts.length > 2 ? `src/${parts[1]}/${parts[2]}` : `src/${parts[1]}`;
  }
  return parts[0]; // e.g. "app"
}

for (const [file, deps] of dependencies.entries()) {
  const sourceMod = getModuleName(file);
  for (const dep of deps) {
    const destMod = getModuleName(dep);
    if (sourceMod !== destMod) {
      const key = `"${sourceMod}" --> "${destMod}"`;
      moduleConnections.set(key, (moduleConnections.get(key) || 0) + 1);
    }
  }
}

let mermaidGraph = `graph TD\n`;
for (const conn of moduleConnections.keys()) {
  mermaidGraph += `  ${conn}:::edgeText\n`;
}
// Add some styles to mermaid
mermaidGraph += `  classDef default fill:#111,stroke:#00f0ff,stroke-width:1px,color:#fff;\n`;

let masterMd = `# Índice Maestro de Grafos de Dependencia

Esta carpeta contiene la estructura completa e interactiva de dependencias del proyecto **ABDOmegaEditor**.

---

## 🔄 Cómo Actualizar el Grafo
Cuando realices cambios en la estructura de archivos o agregues nuevos imports, actualiza este grafo ejecutando:
\`\`\`bash
npm run generate-graphs
\`\`\`

---

## 🧭 Instrucciones para Obsidian
1. Abre esta carpeta del proyecto (\`ABDOmegaEditor\`) en **Obsidian** como un Vault.
2. Abre la vista de grafos (Graph View), o utiliza grafos locales en cualquier archivo dentro de \`docs/grafos/\`.
3. ¡Haz clic en los enlaces dentro de cada markdown para navegar por el mapa visual del código!

---

## 📊 Estadísticas del Proyecto
- **Total de Archivos Escaneados:** ${relativeFiles.length}
- **Total de Conexiones (Imports):** ${totalConnections}
- **Promedio de Dependencias por Archivo:** ${(totalConnections / relativeFiles.length).toFixed(2)}

---

## 🕸️ Relaciones de Módulos (Alto Nivel)
El siguiente diagrama muestra las conexiones entre los directorios principales (el grosor o presencia representa importaciones de archivos):

\`\`\`mermaid
${mermaidGraph}
\`\`\`

---

## 🔍 Análisis de Archivos Huérfanos o Aislados
Los archivos huérfanos **no tienen dependencias entrantes ni salientes** dentro del proyecto. Pueden ser componentes antiguos, scripts independientes, puntos de entrada no referenciados o código muerto:

${orphans.length === 0 ? '_No se detectaron archivos aislados._' : orphans.map(f => `- [\`${f}\`](file:///${path.join(PROJECT_ROOT, f).replace(/\\/g, '/')})`).join('\n')}

> [!NOTE] Archivos excluidos del análisis
> Los siguientes archivos son entry points del framework o declaraciones globales que **por diseño** no son importados por otros archivos:
> \
${orphansExcluded.map(f => `> - \`${f}\``).join('\n')}
`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'GRAPH.md'), masterMd, 'utf8');
console.log('GRAPH.md and graph folder generated successfully in docs/grafos!');
