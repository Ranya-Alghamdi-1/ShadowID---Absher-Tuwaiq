#!/usr/bin/env python3
"""
Test script for generate_recommendations.py
Run this manually to test the recommendations generation
"""

import json
import sys
from generate_recommendations import generate_recommendations

# Test data
test_summary = {
    "totalUsers": 22,
    "totalShadowIds": 20,
    "totalActivities": 26,
    "successRate": 100,
    "highRiskPercentage": 5,
    "totalAlerts": 0,
    "unresolvedAlerts": 0
}

if __name__ == "__main__":
    print("🧪 Testing LLM Recommendations Generation")
    print("=" * 50)
    print(f"📊 Test Summary Data:")
    print(json.dumps(test_summary, indent=2))
    print("=" * 50)
    print("\n⏳ Generating recommendations (this may take 30-60 seconds on first run)...\n")
    
    try:
        recommendations = generate_recommendations(test_summary)
        
        print("\n✅ Success! Generated Recommendations:")
        print("=" * 50)
        for i, rec in enumerate(recommendations, 1):
            print(f"{i}. {rec}")
        print("=" * 50)
        print(f"\n📝 Total: {len(recommendations)} recommendations")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
