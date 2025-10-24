#!/usr/bin/env bun

import { spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
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
      {
        name: 'graph_build',
        description: 'Build reference index (.edgedoc/references.json)',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Project directory path (defaults to current directory)',
            },
            verbose: {
              type: 'boolean',
              description: 'Verbose output',
            },
          },
        },
      },
      {
        name: 'graph_query',
        description: 'Query reference graph (feature/code/term lookup)',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Project directory path (defaults to current directory)',
            },
            featureId: {
              type: 'string',
              description: 'Feature ID to query',
            },
            codeFile: {
              type: 'string',
              description: 'Code file path for reverse lookup',
            },
            term: {
              type: 'string',
              description: 'Term name to query usage',
            },
          },
        },
      },
      {
        name: 'validate_terms',
        description: 'Validate term definitions and references consistency',
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
        name: 'validate_interfaces',
        description: 'Validate interfaces (bidirectional links + sibling coverage)',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Project directory path (defaults to current directory)',
            },
            feature: {
              type: 'string',
              description: 'Filter by specific feature ID',
            },
            namespace: {
              type: 'string',
              description: 'Filter by specific namespace',
            },
            verbose: {
              type: 'boolean',
              description: 'Show detailed output',
            },
          },
        },
      },
      {
        name: 'list_terms',
        description: 'List all defined terms with statistics',
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
        name: 'find_term',
        description: 'Search for terms by keyword',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
            projectPath: {
              type: 'string',
              description: 'Project directory path (defaults to current directory)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'tasks_list',
        description: 'List all features with checkbox progress',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Project directory path (defaults to current directory)',
            },
            status: {
              type: 'string',
              description: 'Filter by status (planned, in_progress, active, implemented)',
            },
            priority: {
              type: 'string',
              description: 'Filter by priority (high, medium, low)',
            },
            code: {
              type: 'string',
              description: 'Reverse lookup: find tasks by code file path',
            },
            interface: {
              type: 'string',
              description: 'Reverse lookup: find tasks by interface ID',
            },
            term: {
              type: 'string',
              description: 'Reverse lookup: find tasks by term name',
            },
          },
        },
      },
      {
        name: 'tasks_get',
        description: 'Get detailed progress for a specific feature',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'Feature ID or name',
            },
            projectPath: {
              type: 'string',
              description: 'Project directory path (defaults to current directory)',
            },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'tasks_progress',
        description: 'Show overall project progress dashboard',
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
        name: 'docs_list',
        description: 'List all <details> blocks in a markdown file',
        inputSchema: {
          type: 'object',
          properties: {
            file: {
              type: 'string',
              description: 'Path to markdown file',
            },
          },
          required: ['file'],
        },
      },
      {
        name: 'docs_open',
        description: 'Open <details> blocks in markdown file',
        inputSchema: {
          type: 'object',
          properties: {
            file: {
              type: 'string',
              description: 'Path to markdown file',
            },
            indices: {
              type: 'array',
              items: { type: 'number' },
              description: 'Block indices to open (optional, defaults to all)',
            },
            all: {
              type: 'boolean',
              description: 'Open all blocks',
            },
          },
          required: ['file'],
        },
      },
      {
        name: 'docs_close',
        description: 'Close <details> blocks in markdown file',
        inputSchema: {
          type: 'object',
          properties: {
            file: {
              type: 'string',
              description: 'Path to markdown file',
            },
            indices: {
              type: 'array',
              items: { type: 'number' },
              description: 'Block indices to close (optional, defaults to all)',
            },
            all: {
              type: 'boolean',
              description: 'Close all blocks',
            },
          },
          required: ['file'],
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

      case 'graph_build': {
        cliArgs = ['graph', 'build'];
        if (args?.projectPath) {
          cliArgs.push('--project', args.projectPath as string);
        }
        if (args?.verbose) {
          cliArgs.push('--verbose');
        }
        break;
      }

      case 'graph_query': {
        cliArgs = ['graph', 'query'];
        if (args?.projectPath) {
          cliArgs.push('--project', args.projectPath as string);
        }
        if (args?.featureId) {
          cliArgs.push(args.featureId as string);
        }
        if (args?.codeFile) {
          cliArgs.push('--code', args.codeFile as string);
        }
        if (args?.term) {
          cliArgs.push('--term', args.term as string);
        }
        break;
      }

      case 'validate_terms': {
        cliArgs = ['validate', 'terms'];
        if (args?.projectPath) {
          cliArgs.push('--project', args.projectPath as string);
        }
        break;
      }

      case 'validate_interfaces': {
        cliArgs = ['validate', 'interfaces'];
        if (args?.projectPath) {
          cliArgs.push('--project', args.projectPath as string);
        }
        if (args?.feature) {
          cliArgs.push('--feature', args.feature as string);
        }
        if (args?.namespace) {
          cliArgs.push('--namespace', args.namespace as string);
        }
        if (args?.verbose) {
          cliArgs.push('--verbose');
        }
        break;
      }

      case 'list_terms': {
        cliArgs = ['terms', 'list'];
        if (args?.projectPath) {
          cliArgs.push('--project', args.projectPath as string);
        }
        break;
      }

      case 'find_term': {
        cliArgs = ['terms', 'find', args?.query as string];
        if (args?.projectPath) {
          cliArgs.push('--project', args.projectPath as string);
        }
        break;
      }

      case 'tasks_list': {
        cliArgs = ['tasks', 'list'];
        if (args?.projectPath) {
          cliArgs.push('--project', args.projectPath as string);
        }
        if (args?.status) {
          cliArgs.push('--status', args.status as string);
        }
        if (args?.priority) {
          cliArgs.push('--priority', args.priority as string);
        }
        if (args?.code) {
          cliArgs.push('--code', args.code as string);
        }
        if (args?.interface) {
          cliArgs.push('--interface', args.interface as string);
        }
        if (args?.term) {
          cliArgs.push('--term', args.term as string);
        }
        break;
      }

      case 'tasks_get': {
        cliArgs = ['tasks', 'get', args?.taskId as string];
        if (args?.projectPath) {
          cliArgs.push('--project', args.projectPath as string);
        }
        break;
      }

      case 'tasks_progress': {
        cliArgs = ['tasks', 'progress'];
        if (args?.projectPath) {
          cliArgs.push('--project', args.projectPath as string);
        }
        break;
      }

      case 'docs_list': {
        cliArgs = ['docs', 'list', args?.file as string];
        break;
      }

      case 'docs_open': {
        cliArgs = ['docs', 'open', args?.file as string];
        if (args?.indices && Array.isArray(args.indices)) {
          cliArgs.push('--index', ...(args.indices as number[]).map(String));
        }
        if (args?.all) {
          cliArgs.push('--all');
        }
        break;
      }

      case 'docs_close': {
        cliArgs = ['docs', 'close', args?.file as string];
        if (args?.indices && Array.isArray(args.indices)) {
          cliArgs.push('--index', ...(args.indices as number[]).map(String));
        }
        if (args?.all) {
          cliArgs.push('--all');
        }
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
  const projectPath = process.cwd();
  const indexPath = join(projectPath, '.edgedoc', 'references.json');
  const hasIndex = await readFile(indexPath, 'utf-8').then(() => true).catch(() => false);

  const resources = [
    // Static documentation
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
    {
      uri: 'mdoc://docs/syntax-guide',
      name: 'Documentation Syntax Guide',
      description: 'Complete syntax guide for writing edgedoc documentation',
      mimeType: 'text/markdown',
    },
    {
      uri: 'mdoc://docs/glossary',
      name: 'Terminology Glossary',
      description: 'Glossary of all defined terms with definitions',
      mimeType: 'text/markdown',
    },
  ];

  // Dynamic project-specific resources (only if they exist)
  if (hasIndex) {
    resources.push(
      {
        uri: 'mdoc://project/reference-index',
        name: 'Project Reference Index',
        description: 'Complete reference graph with features, code, interfaces, and terms',
        mimeType: 'application/json',
      },
      {
        uri: 'mdoc://project/features',
        name: 'Project Features',
        description: 'List of all features with their relationships',
        mimeType: 'application/json',
      },
      {
        uri: 'mdoc://project/terms',
        name: 'Project Terms',
        description: 'All term definitions and usage statistics',
        mimeType: 'application/json',
      },
      {
        uri: 'mdoc://project/stats',
        name: 'Project Statistics',
        description: 'Overview statistics (features, code files, terms, interfaces)',
        mimeType: 'application/json',
      }
    );
  }

  return { resources };
});

/**
 * Handle resource reading
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    const projectPath = process.cwd();

    // Static documentation resources
    if (uri.startsWith('mdoc://docs/') || uri === 'mdoc://llms.txt') {
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
        case 'mdoc://docs/syntax-guide':
          filePath = join(__dirname, '../docs/SYNTAX_GUIDE.md');
          break;
        case 'mdoc://docs/glossary':
          filePath = join(__dirname, '../docs/GLOSSARY.md');
          break;
        default:
          throw new Error(`Unknown static resource: ${uri}`);
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
    }

    // Dynamic project-specific resources
    if (uri.startsWith('mdoc://project/')) {
      const indexPath = join(projectPath, '.edgedoc', 'references.json');

      try {
        await stat(indexPath);
      } catch {
        throw new Error('Reference index not found. Run "edgedoc graph build" first.');
      }

      const indexContent = await readFile(indexPath, 'utf-8');
      const index = JSON.parse(indexContent);

      let responseContent: any;

      switch (uri) {
        case 'mdoc://project/reference-index': {
          // Return full index
          responseContent = index;
          break;
        }

        case 'mdoc://project/features': {
          // Return features with summary
          responseContent = {
            total: Object.keys(index.features).length,
            features: Object.entries(index.features).map(([id, feature]: [string, any]) => ({
              id,
              file: feature.file,
              code_files: feature.code.uses.length,
              related_features: feature.features.related.length,
              interfaces: feature.interfaces.provides.length + feature.interfaces.uses.length,
              terms: feature.terms.uses.length,
            })),
          };
          break;
        }

        case 'mdoc://project/terms': {
          // Return terms with usage stats
          responseContent = {
            total: Object.keys(index.terms).length,
            terms: Object.entries(index.terms).map(([term, data]: [string, any]) => ({
              term,
              definition: data.definition,
              usage_count: data.usage_count,
              references_count: data.references.length,
            })),
          };
          break;
        }

        case 'mdoc://project/stats': {
          // Return overview statistics
          responseContent = {
            version: index.version,
            generated: index.generated,
            stats: {
              features: Object.keys(index.features).length,
              code_files: Object.keys(index.code).length,
              interfaces: Object.keys(index.interfaces).length,
              terms: Object.keys(index.terms).length,
              total_references:
                Object.values(index.features).reduce(
                  (sum: number, f: any) => sum + f.code.uses.length,
                  0
                ) +
                Object.values(index.code).reduce(
                  (sum: number, c: any) => sum + c.imports.length,
                  0
                ),
            },
            top_terms: Object.entries(index.terms)
              .map(([term, data]: [string, any]) => ({
                term,
                usage_count: data.usage_count,
              }))
              .sort((a: any, b: any) => b.usage_count - a.usage_count)
              .slice(0, 10),
          };
          break;
        }

        default: {
          // Try to match feature or term patterns
          const featureMatch = uri.match(/^mdoc:\/\/project\/feature\/(.+)$/);
          if (featureMatch) {
            const featureId = featureMatch[1];
            const feature = index.features[featureId];

            if (!feature) {
              throw new Error(`Feature "${featureId}" not found`);
            }

            responseContent = {
              id: featureId,
              ...feature,
            };
            break;
          }

          const termMatch = uri.match(/^mdoc:\/\/project\/term\/(.+)$/);
          if (termMatch) {
            const termName = decodeURIComponent(termMatch[1]);
            const term = index.terms[termName];

            if (!term) {
              throw new Error(`Term "${termName}" not found`);
            }

            responseContent = {
              term: termName,
              ...term,
            };
            break;
          }

          const codeMatch = uri.match(/^mdoc:\/\/project\/code\/(.+)$/);
          if (codeMatch) {
            const codePath = decodeURIComponent(codeMatch[1]);
            const code = index.code[codePath];

            if (!code) {
              throw new Error(`Code file "${codePath}" not found in index`);
            }

            responseContent = {
              file: codePath,
              ...code,
            };
            break;
          }

          throw new Error(`Unknown project resource: ${uri}`);
        }
      }

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(responseContent, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${uri}`);
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
