import { Injectable } from '@angular/core';
import { BaseFirebaseStorage } from './base-storage';
import { AppArticleVm, articleSchema, NullableValue } from '@/core/utils';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppArticlesStorageService extends BaseFirebaseStorage {
  protected override _getTableName(): string {
    return 'articles';
  }

  public fetchArticles(parentId: NullableValue<string>): Observable<AppArticleVm[]> {
    return this._fetch(doc => articleSchema.parse({
      id: doc.get('id'),
      name: doc.get('name'),
      parentId: doc.get('parentId'),
      htmlContent: doc.get('htmlContent')
    }), q => q.where('parentId', '==', parentId));
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
