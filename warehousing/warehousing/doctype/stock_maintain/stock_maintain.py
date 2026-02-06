# Copyright (c) 2026, lukubara and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from warehousing.warehousing.doctype.inventory.inventory import update_inventory_qty
from frappe.model.naming import getseries
from frappe.utils import getdate

class StockMaintain(Document):
	def on_submit(self):
		if self.lotserial_automatic:
			date = getdate(self.posting_date)
			day   = date.strftime("%d")
			month = date.strftime("%m")
			year  = date.strftime("%y")

			lotserial_prefix = f"{self.part}-{day}{month}{year}"
			lotserial_running_number = getseries(lotserial_prefix, 3)
			self.lot_serial = f"{day}{month}{year}-{lotserial_running_number}"
		update_inventory_qty(self.source_type, self.data_link, self.inventory_transactions, self.posting_date, self.site, self.part, self.lot_serial, self.reference, self.warehouse_location, self.quantity_change, self.status, self.expire_date, self.po_number, self.po_line)
		frappe.msgprint(f"Inventory updated successfully for Stock Maintain {self.name}")