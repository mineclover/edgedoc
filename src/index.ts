#!/usr/bin/env bun

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const exec = promisify(spawn);

/**
 * Execute mdoc CLI command and return result
 */
async function executeMdocCommand(
  args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const mdocPath = join(__dirname, 'cli.js');
    const child = spawn('bun', [mdocPath, ...args], {
      cwd: process.cwd(),
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 0,
      });
    });

    child.on('error', (error) => {
      resolve({
        stdout,
        stderr: stderr + error.message,
        exitCode: 1,
      });
    });
  });
}

/**
 * MCP Server implementation
 */
const server = new Server(
  {
    name: 'mdoc-tools',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'validate_migration',
        description: 'Validate migration from tasks/ to tasks-v2/ with comprehensive checks',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Project directory path (defaults to current directory)',
            },
            markdown: {
              type: 'boolean',
              description: 'Generate markdown report',
            },
          },
        },
      },
      {
        name: 'validate_naming',
        description: 'Validate naming conventions for interfaces and shared types',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Project directory path (defaults to current directory)',
            },
          },
        },
      },
      {
        name: 'validate_orphans',
        description: 'Find orphaned files (undocumented and unused)',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Project directory path (defaults to current directory)',
            },
            includeNodeModules: {
              type: 'boolean',
              description: 'Include node_modules in search',
            },
            includeDist: {
              type: 'boolean',
              description: 'Include dist/build directories',
            },
          },
        },
      },
      {
        name: 'validate_structure',
        description:
          'Validate documentation structure (circular dependencies, consistency, frontmatter)',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Project directory path (defaults to current directory)',
            },
          },
        },
      },
      {
        name: 'validate_all',
        description: 'Run all validation checks at once',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Project directory path (defaults to current directory)',
            },
          },
        },
      },
      {
        name: 'sync_code_refs',
        description: 'Synchronize code references in documentation (development)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

/**
 * Handle tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let cliArgs: string[] = [];

    switch (name) {
      case 'validate_migration': {
        cliArgs = ['validate', 'migration'];
        if (args?.projectPath) {
          cliArgs.push('--project', args.projectPath as string);
        }
        if (args?.markdown) {
          cliArgs.push('--markdown');
        }
        break;
      }

      case 'validate_naming': {
        cliArgs = ['validate', 'naming'];
        if (args?.projectPath) {
          cliArgs.push('--project', args.projectPath as string);
        }
        break;
      }

      case 'validate_orphans': {
        cliArgs = ['validate', 'orphans'];
        if (args?.projectPath) {
          cliArgs.push('--project', args.projectPath as string);
        }
        if (args?.includeNodeModules) {
          cliArgs.push('--include-node-modules');
        }
        if (args?.includeDist) {
          cliArgs.push('--include-dist');
        }
        break;
      }

      case 'validate_structure': {
        cliArgs = ['validate', 'structure'];
        if (args?.projectPath) {
          cliArgs.push('--project', args.projectPath as string);
        }
        break;
      }

      case 'validate_all': {
        cliArgs = ['validate', 'all'];
        if (args?.projectPath) {
          cliArgs.push('--project', args.projectPath as string);
        }
        break;
      }

      case 'sync_code_refs': {
        cliArgs = ['sync'];
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    // Execute CLI command
    const result = await executeMdocCommand(cliArgs);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: result.exitCode === 0,
              exitCode: result.exitCode,
              stdout: result.stdout,
              stderr: result.stderr,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

/**
 * List available resources
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'mdoc://docs/workflows',
        name: 'Workflows Guide',
        description: 'Complete workflows for using mdoc-tools',
        mimeType: 'text/markdown',
      },
      {
        uri: 'mdoc://docs/shared-types',
        name: 'Shared Types Convention',
        description: 'Naming conventions for shared types and interfaces',
        mimeType: 'text/markdown',
      },
      {
        uri: 'mdoc://docs/agent-instructions',
        name: 'Agent Instructions',
        description: 'Complete instructions for AI agents using mdoc-tools',
        mimeType: 'text/markdown',
      },
      {
        uri: 'mdoc://llms.txt',
        name: 'LLM Quick Reference',
        description: 'LLM-optimized quick reference for mdoc-tools',
        mimeType: 'text/plain',
      },
    ],
  };
});

/**
 * Handle resource reading
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    let filePath: string;

    switch (uri) {
      case 'mdoc://docs/workflows':
        filePath = join(__dirname, '../docs/WORKFLOWS.md');
        break;
      case 'mdoc://docs/shared-types':
        filePath = join(__dirname, '../docs/SHARED_TYPES.md');
        break;
      case 'mdoc://docs/agent-instructions':
        filePath = join(__dirname, '../instructions/AGENT_INSTRUCTIONS.md');
        break;
      case 'mdoc://llms.txt':
        filePath = join(__dirname, '../llms.txt');
        break;
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }

    const content = await readFile(filePath, 'utf-8');

    return {
      contents: [
        {
          uri,
          mimeType: uri.endsWith('.txt') ? 'text/plain' : 'text/markdown',
          text: content,
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to read resource ${uri}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('mdoc-tools MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
