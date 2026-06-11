import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-breadcrumbs',
  imports: [],
  templateUrl: './app-breadcrumbs.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: ``
})
export class AppBreadcrumbsComponent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly path = input.required<any[]>();
  public readonly labelKey = input.required<string>();
  public readonly valueKey = input.required<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly onItemClick = output<any>();
}
