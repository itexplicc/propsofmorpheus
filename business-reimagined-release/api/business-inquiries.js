'use strict';
const original=require('./inquiries');
module.exports=async function(req,res){const origin=req.headers.origin;const allowed=new Set(['https://morpheuspd.io','https://morpheus-website-portfolio.vercel.app']);if(req.method==='POST'&&!allowed.has(origin)){res.setHeader('Cache-Control','no-store');return res.status(403).json({error:'This submission origin is not allowed.'});}if(origin==='https://morpheuspd.io')req.headers.origin='https://morpheus-website-portfolio.vercel.app';return original(req,res);};
