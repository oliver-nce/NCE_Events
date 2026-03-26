from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _

from nce_events.api.credentials import get_credentials
from nce_events.api.panel_api import get_panel_data


def _enrich_row_context(root_doctype: str, row: dict) -> dict[str, Any]:
	"""Build a full template context from a row — fetches ALL fields, not just panel columns."""
	row_name = row.get("name")

	if row_name:
		full = frappe.db.get_value(root_doctype, row_name, "*", as_dict=True) or {}
		context: dict[str, Any] = {k: (v if v is not None else "") for k, v in full.items()}
	else:
		context = {k: (v if v is not None else "") for k, v in row.items()}

	context["doc"] = frappe._dict(context)
	return context


def _render_body(body: str, context: dict[str, Any], for_html: bool = True) -> str:
	"""Render Jinja template. For HTML (email/preview), convert plain-text newlines to <br>."""
	try:
		rendered = frappe.render_template(body, context)
	except Exception as exc:
		frappe.log_error(
			title="Template render error",
			message=f"Body:\n{body[:500]}\n\nError:\n{exc}",
		)
		rendered = body
	if for_html and "<" not in rendered:
		rendered = rendered.replace("\n", "<br>")
	return rendered


@frappe.whitelist()
def get_email_accounts() -> list[dict[str, str]]:
	"""Return list of Email Accounts with enable_outgoing for from-address picker."""
	rows = frappe.get_all(
		"Email Account",
		filters={"enable_outgoing": 1},
		fields=["name", "email_id"],
		order_by="default_outgoing desc, name asc",
	)
	return [{"name": r.name, "email_id": r.email_id or ""} for r in rows if r.email_id]


@frappe.whitelist()
def send_test_email(
	root_doctype: str,
	filters: str | dict | None = None,
	user_filters: str | list | None = None,
	body: str = "",
	subject: str = "",
	test_email: str = "",
	from_email: str = "",
) -> dict[str, Any]:
	"""Render the template against the first row and send to a test address."""
	if not test_email or not test_email.strip():
		return {"error": "No test email address provided."}
	test_email = test_email.strip()

	result = get_panel_data(root_doctype, filters, user_filters=user_filters)
	rows = result.get("rows") or []
	if not rows:
		return {"error": "No rows to preview."}

	row = rows[0]
	context = _enrich_row_context(root_doctype, row)
	rendered_body = _render_body(body, context, for_html=True)

	try:
		rendered_subject = frappe.render_template(subject, context) if subject else "(Test Email)"
	except Exception:
		rendered_subject = subject or "(Test Email)"

	_send_email(test_email, rendered_subject, rendered_body, from_email=from_email.strip() or None)
	return {"sent": 1, "to": test_email}


@frappe.whitelist()
def send_test_sms(
	root_doctype: str,
	filters: str | dict | None = None,
	user_filters: str | list | None = None,
	body: str = "",
	test_phone: str = "",
) -> dict[str, Any]:
	"""Render the template against the first row and send SMS to a test phone number."""
	if not test_phone or not test_phone.strip():
		return {"error": "No test phone number provided."}
	test_phone = test_phone.strip()

	result = get_panel_data(root_doctype, filters, user_filters=user_filters)
	rows = result.get("rows") or []
	if not rows:
		return {"error": "No rows to preview."}

	row = rows[0]
	context = _enrich_row_context(root_doctype, row)
	rendered_body = _render_body(body, context, for_html=False)

	_send_sms(test_phone, rendered_body)
	return {"sent": 1, "to": test_phone}


@frappe.whitelist()
def preview_panel_message(
	root_doctype: str,
	filters: str | dict | None = None,
	user_filters: str | list | None = None,
	body: str = "",
	subject: str = "",
	row_names: str | list | None = None,
) -> dict[str, Any]:
	"""Render a message template against the first row for preview."""
	if isinstance(row_names, str):
		row_names = json.loads(row_names) if row_names else []
	row_names = row_names or []

	if row_names:
		row = {"name": row_names[0]}
	else:
		result = get_panel_data(root_doctype, filters, user_filters=user_filters)
		rows = result.get("rows") or []
		if not rows:
			return {"error": "No rows to preview."}
		row = rows[0]
	context = _enrich_row_context(root_doctype, row)
	rendered_body = _render_body(body, context, for_html=True)

	try:
		rendered_subject = frappe.render_template(subject, context) if subject else ""
	except Exception:
		rendered_subject = subject

	return {
		"rendered_body": rendered_body,
		"rendered_subject": rendered_subject,
		"context": context,
	}


@frappe.whitelist()
def preview_one_email(
	root_doctype: str,
	row_name: str = "",
	recipient_field: str = "",
	body: str = "",
	subject: str = "",
	from_email: str = "",
) -> dict[str, Any]:
	"""Render body + subject for a single row and return without sending.
	Used by the step-through send reviewer in the email dialog."""
	if not row_name:
		return {"error": "No row_name provided."}

	context = _enrich_row_context(root_doctype, {"name": row_name})
	recipient = str(context.get(recipient_field, "")).strip()

	rendered_body = _render_body(body, context, for_html=True)
	try:
		rendered_subject = frappe.render_template(subject, context) if subject else ""
	except Exception:
		rendered_subject = subject

	return {
		"row_name": row_name,
		"to": recipient,
		"subject": rendered_subject,
		"rendered_body": rendered_body,
	}


