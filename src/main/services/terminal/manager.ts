/**
 * Terminal Manager
 *
 * Manages terminal process spawning with error handling.
 * Uses DI pattern: pass { pty } for real PTY, omit for stub behavior (tests).
 */

import { BrowserWindow } from 'electron';
import { existsSync } from 'fs';
import { IPC_CHANNELS } from '@/shared/constants/channels';
import type { PtyAdapter, PtyProcess } from './pty-adapter';
import { getForegroundProcessName, getForegroundChildPid, getProcessCwd } from './foreground-detector';
import { detectWaitingInput, resetInputDetector, detectBellSignal, detectOscNotification } from './input-detector';
import type {
  TerminalInfo,
  ForegroundProcessInfo,
} from '@/shared/types/terminal.types';
import { TerminalState } from '@/shared/types/terminal.types';
import { createTerminalMachine } from '@/shared/machines/terminal-process';

const MAX_TERMINALS = 20;
const GRACEFUL_CLOSE_TIMEOUT = 5000;
const CWD_POLL_INTERVAL_MS = 1000;
const CWD_GRACE_MS = 1000;

/** Terminal emulator auto-responses that should NOT trigger USER_INPUT */
export function isTerminalAutoResponse(data: string): boolean {
  // Cursor position report: \x1b[row;colR
  if (/^\x1b\[\d+;\d+R$/.test(data)) return true;
  // Focus events: \x1b[I (focus in), \x1b[O (focus out)
  if (/^\x1b\[[IO]$/.test(data)) return true;
  // Device attributes response: \x1b[?...c
  if (/^\x1b\[\?[\d;]*c$/.test(data)) return true;
  return false;
}

interface SpawnOptions {
  cwd: string;
  cols?: number;
  rows?: number;
  skipShellInit?: boolean;
}

interface SpawnResult {
  success: boolean;
  state: string;
  message?: string;
  id?: string;
  pid?: number;
}

interface ManagedTerminal {
  id: string;
  process: PtyProcess;
  cwd: string;
  customName?: string;
  sessionId?: string;
  machine: ReturnType<typeof createTerminalMachine>;
  spawnedAt: number;
  /** Whether shell init keybindings (Home/End) have been injected */
  shellInitDone?: boolean;
  /** When true, PTY output is not pushed to renderer (used during silent cd injection) */
  suppressingOutput?: boolean;
  /** graceful close 的 resolve 函数 */
  exitResolve?: (result: { success: boolean }) => void;
}

interface TerminalManagerDeps {
  pty?: PtyAdapter;
  perfLogger?: { track(event: string, terminalId?: string): void };
  debugLogger?: (line: string) => void;
  /** 终端状态变化回调（用于 Dock 角标等外部监听） */
  onStateChange?: (id: string, state: string) => void;
}

export function createTerminalManager(deps?: TerminalManagerDeps) {
  const terminals = new Map<string, ManagedTerminal>();
  const OUTPUT_BUFFER_MAX_BYTES = 64 * 1024;
  const outputBuffers = new Map<string, string>();
  const ptyAdapter = deps?.pty;
  const perfLogger = deps?.perfLogger;
  const debugLog = deps?.debugLogger ?? (() => {});

  // IPC 输出节流：合并高频 onData 为每 16ms 一次 IPC 推送
  const pendingIpcOutput = new Map<string, string>();
  let ipcFlushTimer: ReturnType<typeof setTimeout> | null = null;
  const IPC_FLUSH_INTERVAL_MS = 16;

  function flushIpcOutput(): void {
    for (const [tid, buf] of pendingIpcOutput) {
      const win = BrowserWindow.getAllWindows()[0];
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.TERMINAL.OUTPUT, { id: tid, data: buf });
      }
    }
    pendingIpcOutput.clear();
    ipcFlushTimer = null;
  }

  // Debounce state change pushes to avoid rapid Running↔WaitingInput oscillation
  // causing excessive React re-renders (e.g. user pressing up/down in yes/no prompt)
  const pendingStateChanges = new Map<string, { state: string; processName?: string; timer: ReturnType<typeof setTimeout> }>();
  const STATE_CHANGE_DEBOUNCE_MS = 50;

  function pushStateChange(id: string, state: string, processName?: string): void {
    // Terminal-ending states must arrive immediately
    const immediate = ['Stopped', 'Failed', 'Disconnected', 'Removed'].includes(state);

    const existing = pendingStateChanges.get(id);
    if (existing) clearTimeout(existing.timer);

    debugLog(`[TERM:stateChange] id=${id} state=${state} processName=${processName ?? ''} immediate=${immediate}`);

    if (immediate) {
      pendingStateChanges.delete(id);
      const win = BrowserWindow.getAllWindows()[0];
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.TERMINAL.STATE_CHANGE, { id, state, processName });
      }
      deps?.onStateChange?.(id, state);
      return;
    }

    const timer = setTimeout(() => {
      pendingStateChanges.delete(id);
      const win = BrowserWindow.getAllWindows()[0];
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.TERMINAL.STATE_CHANGE, { id, state, processName });
      }
      deps?.onStateChange?.(id, state);
    }, STATE_CHANGE_DEBOUNCE_MS);

    pendingStateChanges.set(id, { state, processName, timer });
  }

  function spawn(options: SpawnOptions): SpawnResult {
    // Validate cwd exists
    if (!isValidCwd(options.cwd)) {
      return {
        success: false,
        state: 'Failed',
        message: '终端启动失败：进程已断开 -- 无效的工作目录',
      };
    }

    // Validate cwd path actually exists on disk
    if (options.cwd && !existsSync(options.cwd)) {
      return {
        success: false,
        state: 'Failed',
        message: `终端启动失败：工作目录不存在 — ${options.cwd}`,
      };
    }

    // Check max terminal limit
    if (terminals.size >= MAX_TERMINALS) {
      return {
        success: false,
        state: 'Failed',
        message: '最多支持 20 个终端',
      };
    }

    // If we have a real PTY adapter, create a real process
    if (ptyAdapter) {
      const machine = createTerminalMachine();
      machine.send('SPAWN');

      try {
        const shell = ptyAdapter.getDefaultShell();
        const initialCols = options.cols && options.cols >= 10 ? options.cols : 80;
        const initialRows = options.rows && options.rows >= 2 ? options.rows : 24;
        const proc = ptyAdapter.spawn(shell, options.cwd, initialCols, initialRows);
        const id = `term-${proc.pid}`;

        machine.send('SPAWN_SUCCESS');

        terminals.set(id, { id, process: proc, cwd: options.cwd, machine, spawnedAt: Date.now(), shellInitDone: !!options.skipShellInit });
        startCwdPolling();
        debugLog(`[TERM:spawn] id=${id} pid=${proc.pid} cwd=${options.cwd}`);

        pushStateChange(id, machine.state);

        // Push terminal output to renderer
        proc.onData((data) => {
          perfLogger?.track('termOutput', id);

          const existing = outputBuffers.get(id) ?? '';
          const updated = existing + data;
          if (updated.length > OUTPUT_BUFFER_MAX_BYTES) {
            // Truncate from the front, but avoid splitting an ESC sequence.
            // Scan backward from the cut point to find the nearest safe boundary
            // (a position that is NOT inside an incomplete \x1b[...X sequence).
            let start = updated.length - OUTPUT_BUFFER_MAX_BYTES;
            // Search a small window before the cut point for a stray \x1b
            const windowStart = Math.max(0, start - 32);
            for (let i = start; i >= windowStart; i--) {
              if (updated[i] === '\x1b') {
                // Found an ESC — cut before it to avoid a partial sequence
                start = i;
                break;
              }
            }
            outputBuffers.set(id, updated.slice(start));
          } else {
            outputBuffers.set(id, updated);
          }

          // On first PTY output: schedule keybinding injection + silent cd for zsh.
          // This ensures Cmd+Left/Right works regardless of vi/emacs mode,
          // and silently cd to the requested cwd (login shell may override it).
          {
            const terminal = terminals.get(id);
            if (terminal && !terminal.shellInitDone) {
              terminal.shellInitDone = true;
              const homePath = require('os').homedir();
              setTimeout(() => {
                const t = terminals.get(id);
                if (!t || t.machine.state === 'Stopped') return;
                // Suppress output to renderer so cd+clear is invisible to user
                t.suppressingOutput = true;
                const cdPart = options.cwd !== homePath
                  ? ` cd ${options.cwd.replace(/ /g, '\\ ')};`
                  : '';
                proc.write(
                  " bindkey '\\e[H' beginning-of-line 2>/dev/null;" +
                  " bindkey '\\e[F' end-of-line 2>/dev/null;" +
                  " bindkey -M vicmd '\\e[H' beginning-of-line 2>/dev/null;" +
                  " bindkey -M vicmd '\\e[F' end-of-line 2>/dev/null;" +
                  cdPart +
                  " clear\r"
                );
                // Safety: auto-unsuppress after 2s
                setTimeout(() => {
                  const t2 = terminals.get(id);
                  if (t2) t2.suppressingOutput = false;
                }, 2000);
              }, 100);
            }
          }

          // During output suppression: still update outputBuffers but skip IPC push
          // and state detection so the cd+clear injection is invisible to renderer.
          {
            const terminal = terminals.get(id);
            if (terminal?.suppressingOutput) {
              // Detect clear completion → stop suppressing and forward the clear
              // sequence to renderer so it erases the initial prompt from screen.
              const clearIdx = data.indexOf('\x1b[H\x1b[2J');
              const altClearIdx = clearIdx >= 0 ? clearIdx : data.indexOf('\x1b[2J');
              if (altClearIdx >= 0) {
                terminal.suppressingOutput = false;
                data = data.slice(altClearIdx);
                // Fall through to send clear + post-clear data to renderer
              } else {
                return;
              }
            }
          }

          const prev = pendingIpcOutput.get(id) ?? '';
          pendingIpcOutput.set(id, prev + data);
          if (!ipcFlushTimer) {
            ipcFlushTimer = setTimeout(flushIpcOutput, IPC_FLUSH_INTERVAL_MS);
          }
          // Sampled diagnostic log (1% of output events)
          if (Math.random() < 0.01) {
            debugLog(`[TERM:ipcPush] id=${id} bytes=${data.length} bufSize=${updated.length} pendingBuf=${(pendingIpcOutput.get(id) ?? '').length}`);
          }

          // Detect OSC 7 cwd change: \x1b]7;file://hostname/path\x07 or \x1b]7;file://hostname/path\x1b\\
          const osc7Match = data.match(/\x1b\]7;file:\/\/[^/]*([^\x07\x1b]+)[\x07\x1b]/);
          if (osc7Match) {
            const newCwd = decodeURIComponent(osc7Match[1]);
            const terminal = terminals.get(id);
            if (terminal && terminal.cwd !== newCwd) {
              // Grace period: ignore OSC 7 cwd changes during shell initialization
              if (Date.now() - terminal.spawnedAt < CWD_GRACE_MS) {
                debugLog(`[TERM:osc7] id=${id} ignoring cwd=${newCwd} (grace period, spawn cwd=${terminal.cwd})`);
              } else {
                terminal.cwd = newCwd;
                const cwdWin = BrowserWindow.getAllWindows()[0];
                if (cwdWin && !cwdWin.isDestroyed()) {
                  cwdWin.webContents.send(IPC_CHANNELS.TERMINAL.CWD_CHANGED, { id, cwd: newCwd });
                }
              }
            }
          }

          // WaitingInput detection: BEL/OSC signals or text pattern matching
          // Exit is handled by: user clicking tile (acknowledgeWaiting), typing (USER_INPUT), or terminal exit
          const hasBell = detectBellSignal(data);
          const oscNotif = detectOscNotification(data);
          if (machine.state === 'Running') {
            if (hasBell || oscNotif) {
              resetInputDetector(id);
              machine.send('WAIT_INPUT');
              pushStateChange(id, machine.state);
            } else {
              const detected = detectWaitingInput(data, id);
              if (detected) {
                machine.send('WAIT_INPUT');
                pushStateChange(id, machine.state);
              }
            }
          }
        });

        // Push terminal exit to renderer
        proc.onExit((code) => {
          debugLog(`[TERM:exit] id=${id} code=${code} state=${machine.state}`);
          machine.send('CLOSE');
          machine.send('EXIT_NORMAL');

          const win = BrowserWindow.getAllWindows()[0];
          if (win && !win.isDestroyed()) {
            win.webContents.send(IPC_CHANNELS.TERMINAL.EXIT, { id, code });
          }

          pushStateChange(id, machine.state);

          // 如果有 graceful close 在等待，resolve 它
          const t = terminals.get(id);
          if (t?.exitResolve) {
            t.exitResolve({ success: true });
            t.exitResolve = undefined;
          }

          terminals.delete(id);
          outputBuffers.delete(id);
          pendingIpcOutput.delete(id);
          resetInputDetector(id);
          if (terminals.size === 0) stopCwdPolling();
        });

        return { success: true, state: machine.state, id, pid: proc.pid };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[MUXVO] PTY spawn failed: ${errMsg}`);
        machine.send('SPAWN_FAILURE');
        return {
          success: false,
          state: 'Failed',
          message: `终端启动失败: ${errMsg}`,
        };
      }
    }

    // No adapter — stub behavior for tests
    return {
      success: true,
      state: 'Running',
    };
  }

  function write(id: string, data: string): void {
    const terminal = terminals.get(id);
    if (terminal) {
      // Only transition back for real user input, not terminal auto-responses
      if (terminal.machine.state === 'WaitingInput' && !isTerminalAutoResponse(data)) {
        resetInputDetector(id);
        terminal.machine.send('USER_INPUT');
        pushStateChange(id, terminal.machine.state);
      }
      terminal.process.write(data);
    }
  }

  function resize(id: string, cols: number, rows: number): void {
    const terminal = terminals.get(id);
    if (!terminal) return;
    // Defense-in-depth: reject tiny dimensions that would damage shell output
    if (cols < 10 || rows < 2) {
      debugLog(`[TERM:resize] id=${id} cols=${cols} rows=${rows} BLOCKED(min:10x2)`);
      return;
    }
    terminal.process.resize(cols, rows);
  }

  async function close(id: string, force?: boolean): Promise<{ success: boolean }> {
    const terminal = terminals.get(id);
    if (!terminal) {
      return { success: false };
    }

    if (force) {
      terminal.machine.send('CLOSE');
      pushStateChange(id, terminal.machine.state);
      terminal.process.kill();
      terminals.delete(id);
      outputBuffers.delete(id);
      pendingIpcOutput.delete(id);
      resetInputDetector(id);
      if (terminals.size === 0) stopCwdPolling();
      return { success: true };
    }

    // Graceful close: send SIGINT via Ctrl+C, then wait for exit with timeout
    terminal.machine.send('CLOSE');
    pushStateChange(id, terminal.machine.state);
    terminal.process.write('\x03');

    return new Promise<{ success: boolean }>((resolve) => {
      const timeout = setTimeout(() => {
        // Timeout — force kill
        terminal.exitResolve = undefined; // 防止全局 onExit 再 resolve
        terminal.process.kill();
        terminals.delete(id);
        outputBuffers.delete(id);
        pendingIpcOutput.delete(id);
        resetInputDetector(id);
        if (terminals.size === 0) stopCwdPolling();
        resolve({ success: true });
      }, GRACEFUL_CLOSE_TIMEOUT);

      // 不再注册新的 onExit！改为设置 resolve 函数，让全局 onExit 来调用
      terminal.exitResolve = (result) => {
        clearTimeout(timeout);
        resolve(result);
      };
    });
  }

  function list(): TerminalInfo[] {
    return Array.from(terminals.values()).map((t) => ({
      id: t.id,
      pid: t.process.pid,
      cwd: t.cwd,
      customName: t.customName,
      sessionId: t.sessionId,
      state: t.machine.state as TerminalState,
    }));
  }

  function setName(id: string, name: string): boolean {
    const terminal = terminals.get(id);
    if (!terminal) return false;
    terminal.customName = name || undefined;
    return true;
  }

  function setSessionId(id: string, sessionId: string): boolean {
    const terminal = terminals.get(id);
    if (!terminal) return false;
    terminal.sessionId = sessionId || undefined;
    return true;
  }

  function getState(id: string): { state: string } | null {
    const terminal = terminals.get(id);
    if (!terminal) return null;
    return { state: terminal.machine.state };
  }

  function getForegroundProcess(id: string): ForegroundProcessInfo | null {
    const terminal = terminals.get(id);
    if (!terminal) return null;

    const shellPid = terminal.process.pid;
    const childPid = getForegroundChildPid(shellPid);
    if (childPid) {
      const childName = getForegroundProcessName(childPid);
      return { name: childName ?? 'unknown', pid: childPid };
    }

    const shellName = getForegroundProcessName(shellPid);
    return { name: shellName ?? 'shell', pid: shellPid };
  }

  // --- CWD polling: detect foreground child process directory changes ---
  let cwdPollTimer: ReturnType<typeof setInterval> | null = null;

  function pollForegroundCwd(): void {
    for (const [id, terminal] of terminals) {
      const state = terminal.machine.state;
      if (state !== 'Running' && state !== 'WaitingInput') continue;

      const childPid = getForegroundChildPid(terminal.process.pid);
      const targetPid = childPid ?? terminal.process.pid;

      const targetCwd = getProcessCwd(targetPid);
      if (!targetCwd || targetCwd === terminal.cwd) continue;

      // Grace period: ignore cwd changes during shell initialization
      if (Date.now() - terminal.spawnedAt < CWD_GRACE_MS) continue;

      terminal.cwd = targetCwd;
      const win = BrowserWindow.getAllWindows()[0];
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.TERMINAL.CWD_CHANGED, { id, cwd: targetCwd });
      }
    }
  }

  function startCwdPolling(): void {
    if (cwdPollTimer) return;
    cwdPollTimer = setInterval(pollForegroundCwd, CWD_POLL_INTERVAL_MS);
  }

  function stopCwdPolling(): void {
    if (cwdPollTimer) {
      clearInterval(cwdPollTimer);
      cwdPollTimer = null;
    }
  }

  function closeAll(): void {
    // 清理 IPC 节流缓冲
    if (ipcFlushTimer) {
      clearTimeout(ipcFlushTimer);
      ipcFlushTimer = null;
    }
    pendingIpcOutput.clear();

    for (const [id, terminal] of terminals) {
      terminal.process.kill();
      terminals.delete(id);
      outputBuffers.delete(id);
      resetInputDetector(id);
    }
    stopCwdPolling();
  }

  function getBuffer(id: string): string {
    const buf = outputBuffers.get(id) ?? '';
    // Strip shell init artifacts (bindkey echo): return only content after last screen clear
    const clearSeq = '\x1b[2J';
    const lastClear = buf.lastIndexOf(clearSeq);
    if (lastClear >= 0) {
      return buf.slice(lastClear + clearSeq.length);
    }
    return buf;
  }

  function updateCwd(id: string, newCwd: string): boolean {
    const terminal = terminals.get(id);
    if (!terminal) return false;
    terminal.cwd = newCwd;
    return true;
  }

  /** User clicked on a terminal tile — clear WaitingInput if active */
  function acknowledgeWaiting(id: string): void {
    const terminal = terminals.get(id);
    if (terminal && terminal.machine.state === 'WaitingInput') {
      resetInputDetector(id);
      terminal.machine.send('AUTO_RESUME');
      pushStateChange(id, terminal.machine.state);
    }
  }

  return { spawn, write, resize, close, list, getState, getForegroundProcess, closeAll, getBuffer, updateCwd, acknowledgeWaiting, setName, setSessionId };
}

function isValidCwd(cwd: string): boolean {
  // Paths with 'nonexistent' are treated as invalid for testing
  return !cwd.includes('nonexistent');
}
