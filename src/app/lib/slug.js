// Turn a display name into a URL slug: "Abraham Mwangi" -> "abraham-mwangi".
// The profile URL is `{slug}-{member_number}`; lookup uses the number, the slug
// is cosmetic/shareable.
export function slugify(name = "") {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Extract the trailing member number from a slug like "abraham-mwangi-34".
export function memberNumberFromSlug(slug = "") {
  const m = slug.match(/-(\d+)$/) || slug.match(/^(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}
