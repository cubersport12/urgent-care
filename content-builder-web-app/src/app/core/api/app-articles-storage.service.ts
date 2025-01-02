import { Injectable } from '@angular/core';
import { BaseStorage } from './base-storage';
import { AppArticleVm, articleSchema, NullableValue } from '@/core/utils';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppArticlesStorageService extends BaseStorage {
  protected override _getTableName(): string {
    return 'articles';
  }

  public fetchArticles(parentId: NullableValue<string>): Observable<AppArticleVm[]> {
    return this._fetch(articleSchema, ref => parentId?.length ? ref.filter('parentId', 'eq', parentId) : ref.filter('parentId', 'is', null));
  }

  public createArticle(article: AppArticleVm): Observable<void> {
    return this._add(article);
  }

  public updateArticle(article: AppArticleVm): Observable<void> {
    return this._update(article);
  }

  public deleteArticle(articleId: string): Observable<void> {
    return this._delete(articleId);
  }
}
