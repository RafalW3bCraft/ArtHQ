import https from "node:https";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { createHash } from "node:crypto";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { NewsCandidate } from "../shared/generation";
const denied = new BlockList();
for (const [address, bits] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  denied.addSubnet(address, bits, "ipv4");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
const deniedV6 = new BlockList();
for (const [address, bits] of [
  ["2001::", 32],
  ["2001:db8::", 32],
  ["2002::", 16],
] as const)
  deniedV6.addSubnet(address, bits, "ipv6");
export function publicAddress(address: string) {
  const family = isIP(address);
  return family === 4
    ? !denied.check(address, "ipv4")
    : family === 6 &&
        globalV6.check(address, "ipv6") &&
        !deniedV6.check(address, "ipv6");
}
export function feedUrl(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    url.href.length > 2000
  )
    throw Object.assign(
      new Error(
        "Use a public HTTPS feed URL without credentials or a custom port.",
      ),
      { status: 400 },
    );
  url.hash = "";
  return url;
}
// Pin the validated DNS answer to the actual socket; validating before fetch()
// alone would permit a second DNS lookup to rebind to a private address.
export async function fetchFeed(value: string): Promise<string> {
  const deadline = Date.now() + 15000;
  const abort = AbortSignal.timeout(15000);
  let url = feedUrl(value);
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (abort.aborted || Date.now() >= deadline)
      throw new Error("Feed timed out.");
    const host = url.hostname.replace(/^\[|\]$/g, "");
    const addresses = await Promise.race([
      lookup(host, { all: true }),
      new Promise<never>((_, reject) => {
        abort.addEventListener(
          "abort",
          () => reject(new Error("Feed timed out.")),
          { once: true },
        );
      }),
    ]);
    if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
      throw Object.assign(
        new Error("Feed must resolve to a public internet address."),
        { status: 400 },
      );
    const address = addresses[0];
    const result = await new Promise<{ location?: string; body: string }>(
      (resolve, reject) => {
        const req = https.get(
          url,
          {
            signal: abort,
            timeout: Math.max(1, deadline - Date.now()),
            family: address.family,
            lookup: ((
              _hostname: string,
              _options: unknown,
              callback: Function,
            ) => callback(null, address.address, address.family)) as any,
            headers: {
              Accept:
                "application/rss+xml, application/atom+xml, application/xml, text/xml",
              "User-Agent": "ArtHQ-FeedReader/1.0",
              "Accept-Encoding": "identity",
            },
          },
          (res) => {
            if ([301, 302, 303, 307, 308].includes(res.statusCode || 0)) {
              res.resume();
              resolve({ location: res.headers.location, body: "" });
              return;
            }
            if (
              res.statusCode !== 200 ||
              !/xml|rss|atom/i.test(String(res.headers["content-type"] || ""))
            ) {
              res.resume();
              reject(
                new Error("The source did not return an RSS or Atom feed."),
              );
              return;
            }
            const chunks: Buffer[] = [];
            let size = 0;
            res.on("data", (chunk) => {
              size += chunk.length;
              if (size > 1024 * 1024) {
                res.destroy(new Error("Feed exceeds 1 MB."));
                return;
              }
              chunks.push(chunk);
            });
            res.on("end", () =>
              resolve({ body: Buffer.concat(chunks).toString("utf8") }),
            );
            res.on("error", reject);
          },
        );
        req.on("timeout", () => req.destroy(new Error("Feed timed out.")));
        req.on("error", reject);
      },
    );
    if (!result.location) {
      if (!result.body)
        throw new Error("Feed redirect was missing its destination.");
      return result.body;
    }
    url = feedUrl(new URL(result.location, url).href);
  }
  throw new Error("Feed redirected too many times.");
}
const list = (value: any): any[] =>
  value == null ? [] : Array.isArray(value) ? value : [value];
function plain(value: any, max: number): string {
  const text =
    typeof value === "object" ? (value?.["#text"] ?? "") : (value ?? "");
  return String(text)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
export function parseFeed(
  xml: string,
  feedId: string,
  baseUrl: string,
): NewsCandidate[] {
  if (
    Buffer.byteLength(xml) > 1024 * 1024 ||
    /<!\s*(DOCTYPE|ENTITY)/i.test(xml) ||
    XMLValidator.validate(xml) !== true
  )
    throw new Error("Invalid or unsafe feed XML.");
  let depth = 0,
    nodes = 0;
  for (const token of xml.matchAll(
    /<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|<\/?[^>]+>/g,
  )) {
    const tag = token[0];
    if (tag.startsWith("<!") || tag.startsWith("<?")) continue;
    if (tag.startsWith("</")) depth--;
    else if (!tag.endsWith("/>")) depth++;
    if (depth > 50 || ++nodes > 10000)
      throw new Error("Feed XML is too complex.");
  }
  const data = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    processEntities: true,
    parseTagValue: false,
    htmlEntities: false,
  }).parse(xml);
  const entries = data.rss?.channel?.item ?? data.feed?.entry ?? data.RDF?.item;
  if (!data.rss && !data.feed && !data.RDF)
    throw new Error("Expected an RSS or Atom feed.");
  const seen = new Set<string>();
  return list(entries)
    .flatMap((entry) => {
      const link = list(entry.link).find(
        (link) =>
          typeof link === "string" ||
          !link?.["@_rel"] ||
          link["@_rel"] === "alternate",
      );
      const raw =
        typeof link === "string" ? link : (link?.["@_href"] ?? link?.["#text"]);
      let url: URL;
      try {
        url = feedUrl(new URL(raw, baseUrl).href);
        for (const key of [...url.searchParams.keys()])
          if (
            /^utm_/i.test(key) ||
            ["fbclid", "gclid", "msclkid"].includes(key)
          )
            url.searchParams.delete(key);
        url.searchParams.sort();
      } catch {
        return [];
      }
      const title = plain(entry.title, 160);
      if (!title || !raw || seen.has(url.href)) return [];
      seen.add(url.href);
      const date = Date.parse(
        plain(
          entry.pubDate ?? entry.published ?? entry.updated ?? entry.date,
          100,
        ),
      );
      return [
        {
          id: createHash("sha256").update(url.href).digest("hex"),
          feedId,
          title,
          sourceUrl: url.href,
          summary: plain(
            entry.description ??
              entry.summary ??
              entry.content ??
              entry.encoded,
            12000,
          ),
          sourceDate: Number.isFinite(date) ? new Date(date).toISOString() : "",
          createdAt: new Date().toISOString(),
        },
      ];
    })
    .sort((a, b) => b.sourceDate.localeCompare(a.sourceDate))
    .slice(0, 20);
}
