# Business Reimagined

Public website source for https://morpheuspd.io/business-reimagined.

This release adds a portfolio under a path prefix and preserves the existing portfolio fallback source by content-addressed file references. It does not change the existing Morpheus homepage source. The deployment manifest references assets and the existing inquiry handler in the preserved Vercel deployment. Never put credentials or private inquiry records in this repository.

Project-level Vercel rewrite: ^(/business-reimagined(?:/.*)?)$ -> https://morpheus-website-portfolio.vercel.app$1. The existing Morpheus homepage and all unrelated paths keep their existing deployment.

Status labels distinguish live websites, completed previews, independent concepts and interactive demonstrations. Public-page screenshots are authentic captures; the fixed screenshot source list accepts no arbitrary URLs. Inquiry notifications reuse the existing validated transactional handler through an origin adapter for the new same-owner domain. Campaign emails remain held; this release sends no prospect outreach.
