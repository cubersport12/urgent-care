import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import {
  billingCreateTariff,
  billingDeleteTariff,
  billingListTariffsAdmin,
  billingUpdateTariff
} from '@/core/api/generated/sdk.gen';
import type { TariffCreate, TariffOut, TariffUpdate } from '@/core/api/generated/types.gen';
import { apiCall } from './api-utils';

@Injectable({
  providedIn: 'root'
})
export class AppTariffsStorageService {
  public listAll(): Observable<TariffOut[]> {
    return from(apiCall(() => billingListTariffsAdmin())).pipe(map((x) => x ?? []));
  }

  public create(body: TariffCreate): Observable<TariffOut> {
    return from(apiCall(() => billingCreateTariff({ body })));
  }

  public update(id: string, body: TariffUpdate): Observable<TariffOut> {
    return from(apiCall(() => billingUpdateTariff({ path: { tariff_id: id }, body })));
  }

  public delete(id: string): Observable<void> {
    return from(apiCall(() => billingDeleteTariff({ path: { tariff_id: id } }))).pipe(
      map(() => undefined)
    );
  }
}
