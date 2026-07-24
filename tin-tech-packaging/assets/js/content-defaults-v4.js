(function () {
  "use strict";

  window.TinTechContentDefaults = {
    brand: {
      company_name: "TIN TECH PACKAGING",
      short_name: "Tin Tech",
      logo_url: "tin-tech-logo.svg",
      logo_storage_path: null,
      logo_light_url: "tin-tech-logo-light.svg",
      logo_light_storage_path: null,
      favicon_url: "tin-tech-logo.svg",
      favicon_storage_path: null,
      logo_alt: "Tin Tech Packaging",
      tagline: "Product development, tooling, plastic manufacturing, private labeling, packing and delivery coordination from Sri Lanka."
    },
    navigation: {
      items: [
        { label: "Home", url: "index.html" },
        { label: "Company", url: "about.html" },
        { label: "Capabilities", url: "capabilities.html" },
        { label: "Portfolio", url: "portfolio.html" },
        { label: "Contact", url: "contact.html" }
      ],
      cta_label: "Start a project",
      cta_url: "contact.html"
    },
    contact: {
      email: "hockeyundergroundusa@gmail.com",
      phone: "",
      whatsapp: "",
      commercial_contact_name: "George Statler III",
      commercial_contact_role: "Commercial partner · New York",
      sri_lanka_address: "Sri Lanka manufacturing operation",
      new_york_address: "New York commercial coordination and warehouse support",
      operating_points: "Sri Lanka manufacturing · New York coordination",
      typical_inputs: "Photo, sample, drawing, CAD, dimensions or product brief",
      social_links: []
    },
    footer: {
      description: "Product development, tooling, plastic manufacturing, private labeling, packing and delivery coordination from Sri Lanka.",
      columns: [
        {
          title: "Company",
          links: [
            { label: "About Tin Tech", url: "about.html" },
            { label: "Capabilities", url: "capabilities.html" },
            { label: "Product portfolio", url: "portfolio.html" }
          ]
        },
        {
          title: "Work with us",
          links: [
            { label: "Start a project", url: "contact.html" },
            { label: "Dedicated production", url: "contact.html?project=dedicated-line" },
            { label: "Sri Lanka factory pathway", url: "contact.html?project=factory-pathway" }
          ]
        }
      ],
      contact_title: "Contact",
      project_brief_label: "Project brief",
      admin_label: "Admin portal",
      copyright: "© {year} Tin Tech Packaging. All rights reserved.",
      legal_links: [
        { label: "Privacy", url: "privacy.html" },
        { label: "Terms", url: "terms.html" }
      ]
    },
    home: {
      hero_autoplay: true,
      hero_pause_on_hover: true,
      factory: {
        eyebrow: "Manufacturing behind the product",
        title: "Built around repeatability, not one-off orders.",
        description: "Materials, tooling, production controls, assembly and export packing are planned as one connected supply program—so the approved product can be made again with confidence.",
        note: "Sri Lanka manufacturing operation"
      },
      proof_intro: "A long-term manufacturing relationship, not a one-off supplier.",
      proof_items: [
        { value: "4+ years", label: "Ongoing pouch-caddy supply experience" },
        { value: "1,000,000+", label: "Pieces stocked and sold, client reported" },
        { value: "End-to-end", label: "Material, tooling, production, branding and packing" }
      ],
      intro: {
        eyebrow: "What Tin Tech does",
        title: "One partner from first brief to repeat order.",
        description: "Bring a sample, drawing, idea or problem. We define the right development and production route, then stay accountable as the program grows.",
        statement_kicker: "A manufacturing relationship",
        statement_title: "Bring the idea. We build the production path.",
        statement_text: "Start with a sketch, existing product, CAD file or plain-English description. Tin Tech reviews material, tooling, production, branding, packing and delivery requirements.",
        button_label: "See all capabilities",
        button_url: "capabilities.html",
        cards: [
          { icon: "01", title: "Product development", text: "Geometry, materials, drawings, samples, fit reviews and production approvals." },
          { icon: "02", title: "Tooling & molding", text: "Existing formats, modified tooling or a dedicated mold structured around the program." },
          { icon: "03", title: "Branding & pack-out", text: "Color, molded details, print, labels, sourced components, assembly and retail packing." },
          { icon: "04", title: "Delivery coordination", text: "Export packing, freight planning, warehousing support and onward delivery." }
        ]
      },
      portfolio: {
        eyebrow: "Selected portfolio",
        title: "Products and programs ready to discuss.",
        description: "Open any product to review images, available colors or prints, pricing guidance, MOQ, dimensions and technical data.",
        button_label: "View full portfolio →",
        button_url: "portfolio.html",
        empty_title: "Portfolio being prepared",
        empty_text: "Use the project brief to discuss a custom product while published listings are being added."
      },
      process: {
        eyebrow: "How the work moves",
        title: "Six clear stages from request to repeat order.",
        description: "Each stage reduces uncertainty before the next commercial commitment.",
        steps: [
          { title: "Define", text: "Use, dimensions, volume, finish, budget and timing." },
          { title: "Source", text: "Resins, components, packaging and specialist processes." },
          { title: "Engineer", text: "Drawings, tooling route, samples and approvals." },
          { title: "Produce", text: "Controlled runs, in-process checks and repeat records." },
          { title: "Brand & Pack", text: "Decoration, labels, assembly, cartons and presentation." },
          { title: "Deliver", text: "Export packing, freight, warehousing and onward planning." }
        ]
      },
      testimonial: {
        stats: [
          { value: "1M+", label: "pieces stocked and sold with confidence" },
          { value: "4+ years", label: "of ongoing supply experience" },
          { value: "Six-figure", label: "client-reported cumulative savings" }
        ],
        eyebrow: "Long-term client testimonial",
        title: "Consistency that made scaling easier.",
        quote: "Working with the Sri Lankan team at Tin Tech Packaging has been one of the best business decisions I’ve made. Their consistency, quality, and reliability have saved me hundreds of thousands of dollars over time, and the product has never let me down. I’ve stocked and sold over 1,000,000 pieces with complete confidence, and their support has made scaling easy.",
        author: "Long-term Tin Tech client",
        author_note: "Figures and outcomes are reported by the client.",
        badge: "Ongoing supply relationship"
      },
      scale: {
        eyebrow: "A scalable operating model",
        title: "Start with supply. Build deeper when the opportunity is right.",
        description: "Programs can progress from repeat orders to client-owned tooling, reserved production capacity, a dedicated line or a structured manufacturing operation in Sri Lanka.",
        cta_kicker: "Thinking beyond outsourced production?",
        cta_title: "Explore a dedicated line—or your own manufacturing operation in Sri Lanka.",
        cta_text: "The right structure depends on product, volume, capital, quality requirements and long-term commitment.",
        button_label: "Discuss the pathway",
        button_url: "contact.html?project=factory-pathway"
      },
      final_cta: {
        kicker: "Start with a real review",
        title: "Show us what you want to make.",
        text: "Send a sample, sketch, CAD file or product description. We will identify the information needed to define the manufacturing route.",
        button_label: "Send project brief →",
        button_url: "contact.html"
      }
    },
    about: {
      hero: {
        kicker: "About Tin Tech",
        title: "A manufacturing company built around long-term product programs.",
        description: "Tin Tech Packaging combines Sri Lankan production capability with practical commercial coordination, helping brands move from product concept to repeatable supply.",
        aside_title: "What makes the model different",
        aside_text: "Development, tooling, production, branding, packing and delivery planning are handled as one connected program—not a chain of disconnected suppliers."
      },
      company: {
        statement_kicker: "The company",
        statement_title: "Made in Sri Lanka. Managed for dependable export supply.",
        statement_text: "Tin Tech works with businesses that need more than a factory quotation. The aim is to understand the product, define the right manufacturing route, maintain repeat quality and stay accountable as the program grows.",
        button_label: "Discuss your product",
        button_url: "contact.html",
        eyebrow: "Operating approach",
        title: "One team across development, production and delivery.",
        paragraphs: [
          "The Sri Lankan manufacturing team handles sourcing, tooling, production, quality checkpoints, assembly and export packing. George provides a New York-based commercial point of contact, helps facilitate warehousing and keeps communication practical for the client.",
          "The result is a relationship designed to make offshore manufacturing feel controlled, visible and commercially usable."
        ],
        metrics: [
          { value: "4+ years", label: "Ongoing pouch-caddy relationship" },
          { value: "1M+", label: "Pieces sold, client reported" },
          { value: "End-to-end", label: "From brief through delivery planning" }
        ]
      },
      values: {
        eyebrow: "What we stand for",
        title: "The values that protect a repeat production program.",
        description: "The product matters. The habits behind the product matter more.",
        cards: [
          { icon: "01", title: "Consistency", text: "Approved product, documented expectations and repeat controls that reduce surprises between runs." },
          { icon: "02", title: "Reliability", text: "Clear ownership of the next action—from sample approval to packing and freight coordination." },
          { icon: "03", title: "Manufacturing depth", text: "Material sourcing, mold making, injection molding, assembly, private labeling and structured production options." },
          { icon: "04", title: "Growth thinking", text: "Programs can move from a first commercial run to dedicated tooling, reserved capacity or a dedicated operation." }
        ]
      },
      track: {
        eyebrow: "Track record",
        title: "A relationship that has already been tested at scale.",
        description: "Tin Tech has served Outlaw Dip Inc. with its pouch caddy for more than four years and supported other export-market product requirements."
      },
      pathway: {
        eyebrow: "Long-term pathway",
        title: "Outsource production—or build something deeper.",
        description: "For a committed product program, Tin Tech can discuss client-owned tooling, reserved capacity, a dedicated production line or a structured factory pathway in Sri Lanka.",
        kicker: "Choose the operating model that fits the opportunity.",
        cta_title: "From supplier relationship to dedicated manufacturing presence.",
        cta_text: "The structure depends on product, volume, capital, quality requirements and long-term commitment.",
        button_label: "Start the discussion",
        button_url: "contact.html?project=factory-pathway"
      }
    },
    capabilities: {
      hero: {
        kicker: "Capabilities",
        title: "A complete manufacturing path—not just a molding quote.",
        description: "Every project is reviewed across product function, material, tooling, production, quality, branding, packing and delivery before the commercial route is defined.",
        aside_title: "Start from what you have",
        aside_text: "A physical sample, photo, sketch, CAD file, specification or problem statement can begin the review."
      },
      stack: {
        eyebrow: "The capability stack",
        title: "Connected disciplines under one project.",
        description: "Tin Tech can manufacture, source, assemble and coordinate the complete product presentation where the program requires it.",
        cards: [
          { number: "01 · DEFINE", title: "Product brief & feasibility", text: "Translate the commercial idea into a reviewable manufacturing brief.", bullets: ["Intended use and target market", "Dimensions, function and performance", "Target volume, timing and budget", "Make-versus-source assessment"] },
          { number: "02 · ENGINEER", title: "Design & DFM", text: "Develop the geometry and production logic before committing to tooling.", bullets: ["Drawings and dimensional review", "Wall thickness, draft and assembly", "Closure feel and fit testing", "Sample and approval pathway"] },
          { number: "03 · TOOL", title: "Mold making & ownership", text: "Structure the correct tooling route and document ownership terms.", bullets: ["Existing platform or modified tooling", "Dedicated client-owned molds", "Maintenance and storage terms", "Exclusivity and change control"] },
          { number: "04 · SOURCE", title: "Materials & components", text: "Match the resin and sourced components to the product and presentation.", bullets: ["Commodity and engineering resins", "Metal lids, closures and inserts", "Labels, cartons and retail packaging", "Supplier coordination and validation"] },
          { number: "05 · PRODUCE", title: "Injection molding & repeat runs", text: "Move approved products into controlled commercial production.", bullets: ["Production planning and capacity", "Color and finish programs", "In-process quality checkpoints", "Repeat records and run control"] },
          { number: "06 · BRAND", title: "Customization & private label", text: "Build the product around the brand, not just the basic function.", bullets: ["Molded logos and detail", "Printing and label systems", "Color matching and line extensions", "Premium and practical finish routes"] },
          { number: "07 · PACK", title: "Assembly & pack-out", text: "Coordinate the components and presentation before the shipment leaves.", bullets: ["Multi-part assembly", "Bulk, retail and private-label packing", "Carton planning and export protection", "Barcode and insert coordination"] },
          { number: "08 · DELIVER", title: "Freight & onward coordination", text: "Plan the route from Sri Lanka to warehouse or delivery destination.", bullets: ["Export documentation support", "Freight and Incoterm review", "Warehouse facilitation", "Onward delivery planning"] },
          { number: "09 · SCALE", title: "Dedicated production programs", text: "Move beyond project-by-project supply when the volume supports it.", bullets: ["Reserved capacity and repeat schedules", "Dedicated lines and QC plans", "Operating partnerships", "Sri Lanka factory pathway"] }
        ]
      },
      process: {
        eyebrow: "Typical project flow",
        title: "Clear gates before money and time move forward.",
        description: "The exact sequence changes by product, but the principle stays the same: define, approve, produce and repeat.",
        steps: [
          { title: "Brief", text: "Commercial requirement and technical inputs." },
          { title: "Review", text: "Feasibility, risks and missing information." },
          { title: "Proposal", text: "Tooling, unit economics and scope." },
          { title: "Approval", text: "Drawing, sample, color and pack-out." },
          { title: "Production", text: "Controlled run and quality checkpoints." },
          { title: "Repeat", text: "Forecasting, inventory and delivery planning." }
        ]
      },
      markets: {
        eyebrow: "Markets and applications",
        title: "Built for more than one packaging category.",
        description: "Product suitability, compliance and economics are evaluated individually. These are the areas where the manufacturing model is particularly relevant.",
        cards: [
          { title: "Pouch products & accessories", text: "Round caddies, pocket accessories, closures and branded companion products." },
          { title: "Personal care & packaging", text: "Jars, cases, cups, lids, closures, inserts and private-label presentation systems." },
          { title: "Apparel & retail", text: "Garment hangers, hooks, clips, merchandising components and display parts." },
          { title: "Consumer & industrial goods", text: "Housings, covers, organizers, fittings, accessories and made-to-spec components." }
        ]
      },
      note: {
        eyebrow: "Important project note",
        title: "Certification is product-specific.",
        paragraphs: [
          "Food-contact, child-resistant, regulatory or other certification claims are made only where the exact material, product design, intended use, test method and supporting records apply.",
          "Tin Tech distinguishes ordinary manufacturing documentation from product-specific testing and certification requirements before a claim is made."
        ]
      },
      cta: {
        kicker: "Next step",
        title: "Send the product. We will identify the route.",
        text: "Include target quantity, launch timing, dimensions, intended use, required finish and delivery destination for the fastest first review.",
        button_label: "Start the project brief →",
        button_url: "contact.html"
      }
    },
    portfolio: {
      hero_kicker: "Product portfolio",
      hero_title: "Products, platforms and manufacturing programs.",
      hero_description: "Browse the published portfolio by category. Each product page shows available pricing guidance, MOQ, dimensions, material and technical information. Missing details are confirmed during the project review rather than guessed.",
      aside_title: "Need something not shown?",
      aside_text: "The portfolio is a starting point. Bring a sample, drawing or target function and Tin Tech can review a custom development route.",
      search_placeholder: "Search products, applications or materials",
      cta_kicker: "Custom development",
      cta_title: "Do not see the exact item you need?",
      cta_text: "Send the sample, photo, drawing or functional requirement. The team will review whether the best route is existing tooling, modified tooling, a dedicated mold or sourced components.",
      cta_button_label: "Submit product brief →",
      cta_button_url: "contact.html"
    },
    contact_page: {
      hero: {
        kicker: "Start a project",
        title: "Show us what you want to make.",
        description: "Send a sample, sketch, CAD file reference, existing product or plain-English description. The first review identifies the missing information and the likely manufacturing route.",
        aside_title: "For a faster first review",
        aside_text: "Include target quantity, launch timing, dimensions, intended use, finish expectations and delivery destination."
      },
      panel: {
        kicker: "Commercial contact",
        title: "Start with the facts. Build the right proposal.",
        text: "The team will not pretend every project has the same MOQ, material, lead time or tooling route. Those details are defined after the product and commercial requirement are understood.",
        email_label: "Email",
        operating_label: "Operating points",
        inputs_label: "Typical inputs"
      },
      form: {
        name_label: "Your name",
        company_label: "Company",
        email_label: "Business email",
        phone_label: "Phone",
        project_type_label: "Project type",
        quantity_label: "Estimated quantity",
        quantity_placeholder: "Per order or per year",
        destination_label: "Delivery destination",
        destination_placeholder: "City, state, ZIP or country",
        message_label: "Product and project details",
        message_placeholder: "Describe the product, intended use, dimensions, material preference, colors, branding, packaging, target volume and timing. Mention any sample or drawing you can provide.",
        project_types: ["Custom plastic product", "Pouch caddy", "Container or closure", "PP cup + metal lid", "Retail or apparel component", "Private-label packaging program", "Dedicated production line", "Sri Lanka factory pathway", "Product pricing / portfolio item"],
        submit_label: "Send project brief →",
        sending_label: "Sending…",
        success_message: "Your project brief has been received.",
        error_message: "The form could not be sent. Please try again or contact the team directly.",
        privacy_note: "Your information is used only to review and respond to the manufacturing inquiry."
      },
      before_send: {
        eyebrow: "Before you send",
        title: "Useful information for the first review.",
        cards: [
          { title: "Product", text: "What it does, who uses it, approximate dimensions and whether a sample or drawing exists." },
          { title: "Commercial scope", text: "Expected quantity per order or year, target launch date and acceptable investment in tooling." },
          { title: "Brand & pack-out", text: "Color, finish, logo method, labels, assembly, retail packaging and carton requirements." },
          { title: "Delivery", text: "Destination, warehouse or fulfillment needs and whether onward delivery coordination is required." }
        ]
      }
    },
    product_page: {
      kicker: "Product details",
      intro: "Select an available color, print, finish or style to view the matching product images.",
      request_label: "Request pricing & review"
    },
    seo: {
      home: { title: "Tin Tech Packaging | Product Development & Plastic Manufacturing", description: "Tin Tech Packaging develops custom plastic packaging and products from concept and tooling through production, private labeling, packing and delivery coordination." },
      about: { title: "About Tin Tech Packaging | Manufacturing Partner", description: "Learn how Tin Tech Packaging combines Sri Lankan manufacturing, commercial coordination and long-term product-development support." },
      capabilities: { title: "Capabilities | Tin Tech Packaging", description: "Explore Tin Tech Packaging capabilities across product development, sourcing, mold making, injection molding, branding, packing and delivery coordination." },
      portfolio: { title: "Product Portfolio | Tin Tech Packaging", description: "Browse Tin Tech Packaging products and manufacturing programs with images, pricing information, MOQs, dimensions and technical data." },
      contact: { title: "Start a Project | Tin Tech Packaging", description: "Send Tin Tech Packaging your product brief for a review of material, tooling, production, branding, packing and delivery requirements." },
      product: { title: "Product Details | Tin Tech Packaging", description: "Review product images, selectable colors and prints, pricing guidance, MOQ, dimensions, materials and technical information." }
    }
  };

  window.TinTechDefaultHeroSlides = [
    {
      id: "default-slide",
      image_url: "assets/images/product-pouch-caddy.svg",
      storage_path: null,
      alt_text: "Tin Tech customizable pouch caddy platform",
      image_position: "center center",
      kicker: "Sri Lanka manufacturing · New York coordination",
      headline: "From product idea to",
      accent_text: "repeatable production.",
      description: "Tin Tech brings product development, mold making, plastic manufacturing, customization, private labeling, packing and delivery coordination into one accountable program.",
      primary_label: "Request a manufacturing review →",
      primary_url: "contact.html",
      secondary_label: "View full portfolio",
      secondary_url: "portfolio.html",
      badge_title: "Built around your product",
      badge_text: "Existing platform, modified tooling or dedicated development",
      trust_items: ["Custom molds and tooling", "Flexible production programs", "Source, make, brand and pack"],
      duration_ms: 6500,
      sort_order: 10,
      is_active: true
    }
  ];
})();