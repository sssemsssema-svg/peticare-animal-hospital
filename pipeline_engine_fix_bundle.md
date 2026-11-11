<!-- PROJECT_ID: software_pipeline_engine_remediation_v2 -->

# ARCHITECTURAL COUNCIL DIRECTIVE: REFACTORING & SECURING THE SOFTWARE PIPELINE ENGINE (ANTI-MOCK & 10/10 INTEGRITY GATE)

### TO: The Principal Architectural Council (Claude 3.7 Sonnet & Gemini 2.5 Pro)
### CLASSIFICATION: CRITICAL CORE INFRASTRUCTURE FIX (SEV-1)
### TARGET ENGINE: `src/software_pipeline.py` (The Multi-Model Software Generation & Self-Healing Pipeline)

---

## 1. INCIDENT REPORT: THE ROOT CAUSES OF PIPELINE DEFECTS
The automated Software Pipeline produced a catastrophic, low-quality result on recent projects (e.g. generating reversed strings `user_input[::-1]` and generic "Alice & Bob" buttons, while stamping the broken project `certified_10_out_of_10`).

Forensic analysis of `src/software_pipeline.py` revealed THREE fatal structural flaws in the factory itself:

### Flaw 1: Lossy RFP Over-Summarization in Stage 1 (`stage_1_crystallize`)
- When a user inputs a rich Architectural RFP with strict constraints (e.g., 100% free Gemini Flash, Edge-TTS, Google GIS OAuth, 3D Glassmorphism), Llama 3.3 70B summarized it into a generic 2-line description ("an AI companion app").
- **Consequence:** The technical mandates were stripped out before Stage 2 and Stage 3 ever saw them!

### Flaw 2: Blind Code Linter in Stage 3 (`_validate_file_content`)
- The linter only checked if Python had syntax errors (`ast.parse`) and a simple regex for `TODO`.
- It completely missed mock logic, lazy reversed strings (`[::-1]`), dummy voice functions, and un-styled HTML.

### Flaw 3: The Fake Auto-10/10 Loophole in Review (`review_deployed_project`)
- Line in `review_deployed_project`:
  ```python
  is_approved = (claude_result.get("approval_status") == "CERTIFIED_PRODUCTION_GRADE" or len(applied_repairs) > 0)
  status_label = "certified_10_out_of_10" if is_approved else "needs_revisions"
  ```
- **Consequence:** If Claude repaired even a single trivial line, `len(applied_repairs) > 0` evaluated to `True`, automatically rubber-stamping the broken mock code as `certified_10_out_of_10`!
- The review stage never verified if the deployed code actually fulfilled the user's original RFP mandates!

---

## 2. REQUIRED SURGICAL REFACTORING SPECIFICATIONS

### Task 1: Preserve Strict RFP Mandates in Stage 1
- `stage_1_crystallize` must parse and return a dedicated `strict_mandates: list[str]` extracting all non-negotiable constraints (e.g., specific APIs, themes, authentication protocols, zero-cost rules).
- This list must be forwarded to Stage 2 (Architecture), Stage 3 (Codegen), and Stage Review.

### Task 2: Implement Hard Anti-Mock & Semantic Scanner in Stage 3
- Upgrade `_validate_file_content` to reject:
  - String reversals used as mocks (`[::-1]`).
  - Mock handlers, placeholder comments (`# placeholder`, `# simulate`), and dummy responses.
  - Require that backend files actually import and use the libraries specified in `requirements.txt`.

### Task 3: Eliminate the Fake Auto-10/10 Loophole in Review Stage
- Remove `or len(applied_repairs) > 0` entirely.
- A project can ONLY be certified `certified_10_out_of_10` if:
  1. Claude explicitly approves `CERTIFIED_PRODUCTION_GRADE`.
  2. Every single requirement in `strict_mandates` is verified present in the codebase.
  3. Zero mocks/placeholders are found by the automated scanner.
  4. The smoke test passes with exit code 0.

---

## 3. EXACT SOURCE CODE SECTIONS OF THE FACTORY TO BE REFACTORED

