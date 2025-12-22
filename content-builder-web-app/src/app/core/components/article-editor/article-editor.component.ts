import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Injectable,
  linkedSignal,
  signal
} from '@angular/core';
import {
  FormArray,
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
import { MatOption, MatSelectModule } from '@angular/material/select';
import { AppFilesStorageService } from '@/core/api';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef
} from '@angular/material/dialog';
import { AppArticleVm, AppLinkToArticleVm, generateGUID, NullableValue, openFile } from '@/core/utils';
import { Store } from '@ngxs/store';
import { AppLoading, ArticlesActions, ArticlesState } from '@/core/store';
import { finalize, mergeMap, Observable } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';

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

type ArticleLinkFormType = {
  [key in keyof AppLinkToArticleVm]: FormControl<AppLinkToArticleVm[key]>;
};

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
    MatInputModule,
    MatOption
  ],
  templateUrl: './article-editor.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArticleEditorComponent {
  private readonly _appStorage = inject(AppFilesStorageService);
  private readonly _store = inject(Store);
  private readonly _dialogData = inject<AppArticleVm>(MAT_DIALOG_DATA);
  private readonly _ref = inject(MatDialogRef);
  private readonly _sanitizer = inject(DomSanitizer);
  private readonly _dispatched = inject(AppLoading);
  private readonly _isUploadingFile = signal(false);
  private readonly _destroyRef = inject(DestroyRef);

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

  private readonly _pdfFile = signal<File | null>(null);
  protected readonly _pdfUrl = signal<string | null>(null);

  protected readonly _form = new FormGroup({
    name: new FormControl<string>(this._dialogData.name, Validators.required),
    pdf: new FormControl<File | null>(null, Validators.required),
    nextRunArticle: new FormControl<NullableValue<string>>(null),
    disableWhileNotPrevComplete: new FormControl<boolean>(false),
    hideWhileNotPrevComplete: new FormControl<boolean>(true),
    includeToStatistics: new FormControl<boolean>(true),
    timeRead: new FormControl<number>(360),
    linksToArticles: new FormArray<FormGroup<ArticleLinkFormType>>([])
  });

  protected readonly _trustedPdfUrl = computed(() => {
    const url = this._pdfUrl();
    return url ? this._sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  protected readonly _linksNames = linkedSignal(() => []);

  constructor() {
    this._loadArticle();
    this._reset();
    this._store.dispatch(new ArticlesActions.FetchAllArticles());

    // Освобождаем blob URL при уничтожении компонента
    this._destroyRef.onDestroy(() => {
      const url = this._pdfUrl();
      if (url) {
        URL.revokeObjectURL(url);
      }
    });
  }

  protected _findArticleLinkForm(name: string): NullableValue<FormGroup<ArticleLinkFormType>> {
    const { linksToArticles: { controls } } = this._form.controls;
    return controls.find(x => x.value.key === name);
  }

  protected _addOrUpdateLink(key: string, articleId: string): void {
    let form = this._findArticleLinkForm(key);
    if (form == null) {
      form = new FormGroup<ArticleLinkFormType>({
        key: new FormControl<string>(key, { nonNullable: true }),
        articleId: new FormControl<string>(articleId, { nonNullable: true })
      });
      this._form.controls.linksToArticles.push(form);
    }
    else {
      form.patchValue({
        key,
        articleId
      });
    }
    form?.markAsDirty({ emitEvent: true });
  }

  private _reset(): void {
    const { name, disableWhileNotPrevComplete, linksToArticles, hideWhileNotPrevComplete, includeToStatistics, nextRunArticle, timeRead } = this._dialogData;
    this._form.reset({
      name,
      disableWhileNotPrevComplete: disableWhileNotPrevComplete ?? false,
      hideWhileNotPrevComplete: hideWhileNotPrevComplete ?? true,
      includeToStatistics: includeToStatistics ?? true,
      nextRunArticle,
      timeRead: timeRead ?? 360,
      linksToArticles: linksToArticles ?? []
    });
    this._setArtcilesLinksControls(linksToArticles ?? []);
  }

  private _setArtcilesLinksControls(articles: AppLinkToArticleVm[]) {
    this._form.setControl('linksToArticles', new FormArray<FormGroup<ArticleLinkFormType>>(articles.map(x => new FormGroup({
      key: new FormControl<string>(x.key, { nonNullable: true }),
      articleId: new FormControl<string>(x.articleId, { nonNullable: true })
    })) ?? []));
  }

  private _loadArticle() {
    if (this._dialogData.id != null) {
      this._appStorage
        .downloadFile(`${this._dialogData.id}.pdf`)
        .subscribe((blob) => {
          const file = new File([blob], `${this._dialogData.id}.pdf`, { type: 'application/pdf' });
          this._pdfFile.set(file);
          this._form.controls.pdf.setValue(file, { emitEvent: false });
          const url = URL.createObjectURL(blob);
          this._pdfUrl.set(url);
        });
    }
  }

  protected _openPdfContentInWindow(): void {
    const url = this._pdfUrl();
    if (url) {
      window.open(url, '_blank');
    }
  }

  protected async _openFile() {
    try {
      const file = await openFile(['.pdf', 'application/pdf']);

      // Освобождаем предыдущий URL
      const oldUrl = this._pdfUrl();
      if (oldUrl) {
        URL.revokeObjectURL(oldUrl);
      }

      this._pdfFile.set(file);
      this._form.controls.pdf.setValue(file);
      const url = URL.createObjectURL(file);
      this._pdfUrl.set(url);
      this._form.markAsDirty();
      this._form.controls.pdf.markAsDirty();
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
    const { pdf, name, disableWhileNotPrevComplete, hideWhileNotPrevComplete, includeToStatistics, nextRunArticle, timeRead, linksToArticles } = this._form.getRawValue();
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
            timeRead,
            linksToArticles
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
            timeRead,
            linksToArticles
          })
        );

    const obs: Observable<void> = this._form.controls.pdf.dirty && pdf
      ? action
          .pipe(
            mergeMap(() => {
              this._isUploadingFile.set(true);
              return this._appStorage.uploadFile(`${id}.pdf`, pdf).pipe(finalize(() => this._isUploadingFile.set(false))) as unknown as Observable<void>;
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
