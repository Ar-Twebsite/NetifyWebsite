(function(){
  "use strict";
  if(!window.gsap||!window.ScrollTrigger)return;
  var gsap=window.gsap;
  var ScrollTrigger=window.ScrollTrigger;
  var root=document.documentElement;
  var body=document.body;
  var mm=gsap.matchMedia();
  var api=window.__NETIFY_MOTION__=window.__NETIFY_MOTION__||{};
  gsap.registerPlugin(ScrollTrigger);

  function setupHero(scope){
    gsap.to(scope.querySelectorAll(".hero-enter"),{opacity:1,y:0,duration:.52,stagger:.075,ease:"power2.out",clearProps:"transform"});
  }

  function copyTransition(timeline,copies,current,next,at,end){
    timeline.set(copies[current],{autoAlpha:0,y:0},end)
      .set(copies[next],{autoAlpha:1,y:0},end);
  }

  function setupSignature(scope){
    var story=scope.querySelector("[data-signature-story]");
    if(!story)return;
    var copies=Array.prototype.slice.call(story.querySelectorAll("[data-story-copy]"));
    var client=story.querySelector(".state-client");
    var role=story.querySelector(".state-role");
    var person=story.querySelector(".state-person");
    var variants=story.querySelector(".state-variants");
    var review=story.querySelector(".state-review");
    var genericPath=story.querySelector(".generic-path");
    var otherPeople=story.querySelectorAll(".client-other");
    var selectedClient=story.querySelectorAll(".client-selected");
    var nonRole=story.querySelectorAll(".client-selected:not(.role-selected)");
    var nonTarget=story.querySelectorAll(".person:not(.person-target)");
    var figure=story.querySelector(".story-figure");

    gsap.set(copies,{autoAlpha:0,y:9});
    gsap.set(copies[0],{autoAlpha:1,y:0});
    gsap.set([client,role,person,variants,review],{autoAlpha:0});
    gsap.set(otherPeople,{opacity:1});
    gsap.set(selectedClient,{opacity:1});

    var tl=gsap.timeline({
      defaults:{ease:"none"},
      scrollTrigger:{
        id:"home-signature",
        trigger:story,
        start:function(){return "top top+="+(parseFloat(getComputedStyle(root).getPropertyValue("--nav-h"))||0);},
        end:"bottom bottom",
        scrub:.18,
        invalidateOnRefresh:true
      }
    });
    tl.to({}, {duration:1},0);

    copyTransition(tl,copies,0,1,.10,.14);
    tl.to(genericPath,{opacity:.22,duration:.04},.10)
      .to(client,{autoAlpha:1,duration:.04},.10)
      .to(otherPeople,{opacity:.35,duration:.04},.10);

    copyTransition(tl,copies,1,2,.24,.28);
    tl.to(role,{autoAlpha:1,duration:.04},.24)
      .to(nonRole,{opacity:.35,duration:.04},.24);

    copyTransition(tl,copies,2,3,.38,.42);
    tl.to(person,{autoAlpha:1,duration:.04},.38)
      .to(nonTarget,{opacity:.22,duration:.04},.38)
      .to(story.querySelector(".person-target"),{opacity:1,scale:1.18,transformOrigin:"50% 50%",duration:.04},.38);

    copyTransition(tl,copies,3,4,.52,.56);
    tl.fromTo(variants,{autoAlpha:0,y:12},{autoAlpha:1,y:0,duration:.04,immediateRender:false},.52)
      .to(story.querySelector(".audience-field"),{opacity:.52,duration:.04},.52);

    copyTransition(tl,copies,4,5,.66,.70);
    tl.fromTo(review,{autoAlpha:0,x:10},{autoAlpha:1,x:0,duration:.04,immediateRender:false},.66);

    api.signature={
      timeline:tl,
      trigger:tl.scrollTrigger,
      seek:function(value){
        var p=gsap.utils.clamp(0,1,Number(value)||0);
        var st=tl.scrollTrigger;
        st.scroll(st.start+(st.end-st.start)*p);
        tl.totalProgress(p);
        ScrollTrigger.update();
        return {progress:p,triggerProgress:st.progress};
      },
      opacity:function(){
        return Array.prototype.map.call(copies,function(item){return Number(gsap.getProperty(item,"opacity"));});
      }
    };

    var qaState=new URLSearchParams(window.location.search).get("qa-state");
    var qaProgress={broadcast:.05,client:.19,role:.33,person:.47,adaptation:.61,review:.84};
    if(Object.prototype.hasOwnProperty.call(qaProgress,qaState)){
      tl.scrollTrigger.disable(false,false);
      tl.totalProgress(qaProgress[qaState]).pause();
      root.dataset.qaState=qaState;
    }

    if(figure&&window.matchMedia("(hover:hover) and (pointer:fine)").matches){
      var qx=gsap.quickTo(figure,"x",{duration:.32,ease:"power2.out"});
      var qy=gsap.quickTo(figure,"y",{duration:.32,ease:"power2.out"});
      figure.addEventListener("pointermove",function(event){var r=figure.getBoundingClientRect();qx(((event.clientX-r.left)/r.width-.5)*6);qy(((event.clientY-r.top)/r.height-.5)*6);});
      figure.addEventListener("pointerleave",function(){qx(0);qy(0);});
    }
  }

  function setupRouteScenes(scope){
    scope.querySelectorAll("[data-route-scene]").forEach(function(scene){
      var parts=scene.querySelectorAll(".scene-part");
      if(!parts.length)return;
      gsap.fromTo(parts,{opacity:.28,y:10},{opacity:1,y:0,duration:1,stagger:.12,ease:"none",scrollTrigger:{trigger:scene,start:"top 88%",end:"top 62%",scrub:.22,invalidateOnRefresh:true}});
      var connector=scene.querySelector(".scene-connector");
      if(connector){
        var length=connector.getTotalLength?connector.getTotalLength():800;
        gsap.fromTo(connector,{strokeDasharray:length,strokeDashoffset:length},{strokeDashoffset:0,ease:"none",scrollTrigger:{trigger:scene,start:"top 88%",end:"top 66%",scrub:.2,invalidateOnRefresh:true}});
      }
    });
  }

  function pointerRefinement(scope){
    if(!window.matchMedia("(hover:hover) and (pointer:fine)").matches)return;
    scope.querySelectorAll("[data-pointer-refine]").forEach(function(item){
      if(item.closest("[data-signature-story]"))return;
      var qx=gsap.quickTo(item,"x",{duration:.3,ease:"power2.out"});
      var qy=gsap.quickTo(item,"y",{duration:.3,ease:"power2.out"});
      item.addEventListener("pointermove",function(event){var r=item.getBoundingClientRect();qx(((event.clientX-r.left)/r.width-.5)*6);qy(((event.clientY-r.top)/r.height-.5)*6);});
      item.addEventListener("pointerleave",function(){qx(0);qy(0);});
    });
  }

  mm.add("(min-width:1121px) and (prefers-reduced-motion:no-preference)",function(){
    return gsap.context(function(){root.classList.add("motion-ready");setupHero(body);setupSignature(body);setupRouteScenes(body);pointerRefinement(body);},body);
  });
  mm.add("(max-width:1120px) and (prefers-reduced-motion:no-preference)",function(){
    return gsap.context(function(){root.classList.add("motion-ready");setupHero(body);setupRouteScenes(body);pointerRefinement(body);},body);
  });

  var timer=0;
  function refresh(){
    window.clearTimeout(timer);
    timer=window.setTimeout(function(){
      var signature=ScrollTrigger.getById("home-signature");
      var progress=signature&&signature.isActive?signature.progress:null;
      ScrollTrigger.refresh();
      signature=ScrollTrigger.getById("home-signature");
      if(signature&&progress!==null){window.scrollTo(0,signature.start+progress*(signature.end-signature.start));ScrollTrigger.update();}
    },120);
  }
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(refresh);
  window.addEventListener("resize",refresh,{passive:true});
  window.addEventListener("orientationchange",refresh);
  window.addEventListener("pageshow",refresh);
  document.addEventListener("toggle",refresh,true);
})();
