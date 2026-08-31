function CatalogToolbar({
  queryInput,
  onQueryChange,
  category,
  onCategoryChange,
  categories,
}) {
  return (
    <div className="catalog-toolbar">
      <label className="catalog-toolbar__search">
        <span>Search the library</span>
        <input
          type="search"
          value={queryInput}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by title"
        />
      </label>
      <div className="catalog-toolbar__chips" role="group" aria-label="Filter by category">
        <button
          type="button"
          className={`chip${!category ? ' is-active' : ''}`}
          onClick={() => onCategoryChange('')}
        >
          All
        </button>
        {categories.map((item) => (
          <button
            key={item.slug}
            type="button"
            className={`chip${category === item.slug ? ' is-active' : ''}`}
            onClick={() => onCategoryChange(item.slug)}
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default CatalogToolbar;
