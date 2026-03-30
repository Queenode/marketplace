import { Router } from 'express';
import prisma from '../db';
const router = Router();
// Helper to serialize BigInts to strings for JSON
const serialize = (obj) => JSON.parse(JSON.stringify(obj, (key, value) => typeof value === 'bigint' ? value.toString() : value));
// GET /listings?artist= — all listings created by an artist
router.get('/listings', async (req, res) => {
    const { artist, owner } = req.query;
    try {
        const where = {};
        if (artist)
            where.artist = artist;
        if (owner)
            where.owner = owner;
        const results = await prisma.listing.findMany({
            where,
            orderBy: { updatedAtLedger: 'desc' },
        });
        res.json(serialize(results));
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch listings' });
    }
});
// GET /listings/:id/history — full event timeline for a single listing
router.get('/listings/:id/history', async (req, res) => {
    const { id } = req.params;
    try {
        const results = await prisma.marketplaceEvent.findMany({
            where: { listingId: BigInt(id) },
            orderBy: { ledgerSequence: 'asc' },
        });
        res.json(serialize(results));
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch listing history' });
    }
});
// GET /activity/recent — latest sales and listings across the marketplace
router.get('/activity/recent', async (req, res) => {
    try {
        const results = await prisma.marketplaceEvent.findMany({
            take: 20,
            orderBy: { ledgerSequence: 'desc' },
        });
        res.json(serialize(results));
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch recent activity' });
    }
});
// GET /collections — all deployed collections
router.get('/collections', async (req, res) => {
    const { kind, creator } = req.query;
    try {
        const where = {};
        if (kind)
            where.kind = kind;
        if (creator)
            where.creator = creator;
        const results = await prisma.collection.findMany({
            where,
            orderBy: { deployedAtLedger: 'desc' },
        });
        res.json(serialize(results));
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch collections' });
    }
});
// GET /creators/:address/collections — collections deployed by a creator
router.get('/creators/:address/collections', async (req, res) => {
    const { address } = req.params;
    try {
        const results = await prisma.collection.findMany({
            where: { creator: address },
            orderBy: { deployedAtLedger: 'desc' },
        });
        res.json(serialize(results));
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch creator collections' });
    }
});
export default router;
