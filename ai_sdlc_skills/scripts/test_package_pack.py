"""Distribution integrity regressions using independent temporary source trees."""
import copy
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

import package_pack as pack


class PackagingTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="sdlc-package-test-")
        self.base = Path(self.temporary.name)
        self.root = self.base / "source"
        for directory in (*pack.STAGES, "shared", "scripts", "evaluations"):
            (self.root / directory).mkdir(parents=True)
        (self.root / "shared" / "contract.md").write_text("# Synthetic contract\n", encoding="utf-8")
        for stage in pack.STAGES:
            (self.root / stage / "SKILL.md").write_text(
                f'---\nname: {stage}\ndescription: Synthetic {stage} fixture.\nmetadata:\n  version: "2.0.0"\n---\n'
                "Use [contract](../shared/contract.md).\n", encoding="utf-8")

    def tearDown(self):
        self.temporary.cleanup()

    def payload(self):
        return pack.make_bundle("plan", pack.source_files(self.root), self.root)

    def test_rewrites_and_contains_dependency(self):
        payload = self.payload()
        self.assertIn(b"(shared/contract.md)", payload["SKILL.md"])
        self.assertIn("shared/contract.md", payload)
        self.assertEqual(pack.validate_bundle(payload, "plan")["result"], "PASS")

    def test_deterministic_rebuild_and_archives(self):
        first = pack.build(self.base / "one", self.root)
        second = pack.build(self.base / "two", self.root)
        self.assertEqual(first, second)
        for name in first["archives"]:
            self.assertEqual((self.base / "one" / name).read_bytes(), (self.base / "two" / name).read_bytes())

    def test_tampered_file_is_rejected(self):
        payload = self.payload()
        payload["shared/contract.md"] += b"tampered"
        with self.assertRaisesRegex(ValueError, "digest mismatch"):
            pack.validate_bundle(payload, "plan")

    def test_uninventoried_file_is_rejected(self):
        payload = self.payload()
        payload["unexpected.txt"] = b"unexpected"
        with self.assertRaisesRegex(ValueError, "exact payload"):
            pack.validate_bundle(payload, "plan")

    def test_duplicate_manifest_path_is_rejected(self):
        payload = self.payload()
        manifest = json.loads(payload["distribution-manifest.json"])
        manifest["files"].append(copy.deepcopy(manifest["files"][0]))
        payload["distribution-manifest.json"] = pack.json_bytes(manifest)
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            pack.validate_bundle(payload, "plan")

    def test_source_path_escape_is_rejected(self):
        (self.root / "plan" / "SKILL.md").write_text(
            (self.root / "plan" / "SKILL.md").read_text(encoding="utf-8") + "[escape](../../outside.md)\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "escapes root"):
            self.payload()

    def test_other_skill_dependency_is_rejected(self):
        path = self.root / "plan" / "SKILL.md"
        path.write_text(path.read_text(encoding="utf-8") + "[build](../build/SKILL.md)\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "omitted"):
            self.payload()

    def test_multiple_entrypoints_are_rejected(self):
        payload = self.payload()
        payload["nested/SKILL.md"] = payload["SKILL.md"]
        with self.assertRaisesRegex(ValueError, "exactly one"):
            pack.validate_bundle(payload, "plan")

    def test_output_cannot_overwrite_source(self):
        with self.assertRaisesRegex(ValueError, "outside the source"):
            pack.build(self.root / "dist", self.root)

    def test_stale_output_is_not_deleted(self):
        output = self.base / "out"
        pack.build(output, self.root)
        unexpected = output / "portable" / "plan" / "user.txt"
        unexpected.write_text("preserve", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "stale files"):
            pack.build(output, self.root)
        self.assertEqual(unexpected.read_text(encoding="utf-8"), "preserve")

    def junction(self, path, target):
        if os.name != "nt":
            path.symlink_to(target, target_is_directory=target.is_dir())
            return
        environment = dict(os.environ, SDLC_TEST_LINK=str(path), SDLC_TEST_TARGET=str(target))
        result = subprocess.run(["powershell", "-NoProfile", "-Command",
            "$ErrorActionPreference='Stop'; New-Item -ItemType Junction -Path $env:SDLC_TEST_LINK -Target $env:SDLC_TEST_TARGET | Out-Null"],
            capture_output=True, text=True, env=environment)
        if result.returncode:
            self.skipTest("Junction creation unavailable: " + result.stderr)

    def test_stage_output_junction_cannot_escape_approved_output(self):
        output = self.base / "out"
        (output / "portable").mkdir(parents=True)
        target = self.base / "outside-output"
        target.mkdir()
        self.junction(output / "portable" / "plan", target)
        with self.assertRaises(ValueError):
            pack.build(output, self.root)
        self.assertFalse((target / "SKILL.md").exists())

    def test_output_root_junction_is_rejected(self):
        target = self.base / "outside-output"
        target.mkdir()
        output = self.base / "linked-output"
        self.junction(output, target)
        with self.assertRaises(ValueError):
            pack.build(output, self.root)
        self.assertEqual(list(target.iterdir()), [])

    def test_source_root_junction_is_rejected(self):
        source = self.base / "linked-source"
        self.junction(source, self.root)
        with self.assertRaises(ValueError):
            pack.source_files(source)

    def test_unsafe_library_payload_members_are_rejected(self):
        for name in ("../escape.bin", "/absolute.bin", "C:/drive.bin", "nested\\escape.bin", "a/../b", "a//b"):
            with self.subTest(name=name):
                payload = self.payload()
                payload[name] = b"synthetic"
                manifest = json.loads(payload["distribution-manifest.json"])
                manifest["files"].append({"path": name, "sha256": pack.digest(b"synthetic"), "source": name, "source_sha256": pack.digest(b"synthetic")})
                manifest["source_inventory_sha256"] = pack.digest(pack.json_bytes(manifest["files"]))
                payload["distribution-manifest.json"] = pack.json_bytes(manifest)
                with self.assertRaises(ValueError):
                    pack.validate_bundle(payload, "plan")
                with self.assertRaises(ValueError):
                    pack.zip_payload({name: b"synthetic"})

    def test_unsafe_archive_prefix_is_rejected(self):
        with self.assertRaises(ValueError):
            pack.zip_payload({"safe.txt": b"safe"}, "../")


if __name__ == "__main__":
    unittest.main()
