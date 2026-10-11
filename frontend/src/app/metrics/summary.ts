import { Snapshot } from './metrics';

/** The main values of one device, to compare them or show them in the list of devices; a value the device does not report is missing. */
export interface Summary {
  cpu?: number;
  memory?: number;
  /** The fullest disk. */
  disk?: { path: string; percent: number };
  /** The hottest sensor. */
  temperature?: { sensor: string; celsius: number };
  /** All network cards together, in bytes per second. */
  network?: { receive: number; send: number };
  uptimeSeconds?: number;
}

/** The main values of a snapshot. A router or a check reports only some, the others are missing. */
export function summarize(s: Snapshot): Summary {
  const fullest = [...s.disks].sort((a, b) => b.usedPercent - a.usedPercent)[0];
  const hottest = [...s.temperatures].sort((a, b) => b.celsius - a.celsius)[0];
  return {
    cpu: s.cpu.cores > 0 ? s.cpu.usagePercent : undefined,
    memory: s.memory.totalBytes > 0 ? s.memory.usedPercent : undefined,
    disk: fullest && { path: fullest.path, percent: fullest.usedPercent },
    temperature: hottest && { sensor: hottest.sensor, celsius: hottest.celsius },
    network:
      s.network.length > 0
        ? {
            receive: s.network.reduce((sum, n) => sum + n.receiveBytesPerSecond, 0),
            send: s.network.reduce((sum, n) => sum + n.sendBytesPerSecond, 0),
          }
        : undefined,
    uptimeSeconds: s.uptimeSeconds > 0 ? s.uptimeSeconds : undefined,
  };
}
