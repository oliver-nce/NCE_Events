NCE Themes — developer export
================================

Full step-by-step guide: Themes_Developer_Export_Guide.pdf (in this folder).

This folder is a snapshot from the Themes app. Re-export from Themes to pick up edits.

1) Copy the nce-themes folder into your Frappe app's public folder, for example:
   <app>/public/nce-themes/

2) Include the CSS and JS on your app's screens (hooks.py example):

   app_include_css = [
       "/assets/your_app/nce-themes/nce-themes.css",
   ]
   app_include_js = [
       "/assets/your_app/nce-themes/nce-theme-switcher.js",
   ]

   Or add the same URLs in your own HTML templates.

3) Let end users pick a theme in the browser:

   nceSetTheme("ocean");   // slug from the list below
   nceSetTheme("");        // back to the default (:root) theme

4) Exported themes and slugs:

   - NCE Manager  (default, slug "")

5) Frappe UI colour mapping is included in nce-themes.css.
   On app screens where you want Espresso greys/blues to follow NCE tokens, set on
   the browser top-level <html> element: data-nce-bridge="on" (light mode only).

Notes:
- Fonts used by these themes are bundled under fonts/.
- If the Themes app is installed on the same site, its published theme CSS wins over
  this snapshot (export selectors use :where() for lower specificity).
