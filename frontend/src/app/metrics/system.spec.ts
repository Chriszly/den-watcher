import { modelName, systemFacts } from './system';

describe('modelName', () => {
  it('puts the maker before the model, unless the model names it', () => {
    expect(modelName({ maker: 'Dell Inc.', model: 'PowerEdge T350' })).toBe(
      'Dell Inc. PowerEdge T350',
    );
    expect(modelName({ maker: 'Microsoft Corporation', model: 'Microsoft Surface Laptop' })).toBe(
      'Microsoft Surface Laptop',
    );
    expect(modelName({ model: 'Raspberry Pi 5 Model B Rev 1.0' })).toBe(
      'Raspberry Pi 5 Model B Rev 1.0',
    );
    expect(modelName({ maker: 'ASUS' })).toBe('ASUS');
    expect(modelName({})).toBeUndefined();
  });
});

describe('systemFacts', () => {
  it('lists the facts the device tells, in order, with the version last', () => {
    expect(
      systemFacts(
        { os: 'Debian GNU/Linux 13 (trixie)', architecture: 'aarch64', cpu: 'Cortex-A76' },
        '1.2.3',
      ),
    ).toEqual([
      { label: 'system.os', value: 'Debian GNU/Linux 13 (trixie)' },
      { label: 'system.architecture', value: 'aarch64' },
      { label: 'system.cpu', value: 'Cortex-A76' },
      { label: 'system.version', value: '1.2.3' },
    ]);
    expect(systemFacts({ kernel: '6.12.47' })).toEqual([
      { label: 'system.kernel', value: '6.12.47' },
    ]);
  });
});
