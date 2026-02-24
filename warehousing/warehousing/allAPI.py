import json
import requests
import frappe
from frappe import _
import time
from bs4 import BeautifulSoup 
from warehousing.warehousing.doctype.inventory.inventory import update_inventory_qty
import xml.etree.ElementTree as ET
from warehousing.warehousing.utils import test_internal_api

@frappe.whitelist()
def get_simulated_picklist_item(site, part, qty, domain):
    import xml.etree.ElementTree as ET
    time.sleep(1)
    if not part:
        frappe.throw(_("Part harus diisi"))
        return
    input_data = {
        "ttip_table": [
            {
                "ttip_parent": part,
                "ttip_site": site,
                "ttip_qty": qty
            }
        ]
    }

    data = json.dumps(input_data)

    #url = "http://smii.qad:24079/wsa/smiiwsa"
    url = "http://127.0.0.1:24079/wsa/smiiwsa"
    payload = f"""<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <zzbmpkcc xmlns="urn:services-qad-com:smiiwsa:0001:smiiwsa">
        <domain>{domain}</domain>
        <ipdataset_parentItem>{data}</ipdataset_parentItem>
        <ipdataset_materialItem>?</ipdataset_materialItem>
        </zzbmpkcc>
    </soap:Body>
    </soap:Envelope>"""
    headers = {
    'Content-Type': 'text/xml; charset=utf-8',
    'SOAPAction': '""'
    }

    try:
        response = requests.post(url, data=payload, headers=headers)

        if response.status_code == 200:
            xml_response = response.text
            try:
                root = ET.fromstring(xml_response)
                for result in root.iter():
                    if 'oplcdatadetail' in result.tag:
                        dataResponse = json.loads(result.text)
                        return dataResponse
            except Exception:
                frappe.throw(_("Gagal membaca respon JSON dari QAD"))
        else:
            frappe.throw(_("Koneksi ke QAD Gagal: {0}").format(response.status_code))

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "QAD Get Simulated Picklist API Error")
        frappe.throw(_("Terjadi kesalahan saat menghubungi QAD: {0}").format(str(e)))


@frappe.whitelist()
def get_workorder_from_qad(work_order, domain): 
    time.sleep(1)
    if not work_order:
        frappe.throw(_("Work Order harus diisi"))
        return
    input_data = {
        "dsWOInput": {
            "ttWORequest": [
                {
                    "domain_filter": domain,
                    "wonbr_filter": work_order
                }
            ]
        }
    }
    data = json.dumps(input_data)

    #url = "http://smii.qad:24079/wsa/smiiwsa"
    url = "http://127.0.0.1:24079/wsa/smiiwsa"
    payload = f"""<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <zzGetWorkOrder xmlns="urn:services-qad-com:smiiwsa:0001:smiiwsa">
        <ipDatasetRequest>{data}</ipDatasetRequest>
        </zzGetWorkOrder>
    </soap:Body>
    </soap:Envelope>"""
    headers = {
    'Content-Type': 'text/xml; charset=utf-8',
    'SOAPAction': '""'
    }

    try:
        response = requests.post(url, data=payload, headers=headers)

        if response.status_code == 200:
            dataResponse = parse_qad_response(response.text)
            return dataResponse
        else:
            frappe.throw(_("Koneksi ke QAD Gagal: {0}").format(response.status_code))

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "QAD Get Work Order API Error")
        frappe.throw(_("Terjadi kesalahan saat menghubungi QAD: {0}").format(str(e)))


@frappe.whitelist()
def get_po_from_qad(po_number=None, domain="SMII"): 
    time.sleep(1)
    if not po_number:
        frappe.throw(_("Nomor Purchase Order harus diisi"))
        return
    input_data = {
        "dsPOInput": {
            "ttPORequest": [
                {
                    "domain_filter": domain,
                    "ponbr_filter": po_number
                }
            ]
        }
    }
    data = json.dumps(input_data)

    #url = "http://smii.qad:24079/wsa/smiiwsa"
    url = "http://127.0.0.1:24079/wsa/smiiwsa"
    payload = f"""<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <zzGetPurchaseOrder xmlns="urn:services-qad-com:smiiwsa:0001:smiiwsa">
        <ipDatasetRequest>{data}</ipDatasetRequest>
        </zzGetPurchaseOrder>
    </soap:Body>
    </soap:Envelope>"""
    headers = {
    'Content-Type': 'text/xml; charset=utf-8',
    'SOAPAction': '""'
    }

    #response = frappe.make_post_request(url, headers=headers, data=payload) 
    try:
        response = requests.post(url, data=payload, headers=headers)

        if response.status_code == 200:
            dataResponse = parse_qad_response(response.text)
            
            return dataResponse
        else:
            frappe.throw(_("Koneksi ke QAD Gagal: {0}").format(response.status_code))

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "QAD Get PO API Error")
        frappe.throw(_("Terjadi kesalahan saat menghubungi QAD: {0}").format(str(e)))

