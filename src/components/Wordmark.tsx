import Link from "next/link";

// The wordmark doubles as the "home" affordance (standard convention — there
// was previously no way back to the landing page from deeper screens).
export default function Wordmark({
  className = "",
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={`font-mark font-semibold text-xl uppercase ${className}`}
      style={{ letterSpacing: "0.1em" }}
    >
      REALITY
    </Link>
  );
}
