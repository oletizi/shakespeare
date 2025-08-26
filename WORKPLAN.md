# Cost-Optimized Pipeline Enhancement for Shakespeare

## Overview

This workplan enhances Shakespeare's existing workflow (content discovery → content rating → iterative improvement) with cost-optimized AI model selection and batch processing capabilities as described in MODEL-TASK-FIT.md.

**Current Shakespeare Workflow**:
1. **discoverContent()** - Lightweight content discovery without AI scoring
2. **reviewContent()** - AI scoring for discovered content (5 quality dimensions)  
3. **getWorstScoringContent()** - Identifies content needing improvement
4. **improveContent()** - Iterative AI-powered content improvement

**Enhancement Goal**: Reduce AI costs by 60-75% while maintaining quality through intelligent model selection and batch processing.

## Cost Optimization Strategy

### Model Selection by Task Complexity
- **Light Tasks (Scoring)**: Gemini Flash, GPT-4o Mini (75% cost savings)
- **Medium Tasks (Analysis)**: Claude 3.5 Haiku, DeepSeek-Chat (60% cost savings)  
- **Heavy Tasks (Improvement)**: Current models with batch processing (50% cost savings)

### Batch Processing
- **Nightly Review Batches**: Process 100+ files via batch APIs (50% additional savings)
- **Improvement Queues**: Group similar improvements for batch processing
- **Cost Budgeting**: Set daily/monthly AI spending limits

## Implementation Plan

### Phase 1: Model Configuration & Provider Abstraction (Week 1)

#### Task 1.1: Extend IAI Interface for Multi-Model Support
- [ ] Add model selection and configuration to existing `IAI` interface
- [ ] Add cost tracking and token estimation capabilities
- [ ] Extend `IContentScorer` for model-specific scoring strategies

#### Task 1.2: Multi-Provider Implementation
- [ ] **Option A: Enhanced GooseAI with Dynamic Model Selection**
  - Extend current `GooseAI` class to support `--provider` and `--model` CLI flags
  - Add methods to switch models on-the-fly (e.g., `prompt(text, {provider: 'anthropic', model: 'claude-3-5-haiku'})`)
  - Leverage Goose's built-in support for 20+ providers including OpenAI, Anthropic, Google, Groq, DeepInfra
  - Use environment variables for API keys and configuration management

- [ ] **Option B: Tetrate Agent Router Service Integration**
  - Create `TetrateLLMProvider` class implementing existing `IAI` interface
  - Use Tetrate's OpenAI-compatible endpoint with intelligent routing
  - Access models from OpenAI, Anthropic, Google, xAI Grok, Groq, DeepInfra through single API
  - Implement cost-aware model selection and automatic failover

- [ ] **Implementation Decision**: Start with Option A (enhanced GooseAI) for immediate cost optimization, with Option B (Tetrate) as advanced routing for production scale
- [ ] Maintain backward compatibility with current `GooseAI` implementation

#### Task 1.3: Cost-Optimized Model Selection
- [ ] Implement task-based model selection in `AIScorer.scoreContent()`
- [ ] Add cost estimation before AI calls
- [ ] Create model selection configuration for different quality dimensions

### Phase 2: Batch Processing for Existing Workflow (Week 2)

#### Task 2.1: Batch Review Operations  
- [ ] Add `reviewContentBatch()` method to Shakespeare class
- [ ] Queue multiple `reviewContent()` calls for batch processing
- [ ] Implement batch API support for scoring operations
- [ ] Add progress tracking for batch review operations

#### Task 2.2: Batch Improvement Operations
- [ ] Add `improveContentBatch()` method for processing multiple worst-scoring files
- [ ] Group similar improvement tasks for cost efficiency  
- [ ] Add batch scheduling (nightly processing) via new CLI scripts

#### Task 2.3: Enhanced CLI Scripts
- [ ] Modify existing `scripts/updateContentIndex.ts` to support batch operations
- [ ] Enhance `scripts/improveContent.ts` with batch processing and model selection
- [ ] Add new `scripts/batchReview.ts` for nightly review processing
- [ ] Add cost reporting to CLI output

### Phase 3: Cost Monitoring Integration (Week 3)

#### Task 3.1: Cost Tracking in Database
- [ ] Extend `ContentEntry` type to track AI costs per operation
- [ ] Add cost summaries to `ContentDatabase`
- [ ] Track model usage and costs in review history

