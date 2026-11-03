#!/usr/bin/env python3
"""Run dependency-ready STU parity tickets in isolated worktrees."""

from __future__ import annotations

import argparse
import fcntl
import json
import os
import re
import shlex
import signal
import subprocess
import sys
import time
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

TRANSIENT_PATTERN = re.compile(
    r"api error|server_error|overloaded|rate.?limit|ECONNREFUSED|"
    r"no such host|timed? ?out|HTTP 5[0-9][0-9]",
    re.IGNORECASE,
)
ACTIVE_STATES = {"prepared", "running", "retry_wait", "integration_pending"}
TERMINAL_FAILURE_STATES = {"worker_failed", "conflict", "verification_failed"}
SPLIT_PARENT_ISSUES = {
    "col-D2a",
    "sc-WP-COMBAT-1",
    "sc-WP-ENG-2",
    "sc-WP-UI-3a",
    "tmw-FA1b",
    "tmw-K1b",
    "tmw-K5",
    "tmw-K8b",
    "tmw-T1",
    "tmw-T2",
}
STATUS_PATTERN = re.compile(r"^\*\*Status:\*\*\s+(\S+)\s*$", re.MULTILINE)
ACCEPTANCE_HEADING_PATTERN = re.compile(r"^##\s+Akzeptanzkriterien\s*$", re.MULTILINE)
CHECKBOX_PATTERN = re.compile(r"^\s*-\s+\[([ xX])\]\s+(.+?)\s*$", re.MULTILINE)
SECTION_HEADING_PATTERN = re.compile(r"^##\s+.+$", re.MULTILINE)


class CoordinatorError(Exception):
    pass


def validate_terminal_issue(issue_id: str, issue_path: Path, text: str) -> None:
    status_match = STATUS_PATTERN.search(text)
    if not status_match or status_match.group(1) not in {"resolved", "needs-info"}:
        raise CoordinatorError(f"{issue_id} did not reach resolved or needs-info")
    if status_match.group(1) == "needs-info" or issue_id in SPLIT_PARENT_ISSUES:
        return

    headings = list(ACCEPTANCE_HEADING_PATTERN.finditer(text))
    if not headings:
        raise CoordinatorError(
            f"{issue_id} resolved without an acceptance section in {issue_path}"
        )
    if len(headings) > 1:
        raise CoordinatorError(
            f"{issue_id} has multiple acceptance sections in {issue_path}"
        )

    start = headings[0].end()
    next_heading = SECTION_HEADING_PATTERN.search(text, start)
    section = text[start : next_heading.start() if next_heading else len(text)]
    criteria = list(CHECKBOX_PATTERN.finditer(section))
    if not criteria:
        raise CoordinatorError(
            f"{issue_id} acceptance section has no criteria in {issue_path}"
        )
    unchecked = next((match for match in criteria if match.group(1) == " "), None)
    if unchecked:
        raise CoordinatorError(
            f"{issue_id} has unchecked acceptance criterion in {issue_path}: "
            f"{unchecked.group(2)}"
        )


@dataclass
class Worker:
    issue_id: str
    issue_path: str
    size: str
    branch: str
    worktree: Path
    manifest_path: Path
    base_commit: str
    state: str = "prepared"
    attempt: int = 0
    pid: int | None = None
    head_after: str | None = None
    last_error: str | None = None

    @classmethod
    def from_json(cls, path: Path) -> "Worker":
        data = json.loads(path.read_text(encoding="utf-8"))
        return cls(
            issue_id=data["issueId"],
            issue_path=data["issuePath"],
            size=data["size"],
            branch=data["branch"],
            worktree=Path(data["worktree"]),
            manifest_path=path,
            base_commit=data["baseCommit"],
            state=data["state"],
            attempt=data.get("attempt", 0),
            pid=data.get("pid"),
            head_after=data.get("headAfter"),
            last_error=data.get("lastError"),
        )

    def to_json(self, run_id: str) -> dict[str, Any]:
        return {
            "schemaVersion": 1,
            "runId": run_id,
            "issueId": self.issue_id,
            "issuePath": self.issue_path,
            "size": self.size,
            "branch": self.branch,
            "worktree": str(self.worktree),
            "baseCommit": self.base_commit,
            "state": self.state,
            "attempt": self.attempt,
            "pid": self.pid,
            "headAfter": self.head_after,
            "lastError": self.last_error,
            "updatedAt": timestamp(),
        }


