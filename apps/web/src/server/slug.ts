import { randomInt } from "node:crypto";

const MAX_ATTEMPTS = 10;

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
}

export async function generateUniqueProjectSlug(
  name: string,
  isTaken: (slug: string) => Promise<boolean>,
) {
  const base = slugify(name) || "project";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const digits = Array.from({ length: 8 }, () => randomInt(10)).join("");
    const slug = `${base}-${digits}`;
    if (!(await isTaken(slug))) return slug;
  }

  throw new Error("Could not generate a unique slug");
}
