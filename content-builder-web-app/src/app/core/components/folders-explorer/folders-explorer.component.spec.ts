import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { OverlayContainer } from '@angular/cdk/overlay';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
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

describe('FoldersExplorerComponent', () => {
  beforeEach(() => {
    const emptyServices = [AppDialogService, ArticleEditorService, TestsEditorService, RescueEditorService,
      TariffsEditorService, PromoCodesEditorService, AchievementsEditorService, RewardsEditorService,
      StatsResetEditorService, SubscriptionRefundEditorService, LegalDocsEditorService,
      CertificatesEditorService, FolderPropertiesService, SetItemTariffService, AppFilesStorageService,
      AppFoldersStorageService, MatSnackBar, HttpClient];
    TestBed.configureTestingModule({
      imports: [FoldersExplorerComponent, MatIconTestingModule],
      providers: [
        provideRouter([]),
        ...emptyServices.map((provide) => ({ provide, useValue: {} })),
        { provide: Store, useValue: { selectSignal: () => signal(() => []), dispatch: () => of(null) } },
        { provide: AppLoading, useValue: { isDispatched: () => signal(false) } },
        { provide: AppTariffsStorageService, useValue: { listAll: () => of([]) } },
        { provide: FoldersExplorerService, useValue: { clipboard: signal(null), beginRename: signal(null), selectedId: signal(null) } }
      ]
    });
  });

  it('updates and caches filtered options for both panels', async () => {
    await TestBed.overrideComponent(FoldersExplorerComponent, { set: { template: '' } }).compileComponents();
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

  it('opens the actions menu for the row button and for a right click', async () => {
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(FoldersExplorerComponent);
    const component = fixture.componentInstance as any;
    component._leftOptions.set([{ id: '1', name: 'Alpha', type: 'folder' }]);
    component._rightOptions.set([{ id: '2', name: 'Beta', type: 'article' }]);
    fixture.detectChanges();

    const explorer: HTMLElement = fixture.nativeElement;
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    const leftRow = explorer.querySelector<HTMLElement>('[data-tc-item-id="1"]')!;
    const more = leftRow.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!;
    more.click();
    fixture.detectChanges();
    expect(overlay.querySelector('[role="menu"]')?.textContent).toContain('Свойства папки');
    expect(leftRow.classList.contains('tc-row-selected')).toBe(false);

    const rightRow = explorer.querySelector<HTMLElement>('[data-tc-item-id="2"]')!;
    rightRow.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }));
    fixture.detectChanges();
    expect(rightRow.querySelector('button[aria-expanded="true"]')).not.toBeNull();
    const copy = Array.from(overlay.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
      .find((item) => item.textContent?.trim() === 'Копировать')!;
    copy.click();
    expect(TestBed.inject(FoldersExplorerService).clipboard()?.item.id).toBe('2');

    more.focus();
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    more.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(false);
  });
});
