// The Kuzana brand logo (transparent PNG in /public).
// Used on the auth/welcome pages (brand front door) and the in-app header.
// Place the logo file at: public/kuzana-logo.png
export default function Logo({ size = 40, withText = false, className = "" }) {
  return (
    <span className={"inline-flex items-center gap-2 " + className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/kuzana-logo.png"
        alt="Kuzana"
        width={size}
        height={size}
        style={{ height: size, width: "auto" }}
        className="object-contain"
      />
      {withText && (
        <span className="text-sm font-semibold text-brand-navy">
          Kuzana Connect
        </span>
      )}
    </span>
  );
}
