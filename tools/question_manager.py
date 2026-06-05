#!/usr/bin/env python3
"""
question_manager.py – CLI tool to view, add, and validate game questions.

Usage:
    python tools/question_manager.py list
    python tools/question_manager.py list --category natacion
    python tools/question_manager.py list --difficulty hard
    python tools/question_manager.py stats
    python tools/question_manager.py add
    python tools/question_manager.py validate
    python tools/question_manager.py quiz [--category X] [--difficulty Y]
"""

import sys
import re
import json
import random
from pathlib import Path

# ── Parse questions from JS source ────────────────────────────
QUESTIONS_JS = Path(__file__).parent.parent / "src" / "data" / "questions.js"


def parse_questions() -> list[dict]:
    """
    Very simple parser – extracts JSON-like objects from the QUESTIONS array.
    Returns a list of question dicts.
    """
    text   = QUESTIONS_JS.read_text(encoding="utf-8")
    # Extract the array content between `export const QUESTIONS = [` ... `];`
    match  = re.search(r"export const QUESTIONS\s*=\s*\[(.*?)\];", text, re.DOTALL)
    if not match:
        print("❌  Could not find QUESTIONS array in questions.js")
        sys.exit(1)

    array_body = match.group(1)

    # Extract individual objects { ... }
    questions = []
    depth = 0
    buf   = ""
    for ch in array_body:
        if ch == "{":
            depth += 1
            buf += ch
        elif ch == "}":
            depth -= 1
            buf += ch
            if depth == 0 and buf.strip():
                obj = _parse_obj(buf.strip())
                if obj:
                    questions.append(obj)
                buf = ""
        elif depth > 0:
            buf += ch

    return questions


def _parse_obj(raw: str) -> dict | None:
    """Parse a single question object from JS literal syntax."""
    try:
        # Extract fields with simple regex
        def get(pattern, default=""):
            m = re.search(pattern, raw, re.DOTALL)
            return m.group(1).strip().strip("'\"") if m else default

        qid        = get(r"id:\s*['\"]([^'\"]+)['\"]")
        category   = get(r"category:\s*['\"]([^'\"]+)['\"]")
        difficulty = get(r"difficulty:\s*['\"]([^'\"]+)['\"]")
        question   = get(r"question:\s*['\"]([^'\"]+)['\"]")
        correct    = get(r"correct:\s*(\d+)")
        tip        = get(r"tip:\s*['\"]([^'\"]+)['\"]")

        # Options array
        opts_match = re.search(r"options:\s*\[(.*?)\]", raw, re.DOTALL)
        options = []
        if opts_match:
            opts_raw = opts_match.group(1)
            options  = re.findall(r"['\"]([^'\"]+)['\"]", opts_raw)

        return {
            "id":         qid,
            "category":   category,
            "difficulty": difficulty,
            "question":   question,
            "options":    options,
            "correct":    int(correct) if correct.isdigit() else 0,
            "tip":        tip,
        }
    except Exception:
        return None


# ── Commands ──────────────────────────────────────────────────

CATEGORIES  = ["natacion", "anatomia", "oceano", "adivinanza", "general"]
DIFFICULTIES = ["easy", "medium", "hard"]
CAT_ICONS   = {
    "natacion":   "🏊",
    "anatomia":   "🫀",
    "oceano":     "🌊",
    "adivinanza": "🧩",
    "general":    "🌍",
}
DIFF_COLORS = {"easy": "\033[92m", "medium": "\033[93m", "hard": "\033[91m"}
RESET       = "\033[0m"
BOLD        = "\033[1m"


def cmd_list(questions, category=None, difficulty=None):
    filtered = questions
    if category:
        filtered = [q for q in filtered if q["category"] == category]
    if difficulty:
        filtered = [q for q in filtered if q["difficulty"] == difficulty]

    print(f"\n{BOLD}📋  Questions ({len(filtered)} total){RESET}")
    print("─" * 70)

    for q in filtered:
        icon = CAT_ICONS.get(q["category"], "❓")
        dcol = DIFF_COLORS.get(q["difficulty"], "")
        print(f"  {icon} {BOLD}[{q['id']}]{RESET}  "
              f"{dcol}{q['difficulty'].upper()}{RESET}  "
              f"| {q['question'][:55]}...")

    print()


def cmd_stats(questions):
    print(f"\n{BOLD}📊  Question Bank Statistics{RESET}")
    print("─" * 40)
    print(f"  Total questions: {BOLD}{len(questions)}{RESET}")

    for cat in CATEGORIES:
        qs = [q for q in questions if q["category"] == cat]
        icon = CAT_ICONS.get(cat, "  ")
        print(f"\n  {icon} {cat}")
        for diff in DIFFICULTIES:
            dc  = DIFF_COLORS[diff]
            cnt = len([q for q in qs if q["difficulty"] == diff])
            bar = "█" * cnt
            print(f"     {dc}{diff:8s}{RESET}  {bar} ({cnt})")

    print()


