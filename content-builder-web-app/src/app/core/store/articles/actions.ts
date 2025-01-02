import { AppArticleVm } from '@/core/utils';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ArticlesActions {
  export class FetchArticles {
    public readonly type = '[Articles] FetchArticles';
  }

  export class UpdateArticle {
    public readonly type = '[Articles] UpdateArticle';
    constructor(public readonly articleId: string, public readonly payload: Partial<AppArticleVm>) {}
  }

  export class CreateArticle {
    public readonly type = '[Articles] CreateArticle';
    constructor(public readonly payload: AppArticleVm) {}
  }

  export class DeleteArticle {
    public readonly type = '[Articles] DeleteArticle';
    constructor(public readonly articleId: string) {}
  }
}
