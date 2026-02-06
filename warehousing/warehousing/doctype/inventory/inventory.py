# Copyright (c) 2026, lukubara and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt

class Inventory(Document):
	pass

@frappe.whitelist()
def get_fifo_picklist_with_reserved(item_request_name):
    # 1. Ambil data dari Item Request
    doc = frappe.get_doc("Item Request", item_request_name)
    results = []

    for item in doc.items:
        needed_qty = flt(item.quantity)
        item_code = item.part
        allocated_qty = 0
        
        # 2. Ambil total Reserved Qty dari table Bin untuk item ini
        # Ini mencegah kita mengambil stok yang sudah di-reserve oleh Sales Order/Material Request lain
        inventory = frappe.db.get_value("Bin", 
            {"part": item_code, "warehouse": item.warehouse}, 
            ["qty_on_hand", "qty_reserved"], as_dict=True)
        
        # Stok bersih yang benar-benar bisa diambil
        total_available_pool = flt(inventory.qty_on_hand) - flt(inventory.qty_reserved) if inventory else 0

        if total_available_pool <= 0:
            frappe.msgprint(f"Stok untuk {item_code} tidak tersedia (Sudah di-reserve atau kosong).")
            continue

        # 3. Cari detail Lot/Serial berdasarkan FIFO (Stock Ledger Entry)
        # Kita ambil baris yang memiliki balance_qty > 0
        stocks = frappe.db.sql(f"""
            SELECT 
                batch_no, warehouse, serial_no, actual_qty, posting_date, posting_time
            FROM 
                `tabStock Ledger Entry`
            WHERE 
                item_code = %s 
                AND warehouse = %s
                AND is_cancelled = 0
                AND actual_qty > 0
            ORDER BY 
                posting_date ASC, posting_time ASC, creation ASC
        """, (item_code, item.warehouse), as_dict=True)

        for stock in stocks:
            if allocated_qty >= needed_qty or allocated_qty >= total_available_pool:
                break
            
            # Hitung sisa yang bisa diambil dari baris lot ini
            # Tidak boleh melebihi pool ketersediaan total (reserved logic)
            can_take_from_this_lot = min(stock.actual_qty, total_available_pool - allocated_qty)
            take_qty = min(can_take_from_this_lot, needed_qty - allocated_qty)
            
            if take_qty > 0:
                results.append({
                    "item_code": item_code,
                    "warehouse": stock.warehouse,
                    "batch_no": stock.batch_no,
                    "serial_no": stock.serial_no,
                    "qty": take_qty
                })
                allocated_qty += take_qty

    return results
    
@frappe.whitelist()
def update_inventory_qty(doctype, doctype_link, transType, postingDate, site, part, lot_serial, reference, whs_location, qty_change, invStatus=None, expireDate=None, poNumber=None, poLine=None):
    """
    Update: Menambah atau mengurangi stok berdasarkan perubahan qty
    """
    in_out= frappe.db.get_value("Transaction Type", transType, "in_out") 
    if not in_out:
        frappe.throw(_("Transaction Type {0} belum diatur In/Out nya").format(transType))
    # Cari record yang sudah ada
    inventory = frappe.db.get_value("Inventory", 
        {"site": site, "part": part, "lot_serial": lot_serial, "reference": reference, "warehouse_location": whs_location}, ["name", "qty_on_hand"], as_dict=True)

    if inventory:
        current_qty = inventory.qty_on_hand
        name = inventory.name
    else:
        current_qty = 0
        name = None

    
    current_qty = inventory.qty_on_hand if inventory else 0
    new_balance =  flt(current_qty) + flt(qty_change) if in_out == "IN" else flt(current_qty) - flt(qty_change)

    # Buat Stock Ledger (Riwayat)
    stock_ledger = frappe.get_doc({
        "doctype": "Stock Ledger",
        "doctype_source": doctype,
        "data_link": doctype_link,
        "transaction_type": transType,
        "po_number": poNumber,
        "po_line": poLine,
        "site": site,
        "part": part,
        "lot_serial": lot_serial,
        "warehouse_location": whs_location,
        "expire_date": expireDate if expireDate else None,
        "status": invStatus,
        "actual_qty": flt(qty_change) if in_out == "IN" else -flt(qty_change),
        "qty_after_transaction": flt(new_balance),
        "posting_date": postingDate,
    }) 
    stock_ledger.insert(ignore_permissions=True)
    stock_ledger.submit()
    
    if inventory:
        # UPDATE: Ambil dokumen dan tambahkan qty
        doc = frappe.get_doc("Inventory", name)
        doc.qty_on_hand = flt(new_balance)
        if invStatus : 
            doc.inventory_status = invStatus
        if expireDate: 
            doc.expire_date = expireDate    
        doc.save(ignore_permissions=True)
    else:
        # CREATE: Jika belum ada, buat record baru
        create_inventory_record(site, part, lot_serial, reference, whs_location, new_balance, invStatus, expireDate)

    
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
    new_inv.qty_on_hand = flt(initial_qty)
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
  
@frappe.whitelist()
def QAD_middleware_sync(): 
    # data akan diterima sebagai string JSON
    import json
    data = frappe.request.get_json()
   
    ir = frappe.get_doc({
        "doctype": "Integration Request",
        "integration_request_service": "QAD WMS Sync",
        "status": "Completed", # "Queued", "Completed", atau "Failed"
        "data": frappe.as_json(data),     # Simpan payload JSON di sini
        "error_log": None ,
        "reference_doctype": "Inventory",
    })
    ir.insert(ignore_permissions=True)
    ir.submit() 
    frappe.db.commit() # Commit awal agar log tetap ada meski proses setelahnya error

    # Logika untuk mencatat ke Stock Ledger atau DocType khusus 'QAD Sync Log'
    # Pastikan data yang dikirim QAD lengkap (part, qty, site, trans_type, dll)
    return {"status": "success", "message": "Transaction synced"}


@frappe.whitelist(allow_guest=True)
def get_warehouse_status():
    return {"status": "Online"} 