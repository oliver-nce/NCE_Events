"""LLM integration — send prompts to Anthropic, OpenAI, etc. via API Connector."""
from __future__ import annotations

from typing import Any

import frappe
from frappe import _


def _get_default_provider() -> str:
	"""Read default provider from Settings."""
	try:
		return (frappe.db.get_single_value("Settings", "default_provider") or "Anthropic").strip()
	except Exception:
		return "Anthropic"


@frappe.whitelist()
def llm_send_prompt(
	prompt: str,
	provider: str | None = None,
	system_prompt: str | None = None,
	model: str | None = None,
	max_tokens: int | str = 1024,
) -> str:
	"""Whitelisted: send prompt to LLM and return response."""
	max_tokens = int(max_tokens) if max_tokens else 1024
	provider = (provider or "").strip() or _get_default_provider()
	return send_prompt_to_llm(
		prompt=prompt,
		provider=provider,
		system_prompt=system_prompt,
		model=model,
		max_tokens=max_tokens,
	)


def send_prompt_to_llm(
	prompt: str,
	provider: str | None = None,
	system_prompt: str | None = None,
	model: str | None = None,
	max_tokens: int = 1024,
) -> str:
	"""Send a prompt to an LLM and return the response text.

	provider: From Settings.default_provider if not passed. "Anthropic", "Gemini", "OpenAI".
	system_prompt: Optional system instruction.
	model: Override; else read from API Connector for that provider.
	max_tokens: Max tokens to generate.
	"""
	provider = (provider or "").strip() or _get_default_provider()
	if provider == "Anthropic":
		return _anthropic_send(prompt, system_prompt, model, max_tokens)
	if provider in ("Gemini", "OpenAI"):
		raise frappe.ValidationError(_("Provider {0} not yet implemented.").format(provider))
	raise frappe.ValidationError(_("Unknown LLM provider: {0}").format(provider))


def _anthropic_send(
	prompt: str,
	system_prompt: str | None,
	model: str | None,
	max_tokens: int,
) -> str:
	"""Send prompt to Anthropic Messages API."""
	import requests

	connector = frappe.get_doc("API Connector", "Anthropic")
	api_key = connector.get_password("password")
	if not api_key or not str(api_key).strip():
		frappe.throw(_("No API key configured. Set the password on the Anthropic API Connector."))

	# Model: explicit arg > API Connector model field > default
	model = (model or connector.get("model") or "").strip() or "claude-sonnet-4-20250514"
	url = "https://api.anthropic.com/v1/messages"

	payload: dict[str, Any] = {
		"model": model,
		"max_tokens": max_tokens,
		"messages": [{"role": "user", "content": prompt}],
	}
	if system_prompt:
		payload["system"] = system_prompt

	headers = {
		"x-api-key": api_key,
		"anthropic-version": "2023-06-01",
		"content-type": "application/json",
	}

	resp = requests.post(url, json=payload, headers=headers, timeout=60)

	if resp.status_code != 200:
		frappe.throw(_("Anthropic API error {0}: {1}").format(resp.status_code, resp.text[:500]))

	data = resp.json()
	content = data.get("content") or []
	text_parts = []
	for block in content:
		if isinstance(block, dict) and block.get("type") == "text":
			text_parts.append(block.get("text", ""))
	return "".join(text_parts)
