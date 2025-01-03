import { AppArticleVm, NullableValue } from '@/core/utils';
import { inject, Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { ArticlesActions } from './actions';
import { AppArticlesStorageService } from '@/core/api';
import { append, patch, removeItem, updateItem } from '@ngxs/store/operators';
import { tap } from 'rxjs';
import uniqid from 'uniqid';

type ArticlesStateModel = {
  articles?: AppArticleVm[];
};

@Injectable()
@State<ArticlesStateModel>({
  name: 'articles',
  defaults: {}
})
export class ArticlesState {
  private readonly _articlesStorage = inject(AppArticlesStorageService);

  @Selector()
  public static getArticles(state: ArticlesStateModel) {
    return (parentId: NullableValue<string>) => state.articles?.filter(x => x.parentId == parentId) ?? [];
  }

  @Action(ArticlesActions.FetchArticles, { cancelUncompleted: true })
  private _fetchArticles(ctx: StateContext<ArticlesStateModel>, { parentId }: ArticlesActions.FetchArticles) {
    const { articles } = ctx.getState();
    if (articles?.some(x => x.parentId === (parentId ?? null))) {
      return;
    }
    return this._articlesStorage.fetchArticles(parentId)
      .pipe(tap((r) => {
        ctx.setState(patch({
          articles: append(r)
        }));
      }));
  }

  @Action(ArticlesActions.CreateArticle, { cancelUncompleted: true })
  private _createArticle(ctx: StateContext<ArticlesStateModel>, { payload }: ArticlesActions.CreateArticle) {
    const id = payload.id ?? uniqid();
    const newArticle = {
      ...payload,
      id
    } as AppArticleVm;
    return this._articlesStorage.createArticle(newArticle)
      .pipe(tap(() => {
        ctx.setState(patch({
          articles: append([newArticle])
        }));
      }));
  }

  @Action(ArticlesActions.UpdateArticle, { cancelUncompleted: true })
  private _updateArticle(ctx: StateContext<ArticlesStateModel>, { articleId, payload }: ArticlesActions.UpdateArticle) {
    return this._articlesStorage.updateArticle({ id: articleId, ...payload } as AppArticleVm)
      .pipe(tap(() => {
        ctx.setState(patch({
          articles: updateItem(x => x.id === articleId, x => ({ ...x, ...payload }))
        }));
      }));
  }

  @Action(ArticlesActions.DeleteArticle, { cancelUncompleted: true })
  private _deleteArticle(ctx: StateContext<ArticlesStateModel>, { articleId }: ArticlesActions.DeleteArticle) {
    return this._articlesStorage.deleteArticle(articleId)
      .pipe(tap(() => {
        ctx.setState(patch({
          articles: removeItem(x => x.id === articleId)
        }));
      }));
  }
}
