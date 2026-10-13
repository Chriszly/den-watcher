import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { MissingParts } from '../update/missing-part';
import { ManageButton } from './manage-button';

describe('ManageButton', () => {
  it('loads the list through MissingParts, so one that is missing is not just ignored', async () => {
    TestBed.configureTestingModule({
      imports: [ManageButton],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const openDevicesDialog = vi.fn();
    const load = vi
      .spyOn(TestBed.inject(MissingParts), 'load')
      .mockResolvedValue({ openDevicesDialog } as never);
    const fixture = TestBed.createComponent(ManageButton);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')!.click();
    await fixture.whenStable();

    expect(load).toHaveBeenCalledTimes(1);
    expect(openDevicesDialog).toHaveBeenCalledTimes(1);
  });
});
