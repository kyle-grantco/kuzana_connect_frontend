@AGENTS.md

Every member-facing card or profile header shows a vouch count via the VouchCount component. Every endpoint returning member objects to member-facing views includes vouch_count, computed by aggregate query, never per-member calls.
In-app cards and headers always show the count: 0 renders as "0 vouches" (the owner sees an invite prompt instead). Comms (emails, WhatsApp, notifications, invite pages) and incomplete profiles show it only when above 0. Exempt: the rows inside the vouches list itself.
