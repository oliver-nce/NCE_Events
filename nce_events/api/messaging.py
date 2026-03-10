from __future__ import annotations

from typing import Any

import frappe
from frappe import _

from nce_events.api.credentials import get_credentials
from nce_events.api.panel_api import get_panel_data


def _enrich_row_context(root_doctype: str, row: dict) -> dict[str, Any]:
	"""Build a full template context from a row, including all Link fields and gender."""
	context: dict[str, Any] = {k: (v if v is not None else "") for k, v in row.items()}

	meta = frappe.get_meta(root_doctype)
	link_fields = [f.fieldname for f in meta.fields if f.fieldtype == "Link"]
	row_name = row.get("name")

	# Ensure gender is in context for pronoun tags (always "gender" per project spec)
	if meta.get_field("gender") and "gender" not in context and row_name:
		gender_val = frappe.db.get_value(root_doctype, row_name, "gender")
		context["gender"] = gender_val if gender_val is not None else ""

	if row_name and link_fields:
		missing = [f for f in link_fields if f not in context]
		if missing:
			stored = frappe.db.get_value(root_doctype, row_name, missing, as_dict=True) or {}
			for f in missing:
				context[f] = stored.get(f) or ""

	context["doc"] = frappe._dict(context)
	return context


def _render_body(body: str, context: dict[str, Any], for_html: bool = True) -> str:
	"""Render Jinja template. For HTML (email/preview), convert plain-text newlines to <br>."""
	try:
		rendered = frappe.render_template(body, context)
	except Exception:
		rendered = body
	if for_html and "<" not in rendered:
		rendered = rendered.replace("\n", "<br>")
	return rendered


@frappe.whitelist()
def send_test_email(
	root_doctype: str,
	filters: str | dict | None = None,
	user_filters: str | list | None = None,
	body: str = "",
	subject: str = "",
	test_email: str = "",
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

	_send_email(test_email, rendered_subject, rendered_body)
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
) -> dict[str, Any]:
	"""Render a message template against the first row for preview."""
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
def send_panel_message(
	root_doctype: str,
	filters: str | dict | None = None,
	user_filters: str | list | None = None,
	mode: str = "sms",
	recipient_field: str = "",
	body: str = "",
	subject: str = "",
	send_email_copy: int | str = 0,
	email_field: str = "",
) -> dict[str, int]:
	"""Send bulk SMS and/or email to all rows in a panel."""
	send_email_copy = int(send_email_copy)
	result = get_panel_data(root_doctype, filters, user_filters=user_filters)
	rows = result["rows"]

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
						_send_email(email_addr, rendered_subject or "SMS Copy", email_body)
					except Exception as e:
						errors.append(f"Email to {email_addr}: {e}")

		elif mode == "email":
			email_addr = recipient
			if email_addr:
				try:
					_send_email(email_addr, rendered_subject or "(No Subject)", rendered_body)
					sent += 1
				except Exception as e:
					errors.append(f"Email to {email_addr}: {e}")

	if errors:
		frappe.log_error(
			"\n".join(errors),
			f"send_panel_message errors ({root_doctype})"
		)

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


def _send_email(to_email: str, subject: str, body: str) -> None:
	"""Send an email via SendGrid using credentials from credential_config."""
	import requests

	creds = get_credentials("SendGrid")
	api_key = creds.get("bearer_token") or creds.get("api_key") or ""

	from_email = (
		frappe.db.get_value("Email Account", {"default_outgoing": 1}, "email_id") or ""
	).strip()

	if not api_key:
		frappe.throw(_("SendGrid API key missing. Check the SendGrid API Connector."))
	if not from_email:
		frappe.throw(_("No default outgoing Email Account configured."))

	base_url = (creds.get("base_url") or "https://api.sendgrid.com").rstrip("/")

	resp = requests.post(
		f"{base_url}/v3/mail/send",
		headers={
			"Authorization": f"Bearer {api_key}",
			"Content-Type": "application/json",
		},
		json={
			"personalizations": [{"to": [{"email": to_email}]}],
			"from": {"email": from_email},
			"subject": subject,
			"content": [{"type": "text/html", "value": body}],
		},
		timeout=15,
	)

	if resp.status_code not in (200, 201, 202):
		frappe.throw(_(f"SendGrid error {resp.status_code}: {resp.text}"))
