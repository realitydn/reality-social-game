// Central place for REALITY's outward-facing links — socials + Google review.
// These aren't secrets and don't change per deploy, so they live here as
// constants rather than env vars. Swap the TODO placeholders for the real URLs.

export const REALITY_LINKS = {
  /** Public website — brand-mandated on all materials. */
  website: "https://www.realitydn.com",

  /**
   * Where the projector "follow our socials" QR points. Defaults to the
   * website (which links out to every social). Point it straight at Instagram,
   * a Linktree, or a /socials hub if you'd rather.
   * TODO(reality): set to the preferred socials destination.
   */
  socials: "https://www.realitydn.com",

  /**
   * "Leave us a Google review" target for the home-screen prompt.
   *
   * The default is a Google Maps *search* for the venue — it works (lands on
   * our listing, where the Reviews tab is one tap away) but isn't the ideal
   * one-tap "write a review" deep link.
   *
   * TODO(reality): replace with the direct review link from Google Business
   * Profile → "Ask for reviews" → copy link. It looks like
   *   https://g.page/r/XXXXXXXXXXXX/review
   * or  https://search.google.com/local/writereview?placeid=XXXXXXXXXXXX
   */
  googleReview:
    "https://www.google.com/maps/search/?api=1&query=REALITY%2086%20Mai%20Th%C3%BAc%20L%C3%A2n%20%C4%90%C3%A0%20N%E1%BA%B5ng",
} as const;
