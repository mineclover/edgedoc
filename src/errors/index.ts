/**
 * EdgeDoc 에러 시스템
 *
 * 구조화된 에러 처리를 위해 EdgeDocError 클래스를 사용합니다.
 * 모든 검증 도구, 파서, 유틸리티에서 이를 throw하거나
 * EdgeDocError를 수집하여 일괄 처리합니다.
 */

export enum ErrorSeverity {
  /** 정보성 메시지 */
  INFO = 'info',
  /** 경고 (진행 가능) */
  WARNING = 'warning',
  /** 오류 (진행 불가) */
  ERROR = 'error',
}

export enum ErrorCode {
  // Config errors
  CONFIG_NOT_FOUND = 'CONFIG_NOT_FOUND',
  CONFIG_INVALID = 'CONFIG_INVALID',
  CONFIG_SCHEMA_VIOLATION = 'CONFIG_SCHEMA_VIOLATION',

  // Parser errors
  PARSER_NOT_FOUND = 'PARSER_NOT_FOUND',
  PARSE_ERROR = 'PARSE_ERROR',
  PARSE_TIMEOUT = 'PARSE_TIMEOUT',

  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
  NAMING_VIOLATION = 'NAMING_VIOLATION',
  FRONTMATTER_INVALID = 'FRONTMATTER_INVALID',
  INTERFACE_MISMATCH = 'INTERFACE_MISMATCH',

  // Reference errors
  REFERENCE_NOT_FOUND = 'REFERENCE_NOT_FOUND',
  ORPHAN_FILE = 'ORPHAN_FILE',

  // File operation errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',

  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ErrorContext {
  /** 영향을 받은 파일 경로 */
  file?: string;
  /** 파일 내 줄 번호 */
  line?: number;
  /** 컬럼 번호 */
  column?: number;
  /** 영향을 받은 코드 스니펫 */
  snippet?: string;
  /** 사용자에게 보여줄 해결책 */
  suggestion?: string;
  /** 추가 컨텍스트 */
  [key: string]: any;
}

/**
 * EdgeDoc의 중앙 에러 클래스
 *
 * 예시:
 * ```typescript
 * throw new EdgeDocError(
 *   ErrorCode.CONFIG_INVALID,
 *   'Invalid language option',
 *   ErrorSeverity.ERROR,
 *   {
 *     file: 'mdoc.config.json',
 *     line: 5,
 *     suggestion: 'Use "en" or "ko" for language option',
 *   }
 * );
 * ```
 */
export class EdgeDocError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public severity: ErrorSeverity = ErrorSeverity.ERROR,
    public context: ErrorContext = {}
  ) {
    super(message);
    this.name = 'EdgeDocError';
    // 프로토타입 체인 설정 (TypeScript 고급 타입 안정성)
    Object.setPrototypeOf(this, EdgeDocError.prototype);
  }

  /**
   * 사람이 읽을 수 있는 에러 메시지 포맷
   */
  formatMessage(): string {
    const parts: string[] = [];

    // 심각도 아이콘
    const icons: Record<ErrorSeverity, string> = {
      [ErrorSeverity.INFO]: 'ℹ️',
      [ErrorSeverity.WARNING]: '⚠️',
      [ErrorSeverity.ERROR]: '❌',
    };

    parts.push(`${icons[this.severity]} [${this.code}]`);
    parts.push(this.message);

    // 파일 정보
    if (this.context.file) {
      const location = `${this.context.file}`;
      parts.push(`📍 ${location}`);

      if (this.context.line) {
        parts[parts.length - 1] += `:${this.context.line}`;
        if (this.context.column) {
          parts[parts.length - 1] += `:${this.context.column}`;
        }
      }
    }

    // 코드 스니펫
    if (this.context.snippet) {
      parts.push(`\n  ${this.context.snippet}`);
    }

    // 해결책
    if (this.context.suggestion) {
      parts.push(`\n💡 ${this.context.suggestion}`);
    }

    return parts.join('\n');
  }

  /**
   * JSON 직렬화 (로깅용)
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      severity: this.severity,
      context: this.context,
    };
  }

  /**
   * 심각도별 필터링 헬퍼
   */
  isError(): boolean {
    return this.severity === ErrorSeverity.ERROR;
  }

  isWarning(): boolean {
    return this.severity === ErrorSeverity.WARNING;
  }

  isInfo(): boolean {
    return this.severity === ErrorSeverity.INFO;
  }
}

/**
 * 에러 컬렉션 및 리포팅
 */
export class ErrorCollector {
  private errors: EdgeDocError[] = [];

  add(error: EdgeDocError): void {
    this.errors.push(error);
  }

  addMany(errors: EdgeDocError[]): void {
    this.errors.push(...errors);
  }

  getErrors(): EdgeDocError[] {
    return [...this.errors];
  }

  getErrorsByCode(code: ErrorCode): EdgeDocError[] {
    return this.errors.filter(e => e.code === code);
  }

  getErrorsBySeverity(severity: ErrorSeverity): EdgeDocError[] {
    return this.errors.filter(e => e.severity === severity);
  }

  getFatals(): EdgeDocError[] {
    return this.getErrorsBySeverity(ErrorSeverity.ERROR);
  }

  getWarnings(): EdgeDocError[] {
    return this.getErrorsBySeverity(ErrorSeverity.WARNING);
  }

  hasErrors(): boolean {
    return this.errors.some(e => e.isError());
  }

  hasWarnings(): boolean {
    return this.errors.some(e => e.isWarning());
  }

  count(): number {
    return this.errors.length;
  }

  countByCode(code: ErrorCode): number {
    return this.getErrorsByCode(code).length;
  }

  clear(): void {
    this.errors = [];
  }

  /**
   * 포맷된 리포트 생성
   */
  formatReport(): string {
    if (this.errors.length === 0) {
      return '✅ No errors';
    }

    const lines: string[] = [];
    const groupedByFile = new Map<string | undefined, EdgeDocError[]>();

    // 파일별로 그룹화
    for (const error of this.errors) {
      const file = error.context.file;
      if (!groupedByFile.has(file)) {
        groupedByFile.set(file, []);
      }
      groupedByFile.get(file)!.push(error);
    }

    // 리포트 생성
    for (const [file, errors] of groupedByFile) {
      if (file) {
        lines.push(`\n📄 ${file}`);
      }

      for (const error of errors) {
        lines.push(`  ${error.formatMessage()}`);
      }
    }

    // 요약
    const errorCount = this.getFatals().length;
    const warningCount = this.getWarnings().length;
    const infoCount = this.getErrorsBySeverity(ErrorSeverity.INFO).length;

    lines.push('\n---');
    lines.push(`Summary: ${errorCount} error(s), ${warningCount} warning(s), ${infoCount} info(s)`);

    return lines.join('\n');
  }
}

export default EdgeDocError;
