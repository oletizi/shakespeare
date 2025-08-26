import { IAI } from '@/types/interfaces';
/**
 * Goose AI interaction handler using CLI in headless mode
 */
export declare class GooseAI implements IAI {
    private gooseCommand;
    private cwd;
    constructor(cwd?: string);
    /**
     * Send a prompt to Goose and get the response using headless mode
     */
    prompt(prompt: string): Promise<string>;
}
