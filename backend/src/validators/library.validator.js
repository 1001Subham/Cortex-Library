import { isUuid } from './books.validator.js';

export function parseIssueId(value) {
  if (!isUuid(value)) {
    return { error: 'Issue id must be a valid UUID.' };
  }

  return { value };
}
