# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Critical bug fix**: Fixed error when translating text selected from PDF attachments
  - When selecting text in a PDF attachment and using "幻觉翻译 arXiv 翻译", the plugin now correctly
    retrieves arXiv ID from the parent entry's DOI instead of failing with "未找到有效的arxiv ID"
  - Previously, the code tried to call `getAttachments()` on attachment items, which caused errors
  - Now properly detects attachment items and uses their parent entries for all operations
  - Fixes both DOI extraction and attachment lookup/creation for PDF selections

### Changed

- Updated Zotero version support from `9.*` to `10.*` to support the latest Zotero release

## [0.1.5] - 2025-08-01

- Initial support for Zotero 9.0
- arXiv translation based on LaTeX source code
- Support for multiple arXiv ID sources (DOI, URL, archive ID, extra fields)