def parse_qad_response(xml_response):
    import xml.etree.ElementTree as ET
    
    try:
        root = ET.fromstring(xml_response)
        for result in root.iter():
            if 'opDatasetResult' in result.tag:
                return json.loads(result.text)
            elif 'oplcdataset' in result.tag:
                return json.loads(result.text)
            elif 'operror' in result.tag:
                return json.loads(result.text)
    except Exception:
        frappe.throw(_("Gagal membaca respon JSON dari QAD"))

@frappe.whitelist()
def po_receipt_JSON_Display(parent_doc_name, material_incoming_name): 
    payload = po_receipt_JSON(parent_doc_name, material_incoming_name)
    frappe.msgprint(frappe.as_json(payload))
    
def po_receipt_JSON(parent_doc_name, material_incoming_name):
    material_incoming = frappe.get_doc("Material Incoming", material_incoming_name)
    warehouse_task = frappe.get_doc("Warehouse Task", parent_doc_name)

    grouped_details = {}
    if warehouse_task.status != "Completed": 
        final_payload =  {
            "status": "failed" ,
            "message": "ERROR: Task status is not completed",
        }
    else :
        for item in warehouse_task.warehouse_task_detail:
            line_no = item.line_po
            
            if item.status != "Completed" : 
                continue    
            if item.qty_confirmation <= 0 :
                continue

            if line_no not in grouped_details:
                # Inisialisasi record ttPOTransDet jika line baru ditemukan
                grouped_details[line_no] = {
                    "nbr": material_incoming.purchase_order,
                    "line": line_no,
                    "site": material_incoming.site,
                    "loc": item.locationdestination,
                    "lotSer": item.lotserial,
                    "qty": 0, # Akan dijumlahkan dari semua lot
                    "expire": item.expired_date,
                    "rctstat": "P-GOOD",
                    "ttPOInventoryTransDet": []
                }
            
            # Tambahkan qty ke total ttPOTransDet
            grouped_details[line_no]["qty"] += item.qty_confirmation
            
            # Tambahkan record lot ke dalam array ttPOInventoryTransDet
            grouped_details[line_no]["ttPOInventoryTransDet"].append({
                "nbr": material_incoming.purchase_order,
                "line": line_no,
                "site": material_incoming.site,
                "loc": item.locationdestination,
                "lotSer": item.lotserial,
                "ref": "",
                "qty": item.qty_confirmation,
                "qadc01": item.item # Sesuai mapping zzPoReceiptAPI.p
            })

        # 2. Bangun Struktur Final
        final_payload = {
            "dsPOTrans": {
                "ttPOTrans": [{
                    "nbr": material_incoming.purchase_order,
                    "psNbr": material_incoming.packing_slip,
                    "effDate": material_incoming.transaction_date,
                    "moveToNextOp": True,
                    "lcorrection": False,
                    "shipDate": material_incoming.ship_date,
                    "rcpDate": material_incoming.transaction_date,
                    "ttPOTransDet": list(grouped_details.values()) # Masukkan hasil grouping
                }]
            }
        }

    return final_payload
 
