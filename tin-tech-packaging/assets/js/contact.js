document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("[data-inquiry-form]");
  const status = document.querySelector("[data-form-status]");
  if (!form || !window.TinTechAPI) return;

  const requestedProduct = new URLSearchParams(window.location.search).get("product");
  if (requestedProduct) {
    const projectType = form.querySelector("[name=project_type]");
    const message = form.querySelector("[name=message]");
    if (projectType) projectType.value = "Product pricing / portfolio item";
    if (message) message.value = `I would like pricing and a manufacturing review for: ${requestedProduct}\n\n`;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    submit.textContent = "Sending…";
    status.className = "form-status hidden";
    status.textContent = "";

    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      const result = await TinTechAPI.inquiry(payload);
      status.textContent = result.message || "Your project brief has been received.";
      status.className = "form-status success";
      form.reset();
    } catch (error) {
      status.textContent = error.message || "The form could not be sent. Please try again or email George directly.";
      status.className = "form-status error";
    } finally {
      submit.disabled = false;
      submit.textContent = "Send project brief →";
    }
  });
});
