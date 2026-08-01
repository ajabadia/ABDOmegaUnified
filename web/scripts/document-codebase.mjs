#!/usr/bin/env node
/**
 * OMEGA CODEBASE DOCUMENTER - ORCHESTRATOR
 * Automated script to document Javascript/Typescript files using a local LLM API (Ollama/LM Studio).
 * Compares timestamps to prevent redundant audits and respects codebase safety.
 * Now includes structural fingerprinting to detect documentation drift.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { calculateFingerprint } from './lib/fingerprint.mjs';

// Load environment variables manually from .env file
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const [key, ...valueParts] = trimmed.split('=');
      const val = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
      process.env[key.trim()] = val;
    }
  }
}
loadEnv();

const PROJECT_ROOT = process.cwd();
const PLAN_PATH = path.join(PROJECT_ROOT, 'LLM_DOCUMENTATION_PLAN.md');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const APP_DIR = path.join(PROJECT_ROOT, 'app');

// Setup cloud providers fallback chain
const cloudProviders = [];
if (process.env.GROQ_API_KEY) {
  cloudProviders.push({
    name: 'groq',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    authHeader: `Bearer ${process.env.GROQ_API_KEY}`,
    models: {
      coder: 'llama-3.3-70b-versatile',
      translator: 'llama-3.1-8b-instant',
      single: 'llama-3.3-70b-versatile'
    },
    extraHeaders: {}
  });
}
if (process.env.GEMINI_API_KEY) {
  cloudProviders.push({
    name: 'gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    authHeader: `Bearer ${process.env.GEMINI_API_KEY}`,
    models: {
      coder: 'gemini-2.5-flash',
      translator: 'gemini-2.5-flash',
      single: 'gemini-2.5-flash'
    },
    extraHeaders: {}
  });
}
if (process.env.OPENROUTER_API_KEY) {
  cloudProviders.push({
    name: 'openrouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    authHeader: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    models: {
      coder: 'qwen/qwen-2.5-coder-32b-instruct',
      translator: 'google/gemma-2-9b-it:free',
      single: 'google/gemma-2-9b-it:free'
    },
    extraHeaders: {
      'HTTP-Referer': 'https://github.com/ABDVirtualInstruments/ABDOmegaEditor',
      'X-Title': 'OMEGA Codebase Documenter'
    }
  });
}

const USE_PIPELINE = (process.env.USE_PIPELINE || 'true').toLowerCase() === 'true';
const TEMP_FILE_PATH = path.join(PROJECT_ROOT, '.temp_batch_descriptions.json');
const BATCH_LIMIT = parseInt(process.env.BATCH_LIMIT || '10', 10);

const PREFER_LOCAL = (process.env.PREFER_LOCAL || 'true').toLowerCase() === 'true';

const activeProvider = cloudProviders[0];
const provider = PREFER_LOCAL ? 'ollama' : (activeProvider ? activeProvider.name : 'ollama');
const MODEL_CODER = PREFER_LOCAL ? (process.env.LLM_MODEL_CODER || 'qwen2.5-coder:7b') : (activeProvider ? activeProvider.models.coder : (process.env.LLM_MODEL_CODER || 'qwen2.5-coder:7b'));
const MODEL_TRANSLATOR = PREFER_LOCAL ? (process.env.LLM_MODEL_TRANSLATOR || 'llama3.2') : (activeProvider ? activeProvider.models.translator : (process.env.LLM_MODEL_TRANSLATOR || 'llama3.2'));
const SINGLE_MODEL = PREFER_LOCAL ? (process.env.LLM_MODEL || 'llama3.1:8b-instruct-q4_0') : (activeProvider ? activeProvider.models.single : (process.env.LLM_MODEL || 'llama3.1:8b-instruct-q4_0'));


if (!process.argv.includes('--status')) {
  console.log('=== OMEGA CODEBASE DOCUMENTER ===');
  if (PREFER_LOCAL) {
    console.log(`Preferred Provider: OLLAMA (Local)`);
    console.log(`  - Coder: ${MODEL_CODER} | Translator: ${MODEL_TRANSLATOR}`);
    if (cloudProviders.length > 0) {
      console.log(`Fallback Cloud Chain: ${cloudProviders.map(p => p.name.toUpperCase()).join(' -> ')}`);
    }
  } else {
    if (cloudProviders.length > 0) {
      console.log(`Cloud Providers Chain: ${cloudProviders.map(p => p.name.toUpperCase()).join(' -> ')}`);
      for (const p of cloudProviders) {
        console.log(`  - ${p.name.toUpperCase()}: Coder=${p.models.coder} | Translator=${p.models.translator}`);
      }
    } else {
      console.log(`Active Provider: OLLAMA (Local)`);
      console.log(`Endpoint: ${process.env.LLM_ENDPOINT || 'http://localhost:11434/v1/chat/completions'}`);
    }
  }
  console.log(`Mode: ${USE_PIPELINE ? 'Two-step Pipeline (Enabled)' : 'Single-step Model (Direct)'}`);
  console.log(`Batch Limit: ${BATCH_LIMIT} files\n`);
}

// Helper to walk directories recursively
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
      if (['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(ext) && 
          !file.endsWith('.test.ts') && !file.endsWith('.test.tsx') && 
          !file.endsWith('.spec.ts') && !file.endsWith('.spec.tsx') &&
          !file.endsWith('.d.ts')) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

// Get all files to process
const allFiles = [...walk(SRC_DIR), ...walk(APP_DIR)];
const relativeFiles = allFiles.map(f => path.relative(PROJECT_ROOT, f).replace(/\\/g, '/'));

// --- Parse @purpose, @purpose_en, @refactorable, @classification, @complexity and @fingerprint from JSDoc ---
function parseExistingDoc(content) {
  const purposeMatch = content.match(/@purpose\s+(.+)/);
  const purposeEnMatch = content.match(/@purpose_en\s+(.+)/);
  const refactorableMatch = content.match(/@refactorable\s+(.+)/);
  const classificationMatch = content.match(/@classification\s+(.+)/);
  const complexityMatch = content.match(/@complexity\s+(.+)/);
  const fingerprintMatch = content.match(/@fingerprint\s+(.+)/);
  const lastUpdatedMatch = content.match(/@lastUpdated\s+(.+)/);

  return {
    purpose: purposeMatch ? purposeMatch[1].trim() : null,
    purposeEn: purposeEnMatch ? purposeEnMatch[1].trim() : null,
    refactorable: refactorableMatch ? refactorableMatch[1].trim() : null,
    classification: classificationMatch ? classificationMatch[1].trim() : null,
    complexity: complexityMatch ? complexityMatch[1].trim() : null,
    fingerprint: fingerprintMatch ? fingerprintMatch[1].trim() : null,
    lastUpdated: lastUpdatedMatch ? lastUpdatedMatch[1].trim() : null,
  };
}

function getModuleKey(filePath) {
  if (filePath.startsWith('app/')) return 'Next.js App / Rutas';
  if (filePath.startsWith('src/services/')) return 'Servicios de Negocio (services)';
  if (filePath.startsWith('src/features/')) return 'Funcionalidades del Editor (features)';
  if (filePath.startsWith('src/components/')) return 'Componentes de Interfaz (components)';
  if (filePath.startsWith('src/omega-ui-core/')) return 'Nucleo de Diseno (omega-ui-core)';
  return 'Otros (lib, types, utils)';
}

// --- Check status command line argument ---
if (process.argv.includes('--status')) {
  try {
    const counts = { ok: 0, drift: 0, stale: 0, missing: 0 };
    const modules = {};
    
    for (let i = 0; i < relativeFiles.length; i++) {
      const filePath = relativeFiles[i];
      const fullPath = allFiles[i];
      const modKey = getModuleKey(filePath);
      
      if (!modules[modKey]) {
        modules[modKey] = { ok: 0, drift: 0, stale: 0, missing: 0, total: 0 };
      }
      modules[modKey].total++;
      
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const doc = parseExistingDoc(content);
        const currentFingerprint = calculateFingerprint(content);
        
        let status = 'missing';
        if (!doc.purpose || !doc.purposeEn) {
          counts.missing++;
          status = 'missing';
        } else if (content.length > 3000 && doc.refactorable === null) {
          counts.drift++;
          status = 'drift';
        } else if (doc.classification === null || doc.complexity === null) {
          counts.drift++;
          status = 'drift';
        } else if (!doc.fingerprint) {
          counts.stale++;
          status = 'stale';
        } else if (doc.fingerprint !== currentFingerprint) {
          counts.drift++;
          status = 'drift';
        } else {
          counts.ok++;
          status = 'ok';
        }
        modules[modKey][status]++;
      } catch {
        counts.missing++;
        modules[modKey]['missing']++;
      }
    }
    console.log(JSON.stringify({ totals: counts, modules: modules }));
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
  process.exit(0);
}

// --- Classify all files for processing ---
const classified = {
  missing: [],
  drift: [],
  stale: [],
  ok: []
};

const existingPurposes = {};
const existingPurposesEn = {};
const existingRefactorables = {};
const existingClassifications = {};
const existingComplexities = {};

for (let i = 0; i < relativeFiles.length; i++) {
  const filePath = relativeFiles[i];
  const fullPath = allFiles[i];
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const doc = parseExistingDoc(content);
    const currentFingerprint = calculateFingerprint(content);

    if (doc.purpose) {
      existingPurposes[filePath] = doc.purpose;
    }
    if (doc.purposeEn) {
      existingPurposesEn[filePath] = doc.purposeEn;
    }
    if (doc.refactorable !== null) {
      existingRefactorables[filePath] = doc.refactorable;
    }
    if (doc.classification !== null) {
      existingClassifications[filePath] = doc.classification;
    }
    if (doc.complexity !== null) {
      existingComplexities[filePath] = doc.complexity;
    }

    if (!doc.purpose || !doc.purposeEn) {
      classified.missing.push({ file: filePath });
    } else if (content.length > 3000 && doc.refactorable === null) {
      classified.drift.push({ file: filePath, purpose: doc.purpose, purposeEn: doc.purposeEn, refactorable: null, classification: doc.classification, complexity: doc.complexity });
    } else if (doc.classification === null || doc.complexity === null) {
      classified.drift.push({ file: filePath, purpose: doc.purpose, purposeEn: doc.purposeEn, refactorable: doc.refactorable, classification: doc.classification, complexity: doc.complexity });
    } else if (!doc.fingerprint) {
      classified.stale.push({ file: filePath, purpose: doc.purpose, purposeEn: doc.purposeEn, refactorable: doc.refactorable, classification: doc.classification, complexity: doc.complexity });
    } else if (doc.fingerprint !== currentFingerprint) {
      classified.drift.push({ file: filePath, purpose: doc.purpose, purposeEn: doc.purposeEn, refactorable: doc.refactorable, classification: doc.classification, complexity: doc.complexity });
    } else {
      classified.ok.push({ file: filePath, purpose: doc.purpose, purposeEn: doc.purposeEn, refactorable: doc.refactorable, classification: doc.classification, complexity: doc.complexity });
    }
  } catch (err) {
    console.error(`Error reading ${filePath}: ${err.message}`);
  }
}

const PROCESS_MODE = (process.env.PROCESS_MODE || 'MISSING').toUpperCase();
let targetFiles = [];

if (PROCESS_MODE === 'MISSING') {
  targetFiles = classified.missing.map(x => x.file);
} else if (PROCESS_MODE === 'DRIFT') {
  targetFiles = classified.drift.map(x => x.file);
} else if (PROCESS_MODE === 'STALE') {
  targetFiles = classified.stale.map(x => x.file);
} else {
  console.log(`Unknown PROCESS_MODE: ${PROCESS_MODE}. Defaulting to MISSING.`);
  targetFiles = classified.missing.map(x => x.file);
}

if (targetFiles.length === 0) {
  console.log(`No files found matching mode ${PROCESS_MODE}. No work pending.`);
  process.exit(0);
}

console.log(`Codebase status:`);
console.log(`  [OK]      Up to date:      ${classified.ok.length}`);
console.log(`  [DRIFT]   Changed:         ${classified.drift.length}`);
console.log(`  [STALE]   No fingerprint:  ${classified.stale.length}`);
console.log(`  [MISSING] No @purpose:     ${classified.missing.length}`);
console.log(`\nProcessing mode: ${PROCESS_MODE}`);
console.log(`Found ${targetFiles.length} target files. Batch limit is ${BATCH_LIMIT}.`);

const batch = targetFiles.slice(0, BATCH_LIMIT);
console.log(`Processing batch of ${batch.length} files...\n`);

// Function to call local Ollama
async function callLocalOllama(role, prompt, temperature, maxTokens) {
  let localModel = process.env.LLM_MODEL_CODER || 'qwen2.5-coder:7b';
  const isTranslation = prompt.includes('Traduce') || prompt.includes('translate') || prompt.includes('ingles al espanol');
  if (isTranslation) {
    localModel = process.env.LLM_MODEL_TRANSLATOR || 'llama3.2';
  } else if (role === 'single') {
    localModel = process.env.LLM_MODEL || 'llama3.1:8b-instruct-q4_0';
  }

  const endpoint = process.env.LLM_ENDPOINT || 'http://localhost:11434/v1/chat/completions';
  const timeoutMs = 30000;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: localModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: temperature,
      max_tokens: maxTokens
    }),
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (response.ok) {
    const data = await response.json();
    return data.choices[0].message.content.trim();
  }
  throw new Error(`Ollama returned status ${response.status}`);
}

// Function to call cloud providers in sequence
async function callCloudProviders(role, prompt, temperature, maxTokens) {
  for (let i = 0; i < cloudProviders.length; i++) {
    const prov = cloudProviders[i];
    const model = prov.models[role];
    
    const headers = { 'Content-Type': 'application/json' };
    if (prov.authHeader) {
      headers['Authorization'] = prov.authHeader;
    }
    Object.assign(headers, prov.extraHeaders);

    const maxRetries = 2; // Rapid failover per provider
    let delay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(prov.endpoint, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: temperature,
            max_tokens: maxTokens
          }),
          signal: AbortSignal.timeout(15000)
        });

        if (response.ok) {
          const data = await response.json();
          return data.choices[0].message.content.trim();
        }

        // If rate limited, wait a bit or failover
        if (response.status === 429) {
          if (attempt < maxRetries) {
            const retryAfter = response.headers.get('retry-after');
            const waitSec = retryAfter ? parseInt(retryAfter, 10) : (attempt * 3);
            console.warn(`   [Rate Limit 429 - Provider: ${prov.name}]: Attempt ${attempt}/${maxRetries}. Waiting ${waitSec}s...`);
            await new Promise(resolve => setTimeout(resolve, waitSec * 1000));
            continue;
          }
          console.warn(`   [Rate Limit 429 - Provider: ${prov.name}]: Failed after ${maxRetries} attempts. Failing over to next provider...`);
        } else {
          console.warn(`   [Cloud Error ${response.status} - Provider: ${prov.name}]: Failing over to next provider...`);
          break; // Break retry loop to try next provider immediately
        }
      } catch (error) {
        console.warn(`   [Network/Timeout Error - Provider: ${prov.name}]: ${error.message}`);
        if (attempt === maxRetries) {
          console.warn(`   [Provider: ${prov.name}] Failed all retries. Failing over...`);
        } else {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 1.5;
        }
      }
    }
  }
  throw new Error("All cloud providers failed.");
}

// Generic function to query Ollama/Cloud API
async function callLLM(role, prompt, temperature = 0.1, maxTokens = 150) {
  if (PREFER_LOCAL) {
    try {
      console.log(`   [Attempting Local Ollama]...`);
      const result = await callLocalOllama(role, prompt, temperature, maxTokens);
      console.log(`   [Local Success] Got response from Ollama.`);
      return result;
    } catch (localErr) {
      console.warn(`   [Local Failed]: ${localErr.message}. Falling back to Cloud providers...`);
      if (cloudProviders.length > 0) {
        try {
          return await callCloudProviders(role, prompt, temperature, maxTokens);
        } catch {
          throw new Error(`Failed to generate description: both local Ollama and cloud providers failed.`);
        }
      } else {
        throw new Error(`Failed to generate description: local Ollama failed and no cloud providers are configured.`);
      }
    }
  } else {
    // Prefer Cloud
    if (cloudProviders.length > 0) {
      try {
        console.log(`   [Attempting Cloud Chain]...`);
        return await callCloudProviders(role, prompt, temperature, maxTokens);
      } catch (_cloudErr) {
        console.warn(`   [Cloud Chain Failed]: ${_cloudErr.message}. Falling back to local Ollama...`);
      }
    }
    try {
      return await callLocalOllama(role, prompt, temperature, maxTokens);
    } catch {
      throw new Error(`Failed to generate description: both cloud providers and local Ollama failed.`);
    }
  }
}


// Query technical description in English from Coder Model
// Query technical description in English from Coder Model
async function queryEnglishDescription(filePath, content, existingPurpose = null, existingPurposeEn = null, existingRefactorable = null, existingClassification = null, existingComplexity = null) {
  const dirName = path.dirname(filePath);
  const baseName = path.basename(filePath);
  const contextHint = dirName.startsWith('src/services') ? 'servicios de infraestructura o lógica de negocio'
    : dirName.startsWith('src/features') ? 'componentes y lógica de la funcionalidad de edición'
    : dirName.startsWith('src/components') ? 'componentes de interfaz de usuario (UI)'
    : dirName.startsWith('src/omega-ui-core') ? 'núcleo del sistema de diseño y renderizadores visuales'
    : dirName.startsWith('app') ? 'rutas y páginas de Next.js'
    : 'código del editor';

  // Smart truncation: first 2000 chars (imports, declarations) + last 1000 chars (exports, closures)
  let fileContentSlice = content;
  if (content.length > 3000) {
    fileContentSlice = content.slice(0, 2000) + '\n\n[... TRUNCATED MIDDLE CONTENT ...]\n\n' + content.slice(-1000);
  }

  let prompt = `Analyze the following source code file and identify its main purpose in the context of the OMEGA manifest editor (ABDOmegaEditor).
File path: ${filePath}
Name: ${baseName}
Directory/Context: ${dirName} (${contextHint})

File content:
\`\`\`
${fileContentSlice}
\`\`\`
`;

  const isLarge = content.length > 3000;

  if (existingPurpose && existingPurposeEn && (!isLarge || existingRefactorable !== null) && existingClassification !== null && existingComplexity !== null) {
    prompt += `
The file currently has these functional descriptions and metadata:
Spanish: "${existingPurpose}"
English: "${existingPurposeEn}"
${existingRefactorable ? `Refactorable: "${existingRefactorable}"` : ''}
Classification: "${existingClassification}"
Complexity: "${existingComplexity}"

STRICT INSTRUCTIONS - FOLLOW TO THE LETTER:
- If these descriptions and metadata are still 100% accurate and correctly describe the file's primary purpose and structure, return ONLY the word "KEEP" (without quotes, formatting, or punctuation).
- If they are outdated or inaccurate due to structural code changes, return a new technical description, refactorable assessment, architectural classification, and complexity level.
  - Technical description: A precise 1-sentence description in English of what the file does.
    - START DIRECTLY with an action verb (e.g., "Manages...", "Renders...", "Handles...", "Validates...", "Calculates...").
    - NEVER start with "This file...", "The file...", "This code...", "The hook...", "The service..." or any other self-referential phrase.
    - DO NOT use more than 1 sentence. Be surgical.
  - Refactorable assessment (only if the file is >3KB): Determine if this file should be split/divided into smaller parts (like custom hooks or subcomponents).
    - IMPORTANT: Files that contain ONLY static data, constants, configurations, theme definitions, mock fixtures, or TypeScript types/interfaces should NOT be refactored. For such files, output ONLY "false (contains only static declarations/types/constants)".
    - Output ONLY "true" (with a very brief 1-sentence reason in English in parentheses, e.g., "true (contains too many state variables and UI parts)") or "false".
  - Classification: Choose exactly one of the following architectural roles:
    - "UI Component" (React components)
    - "Custom Hook" (React custom hooks starting with 'use')
    - "Context/Provider" (React context providers)
    - "Business Service" (business logic, RPC bridges, managers)
    - "Data/Constants" (static structures, manifests, theme maps)
    - "Type Definition" (TypeScript interfaces, types, schemas)
    - "Helper Utility" (generic helper/pure functions)
  - Complexity: Choose exactly one of: "Low", "Medium", "High" (based on amount of state, dependency coupling, async logic).

Format your output EXACTLY as follows:
Description: <1-sentence description>
Refactorable: <true (reason) OR false>
Classification: <Role name>
Complexity: <Low OR Medium OR High>
`;
  } else {
    prompt += `
STRICT INSTRUCTIONS - FOLLOW TO THE LETTER:
- Return a technical description in English, a refactorable assessment, an architectural classification, and a complexity level.
- Technical description: A precise 1-sentence description in English of what the file does.
  - START DIRECTLY with an action verb (e.g., "Manages...", "Renders...", "Handles...", "Validates...", "Calculates...").
  - NEVER start with "This file...", "The file...", "This code...", "The hook...", "The service..." or any other self-referential phrase.
  - DO NOT use more than 1 sentence. Be surgical.
- Refactorable assessment (only if the file is >3KB): Determine if this file should be split/divided into smaller parts (like custom hooks or subcomponents).
  - IMPORTANT: Files that contain ONLY static data, constants, configurations, theme definitions, mock fixtures, or TypeScript types/interfaces should NOT be refactored. For such files, output ONLY "false (contains only static declarations/types/constants)".
  - Output ONLY "true" (with a very brief 1-sentence reason in English in parentheses, e.g., "true (contains too many state variables and UI parts)") or "false".
- Classification: Choose exactly one of the following architectural roles:
  - "UI Component" (React components)
  - "Custom Hook" (React custom hooks starting with 'use')
  - "Context/Provider" (React context providers)
  - "Business Service" (business logic, RPC bridges, managers)
  - "Data/Constants" (static structures, manifests, theme maps)
  - "Type Definition" (TypeScript interfaces, types, schemas)
  - "Helper Utility" (generic helper/pure functions)
- Complexity: Choose exactly one of: "Low", "Medium", "High" (based on amount of state, dependency coupling, async logic).

Format your output EXACTLY as follows:
Description: <1-sentence description>
Refactorable: <true (reason) OR false>
Classification: <Role name>
Complexity: <Low OR Medium OR High>
`;
  }

  try {
    const rawEnglish = await callLLM('coder', prompt, 0.1, 250);
    const trimmedResult = rawEnglish.trim();
    if (trimmedResult.toUpperCase() === 'KEEP') {
      return { purposeEn: 'KEEP', refactorable: existingRefactorable, classification: existingClassification, complexity: existingComplexity };
    }

    let englishDescription = '';
    let refactorable = 'false';
    let classification = 'Helper Utility';
    let complexity = 'Low';

    const descMatch = trimmedResult.match(/Description:\s*(.+)/i);
    const refacMatch = trimmedResult.match(/Refactorable:\s*(.+)/i);
    const classMatch = trimmedResult.match(/Classification:\s*(.+)/i);
    const compMatch = trimmedResult.match(/Complexity:\s*(.+)/i);

    if (descMatch) {
      englishDescription = descMatch[1].trim();
    } else {
      englishDescription = trimmedResult.split('\n')[0].trim();
    }

    if (refacMatch) {
      refactorable = refacMatch[1].trim();
    }
    if (classMatch) {
      classification = classMatch[1].trim();
    }
    if (compMatch) {
      complexity = compMatch[1].trim();
    }

    // Clean up English self-reference
    englishDescription = englishDescription.replace(/^(This\s+(file|code)|The\s+(file|code|hook|component|service|function))\s+/i, '');
    englishDescription = englishDescription.replace(/^[\s:,;.-]+/, '').trim();
    englishDescription = englishDescription.charAt(0).toUpperCase() + englishDescription.slice(1);
    
    return { purposeEn: englishDescription, refactorable, classification, complexity };
  } catch (error) {
    console.error(`[Error in Pass 1 for ${filePath}] ${error.message}`);
    return null;
  }
}

// Translate English technical description to Spanish using Translator Model
async function translateToSpanish(englishDescription) {
  const prompt = `Traduce la siguiente descripcion tecnica en ingles al espanol de forma natural y fluida.
Descripcion tecnica:
"${englishDescription}"

INSTRUCCIONES ESTRICTAS - SIGUE AL PIE DE LA LETRA:
- Devuelve UNICAMENTE la traduccion precisa en espanol.
- EMPIEZA DIRECTAMENTE con el verbo de accion en espanol (por ejemplo: "Gestiona...", "Renderiza...", "Proporciona...", "Valida...").
- NUNCA empieces con "Este archivo...", "El archivo...", "Esta descripcion...", "El texto traducido..." ni ninguna otra frase similar.
- NO agregues explicaciones adicionales, markdown, ni te disculpes.
- NO uses mas de 1 frase. Se quirurgico.
- Solo devuelve el texto plano de la traduccion en espanol, sin comillas ni puntuacion al final.

GUIA DE TERMINOLOGIA TECNICA (MUY IMPORTANTE):
- Traduce "toast notification" o "toast" como "notificacion emergente" o "alerta flotante" (NUNCA como "panecillo" ni "tostada").
- Traduce "heatmap" como "mapa de calor" (NUNCA como "calor cuadro").
- Traduce "rack" como "rack" o "bastidor".
- Traduce "blueprint" como "plantilla" o "plano" (NUNCA como "plano de azul" ni "azul").
- Traduce "file drop" como "arrastre de archivos" o "soltar archivos" (NUNCA como "descarga de archivos" ni "bajar archivos").
- Traduce "drag-and-drop" como "arrastrar y soltar" (NUNCA como "capa de desplazamiento").
- Traduce "ghost preview" como "previsualizacion fantasma" o "vista previa fantasma".
- Manten terminos de desarrollo Web/React comunes en ingles si es lo mas natural en la jerga de programacion (ej: "hook", "viewport", "layout", "middleware").`;

  try {
    const rawSpanish = await callLLM('translator', prompt);
    let description = rawSpanish.replace(/^["']|["']$/g, '');
    
    // Clean up Spanish self-reference
    description = description.replace(/^(Este\s+(archivo|codigo)|El\s+(archivo|siguiente|codigo)|La\s+funcion|El\s+hook|El\s+componente|El\s+servicio|Esta\s+descripcion)\s+/i, '');
    description = description.replace(/^[\s:,;.-]+/, '').trim();
    description = description.charAt(0).toUpperCase() + description.slice(1);
    return description;
  } catch (error) {
    console.error(`[Error in Pass 2 (Translation)] ${error.message}`);
    return null;
  }
}

// Query direct descriptions in Spanish and English (Single Model Fallback)
async function queryDirectBilingual(filePath, content) {
  const dirName = path.dirname(filePath);
  const baseName = path.basename(filePath);
  const contextHint = dirName.startsWith('src/services') ? 'servicios de infraestructura o logica de negocio'
    : dirName.startsWith('src/features') ? 'componentes y logica de la funcionalidad de edicion'
    : dirName.startsWith('src/components') ? 'componentes de interfaz de usuario (UI)'
    : dirName.startsWith('src/omega-ui-core') ? 'nucleo del sistema de diseno y renderizadores visuales'
    : dirName.startsWith('app') ? 'rutas y paginas de Next.js'
    : 'codigo del editor';

  let fileContentSlice = content;
  if (content.length > 3000) {
    fileContentSlice = content.slice(0, 2000) + '\n\n[... TRUNCATED MIDDLE CONTENT ...]\n\n' + content.slice(-1000);
  }

  let prompt = `Analyze the following source code file and identify its main purpose in the context of the OMEGA manifest editor (ABDOmegaEditor).
Ruta del archivo: ${filePath}
Nombre: ${baseName}
Directorio/Contexto: ${dirName} (${contextHint})

File content:
\`\`\`
${fileContentSlice}
\`\`\`

STRICT INSTRUCTIONS - FOLLOW TO THE LETTER:
- Return a JSON object with exactly five keys: "purpose" (Spanish translation), "purpose_en" (English description), "refactorable" (refactorable assessment: "true (reason)" or "false" - only if file size is > 3KB), "classification" (role name), and "complexity" (Low | Medium | High).
- Do not add any markdown formatting, JSDoc blocks, explanations or apologies outside of the JSON. Return only the raw JSON.
- For "purpose_en" (English):
  - Must be a precise 1-sentence description in English of what the file does.
  - START DIRECTLY with an action verb (e.g., "Manages...", "Renders...", "Handles...", "Validates...", "Calculates...").
  - NEVER start with "This file...", "The file...", "This code...", "The hook...", "The service..." or any other self-referential phrase.
  - DO NOT use more than 1 sentence. Be surgical.
- For "purpose" (Spanish):
  - Must be the translation/adaptation of the English description to Spanish.
  - EMPIEZA DIRECTAMENTE con el verbo de accion. Ejemplo correcto: "Gestiona la carga de WebAssembly, extrae el contrato del modulo y lo expone a la UI".
  - NUNCA empieces con "Este archivo...", "El archivo...", "El siguiente codigo..." ni ninguna otra frase que se refiera al archivo mismo.
  - DO NOT use more than 1 sentence. Be surgical.
- For "refactorable" (only if the file is >3KB):
  - Determine if this large file should be split/divided into smaller parts (like custom hooks or subcomponents).
  - IMPORTANT: Files that contain ONLY static data, constants, configurations, theme definitions, mock fixtures, or TypeScript types/interfaces should NOT be refactored. For such files, output ONLY "false (contains only static declarations/types/constants)".
  - Output "true" (with a very brief 1-sentence reason in English in parentheses) or "false".
- For "classification":
  - Must be exactly one of: "UI Component", "Custom Hook", "Context/Provider", "Business Service", "Data/Constants", "Type Definition", "Helper Utility".
- For "complexity":
  - Must be exactly one of: "Low", "Medium", "High".
  
GUIA DE TERMINOLOGIA TECNICA (MUY IMPORTANTE):
- Traduce "toast notification" o "toast" como "notificacion emergente" o "alerta flotante" (NUNCA como "panecillo" ni "tostada").
- Traduce "heatmap" como "mapa de calor" (NUNCA como "calor cuadro").
- Traduce "rack" como "rack" o "bastidor".
- Traduce "blueprint" como "plantilla" o "plano" (NUNCA como "plano de azul" ni "azul").
- Traduce "file drop" como "arrastre de archivos" o "soltar archivos" (NUNCA como "descarga de archivos" ni "bajar archivos").
- Traduce "drag-and-drop" como "arrastrar y soltar" (NUNCA como "capa de desplazamiento").
- Traduce "ghost preview" como "previsualizacion fantasma" o "vista previa fantasma".
`;

  try {
    const rawResult = await callLLM('single', prompt, 0.1, 300);
    const cleaned = rawResult.replace(/```json\s*|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    let purpose = parsed.purpose || '';
    let purposeEn = parsed.purpose_en || '';
    let classification = parsed.classification || 'Helper Utility';
    let complexity = parsed.complexity || 'Low';
    
    purpose = purpose.replace(/^(Este\s+(archivo|codigo)|El\s+(archivo|siguiente|codigo)|La\s+funcion|El\s+hook|El\s+componente|El\s+servicio)\s+/i, '');
    purpose = purpose.replace(/^[\s:,;.-]+/, '').trim();
    purpose = purpose.charAt(0).toUpperCase() + purpose.slice(1);

    purposeEn = purposeEn.replace(/^(This\s+(file|code)|The\s+(file|code|hook|component|service|function))\s+/i, '');
    purposeEn = purposeEn.replace(/^[\s:,;.-]+/, '').trim();
    purposeEn = purposeEn.charAt(0).toUpperCase() + purposeEn.slice(1);
    
    const isLarge = content.length > 3000;
    const refactorable = isLarge ? (parsed.refactorable || 'false') : 'false';
    
    return { purpose, purposeEn, refactorable, classification, complexity };
  } catch (error) {
    console.error(`[Error de API con LLM en Single Pass] ${error.message}`);
    return null;
  }
}

// Inject JSDoc into the file, now including structural fingerprint
function injectJSDoc(filePath, purpose, purposeEn, refactorable = 'false', classification = 'Helper Utility', complexity = 'Low') {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  let content = fs.readFileSync(fullPath, 'utf8');

  // Detect line ending (\r\n or \n)
  const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';

  // Regex to detect if JSDoc block with @purpose already exists
  const existingJSDocRegex = /\/\*\*[\s\S]*?@purpose[\s\S]*?\*\/\r?\n?/;
  const hasJSDoc = existingJSDocRegex.test(content);

  // Calculate structural fingerprint
  const fingerprint = calculateFingerprint(content);
  const timestamp = new Date().toISOString();
  const newJSDoc = `/**
 * @purpose ${purpose}
 * @purpose_en ${purposeEn}
 * @refactorable ${refactorable}
 * @classification ${classification}
 * @complexity ${complexity}
 * @fingerprint ${fingerprint}
 * @lastUpdated ${timestamp}
 */${lineEnding}`;

  if (hasJSDoc) {
    // Overwrite existing JSDoc
    content = content.replace(existingJSDocRegex, newJSDoc);
  } else {
    // Inject at the beginning
    const useClientRegex = /^('use client'|"use client");?\r?\n/;
    const match = content.match(useClientRegex);
    if (match) {
      const useClientLine = match[0]; // Includes trailing line ending
      const rest = content.slice(useClientLine.length);
      content = `${useClientLine.trimEnd()}${lineEnding}${lineEnding}${newJSDoc}${lineEnding}${rest.trimStart()}`;
    } else {
      content = `${newJSDoc}${lineEnding}${content.trimStart()}`;
    }
  }

  fs.writeFileSync(fullPath, content, 'utf8');
}

// Log or update progress in LLM_DOCUMENTATION_PLAN.md inline
function logProgressInPlan(filePath) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const escapedPath = filePath.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const linePattern = new RegExp(`(-\\s*\\[[x ]\\]\\s*\`${escapedPath}\`\\s*(?:\\|\\s*Completado:\\s*[^\\r\\n]+)?)`, 'i');

  if (fs.existsSync(PLAN_PATH)) {
    let planContent = fs.readFileSync(PLAN_PATH, 'utf8');
    if (linePattern.test(planContent)) {
      const newLine = `- [x] \`${filePath}\` | Completado: ${timestamp}`;
      planContent = planContent.replace(linePattern, newLine);
      fs.writeFileSync(PLAN_PATH, planContent, 'utf8');
      console.log(`   -> Updated status in ${path.basename(PLAN_PATH)} inline.`);
      return;
    }
  }

  const logLine = `\n- [x] \`${filePath}\` | Completado: ${timestamp}`;
  fs.appendFileSync(PLAN_PATH, logLine, 'utf8');
  console.log(`   -> Appended status to ${path.basename(PLAN_PATH)}.`);
}

