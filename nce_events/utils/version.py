import frappe


def get_frappe_major_version():
	"""Return the major version of the installed Frappe framework as an integer."""
	return int(frappe.__version__.split(".", maxsplit=1)[0])


def is_v16_or_later():
	"""Return True if the current Frappe version is 16 or above."""
	return get_frappe_major_version() >= 16
