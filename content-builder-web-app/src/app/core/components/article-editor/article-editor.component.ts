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
import { AppArticleVm, AppLinkToArticleVm, generateGUID, NullableValue, openFileAsBuffer } from '@/core/utils';
import { Store } from '@ngxs/store';
import { AppLoading, ArticlesActions, ArticlesState } from '@/core/store';
import { finalize, mergeMap, Observable } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { CirclePulseComponent } from '../circle-pulse';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { NgClass } from '@angular/common';
import { uniq } from 'lodash';

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
    MatMenu,
    MatOption,
    CirclePulseComponent,
    MatMenuItem,
    MatMenuTrigger,
    NgClass
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

  protected readonly _form = new FormGroup({
    name: new FormControl<string>(this._dialogData.name, Validators.required),
    html: new FormControl<string>('', Validators.required),
    nextRunArticle: new FormControl<NullableValue<string>>(null),
    disableWhileNotPrevComplete: new FormControl<boolean>(false),
    hideWhileNotPrevComplete: new FormControl<boolean>(true),
    includeToStatistics: new FormControl<boolean>(true),
    timeRead: new FormControl<number>(360),
    linksToArticles: new FormArray<FormGroup<ArticleLinkFormType>>([])
  });

  private readonly _htmlValue = toSignal(this._form.controls.html.valueChanges.pipe(takeUntilDestroyed(this._destroyRef)));
  protected readonly _trustedHtml = computed(() => {
    const h = this._htmlValue() ?? '';
    return this._sanitizer.bypassSecurityTrustHtml(h);
  });

  protected readonly _linksNames = linkedSignal(() => this._parseLinks(this._htmlValue() ?? ''));

  constructor() {
    this._loadArticle();
    this._reset();
    this._store.dispatch(new ArticlesActions.FetchAllArticles());
  }

  private _parseLinks(html: string): string[] {
    // #uc:article:link1
    return uniq(html.match(/(#uc:article:[^'"]*)/ig) ?? []);
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
        .downloadFile(`${this._dialogData.id}.html`)
        .subscribe((blob) => {
          void blob?.text().then((r) => {
            this._form.controls.html.setValue(r, { emitEvent: false });
            this._linksNames.set(this._parseLinks(r));
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

  private _transformHtml(html: string): string {
    // const el = document.createElement('div');
    // el.innerHTML = html;

    // const pageContainer = document.getElementById('page-container');
    // if (pageContainer != null) {
    //   const toRemoveElements = new Set<Element>();
    //   for (let index = 0; index < pageContainer.children.length; index++) {
    //     const element = pageContainer.children[index];
    //     if (!element.textContent.trim().length) {
    //       toRemoveElements.add(element);
    //     }
    //   }

    //   toRemoveElements.forEach(x => x.remove());
    // }

    return html;
  }

  protected async _openFile() {
    try {
      let html = (await openFileAsBuffer('text/html')) as string;
      html = this._transformHtml(html);
      const linksToArticles = this._parseLinks(html).map(x => ({ key: x })) as AppLinkToArticleVm[];
      this._form.patchValue({ html, linksToArticles });
      this._setArtcilesLinksControls(linksToArticles);
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
    const { html, name, disableWhileNotPrevComplete, hideWhileNotPrevComplete, includeToStatistics, nextRunArticle, timeRead, linksToArticles } = this._form.getRawValue();
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