#### Task 3.2: Budget Controls
- [ ] Add cost limits to Shakespeare configuration
- [ ] Implement budget checking before expensive operations
- [ ] Add cost alerts and reporting

### Phase 4: Quality Validation Enhancements (Week 4)

#### Task 4.1: Light-Weight Quality Gates
- [ ] Add fast grammar/style checking with cheap models before expensive improvements
- [ ] Implement duplicate content detection using existing content database
- [ ] Add quality threshold validation before improvement iterations

#### Task 4.2: Smart Improvement Targeting  
- [ ] Enhance `getWorstScoringContent()` with cost-benefit analysis
- [ ] Prioritize improvements with highest impact/cost ratio
- [ ] Add improvement effectiveness tracking

## Integration with Existing Shakespeare Architecture

### Current Components to Enhance

1. **ContentScanner** (`@/utils/scanner`): No changes needed - existing content discovery works perfectly
2. **ContentDatabaseHandler** (`@/utils/database`): Add cost tracking fields to database schema  
3. **AIScorer** (`@/utils/ai`): Add multi-provider support and cost-based model selection
4. **Shakespeare Class** (`@/index`): Add batch processing methods alongside existing workflow methods
5. **GooseAI** (`@/utils/goose`): Keep as default provider, add as one option among many

### Enhancement Strategy

**Maintain Existing API**: All current methods (`discoverContent`, `reviewContent`, `improveContent`, etc.) continue to work unchanged.

**Add Batch Variants**: New methods like `reviewContentBatch()` and `improveContentBatch()` that internally use cost-optimized models and batch processing.

**Incremental Migration**: Users can gradually migrate from single operations to batch operations based on their needs.

## Expected Cost Savings

| Shakespeare Operation | Current Cost* | Optimized Cost | Savings |
|----------------------|--------------|----------------|---------|
| **reviewContent()** (5-dimension scoring) | $0.15/file | $0.04/file | 73% |
| **improveContent()** (analysis + generation) | $0.45/file | $0.18/file | 60% |
| **Batch Operations** (50+ files) | Above × 50 | Above × 50 × 0.5 | Additional 50% |

*Estimated costs based on typical content file sizes and current model pricing*

### Cost Optimization Examples

**Single File Review**: $0.15 → $0.04 (using Gemini Flash instead of premium models)  
**Batch Review (100 files)**: $15 → $2 (model optimization + batch API discounts)  
**Daily Improvement Run**: $22.50 → $5.40 (76% reduction)

**Monthly Savings**: For a site processing 1000 files/month: $600 → $144 (**$456 monthly savings**)

## Success Metrics

### Cost Efficiency
- [ ] Achieve 60%+ cost reduction for individual operations via model optimization
- [ ] Achieve additional 50% savings via batch processing (75% total savings)
- [ ] Monthly AI costs under $200 for sites processing 1000+ files

### Quality Maintenance
- [ ] Quality scores maintained within 5% of current baseline  
- [ ] All 5 quality dimensions continue to work reliably
- [ ] User satisfaction with improved content quality maintained

### Performance  
- [ ] Batch operations process 100+ files within 2-hour windows
- [ ] Individual operations maintain sub-60 second response times
- [ ] 99%+ reliability for batch job completion

## Implementation Notes

### Backward Compatibility
- All existing Shakespeare methods continue to work unchanged
- Existing CLI scripts maintain current functionality
- Current database schema extended, not replaced
- GooseAI remains available as a provider option

### First Implementation Priority
Start with **Phase 1: Model Configuration & Provider Abstraction** to establish the foundation for cost optimization while maintaining full backward compatibility with the existing system.

### Testing Strategy
- Extend existing comprehensive test suite (89.07% coverage)
- Add cost estimation testing with mock providers
- Add batch operation integration tests
- Maintain existing quality assurance standards

## Risk Mitigation

### Quality Risks
- **Model Performance**: Continuous A/B testing against current baseline
- **Batch Failures**: Individual fallback for failed batch operations  
- **Provider Outages**: Multi-provider failover with existing GooseAI as backup

### Cost Risks
- **Budget Overruns**: Hard spending limits with automatic shutoff
- **Provider Changes**: Abstract interface allows quick provider swapping
- **Batch Failures**: Cost tracking prevents duplicate charges

---

*This workplan enhances Shakespeare's proven content discovery → rating → improvement workflow with intelligent cost optimization while preserving the quality and reliability that makes the system effective.*