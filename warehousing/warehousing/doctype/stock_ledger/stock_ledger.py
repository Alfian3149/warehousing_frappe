# Copyright (c) 2026, lukubara and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document
from frappe.utils import nowdate
from frappe.model.naming import getseries
class StockLedger(Document):
	def autoname(self):
		date_str = nowdate()
		year_month = date_str[2:4] + date_str[5:7]
		label_prefix = f"LEDGER-{year_month}-"
		label_running_number = getseries(label_prefix, 5)
		self.name = f"{year_month}-{label_running_number}"