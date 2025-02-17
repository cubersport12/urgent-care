import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-breadcrumbs',
  imports: [],
  templateUrl: './app-breadcrumbs.component.html',
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
