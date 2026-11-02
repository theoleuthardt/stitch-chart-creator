import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The start screen for signed-in users. */
@Component({
  selector: 'scc-library',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel">
      <h2>Your charts</h2>
      <p class="muted">You have no charts yet.</p>
    </section>
  `,
})
export class Library {}