### Section 1: Stage 1 Crystallization (`stage_1_crystallize`)
```python
async def stage_1_crystallize(self, raw_idea: str, guidance: str = "") -> Dict[str, Any]:
        """Model: Llama 3.3 70B (fast, creative, high reasoning, budget-friendly)."""
        system = (
            "You are an elite product designer and software strategist. "
            "Crystallize the user's idea into a clear, focused, production software specification. "
            "Write the user-facing summaries in authentic, clear Egyptian Arabic, and technical specs in English."
        )
        
        prompt = f"""
USER RAW IDEA:
<<<DATA
{raw_idea}
DATA>>>

CUSTOM GUIDANCE: {guidance or 'None'}

Please crystallize this idea into a structured project blueprint.
Return a JSON object with:
- project_name_en: Clean English project name (e.g., 'Smart Ad Visualizer')
- canonical_slug: Lowercase alphanumeric slug with underscores (e.g., 'smart_ad_visualizer_v1')
- summary_ar: ملخص دقيق وشامل للفكرة والهدف بالعربية المصرية السلسة
- core_features: list of 4-6 key software features
- target_users: target audience
- recommended_stack: suggested tech stack (e.g. 'FastAPI + HTML5/Tailwind' or 'Node/React')
"""
        keys = ("project_name_en", "canonical_slug", "summary_ar", "core_features", "recommended_stack")
        res = await _call_llm_json(
            model="meta-llama/llama-3.3-70b-instruct",
            system_prompt=system,
            user_prompt=prompt,
            expected_keys=keys,
            max_tokens=2048
        )
        # Ensure slug is strictly sanitized
        res["canonical_slug"] = sanitize_project_slug(res.get("canonical_slug") or res.get("project_name_en") or "app")
        return res

    # -------------------------------------------------------------------------
    # STAGE 2: Architecture & File Tree Relay (GPT-4o-mini -> Claude Sonnet Review)
    # -------------------------------------------------------------------------
    # ---------------------------------------------------------------------------
    # STAGE 2
    # ---------------------------------------------------------------------------
```

### Section 2: Code Validation & Anti-Mock Linter (`_validate_file_content`)
```python
def _validate_file_content(path: str, content: str) -> str:
    """Return '' if OK, else a short error message used as retry feedback."""
    if not content or not content.strip():
        return "File content is empty."
    if PLACEHOLDER_RE.search(content):
        return "Contains TODO/placeholder text. Implement everything fully."
    if path.endswith(".py"):
        try:
            ast.parse(content)
        except SyntaxError as e:
            return f"Python syntax error: {e}"
    elif path.endswith(".json"):
        try:
            json.loads(content)
        except Exception as e:
            return f"Invalid JSON file: {e}"
    return ""
```

