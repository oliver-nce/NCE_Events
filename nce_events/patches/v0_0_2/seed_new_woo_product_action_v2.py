"""Re-seed the 'new-woo-product' Panel Action with the consolidated schema.

The original ``seed_new_woo_product_action`` patch is already recorded in
Patch Log on most sites and will not rerun. This v2 patch is a no-op when the
row already exists, so it is safe everywhere.

code-index:begin
{
 "purpose": "Re-runs seed_new_woo_product_action for sites where the original patch is already logged.",
 "read_when": "Understanding v2 re-seed when Patch Log blocks the original woo product action patch.",
 "gotchas": [
  "No-op when the row already exists, so it is safe everywhere."
 ],
 "keywords": ["new-woo-product", "seed", "v2", "Patch Log", "Panel Action"],
 "format": 1
}
code-index:end
"""

from __future__ import annotations

from nce_events.patches.v0_0_2 import seed_new_woo_product_action


def execute() -> None:
	seed_new_woo_product_action.execute()
