import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DeviceService } from '../devices/devices';
import { CsvDownload, fileNameOf } from './csv-download';

@Component({
  imports: [CsvDownload],
  template: `<app-csv-download [from]="100" [to]="200" />`,
})
class Host {}

describe('fileNameOf', () => {
  it('takes the UTF-8 name, else the plain one, and never a folder', () => {
    expect(fileNameOf(`attachment; filename="B-ro.csv"; filename*=UTF-8''B%C3%BCro.csv`)).toBe(
      'Büro.csv',
    );
    expect(fileNameOf('attachment; filename="nas-1-2.csv"')).toBe('nas-1-2.csv');
    expect(fileNameOf(`attachment; filename*=UTF-8''..%2F..%2Fevil.csv`)).toBe('evil.csv');
    expect(fileNameOf(`attachment; filename*=UTF-8''%E0%A4%A`)).toBe('history.csv');
    expect(fileNameOf(null)).toBe('history.csv');
  });
});

describe('CsvDownload', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(DeviceService).selectedId.set('nas');
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    return { fixture, element, button: element.querySelector('button')! };
  }

  it('downloads the stretch of the picked device under the name the backend gives', () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:file');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const { fixture, button } = render();
    expect(button.textContent?.trim()).toBe('Download CSV');

    button.click();
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
    const request = http.expectOne((r) => r.url === '/api/history.csv');
    expect(request.request.params.get('from')).toBe('100');
    expect(request.request.params.get('to')).toBe('200');
    expect(request.request.params.get('device')).toBe('nas');
    const file = new Blob(['time,cpu\r\n']);
    request.flush(file, {
      headers: { 'Content-Disposition': 'attachment; filename="nas-1-2.csv"' },
    });
    fixture.detectChanges();

    expect(button.disabled).toBe(false);
    expect(create).toHaveBeenCalledWith(file);
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('nas-1-2.csv');
    expect(link.href).toBe('blob:file');
  });

  it('says so when the file cannot be downloaded', () => {
    const { fixture, element, button } = render();
    button.click();
    http
      .expectOne((r) => r.url === '/api/history.csv')
      .flush(new Blob(['no']), { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(element.querySelector('[role=alert]')?.textContent).toBe('Could not download the file.');
    expect(button.disabled).toBe(false);
  });
});
