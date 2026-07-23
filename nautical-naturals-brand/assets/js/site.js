
function initPackImages(){
  const parts=window.NN_IMAGE_PARTS||[];
  if(!parts.length)return;
  window.NN_PACK_IMAGE="data:image/jpeg;base64,"+parts.join("");
  document.querySelectorAll("[data-pack-image]").forEach(img=>{img.src=window.NN_PACK_IMAGE;});
}

const NN = {
  supabaseUrl: "https://zadxvmpgngwtpsmdkcod.supabase.co",
  publicKey: "sb_publishable_MxL_uLP-7iWrPDIM2J_RPQ_cDiVHZoA"
};

const siteIndex = [
  {title:"Home",url:"index.html",desc:"Nautical Naturals brand and Daily Diet overview",keywords:"home fish first dog food daily diet"},
  {title:"Products",url:"products.html",desc:"Explore the Nautical Naturals product family",keywords:"products range puppy sensitive active"},
  {title:"Daily Diet",url:"daily-diet.html",desc:"The core fish-first all-life-stages recipe",keywords:"daily diet product fish omega coat"},
  {title:"Ingredients",url:"ingredients.html",desc:"The sea-and-soil ingredient philosophy",keywords:"ingredients fish salmon shrimp coconut rice sweet potato flax"},
  {title:"Nutrition",url:"nutrition.html",desc:"The Nautical nutrition standard",keywords:"nutrition protein omega vitality balanced"},
  {title:"Feeding Guide",url:"feeding-guide.html",desc:"Transition guidance and bowl-planning support",keywords:"feeding guide transition portion dog size activity"},
  {title:"Our Story",url:"our-story.html",desc:"The purpose and principles behind Nautical Naturals",keywords:"story purpose promise brand"},
  {title:"Sustainability",url:"sustainability.html",desc:"Responsible sourcing and packaging principles",keywords:"sustainability seafood sourcing packaging responsibility"},
  {title:"Retail & Trade",url:"trade.html",desc:"Retailer, distributor and wholesale partnerships",keywords:"wholesale retail distributor trade partner"},
  {title:"FAQ",url:"faq.html",desc:"Answers about products, ingredients and the brand",keywords:"faq questions"},
  {title:"Contact",url:"contact.html",desc:"Speak with the Nautical Naturals team",keywords:"contact support inquiry"},
  {title:"Private Review",url:"review.html",desc:"Private brand review for George",keywords:"review feedback george"}
];

function q(s,c=document){return c.querySelector(s)}
function qa(s,c=document){return [...c.querySelectorAll(s)]}

function initMenu(){
  const btn=q("#menuButton"),drawer=q("#mobileDrawer"),close=q("#drawerClose");
  if(!btn||!drawer)return;
  const set=open=>{drawer.classList.toggle("open",open);document.body.classList.toggle("menu-open",open);btn.setAttribute("aria-expanded",String(open));};
  btn.addEventListener("click",()=>set(true)); close?.addEventListener("click",()=>set(false));
  drawer.addEventListener("click",e=>{if(e.target.closest("a"))set(false)});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")set(false)});
}

function initSearch(){
  const modal=q("#searchModal"),open=q("#searchButton"),close=q("#searchClose"),input=q("#siteSearch"),results=q("#searchResults");
  if(!modal||!open)return;
  const set=v=>{modal.classList.toggle("open",v);document.body.classList.toggle("modal-open",v);if(v)setTimeout(()=>input.focus(),60)};
  const render=term=>{
    const t=term.trim().toLowerCase();
    const matches=!t?siteIndex.slice(0,6):siteIndex.filter(x=>(x.title+" "+x.desc+" "+x.keywords).toLowerCase().includes(t));
    results.innerHTML=matches.map(x=>`<a class="search-result" href="${x.url}"><strong>${x.title}</strong><span>${x.desc}</span></a>`).join("") || `<div class="search-result"><strong>No result found</strong><span>Try products, ingredients, feeding, trade or contact.</span></div>`;
  };
  open.addEventListener("click",()=>{set(true);render("")});close.addEventListener("click",()=>set(false));
  modal.addEventListener("click",e=>{if(e.target===modal)set(false)});input.addEventListener("input",()=>render(input.value));
  document.addEventListener("keydown",e=>{if(e.key==="Escape")set(false)});
}

function initReveal(){
  const obs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");obs.unobserve(e.target)}}),{threshold:.11});
  qa(".reveal").forEach(el=>obs.observe(el));
}

function initProgress(){
  const bar=q("#scrollProgress");if(!bar)return;
  addEventListener("scroll",()=>{const max=document.documentElement.scrollHeight-innerHeight;bar.style.width=(max>0?scrollY/max*100:0)+"%"},{passive:true});
}

function initFaq(){
  qa(".faq-question").forEach(btn=>btn.addEventListener("click",()=>{
    const item=btn.closest(".faq-item"),open=item.classList.toggle("open");
    btn.setAttribute("aria-expanded",String(open));
  }));
}

function initTabs(){
  qa("[data-tabs]").forEach(group=>{
    const buttons=qa(".tab-btn",group),panels=qa(".tab-panel",group);
    buttons.forEach(btn=>btn.addEventListener("click",()=>{
      buttons.forEach(x=>x.classList.remove("active"));panels.forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");q("#"+btn.dataset.tab,group).classList.add("active");
    }));
  });
}

