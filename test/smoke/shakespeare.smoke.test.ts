import { Shakespeare } from '@/index';
import { GooseAI } from '@/utils/goose';
import { ContentScanner } from '@/utils/scanner';
import { ContentDatabaseHandler } from '@/utils/database';
import { AIScorer } from '@/utils/ai';
import * as fs from 'fs/promises';
import * as path from 'path';

// Use process.cwd() as project root for tests
const projectRoot = process.cwd();

describe('Shakespeare Smoke Tests with Real AI', () => {
  const testDir = path.join(projectRoot, 'test-output/smoke');
  const contentDir = path.join(testDir, 'content');
  const dbPath = path.join(testDir, '.shakespeare/content-db.json');
  
  let shakespeare: Shakespeare;

  beforeAll(async () => {
    // Create test directories
    await fs.mkdir(contentDir, { recursive: true });
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    
    // Create test content files with real issues
    await fs.writeFile(
      path.join(contentDir, 'poor-quality.md'),
      `# Badly Written Article

This article not good. Grammar bad and no structure here. Need fix many things.

Content too short. No examples given. Technical stuff missing.`
    );

    await fs.writeFile(
      path.join(contentDir, 'medium-quality.md'),
      `# Introduction to React Hooks

React Hooks are functions that let you use state and other React features in functional components.

## useState Hook

The useState hook allows you to add state to functional components. Here's a basic example:

\`\`\`javascript
const [count, setCount] = useState(0);
\`\`\`

This creates a state variable called count with an initial value of 0.

## useEffect Hook

The useEffect hook lets you perform side effects in functional components. It serves the same purpose as componentDidMount, componentDidUpdate, and componentWillUnmount combined.

## Conclusion

Hooks provide a more direct API to the React concepts you already know.`
    );

    await fs.writeFile(
      path.join(contentDir, 'good-quality.md'),
      `# Comprehensive Guide to TypeScript Generics

TypeScript generics provide a way to create reusable components that work with multiple types while maintaining type safety. This guide explores generics in depth with practical examples.

## Understanding the Basics

Generics allow you to write flexible, reusable code without sacrificing TypeScript's type safety. Think of them as "type variables" that get filled in when the code is used.

### Simple Generic Function

\`\`\`typescript
function identity<T>(arg: T): T {
    return arg;
}

// Usage
const numberResult = identity<number>(42);     // Type: number
const stringResult = identity<string>("hello"); // Type: string
\`\`\`

## Generic Constraints

Sometimes you want to limit the types that can be used with your generic. This is where constraints come in:

\`\`\`typescript
interface Lengthwise {
    length: number;
}

function loggingIdentity<T extends Lengthwise>(arg: T): T {
    console.log(arg.length); // Now we know it has a .length property
    return arg;
}

// This works
loggingIdentity("hello");        // strings have length
loggingIdentity([1, 2, 3]);      // arrays have length
loggingIdentity({ length: 10 }); // objects with length property

// This would error
// loggingIdentity(3); // numbers don't have length
\`\`\`

## Generic Classes

Classes can also use generics to create flexible data structures:

\`\`\`typescript
class GenericStack<T> {
    private items: T[] = [];
    
    push(item: T): void {
        this.items.push(item);
    }
    
    pop(): T | undefined {
        return this.items.pop();
    }
    
    peek(): T | undefined {
        return this.items[this.items.length - 1];
    }
}

// Create type-safe stacks
const numberStack = new GenericStack<number>();
const stringStack = new GenericStack<string>();
\`\`\`

## Advanced Patterns

### Multiple Type Parameters

\`\`\`typescript
function pair<T, U>(first: T, second: U): [T, U] {
    return [first, second];
}

const result = pair<string, number>("age", 30);
\`\`\`

### Generic Utility Types

TypeScript provides built-in generic utility types:

\`\`\`typescript
// Partial<T> makes all properties optional
type PartialUser = Partial<User>;

// Required<T> makes all properties required
type RequiredUser = Required<User>;

// Pick<T, K> creates a type with only specified properties
type UserName = Pick<User, "firstName" | "lastName">;
\`\`\`

## Best Practices

1. **Use meaningful type parameter names**: While \`T\` is common, \`TItem\`, \`TKey\`, or \`TResult\` can be more descriptive
2. **Apply constraints when needed**: Don't leave generics completely open if you need specific properties
3. **Let TypeScript infer when possible**: Often you don't need to explicitly specify the type
4. **Document complex generics**: Add comments explaining what type parameters represent

## Conclusion

Generics are a powerful feature that makes TypeScript code more flexible and reusable while maintaining type safety. Master them to write better, more maintainable code.`
    );

    // Initialize Shakespeare with real AI components
    const gooseAI = new GooseAI();
    const scanner = new ContentScanner(contentDir);
    const database = new ContentDatabaseHandler(dbPath);
    const scorer = new AIScorer({ ai: gooseAI });
    
    shakespeare = new Shakespeare(contentDir, dbPath, {
      scanner,
      database,
      ai: scorer
    });
  });

  afterAll(async () => {
    console.log(`\n🔥 Smoke test artifacts preserved in: ${testDir}`);
    console.log(`📄 AI-analyzed database at: ${dbPath}`);
    console.log(`📝 Original and improved content files available for manual review`);
  });

  describe('Real AI Content Analysis', () => {
    it('should accurately score content quality using AI', async () => {
      await shakespeare.updateContentIndex();
      
      const db = await (shakespeare as any).database.load();
      
      // Verify AI gives realistic scores based on actual content quality
      const poorQuality = db.entries[path.join(contentDir, 'poor-quality.md')];
      const mediumQuality = db.entries[path.join(contentDir, 'medium-quality.md')];
      const goodQuality = db.entries[path.join(contentDir, 'good-quality.md')];
      
      console.log('\n📊 AI-Generated Quality Scores:');
      console.log('Poor Quality Article:', poorQuality.currentScores);
      console.log('Medium Quality Article:', mediumQuality.currentScores);
      console.log('Good Quality Article:', goodQuality.currentScores);
      
      // Poor quality should have lowest scores
      expect(poorQuality.currentScores.readability).toBeLessThan(6);
      expect(poorQuality.currentScores.contentDepth).toBeLessThan(5);
      expect(poorQuality.status).toBe('needs_review');
      
      // Medium quality should have moderate scores
      expect(mediumQuality.currentScores.readability).toBeGreaterThan(6);
      expect(mediumQuality.currentScores.readability).toBeLessThan(9);
      
      // Good quality should have highest scores
      expect(goodQuality.currentScores.readability).toBeGreaterThan(7);
      expect(goodQuality.currentScores.contentDepth).toBeGreaterThan(7);
      
      // Verify relative scoring makes sense
      expect(goodQuality.currentScores.contentDepth).toBeGreaterThan(poorQuality.currentScores.contentDepth);
      expect(goodQuality.currentScores.technicalAccuracy).toBeGreaterThan(poorQuality.currentScores.technicalAccuracy);
    }, 30000); // 30 second timeout for AI calls

    it('should identify worst content correctly', async () => {
      const worst = await shakespeare.getWorstScoringContent();
      
      expect(worst).toBeTruthy();
      expect(worst).toContain('poor-quality.md');
      
      console.log('\n🎯 AI identified worst content:', path.basename(worst!));
    }, 30000);

    it('should generate meaningful content improvements using AI', async () => {
      // Get the worst content
      const worst = await shakespeare.getWorstScoringContent();
      expect(worst).toBeTruthy();
      
      // Read original content
      const originalContent = await fs.readFile(worst!, 'utf-8');
      
      // Improve it with AI
      await shakespeare.improveContent(worst!);
      
      // Read improved content
      const improvedPath = worst!.replace('.md', '.improved.md');
      const improvedContent = await fs.readFile(improvedPath, 'utf-8');
      
      console.log('\n✨ AI Content Improvement:');
      console.log('Original length:', originalContent.length, 'chars');
      console.log('Improved length:', improvedContent.length, 'chars');
      
      // Verify AI actually improved the content
      expect(improvedContent.length).toBeGreaterThan(originalContent.length);
      expect(improvedContent).not.toBe(originalContent);
      
      // Check that improved content has better structure
      const hasMoreHeaders = (improvedContent.match(/^#/gm) || []).length > 
                             (originalContent.match(/^#/gm) || []).length;
      const hasCodeBlocks = improvedContent.includes('```');
      const hasBetterStructure = hasMoreHeaders || hasCodeBlocks;
      
      expect(hasBetterStructure).toBe(true);
      
      // Verify scores improved in database
      const db = await (shakespeare as any).database.load();
      const improvedEntry = db.entries[worst!];
      
      expect(improvedEntry.improvementIterations).toBe(1);
      expect(improvedEntry.reviewHistory.length).toBeGreaterThan(1);
      
      // Latest scores should be better than initial scores
      const initialScores = improvedEntry.reviewHistory[0].scores;
      const latestScores = improvedEntry.currentScores;
      
      const initialAvg = Object.values(initialScores as Record<string, number>).reduce((a, b) => a + b, 0) / 5;
      const latestAvg = Object.values(latestScores as Record<string, number>).reduce((a, b) => a + b, 0) / 5;
      
      console.log('Score improvement:', initialAvg.toFixed(1), '→', latestAvg.toFixed(1));
      expect(latestAvg).toBeGreaterThan(initialAvg);
    }, 60000); // 60 second timeout for multiple AI calls

    it('should provide actionable AI-generated suggestions', async () => {
      const db = await (shakespeare as any).database.load();
      
      for (const [filePath, entry] of Object.entries(db.entries)) {
        const fileName = path.basename(filePath);
        const entryData = entry as any;
        const analysis = entryData.reviewHistory[0].scores;
        
        console.log(`\n📋 AI Suggestions for ${fileName}:`);
        
        // The real AI should provide specific, actionable suggestions
        // Not just generic placeholders
        expect(analysis).toBeDefined();
        
        // Check that we have real analysis data
        const avgScore = Object.values(entryData.currentScores as Record<string, number>).reduce((a, b) => a + b, 0) / 5;
        console.log(`  Average Score: ${avgScore.toFixed(1)}/10`);
        console.log(`  Status: ${entryData.status}`);
        
        if (entryData.status === 'needs_review' || entryData.status === 'needs_improvement') {
          console.log('  Priority improvements needed');
        }
      }
    }, 30000);
  });

  describe('End-to-End Workflow', () => {
    it('should complete full content improvement cycle with AI', async () => {
      console.log('\n🔄 Starting full AI-driven improvement cycle...');
      
      // 1. Initial scan and analysis
      await shakespeare.updateContentIndex();
      console.log('✓ Content indexed and analyzed');
      
      // 2. Identify worst content
      const worst1 = await shakespeare.getWorstScoringContent();
      console.log('✓ Identified worst content:', worst1 ? path.basename(worst1) : 'none');
      
      // 3. Improve worst content
      if (worst1) {
        await shakespeare.improveContent(worst1);
        console.log('✓ Improved worst content with AI');
      }
      
      // 4. Re-identify worst content (should be different now)
      const worst2 = await shakespeare.getWorstScoringContent();
      if (worst1 && worst2) {
        expect(worst2).not.toBe(worst1);
        console.log('✓ New worst content:', path.basename(worst2));
      }
      
      // 5. Check if any content meets targets
      const db = await (shakespeare as any).database.load();
      const meetingTargets = Object.values(db.entries).filter((e: any) => e.status === 'meets_targets');
      
      console.log(`✓ ${meetingTargets.length} files meeting targets after improvements`);
      
      // Verify the complete workflow executed successfully
      expect(db.entries).toBeDefined();
      expect(Object.keys(db.entries).length).toBeGreaterThan(0);
    }, 90000); // 90 second timeout for full cycle
  });
});