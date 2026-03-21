#!/usr/bin/env node
/**
 * Apply repository-specific fixes after syncing from source
 * This file is deployed and customized per repository by run_phase1_sync.py
 */

const fs = require('fs');
const path = require('path');

// Repository-specific fixes will be injected here by run_phase1_sync.py
const fixes = {
  "packages/docs/sidebars.ts": [
    {
      "type": "replace",
      "find": "\t\t\t\t\t\t\ttype: 'category',\n\t\t\t\t\t\t\tlabel: 'sites',\n\t\t\t\t\t\t\tlink: {\n\t\t\t\t\t\t\t\ttype: 'doc',\n\t\t\t\t\t\t\t\tid: 'lambda/cli/sites',",
      "replace": "\t\t\t\t\t\t\ttype: 'category',\n\t\t\t\t\t\t\tkey: 'lambda-cli-sites',\n\t\t\t\t\t\t\tlabel: 'sites',\n\t\t\t\t\t\t\tlink: {\n\t\t\t\t\t\t\t\ttype: 'doc',\n\t\t\t\t\t\t\t\tid: 'lambda/cli/sites',",
      "comment": "Add key to lambda sites category to disambiguate from cloudrun sites (duplicate label in apiSidebar)"
    },
    {
      "type": "replace",
      "find": "\t\t\t\t\t\t\ttype: 'category',\n\t\t\t\t\t\t\tlabel: 'sites',\n\t\t\t\t\t\t\tlink: {\n\t\t\t\t\t\t\t\ttype: 'doc',\n\t\t\t\t\t\t\t\tid: 'cloudrun/cli/sites',",
      "replace": "\t\t\t\t\t\t\ttype: 'category',\n\t\t\t\t\t\t\tkey: 'cloudrun-cli-sites',\n\t\t\t\t\t\t\tlabel: 'sites',\n\t\t\t\t\t\t\tlink: {\n\t\t\t\t\t\t\t\ttype: 'doc',\n\t\t\t\t\t\t\t\tid: 'cloudrun/cli/sites',",
      "comment": "Add key to cloudrun sites category to disambiguate from lambda sites (duplicate label in apiSidebar)"
    },
    {
      "type": "replace",
      "find": "\t\t\t\t\ttype: 'category',\n\t\t\t\t\tlabel: 'Troubleshooting',\n\t\t\t\t\titems: [\n\t\t\t\t\t\t'lambda/troubleshooting/debug',",
      "replace": "\t\t\t\t\ttype: 'category',\n\t\t\t\t\tkey: 'lambda-troubleshooting',\n\t\t\t\t\tlabel: 'Troubleshooting',\n\t\t\t\t\titems: [\n\t\t\t\t\t\t'lambda/troubleshooting/debug',",
      "comment": "Add key to lambda Troubleshooting category (3 Troubleshooting categories in mainSidebar)"
    },
    {
      "type": "replace",
      "find": "\t\t\ttype: 'category',\n\t\t\tlabel: 'Troubleshooting',\n\t\t\titems: [\n\t\t\t\t'troubleshooting/debug-failed-render',",
      "replace": "\t\t\ttype: 'category',\n\t\t\tkey: 'main-troubleshooting',\n\t\t\tlabel: 'Troubleshooting',\n\t\t\titems: [\n\t\t\t\t'troubleshooting/debug-failed-render',",
      "comment": "Add key to main Troubleshooting category (3 Troubleshooting categories in mainSidebar)"
    },
    {
      "type": "replace",
      "find": "\t\t\t\t\ttype: 'category',\n\t\t\t\t\tlabel: 'Troubleshooting',\n\t\t\t\t\titems: [\n\t\t\t\t\t\t'recorder/troubleshooting/cannot-read-properties-of-undefined',",
      "replace": "\t\t\t\t\ttype: 'category',\n\t\t\t\t\tkey: 'recorder-troubleshooting',\n\t\t\t\t\tlabel: 'Troubleshooting',\n\t\t\t\t\titems: [\n\t\t\t\t\t\t'recorder/troubleshooting/cannot-read-properties-of-undefined',",
      "comment": "Add key to recorder Troubleshooting category (3 Troubleshooting categories in mainSidebar)"
    }
  ]
};
const newFiles = {};

function applyFixes() {
  console.log('Applying repository-specific fixes...');

  // Apply file modifications
  for (const [filePath, operations] of Object.entries(fixes)) {
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️ File not found: ${filePath}`);
      continue;
    }

    console.log(`  Fixing ${filePath}...`);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const op of operations) {
      switch (op.type) {
        case 'replace':
          if (content.includes(op.find)) {
            // Handle special case of replacing with empty string (deletion)
            const replacement = op.replace || '';
            // Use split/join for literal string replacement
            content = content.split(op.find).join(replacement);
            modified = true;
            console.log(`    ✓ Replaced pattern${op.comment ? ': ' + op.comment : ''}`);
          }
          break;

        case 'delete_lines':
          const lines = content.split('\n');
          lines.splice(op.startLine - 1, op.endLine - op.startLine + 1);
          content = lines.join('\n');
          modified = true;
          console.log(`    ✓ Deleted lines ${op.startLine}-${op.endLine}${op.comment ? ': ' + op.comment : ''}`);
          break;

        case 'insert_after_line':
          const insertLines = content.split('\n');
          insertLines.splice(op.line, 0, op.content);
          content = insertLines.join('\n');
          modified = true;
          console.log(`    ✓ Inserted content after line ${op.line}${op.comment ? ': ' + op.comment : ''}`);
          break;

        case 'delete_file':
          fs.unlinkSync(filePath);
          console.log(`    ✓ Deleted file${op.comment ? ': ' + op.comment : ''}`);
          modified = false; // Mark as not modified to skip write
          break; // Continue to next file instead of returning
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`    ✓ File updated`);
    }
  }

  // Create new files
  for (const [filePath, fileConfig] of Object.entries(newFiles)) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const fileContent = typeof fileConfig === 'string' ? fileConfig : fileConfig.content;
    fs.writeFileSync(filePath, fileContent, 'utf8');
    console.log(`  ✓ Created ${filePath}${fileConfig.comment ? ': ' + fileConfig.comment : ''}`);
  }

  console.log('Repository-specific fixes applied successfully.');
}

// Main execution
try {
  if (Object.keys(fixes).length === 0 && Object.keys(newFiles).length === 0) {
    console.log('No repository-specific fixes to apply.');
    process.exit(0);
  }

  applyFixes();
  process.exit(0);
} catch (error) {
  console.error('Error applying fixes:', error);
  console.error(error.stack);
  process.exit(1);
}
