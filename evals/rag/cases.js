/**
 * Student Handbook RAG Acceptance Evaluation Cases
 * 
 * Curated test cases evaluating factual grounding, policy retrieval,
 * Section 11 override enforcement, out-of-scope refusals, and diagnostic metadata.
 */

export const acceptanceCases = [
  {
    id: 1,
    name: '1. Honors tuition is 58,000,000 VND per semester',
    query: 'What is the tuition fee per semester for the Honors Program?',
    validate: (res) => {
      const hasFee = res.answer.includes('58,000,000');
      const hasSource = res.sources.some(s => s.id?.includes('sec2') || s.title?.includes('Programs at a Glance'));
      return hasFee && hasSource;
    },
  },
  {
    id: 2,
    name: '2. The Honors Program cannot use the installment plan',
    query: 'Can Honors Program students use the installment plan to pay tuition?',
    validate: (res) => {
      const lower = res.answer.toLowerCase();
      const rejectsInstallment =
        (lower.includes('no') || lower.includes('longer available') || lower.includes('cannot') || lower.includes('not available')) &&
        (lower.includes('honors') || lower.includes('installment'));
      const hasSec11 = res.sources.some(s => s.id?.includes('sec11') || s.title?.includes('Amendments'));
      return rejectsInstallment && hasSec11;
    },
  },
  {
    id: 3,
    name: '3. The current make-up exam fee is 200,000 VND',
    query: 'What is the current make-up exam fee?',
    validate: (res) => {
      const hasFee = res.answer.includes('200,000');
      const hasSec11 = res.sources.some(s => s.id?.includes('sec11') || s.title?.includes('Amendments'));
      return hasFee && hasSec11;
    },
  },
  {
    id: 4,
    name: '4. A hospital-certified illness qualifies for a free make-up exam',
    query: 'Does an illness with a hospital certificate qualify for a free make-up exam?',
    validate: (res) => {
      const lower = res.answer.toLowerCase();
      const isFree = lower.includes('free') && (lower.includes('illness') || lower.includes('hospital'));
      const hasSource = res.sources.length > 0;
      return isFree && hasSource;
    },
  },
  {
    id: 5,
    name: '5. Library fine changes to 3,000 VND per book/day on 1 January 2027, capped at 100,000 VND',
    query: 'What is the library late fine, when does it change, and what is the maximum fine?',
    validate: (res) => {
      const has3k = res.answer.includes('3,000');
      const has100k = res.answer.includes('100,000');
      const has2027 = res.answer.includes('2027') || res.answer.includes('January');
      return has3k && has100k && has2027;
    },
  },
  {
    id: 6,
    name: '6. Standard Program borrowing limit is 6 books for 21 days',
    query: 'What is the borrowing limit for Standard Program students at the library?',
    validate: (res) => {
      const has6 = res.answer.includes('6');
      const has21 = res.answer.includes('21');
      const hasSource = res.sources.some(s => s.id?.includes('sec5') || s.title?.includes('Library'));
      return has6 && has21 && hasSource;
    },
  },
  {
    id: 7,
    name: '7. Make-up exam request goes to Academic Affairs Office, Building A, Room 102',
    query: 'Where do I submit a make-up exam request?',
    validate: (res) => {
      const lower = res.answer.toLowerCase();
      const hasLocation =
        lower.includes('academic affairs') &&
        lower.includes('building a') &&
        lower.includes('102');
      const hasSource = res.sources.some(s => s.id?.includes('sec12') || s.title?.includes('Frequently Asked Questions'));
      return hasLocation && hasSource;
    },
  },
  {
    id: 8,
    name: '8. Cryptocurrency trading rejected as outside handbook scope',
    query: 'Can I do cryptocurrency trading on campus?',
    validate: (res) => {
      const lower = res.answer.toLowerCase();
      const isRefusal =
        lower.includes('does not contain enough information') ||
        lower.includes('not have verified information');
      const noSources = res.sources.length === 0;
      return isRefusal && noSources;
    },
  },
  {
    id: 9,
    name: '9. Ambiguous question does not receive unsupported definitive answer',
    query: 'Can I bring my pet to the dormitory?',
    validate: (res) => {
      const lower = res.answer.toLowerCase();
      const isRefusal =
        lower.includes('does not contain enough information') ||
        lower.includes('not have verified information') ||
        lower.includes('not mention');
      return isRefusal;
    },
  },
  {
    id: 10,
    name: '10. In-scope query provides complete inspectable retrieved chunks diagnostics',
    query: 'What is the tuition fee per semester for the Honors Program?',
    validate: (res) => {
      const ret = res.retrieval;
      if (!ret || !Array.isArray(ret.retrievedChunks) || ret.retrievedChunks.length === 0) return false;
      const first = ret.retrievedChunks[0];
      const hasFields =
        first.rank === 1 &&
        typeof first.score === 'number' &&
        Boolean(first.source) &&
        Boolean(first.id) &&
        Boolean(first.content) &&
        first.passedToLLM === true;
      const usedMatches = Array.isArray(ret.usedChunks) && ret.usedChunks.length === ret.retrievedChunks.length;
      return hasFields && usedMatches;
    },
  },
  {
    id: 11,
    name: '11. Out-of-scope query preserves inspectable retrieved chunks before filtering',
    query: 'Can I do cryptocurrency trading on campus?',
    validate: (res) => {
      const ret = res.retrieval;
      if (!ret || !Array.isArray(ret.retrievedChunks) || ret.retrievedChunks.length === 0) return false;
      const first = ret.retrievedChunks[0];
      const hasFields =
        first.rank === 1 &&
        typeof first.score === 'number' &&
        Boolean(first.source) &&
        Boolean(first.id) &&
        Boolean(first.content) &&
        first.passedToLLM === false;
      const usedEmpty = Array.isArray(ret.usedChunks) && ret.usedChunks.length === 0;
      return hasFields && usedEmpty;
    },
  },
];
