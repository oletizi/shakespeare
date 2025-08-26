import { spawn } from 'child_process';

/**
 * Goose AI interaction handler
 */
export class GooseAI {
  private gooseCommand: string;
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.gooseCommand = 'goose'; // Assumes goose is in PATH
    this.cwd = cwd;
  }

  /**
   * Send a prompt to Goose and get the response
   */
  async prompt(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const goose = spawn(this.gooseCommand, [], {
        cwd: this.cwd,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      goose.stdout.on('data', (data) => {
        output += data.toString();
      });

      goose.stderr.on('data', (data) => {
        error += data.toString();
      });

      goose.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Goose failed with code ${code}: ${error}`));
        } else {
          resolve(output);
        }
      });

      goose.stdin.write(prompt);
      goose.stdin.end();
    });
  }
}
