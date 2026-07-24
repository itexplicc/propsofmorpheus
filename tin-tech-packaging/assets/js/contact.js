document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  await (window.TinTechCMS?.ready || Promise.resolve());
  const form = document.querySelector("[data-inquiry-form]");
  const status = document.querySelector("[data-form-status]");
  if (!form || !status || !window.TinTechAPI) return;

  const params = new URLSearchParams(window.location.search);
  const requestedProduct = params.get("product");
  const requestedVariant = params.get("variant");
  const requestedProject = params.get("project");
  const projectType = form.querySelector("[name=project_type]");
  const message = form.querySelector("[name=message]");

  function selectProject(label) {
    if (!projectType || !label) return;
    const match = Array.from(projectType.options).find((option) => option.value.toLowerCase() === label.toLowerCase());
    if (match) projectType.value = match.value;
  }

  if (requestedProduct) {
    selectProject("Product pricing / portfolio item");
    if (message) message.value = `I would like pricing and a manufacturing review for: ${requestedProduct}${requestedVariant ? `\nSelected option: ${requestedVariant}` : ""}\n\n`;
  } else if (requestedProject === "dedicated-line") {
    selectProject("Dedicated production line");
    if (message) message.value = "I would like to discuss a dedicated production line and the commercial requirements for a long-term program.\n\n";
  } else if (requestedProject === "factory-pathway") {
    selectProject("Sri Lanka factory pathway");
    if (message) message.value = "I would like to discuss a dedicated manufacturing operation or factory pathway in Sri Lanka.\n\n";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector("button[type=submit]");
    const submitLabel = form.dataset.submitLabel || submit.textContent || "Send project brief →";
    const sendingLabel = form.dataset.sendingLabel || "Sending…";
    submit.disabled = true;
    submit.textContent = sendingLabel;
    status.className = "form-status hidden";
    status.textContent = "";

    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const result = await window.TinTechAPI.inquiry(payload);
      status.textContent = form.dataset.successMessage || result.message || "Your project brief has been received.";
      status.className = "form-status success";
      form.reset();
    } catch (error) {
      status.textContent = form.dataset.errorMessage || error.message || "The form could not be sent. Please try again or contact the team directly.";
      status.className = "form-status error";
    } finally {
      submit.disabled = false;
      submit.textContent = submitLabel;
    }
  });
});