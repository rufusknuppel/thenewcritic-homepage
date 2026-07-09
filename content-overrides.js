// Manual text overrides for the cards on the generated pages.
//
// Entries are keyed by the post's URL slug — the part after /p/ in its
// address: https://www.thenewcritic.com/p/luddite-club -> 'luddite-club'.
// An override follows its post wherever it appears (hero, Most Read,
// section grids, list pages, archive).
//
// Every field is optional — leave one out (or set it to '') and the text
// pulled from the feed is used instead. All values are plain text, not HTML.
//
//   kicker:  the small courier header above the title (e.g. 'To Phone or
//            Not'). Only rendered while the post is the hero card.
//   title:   the card's headline.
//   dek:     the subheading under the title (Substack calls it the subtitle).
//   author:  the byline in the meta line, shown uppercase.
//   date:    the date text in the meta line, e.g. 'Jun 30', shown uppercase.
//            The like count beside it stays automatic.
//   preview: the paragraph preview — shown on the hero card and in the
//            hover popups. A string, or an array of strings to fill the
//            hero card with multiple paragraphs.
//
// Template:
//
//   'some-post-slug': {
//     kicker: '',
//     title: '',
//     dek: '',
//     author: '',
//     date: '',
//     preview: '',
//   },

module.exports = {
  'luddite-club': {
    kicker: 'To Phone or Not',
  },
  'the-commodification-of-freya-india': {
    kicker: 'The Girl Behind Girls',
    preview: [
      'Maybe you have heard of Freya India. She is a frequent guest on podcasts hosted by middle-aged men, her interviews are clipped into Reels and TikToks and reposted all over the internet, and she has over 54,000 subscribers on Substack.',
      'India paints a dystopian, conservative picture of the gen z woman, psychologically damaged by social media, porn, godlessness, decadence, and divorce. India, investigating the source of her own problems, applies her critique to the culture at large. Girls in general, she contends, feel like India once did — lonely, insecure, and scared.',
      'India, hailing from Essex, England, is only 26. She’s a contributing writer at The Free Press and a contributing “Gen Z voice” for Jonathan Haidt’s After Babel. Now she’s written a mass-market book aptly titled Girls: The Commodification of Everything.',
      'Fellow mass cultural critics have been quick to anoint her.',
    ],
  },
};
