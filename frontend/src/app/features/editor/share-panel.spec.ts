import { TestBed } from '@angular/core/testing';
import { PatternApi } from '../../api/pattern-api';
import { SharePanel } from './share-panel';

describe('SharePanel', () => {
  const setup = async (slug: string | null) => {
    const api = {
      shareStatus: vi.fn(() => Promise.resolve({ slug })),
      share: vi.fn(() => Promise.resolve({ slug: 'abc' })),
      revokeShare: vi.fn(() => Promise.resolve()),
    };
    TestBed.configureTestingModule({
      imports: [SharePanel],
      providers: [{ provide: PatternApi, useValue: api }],
    });
    const fixture = TestBed.createComponent(SharePanel);
    fixture.componentRef.setInput('chartId', 'a');
    await fixture.whenStable();
    return { fixture, api, panel: fixture.componentInstance };
  };

  it('offers to create a link for a chart without one', async () => {
    const { panel } = await setup(null);

    expect(panel.url()).toBeNull();
  });

  it('shows an existing link', async () => {
    const { panel } = await setup('xyz');

    expect(panel.url()).toBe(`${location.origin}/share/xyz`);
  });

  it('creates a link', async () => {
    const { panel, api } = await setup(null);

    await panel.create();

    expect(api.share).toHaveBeenCalledWith('a');
    expect(panel.url()).toContain('/share/abc');
  });

  it('revokes a link', async () => {
    const { panel, api } = await setup('xyz');

    await panel.revoke();

    expect(api.revokeShare).toHaveBeenCalledWith('a');
    expect(panel.url()).toBeNull();
  });

  it('shows why something failed', async () => {
    const { panel, api } = await setup(null);
    api.share.mockRejectedValueOnce(new Error('nope'));

    await panel.create();

    expect(panel.error()).toContain('went wrong');
  });
});
