import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [NgClass, NgStyle],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SkeletonComponent {
  @Input() styleClass: string | undefined;
  @Input() style: { [klass: string]: any } | null | undefined;
  @Input() shape = 'rectangle';
  @Input() animation = 'wave';
  @Input() borderRadius: string = '5px';
  @Input() size: string | undefined;
  @Input() width = '100%';
  @Input() height = '32px';

  protected get containerStyle() {
    if (this.size) {
      return { ...this.style, width: this.size, height: this.size, borderRadius: this.borderRadius };
    }
    return { width: this.width, height: this.height, borderRadius: this.borderRadius, ...this.style };
  }

  protected containerClass() {
    return {
      'mir-skeleton': true,
      'mir-skeleton-circle': this.shape === 'circle',
      'mir-skeleton-none': this.animation === 'none'
    };
  }
}
