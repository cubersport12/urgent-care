import { TestBed } from '@angular/core/testing';
import { provideStore, Store } from '@ngxs/store';
import { Subject } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { AppRescueStorageService } from '@/core/api';
import { AppRescueItemVm } from '@/core/utils';
import { RescueActions } from './actions';
import { RescueState } from './state';

describe('RescueState', () => {
  it('keeps results from concurrent folder requests without duplicates', () => {
    const requests: Subject<AppRescueItemVm[]>[] = [];
    TestBed.configureTestingModule({ providers: [
      provideStore([RescueState]),
      { provide: AppRescueStorageService, useValue: { fetchRescueItems: () => {
        const request = new Subject<AppRescueItemVm[]>();
        requests.push(request);
        return request;
      } } }
    ] });
    const store = TestBed.inject(Store);
    store.dispatch(new RescueActions.FetchRescueItems('left')).subscribe();
    store.dispatch(new RescueActions.FetchRescueItems('right')).subscribe();
    const left = { id: '1', parentId: 'left' } as AppRescueItemVm;
    const right = { id: '2', parentId: 'right' } as AppRescueItemVm;
    requests[1].next([right]);
    requests[1].complete();
    requests[0].next([left, right]);
    requests[0].complete();
    expect(store.selectSnapshot(RescueState.getAllRescueItems)).toEqual([right, left]);
  });
});
