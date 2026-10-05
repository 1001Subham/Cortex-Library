import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTokens } from '../context/TokenContext';
import {
  bookHash,
  catalogHash,
  libraryHash,
  loginHash,
} from '../hooks/useHashRoute';
import {
  getBook,
  getBookContent,
  getBookProgress,
  recordReadingVisualCue,
  heartbeatReadingSession,
  issueBook,
  saveBookProgress,
  startReadingSession,
  stopReadingSession,
} from '../services/api';
import { extractReadableHtml } from '../utils/readableHtml';
import {
  displayProgressPercent,
  getWindowProgressPercent,
  setWindowProgressPercent,
} from '../utils/readingProgress';

const SAVE_DEBOUNCE_MS = 1500;
const SAVE_INTERVAL_MS = 20000;
const SAVE_DELTA = 1;
const SESSION_FLUSH_MS = 25000;
const MAX_FLUSH_SECONDS = 60;
const IDLE_MS = 45000;
const VISUAL_CUE_INTERVAL_MS = 15000;

function isWindowFocused() {
  return document.visibilityState === 'visible' && document.hasFocus();
}

function ReaderPage({ bookId }) {
  const { user, ready } = useAuth();
  const { balance, issueCost, refreshTokens } = useTokens();
  const [book, setBook] = useState(null);
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gate, setGate] = useState(null);
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueError, setIssueError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [progressPercent, setProgressPercent] = useState(null);
  const [resumeFrom, setResumeFrom] = useState(null);
  const [sessionError, setSessionError] = useState(null);
  const [progressError, setProgressError] = useState(null);
  const [visualCueState, setVisualCueState] = useState('off');
  const [visualCueError, setVisualCueError] = useState(null);
  const [visualCueSummary, setVisualCueSummary] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);

  const restoredRef = useRef(false);
  const lastSavedRef = useRef(null);
  const pendingSaveRef = useRef(null);
  const saveTimerRef = useRef(null);
  const userScrolledRef = useRef(false);
  const ignoreScrollUntilRef = useRef(0);
  const lastActiveAtRef = useRef(null);
  const lastActivityAtRef = useRef(0);
  const pendingElapsedRef = useRef(0);
  const sessionReadyRef = useRef(false);
  const flushSessionRef = useRef(async () => {});
  const sessionIdRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const cameraTimerRef = useRef(null);
  const cameraSamplePendingRef = useRef(false);

  const stopVisualCueCapture = useCallback(() => {
    if (cameraTimerRef.current) {
      window.clearInterval(cameraTimerRef.current);
      cameraTimerRef.current = null;
    }
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
    setVisualCueState((current) => (current === 'active' ? 'off' : current));
  }, []);

  const sampleVisualCue = useCallback(async () => {
    const video = cameraVideoRef.current;
    const sessionId = sessionIdRef.current;
    if (
      !video ||
      !sessionId ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      document.visibilityState !== 'visible' ||
      !document.hasFocus() ||
      cameraSamplePendingRef.current
    ) {
      return;
    }

    cameraSamplePendingRef.current = true;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const context = canvas.getContext('2d', { alpha: false });
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.65)
      );
      if (!blob) throw new Error('Unable to prepare a camera sample.');
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Unable to read camera sample.'));
        reader.readAsDataURL(blob);
      });
      const frame = String(dataUrl).split(',')[1];
      const result = await recordReadingVisualCue(bookId, sessionId, frame);
      setVisualCueSummary(result.summary);
      setVisualCueError(null);
    } catch (err) {
      const message = err.message || 'Visual cue analysis is unavailable.';
      setVisualCueError(message);
      console.error('[reader] Visual cue sample failed.', err);
      stopVisualCueCapture();
      setVisualCueState('error');
    } finally {
      cameraSamplePendingRef.current = false;
    }
  }, [bookId, stopVisualCueCapture]);

  const startVisualCueCapture = useCallback(async () => {
    setVisualCueError(null);
    setVisualCueSummary(null);
    setVisualCueState('starting');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser does not provide camera access.');
      }
      if (!sessionIdRef.current) {
        throw new Error('The active reading session is not ready yet.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
        audio: false,
      });
      cameraStreamRef.current = stream;
      const video = cameraVideoRef.current;
      video.srcObject = stream;
      await video.play();
      setVisualCueState('active');
      await sampleVisualCue();
      cameraTimerRef.current = window.setInterval(
        sampleVisualCue,
        VISUAL_CUE_INTERVAL_MS
      );
    } catch (err) {
      stopVisualCueCapture();
      const message = err.message || 'Camera permission was not granted.';
      setVisualCueError(message);
      setVisualCueState('error');
      console.error('[reader] Unable to start visual cue capture.', err);
    }
  }, [sampleVisualCue, stopVisualCueCapture]);

  useEffect(() => {
    function stopWhenHidden() {
      if (document.visibilityState !== 'visible') stopVisualCueCapture();
    }
    document.addEventListener('visibilitychange', stopWhenHidden);
    window.addEventListener('blur', stopVisualCueCapture);
    return () => {
      document.removeEventListener('visibilitychange', stopWhenHidden);
      window.removeEventListener('blur', stopVisualCueCapture);
      stopVisualCueCapture();
    };
  }, [stopVisualCueCapture]);

  const readableHtml = useMemo(() => extractReadableHtml(html), [html]);

  const persistProgress = useCallback(
    async (force = false, options = {}) => {
      if (!user || !bookId || !restoredRef.current) {
        return;
      }

      const next = getWindowProgressPercent();
      const previous = lastSavedRef.current;

      if (previous === null && next <= 0) {
        return;
      }

      if (
        !userScrolledRef.current &&
        previous !== null &&
        next + SAVE_DELTA < previous
      ) {
        return;
      }

      if (
        !force &&
        previous !== null &&
        Math.abs(next - previous) < SAVE_DELTA
      ) {
        return;
      }

      if (pendingSaveRef.current) {
        if (!force) {
          return;
        }
        await pendingSaveRef.current;
      }

      const request = saveBookProgress(bookId, next, {
        keepalive: Boolean(options.keepalive),
      })
        .then((data) => {
          const saved = data.progress?.progressPercent;
          if (typeof saved === 'number') {
            lastSavedRef.current = saved;
            setProgressPercent(saved);
            setProgressError(null);
          }
        })
        .catch((err) => {
          const message = err.message || 'Unable to save reading progress.';
          setProgressError(message);
          console.error('[reader] Failed to save reading progress.', err);
        })
        .finally(() => {
          if (pendingSaveRef.current === request) {
            pendingSaveRef.current = null;
          }
        });

      pendingSaveRef.current = request;
      await request;
    },
    [bookId, user]
  );

  const scheduleSave = useCallback(() => {
    if (!restoredRef.current) {
      return;
    }

    setProgressPercent(getWindowProgressPercent());

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      persistProgress(false);
    }, SAVE_DEBOUNCE_MS);
  }, [persistProgress]);

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSessionError(null);
    setProgressError(null);
    setGate(null);
    setIssueError(null);
    setBook(null);
    setHtml('');
    setProgressPercent(null);
    setResumeFrom(null);
    restoredRef.current = false;
    lastSavedRef.current = null;
    userScrolledRef.current = false;
    ignoreScrollUntilRef.current = 0;

    try {
      const details = await getBook(bookId);
      setBook(details);

      if (!user) {
        setGate('login');
        return;
      }

      if (!details.content?.available || details.content.format !== 'html') {
        setGate('missing');
        return;
      }

      const content = await getBookContent(bookId);

      if (!extractReadableHtml(content)) {
        setGate('missing');
        return;
      }

      setHtml(content);

      try {
        const data = await getBookProgress(bookId);
        const saved = data.progress?.progressPercent;
        if (typeof saved === 'number') {
          lastSavedRef.current = saved;
          setProgressPercent(saved);
          setResumeFrom(saved > 0 ? saved : null);
        } else {
          lastSavedRef.current = null;
          setProgressPercent(0);
        }
      } catch (err) {
        lastSavedRef.current = null;
        setProgressPercent(0);
        const message = err.message || 'Unable to load saved reading progress.';
        setProgressError(message);
        console.error('[reader] Failed to load reading progress.', err);
      }
    } catch (err) {
      if (err.status === 401) {
        setGate('login');
        return;
      }

      if (err.status === 403) {
        setGate('issue');
        return;
      }

      if (err.status === 404) {
        setError(
          err.message === 'Book not found.'
            ? 'This book is not in the catalog.'
            : 'This book has no readable content in the library.'
        );
        return;
      }

      setError(err.message || 'Unable to open the reader.');
    } finally {
      setLoading(false);
    }
  }, [bookId, user]);

  useEffect(() => {
    if (!ready) {
      return undefined;
    }

    let cancelled = false;

    loadContent().then(() => {
      if (cancelled) {
        return;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadContent, ready, reloadKey]);

  useEffect(() => {
    if (!readableHtml) {
      return undefined;
    }

    let cancelled = false;
    let attempts = 0;
    let retryTimer = 0;

    function finishRestore() {
      if (cancelled) {
        return;
      }

      restoredRef.current = true;
      ignoreScrollUntilRef.current = Date.now() + 400;
      userScrolledRef.current = false;
      const saved = lastSavedRef.current;
      setProgressPercent(
        typeof saved === 'number' ? saved : getWindowProgressPercent()
      );
    }

    function tryRestore() {
      if (cancelled) {
        return;
      }

      const saved = lastSavedRef.current;
      if (typeof saved === 'number' && saved > 0) {
        setWindowProgressPercent(saved);
      }

      const current = getWindowProgressPercent();
      const layoutReady =
        document.documentElement.scrollHeight > window.innerHeight + 40;
      const positionMismatch =
        typeof saved === 'number' &&
        saved > 1 &&
        Math.abs(current - saved) > 2;
      const needsRetry =
        typeof saved === 'number' &&
        saved > 1 &&
        attempts < 12 &&
        (!layoutReady || positionMismatch);

      if (needsRetry) {
        attempts += 1;
        retryTimer = window.setTimeout(tryRestore, 50);
        return;
      }

      finishRestore();
    }

    const frame = window.requestAnimationFrame(tryRestore);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [readableHtml]);

  useEffect(() => {
    if (!readableHtml || !user) {
      return undefined;
    }

    function onScroll() {
      if (
        restoredRef.current &&
        Date.now() >= ignoreScrollUntilRef.current
      ) {
        userScrolledRef.current = true;
      }
      scheduleSave();
    }

    function flushProgress(keepalive = false) {
      persistProgress(true, { keepalive });
    }

    function onHidden() {
      flushProgress(true);
    }

    function onVisibility() {
      if (document.visibilityState === 'hidden') {
        onHidden();
      }
    }

    function onHashChange() {
      flushProgress(true);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', onHidden);
    window.addEventListener('hashchange', onHashChange);
    document.addEventListener('visibilitychange', onVisibility);

    const interval = window.setInterval(() => {
      persistProgress(false);
    }, SAVE_INTERVAL_MS);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', onHidden);
      window.removeEventListener('hashchange', onHashChange);
      document.removeEventListener('visibilitychange', onVisibility);
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
      window.clearInterval(interval);
      flushProgress(true);
    };
  }, [persistProgress, readableHtml, scheduleSave, user]);

  useEffect(() => {
    if (!readableHtml || !user || !bookId) {
      return undefined;
    }

    let cancelled = false;
    let flushChain = Promise.resolve();
    sessionReadyRef.current = false;
    sessionIdRef.current = null;
    setActiveSessionId(null);
    pendingElapsedRef.current = 0;
    lastActivityAtRef.current = Date.now();
    lastActiveAtRef.current = isWindowFocused() ? Date.now() : null;

    function isActivelyReading() {
      return (
        isWindowFocused() &&
        Date.now() - lastActivityAtRef.current < IDLE_MS
      );
    }

    function noteActivity() {
      lastActivityAtRef.current = Date.now();
      if (lastActiveAtRef.current === null && isWindowFocused()) {
        lastActiveAtRef.current = Date.now();
      }
    }

    function harvestElapsed(keepClock) {
      const now = Date.now();
      const countableUntil = Math.min(
        now,
        lastActivityAtRef.current + IDLE_MS
      );

      if (lastActiveAtRef.current !== null) {
        pendingElapsedRef.current += Math.max(
          0,
          Math.floor((countableUntil - lastActiveAtRef.current) / 1000)
        );
      }

      lastActiveAtRef.current =
        keepClock && isActivelyReading() ? now : null;
    }

    async function ensureSession() {
      if (sessionReadyRef.current) {
        return true;
      }

      try {
        const result = await startReadingSession(bookId);
        if (!result.session?.id) {
          throw new Error('The reading session response did not include an id.');
        }
        sessionIdRef.current = result.session.id;
        setActiveSessionId(result.session.id);
        sessionReadyRef.current = true;
        setSessionError(null);
        return true;
      } catch (err) {
        sessionReadyRef.current = false;
        const message = err.message || 'Unable to start reading-time tracking.';
        setSessionError(message);
        console.error('[reader] Failed to start reading session.', err);
        return false;
      }
    }

    function persistElapsed(endSession, options = {}) {
      harvestElapsed(!endSession && isActivelyReading());

      flushChain = flushChain.then(async () => {
        if (cancelled && !endSession) {
          return;
        }

        const elapsedSeconds = Math.min(
          MAX_FLUSH_SECONDS,
          pendingElapsedRef.current
        );
        const keepalive = Boolean(options.keepalive);

        if (elapsedSeconds <= 0 && !endSession) {
          return;
        }

        if (elapsedSeconds <= 0 && endSession) {
          if (!sessionReadyRef.current) {
            return;
          }

          try {
            await stopReadingSession(bookId, 0, { keepalive });
          } catch (err) {
            setSessionError(err.message || 'Unable to close reading session.');
            console.error('[reader] Failed to close reading session.', err);
          }
          return;
        }

        const ready = await ensureSession();
        if (!ready) {
          return;
        }

        pendingElapsedRef.current = Math.max(
          0,
          pendingElapsedRef.current - elapsedSeconds
        );

        try {
          if (endSession) {
            await stopReadingSession(bookId, elapsedSeconds, { keepalive });
            return;
          }

          await heartbeatReadingSession(bookId, elapsedSeconds, { keepalive });
        } catch (err) {
          pendingElapsedRef.current += elapsedSeconds;
          const message = err.message || 'Unable to save reading time.';
          setSessionError(message);
          console.error('[reader] Failed to save reading time.', err);
        }
      });

      return flushChain;
    }

    flushSessionRef.current = (options) => persistElapsed(true, options);

    ensureSession().then((ready) => {
      if (!ready || cancelled) {
        return;
      }

      lastActivityAtRef.current = Date.now();
      if (isWindowFocused()) {
        lastActiveAtRef.current = Date.now();
      }
      persistElapsed(false);
    });

    function onVisibility() {
      if (document.visibilityState === 'hidden') {
        persistElapsed(false, { keepalive: true });
        return;
      }

      noteActivity();
    }

    function onFocus() {
      noteActivity();
    }

    function onBlur() {
      persistElapsed(false);
    }

    function onPageHide() {
      persistElapsed(true, { keepalive: true });
    }

    function onHashChange() {
      persistElapsed(true, { keepalive: true });
    }

    function onUserActivity() {
      noteActivity();
    }

    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('scroll', onUserActivity, { passive: true });
    window.addEventListener('mousemove', onUserActivity, { passive: true });
    window.addEventListener('keydown', onUserActivity);
    document.addEventListener('visibilitychange', onVisibility);

    const interval = window.setInterval(() => {
      persistElapsed(false);
    }, SESSION_FLUSH_MS);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('scroll', onUserActivity);
      window.removeEventListener('mousemove', onUserActivity);
      window.removeEventListener('keydown', onUserActivity);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
      persistElapsed(true, { keepalive: true });
      cancelled = true;
      stopVisualCueCapture();
      flushSessionRef.current = async () => {};
    };
  }, [bookId, readableHtml, stopVisualCueCapture, user]);

  useEffect(() => {
    if (!readableHtml || !user) {
      return undefined;
    }

    async function onHashLinkClick(event) {
      const anchor = event.target.closest('a[href^="#"]');

      if (!anchor || event.defaultPrevented || event.button !== 0) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const href = anchor.getAttribute('href');

      if (!href || href === window.location.hash) {
        return;
      }

      event.preventDefault();
      await persistProgress(true);
      await flushSessionRef.current();
      window.location.hash = href;
    }

    document.addEventListener('click', onHashLinkClick, true);

    return () => {
      document.removeEventListener('click', onHashLinkClick, true);
    };
  }, [persistProgress, readableHtml, user]);

  async function handleIssue() {
    setIssueError(null);
    setIssueLoading(true);

    try {
      await issueBook(bookId);
      await refreshTokens();
      setReloadKey((value) => value + 1);
    } catch (err) {
      if (err.status === 409) {
        await refreshTokens();
        setReloadKey((value) => value + 1);
        return;
      }

      setIssueError(err.message || 'Unable to issue this book.');
    } finally {
      setIssueLoading(false);
    }
  }

  const authors = book?.authors?.map((author) => author.displayName).join(', ');
  const tokensReady = issueCost !== null;
  const hasEnoughTokens =
    balance !== null && issueCost !== null && balance >= issueCost;
  const shownPercent = displayProgressPercent(progressPercent);
  const resumedPercent = displayProgressPercent(resumeFrom);

  return (
    <main className="reader">
      <header className="reader__chrome">
        <div className="reader__chrome-inner">
          {book ? (
            <a className="reader__nav" href={bookHash(book.id)}>
              Details
            </a>
          ) : (
            <a className="reader__nav" href={catalogHash()}>
              Catalog
            </a>
          )}
          <div className="reader__chrome-title">
            {book && (
              <>
                <p className="eyebrow">Now reading</p>
                <h1>{book.title}</h1>
                {authors && <p>{authors}</p>}
                {readableHtml && shownPercent !== null ? (
                  <p className="reader__progress" aria-live="polite">
                    {shownPercent}% complete
                    {resumedPercent > 0
                      ? ` · Resumed from ${resumedPercent}%`
                      : ''}
                  </p>
                ) : null}
              </>
            )}
          </div>
          <a className="reader__nav" href={libraryHash()}>
            My Library
          </a>
        </div>
      </header>

      <div className="reader__stage">
        {(!ready || loading) && <p className="status">Opening book…</p>}

        {progressError && (
          <div className="banner banner--error reader__notice" role="alert">
            <p>Reading progress may not be saved: {progressError}</p>
          </div>
        )}

        {sessionError && (
          <div className="banner banner--error reader__notice" role="alert">
            <p>
              Reading time tracking is unavailable: {sessionError} Your saved
              reading position will continue to update.
            </p>
          </div>
        )}

        {readableHtml && user && !loading && (
          <section className="reader__visual-cues" aria-label="Optional visual reading cues">
            <video
              ref={cameraVideoRef}
              autoPlay
              muted
              playsInline
              aria-hidden="true"
              className="reader__camera-source"
            />
            <div>
              <p className="eyebrow">Optional camera analysis</p>
              <p>
                Estimates whether your face is visible and generally facing the screen.
                It cannot tell whether you understand, enjoy, or focus on the book.
                Camera frames are sent transiently for analysis and are not saved.
              </p>
              {visualCueSummary && (
                <p aria-live="polite">
                  {visualCueSummary.samples} samples · {visualCueSummary.faceDetected} with a face visible · {visualCueSummary.facingForward} generally facing forward
                </p>
              )}
              {visualCueError && <p role="alert">Camera analysis: {visualCueError}</p>}
            </div>
            {visualCueState === 'active' ? (
              <button type="button" className="button button--ghost" onClick={stopVisualCueCapture}>
                Turn off camera analysis
              </button>
            ) : (
              <button
                type="button"
                className="button button--ghost"
                onClick={startVisualCueCapture}
                disabled={visualCueState === 'starting' || !activeSessionId}
              >
                {visualCueState === 'starting' ? 'Starting camera…' : 'Enable visual cues'}
              </button>
            )}
          </section>
        )}

        {error && (
          <div className="banner banner--error reader__notice" role="alert">
            <p>{error}</p>
          </div>
        )}

        {gate === 'login' && !loading && ready && (
          <div className="reader__gate">
            <p className="eyebrow">Sign in required</p>
            <h2>Login required</h2>
            <p>
              Catalog browsing stays public. Reading requires an account and an
              issued copy in My Library.
            </p>
            <a
              className="button button--primary"
              href={loginHash(`/books/${bookId}/read`)}
            >
              Log in
            </a>
          </div>
        )}

        {gate === 'issue' && !loading && (
          <div className="reader__gate">
            <p className="eyebrow">My Library</p>
            <h2>This book is not in your library.</h2>
            <p>
              Issue it with tokens to read inside Cortex Library. Returns do not
              refund tokens.
            </p>
            {issueError && (
              <div className="banner banner--error" role="alert">
                <p>{issueError}</p>
              </div>
            )}
            {tokensReady && hasEnoughTokens ? (
              <button
                type="button"
                className="button button--primary"
                onClick={handleIssue}
                disabled={issueLoading}
              >
                {issueLoading
                  ? 'Issuing…'
                  : `Issue for ${issueCost} token${issueCost === 1 ? '' : 's'}`}
              </button>
            ) : (
              <button type="button" className="button button--primary" disabled>
                {tokensReady ? 'Not enough tokens' : 'Loading tokens…'}
              </button>
            )}
            <a className="button button--ghost" href={bookHash(bookId)}>
              View details
            </a>
          </div>
        )}

        {gate === 'missing' && (
          <div className="banner banner--error reader__notice" role="alert">
            <p>This title does not have in-library HTML content yet.</p>
          </div>
        )}

        {readableHtml && (
          <article
            className="reader__page"
            dangerouslySetInnerHTML={{ __html: readableHtml }}
          />
        )}
      </div>
    </main>
  );
}

export default ReaderPage;
