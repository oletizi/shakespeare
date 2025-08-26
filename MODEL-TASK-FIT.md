## A cost-optimized pipeline that scales

1. **Outline & briefs (ultra-cheap)**  
   Use **Gemini Flash** or **GPT-4o mini** to generate SEO brief + H2/H3 structure + angle variants. Run via **Batch** for 50% off.

2. **First drafts (cheap)**  
   Draft section-by-section with **DeepSeek-Chat** (or stick to Flash/4o-mini if you prefer). Keep a **fixed style guide** and persona blob in the prompt **cache** when possible to avoid paying for it every time (Anthropic/Claude supports prompt caching; OpenAI lists “cached input” pricing on some models).

3. **Automated revision passes (still cheap)**  
   Run 2–3 targeted passes: (a) clarity/structure, (b) tone & brand, (c) on-page SEO (titles, meta, FAQs). **Claude 3.5 Haiku** is a great low-cost editor; **Llama 3.1 70B** (Together) is another budget rewriter.

4. **Batch everything**  
   Queue hundreds of docs nightly using **OpenAI Batch** or **Gemini Batch Mode**; Anthropic’s **Message Batches** also stacks with prompt caching. All three offer ~**50% discounts** for batch workloads.

5. **Quality gates before publish (token-light)**  
   - Grammar & style check with a cheap pass (Flash/4o-mini).  
   - **Fact spot-checks** only on claims that changed recently (minimize expensive retrieval).  
   - Duplicate detection via embeddings (tiny cost) before final export.
