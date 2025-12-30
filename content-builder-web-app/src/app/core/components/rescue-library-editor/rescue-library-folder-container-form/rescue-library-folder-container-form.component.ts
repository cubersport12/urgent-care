import { RescueLibraryFolderContainerVm } from '@/core/utils';
import { Component, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AppLoading } from '@/core/store';
import { inject } from '@angular/core';
import { RescueLibraryActions } from '@/core/store';

@Component({
  selector: 'app-rescue-library-folder-container-form',
  imports: [
    MatIcon,
    MatButton,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './rescue-library-folder-container-form.component.html',
  styles: ``
})
export class RescueLibraryFolderContainerFormComponent {
  private readonly _dispatched = inject(AppLoading);

  selectedItem = input.required<RescueLibraryFolderContainerVm>();
  submitEvent = output<{ name: string; description?: string }>();

  protected readonly _form = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    description: new FormControl<string>('')
  });

  protected readonly _isPending = this._dispatched.isDispatched(RescueLibraryActions.UpdateRescueLibraryItem);

  constructor() {
    effect(() => {
      const item = this.selectedItem();
      if (item) {
        this._form.reset({
          name: item.name ?? '',
          description: item.description ?? ''
        });
      }
    });

    effect(() => {
      const isPending = this._isPending();
      if (isPending) {
        this._form.disable();
      }
      else {
        this._form.enable();
      }
    });
  }

  protected _handleSubmit(): void {
    if (this._form.invalid || !this._form.dirty) {
      return;
    }

    const { name, description } = this._form.value;
    this.submitEvent.emit({
      name: name!,
      description: description ?? undefined
    });
  }
}
