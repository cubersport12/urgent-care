import { AppArticleVm, NullableValue } from '@/core/utils';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ArticlesActions {
  export class FetchArticles {
    public static readonly type = '[Articles] FetchArticles';

    constructor(public readonly parentId: NullableValue<string>) {}
  }

  export class UpdateArticle {
    public static readonly type = '[Articles] UpdateArticle';
    constructor(public readonly articleId: string, public readonly payload: Partial<AppArticleVm>) {}
  }

  export class CreateArticle {
    public static readonly type = '[Articles] CreateArticle';
    constructor(public readonly payload: AppArticleVm) {}
  }

  export class DeleteArticle {
    public static readonly type = '[Articles] DeleteArticle';
    constructor(public readonly articleId: string) {}
  }
}
