export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <div
      className={`font-mark font-semibold text-xl uppercase ${className}`}
      style={{ letterSpacing: "0.1em" }}
    >
      REALITY
    </div>
  );
}
