# Copyright (c) 2026, lukubara and contributors
# For license information, please see license.txt

import frappe

from frappe.utils.nestedset import NestedSet
from frappe.utils import cint

class WarehouseLocation(NestedSet):
	# Field yang menentukan siapa induknya
    nsm_parent_field = 'parent_warehouse_location' 

    #def on_update(self):
        # Memperbarui struktur pohon (lft, rgt) secara otomatis
    #    super("Warehouse Location", self).on_update()

@frappe.whitelist()
def get_children(doctype, parent=None, site=None, is_root=False):
	if is_root:
		parent = ""

	fields = ["name as value", "is_group as expandable"]
	filters = [
		["ifnull(`parent_warehouse_location`, '')", "=", parent],
		["site", "in", (site, None, "")],
	]

	return frappe.get_list(doctype, fields=fields, filters=filters, order_by="name")

@frappe.whitelist()
def add_node():
	from frappe.desk.treeview import make_tree_args

	args = make_tree_args(**frappe.form_dict)

	if cint(args.is_root):
		args.parent_warehouse = None

	frappe.get_doc(args).insert()