def cmd_validate(questions):
    print(f"\n{BOLD}🔍  Validating questions...{RESET}")
    errors = 0

    required = ["id", "category", "difficulty", "question", "options", "correct"]
    ids_seen = set()

    for q in questions:
        qid = q.get("id", "???")
        # Duplicate ID
        if qid in ids_seen:
            print(f"  ❌ Duplicate ID: {qid}")
            errors += 1
        ids_seen.add(qid)

        # Missing fields
        for field in required:
            if not q.get(field):
                print(f"  ❌ [{qid}] Missing field: {field}")
                errors += 1

        # 4 options
        if len(q.get("options", [])) != 4:
            print(f"  ❌ [{qid}] Must have exactly 4 options (has {len(q.get('options', []))})")
            errors += 1

        # Correct index in range
        ci = q.get("correct", -1)
        if not (0 <= ci <= 3):
            print(f"  ❌ [{qid}] 'correct' index out of range: {ci}")
            errors += 1

        # Valid category
        if q.get("category") not in CATEGORIES:
            print(f"  ❌ [{qid}] Invalid category: {q.get('category')}")
            errors += 1

        # Valid difficulty
        if q.get("difficulty") not in DIFFICULTIES:
            print(f"  ❌ [{qid}] Invalid difficulty: {q.get('difficulty')}")
            errors += 1

    if errors == 0:
        print(f"  ✅  All {len(questions)} questions are valid!\n")
    else:
        print(f"\n  Found {errors} error(s). Please fix questions.js\n")


def cmd_quiz(questions, category=None, difficulty=None, n=5):
    """Interactive quiz for testing questions."""
    pool = questions
    if category:
        pool = [q for q in pool if q["category"] == category]
    if difficulty:
        pool = [q for q in pool if q["difficulty"] == difficulty]

    if not pool:
        print("❌  No questions match the filter.")
        return

    sample  = random.sample(pool, min(n, len(pool)))
    score   = 0
    options = ["A", "B", "C", "D"]

    print(f"\n{BOLD}🧠  Quiz Mode – {len(sample)} questions{RESET}")
    print("─" * 50)

    for i, q in enumerate(sample, 1):
        icon = CAT_ICONS.get(q["category"], "❓")
        print(f"\n{BOLD}Q{i}/{len(sample)}  {icon}  {q['question']}{RESET}")
        for j, opt in enumerate(q["options"]):
            print(f"   {options[j]}) {opt}")

        while True:
            ans = input("\n   Tu respuesta (A/B/C/D): ").strip().upper()
            if ans in options:
                break
            print("   Por favor ingresa A, B, C o D.")

        idx = options.index(ans)
        if idx == q["correct"]:
            print(f"   ✅  ¡Correcto!")
            score += 1
        else:
            correct_letter = options[q["correct"]]
            print(f"   ❌  Incorrecto. La respuesta era: {correct_letter}) {q['options'][q['correct']]}")

        if q.get("tip"):
            print(f"   💡 {q['tip']}")

    pct = score / len(sample) * 100
    print(f"\n{'─' * 50}")
    print(f"  {BOLD}Resultado: {score}/{len(sample)}  ({pct:.0f}%){RESET}")
    if pct == 100:
        print("  🏆  ¡Perfecto!")
    elif pct >= 70:
        print("  🎉  ¡Muy bien!")
    else:
        print("  📚  Sigue estudiando.")
    print()


def cmd_add():
    """Interactive prompt to add a new question and append it to questions.js."""
    print(f"\n{BOLD}➕  Add a new question{RESET}")
    print("─" * 40)

    cats  = list(CAT_ICONS.keys())
    diffs = DIFFICULTIES
    opts  = ["A", "B", "C", "D"]

    category = _prompt_choice("Category", cats)
    diff     = _prompt_choice("Difficulty", diffs)
    qtext    = input("Question text: ").strip()
    options  = [input(f"  Option {opts[i]}: ").strip() for i in range(4)]

    while True:
        try:
            ci = opts.index(input("Correct answer (A/B/C/D): ").upper())
            break
        except ValueError:
            print("Please enter A, B, C or D.")

    tip = input("Tip / explanation (optional): ").strip()

    # Auto-generate ID
    existing = parse_questions()
    prefix   = category[:1].upper()
    new_id   = f"{category[:2]}{len([q for q in existing if q['category'] == category]) + 1:02d}"

    obj = f"""  {{
    id: '{new_id}', category: '{category}', difficulty: '{diff}',
    question: '{qtext}',
    options: {json.dumps(options, ensure_ascii=False)},
    correct: {ci},
    tip: '{tip}',
  }},"""

    # Append before the closing `];`
    js_text = QUESTIONS_JS.read_text(encoding="utf-8")
    insert_pos = js_text.rfind("];")
    if insert_pos == -1:
        print("❌  Could not find end of QUESTIONS array.")
        return

    new_text = js_text[:insert_pos] + "\n" + obj + "\n\n" + js_text[insert_pos:]
    QUESTIONS_JS.write_text(new_text, encoding="utf-8")

    print(f"\n✅  Question '{new_id}' added to questions.js!\n")


def _prompt_choice(label: str, choices: list) -> str:
    print(f"{label} options: {', '.join(choices)}")
    while True:
        v = input(f"{label}: ").strip().lower()
        if v in choices:
            return v
        print(f"  Please choose from: {', '.join(choices)}")


# ── Entry point ───────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(0)

    questions = parse_questions()
    cmd       = args[0]

    # Parse flags
    def flag(name):
        for i, a in enumerate(args):
            if a == f"--{name}" and i + 1 < len(args):
                return args[i + 1]
        return None

    if cmd == "list":
        cmd_list(questions, category=flag("category"), difficulty=flag("difficulty"))
    elif cmd == "stats":
        cmd_stats(questions)
    elif cmd == "validate":
        cmd_validate(questions)
    elif cmd == "add":
        cmd_add()
    elif cmd == "quiz":
        n = int(flag("n") or 5)
        cmd_quiz(questions, category=flag("category"), difficulty=flag("difficulty"), n=n)
    else:
        print(f"❌  Unknown command: {cmd}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
