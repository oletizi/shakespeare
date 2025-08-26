import { spawn } from 'child_process';
import { IAI } from '@/types/interfaces';

/**
 * Goose AI interaction handler using CLI in headless mode
 */
export class GooseAI implements IAI {
  private gooseCommand: string;
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.gooseCommand = 'goose'; // Assumes goose is in PATH
    this.cwd = cwd;
  }

  /**
   * Send a prompt to Goose and get the response using headless mode
   */
  async prompt(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Use goose run with --no-session and --quiet for headless automation
      const args = ['run', '--no-session', '--quiet', '--text', prompt];
      
      const goose = spawn(this.gooseCommand, args, {
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
          resolve(output.trim());
        }
      });

      // No need to write to stdin with --text flag
    });
  }
}
