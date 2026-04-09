#!/usr/bin/env node
/**
 * Deskive Integration Seed Generator
 *
 * This script generates the complete integrations.seed.json file with all 170+ integrations.
 * Run: node scripts/generate-integrations-seed.js
 *
 * Already Implemented (17): google-drive, google-calendar, gmail, google-sheets, slack,
 * github, microsoft-teams, notion, jira, trello, asana, dropbox, zoom, linear, figma, hubspot, sendgrid
 */

const fs = require('fs');
const path = require('path');

// Import integration definitions from separate data files
const { communicationIntegrations } = require('./integration-data/communication');
const { projectManagementIntegrations } = require('./integration-data/project-management');
const { crmIntegrations } = require('./integration-data/crm');
const { fileStorageIntegrations } = require('./integration-data/file-storage');
const { emailMarketingIntegrations } = require('./integration-data/email-marketing');
const { calendarIntegrations } = require('./integration-data/calendar');
const { videoConferencingIntegrations } = require('./integration-data/video-conferencing');
const { developmentIntegrations } = require('./integration-data/development');
const { designIntegrations } = require('./integration-data/design');
const { automationIntegrations } = require('./integration-data/automation');
const { analyticsIntegrations } = require('./integration-data/analytics');
const { paymentIntegrations } = require('./integration-data/payments');
const { ecommerceIntegrations } = require('./integration-data/ecommerce');
const { socialMediaIntegrations } = require('./integration-data/social-media');
const { hrIntegrations } = require('./integration-data/hr');
const { supportIntegrations } = require('./integration-data/support');
const { securityIntegrations } = require('./integration-data/security');
const { aiIntegrations } = require('./integration-data/ai');

// Already implemented integrations (skip these)
const ALREADY_IMPLEMENTED = [
  'google-drive', 'google-calendar', 'gmail', 'google-sheets',
  'slack', 'github', 'microsoft-teams', 'notion', 'jira',
  'trello', 'asana', 'dropbox', 'zoom', 'linear', 'figma',
  'hubspot', 'sendgrid'
];

// Combine all integrations
const allIntegrations = [
  ...communicationIntegrations,
  ...projectManagementIntegrations,
  ...crmIntegrations,
  ...fileStorageIntegrations,
  ...emailMarketingIntegrations,
  ...calendarIntegrations,
  ...videoConferencingIntegrations,
  ...developmentIntegrations,
  ...designIntegrations,
  ...automationIntegrations,
  ...analyticsIntegrations,
  ...paymentIntegrations,
  ...ecommerceIntegrations,
  ...socialMediaIntegrations,
  ...hrIntegrations,
  ...supportIntegrations,
  ...securityIntegrations,
  ...aiIntegrations,
];

// Filter out already implemented
const newIntegrations = allIntegrations.filter(
  (integration) => !ALREADY_IMPLEMENTED.includes(integration.slug)
);

// Read existing seed file
const existingSeedPath = path.join(__dirname, '../src/modules/integration-framework/seed/integrations.seed.json');
let existingIntegrations = [];

try {
  const existingData = JSON.parse(fs.readFileSync(existingSeedPath, 'utf-8'));
  existingIntegrations = existingData.integrations || [];
  console.log(`Found ${existingIntegrations.length} existing integrations`);
} catch (error) {
  console.log('No existing seed file found, creating new one');
}

// Merge: keep existing, add new
const existingSlugs = new Set(existingIntegrations.map(i => i.slug));
const integrationsToAdd = newIntegrations.filter(i => !existingSlugs.has(i.slug));

const finalIntegrations = [...existingIntegrations, ...integrationsToAdd];

// Generate output
const output = {
  integrations: finalIntegrations
};

// Write to seed file
const outputPath = path.join(__dirname, '../src/modules/integration-framework/seed/integrations.seed.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`
========================================
Integration Seed Generation Complete!
========================================
Existing integrations: ${existingIntegrations.length}
New integrations added: ${integrationsToAdd.length}
Total integrations: ${finalIntegrations.length}
========================================
Output: ${outputPath}
`);

// Generate summary by category
const byCategory = {};
finalIntegrations.forEach(i => {
  byCategory[i.category] = (byCategory[i.category] || 0) + 1;
});

console.log('By Category:');
Object.entries(byCategory)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });
