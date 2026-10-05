import {
  listRecommendationCandidates,
  listRecommendationHistory,
} from '../repositories/recommendations.repository.js';

const CATEGORY_WEIGHT = 3;
const AUTHOR_WEIGHT = 1;
const SESSION_SUPPORT_CAP = 0.25;
const SESSION_SUPPORT_SECONDS = 1200;
const RECOMMENDATION_LIMIT = 12;

function sourceWeight(source) {
  const progress = Math.max(0, Math.min(100, Number(source.progress_percent) || 0));
  const readingSeconds = Math.max(0, Number(source.reading_seconds) || 0);
  const progressSupport = progress / 100;
  const sessionSupport = Math.min(
    readingSeconds / SESSION_SUPPORT_SECONDS,
    SESSION_SUPPORT_CAP
  );

  // This weight expresses observed interaction depth, not whether the reader liked a title.
  return 1 + progressSupport + sessionSupport;
}

function addProfileWeight(profile, key, name, weight) {
  const existing = profile.get(key);
  if (existing) {
    existing.weight += weight;
  } else {
    profile.set(key, { id: key, name, weight });
  }
}

function buildProfile(history) {
  const categories = new Map();
  const authors = new Map();

  for (const source of history) {
    const weight = sourceWeight(source);
    for (const category of source.categories || []) {
      addProfileWeight(categories, category.id, category.name, weight);
    }
    for (const author of source.authors || []) {
      addProfileWeight(authors, author.id, author.displayName, weight);
    }
  }

  return { categories, authors };
}

function recommendationFor(candidate, profile) {
  const matchedCategories = (candidate.categories || []).filter((category) =>
    profile.categories.has(category.id)
  );
  const matchedAuthors = (candidate.authors || []).filter((author) =>
    profile.authors.has(author.id)
  );

  const categoryScore = matchedCategories.reduce(
    (sum, category) => sum + profile.categories.get(category.id).weight * CATEGORY_WEIGHT,
    0
  );
  const authorScore = matchedAuthors.reduce(
    (sum, author) => sum + profile.authors.get(author.id).weight * AUTHOR_WEIGHT,
    0
  );
  const score = Math.round((categoryScore + authorScore) * 100) / 100;

  if (score <= 0) {
    return null;
  }

  let reason;
  if (matchedCategories.length > 0) {
    const source = profile.history
      .map((item) => ({
        title: item.title,
        sharedCategories: (item.categories || []).filter((category) =>
          matchedCategories.some((matched) => matched.id === category.id)
        ),
      }))
      .filter((item) => item.sharedCategories.length > 0)
      .sort((left, right) =>
        right.sharedCategories.length - left.sharedCategories.length ||
        left.title.localeCompare(right.title)
      )[0];
    const supportedCategories = source?.sharedCategories || matchedCategories;
    const categoryNames = supportedCategories.map((category) => category.name).join(', ');
    const categoryLabel = supportedCategories.length === 1 ? 'category' : 'categories';
    reason = source
      ? `Because you interacted with ${source.title}, which shares the ${categoryNames} ${categoryLabel}.`
      : `Because you have issued books in the ${categoryNames} ${categoryLabel}.`;
  } else {
    const names = matchedAuthors.map((author) => author.displayName).join(', ');
    reason = `Because you have interacted with books by ${names}.`;
  }

  return {
    book: {
      id: candidate.id,
      title: candidate.title,
      slug: candidate.slug,
      description: candidate.description,
      publicationYear: candidate.publication_year,
      languageCode: candidate.language_code,
      coverImageKey: candidate.cover_image_key,
      estimatedReadingMinutes: candidate.estimated_reading_minutes,
      totalPages: candidate.total_pages,
      authors: candidate.authors,
      categories: candidate.categories,
    },
    score,
    reason,
    matchedCategories,
    matchedAuthors,
  };
}

export async function getRecommendations(userId) {
  const history = await listRecommendationHistory(userId);
  if (history.length === 0) {
    return {
      personalized: false,
      message: 'Not enough reading history yet. Explore the library to build personalized recommendations.',
      recommendations: [],
    };
  }

  const profile = buildProfile(history);
  profile.history = history;
  if (profile.categories.size === 0 && profile.authors.size === 0) {
    return {
      personalized: false,
      message: 'Not enough catalog metadata in your reading history yet. Explore the library to find a book to read.',
      recommendations: [],
    };
  }

  const candidates = await listRecommendationCandidates(userId);
  const recommendations = candidates
    .map((candidate) => recommendationFor(candidate, profile))
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || left.book.title.localeCompare(right.book.title) || left.book.id.localeCompare(right.book.id))
    .slice(0, RECOMMENDATION_LIMIT);

  return recommendations.length > 0
    ? { personalized: true, message: null, recommendations }
    : {
        personalized: false,
        message: 'No unissued published books currently match your reading history. Explore the library for more titles.',
        recommendations: [],
      };
}
