import { AppTestVm, generateGUID, NullableValue } from '@/core/utils';
import { inject, Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { TestsActions } from './actions';
import { AppTestsStorageService } from '@/core/api';
import { append, patch, removeItem, updateItem } from '@ngxs/store/operators';
import { tap } from 'rxjs';
import { uniqBy } from 'lodash';

type TestsStateModel = {
  articles?: AppTestVm[];
};

@Injectable()
@State<TestsStateModel>({
  name: 'tests',
  defaults: {}
})
export class TestsState {
  private readonly _testsStorage = inject(AppTestsStorageService);

  @Selector()
  public static getAllTests(state: TestsStateModel) {
    return state.articles ?? [];
  }

  @Selector()
  public static getTests(state: TestsStateModel) {
    return (parentId: NullableValue<string>) => state.articles?.filter(x => x.parentId == parentId) ?? [];
  }

  @Action(TestsActions.FetchTests, { cancelUncompleted: true })
  private _fetchTests(ctx: StateContext<TestsStateModel>, { parentId }: TestsActions.FetchTests) {
    const { articles } = ctx.getState();
    if (articles?.some(x => x.parentId === (parentId ?? null))) {
      return;
    }
    return this._testsStorage.fetchTests(parentId)
      .pipe(tap((r) => {
        ctx.setState(patch({
          articles: append(r)
        }));
      }));
  }

  @Action(TestsActions.CreateTest, { cancelUncompleted: true })
  private _createTest(ctx: StateContext<TestsStateModel>, { payload }: TestsActions.CreateTest) {
    const id = payload.id ?? generateGUID();
    const newTest = {
      ...payload,
      id
    } as AppTestVm;
    return this._testsStorage.createTest(newTest)
      .pipe(tap(() => {
        ctx.setState(patch({
          articles: append([newTest])
        }));
      }));
  }

  @Action(TestsActions.UpdateTest)
  private _updateTest(ctx: StateContext<TestsStateModel>, { testId, payload }: TestsActions.UpdateTest) {
    return this._testsStorage.updateTest({ id: testId, ...payload } as AppTestVm)
      .pipe(tap(() => {
        ctx.setState(patch({
          articles: updateItem(x => x.id === testId, x => ({ ...x, ...payload }))
        }));
      }));
  }

  @Action(TestsActions.DeleteTest, { cancelUncompleted: true })
  private _deleteTest(ctx: StateContext<TestsStateModel>, { testId }: TestsActions.DeleteTest) {
    return this._testsStorage.deleteTest(testId)
      .pipe(tap(() => {
        ctx.setState(patch({
          articles: removeItem(x => x.id === testId)
        }));
      }));
  }

  @Action(TestsActions.FetchAllTests, { cancelUncompleted: true })
  private _fetchAllTests(ctx: StateContext<TestsStateModel>) {
    return this._testsStorage.fetchAllTests()
      .pipe(tap((r) => {
        const { articles } = ctx.getState();
        ctx.setState(patch({
          articles: uniqBy<AppTestVm>([...(articles ?? []), ...r], x => x.id)
        }));
      }));
  };
}
