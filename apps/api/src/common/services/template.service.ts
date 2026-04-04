import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly cache = new Map<string, Handlebars.TemplateDelegate>();

  constructor() {
    this.registerHelpers();
  }

  render(template: string, variables: Record<string, unknown>): string {
    let compiled = this.cache.get(template);
    if (!compiled) {
      compiled = Handlebars.compile(template);
      this.cache.set(template, compiled);
    }
    return compiled(variables);
  }

  renderNamed(templateName: string, source: string, variables: Record<string, unknown>): string {
    const cacheKey = `named:${templateName}`;
    let compiled = this.cache.get(cacheKey);
    if (!compiled) {
      compiled = Handlebars.compile(source);
      this.cache.set(cacheKey, compiled);
    }
    return compiled(variables);
  }

  clearCache(): void {
    this.cache.clear();
    this.logger.log('Template cache cleared');
  }

  private registerHelpers(): void {
    Handlebars.registerHelper('uppercase', (str: string) =>
      typeof str === 'string' ? str.toUpperCase() : '',
    );

    Handlebars.registerHelper('lowercase', (str: string) =>
      typeof str === 'string' ? str.toLowerCase() : '',
    );

    Handlebars.registerHelper('formatDate', (date: string | Date) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    Handlebars.registerHelper('formatCurrency', (amount: number, currency?: string) => {
      if (amount == null) return '';
      const curr = typeof currency === 'string' ? currency : 'USD';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: curr,
      }).format(amount / 100);
    });

    Handlebars.registerHelper('ifEquals', function (this: unknown, a: unknown, b: unknown, options: Handlebars.HelperOptions) {
      return a === b ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('ifGt', function (this: unknown, a: number, b: number, options: Handlebars.HelperOptions) {
      return a > b ? options.fn(this) : options.inverse(this);
    });
  }
}
