#!/usr/bin/env python3
"""Select the next STU parity issue without model inference."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path

STATUSES = {
    "ready-for-agent",
    "needs-info",
    "needs-triage",
    "claimed",
    "resolved",
    "wontfix",
    "ready-for-human",
}
PRIORITIES = {"P1": 1, "P2": 2, "P3": 3}
SIZES = {"S", "M"}
FIELDS = ("Status", "Priority", "Size", "Blocked by")


class TrackerError(Exception):
    pass


@dataclass(frozen=True)
class Issue:
    issue_id: str
    path: Path
    status: str
    priority: str
    size: str
    blocker_ids: tuple[str, ...]

    def to_dict(self) -> dict[str, object]:
        return {
            "id": self.issue_id,
            "path": str(self.path),
            "status": self.status,
            "priority": self.priority,
            "size": self.size,
            "blockers": list(self.blocker_ids),
        }


def parse_fields(path: Path) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    values: dict[str, str] = {}
    for name in FIELDS:
        matches = re.findall(
            rf"^\*\*{re.escape(name)}:\*\*\s*(.*?)\s*$", text, re.MULTILINE
        )
        if len(matches) != 1:
            raise TrackerError(
                f"{path}: expected exactly one '**{name}:**' field, found {len(matches)}"
            )
        values[name] = matches[0]
    return values


def resolve_ids(paths: list[Path], blocker_ids: set[str]) -> dict[Path, str]:
    resolved: dict[Path, str] = {}
    for blocker_id in blocker_ids:
        matches = [
            path
            for path in paths
            if path.stem == blocker_id or path.stem.startswith(f"{blocker_id}-")
        ]
        if len(matches) != 1:
            detail = "none" if not matches else ", ".join(str(path) for path in matches)
            raise TrackerError(
                f"blocker ID {blocker_id!r} must match exactly one issue, matched {detail}"
            )
        path = matches[0]
        previous = resolved.get(path)
        if previous and previous != blocker_id:
            raise TrackerError(
                f"{path}: ambiguous canonical ID ({previous!r} and {blocker_id!r})"
            )
        resolved[path] = blocker_id

    unresolved_paths = [path for path in paths if path not in resolved]
    for path in unresolved_paths:
        stem_parts = path.stem.split("-")
        inferred = "-".join(stem_parts[:2])
        if len(stem_parts) > 2 and stem_parts[1] in {"AP", "WP"}:
            inferred = "-".join(stem_parts[:3])
        while any(
            other != path and other.stem.startswith(f"{inferred}-")
            for other in paths
        ):
            next_index = len(inferred.split("-"))
            if next_index >= len(stem_parts) - 1:
                raise TrackerError(f"{path}: cannot infer an unambiguous issue ID")
            inferred = "-".join(stem_parts[: next_index + 1])
        resolved[path] = inferred

    ids = list(resolved.values())
    duplicates = sorted({issue_id for issue_id in ids if ids.count(issue_id) > 1})
    if duplicates:
        raise TrackerError(f"duplicate issue IDs: {', '.join(duplicates)}")
    return resolved


def load_issues(issues_dir: Path) -> list[Issue]:
    paths = sorted(issues_dir.glob("*.md"), key=lambda path: path.name.encode())
    if not paths:
        raise TrackerError(f"{issues_dir}: no issue files found")

    raw: dict[Path, dict[str, str]] = {}
    blocker_ids: set[str] = set()
    blockers_by_path: dict[Path, tuple[str, ...]] = {}
    for path in paths:
        fields = parse_fields(path)
        status = fields["Status"]
        priority = fields["Priority"]
        size = fields["Size"]
        if status not in STATUSES:
            raise TrackerError(f"{path}: unknown status {status!r}")
        if priority not in PRIORITIES:
            raise TrackerError(f"{path}: unknown priority {priority!r}")
        if size not in SIZES:
            raise TrackerError(f"{path}: unknown size {size!r}")

        blocked_by = fields["Blocked by"]
        if blocked_by in {"", "—"}:
            blockers: tuple[str, ...] = ()
        else:
            parts = tuple(part.strip() for part in blocked_by.split(","))
            if any(not part for part in parts):
                raise TrackerError(f"{path}: malformed blocker list {blocked_by!r}")
            if len(set(parts)) != len(parts):
                raise TrackerError(f"{path}: duplicate blocker in {blocked_by!r}")
            blockers = parts
        raw[path] = fields
        blockers_by_path[path] = blockers
        blocker_ids.update(blockers)

    ids_by_path = resolve_ids(paths, blocker_ids)
    issues = [
        Issue(
            issue_id=ids_by_path[path],
            path=path,
            status=raw[path]["Status"],
            priority=raw[path]["Priority"],
            size=raw[path]["Size"],
            blocker_ids=blockers_by_path[path],
        )
        for path in paths
    ]
    ids = {issue.issue_id: issue for issue in issues}
    for issue in issues:
        if issue.issue_id in issue.blocker_ids:
            raise TrackerError(f"{issue.path}: issue blocks itself")
        for blocker_id in issue.blocker_ids:
            if blocker_id not in ids:
                raise TrackerError(
                    f"{issue.path}: blocker {blocker_id!r} was not resolved to an issue"
                )
    return issues


def _frontier_report(issues: list[Issue]) -> tuple[list[Issue], dict[str, object]]:
    by_id = {issue.issue_id: issue for issue in issues}
    blocked: list[dict[str, object]] = []
    eligible: list[Issue] = []
    for issue in issues:
        if issue.status != "ready-for-agent":
            continue
        unresolved = [
            {"id": blocker_id, "status": by_id[blocker_id].status}
            for blocker_id in issue.blocker_ids
            if by_id[blocker_id].status not in {"resolved", "wontfix"}
        ]
        if unresolved:
            blocked.append({"id": issue.issue_id, "unresolved": unresolved})
        else:
            eligible.append(issue)

    eligible.sort(key=lambda issue: (PRIORITIES[issue.priority], issue.path.name.encode()))
    return eligible, {
        "eligibleCount": len(eligible),
        "blockedReadyCount": len(blocked),
        "blocked": blocked,
        "claimed": [
            issue.to_dict() for issue in issues if issue.status == "claimed"
        ],
    }


def select_frontier(
    issues: list[Issue],
    *,
    exclude_ids: set[str] | None = None,
    limit: int | None = None,
) -> tuple[list[Issue], dict[str, object]]:
    if limit is not None and limit < 1:
        raise TrackerError("frontier limit must be positive")

    eligible, report = _frontier_report(issues)
    excluded_ids = exclude_ids or set()
    selected = [issue for issue in eligible if issue.issue_id not in excluded_ids]
    excluded = [issue for issue in eligible if issue.issue_id in excluded_ids]
    if limit is not None:
        selected = selected[:limit]

    return selected, {
        "mode": "frontier" if selected else "idle",
        **report,
        "selectedCount": len(selected),
        "excluded": [issue.to_dict() for issue in excluded],
    }


def select_issue(issues: list[Issue]) -> tuple[Issue | None, dict[str, object]]:
    claimed = [issue for issue in issues if issue.status == "claimed"]
    if len(claimed) > 1:
        raise TrackerError(
            "multiple claimed issues: " + ", ".join(issue.issue_id for issue in claimed)
        )
    if claimed:
        return claimed[0], {"mode": "resume"}

    selected, report = select_frontier(issues, limit=1)
    return (selected[0] if selected else None), {
        **report,
        "mode": "new" if selected else "idle",
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--issues-dir", type=Path, required=True)
    parser.add_argument("--format", choices=("path", "json"), default="path")
    parser.add_argument("--mode", choices=("next", "frontier"), default="next")
    parser.add_argument("--exclude", action="append", default=[])
    parser.add_argument("--limit", type=int)
    args = parser.parse_args(argv)

    try:
        issues = load_issues(args.issues_dir)
        if args.mode == "frontier":
            selected, report = select_frontier(
                issues,
                exclude_ids=set(args.exclude),
                limit=args.limit,
            )
        else:
            if args.exclude or args.limit is not None:
                raise TrackerError("--exclude and --limit require --mode frontier")
            issue, report = select_issue(issues)
            selected = [issue] if issue else []
    except (OSError, UnicodeError, TrackerError) as error:
        print(f"selector error: {error}", file=sys.stderr)
        return 3

    if not selected:
        if args.format == "json":
            payload: dict[str, object] = {"selected": None, **report}
            if args.mode == "frontier":
                payload["frontier"] = []
            print(json.dumps(payload, ensure_ascii=False))
        else:
            print(
                f"No eligible issue ({report['blockedReadyCount']} ready issues blocked).",
                file=sys.stderr,
            )
        return 2

    if args.format == "json":
        if args.mode == "frontier":
            print(
                json.dumps(
                    {"frontier": [issue.to_dict() for issue in selected], **report},
                    ensure_ascii=False,
                )
            )
        else:
            print(json.dumps({"selected": selected[0].to_dict(), **report}, ensure_ascii=False))
    elif args.mode == "frontier":
        print("\n".join(str(issue.path) for issue in selected))
    else:
        print(selected[0].path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
