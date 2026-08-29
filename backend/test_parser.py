"""Standalone test for _fix_latex_backslashes_for_json and parse_json_response"""
import re
import json

def _fix_latex_backslashes_for_json(text):
    result = []
    i = 0
    while i < len(text):
        if text[i] == '\\':
            if i + 1 < len(text):
                next_char = text[i + 1]
                if next_char == '\\':
                    result.append('\\\\')
                    i += 2
                    continue
                elif next_char == '"' or next_char == '/':
                    result.append('\\')
                    result.append(next_char)
                    i += 2
                    continue
                elif next_char == 'u' and i + 5 < len(text) and all(c in '0123456789abcdefABCDEF' for c in text[i+2:i+6]):
                    result.append(text[i:i+6])
                    i += 6
                    continue
                elif next_char in 'bfnrt':
                    if i + 2 < len(text) and text[i + 2].isalpha():
                        result.append('\\\\')
                        result.append(next_char)
                        i += 2
                        continue
                    else:
                        result.append('\\')
                        result.append(next_char)
                        i += 2
                        continue
                else:
                    result.append('\\\\')
                    result.append(next_char)
                    i += 2
                    continue
            else:
                result.append('\\\\')
                i += 1
        else:
            result.append(text[i])
            i += 1
    return ''.join(result)

def parse_json_response(raw_text):
    cleaned = raw_text.strip()
    if cleaned.startswith("```json"):
        cleaned = re.sub(r"^```json\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    elif cleaned.startswith("```"):
        cleaned = re.sub(r"^```\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    fixed = _fix_latex_backslashes_for_json(cleaned)
    try:
        return json.loads(fixed)
    except json.JSONDecodeError:
        pass

    start_candidates = [idx for idx in (cleaned.find("{"), cleaned.find("[")) if idx != -1]
    if not start_candidates:
        raise json.JSONDecodeError("No JSON structure found", cleaned, 0)
    start = min(start_candidates)
    end = max(cleaned.rfind("}"), cleaned.rfind("]"))
    if end <= start:
        raise json.JSONDecodeError("No valid JSON structure found", cleaned, 0)
    substring = cleaned[start:end + 1]
    fixed_sub = _fix_latex_backslashes_for_json(substring)
    return json.loads(fixed_sub)

# --- Tests ---
print("Test 1: Single backslash LaTeX (model typical output)")
raw = '["$\\mathbb{P}(A \\cap B^c) \\cup (A^c \\cap B)$"]'
result = parse_json_response(raw)
assert '\\mathbb' in result[0]
print(f"  PASSED: {result}\n")

print("Test 2: Already double-escaped")
raw2 = '["$\\\\mathbb{P}(A \\\\cap B)$"]'
result2 = parse_json_response(raw2)
assert '\\mathbb' in result2[0]
print(f"  PASSED: {result2}\n")

print("Test 3: LaTeX \\frac, \\theta, \\beta (JSON escape char collisions)")
raw3 = '{"question": "$\\frac{1}{2}$", "answer": "$\\theta + \\beta$"}'
result3 = parse_json_response(raw3)
assert 'frac' in result3['question'], f"FAIL frac: {repr(result3['question'])}"
assert 'theta' in result3['answer'], f"FAIL theta: {repr(result3['answer'])}"
assert 'beta' in result3['answer'], f"FAIL beta: {repr(result3['answer'])}"
print(f"  PASSED: {result3}\n")

print("Test 4: Valid JSON \\n newline (preserved when not followed by alpha)")
raw4 = '{"text": "line1\\nline2"}'
result4 = parse_json_response(raw4)
assert 'line1' in result4['text'] and 'line2' in result4['text']
print(f"  PASSED: {result4}\n")

print("Test 5: Full screenshot error pattern with \\left, \\frac, \\right, \\neq")
raw5 = '["$\\mathbb{P}(A \\cap B^c) \\cup (A^c \\cap B) = \\left(\\frac{1}{2}\\right)$", "$\\neq$"]'
result5 = parse_json_response(raw5)
assert len(result5) == 2
assert 'frac' in result5[0]
assert 'neq' in result5[1]
print(f"  PASSED: {result5}\n")

print("Test 6: ```json fenced output")
raw6 = '```json\n["$\\mathbb{P}$"]\n```'
result6 = parse_json_response(raw6)
assert len(result6) == 1
print(f"  PASSED: {result6}\n")

print("Test 7: Mixed \\right and genuine \\r at end")
raw7 = '{"a": "\\right arrow", "b": "value\\r"}'
result7 = parse_json_response(raw7)
assert 'right' in result7['a']
print(f"  PASSED: {result7}\n")

print("=" * 50)
print("ALL 7 TESTS PASSED!")
