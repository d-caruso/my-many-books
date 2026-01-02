#!/usr/bin/env npx ts-node

import fs from 'fs';
import path from 'path';
import { Project, SyntaxKind, InterfaceDeclaration, PropertySignature } from 'ts-morph';

interface ModelField {
  name: string;
  type: string;
  required: boolean;
  source: 'web' | 'mobile' | 'api';
}

interface ModelDefinition {
  name: string;
  fields: ModelField[];
  source: 'web' | 'mobile' | 'api';
  filePath: string;
}

class ModelDriftChecker {
  private project: Project;
  private models: Map<string, ModelDefinition[]> = new Map();

  constructor() {
    this.project = new Project({
      tsConfigFilePath: './tsconfig.base.json',
    });
  }

  async checkDrift(): Promise<void> {
    console.log('🔍 Checking model drift across apps...\n');

    // Scan all apps
    await this.scanWebAppModels();
    await this.scanMobileAppModels();
    await this.scanApiModels();

    // Compare and report
    this.reportDrift();
  }

  private async scanWebAppModels(): Promise<void> {
    const webTypesFile = 'apps/web-app/src/types/index.ts';
    if (!fs.existsSync(webTypesFile)) {
      console.warn(`⚠️  Web app types file not found: ${webTypesFile}`);
      return;
    }

    const sourceFile = this.project.addSourceFileAtPath(webTypesFile);
    const interfaces = sourceFile.getInterfaces();

    for (const interfaceDecl of interfaces) {
      const modelName = interfaceDecl.getName();
      const fields = this.extractFields(interfaceDecl, 'web');
      
      if (!this.models.has(modelName)) {
        this.models.set(modelName, []);
      }
      
      this.models.get(modelName)!.push({
        name: modelName,
        fields,
        source: 'web',
        filePath: webTypesFile,
      });
    }
  }

  private async scanMobileAppModels(): Promise<void> {
    // Check if mobile types exist
    const mobileTypesPatterns = [
      'apps/mobile/src/types/**/*.ts',
      'apps/mobile/src/services/handlers/**/*.ts',
    ];

    let foundMobileTypes = false;

    for (const pattern of mobileTypesPatterns) {
      const files = this.project.addSourceFilesAtPaths([pattern]);
      
      for (const sourceFile of files) {
        const interfaces = sourceFile.getInterfaces();
        
        for (const interfaceDecl of interfaces) {
          const modelName = interfaceDecl.getName();
          
          // Skip non-model interfaces
          if (!this.isModelInterface(modelName)) continue;
          
          foundMobileTypes = true;
          const fields = this.extractFields(interfaceDecl, 'mobile');
          
          if (!this.models.has(modelName)) {
            this.models.set(modelName, []);
          }
          
          this.models.get(modelName)!.push({
            name: modelName,
            fields,
            source: 'mobile',
            filePath: sourceFile.getFilePath(),
          });
        }
      }
    }

    if (!foundMobileTypes) {
      console.warn('⚠️  No mobile model types found - mobile app may not have models defined yet');
    }
  }

  private async scanApiModels(): Promise<void> {
    const apiModelsPattern = 'apps/api/src/models/interfaces/ModelInterfaces.ts';
    
    if (!fs.existsSync(apiModelsPattern)) {
      console.warn(`⚠️  API models file not found: ${apiModelsPattern}`);
      return;
    }

    const sourceFile = this.project.addSourceFileAtPath(apiModelsPattern);
    const interfaces = sourceFile.getInterfaces();

    for (const interfaceDecl of interfaces) {
      const modelName = interfaceDecl.getName();
      
      // Only check main model interfaces (not Creation/Update variants)
      if (modelName.includes('Attributes') && !modelName.includes('Creation') && !modelName.includes('Update')) {
        const cleanModelName = modelName.replace('Attributes', '');
        const fields = this.extractFields(interfaceDecl, 'api');
        
        if (!this.models.has(cleanModelName)) {
          this.models.set(cleanModelName, []);
        }
        
        this.models.get(cleanModelName)!.push({
          name: cleanModelName,
          fields,
          source: 'api',
          filePath: apiModelsPattern,
        });
      }
    }
  }

