import { BaseControlValueAccessor } from '@/core/utils';
import { Component, viewChild } from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { CustomOption, QuillEditorComponent, QuillModule, QuillModules } from 'ngx-quill';

@Component({
  selector: 'app-reach-text-editor',
  imports: [
    QuillModule,
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './reach-text-editor.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: ReachTextEditorComponent,
      multi: true
    }
  ],
  styles: ``
})
export class ReachTextEditorComponent extends BaseControlValueAccessor<string> {
  private readonly _quill = viewChild(QuillEditorComponent);
  protected _customOptions: CustomOption[] = [
    {
      import: 'attributors/style/font',
      whitelist: ['bold', 'italic', 'underline', 'strike']
    },
    {
      import: 'attributors/style/size',
      whitelist: ['small', false, 'large', 'huge']
    },
    {
      import: 'attributors/style/align',
      whitelist: ['center', 'right', 'justify', false]
    },
    {
      import: 'attributors/style/indent',
      whitelist: ['1em', '2em', '3em', '4em', '5em', '6em', '7em', '8em', '9em']
    }
  ];

  protected readonly _quillModules: QuillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'], // toggled buttons
      ['link', 'image', 'video', 'formula'],

      [{ header: 1 }, { header: 2 }], // custom button values
      [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
      [{ script: 'sub' }, { script: 'super' }], // superscript/subscript
      [{ indent: '-1' }, { indent: '+1' }], // outdent/indent
      [{ direction: 'rtl' }], // text direction

      [{ size: ['small', 'normal', 'large', 'huge'] }], // custom dropdown
      [{ header: [1, 2, 3, 4, 5, 6, false] }],

      [{ color: [] }, { background: [] }], // dropdown with defaults from theme
      [{ font: [] }],
      [{ align: ['center', 'right', 'justify', false] }],

      ['clean'] // remove formatting button
    ]
  };
}
