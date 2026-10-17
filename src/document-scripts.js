export const documentScripts = [
  `
    if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.classList.add('js-reveal');
      setTimeout(function () { document.documentElement.classList.add('reveal-failsafe'); }, 4000);
    }
  `,
  `
    // Private setup and owner controls exclude marketing instrumentation.
    if (!/^\\/(?:en\\/)?(?:owner|layla|catalyst|reviewer|mcp)(?:\\/|$)/.test(window.location.pathname)) {
      var startMetaPixel = function () {
        try {
          !function(f,b,e,v,n,t,s) {
            if (f.fbq) return;
            n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
            t=b.createElement(e);t.async=!0;t.src=v;t.onerror=function(){};
            s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s);
          }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');

          var bfExternalId;
          try {
            bfExternalId = localStorage.getItem('bf_uid');
            if (!bfExternalId) {
              bfExternalId = (window.crypto && crypto.randomUUID)
                ? crypto.randomUUID()
                : Date.now() + '-' + Math.random().toString(36).slice(2);
              localStorage.setItem('bf_uid', bfExternalId);
            }
          } catch (storageError) { bfExternalId = null; }
          fbq('init', '4379647862316554', bfExternalId ? { external_id: bfExternalId } : {});
          fbq('track', 'PageView');
        } catch (pixelError) {
          // Tracking must never interrupt page rendering or hydration.
        }
      };

      var deferMetaPixel = function () {
        if ('requestIdleCallback' in window) requestIdleCallback(startMetaPixel, { timeout: 2500 });
        else startMetaPixel();
      };
      // Let first-party rendering, hydration and the initial network-idle window finish first.
      setTimeout(deferMetaPixel, 3000);
    }
  `,
];
