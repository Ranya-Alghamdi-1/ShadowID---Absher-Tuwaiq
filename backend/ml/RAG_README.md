# RAG (Retrieval-Augmented Generation) Integration

## Overview

RAG enhances report generation by using AI to analyze activity logs and generate intelligent Arabic security reports. Instead of just structured statistics, RAG provides contextual analysis and recommendations.

## How It Works

1. **Data Retrieval**: Fetches recent activity logs from the database
2. **Embedding**: Converts activity logs into vector embeddings using multilingual sentence transformers
3. **Semantic Search**: Uses KNN to find the most relevant logs based on the query
4. **Generation**: Uses Qwen2.5-1.5B-Instruct LLM to generate Arabic security reports

## Setup

### 1. Install Dependencies

```bash
cd backend/ml
uv pip install -r requirements.txt
```

Or with pip:

```bash
pip install -r requirements.txt
```

### 2. Models Will Auto-Download

- **Embedding Model**: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (auto-downloads)
- **LLM Model**: `Qwen/Qwen2.5-1.5B-Instruct` (auto-downloads, ~3GB)

**Note**: First run will download models (~3-4GB total). Subsequent runs are fast.

## Usage

### API Endpoint

**Generate Report with RAG:**

```bash
POST /api/admin/reports/generate?useRAG=true&type=comprehensive
```

**Generate Structured Report (default):**

```bash
POST /api/admin/reports/generate?type=comprehensive
```

### Query Parameters

- `useRAG` (optional): Set to `"true"` to enable RAG-based generation
- `type` (optional): Report type
  - `"comprehensive"` (default): General security report
  - `"security"`: Focus on suspicious activities
  - `"risk"`: Focus on high-risk Shadow IDs
- `dateFrom` (optional): Start date for report period
- `dateTo` (optional): End date for report period

### Response Format

**With RAG enabled:**

```json
{
  "success": true,
  "report": {
    "type": "comprehensive",
    "generatedAt": "2025-12-11T...",
    "period": { "from": "all", "to": "now" },
    "summary": { ... },
    "statistics": { ... },
    "ragReport": "ملخص الحالة:\n\nهناك...",  // AI-generated Arabic report
    "ragMetadata": {
      "retrievedCount": 4,
      "totalActivitiesAnalyzed": 100
    },
    "recommendations": [ ... ]
  }
}
```

**Without RAG (structured only):**

```json
{
  "success": true,
  "report": {
    "summary": { ... },
    "statistics": { ... },
    "alerts": { ... },
    "recommendations": [ ... ]
  }
}
```

## How RAG Enhances Reports

### Structured Reports (Default)

- ✅ Statistics and numbers
- ✅ Pre-defined recommendations
- ❌ No contextual analysis
- ❌ No semantic understanding

### RAG Reports

- ✅ **Intelligent Analysis**: Understands context and patterns
- ✅ **Arabic Reports**: Natural language reports in Arabic
- ✅ **Semantic Search**: Finds relevant logs even with different wording
- ✅ **Contextual Recommendations**: Based on actual log analysis
- ✅ **Risk Insights**: Identifies patterns and anomalies

## Example Queries

The RAG system uses different queries based on report type:

- **Comprehensive**: "حلل لي الأنشطة الأمنية وأعطني تقرير شامل"
- **Security**: "حلل لي الأنشطة الأمنية المشبوهة وأعطني توصيات عاجلة"
- **Risk**: "حلل لي الهويات ذات مستوى High Risk وأعطني توصيات عاجلة"

## Performance

- **First Run**: ~30-60 seconds (model loading)
- **Subsequent Runs**: ~5-15 seconds (models cached in memory)
- **Memory Usage**: ~4-6GB RAM (for models)

## Server Requirements

### Minimum Requirements (CPU-only)

- **CPU**: 4+ cores (recommended)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 10GB+ (for models and dependencies)
- **OS**: Linux/macOS/Windows with Python 3.8+

### Recommended for Production

- **CPU**: 4-8 cores
- **RAM**: 16GB+ (models load into memory)
- **Storage**: 20GB+ (models + database + logs)
- **GPU**: Optional but recommended (auto-detected if available)

### Your Server Specs ✅

**4 CPU cores + 16GB RAM + 100GB storage** is **SUFFICIENT** for deployment!

**Breakdown:**

- **Models in memory**: ~4-5GB (embedding + LLM)
- **Python runtime**: ~500MB
- **Data processing**: ~500MB-1GB
- **System overhead**: ~2-3GB
- **Total**: ~7-10GB RAM usage (well within 16GB)

**Storage:**

- Models: ~3.5GB
- Application: ~1GB
- Database: <1GB
- Logs/cache: ~1-2GB
- **Total**: ~6-8GB (plenty of room on 100GB)

### Performance Expectations

With 4 CPU cores:

- **Model loading**: 30-60 seconds (first time only)
- **Report generation**: 10-20 seconds per report
- **Concurrent requests**: 1-2 reports at a time (models are memory-bound)

### Optimization Tips

If you need to reduce memory usage:

1. **Use CPU-only inference** (already default):

   ```python
   # Models auto-detect CPU/GPU
   device_map="auto"  # Uses CPU if no GPU
   ```

2. **Reduce batch size** (in code):

   - Limit activities: `take(50)` instead of `take(100)`
   - Reduce K: `k=2` instead of `k=4`

3. **Model quantization** (future enhancement):

   - Use 8-bit or 4-bit models to reduce memory by 50-75%

4. **Lazy loading** (already implemented):
   - Models only load when first RAG request comes in
   - Can unload models after inactivity (future enhancement)

## Fallback Behavior

If RAG generation fails (e.g., models not installed, Python error), the system automatically falls back to structured report generation. No errors are thrown to the user.

## Troubleshooting

### Models Not Downloading

- Check internet connection
- Ensure sufficient disk space (~4GB)
- Check Python version (3.8+)

### Slow Performance

- First run is slow (model loading)
- Consider using GPU if available (auto-detected)
- Models are cached after first load

### Memory Issues

- Reduce `k` parameter (fewer retrieved logs)
- Limit activities with `take(100)` in code
- Use structured reports for lower memory usage

## Technical Details

### Embedding Model

- **Model**: `paraphrase-multilingual-MiniLM-L12-v2`
- **Size**: ~420MB
- **Languages**: Supports Arabic and English
- **Dimensions**: 384

### LLM Model

- **Model**: `Qwen/Qwen2.5-1.5B-Instruct`
- **Size**: ~3GB
- **Languages**: Excellent Arabic support
- **Context**: 512 tokens max

### KNN Search

- **Algorithm**: Cosine similarity
- **K**: 4 (configurable)
- **Metric**: Cosine distance

## Future Enhancements

- [ ] Cache embeddings for faster retrieval
- [ ] Support for custom queries via API
- [ ] Batch processing for multiple reports
- [ ] Fine-tune LLM on ShadowID-specific data
- [ ] Add more report types
