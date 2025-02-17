import {
  Component,
  computed,
  DestroyRef,
  inject,
  Injectable,
  signal
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButton, MatMiniFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AppFilesStorageService } from '@/core/api';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef
} from '@angular/material/dialog';
import { AppArticleVm, generateGUID, NullableValue, openFileAsBuffer } from '@/core/utils';
import { Store } from '@ngxs/store';
import { AppLoading, ArticlesActions, ArticlesState } from '@/core/store';
import { finalize, mergeMap, Observable } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class ArticleEditorService {
  private readonly _dialogs = inject(MatDialog);
  public openArticle(article: Partial<AppArticleVm>): void {
    this._dialogs.open(ArticleEditorComponent, {
      minWidth: '400px',
      hasBackdrop: true,
      autoFocus: true,
      disableClose: true,
      data: article
    });
  }
}

@Component({
  selector: 'app-article-editor',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButton,
    MatMiniFabButton,
    MatIcon,
    MatCheckboxModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './article-editor.component.html',
  styles: ``
})
export class ArticleEditorComponent {
  private readonly _appStorage = inject(AppFilesStorageService);
  private readonly _store = inject(Store);
  private readonly _dialogData = inject<AppArticleVm>(MAT_DIALOG_DATA);
  private readonly _ref = inject(MatDialogRef);
  private readonly _sanitizer = inject(DomSanitizer);
  private readonly _dispatched = inject(AppLoading);
  private readonly _isUploadingFile = signal(false);

  protected readonly _allArticles = computed(() => {
    const result = this._store.selectSignal(ArticlesState.getAllArticles)();
    return result;
  });

  protected readonly _convertMessages = signal('');
  protected readonly _isPending = computed(
    () =>
      this._dispatched.isDispatched(ArticlesActions.CreateArticle)()
      || this._dispatched.isDispatched(ArticlesActions.UpdateArticle)()
      || this._isUploadingFile()
  );

  protected readonly _form = new FormGroup({
    name: new FormControl<string>(this._dialogData.name, Validators.required),
    html: new FormControl<string>('', Validators.required),
    nextRunArticle: new FormControl<NullableValue<string>>(null),
    disableWhileNotPrevComplete: new FormControl<boolean>(false),
    hideWhileNotPrevComplete: new FormControl<boolean>(true),
    includeToStatistics: new FormControl<boolean>(true),
    timeRead: new FormControl<number>(360)
  });

  private readonly _htmlValue = toSignal(this._form.controls.html.valueChanges);
  protected readonly _trustedHtml = computed(() => {
    const h = this._htmlValue() ?? '';
    return this._sanitizer.bypassSecurityTrustHtml(h);
  });

  constructor() {
    this._loadArticle();
    this._reset();
    this._store.dispatch(new ArticlesActions.FetchAllArticles());
  }

  private _reset(): void {
    const { name, disableWhileNotPrevComplete, hideWhileNotPrevComplete, includeToStatistics, nextRunArticle, timeRead } = this._dialogData;
    this._form.reset({
      name,
      disableWhileNotPrevComplete,
      hideWhileNotPrevComplete,
      includeToStatistics,
      nextRunArticle,
      timeRead
    });
  }

  private _loadArticle() {
    if (this._dialogData.id != null) {
      this._appStorage
        .downloadFile(`${this._dialogData.id}.html`)
        .subscribe((blob) => {
          void blob?.text().then((r) => {
            this._form.controls.html.setValue(r, { emitEvent: false });
          });
        });
    }
  }

  protected _openHtmlContentInWindow(): void {
    const { html } = this._form.getRawValue();
    const win = window.open('', '_blank');
    if (win != null) {
      win.document.body.innerHTML = html ?? '';
    }
  }

  protected async _openFile() {
    try {
      const html = (await openFileAsBuffer('text/html')) as string;
      this._form.patchValue({ html });
      this._form.markAsDirty();
      this._form.controls.html.markAsDirty();
    }
    catch (e) {
      console.error(e);
    }
  }

  protected _preventClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  protected _submit(): void {
    const { html, name, disableWhileNotPrevComplete, hideWhileNotPrevComplete, includeToStatistics, nextRunArticle, timeRead } = this._form.getRawValue();
    const blob = new Blob([html!], { type: 'text/html' });
    const id = this._dialogData.id ?? generateGUID();
    const action = this._dialogData.id
      ? this._store.dispatch(
          new ArticlesActions.UpdateArticle(id, {
            name: name!,
            parentId: this._dialogData.parentId,
            disableWhileNotPrevComplete,
            hideWhileNotPrevComplete,
            includeToStatistics,
            nextRunArticle,
            timeRead
          })
        )
      : this._store.dispatch(
          new ArticlesActions.CreateArticle({
            id,
            name: name!,
            parentId: this._dialogData.parentId,
            disableWhileNotPrevComplete,
            hideWhileNotPrevComplete,
            includeToStatistics,
            nextRunArticle,
            timeRead
          })
        );

    const obs: Observable<void> = this._form.controls.html.dirty
      ? action
          .pipe(
            mergeMap(() => {
              this._isUploadingFile.set(true);
              return this._appStorage.uploadFile(`${id}.html`, blob).pipe(finalize(() => this._isUploadingFile.set(false))) as unknown as Observable<void>;
            }))
      : action;
    obs
      .subscribe(() => {
        this._ref.close(true);
      });
  }

  protected _cancel(): void {
    this._ref.close(false);
  }
}
