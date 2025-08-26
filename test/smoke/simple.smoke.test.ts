import { GooseAI } from '@/utils/goose';
import { AIScorer } from '@/utils/ai';

describe('Simple Smoke Test with Real AI', () => {
  it('should connect to Goose AI and score content', async () => {
    console.log('\n🚀 Testing real AI connection...');
    
    const gooseAI = new GooseAI();
    const scorer = new AIScorer({ ai: gooseAI });
    
    const testContent = `# Test Article
    
This is a short test article to verify AI scoring functionality.
It has basic content with a header and a paragraph.`;
    
    console.log('📝 Scoring test content with AI...');
    
    const analysis = await scorer.scoreContent(testContent);
    
    console.log('✅ AI Response received:');
    console.log('Scores:', analysis.scores);
    
    // Verify we got real scores
    expect(analysis.scores).toBeDefined();
    expect(analysis.scores.readability).toBeGreaterThan(0);
    expect(analysis.scores.readability).toBeLessThanOrEqual(10);
    
    expect(analysis.analysis).toBeDefined();
    expect(analysis.analysis.readability).toBeDefined();
    
    console.log('✅ AI integration working!');
  }, 60000); // 60 second timeout
});