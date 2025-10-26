import { Command } from 'commander';
import type { MdocConfig } from '../types/config.js';
import { loadConfig, getDefaultConfig } from '../utils/config.js';
import { EdgeDocError, ErrorCode } from '../errors/index.js';

/**
 * 기본 명령어 옵션
 */
export interface BaseCommandOptions {
  project?: string;
  verbose?: boolean;
  config?: string;
}

/**
 * 명령어 컨텍스트
 */
export interface CommandContext {
  projectPath: string;
  config: MdocConfig;
  verbose: boolean;
}

/**
 * 명령어 핸들러 타입
 */
export type CommandHandler<T = any> = (
  context: CommandContext,
  options: T
) => Promise<void>;

/**
 * 기본 명령어 클래스
 *
 * 모든 CLI 명령어의 기본 클래스입니다.
 * 공통 옵션 처리, 설정 로드, 에러 처리를 담당합니다.
 */
export abstract class BaseCommand {
  protected command: Command;

  constructor(name: string, description: string) {
    this.command = new Command(name).description(description);
    this.setupOptions();
    this.setupAction();
  }

  /**
   * 공통 옵션 설정
   */
  protected setupOptions(): void {
    this.command
      .option('-p, --project <path>', 'Project directory path', process.cwd())
      .option('-v, --verbose', 'Verbose output', false)
      .option('-c, --config <path>', 'Config file path');
  }

  /**
   * 커스텀 옵션 추가 (서브클래스에서 오버라이드)
   */
  protected addCustomOptions(): void {
    // Override in subclasses
  }

  /**
   * 액션 설정
   */
  protected setupAction(): void {
    this.addCustomOptions();
    this.command.action(async (options: BaseCommandOptions) => {
      try {
        const context = await this.createContext(options);
        await this.execute(context, options);
      } catch (error) {
        this.handleError(error);
      }
    });
  }

  /**
   * 컨텍스트 생성
   */
  protected async createContext(
    options: BaseCommandOptions
  ): Promise<CommandContext> {
    const projectPath = options.project || process.cwd();

    let config: MdocConfig;
    try {
      config = loadConfig(projectPath);
    } catch (error) {
      if (error instanceof EdgeDocError && error.code === ErrorCode.CONFIG_NOT_FOUND) {
        // 설정 파일이 없으면 기본값 사용
        config = getDefaultConfig();
      } else {
        throw error;
      }
    }

    return {
      projectPath,
      config,
      verbose: options.verbose || false,
    };
  }

  /**
   * 명령어 실행 (서브클래스에서 구현)
   */
  protected abstract execute(
    context: CommandContext,
    options: any
  ): Promise<void>;

  /**
   * 에러 처리
   */
  protected handleError(error: unknown): void {
    if (error instanceof EdgeDocError) {
      console.error(error.formatMessage());
      process.exit(1);
    } else if (error instanceof Error) {
      console.error(`❌ Error: ${error.message}`);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    } else {
      console.error(`❌ Unknown error: ${String(error)}`);
      process.exit(1);
    }
  }

  /**
   * Commander 명령어 반환
   */
  getCommand(): Command {
    return this.command;
  }
}

/**
 * 단순 명령어를 위한 헬퍼 함수
 *
 * BaseCommand를 상속받지 않고 간단한 명령어를 만들 때 사용합니다.
 */
export function createSimpleCommand(
  name: string,
  description: string,
  handler: CommandHandler
): Command {
  const command = new Command(name).description(description);

  command
    .option('-p, --project <path>', 'Project directory path', process.cwd())
    .option('-v, --verbose', 'Verbose output', false)
    .action(async (options: BaseCommandOptions) => {
      try {
        const projectPath = options.project || process.cwd();
        let config: MdocConfig;

        try {
          config = loadConfig(projectPath);
        } catch (error) {
          if (error instanceof EdgeDocError && error.code === ErrorCode.CONFIG_NOT_FOUND) {
            config = getDefaultConfig();
          } else {
            throw error;
          }
        }

        const context: CommandContext = {
          projectPath,
          config,
          verbose: options.verbose || false,
        };

        await handler(context, options);
      } catch (error) {
        if (error instanceof EdgeDocError) {
          console.error(error.formatMessage());
          process.exit(1);
        } else if (error instanceof Error) {
          console.error(`❌ Error: ${error.message}`);
          process.exit(1);
        } else {
          console.error(`❌ Unknown error: ${String(error)}`);
          process.exit(1);
        }
      }
    });

  return command;
}
