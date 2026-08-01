const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const Ajv = require('ajv');

// Configuration
const SCHEMA_PATH = path.join(__dirname, '../Resources/schemas/omega-schema-v7.json');
const MODULES_DIR = path.join(__dirname, '../Resources/modules');
const ajv = new Ajv({ allErrors: true, useDefaults: true, strict: false });

async function validate() {
  console.log('--- OMEGA Manifest Validator (Era 6.1) ---');
  
  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`Error: Schema not found at ${SCHEMA_PATH}`);
    process.exit(1);
  }

  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const validateFn = ajv.compile(schema);

  // Search for YAML files
  const files = findYamlFiles(MODULES_DIR);
  console.log(`Found ${files.length} potential manifests.\n`);

  let totalErrors = 0;
  let invalidFiles = 0;

  files.forEach(file => {
    try {
      const content = yaml.load(fs.readFileSync(file, 'utf8'));
      const valid = validateFn(content);
      const relativePath = path.relative(path.join(__dirname, '..'), file);

      if (!valid) {
        invalidFiles++;
        console.error(`❌ [INVALID] ${relativePath}`);
        validateFn.errors.forEach(err => {
          console.error(`   - ${err.instancePath || 'root'}: ${err.message} ${JSON.stringify(err.params)}`);
          totalErrors++;
        });
      } else {
        console.log(`✅ [VALID]   ${relativePath}`);
      }
    } catch (e) {
      console.error(`🔥 [ERROR]   Failed to parse ${file}: ${e.message}`);
    }
  });

  console.log('\n--- Status ---');
  console.log(`Verified: ${files.length} files`);
  console.log(`Invalid:  ${invalidFiles} files`);
  console.log(`Errors:   ${totalErrors} total issues found.`);
}

function findYamlFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(findYamlFiles(file));
    } else if (file.endsWith('.yaml') || file.endsWith('.yml') || file.endsWith('.acemm')) {
      results.push(file);
    }
  });
  return results;
}

validate();