class Coordinator:
    def __init__(self, args: argparse.Namespace) -> None:
        self.args = args
        self.repo = Path(args.repo).resolve()
        self.stu_dir = self.repo / ".scratch" / "stu-parity"
        self.selector = self.stu_dir / "select-next-issue.py"
        self.prompt_path = self.stu_dir / "PROMPT.md"
        self.issues_dir = self.stu_dir / "issues"
        self.branch = self.git("branch", "--show-current").strip()
        self.git_common = Path(self.git("rev-parse", "--git-common-dir").strip())
        if not self.git_common.is_absolute():
            self.git_common = (self.repo / self.git_common).resolve()
        self.root = self.git_common / "ralph-stu-parity"
        self.run_id = args.resume or datetime.now(UTC).strftime("%Y%m%d-%H%M%S") + "-" + uuid.uuid4().hex[:6]
        self.run_dir = self.root / "runs" / self.run_id
        self.worker_dir = self.run_dir / "workers"
        self.log_dir = self.run_dir / "logs"
        self.worktree_root = self.root / "worktrees" / self.run_id
        self.integration_worktree = self.worktree_root / "integration"
        self.integration_branch = f"ralph/integration/{self.run_id}"
        self.run_manifest = self.run_dir / "run.json"
        self.lock_file = self.root / f"{self.branch}.lock"
        self.lock_handle: Any = None
        self.expected_head = ""
        self.pending_integration_head: str | None = None
        self.pending_integration_issue: str | None = None
        self.initial_head = ""
        self.admitted = 0
        self.workers: dict[str, Worker] = {}
        self.processes: dict[str, subprocess.Popen[bytes]] = {}
        self.interrupted = False

    def git(self, *args: str, cwd: Path | None = None, check: bool = True) -> str:
        command = [os.environ.get("RALPH_GIT", "git"), *args]
        result = subprocess.run(
            command,
            cwd=cwd or self.repo,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        if check and result.returncode:
            raise CoordinatorError(
                f"{' '.join(shlex.quote(part) for part in command)} failed: {result.stderr.strip()}"
            )
        return result.stdout

    def acquire_lock(self) -> None:
        self.root.mkdir(parents=True, exist_ok=True)
        self.lock_handle = self.lock_file.open("a+", encoding="utf-8")
        try:
            fcntl.flock(self.lock_handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise CoordinatorError(f"another coordinator holds {self.lock_file}") from error

    def preflight(self) -> None:
        if self.branch == "main":
            raise CoordinatorError("never run the parity coordinator from main")
        if self.branch != self.args.integration_branch and not self.args.resume:
            raise CoordinatorError(
                f"run from branch {self.args.integration_branch!r}, current branch is {self.branch!r}"
            )
        status = self.git("status", "--porcelain", "--untracked-files=all")
        if status:
            raise CoordinatorError(
                "working tree is not clean; commit the prepared backlog and runner changes first:\n"
                + status.rstrip()
            )
        git_dir = Path(self.git("rev-parse", "--git-dir").strip())
        if not git_dir.is_absolute():
            git_dir = (self.repo / git_dir).resolve()
        operations = ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply"]
        active = [name for name in operations if (git_dir / name).exists()]
        if active:
            raise CoordinatorError("Git operation already active: " + ", ".join(active))
        for path in (self.selector, self.prompt_path):
            relative = path.relative_to(self.repo)
            self.git("cat-file", "-e", f"HEAD:{relative}")
        self.initial_head = self.git("rev-parse", "HEAD").strip()
        self.expected_head = self.initial_head

    def init_or_resume(self) -> None:
        self.worker_dir.mkdir(parents=True, exist_ok=True)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.worktree_root.mkdir(parents=True, exist_ok=True)
        if self.args.resume:
            if not self.run_manifest.exists():
                raise CoordinatorError(f"run {self.run_id!r} does not exist")
            data = json.loads(self.run_manifest.read_text(encoding="utf-8"))
            if data["integrationBranch"] != self.args.integration_branch:
                raise CoordinatorError("resume target does not match run manifest")
            self.initial_head = data["initialHead"]
            self.expected_head = data["expectedHead"]
            self.pending_integration_head = data.get("pendingIntegrationHead")
            self.pending_integration_issue = data.get("pendingIntegrationIssue")
            self.admitted = data.get("admitted", 0)
            for path in sorted(self.worker_dir.glob("*.json")):
                worker = Worker.from_json(path)
                self.workers[worker.issue_id] = worker
            self.reconcile()
        else:
            self.write_run("running")
        self.ensure_integration_worktree()

    def write_run(self, state: str, error: str | None = None) -> None:
        atomic_json(
            self.run_manifest,
            {
                "schemaVersion": 1,
                "runId": self.run_id,
                "repoRoot": str(self.repo),
                "integrationBranch": self.args.integration_branch,
                "integrationBranchRef": f"refs/heads/{self.args.integration_branch}",
                "integrationWorkerBranch": self.integration_branch,
                "initialHead": self.initial_head,
                "expectedHead": self.expected_head,
                "pendingIntegrationHead": self.pending_integration_head,
                "pendingIntegrationIssue": self.pending_integration_issue,
                "parallelism": self.args.jobs,
                "maxTickets": self.args.max_tickets,
                "admitted": self.admitted,
                "primaryModel": self.args.model,
                "smallModel": self.args.small_model,
                "state": state,
                "error": error,
                "updatedAt": timestamp(),
            },
        )

    def write_worker(self, worker: Worker) -> None:
        atomic_json(worker.manifest_path, worker.to_json(self.run_id))

    def reconcile(self) -> None:
        for worker in self.workers.values():
            if worker.state != "running":
                continue
            worker.pid = None
            try:
                self.validate_worker(worker)
                worker.state = "integration_pending"
                worker.last_error = None
            except CoordinatorError as error:
                status = self.git("status", "--porcelain", cwd=worker.worktree, check=False)
                head = self.git("rev-parse", "HEAD", cwd=worker.worktree, check=False).strip()
                if not status and head == worker.base_commit:
                    worker.state = "prepared"
                    worker.last_error = None
                else:
                    worker.state = "worker_failed"
                    worker.last_error = f"interrupted worker requires inspection: {error}"
            self.write_worker(worker)

    def ensure_integration_worktree(self) -> None:
        branch_ref = f"refs/heads/{self.integration_branch}"
        if self.integration_worktree.exists():
            branch = self.git("branch", "--show-current", cwd=self.integration_worktree).strip()
            if branch != self.integration_branch:
                raise CoordinatorError("integration worktree ownership mismatch")
            if self.git("status", "--porcelain", cwd=self.integration_worktree):
                raise CoordinatorError("integration worktree is dirty")
            head = self.git("rev-parse", "HEAD", cwd=self.integration_worktree).strip()
            if head != self.expected_head:
                if head != self.pending_integration_head:
                    raise CoordinatorError(
                        "integration worktree branch advanced unexpectedly; inspect it before resuming"
                    )
                self.recover_pending_integration(head)
            return
        branch_exists = bool(
            self.git("show-ref", "--verify", branch_ref, check=False).strip()
        )
        if branch_exists:
            branch_head = self.git("rev-parse", branch_ref).strip()
            if branch_head != self.expected_head and branch_head != self.pending_integration_head:
                raise CoordinatorError(
                    "integration branch advanced unexpectedly; inspect it before resuming"
                )
            self.git("worktree", "add", str(self.integration_worktree), self.integration_branch)
            if branch_head == self.pending_integration_head:
                self.recover_pending_integration(branch_head)
        else:
            self.git("worktree", "add", "-b", self.integration_branch, str(self.integration_worktree), self.expected_head)

    def recover_pending_integration(self, head: str) -> None:
        issue_id = self.pending_integration_issue
        if not issue_id or issue_id not in self.workers:
            raise CoordinatorError("pending integration has no matching worker manifest")
        worker = self.workers[issue_id]
        try:
            self.quick_verify(worker.base_commit)
        except CoordinatorError as error:
            worker.state = "verification_failed"
            worker.last_error = str(error)
            self.write_worker(worker)
            self.write_run("verification_failed", str(error))
            raise
        self.expected_head = head
        self.pending_integration_head = None
        self.pending_integration_issue = None
        worker.state = "integrated"
        worker.last_error = None
        self.write_worker(worker)
        self.write_run("running")

    def query_frontier(self, limit: int) -> list[dict[str, Any]]:
        command = [
            sys.executable,
            "-I",
            str(self.selector),
            "--issues-dir",
            str(self.issues_dir),
            "--mode",
            "frontier",
            "--format",
            "json",
            "--limit",
            str(limit),
        ]
        for issue_id, worker in self.workers.items():
            if worker.state in ACTIVE_STATES or worker.state in TERMINAL_FAILURE_STATES:
                command.extend(["--exclude", issue_id])
        result = subprocess.run(command, cwd=self.repo, text=True, capture_output=True)
        if result.returncode == 2:
            payload = json.loads(result.stdout)
        elif result.returncode:
            raise CoordinatorError(result.stderr.strip() or "frontier selector failed")
        else:
            payload = json.loads(result.stdout)
        claimed = {item["id"] for item in payload.get("claimed", [])}
        owned = set(self.workers)
        orphaned = sorted(claimed - owned)
        if orphaned:
            raise CoordinatorError("claimed issues lack a Ralph manifest: " + ", ".join(orphaned))
        frontier = payload.get("frontier", [])
        for issue in frontier:
            issue["path"] = str(Path(issue["path"]).resolve().relative_to(self.repo.resolve()))
        return frontier

    def prepare_worker(self, issue: dict[str, Any]) -> Worker:
        issue_id = issue["id"]
        branch = f"ralph/{self.branch}/{self.run_id}/{issue_id}"
        worktree = self.worktree_root / issue_id
        manifest = self.worker_dir / f"{safe_name(issue_id)}.json"
        if worktree.exists() or self.git("show-ref", "--verify", "--quiet", f"refs/heads/{branch}", check=False):
            raise CoordinatorError(f"worker branch/path collision for {issue_id}")
        self.git("worktree", "add", "-b", branch, str(worktree), self.expected_head)
        worker = Worker(
            issue_id=issue_id,
            issue_path=issue["path"],
            size=issue["size"],
            branch=branch,
            worktree=worktree,
            manifest_path=manifest,
            base_commit=self.expected_head,
        )
        self.workers[issue_id] = worker
        self.admitted += 1
        self.write_worker(worker)
        self.write_run("running")
        return worker

    def build_prompt(self, worker: Worker) -> str:
        base = self.prompt_path.read_text(encoding="utf-8")
        result_path = self.run_dir / "results" / f"{safe_name(worker.issue_id)}.json"
        result_path.parent.mkdir(parents=True, exist_ok=True)
        return f"""{base}

## Coordinator assignment

- Issue: `{worker.issue_path}` (`{worker.issue_id}`)
- Branch: `{worker.branch}`
- Base commit: `{worker.base_commit}`
- Worktree: `{worker.worktree}`
- Write the final machine-readable result to `{result_path}`.

Work exclusively on this issue. Do not select another issue, switch branches, manage worktrees,
push, merge, or modify coordinator manifests. The coordinator owns integration.
"""

    def launch(self, worker: Worker) -> None:
        worker.attempt += 1
        worker.state = "running"
        model = self.args.small_model if worker.size == "S" else self.args.model
        log = self.log_dir / safe_name(worker.issue_id) / f"attempt-{worker.attempt:03d}.jsonl"
        log.parent.mkdir(parents=True, exist_ok=True)
        stream = log.open("wb")
        command = [
            os.environ.get("RALPH_CLAUDE", "claude"),
            "-p",
            self.build_prompt(worker),
            "--model",
            model,
            "--dangerously-skip-permissions",
            "--output-format",
            "stream-json",
            "--verbose",
        ]
        process = subprocess.Popen(
            command,
            cwd=worker.worktree,
            stdout=stream,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )
        stream.close()
        worker.pid = process.pid
        self.processes[worker.issue_id] = process
        self.write_worker(worker)
        print(f"started {worker.issue_id} (pid {process.pid}, model {model})")

    def collect_finished(self) -> list[Worker]:
        finished: list[Worker] = []
        for issue_id, process in list(self.processes.items()):
            return_code = process.poll()
            if return_code is None:
                continue
            worker = self.workers[issue_id]
            worker.pid = None
            del self.processes[issue_id]
            log = self.log_dir / safe_name(issue_id) / f"attempt-{worker.attempt:03d}.jsonl"
            if return_code and worker.attempt <= self.args.max_retries and is_transient(log):
                try:
                    self.validate_worker(worker)
                    worker.state = "integration_pending"
                    worker.last_error = None
                    self.write_worker(worker)
                    finished.append(worker)
                    continue
                except CoordinatorError:
                    pass
                status = self.git("status", "--porcelain", cwd=worker.worktree)
                head = self.git("rev-parse", "HEAD", cwd=worker.worktree).strip()
                if status or head != worker.base_commit:
                    worker.state = "worker_failed"
                    worker.last_error = "transient exit left partial work; preserved for inspection"
                    self.write_worker(worker)
                    finished.append(worker)
                    continue
                worker.state = "retry_wait"
                worker.last_error = f"transient worker exit {return_code}"
                self.write_worker(worker)
                time.sleep(min(worker.attempt * 5, 30))
                self.launch(worker)
                continue
            if return_code:
                worker.state = "worker_failed"
                worker.last_error = f"worker exited {return_code}; see {log}"
            else:
                try:
                    self.validate_worker(worker)
                    worker.state = "integration_pending"
                except CoordinatorError as error:
                    worker.state = "worker_failed"
                    worker.last_error = str(error)
            self.write_worker(worker)
            finished.append(worker)
        return finished

    def validate_worker(self, worker: Worker) -> None:
        status = self.git("status", "--porcelain", cwd=worker.worktree)
        if status:
            raise CoordinatorError(f"{worker.issue_id} left a dirty worktree")
        head = self.git("rev-parse", "HEAD", cwd=worker.worktree).strip()
        if head == worker.base_commit:
            raise CoordinatorError(f"{worker.issue_id} produced no commit")
        self.git("merge-base", "--is-ancestor", worker.base_commit, head)
        issue_relative = Path(worker.issue_path)
        if issue_relative.is_absolute():
            issue_relative = issue_relative.relative_to(self.repo)
        issue_file = worker.worktree / issue_relative
        text = issue_file.read_text(encoding="utf-8")
        validate_terminal_issue(worker.issue_id, issue_file, text)
        changed = self.git("diff", "--name-only", f"{worker.base_commit}..{head}", cwd=worker.worktree).splitlines()
        issue_prefix = ".scratch/stu-parity/issues/"
        foreign = [path for path in changed if path.startswith(issue_prefix) and path != str(issue_relative)]
        if foreign:
            raise CoordinatorError(f"{worker.issue_id} modified other issue files: {', '.join(foreign)}")
        worker.head_after = head

    def integrate_pending(self) -> bool:
        pending = sorted(
            (worker for worker in self.workers.values() if worker.state == "integration_pending"),
            key=lambda item: item.issue_id.encode(),
        )
        for worker in pending:
            current = self.git("rev-parse", f"refs/heads/{self.args.integration_branch}").strip()
            if current != self.expected_head:
                raise CoordinatorError("integration branch moved outside this run")
            commits = self.git("rev-list", "--reverse", f"{worker.base_commit}..{worker.head_after}").splitlines()
            if not commits:
                raise CoordinatorError(f"no commits to integrate for {worker.issue_id}")
            log = self.log_dir / "integration" / f"{safe_name(worker.issue_id)}.log"
            log.parent.mkdir(parents=True, exist_ok=True)
            with log.open("w", encoding="utf-8") as stream:
                result = subprocess.run(
                    [os.environ.get("RALPH_GIT", "git"), "cherry-pick", *commits],
                    cwd=self.integration_worktree,
                    text=True,
                    stdout=stream,
                    stderr=subprocess.STDOUT,
                )
            if result.returncode:
                self.git("cherry-pick", "--abort", cwd=self.integration_worktree, check=False)
                worker.state = "conflict"
                worker.last_error = f"integration conflict; see {log}"
                self.write_worker(worker)
                self.write_run("conflict", worker.last_error)
                return False
            new_head = self.git("rev-parse", "HEAD", cwd=self.integration_worktree).strip()
            self.pending_integration_head = new_head
            self.pending_integration_issue = worker.issue_id
            self.write_run("verifying_integration")
            try:
                self.quick_verify(worker.base_commit)
            except CoordinatorError as error:
                worker.state = "verification_failed"
                worker.last_error = str(error)
                self.write_worker(worker)
                self.write_run("verification_failed", str(error))
                raise CoordinatorError(
                    "integration verification failed; integration worktree preserved for inspection"
                ) from error
            self.expected_head = new_head
            self.pending_integration_head = None
            self.pending_integration_issue = None
            worker.state = "integrated"
            self.write_worker(worker)
            self.write_run("running")
            print(f"integrated {worker.issue_id} at {new_head[:12]}")
        return True

    def quick_verify(self, base_commit: str) -> None:
        result = subprocess.run(
            [sys.executable, "-I", str(self.integration_worktree / ".scratch/stu-parity/test_select_next_issue.py")],
            cwd=self.integration_worktree,
        )
        if result.returncode:
            raise CoordinatorError("selector tests failed after integration")
        result = subprocess.run(
            [
                sys.executable,
                "-I",
                str(self.integration_worktree / ".scratch/stu-parity/select-next-issue.py"),
                "--issues-dir",
                str(self.integration_worktree / ".scratch/stu-parity/issues"),
                "--mode",
                "frontier",
                "--format",
                "json",
            ],
            cwd=self.integration_worktree,
            stdout=subprocess.DEVNULL,
        )
        if result.returncode not in {0, 2}:
            raise CoordinatorError("tracker validation failed after integration")
        if self.args.skip_batch_verify:
            return
        command = [
            "npx",
            "nx",
            "affected",
            "-t",
            "lint",
            "typecheck",
            "test",
            f"--base={base_commit}",
            "--head=HEAD",
        ]
        result = subprocess.run(command, cwd=self.integration_worktree)
        if result.returncode:
            raise CoordinatorError("affected checks failed before integration")

    def batch_verify(self) -> None:
        if self.args.skip_batch_verify or self.expected_head == self.initial_head:
            return
        log = self.log_dir / "batch-verification.log"
        commands = [
            ["npx", "nx", "affected", "-t", "lint", "typecheck", "test", f"--base={self.initial_head}", "--head=HEAD"],
            ["npx", "nx", "run-many", "--targets=build"],
        ]
        with log.open("w", encoding="utf-8") as stream:
            for command in commands:
                stream.write(f"$ {shlex.join(command)}\n")
                stream.flush()
                result = subprocess.run(command, cwd=self.integration_worktree, stdout=stream, stderr=subprocess.STDOUT)
                if result.returncode:
                    raise CoordinatorError(f"batch verification failed; see {log}")

    def run(self) -> int:
        self.acquire_lock()
        self.preflight()
        self.init_or_resume()
        install_signal_handlers(self)
        print(f"Ralph run {self.run_id}; resume with --resume {self.run_id}")
        try:
            while not self.interrupted:
                if not self.integrate_pending():
                    return 6
                failures = [worker for worker in self.workers.values() if worker.state in TERMINAL_FAILURE_STATES]
                if failures:
                    details = "; ".join(f"{item.issue_id}: {item.last_error}" for item in failures)
                    raise CoordinatorError(details)
                capacity = self.args.jobs - len(self.processes)
                remaining = self.args.max_tickets - self.admitted
                if capacity > 0:
                    prepared = sorted(
                        (worker for worker in self.workers.values() if worker.state == "prepared"),
                        key=lambda item: item.issue_id.encode(),
                    )
                    for worker in prepared[:capacity]:
                        self.launch(worker)
                    capacity = self.args.jobs - len(self.processes)
                if capacity > 0 and remaining > 0:
                    for issue in self.query_frontier(min(capacity, remaining)):
                        self.launch(self.prepare_worker(issue))
                if not self.processes:
                    if remaining <= 0 or not self.query_frontier(1):
                        break
                while self.processes and not self.interrupted:
                    if self.collect_finished():
                        break
                    time.sleep(1)
            if self.interrupted:
                self.write_run("interrupted")
                return 130
            if not self.integrate_pending():
                return 6
            self.batch_verify()
            self.write_run("completed")
            print(
                f"Ralph run {self.run_id} completed on {self.integration_branch}; "
                f"integrated {sum(w.state == 'integrated' for w in self.workers.values())} tickets"
            )
            print(
                f"After review, fast-forward {self.args.integration_branch} with: "
                f"git merge --ff-only {self.integration_branch}"
            )
            return 0
        except CoordinatorError as error:
            self.write_run("failed", str(error))
            print(f"parallel Ralph failed: {error}", file=sys.stderr)
            return 5
        finally:
            self.stop_children()
            if self.lock_handle is not None:
                self.lock_handle.close()
                self.lock_handle = None

    def stop_children(self) -> None:
        for process in self.processes.values():
            if process.poll() is None:
                try:
                    os.killpg(process.pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass
        deadline = time.monotonic() + 5
        for process in self.processes.values():
            timeout = max(0, deadline - time.monotonic())
            try:
                process.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
        for issue_id, process in self.processes.items():
            worker = self.workers[issue_id]
            worker.pid = None
            if worker.state == "running":
                try:
                    self.validate_worker(worker)
                    worker.state = "integration_pending"
                    worker.last_error = None
                except CoordinatorError as error:
                    status = self.git("status", "--porcelain", cwd=worker.worktree, check=False)
                    head = self.git("rev-parse", "HEAD", cwd=worker.worktree, check=False).strip()
                    if not status and head == worker.base_commit:
                        worker.state = "prepared"
                        worker.last_error = None
                    else:
                        worker.state = "worker_failed"
                        worker.last_error = f"interrupted worker requires inspection: {error}"
            self.write_worker(worker)


def timestamp() -> str:
    return datetime.now(UTC).isoformat()


def safe_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]", "_", value)


def atomic_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def is_transient(log: Path) -> bool:
    try:
        return bool(TRANSIENT_PATTERN.search(log.read_text(encoding="utf-8", errors="replace")))
    except OSError:
        return False


def install_signal_handlers(coordinator: Coordinator) -> None:
    def handle_signal(_signum: int, _frame: Any) -> None:
        coordinator.interrupted = True

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", required=True)
    parser.add_argument("--jobs", type=int, default=2)
    parser.add_argument("--max-tickets", type=int, default=20)
    parser.add_argument("--model", required=True)
    parser.add_argument("--small-model", required=True)
    parser.add_argument("--integration-branch", default="stu-parity")
    parser.add_argument("--max-retries", type=int, default=5)
    parser.add_argument("--resume")
    parser.add_argument("--skip-batch-verify", action="store_true")
    args = parser.parse_args(argv)
    if args.jobs < 1 or args.max_tickets < 1 or args.max_retries < 0:
        parser.error("jobs and max-tickets must be positive; max-retries must be non-negative")
    return args


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        return Coordinator(args).run()
    except CoordinatorError as error:
        print(f"parallel Ralph failed: {error}", file=sys.stderr)
        return 5


if __name__ == "__main__":
    raise SystemExit(main())
