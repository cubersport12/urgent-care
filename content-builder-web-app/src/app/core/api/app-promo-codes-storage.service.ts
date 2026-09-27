import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import {
  billingCreatePromoCode,
  billingDeletePromoCode,
  billingListPromoCodes,
  billingUpdatePromoCode
} from '@/core/api/generated/sdk.gen';
import type { PromoCodeCreate, PromoCodeOut, PromoCodeUpdate } from '@/core/api/generated/types.gen';
import { apiCall } from './api-utils';

@Injectable({
  providedIn: 'root'
})
export class AppPromoCodesStorageService {
  public listAll(): Observable<PromoCodeOut[]> {
    return from(apiCall(() => billingListPromoCodes())).pipe(map((x) => x ?? []));
  }

  public create(body: PromoCodeCreate): Observable<PromoCodeOut> {
    return from(apiCall(() => billingCreatePromoCode({ body })));
  }

  public update(id: string, body: PromoCodeUpdate): Observable<PromoCodeOut> {
    return from(apiCall(() => billingUpdatePromoCode({ path: { promo_id: id }, body })));
  }

  public delete(id: string): Observable<void> {
    return from(apiCall(() => billingDeletePromoCode({ path: { promo_id: id } }))).pipe(
      map(() => undefined)
    );
  }
}