function writeBatchReport(startTime, fileStats, mode) {
  const endTime = Date.now();
  const totalElapsed = (endTime - startTime) / 1000;
  const count = fileStats.length;
  const avgTime = count > 0 ? totalElapsed / count : 0;
  
  const reportData = {
    timestampStart: new Date(startTime).toISOString(),
    timestampEnd: new Date(endTime).toISOString(),
    totalElapsedSeconds: parseFloat(totalElapsed.toFixed(2)),
    fileCount: count,
    averageSecondsPerFile: parseFloat(avgTime.toFixed(2)),
    mode: mode,
    files: fileStats
  };
  
  const docsDir = path.join(PROJECT_ROOT, 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  
  const reportPath = path.join(docsDir, 'last_batch_run.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), 'utf8');
  console.log(`\nExecution stats saved to: docs/last_batch_run.json`);
}

// Process loop
let successCount = 0;

if (PROCESS_MODE === 'STALE') {
  console.log(`\n--- FAST-TRACK UPGRADE FOR STALE FILES (No LLM) ---`);
  const batchStartTime = Date.now();
  const fileStats = [];

  for (const file of batch) {
    const fileStartTime = Date.now();
    console.log(`Upgrading JSDoc signature: ${file}...`);
    try {
      const fileObj = classified.stale.find(x => x.file === file);
      if (fileObj && fileObj.purpose) {
        injectJSDoc(file, fileObj.purpose, fileObj.purposeEn, fileObj.refactorable || 'false');
        logProgressInPlan(file);
        console.log(`   -> Successfully upgraded JSDoc fingerprint.\n`);
        successCount++;
        fileStats.push({
          file,
          mode: 'STALE',
          duration: parseFloat(((Date.now() - fileStartTime) / 1000).toFixed(2)),
          details: 'Upgrade - No LLM',
          status: 'Upgraded JSDoc fingerprint'
        });
      } else {
        console.log(`   -> Purpose not found for stale file. Skipping.\n`);
      }
    } catch (err) {
      console.error(`   -> Error upgrading ${file}: ${err.message}\n`);
    }
  }

  // Write report
  writeBatchReport(batchStartTime, fileStats, PROCESS_MODE);

  // Run graph regenerator if we processed any file successfully
  if (successCount > 0) {
    console.log('Regenerating Obsidian graph files...');
    try {
      execSync('npm run generate-graphs', { stdio: 'inherit' });
      console.log('[SUCCESS] Graphs updated successfully.');
    } catch (err) {
      console.error('[Error] Failed to run generate-graphs script:', err.message);
    }
  }

  console.log(`\nBatch completed: ${successCount} of ${batch.length} files successfully upgraded.`);
  process.exit(0);
}

if (USE_PIPELINE) {
  // === TWO-PASS PIPELINE ARCHITECTURE ===
  const englishDescriptions = {};
  const batchStartTime = Date.now();
  const fileStats = [];
  const pipelineStats = {};

  for (const file of batch) {
    const fullPath = path.join(PROJECT_ROOT, file);
    let size = 0;        try { size = fs.readFileSync(fullPath, 'utf8').length; } catch {}

    pipelineStats[file] = {
      file,
      mode: PROCESS_MODE,
      pass1Duration: 0,
      pass2Duration: 0,
      details: '',
      status: 'Pending',
      isTruncated: size > 3000,
      originalLength: size
    };
  }
  
  // Pass 1: English Analysis with Coder Model
  console.log(`\n--- PASS 1: Technical Analysis (Model: ${MODEL_CODER}) ---`);
  for (const file of batch) {
    console.log(`Analyzing (EN): ${file}...`);
    const p1Start = Date.now();
    try {
      const fullPath = path.join(PROJECT_ROOT, file);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Get technical English description
      const res = await queryEnglishDescription(file, content, existingPurposes[file], existingPurposesEn[file], existingRefactorables[file], existingClassifications[file], existingComplexities[file]);
      pipelineStats[file].pass1Duration = (Date.now() - p1Start) / 1000;
      if (res) {
        englishDescriptions[file] = {
          purposeEn: res.purposeEn,
          refactorable: content.length > 3000 ? (res.refactorable || 'false') : 'false',
          classification: res.classification || 'Helper Utility',
          complexity: res.complexity || 'Low'
        };
        if (res.purposeEn === 'KEEP') {
          console.log(`   -> English summary: KEEP (Existing English & Spanish descriptions are accurate)`);
          pipelineStats[file].status = 'Kept existing JSDoc';
          pipelineStats[file].details = 'Pass 1: KEEP';
        } else {
          console.log(`   -> English summary: "${res.purposeEn}"`);
          console.log(`   -> Refactorable: "${englishDescriptions[file].refactorable}"`);
          console.log(`   -> Classification: "${englishDescriptions[file].classification}"`);
          console.log(`   -> Complexity: "${englishDescriptions[file].complexity}"`);
          pipelineStats[file].status = 'Analyzed (EN)';
        }
      } else {
        console.log(`   -> Failed to generate English description. Skipping.\n`);
        pipelineStats[file].status = 'Failed (Pass 1)';
      }
    } catch (err) {
      console.error(`   -> Error during analysis for ${file}: ${err.message}\n`);
      pipelineStats[file].status = 'Error (Pass 1)';
    }
    if (provider !== 'ollama') {
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  }

  // Save English descriptions to temporary JSON file (as requested)
  if (Object.keys(englishDescriptions).length > 0) {
    fs.writeFileSync(TEMP_FILE_PATH, JSON.stringify(englishDescriptions, null, 2), 'utf8');
    console.log(`\nSaved ${Object.keys(englishDescriptions).length} English descriptions to temporary file: ${TEMP_FILE_PATH}`);
    
    // Read English descriptions back from temporary file
    const loadedEnglishDescriptions = JSON.parse(fs.readFileSync(TEMP_FILE_PATH, 'utf8'));

    // Pass 2: Spanish Translation with Translator Model
    console.log(`\n--- PASS 2: Spanish Translation & JSDoc Injection (Model: ${MODEL_TRANSLATOR}) ---`);
    for (const file of Object.keys(loadedEnglishDescriptions)) {
      console.log(`Translating (ES): ${file}...`);
      const p2Start = Date.now();
      try {
        const descObj = loadedEnglishDescriptions[file];
        const englishDescription = descObj.purposeEn;
        const refactorableVal = descObj.refactorable || 'false';
        const classificationVal = descObj.classification || 'Helper Utility';
        const complexityVal = descObj.complexity || 'Low';
        
        let purposeES = null;
        if (englishDescription === 'KEEP') {
          console.log(`   -> Reusing existing Spanish description (No translation needed).`);
          purposeES = existingPurposes[file];
          pipelineStats[file].pass2Duration = (Date.now() - p2Start) / 1000;
          pipelineStats[file].details = `Pass 1: ${pipelineStats[file].pass1Duration.toFixed(1)}s | Pass 2: Skip`;
        } else {
          purposeES = await translateToSpanish(englishDescription);
          pipelineStats[file].pass2Duration = (Date.now() - p2Start) / 1000;
          pipelineStats[file].details = `Pass 1: ${pipelineStats[file].pass1Duration.toFixed(1)}s | Pass 2: ${pipelineStats[file].pass2Duration.toFixed(1)}s`;
        }
        
        if (purposeES) {
          const injectedEnglish = englishDescription === 'KEEP' ? existingPurposesEn[file] : englishDescription;
          const injectedRefactorable = englishDescription === 'KEEP' ? (existingRefactorables[file] || 'false') : refactorableVal;
          const injectedClassification = englishDescription === 'KEEP' ? (existingClassifications[file] || 'Helper Utility') : classificationVal;
          const injectedComplexity = englishDescription === 'KEEP' ? (existingComplexities[file] || 'Low') : complexityVal;
          if (englishDescription !== 'KEEP') {
            console.log(`   -> Spanish translation: "${purposeES}"`);
            pipelineStats[file].status = 'Fully Documented';
          }
          injectJSDoc(file, purposeES, injectedEnglish, injectedRefactorable, injectedClassification, injectedComplexity);
          logProgressInPlan(file);
          console.log(`   -> Successfully injected and logged.\n`);
          successCount++;
        } else {
          console.log(`   -> Failed to translate to Spanish. Skipping.\n`);
          pipelineStats[file].status = 'Failed (Pass 2)';
        }
      } catch (err) {
        console.error(`   -> Error during translation/injection for ${file}: ${err.message}\n`);
        pipelineStats[file].status = 'Error (Pass 2)';
      }
      if (provider !== 'ollama') {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
    
    // Compile stats
    for (const file of batch) {
      const stats = pipelineStats[file];
      fileStats.push({
        file: stats.file,
        mode: stats.mode,
        duration: parseFloat((stats.pass1Duration + stats.pass2Duration).toFixed(2)),
        details: stats.details || `Pass 1: ${stats.pass1Duration.toFixed(1)}s`,
        status: stats.status,
        isTruncated: stats.isTruncated,
        originalLength: stats.originalLength
      });
    }

    // Write report
    writeBatchReport(batchStartTime, fileStats, PROCESS_MODE);
    
    // Clean up temporary JSON file
    if (fs.existsSync(TEMP_FILE_PATH)) {
      fs.unlinkSync(TEMP_FILE_PATH);
    }
  }
} else {
  // === SINGLE-PASS DIRECT DOCUMENTATION (Model: ${SINGLE_MODEL}) ---
  console.log(`\n--- SINGLE-PASS DIRECT DOCUMENTATION (Model: ${SINGLE_MODEL}) ---`);
  const batchStartTime = Date.now();
  const fileStats = [];

  for (const file of batch) {
    const fileStartTime = Date.now();
    console.log(`Analyzing (ES/EN): ${file}...`);
    try {
      const fullPath = path.join(PROJECT_ROOT, file);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const res = await queryDirectBilingual(file, content);
      let purpose = null;
      let purposeEn = null;
      let statusStr = 'Failed';
      let detailsStr = '';

      if (res) {
        purpose = res.purpose;
        purposeEn = res.purposeEn;
        const refactorableVal = content.length > 3000 ? (res.refactorable || 'false') : 'false';
        const classificationVal = res.classification || 'Helper Utility';
        const complexityVal = res.complexity || 'Low';
        console.log(`   -> Proposito (ES): "${purpose}"`);
        console.log(`   -> Purpose (EN): "${purposeEn}"`);
        console.log(`   -> Refactorable: "${refactorableVal}"`);
        console.log(`   -> Classification: "${classificationVal}"`);
        console.log(`   -> Complexity: "${complexityVal}"`);
        statusStr = 'Fully Documented';
        detailsStr = 'Single pass';

        injectJSDoc(file, purpose, purposeEn, refactorableVal, classificationVal, complexityVal);
        logProgressInPlan(file);
        console.log(`   -> Guardado e inyectado con exito.\n`);
        successCount++;
      } else {
        console.log(`   -> Fallo la obtencion de descripcion del LLM. Saltando.\n`);
      }

      fileStats.push({
        file,
        mode: PROCESS_MODE,
        duration: parseFloat(((Date.now() - fileStartTime) / 1000).toFixed(2)),
        details: detailsStr,
        status: statusStr,
        isTruncated: content.length > 3000,
        originalLength: content.length
      });
    } catch (err) {
      console.error(`   -> Error procesando el archivo ${file}: ${err.message}\n`);
      fileStats.push({
        file,
        mode: PROCESS_MODE,
        duration: parseFloat(((Date.now() - fileStartTime) / 1000).toFixed(2)),
        details: 'Error',
        status: 'Error: ' + err.message,
        isTruncated: false,
        originalLength: 0
      });
    }
    if (provider !== 'ollama') {
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  }

  // Write report
  writeBatchReport(batchStartTime, fileStats, PROCESS_MODE);
}

// Run graph regenerator if we processed any file successfully
if (successCount > 0) {
  console.log('Regenerating Obsidian graph files...');
  try {
    execSync('npm run generate-graphs', { stdio: 'inherit' });
    console.log('[SUCCESS] Graphs updated successfully.');
  } catch (err) {
    console.error('[Error] Failed to run generate-graphs script:', err.message);
  }
}

console.log(`\nBatch completed: ${successCount} of ${batch.length} files successfully processed.`);
