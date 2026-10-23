import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import {
  billingCreateTariffFeature,
  billingDeleteTariffFeature,
  billingListTariffFeatures,
  billingUpdateTariffFeature
} from '@/core/api/generated/sdk.gen';
import type {
  TariffFeatureCreate,
  TariffFeatureOut,
  TariffFeatureUpdate
} from '@/core/api/generated/types.gen';
import { apiCall } from './api-utils';

@Injectable({
  providedIn: 'root'
})
export class AppTariffFeaturesStorageService {
  public listAll(): Observable<TariffFeatureOut[]> {
    return from(apiCall(() => billingListTariffFeatures())).pipe(map((x) => x ?? []));
  }

  public create(body: TariffFeatureCreate): Observable<TariffFeatureOut> {
    return from(apiCall(() => billingCreateTariffFeature({ body })));
  }

  public update(id: string, body: TariffFeatureUpdate): Observable<TariffFeatureOut> {
    return from(apiCall(() => billingUpdateTariffFeature({ path: { feature_id: id }, body })));
  }

  public delete(id: string): Observable<void> {
    return from(apiCall(() => billingDeleteTariffFeature({ path: { feature_id: id } }))).pipe(
      map(() => undefined)
    );
  }
}
