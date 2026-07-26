import { inject, Injectable } from '@angular/core';
import { BaseStorage } from './base-storage';
import { AppArticleVm, articleSchema, NullableValue } from '@/core/utils';
import { forkJoin, Observable } from 'rxjs';
import { AppFilesStorageService } from './app-files-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AppArticlesStorageService extends BaseStorage {
  private readonly _filesStorage = inject(AppFilesStorageService);
  protected override _getTableName(): string {
    return 'articles';
  }

  public fetchAllArticles(): Observable<AppArticleVm[]> {
    return this._fetch<AppArticleVm>(articleSchema, () => ({ all: true }));
  }

  public fetchArticles(parentId: NullableValue<string>): Observable<AppArticleVm[]> {
    return this._fetch<AppArticleVm>(articleSchema, () =>
      parentId?.length ? { parentId } : { parentId: null }
    );
  }

  public createArticle(article: AppArticleVm): Observable<void> {
    return this._add(article);
  }

  public updateArticle(article: AppArticleVm): Observable<void> {
    return this._update(article);
  }

  public deleteArticle(articleId: string): Observable<void> {
    return forkJoin([
      this._delete(articleId),
      this._filesStorage.deleteFile(`${articleId}.pdf`)
    ]) as Observable<never>;
  }
}
