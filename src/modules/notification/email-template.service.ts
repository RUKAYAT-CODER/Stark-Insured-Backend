import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

export class EmailTemplateService {
  private templateCache: Record<string, Handlebars.TemplateDelegate> = {};
  private templateDir: string;

  constructor(templateDir?: string) {
    this.templateDir = templateDir || path.join(__dirname, 'templates');
  }

  private loadTemplate(templateName: string): Handlebars.TemplateDelegate {
    if (this.templateCache[templateName]) {
      return this.templateCache[templateName];
    }
    const filePath = path.join(this.templateDir, `${templateName}.hbs`);
    const templateContent = fs.readFileSync(filePath, 'utf8');
    const compiled = Handlebars.compile(templateContent);
    this.templateCache[templateName] = compiled;
    return compiled;
  }

  render(templateName: string, context: Record<string, any>): string {
    const template = this.loadTemplate(templateName);
    return template(context);
  }
}
