/**
 * VERIFY: FileTempView sidebar 终端应允许 resize
 *
 * Bug: 打开文件后右侧 sidebar 终端显示混乱（文字重叠、换行错位）
 * Root cause: TerminalSidebar 传 compact={true} → TerminalTile 将 compact 直接传给
 *   XTermRenderer.suppressResize → PTY 不被通知新尺寸 → shell 按旧列数输出 → 乱码
 * Fix: 解耦 compact（样式）与 suppressResize（PTY 同步），FileTempView 的 sidebar 传 allowResize
 */
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

describe('FileTempView sidebar terminal resize prop chain', () => {
  const tileSource = readFileSync(resolve(ROOT, 'src/renderer/components/terminal/TerminalTile.tsx'), 'utf-8');
  const sidebarSource = readFileSync(resolve(ROOT, 'src/renderer/components/terminal/TerminalSidebar.tsx'), 'utf-8');
  const ftvSource = readFileSync(resolve(ROOT, 'src/renderer/components/file/FileTempView.tsx'), 'utf-8');

  test('TerminalTile accepts suppressResize prop independent of compact', () => {
    // TerminalTile should have a suppressResize prop in its interface
    expect(tileSource).toContain('suppressResize?: boolean');
    // XTermRenderer should use suppressResize ?? compact (not just compact)
    expect(tileSource).toMatch(/suppressResize=\{suppressResize \?\? compact\}/);
  });

  test('TerminalSidebar accepts allowResize and passes suppressResize to TerminalTile', () => {
    // TerminalSidebar should have allowResize prop
    expect(sidebarSource).toContain('allowResize?: boolean');
    // Should pass suppressResize based on allowResize
    expect(sidebarSource).toMatch(/suppressResize=\{allowResize \? false : undefined\}/);
  });

  test('FileTempView passes allowResize to TerminalSidebar', () => {
    // FileTempView should pass allowResize to TerminalSidebar
    expect(ftvSource).toMatch(/TerminalSidebar[\s\S]*?allowResize/);
  });
});
