# Copyright (c) 2026, lukubara and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class WarehouseTaskDetail(Document):
	def validate(self):
		frappe.throw("Kuantitas tidak boleh negatif pada baris {0}".format(self.lotserial))
