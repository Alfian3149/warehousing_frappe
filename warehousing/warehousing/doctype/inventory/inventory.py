# Copyright (c) 2026, lukubara and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class Inventory(Document):
	pass

@frappe.whitelist()
def update_inventory_qty(site, part, lot_serial, reference, whs_location, qty_change, invStatus=None, expireDate=None):
    """
    Update: Menambah atau mengurangi stok berdasarkan perubahan qty
    """
    # Cari record yang sudah ada
    name = frappe.db.get_value("Inventory", 
        {"site": site, "part": part, "lot_serial": lot_serial, "reference": reference, "warehouse_location": whs_location}, "name")

    if name:
        # UPDATE: Ambil dokumen dan tambahkan qty
        doc = frappe.get_doc("Inventory", name)
        doc.qty_on_hand += float(qty_change)
        if invStatus : 
            doc.inventory_status = invStatus
        if expireDate: 
            doc.expire_date = expireDate    
        doc.save(ignore_permissions=True)
    else:
        # CREATE: Jika belum ada, buat record baru
        create_inventory_record(site, part, lot_serial, reference, whs_location, qty_change, invStatus, expireDate)


def create_inventory_record(site, part, lot_serial, reference, whs_location, initial_qty, invStatus, expireDate=None):
    """
    Create: Membuat baris baru di tabel Inventory
    """
    new_inv = frappe.new_doc("Inventory")
    new_inv.site = site
    new_inv.part = part
    new_inv.lot_serial = lot_serial
    new_inv.reference = reference
    new_inv.warehouse_location = whs_location
    new_inv.qty_on_hand = initial_qty
    if expireDate: 
        new_inv.expire_date = expireDate 
    new_inv.inventory_status = invStatus
    new_inv.insert(ignore_permissions=True)

@frappe.whitelist()
def get_inventory_qty(site, part, lot_serial, reference, whs_location):
    """
    Read: Mengambil saldo stok saat ini
    """
    qty = frappe.db.get_value("Inventory", 
        {"site": site, "part": part, "lot_serial": lot_serial, "reference": reference, "warehouse_location": whs_location}, "qty_on_hand")
    return float(qty) if qty else 0

@frappe.whitelist()
def delete_inventory_entry(site, part, lot_serial, reference, whs_location):
    """
    Delete: Menghapus record inventory (Hati-hati dalam penggunaan)
    """
    name = frappe.db.get_value("Inventory", {"site": site, "part": part, "lot_serial": lot_serial, "reference": reference, "warehouse_location": whs_location})
    if name:
        frappe.delete_doc("Inventory", name)