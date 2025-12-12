#!/usr/bin/env python3
"""
RAG-based Security Report Generator for ShadowID
Converts activity logs into intelligent Arabic security reports using RAG
"""

import sys
import json
import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.neighbors import NearestNeighbors
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
import warnings

warnings.filterwarnings("ignore")

# Model paths
EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
LLM_MODEL_ID = "Qwen/Qwen2.5-1.5B-Instruct"

# Global variables (loaded once)
embedding_model = None
llm_pipe = None
tokenizer = None
knn_index = None
df_rag = None


def load_models():
    """Load embedding model and LLM once"""
    global embedding_model, llm_pipe, tokenizer

    if embedding_model is None:
        print("Loading embedding model...", file=sys.stderr)
        embedding_model = SentenceTransformer(EMBEDDING_MODEL)
        print("✅ Embedding model loaded", file=sys.stderr)

    if llm_pipe is None:
        print("Loading LLM...", file=sys.stderr)
        tokenizer = AutoTokenizer.from_pretrained(LLM_MODEL_ID)
        # Try to use device_map if accelerate is available, otherwise use CPU
        try:
            import accelerate

            model = AutoModelForCausalLM.from_pretrained(
                LLM_MODEL_ID, dtype="auto", device_map="auto"
            )
        except ImportError:
            # Fallback to CPU if accelerate is not available
            model = AutoModelForCausalLM.from_pretrained(LLM_MODEL_ID, dtype="auto")
        llm_pipe = pipeline(
            "text-generation",
            model=model,
            tokenizer=tokenizer,
            max_new_tokens=512,
            temperature=0.7,
            repetition_penalty=1.1,
        )
        print("✅ LLM loaded", file=sys.stderr)


def prepare_data(activities_data):
    """
    Convert activities JSON to DataFrame and prepare for RAG
    activities_data: List of activity objects from database
    """
    global df_rag, knn_index, embedding_model

    if not activities_data:
        return None

    # Convert to DataFrame
    df = pd.DataFrame(activities_data)

    # Filter for Medium/High risk if RiskLabel exists
    if "riskLevel" in df.columns:
        mask = df["riskLevel"].astype(str).str.lower().isin(["medium", "high"])
        df_rag = df[mask].copy()
        if df_rag.empty:
            df_rag = df.copy()
    else:
        df_rag = df.copy()

    # Build knowledge_text for each event
    columns_for_text = [
        "type",
        "service",
        "location",
        "region",
        "status",
        "timestamp",
        "riskLevel",
        "blockchainHash",
    ]

    available_cols = [c for c in columns_for_text if c in df_rag.columns]

    def row_to_text(row):
        parts = []
        for col in available_cols:
            val = row.get(col, None)
            if pd.isna(val):
                continue
            parts.append(f"{col}: {val}")
        return " | ".join(parts)

    df_rag["knowledge_text"] = df_rag.apply(row_to_text, axis=1)

    # Create embeddings
    load_models()
    texts = df_rag["knowledge_text"].tolist()
    embeddings = embedding_model.encode(texts, show_progress_bar=False)

    # Build KNN index
    knn_index = NearestNeighbors(n_neighbors=min(4, len(df_rag)), metric="cosine")
    knn_index.fit(embeddings)

    return df_rag


def search_relevant_logs(query, k=4):
    """Search for relevant logs using KNN"""
    global knn_index, df_rag, embedding_model

    if knn_index is None or df_rag is None:
        return []

    # Encode query
    query_embedding = embedding_model.encode([query], show_progress_bar=False)

    # Find nearest neighbors
    distances, indices = knn_index.kneighbors(
        query_embedding, n_neighbors=min(k, len(df_rag))
    )

    # Retrieve logs
    retrieved_logs = []
    for idx, dist in zip(indices[0], distances[0]):
        similarity = 1 - dist  # Convert distance to similarity
        log_text = df_rag.iloc[idx]["knowledge_text"]
        retrieved_logs.append({"text": log_text, "similarity": float(similarity)})

    return retrieved_logs


def generate_response(user_query, retrieved_logs):
    """Generate Arabic security report using LLM"""
    global llm_pipe, tokenizer

    if llm_pipe is None:
        load_models()

    # Prepare context
    context_str = "\n".join([f"- {log['text']}" for log in retrieved_logs])

    # Prepare messages
    messages = [
        {
            "role": "system",
            "content": (
                "أنت خبير أمن سيبراني لنظام ShadowID في وزارة الداخلية. "
                "مهمتك تحليل السجلات وكتابة تقرير موجز بالعربية. "
                "التزم بالهيكل: 1. ملخص الحالة 2. تحليل المخاطر 3. التوصيات."
            ),
        },
        {
            "role": "user",
            "content": f"السؤال: {user_query}\n\nالسجلات المسترجعة:\n{context_str}\n\nأعطني التقرير الأمني:",
        },
    ]

    # Generate
    prompt = tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )
    outputs = llm_pipe(prompt)

    # Extract response
    full_response = outputs[0]["generated_text"]
    response_only = full_response.split("<|im_start|>assistant")[-1].strip()

    return response_only


def run_rag_report(query, activities_data, k=4):
    """
    Main RAG function: Prepare data, search, and generate report
    """
    try:
        # Prepare data
        df = prepare_data(activities_data)
        if df is None or len(df) == 0:
            return {"success": False, "error": "No activity data available for RAG"}

        # Search relevant logs
        retrieved_logs = search_relevant_logs(query, k=k)

        if not retrieved_logs:
            return {"success": False, "error": "No relevant logs found"}

        # Generate report
        report = generate_response(query, retrieved_logs)

        return {
            "success": True,
            "report": report,
            "retrieved_count": len(retrieved_logs),
            "total_activities": len(df),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    # Read input from stdin
    input_data = json.loads(sys.stdin.read())

    query = input_data.get("query", "حلل لي الأنشطة الأمنية وأعطني تقرير شامل")
    activities = input_data.get("activities", [])
    k = input_data.get("k", 4)

    # Run RAG
    result = run_rag_report(query, activities, k)

    # Output result
    print(json.dumps(result, ensure_ascii=False))
