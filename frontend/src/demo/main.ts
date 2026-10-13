import { HttpBackend } from '@angular/common/http';
import { ApplicationRef, createComponent } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

import { App } from '../app/app';
import { appConfig } from '../app/app.config';
import { KioskMode } from '../app/kiosk/kiosk';
import { DemoBackend } from './demo-backend';
import { DemoNotice } from './demo-notice';

/**
 * The demo of the page, built with `npm run build:demo` for GitHub Pages: the
 * real page, with the requests to the backend answered by made-up devices.
 */
bootstrapApplication(App, {
  providers: [...appConfig.providers, { provide: HttpBackend, useClass: DemoBackend }],
})
  .then((app) => showNotice(app))
  .catch((err) => console.error(err));

function showNotice(app: ApplicationRef): void {
  const notice = createComponent(DemoNotice, { environmentInjector: app.injector });
  app.attachView(notice.hostView);
  const element = notice.location.nativeElement as HTMLElement;
  // On a wall display, like the page below it, it takes no clicks.
  element.inert = app.injector.get(KioskMode).on;
  document.body.prepend(element);
}
