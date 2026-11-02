export interface StaticInfo {
  hostName: string | null;
  osName: string;
  osVersion: string;
  kernelVersion: string | null;
  cpuBrand: string;
  cpuCores: number;
  cpuLogical: number;
  totalMemoryBytes: number;
}

export interface CpuSnapshot {
  usagePercent: number;
  perCore: number[];
  frequencyMhz: number;
  temperatureC: number | null;
}

export interface MemorySnapshot {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  percent: number;
  swapTotalBytes: number;
  swapUsedBytes: number;
}

export interface DiskSnapshot {
  name: string;
  mountPoint: string;
  kind: string;
  fileSystem: string;
  totalBytes: number;
  availableBytes: number;
  usedBytes: number;
  percent: number;
  isRemovable: boolean;
}

export interface NetworkSnapshot {
  interface: string;
  rxBytesPerSec: number;
  txBytesPerSec: number;
  rxTotalBytes: number;
  txTotalBytes: number;
}

export interface ProcessSnapshot {
  pid: number;
  name: string;
  cpuPercent: number;
  memoryBytes: number;
}

export interface GpuSnapshot {
  available: boolean;
  message: string;
}

export interface Snapshot {
  timestampMs: number;
  uptimeSeconds: number;
  cpu: CpuSnapshot;
  memory: MemorySnapshot;
  disks: DiskSnapshot[];
  networks: NetworkSnapshot[];
  topCpuProcesses: ProcessSnapshot[];
  topMemoryProcesses: ProcessSnapshot[];
  gpu: GpuSnapshot;
}