@frappe.whitelist()
def po_receipt_confirmation(parent_doc_name, material_incoming_name): 
    #url = "http://smii.qad:24079/wsa/smiiwsa"
    url = "http://127.0.0.1:24079/wsa/smiiwsa"
    data = test_internal_api(url)
    
    if data.get("status") == "failed" : 
        return data

    data = po_receipt_JSON(parent_doc_name, material_incoming_name)
    if "status" in data: 
        if data.get("status") == "failed" : 
            return data

    data = frappe.as_json(data)
    payload = f"""<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <zzPoReceiptAPI xmlns="urn:services-qad-com:smiiwsa:0001:smiiwsa">
        <ipdataset_dsPOTrans>{data}</ipdataset_dsPOTrans>
        </zzPoReceiptAPI>
    </soap:Body>
    </soap:Envelope>"""
    headers = {
    'Content-Type': 'text/xml; charset=utf-8',
    'SOAPAction': '""'
    }
    # Inisialisasi variabel awal
    receiver = None
    isNotOk = "false"
    errorMsg = ""
    
    # 1. Buat Draft Integration Request untuk Logging
    int_log = frappe.get_doc({
        "doctype": "Integration Request",
        "integration_request_service": "QAD PO API",
        "url": url,
        "data": json.dumps(payload, indent=4) if isinstance(payload, (dict, list)) else payload,
        "status": "Queued",
        "reference_doctype": "Warehouse Task",
        "reference_name": parent_doc_name
    })
    int_log.insert(ignore_permissions=True)

    try:
        response = requests.request("POST", url, data=payload, headers=headers, timeout=30)
        int_log.output = response.text # Simpan respon mentah

        if response.status_code == 200:
            root = ET.fromstring(response.text)
            namespaces = {'qad': 'urn:services-qad-com:smiiwsa:0001:smiiwsa'}
            
            oplc_element = root.find('.//qad:oplcdataset', namespaces)
            opnotok_element = root.find('.//qad:opnotok', namespaces)
            operror_element = root.find('.//qad:operror', namespaces)
            errmessage_element = root.find('.//qad:errmessage', namespaces)

            # Logika Jika Sukses (Ada Data)
            if oplc_element is not None and oplc_element.text:
                data_dict = json.loads(oplc_element.text)
                transactionSuccess = data_dict.get("ttLotserialTrhist", [])
                isNotOk = str(data_dict.get("opnotok", "false")).lower()
                
                if isNotOk == "false":
                    for d in transactionSuccess:
                        receiver = d.get("receiver")
                        d_site = d.get("site") or "1000"
                        # Fungsi update_inventory_qty pastikan sudah terimport
                        update_inventory_qty(
                            "Warehouse Task", parent_doc_name, "RCT-PO", d.get("effdate"), 
                            d_site, d.get("part"), d.get("lotserial"), d.get("ref"), 
                            d.get("location"), d.get("qty"), d.get("ldstatus"), 
                            d.get("expire"), d.get("ponumber"), int(d.get("poline", 0))
                        )
                    int_log.status = "Completed"

            # Logika Jika Error dari QAD
            if opnotok_element is not None:
                isNotOk = opnotok_element.text.strip().lower()
                errorMsg = operror_element.text if operror_element is not None else "Unknown Error"
                
                if isNotOk == "true":
                    int_log.status = "Failed"
                    error_temp = []
                    if errmessage_element is not None and errmessage_element.text:
                        try:
                            err_data = json.loads(errmessage_element.text)
                            error_temp = err_data.get("temp_err_msg", [])
                        except:
                            error_temp = errmessage_element.text

                    log_data = {
                        "request_payload": payload,
                        "error_message": error_temp,
                        "qad_error_msg": errorMsg
                    }
                    
                    frappe.log_error(
                        title=f"ERROR: WAREHOUSE TASK {parent_doc_name}",
                        message=json.dumps(log_data, indent=4)
                    )

            int_log.save(ignore_permissions=True)
            return {
                "receiver": receiver,
                "status": "failed" if isNotOk == "true" else "success",
                "message": errorMsg if isNotOk == "true" else None,
            }
        else:
            int_log.status = "Failed"
            int_log.save()
            frappe.throw(_("Koneksi ke QAD Gagal: {0}").format(response.status_code))

    except Exception as e:
        frappe.db.rollback()
        int_log.status = "Failed"
        int_log.error_log = frappe.get_traceback()
        int_log.save(ignore_permissions=True)
        #frappe.log_error(frappe.get_traceback(), "QAD Get PO API Error")
        frappe.throw(_("Terjadi kesalahan saat menghubungi QAD: {0}").format(str(e)))
    
def get_grouped_data(docname):
    doc = frappe.get_doc("Warehouse Task", docname)
    summary = {}

    for row in doc.warehouse_task_detail: 
        key = (row.line_po, row.item)
        
        if key not in summary:
            summary[key] = {
                "line": row.line_po,
                "item": row.item,
                "loc": row.locationdestination,
                "expired_date": row.expired_date,
                "total_qty_confirm": 0
            }
        
        # Tambahkan qty_confirm ke total (pastikan dikonversi ke float)
        summary[key]["total_qty_confirm"] += float(row.qty_confirmation)

    # Mengubah dictionary kembali menjadi list agar mudah dibaca/diproses
    grouped_list = list(summary.values())
    
    return grouped_list

def log_xml_integration(service_name, request_data, xml_response):
    log = frappe.get_doc({
        "doctype": "Integration Request",
        "integration_request_service": service_name,
        "status": "Completed", 
        "request_description": "QAD XML API Response",
        "data": frappe.as_json(request_data),
        "output": xml_response 
    })
     
    log.insert(ignore_permissions=True)
    return log.name 