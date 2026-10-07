#!/usr/bin/env tsx
/**
 * Generate RULETBL.cpy from rules.csv
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function padRight(value: string, length: number): string {
  return value.padEnd(length, ' ');
}

interface Rule {
  id: string;
  category: string;
  description: string;
  class: string;
  weight: number;
  carc: string;
  explanation: string;
}

function parseRulesCSV(csvPath: string): Rule[] {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n');
  const rules: Rule[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length >= 6) {
      rules.push({
        id: parts[0],
        category: parts[1],
        description: parts[2],
        class: parts[3],
        weight: parseInt(parts[4], 10),
        carc: parts[5],
        explanation: parts.slice(6).join(','),
      });
    }
  }
  
  return rules;
}

function generateRuleTable(rules: Rule[]): string {
  const lines: string[] = [];
  
  lines.push('      ******************************************************************');
  lines.push('      * RULE TABLE - 32 VALIDATION RULES                              *');
  lines.push('      * GENERATED FROM rules.csv                                      *');
  lines.push('      ******************************************************************');
  lines.push('       01  RULE-TABLE.');
  lines.push(`           05  RULE-COUNT              PIC 9(2) VALUE ${rules.length}.`);
  lines.push('           05  RULE-ENTRY OCCURS 32 TIMES');
  lines.push('                          ASCENDING KEY RULE-ID');
  lines.push('                          INDEXED BY RULE-IDX.');
  lines.push('               10  RULE-ID             PIC X(4).');
  lines.push('               10  RULE-CLASS          PIC X.');
  lines.push('                   88  RULE-HARD       VALUE \'H\'.');
  lines.push('                   88  RULE-CRITICAL   VALUE \'C\'.');
  lines.push('                   88  RULE-MANUAL     VALUE \'M\'.');
  lines.push('                   88  RULE-WARNING    VALUE \'W\'.');
  lines.push('               10  RULE-WEIGHT         PIC 9(3).');
  lines.push('               10  RULE-CARC           PIC X(3).');
  lines.push('               10  RULE-DESC           PIC X(60).');
  lines.push('      *');
  lines.push('       01  RULE-STATIC-DATA.');
  
  // Group by category
  const categories: Record<string, Rule[]> = {};
  for (const rule of rules) {
    if (!categories[rule.category]) {
      categories[rule.category] = [];
    }
    categories[rule.category].push(rule);
  }
  
  // Generate entries grouped by category
  for (const [category, catRules] of Object.entries(categories)) {
    const comment = category.toUpperCase();
    lines.push(`      * ${comment}`);
    
    for (const rule of catRules) {
      // Format: R001H10016 Description...
      const weight3 = padRight(String(rule.weight), 3, '0');
      const carc3 = padRight(rule.carc, 3);
      const desc = padRight(rule.description, 44);
      
      const value = `${rule.id}${rule.class}${weight3}${carc3}${desc}`;
      lines.push(`           05  FILLER PIC X(71) VALUE`);
      lines.push(`               '${value}'.`);
    }
  }
  
  lines.push('      *');
  lines.push('       01  RULE-TABLE-REDEF REDEFINES RULE-STATIC-DATA.');
  lines.push('           05  RULE-LOAD OCCURS 32 TIMES.');
  lines.push('               10  RULE-LOAD-ID        PIC X(4).');
  lines.push('               10  RULE-LOAD-CLASS     PIC X.');
  lines.push('               10  RULE-LOAD-WEIGHT    PIC 9(3).');
  lines.push('               10  RULE-LOAD-CARC      PIC X(3).');
  lines.push('               10  RULE-LOAD-DESC      PIC X(60).');
  
  return lines.join('\n');
}

async function main() {
  console.log('Generating RULETBL.cpy from rules.csv...');
  
  const rulesPath = path.join(__dirname, '..', 'rules', 'rules.csv');
  const outputPath = path.join(__dirname, '..', 'cobol', 'copy', 'RULETBL.cpy');
  
  const rules = parseRulesCSV(rulesPath);
  console.log(`  Found ${rules.length} rules`);
  
  const copybook = generateRuleTable(rules);
  fs.writeFileSync(outputPath, copybook);
  
  console.log(`  Written to ${outputPath}`);
  console.log('✓ RULETBL.cpy generated');
}

main().catch(console.error);
