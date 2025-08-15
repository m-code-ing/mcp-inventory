import chalk from 'chalk';

export class Logger {
  private static instance: Logger;
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private separator(char: string = '='): string {
    return char.repeat(60);
  }

  processStart(title: string): void {
    console.log('\n' + chalk.gray(this.separator()));
    console.log(chalk.blue.bold(`🔧 PROCESS: ${title}`));
    console.log(chalk.gray(this.separator()));
  }

  processStep(message: string): void {
    console.log(chalk.cyan(`🔗 PROCESS: ${message}`));
  }

  processData(label: string, data: any): void {
    console.log(chalk.yellow(`📊 PROCESS: ${label}:`), chalk.dim(JSON.stringify(data)));
  }

  processComplete(): void {
    console.log(chalk.green('✅ PROCESS: Completed'));
  }

  processError(message: string): void {
    console.log(chalk.red(`❌ PROCESS: ${message}`));
  }

  processWarning(message: string): void {
    console.log(chalk.yellow(`⚠️ PROCESS: ${message}`));
  }

  finalAnswer(): void {
    console.log('\n' + chalk.gray(this.separator()));
    console.log(chalk.green.bold('📋 FINAL ANSWER:'));
    console.log(chalk.gray(this.separator()));
  }

  toolExecution(toolName: string, args: any): void {
    this.processStart('Tool Execution');
    console.log(chalk.magenta(`🚀 Tool: ${toolName}`));
    console.log(chalk.dim(`📝 Args:`), chalk.dim(JSON.stringify(args)));
  }

  mcpCall(operation: string): void {
    this.processStep(`Calling MCP server for ${operation}`);
  }

  mcpResponse(response: string): void {
    this.processData('Server response', response);
  }

  ragCall(query: string): void {
    this.processStep(`Delegating to RAG agent: "${query}"`);
  }

  cleanup(message: string): void {
    console.log(chalk.blue(`🧹 ${message}`));
  }

  success(message: string): void {
    console.log(chalk.green(`✅ ${message}`));
  }

  info(message: string): void {
    console.log(chalk.blue(`ℹ️ ${message}`));
  }

  error(message: string): void {
    console.log(chalk.red(`❌ ${message}`));
  }
}