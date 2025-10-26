import * as esbuild from 'esbuild';

export const baseConfig = {
  platform: 'node',
  target: 'node18',
  bundle: true,
  format: 'esm',
  outdir: 'dist',
  outExtension: {
    '.js': '.mjs'
  },
  external: [
    'commander',
    'tree-sitter',
    'tree-sitter-typescript',
    'tree-sitter-python',
    '@modelcontextprotocol/sdk',
    'zod'
  ],
  sourcemap: false,
  minify: false,
  logLevel: 'info'
};

export const cliConfig = {
  ...baseConfig,
  entryPoints: ['dist/cli.js']
};

export const mcpConfig = {
  ...baseConfig,
  entryPoints: ['dist/index.js']
};

// Build function for direct execution
export async function buildCli() {
  try {
    await esbuild.build(cliConfig);
    console.log('✓ CLI bundle built successfully');
  } catch (error) {
    console.error('✗ CLI bundle failed:', error);
    process.exit(1);
  }
}

export async function buildMcp() {
  try {
    await esbuild.build(mcpConfig);
    console.log('✓ MCP bundle built successfully');
  } catch (error) {
    console.error('✗ MCP bundle failed:', error);
    process.exit(1);
  }
}

export async function buildAll() {
  try {
    await Promise.all([
      esbuild.build(cliConfig),
      esbuild.build(mcpConfig)
    ]);
    console.log('✓ All bundles built successfully');
  } catch (error) {
    console.error('✗ Build failed:', error);
    process.exit(1);
  }
}
