// Hand-authored "rich" overrides — the per-post fields that are too long or
// too structured to live in the Website Meta spreadsheet: multi-paragraph
// previews, cover-image focal points, and any title/dek/date corrections.
//
// make-overrides.js merges this file with the spreadsheet's kicker+author
// columns into content-overrides.js — the file the build actually reads.
// Fields set here WIN over the sheet (so a hand-correction beats the bulk
// data). Keyed by post slug, same as content-overrides.js; every field is
// optional. See content-overrides.js's header for the field reference.
//
// This file is hand-edited and committed. To add a preview or focal point,
// edit here and run `npm run overrides`.

module.exports = {
  'the-doctor-of-girlhood': {
    kicker: 'Books',
  },
  'the-commodification-of-freya-india': {
    preview: [
      'Maybe you have heard of Freya India. She is a frequent guest on podcasts hosted by middle-aged men, her interviews are clipped into Reels and TikToks and reposted all over the internet, and she has over 54,000 subscribers on Substack.',
      'India paints a dystopian, conservative picture of the gen z woman, psychologically damaged by social media, porn, godlessness, decadence, and divorce. India, investigating the source of her own problems, applies her critique to the culture at large. Girls in general, she contends, feel like India once did — lonely, insecure, and scared.',
      'India, hailing from Essex, England, is only 26. She’s a contributing writer at The Free Press and a contributing “Gen Z voice” for Jonathan Haidt’s After Babel. Now she’s written a mass-market book aptly titled Girls: The Commodification of Everything.',
      'Fellow mass cultural critics have been quick to anoint her.',
    ],
  },
};
