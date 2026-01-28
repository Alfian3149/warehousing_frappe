# Copyright (c) 2025, lukubara and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.model.naming import getseries
from frappe.utils import getdate, nowdate
from frappe.model.mapper import get_mapped_doc

class MaterialIncoming(Document):
	def validate(self):
		if self.doc_status == 1 and self.status == "Submitted":
			if not self.submitted_date:
				self.submitted_date = frappe.utils.now_datetime()
				
			today = getdate(nowdate())
			day   = today.strftime("%d")
			month = today.strftime("%m")
			year  = today.strftime("%y")	 

			exists = frappe.db.exists("Material Label", {"material_incoming_link": self.name})
			if not exists:
				for d in self.material_incoming_item:
					if d.total_label > 0:
						loop_count = d.total_label
						total_qty = d.qty_to_receive
						qty_per_pallet = d.qty_per_pallet
						remaining_qty = total_qty
						for i in range(loop_count):
							lotserial_prefix = f"{d.item_number}-{day}{month}{year}"
							lotserial_running_number = getseries(lotserial_prefix, 3)
							label_prefix = f"LBL-{month}{year}-"
							label_running_number = getseries(label_prefix, 4)
							current_qty = qty_per_pallet if remaining_qty >= qty_per_pallet else remaining_qty
							frappe.get_doc({
								'doctype': 'Material Label',
								'name' : f"{month}{year}-{label_running_number}",
								'material_incoming_link': self.name,
								'custom_purchase_order': self.purchase_order,
								'line': d.pod_line,
								'item': d.item_number,
								'custom_description': d.item_description,
								'lotserial': f"{day}{month}{year}-{lotserial_running_number}",
								'qty': current_qty,
								'barcode_fwrj': d.item_number + '#' + f"{day}{month}{year}-{lotserial_running_number}",
							}).insert(ignore_permissions=True)

							remaining_qty -= current_qty
						frappe.db.commit()

	def before_insert(self):
		self.status = "Draft"

@frappe.whitelist()
def make_material_label(source_name, target_doc=None):
	doc = get_mapped_doc(
		"Material Incoming",
		source_name,
		{
			"Material Incoming": {
				"doctype": "Material Label",
				"field_map": {"purchase_order": "purchase_order", "lotserial": "lotserial", "qty": "qty"},
			},
		},
		target_doc,
		postprocess,
	)

	return doc

@frappe.whitelist()
def get_po_history_with_items(purchase_order, current_doc):
    # Ambil list kedatangan lain
    history = frappe.db.get_list("Material Incoming", 
        filters={
            "purchase_order": purchase_order,
            "name": ["!=", current_doc],
            #"docstatus": ["<", 2]
        },
        fields=["name", "order_date", "site", "transaction_date", "status"],
        order_by="transaction_date desc"
    )

    # Ambil semua item untuk dokumen-dokumen tersebut
    for doc in history:
        doc['items'] = frappe.db.get_all("Material Incoming Item",
            filters={"parent": doc.name},
            fields=["pod_line", "item_number", "item_description", "qty_to_receive", "um"]
        )
    
    return history