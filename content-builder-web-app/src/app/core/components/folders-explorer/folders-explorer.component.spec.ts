import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Store } from '@ngxs/store';
import { of } from 'rxjs';
import { AppFilesStorageService, AppFoldersStorageService, AppTariffsStorageService } from '@/core/api';
import { AppLoading } from '@/core/store';
import { FoldersExplorerService } from '@/core/utils';
import { AppDialogService } from '@/core/services/app-dialog.service';
import { ArticleEditorService } from '../article-editor';
import { TestsEditorService } from '../test-editor';
import { RescueEditorService } from '../rescue-editor';
import { TariffsEditorService } from '../tariffs-editor';
import { PromoCodesEditorService } from '../promo-codes-editor';
import { AchievementsEditorService } from '../achievements-editor';
import { RewardsEditorService } from '../rewards-editor';
import { StatsResetEditorService } from '../stats-reset-editor/stats-reset-editor.component';
import { SubscriptionRefundEditorService } from '../subscription-refund-editor/subscription-refund-editor.component';
import { LegalDocsEditorService } from '../legal-docs-editor/legal-docs-editor.component';
import { CertificatesEditorService } from '../certificates-editor/certificates-editor.component';
import { FolderPropertiesService } from '../folder-properties/folder-properties.component';
import { SetItemTariffService } from '../set-item-tariff/set-item-tariff.component';
import { FoldersExplorerComponent } from './folders-explorer.component';

describe('FoldersExplorerComponent derived state', () => {
  it('updates and caches filtered options for both panels', async () => {
    const emptyServices = [AppDialogService, ArticleEditorService, TestsEditorService, RescueEditorService,
      TariffsEditorService, PromoCodesEditorService, AchievementsEditorService, RewardsEditorService,
      StatsResetEditorService, SubscriptionRefundEditorService, LegalDocsEditorService,
      CertificatesEditorService, FolderPropertiesService, SetItemTariffService, AppFilesStorageService,
      AppFoldersStorageService, MatSnackBar, HttpClient];
    await TestBed.configureTestingModule({
      imports: [FoldersExplorerComponent],
      providers: [
        ...emptyServices.map((provide) => ({ provide, useValue: {} })),
        { provide: Store, useValue: { selectSignal: () => signal(() => []), dispatch: () => of(null) } },
        { provide: AppLoading, useValue: { isDispatched: () => signal(false) } },
        { provide: AppTariffsStorageService, useValue: { listAll: () => of([]) } },
        { provide: FoldersExplorerService, useValue: { clipboard: signal(null), beginRename: signal(null), selectedId: signal(null) } }
      ]
    }).overrideComponent(FoldersExplorerComponent, { set: { template: '' } }).compileComponents();

    const fixture = TestBed.createComponent(FoldersExplorerComponent);
    const component = fixture.componentInstance as any;
    component._leftOptions.set([{ id: '1', name: 'Alpha' }, { id: '2', name: 'Beta' }]);
    component._rightOptions.set([{ id: '3', name: 'Gamma' }]);
    component._leftSearchQuery.set(' ALP ');
    const selectOptions = component._getPanelOptions();
    expect(selectOptions('left').map((item: { id: string }) => item.id)).toEqual(['1']);
    expect(selectOptions('left')).toBe(selectOptions('left'));
    expect(selectOptions('right').map((item: { id: string }) => item.id)).toEqual(['3']);
    component._rightSearchQuery.set('missing');
    expect(component._getPanelOptions()('right')).toEqual([]);
    component._leftSearchQuery.set('beta');
    expect(component._getPanelOptions()('left').map((item: { id: string }) => item.id)).toEqual(['2']);
    fixture.destroy();
  });
});