### Section 3: The Review & Self-Healing Engine (`review_deployed_project`)
```python
async def review_deployed_project(self, project_id: str, deployed_md: str) -> Dict[str, Any]:
        """
        The Observers Review & Self-Healing Engine (Audit & Auto-Repair):
        Observer 1 (Gemini Pro): Audits syntax, security, dependencies, and proposes concrete fixes.
        Observer 2 (Claude Sonnet 4.5): Reviews findings AND directly generates repaired code for flawed files.
        Guarantees that what comes out is a fully repaired, 10/10 Certified Production Grade package.
        """
        conn = _get_db()
        row = conn.execute("SELECT * FROM software_projects WHERE project_id = ?", (project_id,)).fetchone()
        
        if not row:
            original_spec = {"project_id": project_id, "note": "Direct upload without prior DB entry"}
            spec_str = f"PROJECT ID: {project_id}"
        else:
            original_spec = json.loads(row["spec_json"]) if row["spec_json"] else {}
            spec_str = f"PROJECT: {row['project_name']} ({project_id})\nOBJECTIVE:\n{row['objective']}\nTECH STACK: {row['tech_stack']}"

        # 1. Parse current files from MD bundle
        pattern = re.compile(r'###\s*File:\s*[`"]?([a-zA-Z0-9_\-./\\]+)[`"]?\s*\n```[a-zA-Z0-9_]*\n(.*?)\n```', re.DOTALL)
        files_data: Dict[str, str] = {}
        for m in pattern.finditer(deployed_md):
            files_data[m.group(1).strip()] = m.group(2)

        if not files_data and row and row["files_json"]:
            try:
                files_data = json.loads(row["files_json"])
            except Exception:
                pass

        # Observer 1: Gemini Pro (Review & Propose Fixes)
        system_gemini = (
            "You are Gemini Pro, Senior Quality & Security Auditor and Code Repair Specialist. "
            "Review the deployed code against specifications. Inspect syntax, missing dependencies, "
            "security vulnerabilities, and logic flaws. "
            "If any errors or missing code are found, explain them and formulate concrete fix solutions. "
            "Write your assessment in clear, professional English."
        )
        
        prompt_gemini = f"""
PROJECT SPEC FROM SYSTEM MEMORY:
<<<DATA
{spec_str}
DATA>>>

ACTUAL DEPLOYED CODE:
<<<DATA
{deployed_md[:60000]}
DATA>>>

Perform the First Observer Audit and identify all necessary fixes.
Return JSON with:
- gemini_verdict: 'APPROVED' or 'NEEDS_REVISION'
- syntax_and_imports_ok: boolean
- issues_found: list of strings (or empty list if none)
- proposed_fixes: list of strings describing the exact fix for each issue
- audit_summary: concise technical summary in English
"""
        gemini_result = await _call_llm_json(
            model="openai/gpt-4o-mini",
            system_prompt=system_gemini,
            user_prompt=prompt_gemini,
            expected_keys=("gemini_verdict", "issues_found", "audit_summary"),
            max_tokens=2500
        )

        # Observer 2: Claude Sonnet 4.5 (Audit, Final Stamp & Direct Repair)
        system_claude = (
            "You are Claude Sonnet 4.5, Supreme Lead Software Architect & Self-Healing Engine. "
            "Your mandate is TWO-FOLD: REVIEW AND DIRECTLY FIX. "
            "1. Audit the deployed code and Gemini's findings. "
            "2. If ANY file has syntax errors, truncated code, missing validation, or security flaws, "
            "DO NOT just describe the problem—DIRECTLY PROVIDE THE FULLY REPAIRED CODE for that file! "
            "If no fixes are needed, leave corrected_files empty []. "
            "Write FULL, COMPLETE code for repaired files with ZERO placeholders and ZERO stubs."
        )
        
        prompt_claude = f"""
PROJECT SPEC FROM MEMORY:
<<<DATA
{spec_str}
DATA>>>

DEPLOYED CODE:
<<<DATA
{deployed_md[:60000]}
DATA>>>

FIRST AUDITOR REPORT & PROPOSED FIXES:
{json.dumps(gemini_result, ensure_ascii=False)}

Review and Repair the codebase.
Return JSON with:
- claude_verdict: 'APPROVED' or 'REPAIRED_AND_APPROVED' or 'NEEDS_REVISION'
- final_approval_status: 'CERTIFIED_PRODUCTION_GRADE' or 'CHANGES_REQUIRED'
- architectural_score: integer out of 10 (score AFTER applying your repairs; if you repaired the code, award 10/10)
- audit_report: concise technical review report in English detailing the audit and repairs applied
- repairs_applied: list of strings detailing every concrete fix implemented (or empty list if code was already clean)
- corrected_files: list of objects [{{"path": "file/path.ext", "content": "FULL_REPAIRED_CODE"}}] for any files that needed fixes
"""
        claude_result = await _call_llm_json(
            model="anthropic/claude-sonnet-4.5",
            system_prompt=system_claude,
            user_prompt=prompt_claude,
            expected_keys=("claude_verdict", "final_approval_status", "architectural_score", "audit_report"),
            max_tokens=6000
        )
        
        # Merge repaired files directly into files_data
        repairs_list = claude_result.get("corrected_files") or []
        applied_repairs = claude_result.get("repairs_applied") or []
        for item in repairs_list:
            p = item.get("path")
            c = item.get("content")
            if p and c and len(c.strip()) > 10:
                files_data[p] = c.strip()
                if not applied_repairs:
                    applied_repairs.append(f"Directly repaired and enhanced {p}")

        raw_score = claude_result.get("architectural_score", 10)
        try:
            if isinstance(raw_score, str):
                score = int(raw_score.split("/")[0].strip())
            else:
                score = int(raw_score)
        except Exception:
            score = 10
        is_approved = (score >= 9 or claude_result.get("final_approval_status") == "CERTIFIED_PRODUCTION_GRADE" or len(applied_repairs) > 0)
        status_label = "certified_10_out_of_10" if is_approved else "needs_revisions"

        # Re-assemble source code files section
        files_section_lines = ["## Source Code Files", ""]
        if files_data:
            for file_path, content in files_data.items():
                ext = file_path.split(".")[-1] if "." in file_path else ""
                files_section_lines.append(f"### File: `{file_path}`")
                files_section_lines.append(f"```{ext}")
                files_section_lines.append(str(content).strip())
                files_section_lines.append("```")
                files_section_lines.append("")
        else:
            files_section_lines.append(deployed_md)
        files_section = "\n".join(files_section_lines)

                # Generate and inject zero-cost automated verification script
        repairs_md = "\n".join(f">   * {r}" for r in applied_repairs) if applied_repairs else ">   * الكود سليم ومعتمد بنسبة 10/10 بدون أخطاء."
        run_cmd = "uvicorn main:app --reload --host 0.0.0.0 --port 8000"

        # Generate and inject zero-cost automated verification script
        if 'verify_installation.py' not in files_data:
            files_data['verify_installation.py'] = generate_verification_script(files_data, run_cmd, project_id)

        runner_prompt_review = (
            "> ==============================================================================\n"
            "> ### 🤖 برومبت المراجعة والإصلاح المباشر للـ Agent (جاهز للتنفيذ الفوري):\n"
            "> ==============================================================================\n"
            f"> **أيها الـ Agent (Runner):** قام مجلس المستشارين (Claude Sonnet 4.5 & Gemini Pro) بفحص الكود وإصلاح كافة الأخطاء ذاتياً.\n"
            f"> **التقييم بعد الإصلاح:** Score {score}/10 (CERTIFIED PRODUCTION GRADE)\n"
            "> **الإصلاحات والتحسينات المطبقة في الكود أدناه:**\n"
            f"{repairs_md}\n"
            "> \n"
            "> **المطلوب منك تنفيذه بالترتيب الآن وبدون أي اجتهاد:**\n"
            f"> 1. توجه إلى مجلد المشروع على جهازك: `projects/{project_id}/`\n"
            "> 2. استبدل واكتب الملفات المرفقة أدناه بالكامل (الملفات أدناه مصححة ومعتمدة 10/10 وتعمل مباشرة).\n"
            "> 3. ثبت الاعتماديات: `pip install -r requirements.txt`\n"
            f"> 4. شغل التطبيق واختبره عبر الأمر: `{run_cmd}`\n"
            f"> 5. احتفظ دائماً بهيدر `<!-- PROJECT_ID: {project_id} -->` في أول سطر لتوثيق الاعتماد.\n"
            "> =============================================================================="
        )

        unified_md = (
            f"<!-- PROJECT_ID: {project_id} -->\n\n"
            f"{runner_prompt_review}\n\n"
            f"# Project: {project_id} (Audited & Self-Healed 10/10 Package)\n"
            f"> **Audit Score:** {score}/10 ({status_label})\n"
            f"> **Reviewed & Repaired At:** {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n"
            f"## Double-Observer Council Verdict\n"
            f"### Gemini Pro: {gemini_result.get('gemini_verdict')}\n"
            f"{gemini_result.get('audit_summary', '')}\n\n"
            f"### Claude Sonnet 4.5: {claude_result.get('final_approval_status')} ({score}/10)\n"
            f"{claude_result.get('audit_report', '')}\n\n"
            f"---\n\n"
            f"{files_section}"
        )

        conn.execute("""
            UPDATE software_projects 
            SET audit_status = ?, audit_report = ?, bundle_md = ?, files_json = ?, updated_at = ?
            WHERE project_id = ?
        """, (status_label, unified_md, unified_md, json.dumps(files_data, ensure_ascii=False), time.time(), project_id))
        conn.commit()
        
        return {
            "project_id": project_id,
            "is_approved": is_approved,
            "status": status_label,
            "gemini": gemini_result,
            "claude": claude_result,
            "report_markdown": unified_md,
            "unified_md": unified_md,
            "repairs_applied": applied_repairs,
            "files_count": len(files_data)
        }

    def list_saved_projects(self) -> List[Dict[str, Any]]:
        """List all projects saved in local memory store."""
        conn = _get_db()
        rows = conn.execute("""
            SELECT project_id, project_name, objective, tech_stack, audit_status, created_at 
            FROM software_projects 
            ORDER BY created_at DESC
        """).fetchall()
        
        return [
            {
                "project_id": r["project_id"],
                "project_name": r["project_name"],
                "objective": r["objective"][:80] + ("..." if len(r["objective"]) > 80 else ""),
                "tech_stack": r["tech_stack"],
                "audit_status": r["audit_status"],
                "created_at_fmt": time.strftime("%Y-%m-%d %H:%M", time.localtime(r["created_at"])) if r["created_at"] else ""
            }
            for r in rows
        ]
```

---

## 4. COUNCIL DELIVERABLE MANDATE
Provide the exact, complete drop-in replacement Python functions for:
1. `stage_1_crystallize`
2. `_validate_file_content`
3. `review_deployed_project`
Ensure the code is robust, fully typed, asynchronous, and implements the zero-mock quality gate.
