type WorkerEnv = Record<string, string | undefined>;

export async function getServerEnv(name: string): Promise<string | undefined> {
  try {
    const worker = (await import("cloudflare:workers")) as { env?: WorkerEnv };
    return worker.env?.[name] ?? process.env[name];
  } catch {
    return process.env[name];
  }
}

export async function requireServerEnv(names: string[]) {
  const values = Object.fromEntries(
    await Promise.all(names.map(async (name) => [name, await getServerEnv(name)] as const)),
  ) as Record<string, string | undefined>;

  const missing = names.filter((name) => !values[name]);
  if (missing.length) {
    throw new Error(
      `Missing environment variable(s): ${missing.join(", ")}. Add them with Cloudflare Worker secrets or Wrangler vars.`,
    );
  }

  return values as Record<string, string>;
}
