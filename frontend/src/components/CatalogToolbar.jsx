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
        <span className="visually-hidden">Search books</span>
        <input
          type="search"
          value={queryInput}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by title"
        />
      </label>
      <label className="catalog-toolbar__filter">
        <span>Category</span>
        <select
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export default CatalogToolbar;
