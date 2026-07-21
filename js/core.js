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

  function fitRouter(){
    var EV={demo:"netify/demo",explore:"netify/intro",fit:"netify/fit",savings:"netify/savings",platform:"netify/platform"};
    Array.prototype.forEach.call(document.querySelectorAll("[data-fitlite]"),function(f){
      var sel=f.querySelector("select"),go=f.querySelector("a.button"),em=f.querySelector("input[type=email]");
      if(!sel||!go)return;
      var utm=f.getAttribute("data-utm")||"fitlite";
      function upd(){
        var url="https://cal.com/"+(EV[sel.value]||"netify/demo")+"?utm_source=netify&utm_medium=website&utm_content="+utm;
        var e=em&&em.value.trim();
        if(e)url+="&email="+encodeURIComponent(e);
        go.setAttribute("href",url);
      }
      sel.addEventListener("change",upd);
      if(em)em.addEventListener("input",upd);
      f.addEventListener("submit",function(e){e.preventDefault();});
      upd();
    });
  }
  function penInk(){
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    var marks=document.querySelectorAll(".pen-mark");
    if(!marks.length)return;
    var NS="http://www.w3.org/2000/svg";
    function ease(t){return 1-Math.pow(1-t,3);} // veloce all'inizio, rallenta alla fine
    function tween(dur,step,done){
      var t0=null;
      function frame(now){
        if(t0===null)t0=now;
        var k=Math.min(1,(now-t0)/dur);
        step(ease(k));
        if(k<1)requestAnimationFrame(frame);
        else if(done)done();
      }
      requestAnimationFrame(frame);
    }
    Array.prototype.forEach.call(marks,function(m){
      var host=m.closest("h1")||m.parentElement;
      if(!host)return;
      var started=false;
      function fallbackStatic(){m.classList.remove("pen-live");m.classList.add("pen-static");}
      function start(){
        if(started)return;started=true;
        try{
          var rects=Array.prototype.slice.call(m.getClientRects()).filter(function(r){return r.width>2;});
          if(!rects.length||rects.length>4){fallbackStatic();return;}
          m.classList.add("pen-live");
          if(getComputedStyle(host).position==="static")host.style.position="relative";
          var hostRect=host.getBoundingClientRect();
          var fs=parseFloat(getComputedStyle(m).fontSize)||48;
          var totalW=rects.reduce(function(a,r){return a+r.width;},0);
          var frags=rects.map(function(r,i){
            var first=i===0,last=i===rects.length-1;
            var svg=document.createElementNS(NS,"svg");
            svg.setAttribute("class","pen-stroke");
            svg.setAttribute("viewBox","0 0 100 12");
            svg.setAttribute("preserveAspectRatio","none");
            svg.setAttribute("aria-hidden","true");
            var h=fs*.34;
            svg.style.left=(r.left-hostRect.left-fs*.03)+"px";
            svg.style.top=(r.top-hostRect.top+r.height-h*.5)+"px";
            svg.style.width=(r.width+fs*.06)+"px";
            svg.style.height=h+"px";
            svg.innerHTML='<g fill="none" stroke="#FF4B23" stroke-linecap="round">'
              +(first?'<ellipse class="pen-blot" cx="2.3" cy="5.8" rx=".8" ry=".6" fill="#FF4B23" stroke="none" opacity="0"/>':'')
              +'<path class="pen-main" d="M2 5.6 Q50 8.2 98 5.2" stroke-width="1.5"/>'
              +'<path class="pen-echo" d="M2.6 6.2 Q50 8.8 97.2 5.8" stroke-width=".7" opacity=".45"/>'
              +(last?'<circle class="pen-end" cx="97.7" cy="5.3" r=".5" fill="#FF4B23" stroke="none" opacity="0"/>':'')
              +'</g>';
            host.appendChild(svg);
            var strokes=Array.prototype.map.call(svg.querySelectorAll("path"),function(p){
              var L=p.getTotalLength();
              p.setAttribute("stroke-dasharray",L);
              p.setAttribute("stroke-dashoffset",L);
              return {p:p,L:L};
            });
            return {svg:svg,strokes:strokes,dur:Math.max(260,950*(r.width/totalW))};
          });
          function drawFrag(i){
            if(i>=frags.length)return;
            var f=frags[i];
            tween(f.dur,function(k){
              f.strokes.forEach(function(s){s.p.setAttribute("stroke-dashoffset",s.L*(1-k));});
            },function(){
              var end=f.svg.querySelector(".pen-end");
              if(end)tween(130,function(k){end.setAttribute("opacity",.8*k);});
              window.setTimeout(function(){drawFrag(i+1);},120); // la penna passa alla riga dopo
            });
          }
          var blot=frags[0].svg.querySelector(".pen-blot");
          if(blot)tween(140,function(k){blot.setAttribute("opacity",.85*k);});
          window.setTimeout(function(){drawFrag(0);},90);
        }catch(err){fallbackStatic();}
      }
      // consecutive: prima finisce l'ingresso, poi (pausa breve) parte la penna
      var kicked=false;
      function kick(delay){if(kicked)return;kicked=true;window.setTimeout(start,delay);}
      try{
        var anims=host.getAnimations?host.getAnimations():[];
        if(anims.length){
          // la penna entra a scena ferma: dopo l'ingresso e l'assestamento dei documenti
          Promise.all(anims.map(function(a){return a.finished;})).then(function(){kick(500);},function(){kick(500);});
          window.setTimeout(function(){kick(500);},2600); // rete di sicurezza
        }else{
          kick(900);
        }
      }catch(e){kick(700);}
    });
    window.addEventListener("resize",function(){
      Array.prototype.forEach.call(document.querySelectorAll(".pen-stroke"),function(el){el.parentNode&&el.parentNode.removeChild(el);});
      Array.prototype.forEach.call(document.querySelectorAll(".pen-mark.pen-live"),function(el){el.classList.remove("pen-live");el.classList.add("pen-static");});
    },{once:true,passive:true});
  }
  stickyCta();
  fitRouter();
  if(document.fonts&&document.fonts.ready){document.fonts.ready.then(penInk);}else{penInk();}
  root.dataset.coreReady="true";
})();
