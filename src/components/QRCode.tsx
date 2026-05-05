import QRCode from "qrcode";

type Props = {
  value: string;
  size?: number;
  /** Foreground color for the dark modules. Defaults to REALITY ink. */
  fg?: string;
  /** Background color. Defaults to REALITY cream. */
  bg?: string;
  className?: string;
};

// Server-rendered SVG QR. Inline so it scales cleanly on the projector and
// has no client-side JS cost.
export default async function QRCodeSVG({
  value,
  size = 320,
  fg = "#0d0905",
  bg = "#fffbf1",
  className = "",
}: Props) {
  const svg = await QRCode.toString(value, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: fg, light: bg },
    width: size,
  });
  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
