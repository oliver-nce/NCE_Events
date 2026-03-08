from __future__ import annotations

from typing import Any

import frappe
from frappe import _

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


@frappe.whitelist()
def send_test_email(
	root_doctype: str,
	filters: str | dict | None = None,
	body: str = "",
	subject: str = "",
	test_email: str = "",
) -> dict[str, Any]:
	"""Render the template against the first row and send to a test address."""
	if not test_email or not test_email.strip():
		return {"error": "No test email address provided."}
	test_email = test_email.strip()

	result = get_panel_data(root_doctype, filters)
	rows = result.get("rows") or []
	if not rows:
		return {"error": "No rows to preview."}

	row = rows[0]
	context = _enrich_row_context(root_doctype, row)

	try:
		rendered_body = frappe.render_template(body, context)
	except Exception:
		rendered_body = body

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
	body: str = "",
	test_phone: str = "",
) -> dict[str, Any]:
	"""Render the template against the first row and send SMS to a test phone number."""
	if not test_phone or not test_phone.strip():
		return {"error": "No test phone number provided."}
	test_phone = test_phone.strip()

	result = get_panel_data(root_doctype, filters)
	rows = result.get("rows") or []
	if not rows:
		return {"error": "No rows to preview."}

	row = rows[0]
	context = _enrich_row_context(root_doctype, row)

	try:
		rendered_body = frappe.render_template(body, context)
	except Exception:
		rendered_body = body

	_send_sms(test_phone, rendered_body)
	return {"sent": 1, "to": test_phone}


@frappe.whitelist()
def preview_panel_message(
	root_doctype: str,
	filters: str | dict | None = None,
	body: str = "",
	subject: str = "",
) -> dict[str, Any]:
	"""Render a message template against the first row for preview."""
	result = get_panel_data(root_doctype, filters)
	rows = result.get("rows") or []
	if not rows:
		return {"error": "No rows to preview."}

	row = rows[0]
	context = _enrich_row_context(root_doctype, row)

	try:
		rendered_body = frappe.render_template(body, context)
	except Exception:
		rendered_body = body

	try:
		rendered_subject = frappe.render_template(subject, context) if subject else ""
	except Exception:
		rendered_subject = subject

	if "<" not in rendered_body:
		rendered_body = rendered_body.replace("\n", "<br>")

	return {
		"rendered_body": rendered_body,
		"rendered_subject": rendered_subject,
		"context": context,
	}


@frappe.whitelist()
def send_panel_message(
	root_doctype: str,
	filters: str | dict | None = None,
	mode: str = "sms",
	recipient_field: str = "",
	body: str = "",
	subject: str = "",
	send_email_copy: int | str = 0,
	email_field: str = "",
) -> dict[str, int]:
	"""Send bulk SMS and/or email to all rows in a panel."""
	send_email_copy = int(send_email_copy)
	result = get_panel_data(root_doctype, filters)
	rows = result["rows"]

	sent = 0
	errors: list[str] = []

	for row in rows:
		context = _enrich_row_context(root_doctype, row)
		recipient = str(context.get(recipient_field, "")).strip()
		if not recipient:
			continue

		try:
			rendered_body = frappe.render_template(body, context)
		except Exception:
			rendered_body = body

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
						_send_email(email_addr, rendered_subject or "SMS Copy", rendered_body)
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
	"""Send an SMS via Twilio using credentials from API Connector."""
	import requests

	connector = frappe.get_doc("API Connector", "Twilio")
	account_sid = connector.username
	auth_token = connector.get_password("password")

	url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"

	from_number = frappe.db.get_single_value("SMS Settings", "sms_sender_name") or ""
	if not from_number:
		frappe.throw(_("No sender number configured. Set SMS Sender Name in SMS Settings."))

	resp = requests.post(
		url,
		data={"To": phone, "From": from_number, "Body": message},
		auth=(account_sid, auth_token),
		timeout=15,
	)

	if resp.status_code not in (200, 201):
		frappe.throw(_(f"Twilio error {resp.status_code}: {resp.text}"))


def _send_email(to_email: str, subject: str, body: str) -> None:
	"""Send an email via SendGrid using credentials from API Connector."""
	import requests

	connector = frappe.get_doc("API Connector", "SendGrid")
	api_key = connector.get_password("password")
	from_email = (connector.username or "").strip()

	if not from_email:
		frappe.throw(_("No from-email configured. Set the username on the SendGrid API Connector."))

	resp = requests.post(
		"https://api.sendgrid.com/v3/mail/send",
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
