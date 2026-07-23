document.addEventListener("DOMContentLoaded", async () => {
  const container = document.querySelector("[data-featured-products]");
  if (!container || !window.TinTechAPI) return;

  try {
    const catalog = await TinTechAPI.catalog();
    const featured = catalog.products.filter((product) => product.is_featured);
    const products = (featured.length ? featured : catalog.products).slice(0, 3);

    if (!products.length) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Portfolio updates are being prepared.</h3>
          <p>Send us your product brief and we will review the manufacturing route directly.</p>
          <a class="button button-dark" href="contact.html">Start a project</a>
        </div>`;
      return;
    }

    container.innerHTML = products.map(TinTechAPI.productCard).join("");
  } catch (error) {
    console.error(error);
    container.innerHTML = `
      <div class="empty-state">
        <h3>Explore the full manufacturing range.</h3>
        <p>The live catalog is temporarily unavailable, but the project team is ready to review your requirement.</p>
        <a class="button button-dark" href="portfolio.html">Open portfolio</a>
      </div>`;
  }
});
