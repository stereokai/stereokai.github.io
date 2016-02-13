/*!
 * Wix-Templates
 * Home templates browser - front end
 * 
 * @author Tom Alon
 * @version 0.0.1
 * Copyright 2016. Proprietary licensed.
 */
(function (window, document, undefined) {
  'use strict';

  // NanoScroller bootstrap
  var isNanoCompatible    = isBlink, // Currently we support blink only
      nanoScrollerPromise,
      $; // Save a local-scoped copy of our jQuery so it never gets overwritten (assignment below)

  if (isNanoCompatible) {
    nanoScrollerPromise = (loadScript('//ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.js'))()
      .catch(loadScript('assets/js/jquery.min.js'))
      .then(function () {
        $ = jQuery.noConflict();
      })
      .then(loadScript('assets/js/jquery.nanoscroller.js'));
  }

  function nanoScroller(fn) {
    isNanoCompatible && nanoScrollerPromise.then(fn);
  }

  function loadScript(url, async) {
    function resolve() {
      var promise = new Promise(function (resolve, reject) {
        var script = document.createElement('script');

        script.type    = 'text/javascript';
        script.async   = async || true;
        script.src     = url;
        script.onerror = reject;
        script.onload  = resolve;

        document.head.appendChild(script);
      });

      return promise;
    }

    return resolve;
  }

  function randomUUID() {
    var s = [], itoh = '0123456789ABCDEF';
    for (var i = 0; i < 36; i++) s[i] = Math.floor(Math.random() * 0x10);
    s[14] = 4;
    s[19] = (s[19] & 0x3) | 0x8;
    for (var i = 0; i < 36; i++) s[i] = itoh[s[i]];
    s[8] = s[13] = s[18] = s[23] = '-';
    return s.join('');
  }

  function makeApiUrl(entryPoint) {
    var local = location.hostname == 'localhost';

    return window.location.origin + (local ? '/api/' : /_api/ + W.App.Templates.name + '/') + entryPoint;
  }

  function debounce(func, wait, immediate) {
    var timeout;

    return function () {
      var context = this, args = arguments;

      var later = function () {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };

      var callNow = immediate && !timeout;

      clearTimeout(timeout);
      timeout = setTimeout(later, wait);

      if (callNow) func.apply(context, args);
    };
  };

  var delimiter   = '/html/',
      rootPath    = location.pathname.split(delimiter)[0],
      environment = window.location.hostname.substring(window.location.hostname.indexOf('.'));

  if (!window.location.origin) {
    window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port : '');
  }

  var forEach = Array.prototype.forEach;
  var map     = Array.prototype.map;

  var main = document.getElementsByTagName('main')[0];
  var headerHeight;

  var _infos, _thumbnails, _infoSwitches, _hovers;

  function resetElementRefs() {
    _infos        = null;
    _thumbnails   = null;
    _infoSwitches = null;
    _hovers       = null;
  }

  function getInfos() {
    if (!_infos) _infos =
      document.querySelectorAll('.tg-information');

    return _infos;
  }

  function getThumbnails() {
    if (!_thumbnails) _thumbnails =
      document.querySelectorAll('.tg-template-img');

    return _thumbnails;
  }

  function getInfoSwitches() {
    if (!_infoSwitches) _infoSwitches =
      document.querySelectorAll('.tg-hover > input[type=checkbox]');

    return _infoSwitches;
  }

  function getHovers() {
    if (!_hovers) _hovers =
      document.querySelectorAll('.tg-hover');

    return _hovers;
  }

  var errorObject = { value: null };

  function tryCatch(fn) {
    try {
      return fn();
    }
    catch (e) {
      errorObject.value = e;
      return errorObject;
    }
  }

  // var scrollEvents = isFirefox ? ['mousewheel', 'DOMMouseScroll', 'MozMousePixelScroll']
  //                              : ['scroll'];

  var scrollEvents =  ('onwheel' in document || document.documentMode >= 9) ?
                      ['wheel'] : ['mousewheel', 'DomMouseScroll', 'MozMousePixelScroll'];

  console.log('scroll events:', scrollEvents)

  function getScrollTop() {
    return (isBlink || isSafari || isEdge) ? document.body.scrollTop
                                           : document.documentElement.scrollTop;
  }

  function setScrollTop(scrollTop) {
    if (isBlink || isSafari || isEdge) {
      document.body.scrollTop = scrollTop;
    } else {
      document.documentElement.scrollTop = scrollTop;
    }
  }

  var sceneDuration = {
    value: 0
  };

  var onDomReady = function (callback) {
    document.readyState == 'interactive' || document.readyState == 'complete' ? callback() : document.addEventListener('DOMContentLoaded', callback);
  };

  function getSceneDuration() {
    // Duration formula:
    // <main> height - view port height
    // The Math.max... is to ensure we are not passing a negative value
    // to ScrollMagic, otherwise it throws an error and stops updating the duration
    return Math.max(0, main.clientHeight - window.innerHeight);
  }

  function setSceneDuration(duration) {
    sceneDuration.value = duration;
  }

  onDomReady(function removeCloak() {
    main.classList.remove('wix-cloak');
  })

  onDomReady(function cacheHeaderHeight() {
    headerHeight = parseFloat(window.getComputedStyle(document.body).getPropertyValue('padding-top'));
  })

  function initSceneDuration() {
    window.removeEventListener('load', initSceneDuration);

    var debouncedDurationUpdate = debounce(function () {
      setSceneDuration(getSceneDuration());
    }, 250);

    // Get initial value
    setTimeout(function () {
      setSceneDuration(getSceneDuration());
    }, 0)

    window.removeEventListener('resize', debouncedDurationUpdate);
    window.addEventListener('resize', debouncedDurationUpdate, true);
  }

  window.addEventListener('load', initSceneDuration);

  function InfosScrolling() {
    var infos, thumbnails,
        tgContainer = document.querySelector('.tg-container'),
        debouncedInfosScrolbarsUpdate = debounce(updateInfosScrollbars, 250);

    function initInfosScrolling() {
      infos      = getInfos();
      thumbnails = getThumbnails();

      forEach.call(thumbnails, listenToImageLoad);
    }

    function listenToImageLoad(image, i) {
      if (image.complete) {
        onThumbnailLoad();
      } else {
        image.addEventListener('load', onThumbnailLoad, false);
      }

      function onThumbnailLoad() {
        // Thumbnails are hidden by default via CSS,
        // So, unhide this thumbnail after it's image has completely loaded
        // (avoids showing half-images while they are loading)
        showThumbnail(thumbnails[i].parentElement.parentElement);

        nanoScroller(function () {
          initScrollbarFor(infos[i])
        });
      }
    }

    function showThumbnail(thumbnail) {
      thumbnail.classList.remove('-hidden');
    }

    function initScrollbarFor(info) {
      var infoBox = info.firstElementChild;

      // Add nanoScroller classes
      info.classList.add('nano');
      infoBox.classList.add('nano-content');

      // Ensure we'll get a scrollbar even if text is short
      if (info.clientHeight >= infoBox.scrollHeight)
        infoBox.style.overflowY = 'scroll';

      nanoScroller(function () {
        accessInfoScroller(info, function () {
          $(info).nanoScroller({
            preventPageScrolling: true,
            disableResize: true,
            sliderRatio: .85
          });
        });
      });
    }

    function updateInfosScrollbars() {
      infos = getInfos();

      forEach.call(infos, resetInfoScrollbar);
    }

    function resetInfoScrollbar(info) {
      info.nanoscroller && accessInfoScroller(info, function () {
        info.nanoscroller.reset();
      });
    }

    function accessInfoScroller(info, fn) {
      info.classList.add('-visible');
      fn();
      info.classList.remove('-visible');
    }

    nanoScroller(function () {
      window.removeEventListener('resize', debouncedInfosScrolbarsUpdate);
      window.addEventListener('resize', debouncedInfosScrolbarsUpdate, true);

      tgContainer.removeEventListener('transitionend', updateInfosScrollbars);
      tgContainer.addEventListener('transitionend', updateInfosScrollbars, false);
    });

    return {
      init: initInfosScrolling,
      update: updateInfosScrollbars,
      accessInfoScroller: accessInfoScroller
    }
  }

  var infosScrolling = InfosScrolling();

  onDomReady(infosScrolling.init);

  function initThumbnailHovers() {
    var gallery    = document.querySelector('.tg-gallery'),
        thumbnails = getThumbnails(),
        hovers     = getHovers();

    thumbnails = map.call(thumbnails, function (thumbnail) {
      return thumbnail.parentElement;
    });

    forEach.call(thumbnails, function (thumbnail, i) {
      thumbnail.addEventListener('mouseleave', hideHover, false);
      hovers[i].addEventListener('mouseleave', hideHover, false);
      hovers[i].addEventListener('mouseenter', watchHoverOpacity, false);

      hovers[i].removeEventListener('transitionend', watchHoverOpacity);
      hovers[i].addEventListener('transitionend', watchHoverOpacity, false);
    });

    function watchHoverOpacity(e) {
      var opacity = window.getComputedStyle(this).getPropertyValue('opacity');

      if (opacity == 1) {
        this.classList.add('-active');
      } else {
        this.classList.remove('-visible');
      }
    }

    function hideHover(e) {
      var hover = getTgHover(this);

      if (hover) {
        // Make sure to hide the hover again after animation is finished.
        // Also takes care of when the mouse was moved out of the thumbnail
        // before the animation even started
        hover.classList.add('-visible');
      }
    }

    function getTgHover(el) {
      if (el.classList.contains('tg-thumbnail')) {
        return el.children[2];
      } else if (el.classList.contains('tg-hover')) {
        return el;
      }

      return false;
    }

    // Enable the below code in case of a browser not
    // disabling mouse events while scrolling
    // (Chrome does this, IE maybe as well, others need testing)

    // var debouncedRelease = debounce(function releaseLock() {
    //                          gallery.classList.remove('disable-hovers');
    //                        }, 100);

    // window.addEventListener('scroll', lockHoversOnScroll, false);

    // function lockHoversOnScroll(e) {
    //   gallery.classList.add('disable-hovers');

    //   debouncedRelease();
    // }
  }

  onDomReady(initThumbnailHovers);

  function initInfoHovers() {
    var infoSwitches = getInfoSwitches(),
        infos        = getInfos(),
        thumbnails   = getThumbnails();

    // Reset (hide) info hover after mouseout
    forEach.call(thumbnails, function (image, i) {
      image.parentElement.addEventListener('mouseleave', function () {
        function hideInfoHover() {
          // Hide the info hover
          infoSwitches[i].checked = false;

          // Reset its scrollbar
          infos[i].nanoscroller && nanoScroller(function () {
            infosScrolling.accessInfoScroller(infos[i], function () {
              infos[i].nanoscroller.scrollTop(0);
            });
          });

          image.parentElement.removeEventListener('transitionend', hideInfoHover);
        }

        image.parentElement.addEventListener('transitionend', hideInfoHover, false);
      });
    });
  }

  onDomReady(initInfoHovers);

  function initSidebarSwitch() {
    var sidebar, sbSwitch, sbToggle, sbCollapse, sbSwitchStroke;

    function init() {
      sidebar        = document.getElementById('sidebar');
      sbSwitch       = document.getElementById('sb-switch');
      sbToggle       = document.getElementById('sb-toggle');
      sbCollapse     = document.getElementById('sb-collapse');
      sbSwitchStroke = document.querySelector('.sbs-stroke');

      sidebar.removeEventListener('transitionend', sidebarAnimationEnded);
      sidebar.addEventListener('transitionend', sidebarAnimationEnded, false);

      sbSwitchStroke.removeEventListener('transitionend', toggleAnimationEnded);
      sbSwitchStroke.addEventListener('transitionend', toggleAnimationEnded, false);

      sbSwitch.addEventListener('click', function () {
        if (this.checked) {
          showSidebar();
          // cookie.set("sidebar-state", main.classList.contains('-sidebar-open'), Infinity);
        } else {
          hideSidebar();
          // cookie.set("sidebar-state", main.classList.contains('-sidebar-open'), Infinity);
        }
      });

      sbCollapse.addEventListener('click', function () {
        sbSwitch.click();
      });

      window.addEventListener('scroll', trackSBSwitch, false);

      // for (var i = scrollEvents.length; i;) {
      //   window.addEventListener(scrollEvents[--i], trackSBSwitch, false);
      // }
    }

    function showSidebar() {
      sbToggle.classList.add('-transitioning');

      main.classList.add('-sidebar-open');
      main.classList.remove('-sidebar-closed');

      getScrollTop() > headerHeight && scrollBodyToTop(true);
      trackSBSwitch(true);
    }

    function hideSidebar() {
      // Animate button
      sbSwitch.classList.remove('-hidden');
      sbToggle.classList.add('-transitioning');
      sbCollapse.classList.add('-hidden');

      // Animate sidebar
      main.classList.add('-sidebar-closed');
      main.classList.remove('-sidebar-open');

      // Update switch state
      trackSBSwitch(true);
    }

    function sidebarAnimationEnded() {
      // The sidebar animation changes the height of the page,
      // so we should update the scene length for ScrollMagic
      // accordingly. (Instead of ScrollMagic polling the DOM constantly)
      updateSceneDuration();

      // Update switch state
      trackSBSwitch(true);
    }

    function toggleAnimationEnded() {
      sbToggle.classList.remove('-transitioning');

      if (sbSwitch.checked) {
        sbCollapse.classList.remove('-hidden');
        sbSwitch.classList.add('-hidden');
      }

      // Update switch state
      // trackSBSwitch(true);
    }

    function updateSceneDuration() {
      setSceneDuration(getSceneDuration());
    }

    function trackSBSwitch(force) {
      if (force !== true && sbSwitch.checked) {
        return;
      }

      var scrollTop      = getScrollTop(),
          mainHeight     = main.scrollHeight,
          bottomBoundary = 350,
          sbSwitchHeight = 65;

      if (scrollTop >= headerHeight) {
        if (scrollTop + sbSwitchHeight < mainHeight + headerHeight - bottomBoundary) {
          sbSwitch.classList.remove('-to-bottom');
          sbToggle.classList.remove('-to-bottom');
          sbSwitch.classList.add('-fixed');
          sbToggle.classList.add('-fixed');
        } else {
          sbSwitch.classList.add('-to-bottom');
          sbToggle.classList.add('-to-bottom');
        }
      } else {
        sbSwitch.classList.remove('-to-bottom');
        sbToggle.classList.remove('-to-bottom');
        sbSwitch.classList.remove('-fixed');
        sbToggle.classList.remove('-fixed');
      }
    }

    return {
      init: init,
      track: trackSBSwitch
    }
  }

  var sbSwitch = initSidebarSwitch();
  onDomReady(sbSwitch.init);

  isNanoCompatible && onDomReady(function initPageScrollbar() {
    nanoScroller(function () {
      document.documentElement.classList.add('nano');
      document.body.classList.add('nano-content');
      $(document.documentElement).nanoScroller();

      var hasClassAlready = false;

      window.addEventListener('scroll', function () {
        if (!hasClassAlready) {
          document.documentElement.classList.add('-nano-visible');
          hasClassAlready = true;
        } else {
          debouncedHideScroller();
        }
      }, false);

      // for (var i = scrollEvents.length; i;) {
      //   window.addEventListener(scrollEvents[--i], );
      // }

      var debouncedHideScroller = debounce(function () {
        document.documentElement.classList.remove('-nano-visible');
        hasClassAlready = false;
      }, 1200);
    });
  });

  onDomReady(function initSidebarStickyIsolatedScrolling() {
    //----------------------------------*\
    // STICKY SCROLLING
    //----------------------------------*/

    // Keep some styles for future reference
    var sidebar      = document.getElementById('sidebar'),
        tgContainer  = document.getElementById('gallery-container'),
        mainBottom   = parseFloat(window.getComputedStyle(tgContainer).getPropertyValue('padding-bottom')),
        sidebarWidth = parseFloat(window.getComputedStyle(sidebar).getPropertyValue('width'));

    // NanoScroller scrollbar pane
    var nanoPane,
        paneWidth, paneRight, paneLeft;

    var wrapper, fragment;

    // Wrap sidebar in wrapper so we can
    // use it to make the sidebar sticky inside it
    wrapper = document.createElement('div');
    wrapper.className = 'sb-wrapper';
    main.insertBefore(wrapper, tgContainer);

    fragment = document.createDocumentFragment();
    fragment.appendChild(sidebar);

    wrapper.appendChild(fragment);

    // Track sidebar while scrolling
    window.addEventListener('scroll', trackSidebar, false);

    function trackSidebar() {
      var scrollTop     = getScrollTop(),
          mainHeight    = main.scrollHeight,
          scrollBottom  = scrollTop + window.innerHeight;

      if (scrollTop >= headerHeight) {
        if (scrollBottom < mainHeight + headerHeight) {
          fixSidebar();
        } else {
          alignSidebarWithFooter();
        }
      } else {
        resetSidebarToTop();
      }
    }

    function resetSidebarToTop() {
      sidebar.classList.remove('-to-bottom');
      sidebar.classList.remove('-fixed');
      sidebar.style.top = '1px';

      if (isNanoCompatible) {
        sidebar.style.paddingRight = wrapper.nanoscroller.BROWSER_SCROLLBAR_WIDTH + 'px';

        releaseScrollbar();
      }
    }

    function fixSidebar() {
      sidebar.classList.remove('-to-bottom');
      sidebar.classList.add('-fixed');
      sidebar.style.top = '0px';

      if (isNanoCompatible) {
        sidebar.style.paddingRight = 0;
        fixScrollbar();
      }
    }

    function alignSidebarWithFooter() {
      sidebar.classList.add('-to-bottom');
      sidebar.style.top = sceneDuration.value - 1 + 'px';

      if (isNanoCompatible) {
        sidebar.style.paddingRight = 0;
        releaseScrollbar();
      }
    }

    function fixScrollbar() {
      nanoPane.style.position = 'fixed';
      nanoPane.style.top = '-1px';
      nanoPane.style.left = paneLeft + 'px';
    }

    function releaseScrollbar() {
      nanoPane.style.top = sidebar.style.top;
      nanoPane.style.position = 'absolute';
      nanoPane.style.right = '6px';
      nanoPane.style.left = 'auto';
    }

    //----------------------------------*\
    // ISOLATED SCROLLING
    //----------------------------------*/

    for (var i = scrollEvents.length; i;) {
      sidebar.addEventListener(scrollEvents[--i], function (e) {
        var delta     = e.deltaY * -1,
            scrollTop = getScrollTop();

        if (delta < 0
            && sidebar.classList.contains('-fixed')
            && !sidebar.classList.contains('-to-bottom')
            && sidebar.scrollTop == (sidebar.scrollHeight - sidebar.clientHeight)
            && scrollTop > sidebar.parentElement.offsetTop) {
          e.preventDefault();
        }
      }, false);
    }

    //----------------------------------*\
    // NANO SCROLLER
    //----------------------------------*/

    nanoScroller(function () {
      initSidebarNanoScroller();
      setOverrideStyles();
      cacheNanoPaneStyles();
    });

    function initSidebarNanoScroller() {
      sidebar.classList.add('nano-content')

      $(wrapper)
        .addClass('nano')
        .nanoScroller({
          forSidebar: true,
          sliderRatio: .5
        });
    }

    function setOverrideStyles() {
      var newRule = addRuleToStyleSheet.bind({}, new styleSheet());

      newRule('.sb-sidebar { width: ' + (sidebarWidth + wrapper.nanoscroller.BROWSER_SCROLLBAR_WIDTH) + 'px' + '}');
      newRule('.sb-sidebar + .nano-pane { transition: transform .1s step-end, opacity .2s ease; }');
      newRule('.-sidebar-closed .sb-sidebar + .nano-pane { opacity: 0; transform: translateX(-312px) }');
    }

    function cacheNanoPaneStyles() {
      var nanoStyle;

      nanoPane  = document.querySelector('.nano-pane');
      nanoStyle = window.getComputedStyle(nanoPane);
      paneRight = parseFloat(nanoStyle.getPropertyValue('right'));
      paneWidth = parseFloat(nanoStyle.getPropertyValue('width'));
      paneLeft  = sidebarWidth - paneWidth - paneRight;
    }

    function styleSheet() {
      var style = document.createElement('style');

      // WebKit hack :(
      style.appendChild(document.createTextNode(''));

      document.head.appendChild(style);

      return style.sheet;
    }

    function addRuleToStyleSheet(styleSheet, cssRuleStr) {
      styleSheet.insertRule(cssRuleStr, styleSheet.cssRules.length);
    }
  });

  function scrollBodyToTop(shouldAnimate) {
    if (shouldAnimate) {
      animateToTop();
    } else {
      if (document.documentElement.nanoscroller) {
        document.documentElement.nanoscroller.scrollTop(0);
      } else {
        window.scrollTo(0, 0);
      }
    }
  }

  function animateToTop() {
    var scrollTop = getScrollTop(),
        step = scrollTop / 12,
        time = Math.round(30 / scrollTop) + 10;

    setScrollTop(scrollTop - step);
    sbSwitch.track(true);

    if (scrollTop > 0) {
      setTimeout(animateToTop, time);
    }
  }

  function focusOnActiveCategory() {
    function focus(force) {
      window.removeEventListener('load', focus);

      var sidebar = document.getElementById('sidebar');

      var active1stLevelCategory = document.querySelectorAll('.sb-lvl-1-cat.-active')[0],
          active2ndLevelCategory = document.querySelectorAll('.sb-lvl-2-cat.-active')[0],
          willScrollBody = force === true,
          activeCategory = active1stLevelCategory || active2ndLevelCategory || false,
          isAboveTheFold = activeCategory
                           && isElementInViewport(activeCategory.children[1] || activeCategory.firstElementChild);

      if (activeCategory && (willScrollBody || !isAboveTheFold)) {
        if (!willScrollBody) {
          setScrollTop(headerHeight);
        }

        var acTopOffset = offsetFrom(activeCategory, document.body),
            scrollDiff  = (acTopOffset - sidebar.clientHeight / 2)  + headerHeight + 21, // (+ header height, + half of category height),
            scrollLimit = sidebar.scrollHeight - sidebar.clientHeight;

        window.setTimeout(function () {
          sidebar.scrollTop = scrollLimit > 0 ? Math.min(scrollDiff, scrollLimit) : scrollDiff;
          willScrollBody && getScrollTop() > 0 && scrollBodyToTop();
        }, 1);
      }
    }

    function offsetFrom(el, target) {
      var targetRect = target.getBoundingClientRect(),
          sourceRect = el.getBoundingClientRect(),
          offsetTop  = sourceRect.top - targetRect.top;

      return offsetTop;
    }

    function isElementInViewport(el) {
      var rect = el.getBoundingClientRect();

      return rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
    }

    return {
      focus: focus
    }
  };

  var activeCategory = focusOnActiveCategory();

  window.addEventListener('load', activeCategory.focus);
})(window, document);
