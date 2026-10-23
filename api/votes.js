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

// Vercel names the database keys differently depending on how Upstash was added
// (UPSTASH_REDIS_REST_*, KV_REST_API_*, or either with a custom prefix), so find them by suffix.
function findEnv(suffixes) {
  const keys = Object.keys(process.env);
  for (const suffix of suffixes) {
    const key = keys.find((k) => k.endsWith(suffix) && !k.includes("READ_ONLY") && process.env[k]);
    if (key) return process.env[key];
  }
  return undefined;
}
const url = findEnv(["UPSTASH_REDIS_REST_URL", "KV_REST_API_URL"]);
const token = findEnv(["UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_TOKEN"]);
const redis = url && token ? new Redis({ url, token }) : null;

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
  if (!redis) {
    return res.status(503).json({ error: "Votes are unavailable right now", reason: "no-database" });
  }
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
