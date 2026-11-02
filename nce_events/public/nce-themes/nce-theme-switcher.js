/* NCE theme switcher — dependency-free snapshot helper.
 * If the Themes app is installed on this site, pick themes there instead.
 */
(function () {
  var STORAGE_KEY = "nce-theme";
  window.nceThemes = [{"slug": "", "name": "NCE Manager"}];

  function apply(slug) {
    var root = document.documentElement;
    if (slug) {
      root.setAttribute("data-nce-theme", slug);
      try { localStorage.setItem(STORAGE_KEY, slug); } catch (e) {}
    } else {
      root.removeAttribute("data-nce-theme");
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }
  }

  window.nceSetTheme = function (slug) {
    slug = (slug || "").trim();
    apply(slug);
  };

  var stored = "";
  try { stored = localStorage.getItem(STORAGE_KEY) || ""; } catch (e) {}
  if (stored) {
    var known = window.nceThemes.some(function (t) { return t.slug === stored; });
    if (known) {
      apply(stored);
    }
  }
})();
