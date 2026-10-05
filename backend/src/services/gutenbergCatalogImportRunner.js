const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const RETRYABLE_NETWORK_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_SOCKET',
]);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function networkFailureIsRetryable(error) {
  let current = error;
  while (current) {
    if (current.name === 'TimeoutError' || current.name === 'AbortError') return true;
    if (current instanceof TypeError && /fetch failed|network/i.test(current.message)) return true;
    if (RETRYABLE_NETWORK_CODES.has(current.code)) return true;
    current = current.cause;
  }
  return false;
}

function retryDelay(response, attempt, baseDelayMs, maxDelayMs) {
  const exponential = Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)));
  const retryAfter = response?.headers?.get?.('retry-after');
  if (!retryAfter) return exponential;
  const retryAfterSeconds = Number(retryAfter);
  const retryAfterMs = Number.isFinite(retryAfterSeconds)
    ? retryAfterSeconds * 1000
    : Date.parse(retryAfter) - Date.now();
  return Math.min(maxDelayMs, Math.max(exponential, Number.isFinite(retryAfterMs) ? retryAfterMs : 0));
}

export class GutenbergRequestError extends Error {
  constructor(message, { url, status = null, attempts = 1, cause = undefined, retryable = false } = {}) {
    super(message, { cause });
    this.name = 'GutenbergRequestError';
    this.url = url;
    this.status = status;
    this.attempts = attempts;
    this.retryable = retryable;
  }
}

export async function fetchGutenbergWithRetry(url, {
  fetchImpl = globalThis.fetch,
  headers,
  attempts = 4,
  timeoutMs = 30_000,
  baseDelayMs = 1_000,
  maxDelayMs = 10_000,
  sleepImpl = sleep,
  onRetry = () => {},
} = {}) {
  let lastError;
  let lastResponse;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.ok) return response;

      lastResponse = response;
      const error = new GutenbergRequestError(
        `Gutenberg request failed with HTTP ${response.status}: ${url}`,
        {
          url,
          status: response.status,
          attempts: attempt,
          retryable: RETRYABLE_STATUS_CODES.has(response.status),
        }
      );
      await response.body?.cancel?.().catch?.(() => {});
      if (!error.retryable) throw error;
      lastError = error;
    } catch (error) {
      if (error instanceof GutenbergRequestError && !error.retryable) throw error;
      if (error instanceof GutenbergRequestError) {
        lastError = error;
        lastResponse = { headers: lastResponse?.headers };
      } else if (networkFailureIsRetryable(error)) {
        lastError = error;
        lastResponse = null;
      } else {
        throw new GutenbergRequestError(`Gutenberg request failed: ${url}`, {
          url,
          attempts: attempt,
          cause: error,
        });
      }
    }

    if (attempt < attempts) {
      const delay = retryDelay(lastResponse, attempt, baseDelayMs, maxDelayMs);
      onRetry({ attempt, nextAttempt: attempt + 1, delayMs: delay, error: lastError });
      await sleepImpl(delay);
    }
  }

  const message = lastError instanceof GutenbergRequestError
    ? lastError.message
    : `Gutenberg request failed after ${attempts} attempts: ${url}`;
  throw new GutenbergRequestError(message, {
    url,
    status: lastError?.status ?? lastResponse?.status ?? null,
    attempts,
    cause: lastError,
    retryable: true,
  });
}

export async function runGutenbergCatalogPages({
  targetTotal,
  initialTotal,
  lastCompletedPage = 0,
  manifestEntries = [],
  pageUrl,
  getPage,
  processRecord,
  saveManifest = async () => {},
  saveCheckpoint = async () => {},
  recordPageFailure = async () => {},
  resolvePageFailures = async () => {},
  onRecordError = () => {},
  onImported = () => {},
}) {
  let total = initialTotal;
  let imported = 0;
  let page = Math.max(1, lastCompletedPage + 1);
  const manifest = new Map(manifestEntries.map((item) => [item.gutenbergId, item]));

  while (total < targetTotal) {
    const url = pageUrl(page);
    let metadataPage;
    try {
      metadataPage = await getPage(page, url);
    } catch (error) {
      const failedRequestUrl = error.url || url;
      await recordPageFailure({
        page,
        url,
        requestUrl: failedRequestUrl,
        attempts: error.attempts || 1,
        status: error.status || null,
        error: error.message,
      });
      return {
        total,
        imported,
        lastCompletedPage,
        failedPage: page,
        failedUrl: failedRequestUrl,
        error,
        manifest: [...manifest.values()],
      };
    }

    if (!metadataPage.results?.length) {
      await saveCheckpoint(page);
      await resolvePageFailures(page);
      lastCompletedPage = page;
      break;
    }

    let pageComplete = true;
    for (const metadata of metadataPage.results) {
      if (total >= targetTotal) {
        pageComplete = false;
        break;
      }
      if (metadata.copyright !== false || !metadata.formats || !Number.isInteger(metadata.id)) continue;
      const hasPlainText = Object.entries(metadata.formats).some(([mime, fileUrl]) =>
        /^text\/plain(?:;|$)/i.test(mime) && typeof fileUrl === 'string' && /^https:\/\//i.test(fileUrl)
      );
      if (!hasPlainText) continue;

      let result;
      try {
        result = await processRecord(metadata);
      } catch (error) {
        if (error.retryable) {
          await recordPageFailure({
            page,
            url,
            requestUrl: error.url || url,
            attempts: error.attempts || 1,
            status: error.status || null,
            gutenbergId: metadata.id,
            title: metadata.title,
            error: error.message,
          });
          return {
            total,
            imported,
            lastCompletedPage,
            failedPage: page,
            failedUrl: error.url || url,
            failedBookId: metadata.id,
            error,
            manifest: [...manifest.values()],
          };
        }
        onRecordError(metadata, error);
        continue;
      }

      if (result.imported) {
        total += 1;
        imported += 1;
        manifest.set(metadata.id, {
          gutenbergId: metadata.id,
          url: `https://www.gutenberg.org/ebooks/${metadata.id}`,
          copyrightInUs: false,
          title: result.title,
          bookId: result.id,
          source: 'Project Gutenberg; catalog eligibility from Gutendex copyright=false',
        });
        await saveManifest([...manifest.values()]);
        onImported({ total, targetTotal, result });
      }
    }

    if (!pageComplete) break;
    await saveManifest([...manifest.values()]);
    await saveCheckpoint(page);
    await resolvePageFailures(page);
    lastCompletedPage = page;
    if (!metadataPage.next) break;
    page += 1;
  }

  return { total, imported, lastCompletedPage, failedPage: null, failedUrl: null, manifest: [...manifest.values()] };
}
