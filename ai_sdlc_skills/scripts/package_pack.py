"""Build deterministic, self-contained skill distributions; never install them."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path
from urllib.parse import unquote, urlsplit

VERSION = "2.0.0"
ROOT = Path(__file__).resolve().parents[1]
STAGES = ("plan", "design", "build", "test", "deploy", "maintain")
LINK = re.compile(r"!?\[[^\]\n]*\]\(([^)\n]+)\)")
EXCLUDED = {"__pycache__", ".venv", ".cache", ".pytest_cache"}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def json_bytes(value) -> bytes:
    return (json.dumps(value, indent=2, sort_keys=True) + "\n").encode("utf-8")


def member_path(name: str) -> str:
    if not isinstance(name, str) or not name or "\\" in name or ":" in name or any(part in ("", ".", "..") for part in name.split("/")):
        raise ValueError(f"Unsafe distribution member path: {name!r}")
    return name


def contained(path: Path, root: Path) -> Path:
    # Check lexical roots as well as children: resolving a junction root first
    # would silently redefine the approved output boundary to its target.
    for current in (root.absolute(), *root.absolute().parents):
        if current.is_symlink() or (hasattr(current, "is_junction") and current.is_junction()):
            raise ValueError(f"Symlinks/junctions are not distributable roots: {current}")
    resolved = path.resolve()
    if not resolved.is_relative_to(root.resolve()):
        raise ValueError(f"Path escapes root: {path}")
    relative = path.absolute().relative_to(root.absolute())
    current = root
    for component in relative.parts:
        current = current / component
        if current.is_symlink() or (hasattr(current, "is_junction") and current.is_junction()):
            raise ValueError(f"Symlinks/junctions are not distributable: {path}")
    return resolved


def source_files(root: Path = ROOT) -> list[Path]:
    files = []
    for directory in (*STAGES, "shared", "scripts", "evaluations"):
        base = root / directory
        if not base.is_dir():
            raise ValueError(f"Missing source directory: {directory}")
        for path in base.rglob("*"):
            if any(part in EXCLUDED for part in path.relative_to(root).parts):
                continue
            if path.is_file() and path.suffix not in (".pyc", ".pyo"):
                contained(path, root)
                files.append(path)
    for name in ("README.md", "requirements-dev.txt"):
        if (root / name).is_file():
            contained(root / name, root)
            files.append(root / name)
    return sorted(set(files), key=lambda path: path.relative_to(root).as_posix())


def mapped_path(source: Path, stage: str) -> Path | None:
    parts = source.parts
    if parts[0] == stage:
        return Path(*parts[1:])
    if parts[0] in ("shared", "scripts", "evaluations") or source.name == "requirements-dev.txt":
        return source
    return None


def parse_target(raw: str) -> tuple[str, str]:
    raw = raw.strip()
    if raw.startswith("<"):
        end = raw.find(">")
        if end < 0:
            raise ValueError(f"Malformed link: {raw}")
        return raw[1:end], raw[end + 1:]
    parts = raw.split(maxsplit=1)
    return parts[0], (" " + parts[1]) if len(parts) == 2 else ""


def rewrite_markdown(data: bytes, source: Path, destination: Path, mapping: dict, root: Path) -> bytes:
    def replace(match):
        raw, title = parse_target(match.group(1))
        parsed = urlsplit(raw)
        if parsed.scheme or parsed.netloc or not parsed.path:
            return match.group(0)
        path = contained(root / source.parent / unquote(parsed.path), root)
        relative = path.relative_to(root)
        if relative not in mapping:
            raise ValueError(f"{source}: dependency omitted from standalone bundle: {relative}")
        import posixpath
        target = posixpath.relpath(mapping[relative].as_posix(), destination.parent.as_posix())
        target += ("?" + parsed.query) if parsed.query else ""
        target += ("#" + parsed.fragment) if parsed.fragment else ""
        return match.group(0).replace(match.group(1), target + title, 1)
    return LINK.sub(replace, data.decode("utf-8")).encode("utf-8")


def make_bundle(stage: str, files: list[Path], root: Path = ROOT) -> dict[str, bytes]:
    mapping = {}
    for path in files:
        source = path.relative_to(root)
        target = mapped_path(source, stage)
        if target is not None:
            mapping[source] = target
    payload, inventory = {}, []
    for source, target in sorted(mapping.items(), key=lambda item: item[1].as_posix()):
        raw = (root / source).read_bytes()
        data = rewrite_markdown(raw, source, target, mapping, root) if source.suffix == ".md" else raw
        name = target.as_posix()
        payload[name] = data
        inventory.append({"path": name, "sha256": digest(data), "source": source.as_posix(), "source_sha256": digest(raw)})
    payload["distribution-manifest.json"] = json_bytes({
        "schema_version": VERSION, "skill": stage, "version": VERSION,
        "source_inventory_sha256": digest(json_bytes(inventory)), "files": inventory,
        "notice": "Generated from authoritative source. Do not edit generated copies. Runtime authority is separate.",
    })
    validate_bundle(payload, stage)
    return payload


def validate_bundle(payload: dict[str, bytes], stage: str) -> dict:
    for name in payload:
        member_path(name)
    entrypoints = sorted(name for name in payload if Path(name).name.upper() == "SKILL.MD")
    if entrypoints != ["SKILL.md"]:
        raise ValueError(f"{stage}: expected exactly one SKILL.md: {entrypoints}")
    import yaml
    text = payload["SKILL.md"].decode("utf-8")
    front = re.match(r"\A---\r?\n(.*?)\r?\n---(?:\r?\n|$)", text, re.S)
    if not front:
        raise ValueError(f"{stage}: frontmatter missing")
    metadata = yaml.safe_load(front[1])
    if metadata.get("name") != stage or metadata.get("metadata", {}).get("version") != VERSION:
        raise ValueError(f"{stage}: name/version mismatch")
    import posixpath
    links = 0
    for name, data in payload.items():
        if not name.endswith(".md"):
            continue
        for match in LINK.finditer(data.decode("utf-8")):
            raw, _ = parse_target(match.group(1))
            parsed = urlsplit(raw)
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            target = posixpath.normpath(posixpath.join(posixpath.dirname(name), unquote(parsed.path)))
            if target.startswith("../") or target.startswith("/"):
                raise ValueError(f"{name}: escaping local link {target}")
            if target not in payload and not any(key.startswith(target.rstrip("/") + "/") for key in payload):
                raise ValueError(f"{name}: missing local link {target}")
            links += 1
    manifest = json.loads(payload["distribution-manifest.json"])
    entries = manifest["files"]
    if len({item["path"] for item in entries}) != len(entries):
        raise ValueError("Duplicate distribution paths")
    if {item["path"] for item in entries} != set(payload) - {"distribution-manifest.json"}:
        raise ValueError("Distribution inventory does not cover exact payload")
    if any(digest(payload[item["path"]]) != item["sha256"] for item in entries):
        raise ValueError("Distribution content digest mismatch")
    if digest(json_bytes(entries)) != manifest["source_inventory_sha256"]:
        raise ValueError("Distribution inventory digest mismatch")
    return {"skill": stage, "files": len(payload), "local_links": links, "result": "PASS"}


def zip_payload(payload: dict[str, bytes], prefix: str = "") -> bytes:
    import io
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(payload.items()):
            member_path(name)
            archive_name = member_path(prefix + name)
            info = zipfile.ZipInfo(archive_name, (1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    return buffer.getvalue()


def write_payload(destination: Path, payload: dict[str, bytes], approved_output: Path | None = None):
    contained(destination, approved_output or destination)
    destination.mkdir(parents=True, exist_ok=True)
    existing = {p.relative_to(destination).as_posix() for p in destination.rglob("*") if p.is_file()}
    stale = existing - payload.keys()
    if stale:
        raise ValueError(f"Output contains stale files; choose a clean output directory: {sorted(stale)}")
    for name, data in payload.items():
        path = destination / name
        contained(path, destination)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)


def build(output: Path, root: Path = ROOT) -> dict:
    output = output.absolute()
    contained(output, output)
    if output == root.resolve() or output.is_relative_to(root.resolve()):
        raise ValueError("Distribution output must be outside the source skill pack")
    files = source_files(root)
    output.mkdir(parents=True, exist_ok=True)
    reports, archives = [], {}
    for stage in STAGES:
        payload = make_bundle(stage, files, root)
        write_payload(output / "portable" / stage, payload, output)
        data = zip_payload(payload, stage + "/")
        archive_path = output / f"{stage}.zip"
        contained(archive_path, output)
        archive_path.write_bytes(data)
        archives[f"{stage}.zip"] = digest(data)
        reports.append(validate_bundle(payload, stage))
    source = {p.relative_to(root).as_posix(): p.read_bytes() for p in files}
    source_manifest = {name: digest(data) for name, data in sorted(source.items())}
    source["source-manifest.json"] = json_bytes({"version": VERSION, "files": source_manifest})
    archive = zip_payload(source, "skills/")
    contained(output / "source-pack.zip", output)
    (output / "source-pack.zip").write_bytes(archive)
    archives["source-pack.zip"] = digest(archive)
    report = {"version": VERSION, "source_manifest_sha256": digest(json_bytes(source_manifest)),
              "archives": archives, "bundles": reports, "result": "PASS"}
    contained(output / "release-manifest.json", output)
    (output / "release-manifest.json").write_bytes(json_bytes(report))
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT.parent / ".dist" / VERSION)
    parser.add_argument("--verify", type=Path, help="Verify an extracted standalone bundle without changing it")
    args = parser.parse_args()
    try:
        if args.verify:
            base = args.verify.absolute()
            contained(base, base)
            files = sorted(p for p in base.rglob("*") if p.is_file())
            for path in files:
                contained(path, base)
            payload = {p.relative_to(base).as_posix(): p.read_bytes() for p in files}
            stage = json.loads(payload["distribution-manifest.json"])["skill"]
            report = validate_bundle(payload, stage)
        else:
            report = build(args.output)
        print(json.dumps(report, indent=2))
        return 0
    except (ValueError, OSError, KeyError, TypeError) as exc:
        print(json.dumps({"result": "ERROR", "error": str(exc)}))
        return 2


if __name__ == "__main__":
    sys.exit(main())
