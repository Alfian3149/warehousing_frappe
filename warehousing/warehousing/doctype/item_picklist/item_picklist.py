# Copyright (c) 2026, lukubara and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import flt
from frappe.model.naming import make_autoname

class ItemPicklist(Document):
	def autoname(self):
		year = frappe.utils.nowdate()[:4]
		# .##### akan otomatis diisi dengan nomor urut (00001, 00002, dst)
		self.name = make_autoname(f"Picklist-{year}-.#####")
		
	def validate(self):
		#print(self.select_request)
		
		return
	
	def on_submit(self):
		unique_items = {}
		itemRequestDoc = []

		for request in self.select_request:
			itemRequest = frappe.get_doc("Item Request", request.request_master) 
			itemRequestDoc.append(itemRequest.name)

		for item_pick in self.item_picklist_summary:
			getItemRequestSummary = frappe.get_all("Item Request Detail", 
			filters={"part": item_pick.part, "parent": ["in", itemRequestDoc]}, 
			fields=["quantity_requested","quantity_picked", "name"])
			totalPicked = flt(item_pick.quantity_picked)
			for itemRequestSummary in getItemRequestSummary:
				if totalPicked <= 0:
					break

				qty_requested = flt(itemRequestSummary.quantity_requested)
				qty_already_picked = flt(itemRequestSummary.quantity_picked)
				rest_needed = qty_requested - qty_already_picked

				if rest_needed > 0:
					if totalPicked >= rest_needed:
						totalPicked -= rest_needed
						frappe.db.set_value("Item Request Detail", itemRequestSummary.name, "quantity_picked", itemRequestSummary.quantity_requested)
					else:
						frappe.db.set_value("Item Request Detail", itemRequestSummary.name, "quantity_picked", qty_already_picked + totalPicked)
						totalPicked = 0
						break

		try:
			new_task = frappe.new_doc("Warehouse Task")
			new_task.task_type = "Picking"
			new_task.reference_doctype = "Item Picklist"
			new_task.reference_name = self.name
			new_task.wo_split_number = ", ".join(itemRequestDoc)
			""" new_task.assign_to_user = assigned_to_person
			new_task.assign_to_role = assigned_to_role """
			new_task.date_instruction = frappe.utils.nowdate()
			new_task.time_instruction = frappe.utils.nowtime()

			for item in self.item_picklist_detail:
				new_task.append("warehouse_task_detail", {
					"item": item.part,
					"um": item.um,
					"lotserial": item.lot_serial,
					"description": item.description,
					"conversion_factor": item.conversion_factor,
					"um_packaging": item.um_conversion,
					"qty_label": item.quantity,
					"locationsource": item.from_location,
					"locationdestination": item.to_location
				})

			new_task.insert()
		except Exception as e:
			frappe.log_error(frappe.get_traceback(), "Error pada Create Warehouse Task")
			frappe.throw(f"Gagal membuat Warehouse Task: {str(e)}")

		for item in self.item_picklist_detail:
			doc_reserved_task = frappe.get_doc({
				"doctype": "Reserved Task Entry",
				"purpose" : "Picking",
				"doctype_source" : "Warehouse Task",
				"task": new_task.name,
				"site": item.site,
				"part": item.part,
				"lot_serial": item.lot_serial,
				"warehouse_location": item.from_location,
				"destination_location": item.to_location,
				"qty": item.quantity, 
			})
			doc_reserved_task.insert(ignore_permissions=True)

