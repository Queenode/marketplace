import { Router, Request, Response } from 'express';
import prisma from '../db.js';
import redis from '../redis.js';

const router = Router();

const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_CACHE_TTL_SECONDS || '30');

async function getCached<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
    try {
        const cached = await redis.get(key);
        if (cached) return JSON.parse(cached) as T;
    } catch {
        // Redis unavailable — fall through to DB
    }
    const result = await fetcher();
    try {
        await redis.set(key, JSON.stringify(result), 'EX', ttl);
    } catch {
        // ignore cache write failures
    }
    return result;
}

// Helper to serialize BigInts to strings for JSON
const serialize = (obj: any) =>
    JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));

// GET /listings?artist= — all listings created by an artist
router.get('/listings', async (req: Request, res: Response) => {
    const { artist, owner } = req.query;
    try {
        const where: any = {};
        if (artist) where.artist = artist as string;
        if (owner) where.owner = owner as string;

        const results = await prisma.listing.findMany({
            where,
            orderBy: { updatedAtLedger: 'desc' },
        });
        res.json(serialize(results));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch listings' });
    }
});

// GET /listings/:id/history — full event timeline for a single listing
router.get('/listings/:id/history', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const results = await prisma.marketplaceEvent.findMany({
            where: { listingId: BigInt(id as string) },
            orderBy: { ledgerSequence: 'asc' },
        });
        res.json(serialize(results));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch listing history' });
    }
});

// GET /activity/recent — latest sales and listings across the marketplace
router.get('/activity/recent', async (req: Request, res: Response) => {
    try {
        const results = await getCached('activity:recent', CACHE_TTL_SECONDS, () =>
            prisma.marketplaceEvent.findMany({
                take: 20,
                orderBy: { ledgerSequence: 'desc' },
            })
        );
        res.json(serialize(results));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch recent activity' });
    }
});


// GET /collections — all deployed collections
router.get('/collections', async (req: Request, res: Response) => {
    const { kind, creator } = req.query;
    try {
        const where: any = {};
        if (kind)    where.kind    = kind as string;
        if (creator) where.creator = creator as string;
        const cacheKey = `collections:${kind ?? ''}:${creator ?? ''}`;
        const results = await getCached(cacheKey, CACHE_TTL_SECONDS, () =>
            prisma.collection.findMany({
                where,
                orderBy: { deployedAtLedger: 'desc' },
            })
        );
        res.json(serialize(results));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch collections' });
    }
});

// GET /creators/:address/collections — collections deployed by a creator
router.get('/creators/:address/collections', async (req: Request, res: Response) => {
    const { address } = req.params;
    try {
        const results = await prisma.collection.findMany({
            where: { creator: address as string },
            orderBy: { deployedAtLedger: 'desc' },
        });
        res.json(serialize(results));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch creator collections' });
    }
});

export default router;

