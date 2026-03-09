# Copyright (c) 2026, lukubara and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class WorkOrderCompIssued(Document):
	pass


@frappe.whitelist() 
def get_lorserial_issue_details(work_order_split_number):
    # 1. Ambil semua name Item Request sekaligus
    item_requests = frappe.db.get_list("Item Request", 
        filters={"doctype_source": "Work Order Split", "link": work_order_split_number}, 
        fields=["name"]
    )

    if not item_requests:
        return []

    # Buat list nama: ['REQ-001', 'REQ-002', ...]
    request_names = [r.name for r in item_requests]

    # 2. Ambil semua Warehouse Task yang berhubungan dengan semua request tadi (hanya 1 query)
    # Gunakan filter "in" untuk efisiensi
    warehouse_tasks = frappe.db.get_list("Warehouse Task", 
        filters={
            "reference_doctype": "Item Request", 
            "reference_name": ["in", request_names]
        }, 
        fields=["name"] # Kita butuh 'name' untuk ambil child table
    )

    list_of_details = []
    
    # 3. Ambil detail dari Child Table
    for wt in warehouse_tasks:
        # Ambil data dari child table 'warehouse_task_detail' milik dokumen Warehouse Task ini
        details = frappe.get_all("Warehouse Task Detail", 
            filters={"parent": wt.name}, 
            fields=["*"] # Sesuaikan field apa saja yang ingin diambil
        )
        list_of_details.extend(details)

    return list_of_details