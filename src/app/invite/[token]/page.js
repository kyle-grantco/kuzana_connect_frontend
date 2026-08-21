// src/app/invite/[token]/page.js
//
// Public invite landing page. Two responsibilities:
//  1. Server-side: generate OpenGraph/Twitter metadata so the link unfurls in
//     WhatsApp with the inviter's name + photo ("{Name} invited you to Kuzana
//     Connect"). This is the wooing — the preview does the selling.
//  2. Client-side (InviteClient): validate the token live, show the inviter and
//     a Continue CTA, or an invalid/used/cancelled state. Continue routes to
//     /auth/register?invite={token}, carrying the token in the URL (source of
//     truth; survives refresh, new tabs, bookmarks) and mirroring it into
//     sessionStorage as a fallback.
//
// This route is PUBLIC and lives OUTSIDE the (app) auth group, same level as
// /terms and /privacy.

import InviteClient from "./InviteClient";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://connect.kuzana.co";

// Server-side token check for metadata only. Never throws — bad tokens just
// fall back to generic copy, and the client does the authoritative check.
async function fetchInviter(token) {
  try {
    const res = await fetch(
      `${API_URL}/invites/check/${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.valid ? data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { token } = await params;
  const inviter = await fetchInviter(token);

  const title = inviter?.inviter_name
    ? `${inviter.inviter_name} invited you to Kuzana Connect`
    : "You've been invited to Kuzana Connect";
  const description =
    "Kuzana Connect is an invite-only network of trusted entrepreneurs. " +
    "Accept your invitation to join and be introduced.";

  const images = inviter?.inviter_photo_url
    ? [{ url: inviter.inviter_photo_url }]
    : [{ url: `${SITE_URL}/og-image.png` }];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/invite/${token}`,
      siteName: "Kuzana Connect",
      images,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((i) => i.url),
    },
    robots: { index: false, follow: false },
  };
}

export default async function InvitePage({ params }) {
  const { token } = await params;
  return <InviteClient token={token} />;
}
