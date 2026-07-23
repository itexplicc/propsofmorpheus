document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.querySelector("[data-portfolio-grid]");
  const filters = document.querySelector("[data-category-filters]");
  const search = document.querySelector("[data-portfolio-search]");
  const summary = document.querySelector("[data-catalog-summary]");

  if (!grid || !window.TinTechAPI) return;

  let catalog = { categories: [], products: [] };
  let activeCategory = "all";
  let query = "";

  function renderFilters() {
    const buttons = [
      `<button class="filter-button ${activeCategory === "all" ? "active" : ""}" type="button" data-category="all">All products</button>`,
      ...catalog.categories.map((category) =>
        `<button class="filter-button ${activeCategory === category.slug ? "active" : ""}" type="button" data-category="${TinTechAPI.escapeHTML(category.slug)}">${TinTechAPI.escapeHTML(category.name)}</button>`
      ),
    ];
    filters.innerHTML = buttons.join("");
  }

  function renderProducts() {
    const normalized = query.toLowerCase();
    const visible = catalog.products.filter((product) => {
      const categoryMatch = activeCategory === "all" || product.category?.slug === activeCategory;
      const searchText = [
        product.name,
        product.short_description,
        product.description,
        product.category?.name,
        ...(product.tags || []),
      ].join(" ").toLowerCase();
      return categoryMatch && (!normalized || searchText.includes(normalized));
    });

    summary.textContent = `${visible.length} product${visible.length === 1 ? "" : "s"} shown`;

    if (!visible.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>No products match that search.</h3>
          <p>Try another category, clear the search, or send us the item you want to develop.</p>
          <a class="button button-dark" href="contact.html">Request a manufacturing review</a>
        </div>`;
      return;
    }

    grid.innerHTML = visible.map(TinTechAPI.productCard).join("");
  }

  try {
    catalog = await TinTechAPI.catalog();
    renderFilters();
    renderProducts();
  } catch (error) {
    console.error(error);
    summary.textContent = "Catalog unavailable";
    grid.innerHTML = `
      <div class="empty-state">
        <h3>The live portfolio could not be loaded.</h3>
        <p>Please refresh the page or send your product brief directly.</p>
        <a class="button button-dark" href="contact.html">Contact Tin Tech</a>
      </div>`;
  }

  filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category || "all";
    renderFilters();
    renderProducts();
  });

  search.addEventListener("input", () => {
    query = search.value.trim();
    renderProducts();
  });
});
