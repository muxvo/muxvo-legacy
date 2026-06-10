/**
 * FixtureTermContent — dev-only：fixture 模式下替代 xterm 的确定性静态文本块。
 * 仅在 window.__MUXVO_FIXTURE__ 置位时由 XTermRenderer 分支渲染（fixture.html 入口）。
 * 样式契约（两侧一致）见 muxvo/tools/visual-diff/fixtures/_CONTRACT.md。
 */

interface Segment {
  t: string;
  hex?: string;
}

const TERM_FONT =
  "'JetBrains Mono', 'SF Mono', Menlo, Monaco, 'Cascadia Code', 'Courier New', monospace";

export function FixtureTermContent({ terminalId }: { terminalId: string }): JSX.Element {
  const data = (window as any).__MUXVO_FIXTURE_DATA__;
  const term = data?.terminals?.find((t: any) => t.id === terminalId);
  const palette = data?.palette ?? { background: '#1e1e1e', foreground: '#cccccc' };
  const lines: Segment[][] = term?.content ?? [];

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: palette.background,
        padding: '8px',
        overflow: 'hidden',
        fontFamily: TERM_FONT,
        fontSize: '14px',
        lineHeight: 1.4,
        color: palette.foreground,
        whiteSpace: 'pre',
        userSelect: 'none',
      }}
    >
      {lines.map((segments, i) => (
        <div key={i}>
          {segments.length === 0
            ? ' '
            : segments.map((s, j) => (
                <span key={j} style={s.hex ? { color: s.hex } : undefined}>
                  {s.t}
                </span>
              ))}
        </div>
      ))}
    </div>
  );
}
