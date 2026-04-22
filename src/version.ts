/**
 * Single source of truth for tinker-desk version.
 *
 * Keep in sync with:
 *  - package.json            → "version"
 *  - src-tauri/tauri.conf.json → "version"
 *  - src-tauri/Cargo.toml    → version
 *  - README.md               → changelog table
 *  - setup.sh                → banner
 */
export const APP_VERSION = '0.1.0';
export const APP_NAME = 'tinker-desk';
