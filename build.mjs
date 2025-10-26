#!/usr/bin/env node

import { buildCli, buildMcp, buildAll } from './esbuild.config.mjs';

const args = process.argv.slice(2);
const command = args[0] || 'binary';

async function run() {
  switch (command) {
    case 'cli':
      await buildCli();
      break;
    case 'mcp':
      await buildMcp();
      break;
    case 'binary':
    case 'all':
      // For binary target, just build CLI and create executable
      await buildCli();
      // Add shebang to CLI bundle
      const fs = await import('fs');
      const cliPath = 'dist/cli.mjs';
      let content = fs.readFileSync(cliPath, 'utf-8');
      // Remove the existing shebang if present
      if (content.startsWith('#!')) {
        content = content.substring(content.indexOf('\n') + 1);
      }
      fs.writeFileSync('mdoc', '#!/usr/bin/env node\n' + content);
      fs.chmodSync('mdoc', 0o755);
      console.log('✓ Binary executable created: mdoc');
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Available commands: cli, mcp, binary');
      process.exit(1);
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
