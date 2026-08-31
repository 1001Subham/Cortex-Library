const UNSAFE_SELECTOR = 'script, iframe, object, embed, form, link, meta';

function stripUnsafe(root) {
  root.querySelectorAll(UNSAFE_SELECTOR).forEach((node) => node.remove());

  root.querySelectorAll('*').forEach((element) => {
    [...element.attributes].forEach((attr) => {
      if (attr.name.toLowerCase().startsWith('on')) {
        element.removeAttribute(attr.name);
      }

      if (
        (attr.name === 'href' || attr.name === 'src') &&
        /^\s*javascript:/i.test(attr.value)
      ) {
        element.removeAttribute(attr.name);
      }
    });
  });
}

export function extractReadableHtml(html) {
  if (typeof html !== 'string' || html.trim() === '') {
    return '';
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  stripUnsafe(doc);

  const article = doc.querySelector('article');
  const source = article || doc.body;

  return source ? source.innerHTML.trim() : '';
}
