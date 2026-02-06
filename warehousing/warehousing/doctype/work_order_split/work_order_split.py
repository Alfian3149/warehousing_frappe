# Copyright (c) 2026, lukubara and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class WorkOrderSplit(Document):
	def validate(self):
		if not frappe.db.exists("Part Master", self.finish_good):
			new_item = frappe.get_doc({
				"doctype": "Part Master",
				"part": self.finish_good,
				"um": self.um,
				"description": self.fg_description,
				"qty_per_pallet": self.fg_qty_per_pallet
				})
			new_item.insert()
		
		self.ensure_item_details_exist_in_master()

	def ensure_item_details_exist_in_master(self):
		for row in self.work_order_split_detail:

			if not frappe.db.exists("Part Master", row.part):
				self.create_new_item(row)
				
	def create_new_item(self, row):
		new_item = frappe.get_doc({
			"doctype": "Part Master",
			"part": row.part,
			"um": row.um,
			"description": row.description,
			"qty_per_pallet": row.qty_per_pallet,
		})
		new_item.insert()


	def on_submit(self):
		#if not self.fg_qty_per_pallet:
		#	frappe.throw("Qty per Pallet Finish Good kosong, silakan isi terlebih dahulu.")

		if self.is_create_mts:
			#frappe.model.mapper.assign_confirm(self.doctype, self.name, "safno@gmail.com")
			new_itmreq = frappe.new_doc("Item Request")
			new_itmreq.purpose = "Manufacture"
			new_itmreq.posting_date = self.posting_date
			new_itmreq.required_by = self.required_by
			new_itmreq.target_location = self.shopfoor_location
			new_itmreq.doctype_source = "Work Order Split"
			new_itmreq.link = self.name

			for item in self.work_order_split_detail:
				#if not item.qty_per_pallet:
				#	frappe.throw(f"Qty per Pallet untuk Material {item.part} kosong, silakan isi terlebih dahulu.")
				new_item = new_itmreq.append("items")
				new_item.part = item.part
				new_item.um = item.um
				new_item.quantity = item.actual_required
				new_item.target_location = self.shopfoor_location
			new_itmreq.insert()
			new_itmreq.submit()
			
			self.db_set("link_to_item_request", new_itmreq.name)
			