async function postRow(table,payload){
  const res=await fetch(`${NN.supabaseUrl}/rest/v1/${table}`,{
    method:"POST",
    headers:{apikey:NN.publicKey,Authorization:"Bearer "+NN.publicKey,"Content-Type":"application/json",Prefer:"return=minimal"},
    body:JSON.stringify(payload)
  });
  if(!res.ok)throw new Error(await res.text());
}

function initInquiryForms(){
  qa(".inquiry-form").forEach(form=>form.addEventListener("submit",async e=>{
    e.preventDefault();if(!form.reportValidity())return;
    const fd=new FormData(form),status=q(".form-status",form),btn=q('button[type="submit"]',form);
    if((fd.get("company_website")||"").trim())return;
    btn.disabled=true;const old=btn.textContent;btn.textContent="Sending…";status.textContent="Securely sending your message…";status.className="form-status";
    try{
      await postRow("nautical_naturals_inquiries",{
        inquiry_type:fd.get("inquiry_type")||form.dataset.type||"general",
        full_name:(fd.get("full_name")||"").trim(),
        email:(fd.get("email")||"").trim(),
        phone:(fd.get("phone")||"").trim()||null,
        company_name:(fd.get("company_name")||"").trim()||null,
        country:(fd.get("country")||"").trim()||null,
        subject:(fd.get("subject")||"").trim(),
        message:(fd.get("message")||"").trim(),
        page_url:location.href.slice(0,500),user_agent:navigator.userAgent.slice(0,1000),honeypot:"",status:"new"
      });
      form.reset();status.textContent="Thank you. Your message has been received.";status.className="form-status success";
    }catch(err){console.error(err);status.textContent="Your message could not be sent. Please try again.";status.className="form-status error"}
    finally{btn.disabled=false;btn.textContent=old}
  }));
}

function initReviewForm(){
  const form=q("#brandReviewForm");if(!form)return;
  form.addEventListener("submit",async e=>{
    e.preventDefault();if(!form.reportValidity())return;
    const fd=new FormData(form),status=q(".form-status",form),btn=q('button[type="submit"]',form);
    if((fd.get("company_website")||"").trim())return;
    btn.disabled=true;const old=btn.textContent;btn.textContent="Sending…";status.textContent="Securely submitting your review…";status.className="form-status";
    try{
      await postRow("nautical_naturals_feedback",{
        reviewer_name:(fd.get("reviewer_name")||"").trim(),reviewer_email:(fd.get("reviewer_email")||"").trim()||null,
        rating:Number(fd.get("rating")),overall_reaction:fd.get("overall_reaction"),
        liked_most:(fd.get("liked_most")||"").trim(),suggestions:(fd.get("suggestions")||"").trim(),
        additional_notes:(fd.get("additional_notes")||"").trim()||null,page_url:location.href.slice(0,500),
        user_agent:navigator.userAgent.slice(0,1000),honeypot:"",review_status:"new"
      });
      form.reset();q("#reviewerName",form).value="George";status.textContent="Thank you. Your private review has been received.";status.className="form-status success";
    }catch(err){console.error(err);status.textContent="The review could not be sent. Please try again.";status.className="form-status error"}
    finally{btn.disabled=false;btn.textContent=old}
  });
}

function initNewsletter(){
  qa(".newsletter-form").forEach(form=>form.addEventListener("submit",async e=>{
    e.preventDefault();const email=q('input[type="email"]',form),status=form.nextElementSibling,btn=q("button",form);
    if(!email.reportValidity())return;
    btn.disabled=true;
    try{
      await postRow("nautical_naturals_inquiries",{inquiry_type:"general",full_name:"Newsletter Subscriber",email:email.value.trim(),phone:null,company_name:null,country:null,subject:"Newsletter signup",message:"Newsletter signup from the Nautical Naturals website.",page_url:location.href.slice(0,500),user_agent:navigator.userAgent.slice(0,1000),honeypot:"",status:"new"});
      email.value="";status.textContent="You’re on the list.";status.style.color="#fff";
    }catch(err){status.textContent="Could not subscribe. Try again.";status.style.color="#e8a38e"}
    finally{btn.disabled=false}
  }));
}

function initPlanner(){
  const form=q("#feedingPlanner");if(!form)return;
  const result=q("#plannerResult");
  form.addEventListener("submit",e=>{
    e.preventDefault();
    const size=q("#dogSize").value,activity=q("#activity").value,stage=q("#lifeStage").value;
    const sizeText={small:"the lower end",medium:"the middle",large:"the upper-middle area",giant:"the upper end"}[size];
    const activityText={low:"then monitor weight closely and reduce if needed",normal:"and adjust gradually based on body condition",high:"with additional energy needs reviewed carefully"}[activity];
    const mealText={puppy:"split across three or more meals",adult:"split across two meals",senior:"split across two smaller, consistent meals"}[stage];
    result.innerHTML=`<strong>Your starting approach</strong><br>Use ${sizeText} of the feeding range printed on the final pack, ${mealText}, ${activityText}. Transition slowly over seven days and keep fresh water available.`;
    result.classList.add("show");
  });
}

function initPrint(){qa("[data-print]").forEach(btn=>btn.addEventListener("click",()=>window.print()))}

document.addEventListener("DOMContentLoaded",()=>{
  initPackImages();initMenu();initSearch();initReveal();initProgress();initFaq();initTabs();initInquiryForms();initReviewForm();initNewsletter();initPlanner();initPrint();
});
