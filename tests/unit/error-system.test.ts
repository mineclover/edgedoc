import { describe, it, expect } from 'vitest';
import {
  EdgeDocError,
  ErrorCode,
  ErrorSeverity,
  ErrorCollector,
} from '../../src/errors/index';

describe('EdgeDocError', () => {
  it('should create error with all fields', () => {
    const error = new EdgeDocError(
      ErrorCode.CONFIG_INVALID,
      'Invalid configuration',
      ErrorSeverity.ERROR,
      {
        file: 'mdoc.config.json',
        line: 5,
        suggestion: 'Use valid JSON syntax',
      }
    );

    expect(error.code).toBe(ErrorCode.CONFIG_INVALID);
    expect(error.message).toBe('Invalid configuration');
    expect(error.severity).toBe(ErrorSeverity.ERROR);
    expect(error.context.file).toBe('mdoc.config.json');
  });

  it('should identify error severity', () => {
    const error = new EdgeDocError(
      ErrorCode.CONFIG_INVALID,
      'Test',
      ErrorSeverity.ERROR
    );

    expect(error.isError()).toBe(true);
    expect(error.isWarning()).toBe(false);
  });

  it('should format message for display', () => {
    const error = new EdgeDocError(
      ErrorCode.PARSE_ERROR,
      'Syntax error',
      ErrorSeverity.ERROR,
      {
        file: 'test.ts',
        line: 10,
        suggestion: 'Check syntax',
      }
    );

    const formatted = error.formatMessage();
    expect(formatted).toContain('❌');
    expect(formatted).toContain('PARSE_ERROR');
    expect(formatted).toContain('test.ts:10');
    expect(formatted).toContain('Check syntax');
  });

  it('should serialize to JSON', () => {
    const error = new EdgeDocError(
      ErrorCode.CONFIG_INVALID,
      'Test error',
      ErrorSeverity.WARNING
    );

    const json = error.toJSON();
    expect(json.code).toBe(ErrorCode.CONFIG_INVALID);
    expect(json.severity).toBe(ErrorSeverity.WARNING);
  });
});

describe('ErrorCollector', () => {
  it('should collect errors', () => {
    const collector = new ErrorCollector();

    const error1 = new EdgeDocError(
      ErrorCode.PARSE_ERROR,
      'Error 1',
      ErrorSeverity.ERROR
    );
    const error2 = new EdgeDocError(
      ErrorCode.CONFIG_INVALID,
      'Error 2',
      ErrorSeverity.WARNING
    );

    collector.add(error1);
    collector.add(error2);

    expect(collector.count()).toBe(2);
    expect(collector.hasErrors()).toBe(true);
    expect(collector.hasWarnings()).toBe(true);
  });

  it('should filter by severity', () => {
    const collector = new ErrorCollector();
    collector.add(
      new EdgeDocError(ErrorCode.PARSE_ERROR, 'E1', ErrorSeverity.ERROR)
    );
    collector.add(
      new EdgeDocError(ErrorCode.CONFIG_INVALID, 'W1', ErrorSeverity.WARNING)
    );

    expect(collector.getFatals()).toHaveLength(1);
    expect(collector.getWarnings()).toHaveLength(1);
  });

  it('should generate formatted report', () => {
    const collector = new ErrorCollector();
    collector.add(
      new EdgeDocError(
        ErrorCode.PARSE_ERROR,
        'Syntax error',
        ErrorSeverity.ERROR,
        { file: 'test.ts', line: 5 }
      )
    );

    const report = collector.formatReport();
    expect(report).toContain('test.ts');
    expect(report).toContain('1 error(s)');
  });
});
