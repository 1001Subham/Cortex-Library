/**
 * Writes development HTML excerpts and project-owned SVG covers.
 * Public-domain 19th/early-20th century works (US). Excerpts only — not complete books.
 * No JavaScript. No external reading links.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const storageBooks = path.join(root, 'storage', 'books');

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function documentHtml({ title, author, year, chapterTitle, paragraphs }) {
  const body = paragraphs
    .map((paragraph) => `      <p>${escapeHtml(paragraph)}</p>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <article>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(author)} · ${escapeHtml(String(year))}</p>
      <blockquote>
        <p>
          This Cortex Library file is a representative public-domain excerpt
          for development and demonstration. It is not the complete book.
        </p>
      </blockquote>
      <h2>${escapeHtml(chapterTitle)}</h2>
${body}
    </article>
  </body>
</html>
`;
}

function coverSvg({ title, author, background }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="480" viewBox="0 0 320 480">
  <rect width="320" height="480" fill="${background}"/>
  <rect x="16" y="16" width="288" height="448" fill="none" stroke="#f5f0e8" stroke-width="2"/>
  <text x="160" y="200" text-anchor="middle" fill="#f5f0e8" font-family="Georgia, serif" font-size="20">
    ${escapeHtml(title)}
  </text>
  <text x="160" y="280" text-anchor="middle" fill="#d9d0c4" font-family="Georgia, serif" font-size="14">
    ${escapeHtml(author)}
  </text>
  <text x="160" y="430" text-anchor="middle" fill="#c4b8a8" font-family="Georgia, serif" font-size="11">
    Cortex Library
  </text>
</svg>
`;
}

const books = [
  {
    id: 'b3000000-0000-4000-8000-000000000001',
    title: "Alice's Adventures in Wonderland",
    author: 'Lewis Carroll',
    year: 1865,
    background: '#2c5f4e',
    chapterTitle: 'Chapter I. Down the Rabbit-Hole',
    paragraphs: [
      'Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, “and what is the use of a book,” thought Alice, “without pictures or conversations?”',
      'So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.',
      'There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, “Oh dear! Oh dear! I shall be late!” (when she thought it over afterwards, it occurred to her that she ought to have wondered at this, but at the time it all seemed quite natural); but when the Rabbit actually took a watch out of its waistcoat-pocket, and looked at it, and then hurried on, Alice started to her feet.',
    ],
  },
  {
    id: 'b3000000-0000-4000-8000-000000000002',
    title: 'The Adventures of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    year: 1892,
    background: '#3d3a2e',
    chapterTitle: 'I. A Scandal in Bohemia',
    paragraphs: [
      'To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler. All emotions, and that one particularly, were abhorrent to his cold, precise but admirably balanced mind.',
      'He was, I take it, the most perfect reasoning and observing machine that the world has seen, but as a lover he would have placed himself in a false position. He never spoke of the softer passions, save with a gibe and a sneer.',
      'And yet there was but one woman to him, and that woman was the late Irene Adler, of dubious and questionable memory.',
    ],
  },
  {
    id: 'b3000000-0000-4000-8000-000000000003',
    title: 'The Time Machine',
    author: 'H. G. Wells',
    year: 1895,
    background: '#1f3d5c',
    chapterTitle: 'Chapter I',
    paragraphs: [
      'The Time Traveller (for so it will be convenient to speak of him) was expounding a recondite matter to us. His grey eyes shone and twinkled, and his usually pale face was flushed and animated. The fire burned brightly, and the soft radiance of the incandescent lights in the lilies of silver caught the bubbles that flashed and passed in our glasses.',
      'Our chairs, being his patents, embraced and caressed us rather than submitted to be sat upon, and there was that luxurious after-dinner atmosphere when thought runs gracefully free of the trammels of precision.',
      'And he put it to us in this way—marking the points with a lean forefinger—as we sat and lazily admired his earnestness over this new paradox (as we thought it) and his fecundity.',
    ],
  },
  {
    id: 'b3000000-0000-4000-8000-000000000004',
    title: 'Treasure Island',
    author: 'Robert Louis Stevenson',
    year: 1883,
    background: '#6b3a1f',
    chapterTitle: 'Chapter I. The Old Sea-dog at the Admiral Benbow',
    paragraphs: [
      'Squire Trelawney, Dr. Livesey, and the rest of these gentlemen having asked me to write down the whole particulars about Treasure Island, from the beginning to the end, keeping nothing back but the bearings of the island, and that only because there is still treasure not yet lifted, I take up my pen in the year of grace 17—, and go back to the time when my father kept the Admiral Benbow inn and the brown old seaman, with the sabre cut, first took up his lodging under our roof.',
      'I remember him as if it were yesterday, as he came plodding to the inn door, his sea-chest following behind him in a hand-barrow—a tall, strong, heavy, nut-brown man, his tarry pigtail falling over the shoulder of his soiled blue coat, his hands ragged and scarred, with black, broken nails, and the sabre cut across one cheek, a dirty, livid white.',
    ],
  },
  {
    id: 'b3000000-0000-4000-8000-000000000005',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    year: 1813,
    background: '#5c2e3d',
    chapterTitle: 'Chapter I',
    paragraphs: [
      'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
      'However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.',
      '“My dear Mr. Bennet,” said his lady to him one day, “have you heard that Netherfield Park is let at last?” Mr. Bennet replied that he had not. “But it is,” returned she; “for Mrs. Long has just been here, and she told me all about it.”',
    ],
  },
  {
    id: 'b3000000-0000-4000-8000-000000000006',
    title: 'The Wonderful Wizard of Oz',
    author: 'L. Frank Baum',
    year: 1900,
    background: '#7a5b12',
    chapterTitle: 'Chapter I. The Cyclone',
    paragraphs: [
      'Dorothy lived in the midst of the great Kansas prairies, with Uncle Henry, who was a farmer, and Aunt Em, who was the farmer’s wife. Their house was small, for the lumber to build it had to be carried by wagon many miles. There were four walls, a floor and a roof, which made one room; and this room contained a rusty looking cookstove, a cupboard for the dishes, a table, three or four chairs, and the beds.',
      'Uncle Henry sat upon the doorstep and looked anxiously at the sky, which was even grayer than usual. Dorothy stood in the door with Toto in her arms, and looked at the sky too. Aunt Em was washing the dishes.',
    ],
  },
  {
    id: 'b3000000-0000-4000-8000-000000000007',
    title: 'Dracula',
    author: 'Bram Stoker',
    year: 1897,
    background: '#2a1c24',
    chapterTitle: 'Chapter I. Jonathan Harker’s Journal',
    paragraphs: [
      '3 May. Bistritz.—Left Munich at 8:35 P.M., on 1st May, arriving at Vienna early next morning; should have arrived at 6:46, but train was an hour late. Buda-Pesth seems a wonderful place, from the glimpse which I got of it from the train and the little I could walk through the streets.',
      'I found my smattering of German very useful here; indeed, I don’t know how I should be able to get on without it. Having had some time at my disposal when in London, I had visited the British Museum, and made search among the books and maps in the library regarding Transylvania.',
    ],
  },
  {
    id: 'b3000000-0000-4000-8000-000000000008',
    title: 'Frankenstein',
    author: 'Mary Wollstonecraft Shelley',
    year: 1818,
    background: '#243024',
    chapterTitle: 'Letter I',
    paragraphs: [
      'To Mrs. Saville, England. St. Petersburgh, Dec. 11th, 17—.',
      'You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings. I arrived here yesterday, and my first task is to assure my dear sister of my welfare and increasing confidence in the success of my undertaking.',
      'I am already far north of London, and as I walk in the streets of Petersburgh, I feel a cold northern breeze play upon my cheeks, which braces my nerves and fills me with delight.',
    ],
  },
  {
    id: 'b3000000-0000-4000-8000-000000000009',
    title: 'A Christmas Carol',
    author: 'Charles Dickens',
    year: 1843,
    background: '#4a1f1f',
    chapterTitle: 'Stave I. Marley’s Ghost',
    paragraphs: [
      'Marley was dead: to begin with. There is no doubt whatever about that. The register of his burial was signed by the clergyman, the clerk, the undertaker, and the chief mourner. Scrooge signed it: and Scrooge’s name was good upon ’Change, for anything he chose to put his hand to. Old Marley was as dead as a door-nail.',
      'Mind! I don’t mean to say that I know, of my own knowledge, what there is particularly dead about a door-nail. I might have been inclined, myself, to regard a coffin-nail as the deadest piece of ironmongery in the trade.',
      'Oh! But he was a tight-fisted hand at the grindstone, Scrooge! a squeezing, wrenching, grasping, scraping, clutching, covetous, old sinner!',
    ],
  },
  {
    id: 'b3000000-0000-4000-8000-00000000000a',
    title: 'The War of the Worlds',
    author: 'H. G. Wells',
    year: 1898,
    background: '#2e2438',
    chapterTitle: 'Book One. Chapter I. The Eve of the War',
    paragraphs: [
      'No one would have believed in the last years of the nineteenth century that this world was being watched keenly and closely by intelligences greater than man’s and yet as mortal as his own; that as men busied themselves about their various concerns they were scrutinised and studied, perhaps almost as narrowly as a man with a microscope might scrutinise the transient creatures that swarm and multiply in a drop of water.',
      'With infinite complacency men went to and fro over this globe about their little affairs, serene in their assurance of their empire over matter. It is possible that the infusoria under the microscope do the same.',
    ],
  },
];

const sizes = [];

for (const book of books) {
  const dir = path.join(storageBooks, book.id);
  fs.mkdirSync(dir, { recursive: true });

  const html = documentHtml(book);
  const svg = coverSvg(book);

  fs.writeFileSync(path.join(dir, 'content.html'), html, 'utf8');
  fs.writeFileSync(path.join(dir, 'cover.svg'), svg, 'utf8');

  sizes.push({
    id: book.id,
    htmlBytes: Buffer.byteLength(html, 'utf8'),
    coverBytes: Buffer.byteLength(svg, 'utf8'),
  });
}

const sizeSql = sizes
  .map(
    (row) =>
      `UPDATE books SET content_byte_size = ${row.htmlBytes}, updated_at = now() WHERE id = '${row.id}';`
  )
  .join('\n');

fs.writeFileSync(path.join(root, 'database', 'seeds', '002_update_content_byte_sizes.sql'), `${sizeSql}\n`, 'utf8');

console.log(JSON.stringify(sizes, null, 2));
