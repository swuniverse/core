#!/usr/bin/env python3

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from argparse import Namespace
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("parallel_ralph.py")
SPEC = importlib.util.spec_from_file_location("parallel_ralph", MODULE_PATH)
assert SPEC and SPEC.loader
parallel = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = parallel
SPEC.loader.exec_module(parallel)


class CoordinatorTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.repo = Path(temporary.name)
        self.git("init", "-b", "stu-parity")
        self.git("config", "user.name", "Test")
        self.git("config", "user.email", "test@example.com")
        directory = self.repo / ".scratch" / "stu-parity"
        (directory / "issues").mkdir(parents=True)
        source = Path(__file__).parent
        for name in ("select-next-issue.py", "test_select_next_issue.py", "PROMPT.md"):
            (directory / name).write_text((source / name).read_text(encoding="utf-8"), encoding="utf-8")
        self.write_issue("soc-A1", "first")
        self.write_issue("soc-A2", "second")
        self.git("add", ".")
        self.git("commit", "-m", "fixture")
        self.coordinators = []

    def tearDown(self):
        for coordinator in self.coordinators:
            coordinator.stop_children()
            if coordinator.lock_handle is not None:
                coordinator.lock_handle.close()
                coordinator.lock_handle = None

    def coordinator(self, **overrides):
        coordinator = parallel.Coordinator(self.args(**overrides))
        self.coordinators.append(coordinator)
        return coordinator

    def git(self, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["git", *args],
            cwd=self.repo,
            text=True,
            capture_output=True,
            check=check,
        )

    def write_issue(self, issue_id: str, slug: str, *, blocked_by: str = "—") -> None:
        path = self.repo / ".scratch" / "stu-parity" / "issues" / f"{issue_id}-{slug}.md"
        path.write_text(
            f"""# Test

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** {blocked_by}
""",
            encoding="utf-8",
        )

    def args(self, **overrides):
        values = {
            "repo": str(self.repo),
            "jobs": 2,
            "max_tickets": 2,
            "model": "primary",
            "small_model": "small",
            "integration_branch": "stu-parity",
            "max_retries": 0,
            "resume": None,
            "skip_batch_verify": True,
        }
        values.update(overrides)
        return Namespace(**values)

    def test_preflight_rejects_dirty_checkout(self):
        (self.repo / "dirty.txt").write_text("dirty", encoding="utf-8")
        coordinator = self.coordinator()
        with self.assertRaisesRegex(parallel.CoordinatorError, "not clean"):
            coordinator.preflight()

    def test_frontier_prepares_distinct_worktrees(self):
        coordinator = self.coordinator()
        coordinator.acquire_lock()
        coordinator.preflight()
        coordinator.init_or_resume()
        frontier = coordinator.query_frontier(2)
        workers = [coordinator.prepare_worker(item) for item in frontier]
        self.assertEqual(2, len(workers))
        self.assertNotEqual(workers[0].branch, workers[1].branch)
        self.assertTrue(all(worker.worktree.is_dir() for worker in workers))
        self.assertTrue(all(worker.base_commit == coordinator.initial_head for worker in workers))

    def test_orphan_claim_fails_closed(self):
        issue = self.repo / ".scratch" / "stu-parity" / "issues" / "soc-A1-first.md"
        issue.write_text(issue.read_text(encoding="utf-8").replace("ready-for-agent", "claimed"), encoding="utf-8")
        self.git("add", ".")
        self.git("commit", "-m", "claim")
        coordinator = self.coordinator()
        coordinator.acquire_lock()
        coordinator.preflight()
        coordinator.init_or_resume()
        with self.assertRaisesRegex(parallel.CoordinatorError, "lack a Ralph manifest"):
            coordinator.query_frontier(2)

    def test_validate_worker_requires_clean_commit_and_terminal_status(self):
        coordinator = self.coordinator()
        coordinator.acquire_lock()
        coordinator.preflight()
        coordinator.init_or_resume()
        worker = coordinator.prepare_worker(coordinator.query_frontier(1)[0])
        with self.assertRaisesRegex(parallel.CoordinatorError, "no commit"):
            coordinator.validate_worker(worker)
        issue_path = Path(worker.issue_path)
        if issue_path.is_absolute():
            issue_path = issue_path.relative_to(self.repo)
        issue = worker.worktree / issue_path
        issue.write_text(issue.read_text(encoding="utf-8").replace("ready-for-agent", "resolved"), encoding="utf-8")
        subprocess.run(["git", "add", "."], cwd=worker.worktree, check=True)
        subprocess.run(["git", "commit", "-m", f"feat(test): done (stu-parity {worker.issue_id})"], cwd=worker.worktree, check=True)
        coordinator.validate_worker(worker)
        self.assertIsNotNone(worker.head_after)

    def test_reconcile_does_not_accept_dirty_interrupted_worker(self):
        coordinator = self.coordinator()
        coordinator.acquire_lock()
        coordinator.preflight()
        coordinator.init_or_resume()
        worker = coordinator.prepare_worker(coordinator.query_frontier(1)[0])
        worker.state = "running"
        (worker.worktree / "partial.txt").write_text("partial", encoding="utf-8")
        coordinator.reconcile()
        self.assertEqual("worker_failed", worker.state)

    def test_missing_integration_worktree_is_reconstructed(self):
        coordinator = self.coordinator()
        coordinator.acquire_lock()
        coordinator.preflight()
        coordinator.init_or_resume()
        subprocess.run(
            ["git", "worktree", "remove", str(coordinator.integration_worktree)],
            cwd=self.repo,
            check=True,
        )
        coordinator.ensure_integration_worktree()
        self.assertTrue(coordinator.integration_worktree.is_dir())
        self.assertEqual(
            coordinator.expected_head,
            coordinator.git("rev-parse", "HEAD", cwd=coordinator.integration_worktree).strip(),
        )

    def test_pending_integration_is_recovered(self):
        coordinator = self.coordinator()
        coordinator.acquire_lock()
        coordinator.preflight()
        coordinator.init_or_resume()
        worker = coordinator.prepare_worker(coordinator.query_frontier(1)[0])
        issue = worker.worktree / worker.issue_path
        issue.write_text(issue.read_text(encoding="utf-8").replace("ready-for-agent", "resolved"), encoding="utf-8")
        subprocess.run(["git", "add", "."], cwd=worker.worktree, check=True)
        subprocess.run(["git", "commit", "-m", f"feat(test): done (stu-parity {worker.issue_id})"], cwd=worker.worktree, check=True)
        coordinator.validate_worker(worker)
        worker.state = "integration_pending"
        commits = coordinator.git("rev-list", "--reverse", f"{worker.base_commit}..{worker.head_after}").splitlines()
        coordinator.git("cherry-pick", *commits, cwd=coordinator.integration_worktree)
        pending_head = coordinator.git("rev-parse", "HEAD", cwd=coordinator.integration_worktree).strip()
        coordinator.pending_integration_head = pending_head
        coordinator.pending_integration_issue = worker.issue_id
        coordinator.write_worker(worker)
        coordinator.write_run("verifying_integration")
        coordinator.ensure_integration_worktree()
        self.assertEqual(pending_head, coordinator.expected_head)
        self.assertEqual("integrated", worker.state)
        self.assertIsNone(coordinator.pending_integration_head)

    def test_atomic_json_replaces_complete_document(self):
        path = self.repo / "state.json"
        parallel.atomic_json(path, {"state": "one"})
        parallel.atomic_json(path, {"state": "two", "count": 2})
        self.assertEqual({"state": "two", "count": 2}, json.loads(path.read_text(encoding="utf-8")))


if __name__ == "__main__":
    unittest.main()
