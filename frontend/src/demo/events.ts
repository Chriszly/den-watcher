import { DeviceEvent, DeviceEvents } from '../app/metrics/metrics';
import { alertLog } from './alerts';
import { DemoMachine, FLEET, snapshotOf } from './fleet';

/** How long before the page was opened each device got the demo's version, in hours, by its place. */
const UPDATED_HOURS_AGO = 50;

/**
 * What GET /api/events answers for a machine of the demo from `from` to `to`: its alerts, the
 * times it was off, when it started up and when Den-Watcher on it was updated, oldest first.
 */
export function demoEvents(
  machine: DemoMachine,
  from: number,
  to: number,
  now: number,
  version: string,
): DeviceEvents {
  const events: DeviceEvent[] = [];
  const seconds = (iso: string) => Math.floor(Date.parse(iso) / 1000);
  for (const alert of alertLog(Math.floor(now))) {
    const end = alert.ended === undefined ? undefined : seconds(alert.ended);
    if (
      alert.device === machine.device.id &&
      seconds(alert.started) <= to &&
      (end ?? now) >= from
    ) {
      events.push({ kind: 'alert', time: seconds(alert.started), end, alert });
    }
  }
  if (machine.online) {
    events.push(...outages(machine.online, Math.max(from, now - 8 * 86400), Math.min(to, now)));
  }
  // Checked things report no uptime, and only devices running Den-Watcher get its updates.
  if (!machine.checked) {
    const booted = Math.floor(now) - snapshotOf(machine, Math.floor(now), version).uptimeSeconds;
    events.push({ kind: 'reboot', time: booted });
    if (!machine.router) {
      const place = FLEET.indexOf(machine);
      const updated = Math.floor(now - (UPDATED_HOURS_AGO - place * 0.25) * 3600);
      events.push({ kind: 'update', time: Math.max(updated, booted), detail: version });
    }
  }
  return {
    from,
    to,
    events: events
      .filter((e) => e.time <= to && (e.end ?? e.time) >= from)
      .sort((a, b) => a.time - b.time),
  };
}

/** The times a machine that is off at times was off from `from` to `to`, in 5-minute steps. */
function outages(online: (t: number) => boolean, from: number, to: number): DeviceEvent[] {
  const found: DeviceEvent[] = [];
  let start: number | null = null;
  for (let t = Math.floor(from / 300) * 300; t <= to; t += 300) {
    if (!online(t)) {
      start ??= t;
    } else if (start !== null) {
      found.push({ kind: 'outage', time: start, end: t });
      start = null;
    }
  }
  if (start !== null) {
    found.push({ kind: 'outage', time: start, end: to });
  }
  return found;
}
