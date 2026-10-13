import { MessageKey } from '../i18n/messages/en';

/**
 * What a machine is, read once when Den-Watcher starts; each fact is missing where the machine does
 * not tell it.
 */
export interface System {
  /** The operating system with its version, such as "Debian GNU/Linux 13 (trixie)". */
  os?: string;
  kernel?: string;
  /** Such as "aarch64" or "x86_64". */
  architecture?: string;
  /** The processor's model; the models of its cores, comma-separated, where they differ. */
  cpu?: string;
  /** The maker of the board or PC; missing where the model names it, as on a Raspberry Pi. */
  maker?: string;
  model?: string;
}

/** One fact about a machine as a row of the System card: what it is and its value. */
export interface SystemFact {
  label: MessageKey;
  value: string;
}

/** The maker and model together, such as "Dell Inc. PowerEdge T350", without the maker twice. */
export function modelName(system: System): string | undefined {
  const { maker, model } = system;
  if (!maker || !model) {
    return model || maker;
  }
  // A model often starts with the maker's name without its company form, as "Microsoft Surface
  // Laptop" by "Microsoft Corporation".
  const name = maker.split(' ')[0].toLowerCase();
  return model.toLowerCase().startsWith(name) ? model : `${maker} ${model}`;
}

/** The facts the page shows, in order: the rows of the System card and the columns of the comparison. */
export const SYSTEM_FACTS: readonly MessageKey[] = [
  'system.model',
  'system.os',
  'system.kernel',
  'system.architecture',
  'system.cpu',
  'system.version',
];

/** The value of each of SYSTEM_FACTS, in its order; missing where the device does not tell it. */
export function factValues(system: System, version?: string): (string | undefined)[] {
  return [modelName(system), system.os, system.kernel, system.architecture, system.cpu, version];
}

/** The facts the device tells, in the order the System card shows them. */
export function systemFacts(system: System, version?: string): SystemFact[] {
  const values = factValues(system, version);
  return SYSTEM_FACTS.flatMap((label, i) => (values[i] ? [{ label, value: values[i] }] : []));
}
