#!/usr/bin/env python3
"""
LLM-based Recommendations Generator for ShadowID
Generates natural language recommendations based on report statistics
"""

import sys
import json
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
import warnings

warnings.filterwarnings("ignore")

# Model path
LLM_MODEL_ID = "Qwen/Qwen2.5-1.5B-Instruct"

# Global variables (loaded once)
llm_pipe = None
tokenizer = None


def load_models():
    """Load LLM once"""
    global llm_pipe, tokenizer

    if llm_pipe is None:
        print("Loading LLM for recommendations...", file=sys.stderr)
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
            max_new_tokens=256,
            temperature=0.7,
            repetition_penalty=1.1,
        )
        print("✅ LLM loaded", file=sys.stderr)


def generate_recommendations(summary_data):
    """Generate natural language recommendations using LLM"""
    global llm_pipe, tokenizer

    if llm_pipe is None:
        load_models()

    # Prepare context from summary
    context = f"""
إحصائيات النظام:
- إجمالي المستخدمين: {summary_data.get('totalUsers', 0)}
- إجمالي Shadow IDs: {summary_data.get('totalShadowIds', 0)}
- إجمالي الأنشطة: {summary_data.get('totalActivities', 0)}
- معدل النجاح: {summary_data.get('successRate', 100)}%
- نسبة المخاطر العالية: {summary_data.get('highRiskPercentage', 0)}%
- إجمالي التنبيهات: {summary_data.get('totalAlerts', 0)}
- التنبيهات غير المحلولة: {summary_data.get('unresolvedAlerts', 0)}
"""

    # Prepare messages with more specific instructions
    messages = [
        {
            "role": "system",
            "content": (
                "أنت خبير أمن سيبراني متخصص في نظام ShadowID التابع لوزارة الداخلية السعودية. "
                "مهمتك تحليل الإحصائيات الأمنية وكتابة توصيات عملية ومحددة بالعربية. "
                "يجب أن تكون التوصيات: "
                "1. محددة وقابلة للتنفيذ "
                "2. مرتبطة بالإحصائيات المعطاة "
                "3. تركز على الأولويات الأمنية "
                "4. مكتوبة بشكل واضح ومباشر "
                "اكتب 3-5 توصيات، كل توصية في سطر منفصل."
            ),
        },
        {
            "role": "user",
            "content": f"""تحليل الإحصائيات الأمنية:

{context}

بناءً على هذه الإحصائيات، اكتب توصيات أمنية عملية ومحددة. ركز على:
- تحسين الأمان إذا كانت هناك مخاطر
- مراقبة الأنشطة المشبوهة
- تحسين الأداء إذا كان هناك مجال لذلك
- أي نقاط ضعف محتملة

اكتب التوصيات مباشرة، كل توصية في سطر منفصل:""",
        },
    ]

    # Generate
    prompt = tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )
    outputs = llm_pipe(prompt)

    # Extract response
    full_response = outputs[0]["generated_text"]

    # Try multiple ways to extract the assistant response
    if "<|im_start|>assistant" in full_response:
        response_only = full_response.split("<|im_start|>assistant")[-1].strip()
    elif "assistant" in full_response.lower():
        # Try to find assistant response after user message
        parts = full_response.split("user")
        if len(parts) > 1:
            response_only = parts[-1].strip()
        else:
            response_only = full_response.strip()
    else:
        # If no clear separator, use the full response but remove the prompt
        # Remove the original prompt from the response
        prompt_length = len(prompt)
        if len(full_response) > prompt_length:
            response_only = full_response[prompt_length:].strip()
        else:
            response_only = full_response.strip()

    # Clean up any remaining tokens
    response_only = (
        response_only.replace("<|im_end|>", "").replace("<|endoftext|>", "").strip()
    )

    print(f"Generated response length: {len(response_only)}", file=sys.stderr)
    print(f"Response preview: {response_only[:200]}", file=sys.stderr)

    # Parse recommendations (split by lines, remove numbering)
    lines = response_only.split("\n")
    recommendations = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Remove numbering and bullet points (more comprehensive)
        import re

        # Remove Arabic and English numbering patterns
        line = re.sub(
            r"^[\d\u0660-\u0669]+[\.\)]\s*", "", line
        )  # Arabic/English numbers
        line = line.replace("•", "").replace("-", "").replace("*", "").strip()
        # Remove common prefixes
        line = re.sub(
            r"^(توصية|recommendation|يُنصح|يجب|نوصي|ننصح)[:\s]*",
            "",
            line,
            flags=re.IGNORECASE,
        )
        line = line.strip()

        if len(line) > 15:  # Only add meaningful recommendations (increased threshold)
            recommendations.append(line)

    # If no recommendations extracted, try to split by common separators
    if not recommendations:
        # Try splitting by periods or semicolons
        parts = re.split(r"[.;]\s+", response_only)
        for part in parts:
            part = part.strip()
            if len(part) > 15:
                recommendations.append(part)

    # If still no recommendations, use the full response but clean it
    if not recommendations:
        # Try to extract meaningful sentences
        import re

        sentences = re.split(r"[.!?]\s+", response_only)
        for sentence in sentences:
            sentence = sentence.strip()
            # Remove any remaining tokens
            sentence = re.sub(r"<\|[^|]+\|>", "", sentence).strip()
            if len(sentence) > 20:  # Meaningful sentence
                recommendations.append(sentence)

        # If still nothing, use cleaned full response
        if not recommendations:
            cleaned = (
                response_only.replace("<|im_end|>", "")
                .replace("<|endoftext|>", "")
                .strip()
            )
            # Remove any prompt remnants
            cleaned = re.sub(
                r"اكتب توصيات.*?:", "", cleaned, flags=re.IGNORECASE
            ).strip()
            if cleaned and len(cleaned) > 10:
                recommendations = [cleaned]
            else:
                # Last resort: return a generic message
                recommendations = ["يرجى مراجعة الإحصائيات والتحقق من حالة النظام"]

    return recommendations[:5]  # Limit to 5 recommendations


if __name__ == "__main__":
    try:
        # Read input from stdin
        print("Reading input...", file=sys.stderr)
        input_data = json.loads(sys.stdin.read())
        summary = input_data.get("summary", {})

        if not summary:
            raise ValueError("No summary data provided")

        print(
            f"Generating recommendations for {summary.get('totalUsers', 0)} users...",
            file=sys.stderr,
        )

        # Generate recommendations
        recommendations = generate_recommendations(summary)

        print(f"Generated {len(recommendations)} recommendations", file=sys.stderr)
        for i, rec in enumerate(recommendations, 1):
            print(f"  {i}. {rec[:100]}...", file=sys.stderr)

        # Validate we have recommendations
        if not recommendations or len(recommendations) == 0:
            raise ValueError("No recommendations generated")

        # Output result
        result = {
            "success": True,
            "recommendations": recommendations,
        }
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        import traceback

        error_trace = traceback.format_exc()
        print(f"Error: {error_trace}", file=sys.stderr)
        result = {
            "success": False,
            "error": str(e),
            "recommendations": ["فشل في توليد التوصيات. يرجى المحاولة مرة أخرى."],
        }
        print(json.dumps(result, ensure_ascii=False))