  private extractFields(interfaceDecl: InterfaceDeclaration, source: 'web' | 'mobile' | 'api'): ModelField[] {
    const fields: ModelField[] = [];
    
    const properties = interfaceDecl.getProperties();
    
    for (const prop of properties) {
      const name = prop.getName();
      const typeText = prop.getTypeNode()?.getText() || 'unknown';
      const isOptional = prop.hasQuestionToken();
      
      // Skip internal fields for comparison
      if (this.shouldSkipField(name, source)) continue;
      
      fields.push({
        name,
        type: this.normalizeType(typeText),
        required: !isOptional,
        source,
      });
    }
    
    return fields.sort((a, b) => a.name.localeCompare(b.name));
  }

  private shouldSkipField(fieldName: string, source: 'web' | 'mobile' | 'api'): boolean {
    // Skip internal/metadata fields
    const skipFields = [
      'creationDate', 'updateDate', 'createdAt', 'updatedAt',
      'userId', // Usually added by API, not sent by clients
    ];
    
    if (source === 'api') {
      // API has additional internal fields
      skipFields.push('id'); // API uses CreationOptional<number>, others use string/number
    }
    
    return skipFields.includes(fieldName);
  }

  private normalizeType(typeText: string): string {
    // Normalize common type differences
    return typeText
      .replace(/CreationOptional<(.+)>/, '$1')
      .replace(/\s+/g, ' ')
      .replace(/\|\s*null/, '?')
      .replace(/\|\s*undefined/, '?')
      .trim();
  }

  private isModelInterface(name: string): boolean {
    // Only check main model interfaces
    const modelNames = ['Book', 'Author', 'Category', 'User'];
    return modelNames.some(model => 
      name === model || 
      name === `${model}Response` || 
      name === `Create${model}Payload` ||
      name === `Update${model}Payload`
    );
  }

  private reportDrift(): void {
    let hasAnyDrift = false;

    console.log('📊 Model Drift Report\n');
    console.log('='.repeat(60));

    for (const [modelName, definitions] of this.models) {
      if (definitions.length < 2) {
        console.log(`\n⚪ ${modelName}: Only defined in ${definitions[0]?.source || 'unknown'}`);
        continue;
      }

      console.log(`\n📋 ${modelName}:`);
      
      // Compare fields across definitions
      const allFields = new Map<string, ModelField[]>();
      
      for (const def of definitions) {
        for (const field of def.fields) {
          if (!allFields.has(field.name)) {
            allFields.set(field.name, []);
          }
          allFields.get(field.name)!.push(field);
        }
      }

      let hasDrift = false;

      for (const [fieldName, fieldDefs] of allFields) {
        if (fieldDefs.length !== definitions.length) {
          // Field missing in some definitions
          const sources = fieldDefs.map(f => f.source).join(', ');
          const missingSources = definitions
            .map(d => d.source)
            .filter(s => !fieldDefs.some(f => f.source === s))
            .join(', ');
          
          console.log(`  ❌ ${fieldName}: Only in ${sources} (missing in ${missingSources})`);
          hasDrift = true;
        } else {
          // Check type differences
          const uniqueTypes = new Set(fieldDefs.map(f => `${f.type}${f.required ? '' : '?'}`));
          if (uniqueTypes.size > 1) {
            console.log(`  ⚠️  ${fieldName}: Type differences`);
            for (const fieldDef of fieldDefs) {
              console.log(`      ${fieldDef.source}: ${fieldDef.type}${fieldDef.required ? '' : '?'}`);
            }
            hasDrift = true;
          }
        }
      }

      if (!hasDrift) {
        console.log(`  ✅ No drift detected`);
      } else {
        hasAnyDrift = true;
      }
    }

    console.log('\n' + '='.repeat(60));
    
    if (!hasAnyDrift) {
      console.log('🎉 No model drift detected! All models are in sync.');
    } else {
      console.log('⚠️  Model drift detected! Consider synchronizing the differences above.');
      console.log('\nRecommendations:');
      console.log('1. Use shared-contracts library for API boundaries');
      console.log('2. Add this check to CI/CD pipeline');
      console.log('3. Update models to use consistent field names and types');
    }
  }
}

// CLI execution  
async function main() {
  const checker = new ModelDriftChecker();
  await checker.checkDrift();
}

// Run if script is executed directly
main().catch(console.error);

export { ModelDriftChecker };