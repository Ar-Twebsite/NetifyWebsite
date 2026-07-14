(function(){
  "use strict";
  var root=document.documentElement;
  var body=document.body;
  var header=document.querySelector("[data-header]");
  var toggle=document.querySelector(".menu-toggle");
  var menu=document.getElementById("mobile-menu");
  var lastFocused=null;

  function menuFocusables(){
    var items=[];
    if(toggle)items.push(toggle);
    if(menu)items=items.concat(Array.prototype.slice.call(menu.querySelectorAll("a[href],button:not([disabled])")));
    return items.filter(function(item){return item.offsetParent!==null;});
  }
  function setMenu(open){
    if(!toggle||!menu)return;
    if(open){
      lastFocused=document.activeElement;
      menu.hidden=false;
      toggle.setAttribute("aria-expanded","true");
      toggle.textContent=toggle.dataset.close||"Close";
      body.classList.add("menu-open");
      requestAnimationFrame(function(){menu.classList.add("is-open");var items=menuFocusables();if(items[1])items[1].focus();});
    }else{
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded","false");
      toggle.textContent=toggle.dataset.open||"Menu";
      body.classList.remove("menu-open");
      window.setTimeout(function(){menu.hidden=true;if(lastFocused&&lastFocused.focus)lastFocused.focus();},180);
    }
    document.dispatchEvent(new CustomEvent("netify:menu",{detail:{open:open}}));
  }
  if(toggle&&menu){
    toggle.addEventListener("click",function(){setMenu(menu.hidden);});
    menu.addEventListener("click",function(event){if(event.target.closest("a"))setMenu(false);});
    document.addEventListener("keydown",function(event){
      if(menu.hidden)return;
      if(event.key==="Escape"){event.preventDefault();setMenu(false);return;}
      if(event.key!=="Tab")return;
      var items=menuFocusables();
      if(!items.length)return;
      var first=items[0],last=items[items.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
    window.matchMedia("(min-width:1121px)").addEventListener("change",function(event){if(event.matches&&!menu.hidden)setMenu(false);});
  }

  document.querySelectorAll("[data-language]").forEach(function(link){
    link.addEventListener("click",function(){try{localStorage.setItem("netify_lang",link.dataset.language);}catch(error){}});
  });

  function stickyCta(){
    var sticky=document.querySelector(".mobile-sticky");
    var hero=document.querySelector(".hero-actions");
    var finalCta=document.querySelector(".final-cta");
    var story=document.querySelector(".signature-story");
    if(!sticky||!hero||!("IntersectionObserver" in window))return;
    var state={hero:true,final:false,story:false,menu:false};
    function contentBehindCta(){
      if(!document.elementsFromPoint)return false;
      return document.elementsFromPoint(window.innerWidth/2,window.innerHeight-38).some(function(element){
        if(element===sticky||sticky.contains(element))return false;
        return !!element.closest(".route-figure,.evidence-grid,.deep-dive,.mobile-phase,.role-scripts,.trust-layout,.final-layout");
      });
    }
    function apply(){
      var visible=window.innerWidth<=560&&!state.hero&&!state.final&&!state.story&&!state.menu&&!contentBehindCta();
      sticky.classList.toggle("is-visible",visible);
      sticky.tabIndex=visible?0:-1;
      sticky.setAttribute("aria-hidden",visible?"false":"true");
    }
    new IntersectionObserver(function(e){state.hero=e[0].isIntersecting;apply();},{rootMargin:"-66px 0px 0px"}).observe(hero);
    if(finalCta)new IntersectionObserver(function(e){state.final=e[0].isIntersecting;apply();},{rootMargin:"0px 0px -30%"}).observe(finalCta);
    if(story)new IntersectionObserver(function(e){state.story=e[0].isIntersecting;apply();},{threshold:.05}).observe(story);
    document.addEventListener("netify:menu",function(e){state.menu=e.detail.open;apply();});
    window.addEventListener("resize",apply,{passive:true});
    window.addEventListener("scroll",apply,{passive:true});
    apply();
  }

  if(header&&("IntersectionObserver" in window)){
    var marker=document.createElement("span");
    marker.setAttribute("aria-hidden","true");
    marker.style.cssText="position:absolute;top:0;width:1px;height:1px";
    body.prepend(marker);
    new IntersectionObserver(function(entries){header.classList.toggle("is-scrolled",!entries[0].isIntersecting);}).observe(marker);
  }

  stickyCta();
  root.dataset.coreReady="true";
})();
