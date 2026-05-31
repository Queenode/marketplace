import { describe, it, expect, vi } from 'vitest';

vi.mock('../parser.js', () => ({
  parseMarketplaceEvent: vi.fn((topics: string[], _valueXdr: string, ledger: number) => ({
    eventType: topics[0],
    listingId: BigInt(ledger),
    actor: 'GTEST',
    ledgerSequence: ledger,
    data: { ledger },
  })),
}));

import { collectMarketplaceEvents, MAX_LEDGER_WINDOW } from '../event-sync';

describe('collectMarketplaceEvents', () => {
  it('follows pagination tokens until the page is exhausted', async () => {
    const getEvents = vi.fn()
      .mockResolvedValueOnce({
        events: [
          { topic: ['page-1'], value: 'value-1', ledger: 1 },
          { topic: ['page-1'], value: 'value-2', ledger: 2 },
        ],
        paginationToken: 'page-2',
      })
      .mockResolvedValueOnce({
        events: [
          { topic: ['page-2'], value: 'value-3', ledger: 3 },
        ],
        paginationToken: null,
      });

    const server = { getEvents } as any;
    const events = await collectMarketplaceEvents(server, ['C1'], 1, 10);

    expect(events).toHaveLength(3);
    expect(getEvents).toHaveBeenNthCalledWith(1, expect.objectContaining({
      startLedger: 1,
      endLedger: 10,
      pagination: { limit: 100 },
    }));
    expect(getEvents).toHaveBeenNthCalledWith(2, expect.objectContaining({
      startLedger: 1,
      endLedger: 10,
      pagination: { limit: 100, cursor: 'page-2' },
    }));
  });

  it('advances through multiple ledger windows', async () => {
    const getEvents = vi.fn().mockResolvedValue({ events: [], paginationToken: null });
    const server = { getEvents } as any;

    await collectMarketplaceEvents(server, ['C1'], 1, MAX_LEDGER_WINDOW + 5);

    expect(getEvents).toHaveBeenCalledTimes(2);
    expect(getEvents).toHaveBeenNthCalledWith(1, expect.objectContaining({ startLedger: 1 }));
    expect(getEvents).toHaveBeenNthCalledWith(2, expect.objectContaining({ startLedger: MAX_LEDGER_WINDOW + 1 }));
  });
});