"""Re-seed the 'new-woo-product' Panel Action with the consolidated schema.

The original ``seed_new_woo_product_action`` patch is already recorded in
Patch Log on most sites and will not rerun. This v2 patch is a no-op when the
row already exists, so it is safe everywhere.
"""

from __future__ import annotations

from nce_events.patches.v0_0_2 import seed_new_woo_product_action


def execute() -> None:
	seed_new_woo_product_action.execute()
