import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AppFilesStorageService } from '@/core/api';
import { RescueParameterDialogComponent } from './rescue-parameter-dialog.component';

describe('Rescue parameter PNG icon', () => {
  it('accepts PNG, rejects other files, and clears the selected icon', async () => {
    await TestBed.configureTestingModule({
      imports: [RescueParameterDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { parameter: null } },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
        { provide: MatDialog, useValue: {} },
        { provide: AppFilesStorageService, useValue: {} }
      ]
    }).overrideComponent(RescueParameterDialogComponent, { set: { template: '' } }).compileComponents();
    const fixture = TestBed.createComponent(RescueParameterDialogComponent);
    const component = fixture.componentInstance as any;
    const event = (bytes: number[]) => ({ target: { value: '', files: [new File([new Uint8Array(bytes)], 'icon.png', { type: 'image/png' })] } }) as unknown as Event;
    await component._selectIcon(event([137, 80, 78, 71, 13, 10, 26, 10]));
    const path = component._form.controls.icon.value;
    expect(path).toMatch(/^public\/.*\.png$/);
    await component._selectIcon(event([1, 2, 3]));
    expect(component._form.controls.icon.value).toBe(path);
    expect(component._iconError()).toBe('Выберите корректный PNG-файл.');
    component._clearIcon();
    expect(component._form.controls.icon.value).toBe('');
    fixture.destroy();
  });
});
