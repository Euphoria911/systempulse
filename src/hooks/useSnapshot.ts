import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Snapshot, StaticInfo } from "../lib/types";

const HISTORY_LEN = 60;

export interface History {
  cpu: number[];
  memory: number[];
  netRx: number[];
  netTx: number[];
}

const emptyHistory = (): History => ({
  cpu: [],
  memory: [],
  netRx: [],
  netTx: [],
});

export function useSnapshot(intervalMs: number) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [staticInfo, setStaticInfo] = useState<StaticInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const historyRef = useRef<History>(emptyHistory());
  const [historyVersion, setHistoryVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await invoke<StaticInfo>("get_static_info");
        if (!cancelled) setStaticInfo(info);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const tick = async () => {
      try {
        const snap = await invoke<Snapshot>("get_snapshot");
        if (cancelled) return;
        setSnapshot(snap);
        const h = historyRef.current;
        push(h.cpu, snap.cpu.usagePercent);
        push(h.memory, snap.memory.percent);
        const netRx = snap.networks.reduce((a, n) => a + n.rxBytesPerSec, 0);
        const netTx = snap.networks.reduce((a, n) => a + n.txBytesPerSec, 0);
        push(h.netRx, netRx);
        push(h.netTx, netTx);
        setHistoryVersion((v) => v + 1);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) {
          timer = window.setTimeout(tick, intervalMs);
        }
      }
    };

    tick();

    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [intervalMs]);

  return {
    snapshot,
    staticInfo,
    error,
    history: historyRef.current,
    historyVersion,
  };
}

function push(arr: number[], value: number) {
  arr.push(value);
  while (arr.length > HISTORY_LEN) arr.shift();
}
