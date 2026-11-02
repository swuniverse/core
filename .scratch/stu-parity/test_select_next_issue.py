#!/usr/bin/env python3

from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("select-next-issue.py")
SPEC = importlib.util.spec_from_file_location("select_next_issue", MODULE_PATH)
assert SPEC and SPEC.loader
selector = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = selector
SPEC.loader.exec_module(selector)


def issue(
    issue_id: str,
    slug: str,
    *,
    status: str = "ready-for-agent",
    priority: str = "P2",
    size: str = "S",
    blocked_by: str = "—",
) -> tuple[str, str]:
    return (
        f"{issue_id}-{slug}.md",
        f"""# Test

**Status:** {status}
**Priority:** {priority}
**Size:** {size}
**Blocked by:** {blocked_by}
""",
    )


class SelectorTest(unittest.TestCase):
    def load(self, entries: list[tuple[str, str]]):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        directory = Path(temporary.name)
        for name, content in entries:
            (directory / name).write_text(content, encoding="utf-8")
        return selector.load_issues(directory)

    def test_priority_then_filename(self):
        issues = self.load(
            [
                issue("soc-Z9", "later", priority="P2"),
                issue("soc-B1", "second", priority="P1"),
                issue("soc-A1", "first", priority="P1"),
            ]
        )
        selected, report = selector.select_issue(issues)
        self.assertEqual("soc-A1", selected.issue_id)
        self.assertEqual("new", report["mode"])

    def test_resolved_and_wontfix_blockers_are_eligible(self):
        issues = self.load(
            [
                issue("soc-A1", "resolved", status="resolved"),
                issue("soc-A2", "wontfix", status="wontfix"),
                issue("soc-A3", "ready", blocked_by="soc-A1, soc-A2"),
            ]
        )
        selected, _ = selector.select_issue(issues)
        self.assertEqual("soc-A3", selected.issue_id)

    def test_unresolved_blocker_is_not_eligible(self):
        issues = self.load(
            [
                issue("soc-A1", "question", status="needs-info"),
                issue("soc-A2", "blocked", blocked_by="soc-A1"),
            ]
        )
        selected, report = selector.select_issue(issues)
        self.assertIsNone(selected)
        self.assertEqual(1, report["blockedReadyCount"])

    def test_claimed_issue_resumes_before_ready_issue(self):
        issues = self.load(
            [
                issue("soc-A1", "ready", priority="P1"),
                issue("soc-A2", "claimed", status="claimed", priority="P3"),
            ]
        )
        selected, report = selector.select_issue(issues)
        self.assertEqual("soc-A2", selected.issue_id)
        self.assertEqual("resume", report["mode"])

    def test_multiple_claims_fail_closed(self):
        issues = self.load(
            [
                issue("soc-A1", "one", status="claimed"),
                issue("soc-A2", "two", status="claimed"),
            ]
        )
        with self.assertRaisesRegex(selector.TrackerError, "multiple claimed"):
            selector.select_issue(issues)

    def test_frontier_returns_all_eligible_in_order(self):
        issues = self.load(
            [
                issue("soc-Z9", "later", priority="P2"),
                issue("soc-B1", "second", priority="P1"),
                issue("soc-A1", "first", priority="P1"),
            ]
        )
        selected, report = selector.select_frontier(issues)
        self.assertEqual(["soc-A1", "soc-B1", "soc-Z9"], [item.issue_id for item in selected])
        self.assertEqual(3, report["eligibleCount"])

    def test_frontier_limit_and_exclusions(self):
        issues = self.load(
            [
                issue("soc-A1", "first", priority="P1"),
                issue("soc-A2", "second", priority="P1"),
                issue("soc-A3", "third", priority="P2"),
            ]
        )
        selected, report = selector.select_frontier(
            issues, exclude_ids={"soc-A1"}, limit=1
        )
        self.assertEqual(["soc-A2"], [item.issue_id for item in selected])
        self.assertEqual(["soc-A1"], [item["id"] for item in report["excluded"]])
        self.assertEqual(3, report["eligibleCount"])

    def test_frontier_reports_multiple_claims(self):
        issues = self.load(
            [
                issue("soc-A1", "one", status="claimed"),
                issue("soc-A2", "two", status="claimed"),
                issue("soc-A3", "ready"),
            ]
        )
        selected, report = selector.select_frontier(issues)
        self.assertEqual(["soc-A3"], [item.issue_id for item in selected])
        self.assertEqual(["soc-A1", "soc-A2"], [item["id"] for item in report["claimed"]])

    def test_frontier_cli_json(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        directory = Path(temporary.name)
        for name, content in [issue("soc-A1", "first"), issue("soc-A2", "second")]:
            (directory / name).write_text(content, encoding="utf-8")
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            exit_code = selector.main(
                [
                    "--issues-dir",
                    str(directory),
                    "--mode",
                    "frontier",
                    "--format",
                    "json",
                    "--limit",
                    "1",
                ]
            )
        self.assertEqual(0, exit_code)
        payload = json.loads(output.getvalue())
        self.assertEqual(["soc-A1"], [item["id"] for item in payload["frontier"]])
        self.assertEqual(2, payload["eligibleCount"])

    def test_unknown_blocker_fails_closed(self):
        with self.assertRaisesRegex(selector.TrackerError, "blocker ID"):
            self.load([issue("soc-A1", "ready", blocked_by="soc-MISSING")])

    def test_missing_field_fails_closed(self):
        name, content = issue("soc-A1", "bad")
        with self.assertRaisesRegex(selector.TrackerError, "Priority"):
            self.load([(name, content.replace("**Priority:** P2\n", ""))])

    def test_prefix_like_ids_resolve_exactly(self):
        issues = self.load(
            [
                issue("col-A1", "parent", status="resolved"),
                issue("col-A1a", "child", status="resolved"),
                issue("col-A2", "ready", blocked_by="col-A1a"),
            ]
        )
        selected, _ = selector.select_issue(issues)
        self.assertEqual("col-A2", selected.issue_id)


if __name__ == "__main__":
    unittest.main()
