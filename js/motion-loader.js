(function(){
  "use strict";
  var body=document.body;
  if(!body||!body.dataset.motion)return;
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;

  function load(src){
    return new Promise(function(resolve,reject){
      var script=document.createElement("script");
      script.src=src;
      script.onload=resolve;
      script.onerror=reject;
      document.head.appendChild(script);
    });
  }
  load("/assets/vendor/gsap/gsap.min.js").then(function(){
    return load("/assets/vendor/gsap/ScrollTrigger.min.js");
  }).then(function(){
    return load("/js/motion-runtime.js?v=20260721-proof5");
  }).catch(function(){
    document.documentElement.classList.add("motion-failed");
  });
})();