@frappe.whitelist()
def send_one_email(
	root_doctype: str,
	row_name: str = "",
	recipient_field: str = "",
	body: str = "",
	subject: str = "",
	from_email: str = "",
) -> dict[str, Any]:
	"""Render and queue a single email for one row via Frappe's email queue."""
	if not row_name:
		return {"error": "No row_name provided."}

	context = _enrich_row_context(root_doctype, {"name": row_name})
	recipient = str(context.get(recipient_field, "")).strip()
	if not recipient:
		return {"error": f"No email address found in field '{recipient_field}' for {row_name}."}

	rendered_body = _render_body(body, context, for_html=True)
	try:
		rendered_subject = frappe.render_template(subject, context) if subject else ""
	except Exception:
		rendered_subject = subject

	_send_email(
		recipient, rendered_subject or "(No Subject)", rendered_body, from_email=from_email.strip() or None
	)

	return {"sent": 1, "to": recipient}


@frappe.whitelist()
def get_recipients(
	root_doctype: str,
	row_names: str | list | None = None,
	recipient_field: str = "",
) -> dict[str, Any]:
	"""Return the list of (name, address) pairs that would be sent to — without sending anything.
	row_names is the list of PKs already showing in the panel (passed from the frontend)."""
	if isinstance(row_names, str):
		row_names = json.loads(row_names) if row_names else []
	row_names = row_names or []

	recipients: list[dict[str, str]] = []
	for name in row_names:
		row = {"name": name}
		context = _enrich_row_context(root_doctype, row)
		addr = str(context.get(recipient_field, "")).strip()
		recipients.append({"name": name, "address": addr})

	resolved = [r for r in recipients if r["address"]]
	skipped = [r for r in recipients if not r["address"]]

	return {
		"total_rows": len(row_names),
		"resolved": resolved,
		"skipped": skipped,
	}


@frappe.whitelist()
def send_panel_message(
	root_doctype: str,
	row_names: str | list | None = None,
	mode: str = "sms",
	recipient_field: str = "",
	body: str = "",
	subject: str = "",
	send_email_copy: int | str = 0,
	email_field: str = "",
	from_email: str = "",
) -> dict[str, int]:
	"""Send bulk SMS and/or email to the rows currently showing in the panel.
	row_names is the list of PKs passed directly from the frontend — no re-querying."""
	if isinstance(row_names, str):
		row_names = json.loads(row_names) if row_names else []
	row_names = row_names or []
	send_email_copy = int(send_email_copy)

	rows = [{"name": n} for n in row_names]

	sent = 0
	errors: list[str] = []

	for row in rows:
		context = _enrich_row_context(root_doctype, row)
		recipient = str(context.get(recipient_field, "")).strip()
		if not recipient:
			continue

		rendered_body = _render_body(body, context, for_html=(mode == "email"))

		try:
			rendered_subject = frappe.render_template(subject, context) if subject else ""
		except Exception:
			rendered_subject = subject

		from_email_val = from_email.strip() or None

		if mode == "sms":
			try:
				_send_sms(recipient, rendered_body)
				sent += 1
			except Exception as e:
				errors.append(f"SMS to {recipient}: {e}")

			if send_email_copy and email_field:
				email_addr = str(context.get(email_field, "")).strip()
				if email_addr:
					try:
						email_body = _render_body(body, context, for_html=True)
						_send_email(
							email_addr, rendered_subject or "SMS Copy", email_body, from_email=from_email_val
						)
					except Exception as e:
						errors.append(f"Email to {email_addr}: {e}")

		elif mode == "email":
			email_addr = recipient
			if email_addr:
				try:
					_send_email(
						email_addr,
						rendered_subject or "(No Subject)",
						rendered_body,
						from_email=from_email_val,
					)
					sent += 1
				except Exception as e:
					errors.append(f"Email to {email_addr}: {e}")

	if errors:
		frappe.log_error("\n".join(errors), f"send_panel_message errors ({root_doctype})")

	return {"sent": sent, "total": len(rows), "errors": len(errors)}


def _send_sms(phone: str, message: str) -> None:
	"""Send an SMS via Twilio using credentials from credential_config."""
	import requests

	creds = get_credentials("Twilio")
	account_sid = creds.get("username") or ""
	auth_token = creds.get("password") or ""

	if not account_sid or not auth_token:
		frappe.throw(_("Twilio credentials missing. Check the Twilio API Connector credential_config."))

	base_url = (creds.get("base_url") or "https://api.twilio.com").rstrip("/")
	url = f"{base_url}/2010-04-01/Accounts/{account_sid}/Messages.json"

	config = creds.get("_config") or {}
	from_number = (config.get("from_number") or "").strip()
	if not from_number:
		frappe.throw(_("No from_number in Twilio credential_config. Add a from_number field to the JSON."))

	resp = requests.post(
		url,
		data={"To": phone, "From": from_number, "Body": message},
		auth=(account_sid, auth_token),
		timeout=15,
	)

	if resp.status_code not in (200, 201):
		frappe.throw(_(f"Twilio error {resp.status_code}: {resp.text}"))


def _send_email(
	to_email: str, subject: str, body: str, *, from_email: str | None = None, send_after_seconds: int = 0
) -> None:
	"""Send an email via Frappe's outgoing email queue (uses the configured Email Account).
	If send_after_seconds > 0, the email is queued and sent after that delay."""
	from frappe.utils import add_to_date, now_datetime

	sender = (from_email or "").strip() or None

	if send_after_seconds and send_after_seconds > 0:
		send_after = add_to_date(now_datetime(), seconds=send_after_seconds)
		frappe.sendmail(
			recipients=[to_email],
			subject=subject,
			message=body,
			sender=sender,
			add_unsubscribe_link=0,
			delayed=True,
			now=False,
			send_after=send_after,
		)
	else:
		frappe.sendmail(
			recipients=[to_email],
			subject=subject,
			message=body,
			sender=sender,
			add_unsubscribe_link=0,
			delayed=False,
			now=True,
		)
