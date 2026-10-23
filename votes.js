// Vote API for the FH Helsinki merch page.
// GET  /api/votes?voter=<id>                 -> { counts, voters, mine }
// POST /api/votes { voter, shirt, on: bool } -> same shape, after saving the vote
//
// Storage: Upstash Redis (added in Vercel under Storage / Marketplace).
//   shirt:<id>  set of voter ids who voted for that shirt
//   voter:<id>  set of shirts that voter picked
//   voters      set of voter ids with at least one vote
import { Redis } from "@upstash/redis";

const SHIRTS = ["reactor", "reactor-mono", "go-found", "fh-hel", "branded", "tower", "block", "choose", "skull"];
const VOTER = /^[a-f0-9-]{36}$/;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

async function snapshot(voter) {
  const p = redis.pipeline();
  SHIRTS.forEach((s) => p.scard(`shirt:${s}`));
  p.scard("voters");
  if (VOTER.test(voter)) p.smembers(`voter:${voter}`);
  const r = await p.exec();
  const counts = Object.fromEntries(SHIRTS.map((s, i) => [s, Number(r[i]) || 0]));
  const mine = VOTER.test(voter) ? (r[SHIRTS.length + 1] || []).filter((s) => SHIRTS.includes(s)) : [];
  return { counts, voters: Number(r[SHIRTS.length]) || 0, mine };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      return res.status(200).json(await snapshot(String(req.query.voter || "")));
    }
    if (req.method === "POST") {
      const { voter, shirt, on } = req.body || {};
      if (!VOTER.test(String(voter || "")) || !SHIRTS.includes(shirt) || typeof on !== "boolean") {
        return res.status(400).json({ error: "Invalid vote" });
      }
      const p = redis.pipeline();
      if (on) {
        p.sadd(`shirt:${shirt}`, voter);
        p.sadd(`voter:${voter}`, shirt);
        p.sadd("voters", voter);
      } else {
        p.srem(`shirt:${shirt}`, voter);
        p.srem(`voter:${voter}`, shirt);
      }
      await p.exec();
      if (!on && (await redis.scard(`voter:${voter}`)) === 0) await redis.srem("voters", voter);
      return res.status(200).json(await snapshot(voter));
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Votes are unavailable right now" });
  }
}
