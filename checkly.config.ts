import { defineConfig } from 'checkly';

export default defineConfig({
  projectName: 'BznsFlow Production',
  logicalId: 'bznsflow-production-global-reliability',
  repoUrl: 'https://github.com/yungahmed1100-gif/bznsflow-v2',
  checks: {
    checkMatch: 'monitoring/**/*.check.ts',
    locations: ['eu-central-1', 'ap-southeast-1', 'us-east-1'],
    tags: ['production', 'global-reliability'],
  },
});
