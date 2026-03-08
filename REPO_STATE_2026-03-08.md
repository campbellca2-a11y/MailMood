MailMood Repository State — 2026-03-08
Purpose

Document the repository alignment between:

GitHub source code

Chrome Web Store release

active development version

This note exists so future development work can easily determine which commit corresponds to the last shipped release.

Current Release Status

Chrome Web Store live version

MailMood 1.3.0

Approved and published on 2026-03-07.

Git Repository State
Release tag
v1.3.0

Points to commit:

9c4304b

This commit contains:

extension/manifest.json
"version": "1.3.0"

This tag represents the exact source snapshot that produced the shipped extension package.

Active Development Branch
main

Current development version:

1.4.0

Confirmed via:

extension/manifest.json
"version": "1.4.0"

This version is not yet released and represents the next development cycle.

Tag Correction Performed

During repository cleanup:

An incorrect tag v1.4.0 existed on HEAD.

This tag incorrectly suggested that version 1.4.0 had been released.

Corrective action:

git tag -d v1.4.0
git push origin :refs/tags/v1.4.0

This restored correct release semantics.

Version Alignment Model

Current workflow going forward:

Chrome Store
└── 1.3.0 (live)

GitHub
├── v1.3.0  ← release snapshot
└── main    ← 1.4.0 development

Future releases will follow this pattern:

commit release
tag version
push
upload extension zip
bump next dev version

Example:

Release MailMood v1.4.0
git tag v1.4.0

Then immediately:

Begin MailMood v1.5.0 development
Notes

This document records the repository correction performed on 2026-03-08 to ensure the Git tag structure accurately reflects the Chrome Web Store release history.