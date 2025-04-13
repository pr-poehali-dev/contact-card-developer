/**
 * Vite Force Update Helper
 *
 * This script forces Vite to update modules and styles by directly accessing Vite's internals.
 * Makes multiple attempts to ensure updates are applied.
 */

(function() {
  // Track the number of attempts
  let attemptCount = 0;
  let MAX_ATTEMPTS = 5;
  const FIRST_ATTEMPT_DELAY = 1000; // 1 second after page load
  const BETWEEN_ATTEMPTS_DELAY = 2000; // 2 seconds between attempts

  // Start the retry sequence
  console.log('[ViteUpdate] Force update script initialized');
  scheduleNextAttempt();

  // Schedule the next attempt
  function scheduleNextAttempt() {
    const delay = (attemptCount === 0) ? FIRST_ATTEMPT_DELAY : BETWEEN_ATTEMPTS_DELAY;

    setTimeout(() => {
      attemptCount++;
      console.log(`[ViteUpdate] Running attempt ${attemptCount} of ${MAX_ATTEMPTS}`);

      // Use all approaches to maximize success
      const results = {
        websocket: forceUpdateViaWebSocket(),
        hmr: forceViteHMRUpdate(),
        css: forceCSSUpdate(),
        react: forceReactRemount()
      };

      const anySuccess = Object.values(results).some(Boolean);
      console.log(`[ViteUpdate] Attempt ${attemptCount} results:`, results);

      // Schedule next attempt if we haven't reached max attempts
      if (attemptCount < MAX_ATTEMPTS) {
        scheduleNextAttempt();
      } else {
        console.log(`[ViteUpdate] Completed all ${MAX_ATTEMPTS} update attempts`);
      }
    }, delay);
  }

  // Find Vite's WebSocket connection and send update command
  function forceUpdateViaWebSocket() {
    try {
      // Find Vite's WebSocket by checking global properties
      let viteSocket = null;

      // Direct references in some Vite versions
      if (window.__vite_ws || window.__vite_web_socket) {
        viteSocket = window.__vite_ws || window.__vite_web_socket;
      } else {
        // Search for WebSockets in global scope
        const allSockets = Array.from(Object.values(window))
          .filter(obj => obj instanceof WebSocket)
          .filter(ws => ws.url && ws.url.includes('/__vite_hmr'));

        if (allSockets.length > 0) {
          viteSocket = allSockets[0];
        }
      }

      if (viteSocket && viteSocket.readyState === WebSocket.OPEN) {
        console.log('[ViteUpdate] Found Vite WebSocket, sending update messages');

        // Method 1: Send full-reload message
        viteSocket.send(JSON.stringify({
          type: 'full-reload'
        }));

        // Method 2: Send more targeted update message
        viteSocket.send(JSON.stringify({
          type: 'update',
          updates: [
            {
              type: 'js-update',
              timestamp: Date.now(),
              path: '/@vite/client'
            },
            {
              type: 'css-update',
              timestamp: Date.now(),
              path: '*'
            }
          ]
        }));

        return true;
      }
    } catch (e) {
      console.warn('[ViteUpdate] Error with WebSocket approach:', e);
    }
    return false;
  }

  // Try to access Vite's HMR runtime directly
  function forceViteHMRUpdate() {
    try {
      // Look for HMR module registry in various places
      const moduleHotRegistry =
        window.__vite_hot__ ||
        window.__vite__?.hot ||
        window.__HMR__ ||
        window.__vite_runtime__?.hot ||
        window.__vite_hot_runtime__;

      if (moduleHotRegistry) {
        console.log('[ViteUpdate] Found Vite HMR registry, forcing module updates');

        // Method 1: Use invalidateAll if available
        if (typeof moduleHotRegistry.invalidateAll === 'function') {
          moduleHotRegistry.invalidateAll();
          return true;
        }

        // Method 2: Try to access the module map directly
        if (moduleHotRegistry.data && moduleHotRegistry.data.moduleMap) {
          const modules = Array.from(moduleHotRegistry.data.moduleMap.keys());
          console.log(`[ViteUpdate] Found ${modules.length} modules to invalidate`);

          let invalidatedCount = 0;
          for (const moduleId of modules) {
            try {
              const mod = moduleHotRegistry.data.moduleMap.get(moduleId);
              if (mod && typeof mod.invalidate === 'function') {
                mod.invalidate();
                invalidatedCount++;
              }
            } catch (e) {
              // Continue with other modules if one fails
            }
          }

          console.log(`[ViteUpdate] Invalidated ${invalidatedCount} modules`);
          return invalidatedCount > 0;
        }

        // Method 3: Try other properties that might exist
        if (typeof moduleHotRegistry.update === 'function') {
          moduleHotRegistry.update();
          return true;
        }
      }

      // Method 4: Try injecting a module script with import.meta.hot
      try {
        const moduleScript = document.createElement('script');
        moduleScript.type = 'module';
        moduleScript.textContent = `
          if (import.meta && import.meta.hot) {
            console.log('[ViteUpdate] Using import.meta.hot inside module script');
            import.meta.hot.invalidate();
          }
        `;
        document.head.appendChild(moduleScript);
      } catch (e) {
        console.warn('[ViteUpdate] Error injecting module script:', e);
      }
    } catch (e) {
      console.warn('[ViteUpdate] Error with HMR registry approach:', e);
    }
    return false;
  }

  // Force CSS updates by manipulating stylesheets
  function forceCSSUpdate() {
    try {
      console.log('[ViteUpdate] Forcing CSS updates');

      // Method 1: Disable/enable all stylesheets
      const sheets = document.styleSheets;
      const wasDisabled = new Map();

      // Record disabled state and disable all sheets
      for (let i = 0; i < sheets.length; i++) {
        try {
          wasDisabled.set(sheets[i], sheets[i].disabled);
          sheets[i].disabled = true;
        } catch (e) {
          // Skip cross-origin sheets
        }
      }

      // Re-enable sheets after a small delay
      setTimeout(() => {
        for (let i = 0; i < sheets.length; i++) {
          try {
            const sheet = sheets[i];
            if (wasDisabled.has(sheet)) {
              sheet.disabled = wasDisabled.get(sheet);
            }
          } catch (e) {
            // Skip cross-origin sheets
          }
        }
      }, 50);

      // Method 2: Add and remove a style element
      const tempStyle = document.createElement('style');
      tempStyle.textContent = `
        /* Temporary style to force repaint */
        body { --temp-var: ${Date.now()}; }
      `;
      document.head.appendChild(tempStyle);

      setTimeout(() => {
        if (tempStyle.parentNode) {
          tempStyle.parentNode.removeChild(tempStyle);
        }
      }, 100);

      return true;
    } catch (e) {
      console.warn('[ViteUpdate] Error with CSS update approach:', e);
      return false;
    }
  }

  // Force React components to remount (if using React)
  function forceReactRemount() {
    let success = false;

    try {
      // Check if React is being used
      if (window.React || window.ReactDOM) {
        console.log('[ViteUpdate] React detected, attempting to force updates');

        // Method 1: Try to access React DevTools global hook
        if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
          const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;

          // Get all React fiber roots
          if (hook.getFiberRoots && hook.fiberRoots && hook.fiberRoots.size > 0) {
            success = true;

            hook.fiberRoots.forEach(root => {
              try {
                // Force update on the root component
                if (root.current && root.current.stateNode) {
                  const rootInstance = root.current.stateNode;

                  if (rootInstance._internalRoot &&
                      rootInstance._internalRoot.current &&
                      rootInstance._internalRoot.current.stateNode &&
                      typeof rootInstance._internalRoot.current.stateNode.forceUpdate === 'function') {
                    rootInstance._internalRoot.current.stateNode.forceUpdate();
                  } else if (typeof rootInstance.forceUpdate === 'function') {
                    rootInstance.forceUpdate();
                  }
                }
              } catch (e) {
                // Continue with other roots if one fails
              }
            });
          }
        }

        // Method 2: Try to find React root element and force update
        if (!success && window.ReactDOM) {
          // Find root element (usually #root or #app)
          const rootElement = document.getElementById('root') ||
                              document.getElementById('app') ||
                              document.querySelector('[data-reactroot]');

          if (rootElement) {
            if (rootElement._reactRootContainer) {
              const rootContainer = rootElement._reactRootContainer;

              if (rootContainer._internalRoot &&
                  rootContainer._internalRoot.current &&
                  rootContainer._internalRoot.current.stateNode &&
                  typeof rootContainer._internalRoot.current.stateNode.forceUpdate === 'function') {

                if (typeof window.ReactDOM.flushSync === 'function') {
                  window.ReactDOM.flushSync(() => {
                    rootContainer._internalRoot.current.stateNode.forceUpdate();
                  });
                } else {
                  rootContainer._internalRoot.current.stateNode.forceUpdate();
                }

                success = true;
              }
            }

            // Method 3: Add and remove an element to trigger reconciliation
            const tempDiv = document.createElement('div');
            tempDiv.id = `react-update-trigger-${Date.now()}`;
            tempDiv.style.display = 'none';

            if (rootElement.parentNode) {
              rootElement.parentNode.insertBefore(tempDiv, rootElement.nextSibling);

              setTimeout(() => {
                if (tempDiv.parentNode) {
                  tempDiv.parentNode.removeChild(tempDiv);
                }
              }, 100);

              success = true;
            }
          }
        }
      }
    } catch (e) {
      console.warn('[ViteUpdate] Error with React update approach:', e);
    }

    return success;
  }

  // Create global API for manual triggering
  window.viteForceUpdate = {
    // Single update attempt
    update: function() {
      forceUpdateViaWebSocket();
      forceViteHMRUpdate();
      forceCSSUpdate();
      forceReactRemount();
    },

    // Start a new sequence of attempts
    retry: function(count = MAX_ATTEMPTS) {
      attemptCount = 0;
      MAX_ATTEMPTS = count;
      scheduleNextAttempt();
    }
  };
})();
