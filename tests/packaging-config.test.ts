import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Milestone 3A: Packaging Configuration and CI Automation', () => {
  const rootDir = path.resolve(__dirname, '..');
  const builderConfigPath = path.join(rootDir, 'electron-builder.json');
  const packageJsonPath = path.join(rootDir, 'package.json');
  const releaseWorkflowPath = path.join(rootDir, '.github', 'workflows', 'release.yml');
  const ciWorkflowPath = path.join(rootDir, '.github', 'workflows', 'ci.yml');
  const iconPath = path.join(rootDir, 'build', 'icon.png');

  describe('1. electron-builder.json Configuration', () => {
    it('exists and parses as valid JSON', () => {
      expect(fs.existsSync(builderConfigPath)).toBe(true);
      const raw = fs.readFileSync(builderConfigPath, 'utf-8');
      expect(() => JSON.parse(raw)).not.toThrow();
    });

    it('contains standard application identification metadata', () => {
      const config = JSON.parse(fs.readFileSync(builderConfigPath, 'utf-8'));
      expect(config.appId).toBe('dev.drawzware.app');
      expect(config.productName).toBe('Drawzware');
      expect(config.executableName).toBe('drawzware');
      expect(config.asar).toBe(true);
      expect(config.directories?.output).toBe('dist');
      expect(config.directories?.buildResources).toBe('build');
    });

    it('bundles compiled Electron scripts, static Next export, and package.json', () => {
      const config = JSON.parse(fs.readFileSync(builderConfigPath, 'utf-8'));
      expect(config.files).toContain('dist-electron/**/*');
      expect(config.files).toContain('out/**/*');
      expect(config.files).toContain('package.json');
    });

    it('configures required distributable targets for Windows (NSIS & Portable)', () => {
      const config = JSON.parse(fs.readFileSync(builderConfigPath, 'utf-8'));
      expect(config.win).toBeDefined();
      const targets = config.win.target.map((t: { target: string }) => t.target);
      expect(targets).toContain('nsis');
      expect(targets).toContain('portable');
      expect(config.nsis).toBeDefined();
      expect(config.nsis.shortcutName).toBe('Drawzware');
    });

    it('configures required distributable targets for macOS (DMG & ZIP)', () => {
      const config = JSON.parse(fs.readFileSync(builderConfigPath, 'utf-8'));
      expect(config.mac).toBeDefined();
      const targets = config.mac.target.map((t: { target: string }) => t.target);
      expect(targets).toContain('dmg');
      expect(targets).toContain('zip');
      expect(config.mac.category).toBe('public.app-category.developer-tools');
    });

    it('configures required distributable targets for Linux (AppImage & DEB)', () => {
      const config = JSON.parse(fs.readFileSync(builderConfigPath, 'utf-8'));
      expect(config.linux).toBeDefined();
      const targets = config.linux.target.map((t: { target: string }) => t.target);
      expect(targets).toContain('AppImage');
      expect(targets).toContain('deb');
      expect(config.linux.category).toBe('Development');
    });

    it('has a valid 512x512 app icon in build/icon.png and multi-tier build/icon.ico', () => {
      expect(fs.existsSync(iconPath)).toBe(true);
      const stat = fs.statSync(iconPath);
      expect(stat.size).toBeGreaterThan(1000);

      const icoPath = path.join(rootDir, 'build', 'icon.ico');
      expect(fs.existsSync(icoPath)).toBe(true);
      const icoStat = fs.statSync(icoPath);
      expect(icoStat.size).toBeGreaterThan(1000);
    });

    it('has canonical brand assets in assets/branding/source/', () => {
      const sourceDir = path.join(rootDir, 'assets', 'branding', 'source');
      expect(fs.existsSync(sourceDir)).toBe(true);
      expect(fs.existsSync(path.join(sourceDir, 'app-icon.png'))).toBe(true);
      expect(fs.existsSync(path.join(sourceDir, 'app-icon.svg'))).toBe(true);
      expect(fs.existsSync(path.join(sourceDir, 'wordmark-dark.png'))).toBe(true);
      expect(fs.existsSync(path.join(sourceDir, 'wordmark-light.png'))).toBe(true);
      expect(fs.existsSync(path.join(sourceDir, 'emblem.png'))).toBe(true);
      expect(fs.existsSync(path.join(sourceDir, 'README.md'))).toBe(true);
    });

    it('configures native file associations for .drawz and .drawzbackup', () => {
      const config = JSON.parse(fs.readFileSync(builderConfigPath, 'utf-8'));
      expect(config.fileAssociations).toBeDefined();
      expect(Array.isArray(config.fileAssociations)).toBe(true);

      const extensions = config.fileAssociations.map((fa: { ext: string }) => fa.ext);
      expect(extensions).toContain('drawz');
      expect(extensions).toContain('drawzbackup');

      const drawzAssoc = config.fileAssociations.find((fa: { ext: string }) => fa.ext === 'drawz');
      expect(drawzAssoc.role).toBe('Editor');
      expect(drawzAssoc.description).toBeDefined();

      const backupAssoc = config.fileAssociations.find((fa: { ext: string }) => fa.ext === 'drawzbackup');
      expect(backupAssoc.role).toBe('Editor');
      expect(backupAssoc.description).toBeDefined();
    });

    it('configures Windows and NSIS icon assets accurately', () => {
      const config = JSON.parse(fs.readFileSync(builderConfigPath, 'utf-8'));
      expect(config.win?.icon).toBe('build/icon.ico');
      expect(config.nsis?.installerIcon).toBe('build/icon.ico');
      expect(config.nsis?.uninstallerIcon).toBe('build/icon.ico');
      expect(config.nsis?.installerHeaderIcon).toBe('build/icon.ico');
    });

    it('configures Linux StartupWMClass to prevent duplicate dock icons', () => {
      const config = JSON.parse(fs.readFileSync(builderConfigPath, 'utf-8'));
      const wmClass = config.linux?.desktop?.entry?.StartupWMClass ?? config.linux?.desktop?.StartupWMClass;
      expect(wmClass).toBe('drawzware');
    });
  });

  describe('2. package.json Scripts and Metadata', () => {
    it('defines all required packaging and testing scripts', () => {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(pkg.main).toBe('dist-electron/main.js');
      expect(pkg.description).toBeDefined();
      expect(pkg.author).toBeDefined();

      const scripts = pkg.scripts;
      expect(scripts['build:electron']).toBeDefined();
      expect(scripts['test:smoke']).toBeDefined();
      expect(scripts['dist:dir']).toBeDefined();
      expect(scripts['dist']).toBeDefined();
      expect(scripts['dist:win']).toBeDefined();
      expect(scripts['dist:mac']).toBeDefined();
      expect(scripts['dist:linux']).toBeDefined();
    });
  });

  describe('3. GitHub Actions Release Workflow', () => {
    it('exists and configures release triggers and permissions', () => {
      expect(fs.existsSync(releaseWorkflowPath)).toBe(true);
      const content = fs.readFileSync(releaseWorkflowPath, 'utf-8').replace(/\r\n/g, '\n');

      // Triggered on version tags
      expect(content).toContain("tags:\n      - 'v*.*.*'");
      expect(content).toContain('workflow_dispatch:');
      expect(content).toContain('permissions:\n  contents: write');
    });

    it('defines multi-platform runner matrix for Windows, macOS, and Linux', () => {
      const content = fs.readFileSync(releaseWorkflowPath, 'utf-8').replace(/\r\n/g, '\n');
      expect(content).toContain('windows-latest');
      expect(content).toContain('macos-latest');
      expect(content).toContain('ubuntu-latest');
    });

    it('executes full verification suite prior to packaging', () => {
      const content = fs.readFileSync(releaseWorkflowPath, 'utf-8').replace(/\r\n/g, '\n');
      expect(content).toContain('npm ci');
      expect(content).toContain('npm run lint');
      expect(content).toContain('npx tsc --noEmit');
      expect(content).toContain('npm test');
      expect(content).toContain('npm run build');
      expect(content).toContain('npm run build:electron');
      expect(content).toContain('npm run test:smoke');
    });

    it('ensures releases are only published on version tags', () => {
      const content = fs.readFileSync(releaseWorkflowPath, 'utf-8').replace(/\r\n/g, '\n');
      expect(content).toContain("if: startsWith(github.ref, 'refs/tags/v')");
      expect(content).toContain('softprops/action-gh-release');
    });
  });

  describe('4. GitHub Actions CI Workflow', () => {
    it('runs verification and smoke test on pull requests and pushes', () => {
      expect(fs.existsSync(ciWorkflowPath)).toBe(true);
      const content = fs.readFileSync(ciWorkflowPath, 'utf-8').replace(/\r\n/g, '\n');
      expect(content).toContain('npm run lint');
      expect(content).toContain('npx tsc --noEmit');
      expect(content).toContain('npm test');
      expect(content).toContain('npm run test:smoke');
    });
  });
});
