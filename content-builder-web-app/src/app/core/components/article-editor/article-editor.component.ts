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
import JSZip from 'jszip';
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

  protected async _openFile() {
    try {
      const file = await openFile(['.html', '.zip', 'text/html', 'application/zip', 'application/x-zip-compressed']);
      let html: string;

      // Проверяем, является ли файл ZIP
      if (file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip')) {
        html = await this._processZipFile(file);
      }
      else {
        // Обычный HTML файл
        html = await file.text();
      }

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

  private async _processZipFile(file: File): Promise<string> {
    const zip = new JSZip();
    const zipData = await file.arrayBuffer();
    const zipContent = await zip.loadAsync(zipData);

    // Ищем HTML файл в архиве
    let htmlFileName: string | null = null;
    for (const fileName in zipContent.files) {
      if (!zipContent.files[fileName].dir && fileName.toLowerCase().endsWith('.html')) {
        htmlFileName = fileName;
        break;
      }
    }

    if (!htmlFileName) {
      throw new Error('HTML file not found in ZIP archive');
    }

    // Читаем HTML файл
    const html = await zipContent.files[htmlFileName].async('string');

    // Создаем DOM парсер для работы с HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Получаем директорию HTML файла для разрешения относительных путей
    const htmlDir = htmlFileName.includes('/')
      ? htmlFileName.substring(0, htmlFileName.lastIndexOf('/') + 1)
      : '';

    // Находим все изображения
    const images = doc.querySelectorAll<HTMLImageElement>('img[src]');
    const imagePromises: Promise<void>[] = [];

    images.forEach((img) => {
      const src = img.getAttribute('src');
      if (!src) return;

      // Нормализуем путь к изображению
      let imagePath = src;

      // Убираем начальный слеш, если есть
      if (imagePath.startsWith('/')) {
        imagePath = imagePath.substring(1);
      }

      // Если путь относительный, добавляем директорию HTML файла
      if (!imagePath.startsWith('http://') && !imagePath.startsWith('https://') && !imagePath.startsWith('data:')) {
        if (!imagePath.includes('/')) {
          // Относительный путь в той же директории
          imagePath = htmlDir + imagePath;
        }
        else if (!imagePath.startsWith(htmlDir)) {
          // Относительный путь, но не начинается с директории HTML
          imagePath = htmlDir + imagePath;
        }
      }

      // Ищем изображение в ZIP архиве (пробуем разные варианты)
      const possiblePaths = [
        imagePath,
        imagePath.replace(/\\/g, '/'), // Заменяем обратные слеши
        htmlDir + imagePath.split('/').pop(), // Только имя файла в директории HTML
        imagePath.split('/').pop() // Только имя файла в корне
      ];

      let imageFile: JSZip.JSZipObject | null = null;
      let foundPath: string | null = null;
      for (const path of possiblePaths) {
        if (!path) continue;
        const file = zipContent.files[path];
        if (file && !file.dir) {
          imageFile = file;
          foundPath = path;
          break;
        }
      }

      if (imageFile && foundPath) {
        const imagePathForMime = foundPath;
        const promise = imageFile.async('base64').then((base64) => {
          // Определяем MIME тип по расширению файла
          const extension = imagePathForMime.toLowerCase().split('.').pop();
          let mimeType = 'image/png'; // По умолчанию

          switch (extension) {
            case 'jpg':
            case 'jpeg':
              mimeType = 'image/jpeg';
              break;
            case 'png':
              mimeType = 'image/png';
              break;
            case 'gif':
              mimeType = 'image/gif';
              break;
            case 'webp':
              mimeType = 'image/webp';
              break;
            case 'svg':
              mimeType = 'image/svg+xml';
              break;
            case 'bmp':
              mimeType = 'image/bmp';
              break;
            case 'ico':
              mimeType = 'image/x-icon';
              break;
          }

          // Создаем data URI
          const dataUri = `data:${mimeType};base64,${base64}`;
          img.setAttribute('src', dataUri);
          const setSizes = (el: HTMLElement) => {
            if (el.style.width) {
              el.style.width = `min(100%, ${el.style.width})`;
            }
            if (el.style.height) {
              el.style.height = 'auto';
            }
          };
          setSizes(img);
          setSizes(img.parentElement as HTMLElement);
        });
        imagePromises.push(promise);
      }
    });

    // Ждем загрузки всех изображений
    await Promise.all(imagePromises);

    // Добавляем стили для body через тег style
    let styleElement = doc.querySelector('style');
    if (!styleElement) {
      styleElement = doc.createElement('style');
      styleElement.setAttribute('type', 'text/css');
      if (doc.head) {
        doc.head.appendChild(styleElement);
      }
      else {
        const head = doc.createElement('head');
        doc.documentElement.insertBefore(head, doc.documentElement.firstChild);
        head.appendChild(styleElement);
      }
    }

    // Добавляем стили для body
    const bodyStyles = 'body { padding: 0 !important; max-width: 100% !important; }';
    const currentContent = styleElement.textContent || '';
    if (!currentContent.includes('body { padding: 0')) {
      styleElement.textContent = currentContent
        ? `${currentContent}\n${bodyStyles}`
        : bodyStyles;
    }

    return doc.documentElement.outerHTML;
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
