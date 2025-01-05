import { Component, computed, inject, Injectable } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReachTextEditorComponent } from '../reach-text-editor';
import { AppFilesStorageService } from '@/core/api';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AppArticleVm, generateGUID } from '@/core/utils';
import { Store } from '@ngxs/store';
import { AppLoading, ArticlesActions } from '@/core/store';
import { mergeMap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ArticleEditorService {
  private readonly _dialogs = inject(MatDialog);
  public openArticle(article: Partial<AppArticleVm>): void {
    this._dialogs.open(ArticleEditorComponent, {
      width: '90%',
      height: '90%',
      maxWidth: '100%',
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
    MatIcon,
    MatFormFieldModule,
    MatInputModule,
    ReachTextEditorComponent
  ],
  templateUrl: './article-editor.component.html',
  styles: ``
})
export class ArticleEditorComponent {
  private readonly _appStorage = inject(AppFilesStorageService);
  private readonly _store = inject(Store);
  private readonly _dialogData = inject<AppArticleVm>(MAT_DIALOG_DATA);
  private readonly _ref = inject(MatDialogRef);
  private readonly _dispatched = inject(AppLoading);
  protected readonly _isPending = computed(() => this._dispatched.isDispatched(ArticlesActions.CreateArticle)() || this._dispatched.isDispatched(ArticlesActions.UpdateArticle)());
  protected readonly _form = new FormGroup({
    name: new FormControl<string>(this._dialogData.name, Validators.required),
    html: new FormControl<string>('', Validators.required)
  });

  constructor() {
    this._loadArticle();
  }

  private _loadArticle() {
    if (this._dialogData.id != null) {
      this._appStorage.downloadFile(`${this._dialogData.id}.html`)
        .subscribe((blob) => {
          void blob.text().then((r) => {
            this._form.reset({ html: r, name: this._dialogData.name });
          });
        });
    }
  }

  protected _submit(): void {
    const { html, name } = this._form.getRawValue();
    const blob = new Blob([html!], { type: 'text/html' });
    const id = this._dialogData.id ?? generateGUID();
    const action = this._dialogData.id
      ? this._store.dispatch(new ArticlesActions.UpdateArticle(id, { name: name!, parentId: this._dialogData.parentId }))
      : this._store.dispatch(new ArticlesActions.CreateArticle({
          id,
          name: name!,
          parentId: this._dialogData.parentId
        }));
    action
      .pipe(mergeMap(() => this._appStorage.uploadFile(`${id}.html`, blob)))
      .subscribe(() => {
        this._ref.close(true);
      });
  }

  protected _cancel(): void {
    this._ref.close(false);
  }
}
