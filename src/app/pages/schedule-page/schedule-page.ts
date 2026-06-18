import { Component } from '@angular/core';

@Component({
  selector: 'app-schedule-page',
  standalone: true,
  template: `
    <section class="page-card">
      <p class="eyebrow">Schedule</p>
      <h2>Future shift planning workspace</h2>
      <p>
        This route is ready for our scheduling feature. For now, it helps you see how Angular maps
        a URL to a dedicated standalone page component.
      </p>
    </section>
  `,
  styles: `
    .page-card {
      padding: 1.5rem;
      border-radius: 1.5rem;
      background: rgba(8, 18, 34, 0.72);
      border: 1px solid rgba(173, 205, 240, 0.12);
    }

    .eyebrow {
      margin: 0 0 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 0.74rem;
      color: #7fbeff;
    }

    h2,
    p {
      margin: 0;
      color: #f4f8fc;
    }

    p:last-child {
      margin-top: 0.75rem;
      color: #abc0d7;
      line-height: 1.6;
    }
  `
})
export class SchedulePage {}
