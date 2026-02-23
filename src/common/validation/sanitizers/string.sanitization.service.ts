import { Injectable } from '@nestjs/common';

export interface SanitizationOptions {
  allowedTags?: string[];
  maxLength?: number;
  preserveSpaces?: boolean;
  allowHtml?: boolean;
}

@Injectable()
export class StringSanitizationService {
  private readonly defaultOptions: SanitizationOptions = {
    allowedTags: ['b', 'i', 'em', 'strong'], // Basic HTML tags
    maxLength: 1000,
    preserveSpaces: false,
    allowHtml: false,
  };

  sanitize(input: string, options: SanitizationOptions = {}): string {
    if (!input) {
      return '';
    }

    const opts = { ...this.defaultOptions, ...options };

    // Handle null/undefined
    if (typeof input !== 'string') {
      return String(input);
    }

    let sanitized = input;

    // Remove potentially dangerous characters
    sanitized = this.removeControlCharacters(sanitized);
    
    // Prevent XSS attacks
    sanitized = this.escapeHtml(sanitized);
    
    // Prevent SQL injection
    sanitized = this.escapeSql(sanitized);
    
    // Handle length limits
    sanitized = this.enforceMaxLength(sanitized, opts.maxLength);
    
    // Handle whitespace
    if (!opts.preserveSpaces) {
      sanitized = this.normalizeWhitespace(sanitized);
    }

    return sanitized.trim();
  }

  sanitizeHtml(input: string, options: SanitizationOptions): string {
    if (!options.allowHtml) {
      // Remove all HTML tags
      return input.replace(/<[^>]*>/g, '');
    }

    // Allow only specific HTML tags
    const allowedTags = options.allowedTags || this.defaultOptions.allowedTags || [];
    const tagPattern = new RegExp(`<(?!\\/?(${allowedTags.join('|')})([^>]*)>`, 'gi');
    
    return input.replace(/<[^>]*>/g, (match) => {
      if (tagPattern.test(match)) {
        return match; // Keep allowed tags
      }
      return ''; // Remove disallowed tags
    });
  }

  escapeHtml(input: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
    };

    return input.replace(/[&<>"'/]/g, (match) => htmlEscapes[match] || match);
  }

  escapeSql(input: string): string {
    // Remove SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(--|;|\/\*|\/\*\/)/g,
      /(\bOR\b|\bAND\b|\bNOT\b)/gi,
    ];

    let escaped = input;
    sqlPatterns.forEach(pattern => {
      escaped = escaped.replace(pattern, '');
    });

    return escaped;
  }

  removeControlCharacters(input: string): string {
    // Remove potentially dangerous control characters
    return input.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  }

  enforceMaxLength(input: string, maxLength?: number): string {
    if (!maxLength) {
      return input;
    }
    return input.length > maxLength ? input.substring(0, maxLength) : input;
  }

  normalizeWhitespace(input: string): string {
    // Normalize multiple spaces to single space
    return input.replace(/\s+/g, ' ').trim();
  }

  // Advanced sanitization for file uploads
  sanitizeFileName(fileName: string): string {
    if (!fileName) {
      return '';
    }

    // Remove path traversal attempts
    const sanitized = fileName.replace(/[\/\\:*?"<>|]/g, '');
    
    // Remove executable extensions
    const executableExtensions = ['.exe', '.bat', '.cmd', '.sh', '.php', '.jsp', '.asp'];
    const name = sanitized.toLowerCase();
    const hasExecutableExtension = executableExtensions.some(ext => name.endsWith(ext));
    
    if (hasExecutableExtension) {
      return sanitized.replace(/\.[^.]+$/, '') + '.txt'; // Change to .txt
    }

    return sanitized;
  }

  // Sanitize URLs to prevent XSS
  sanitizeUrl(url: string): string {
    if (!url) {
      return '';
    }

    // Basic URL validation and cleaning
    const cleanedUrl = url.trim();
    
    // Remove javascript: protocol
    if (cleanedUrl.toLowerCase().startsWith('javascript:')) {
      return '';
    }

    // Allow only http, https, and relative protocols
    const allowedProtocols = ['http:', 'https:', '/'];
    const hasValidProtocol = allowedProtocols.some(protocol => 
      cleanedUrl.toLowerCase().startsWith(protocol)
    );

    if (!hasValidProtocol && !cleanedUrl.startsWith('/')) {
      return '';
    }

    return cleanedUrl;
  }

  // Sanitize JSON input
  sanitizeJson(jsonString: string): string {
    if (!jsonString) {
      return '';
    }

    try {
      // Parse and re-stringify to remove malicious content
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed);
    } catch {
      return '';
    }
  }
}
