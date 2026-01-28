// Copyright (c) 2026, lukubara and contributors
// For license information, please see license.txt

frappe.ui.form.on("Warehouse Task", {
 	refresh(frm) {
        toggle_summary_section(frm);
        fetch_po_from_material_incoming(frm);
        frm.toggle_display('po_number', frm.doc.task_type === 'Physical Verification');
        // Cek jika dokumen sudah disimpan dan statusnya 'Completed'
        if (frm.doc.status === 'Completed') {
            
            // 1. Sembunyikan tombol Submit bawaan (jika ada)
            //frm.disable_save(); 
            
            frm.add_custom_button(__('Display JSON'), function() {
                frappe.call({
                    method: "warehousing.warehousing.allAPI.po_receipt_JSON_Display",
                    args: {
                        parent_doc_name: cur_frm.doc.name,
                        material_incoming_name: cur_frm.doc.reference_name
                    },
                    freeze: true,
                    freeze_message: __("Sedang memproses PO Receipt JSON..."),
                    callback: function(r) {
                        if (r.message) {
                            frappe.show_alert({ message: __(r.message.message), indicator: 'green' });
                            dialog.hide();
                        }
                    }
                });
            }).addClass("btn-warning").removeClass("btn-default");
            // 2. Tambahkan tombol kustom "PO Receipt Confirm"
            frm.add_custom_button(__('PO Receipt Confirm'), function() {
                
                // Konfirmasi ke user sebelum eksekusi
                frappe.confirm('Apakah Anda yakin ingin melakukan PO Receipt Confirmation ke QAD?', () => {
                   frappe.call({
                        method: "warehousing.warehousing.allAPI.po_receipt_confirmation",
                        args: {
                            parent_doc_name: cur_frm.doc.name,
                            material_incoming_name: cur_frm.doc.reference_name
                        },
                        freeze: true,
                        freeze_message: __("Sedang memproses PO Receipt Confirmation..."),
                        callback: function(r) {
                            if (r.message.status === "failed") {
                                frappe.show_alert({ message: __(r.message.message), indicator: 'red' });
                                dialog.hide();
                            }
                        }
                    });
                });

            }).addClass("btn-warning").removeClass("btn-default");
        }
 	},
    task_type: function(frm) {
        // Menampilkan atau menyembunyikan field po_number secara manual
        frm.toggle_display('po_number', frm.doc.task_type === 'Physical Verification');
    },
});

// Trigger saat ada perubahan di Child Table 'Warehouse Task Detail'
frappe.ui.form.on('Warehouse Task Detail', {
    // Trigger saat field 'status' di baris tabel diubah
    status: function(frm, cdt, cdn) {
        update_parent_status(frm);
    },
    // Trigger saat baris dihapus
    warehouse_task_detail_remove: function(frm) {
        update_parent_status(frm);
    },
    // Trigger saat baris ditambah
    warehouse_task_detail_add: function(frm) {
        update_parent_status(frm);
    }
});

// Fungsi pembantu untuk mengecek status semua baris
var update_parent_status = function(frm) {
    let details = frm.doc.warehouse_task_detail || [];
    
    if (details.length === 0) {
        frm.set_value('status', 'Pending');
        return;
    }

    // Cek apakah semua status di baris adalah 'Complete'
    let all_complete = details.every(row => row.status === 'Completed');

    if (all_complete) {
        frm.set_value('status', 'Completed');
    } else {
        // Jika ada satu saja yang belum complete, set ke In Progress
        frm.set_value('status', 'In Progress');
    }
};

frappe.ui.form.on('Warehouse Task Detail', {
    // Trigger saat kolom qty_confirmation diubah
    qty_confirmation: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        // Validasi: Jika input tidak kosong dan tidak sama dengan qty_label
        if (row.qty_confirmation != undefined && row.qty_confirmation !== row.qty_label) {
            
            // Munculkan Pop-up Prompt
            frappe.prompt([
                {
                    label: 'Pilih Alasan Perbedaan Qty',
                    fieldname: 'reason',
                    fieldtype: 'Select',
                    options: [
                        'Barang Rusak',
                        'Salah Label',
                        'Kurang dari Supplier',
                        'Lebih dari Supplier',
                        'Lainnya'
                    ],
                    reqd: 1 // Wajib diisi
                },
                {
                    label: 'Keterangan Tambahan',
                    fieldname: 'remark',
                    fieldtype: 'Small Text'
                }
            ], (values) => {
                // Simpan hasil pilihan ke baris tabel tersebut
                frappe.model.set_value(cdt, cdn, 'discrepancy_reason', values.reason);
                
                if(values.remark) {
                    frappe.model.set_value(cdt, cdn, 'remark', values.remark);
                }
                
                //frappe.msgprint(__('Alasan perbedaan telah disimpan di baris No. {0}', [row.idx]));
            }, 'Konfirmasi Perbedaan Kuantitas', 'Simpan');

        } else {
            // Jika qty disamakan kembali, hapus reason
            frappe.model.set_value(cdt, cdn, 'discrepancy_reason', '');
        }
         frappe.model.set_value(cdt, cdn, 'status', 'Completed');
    }
});

function fetch_po_from_material_incoming(frm) {
    // Hanya jalankan jika Task Type sesuai dan Reference Name sudah terisi
    if (frm.doc.task_type === "Physical Verification" && frm.doc.reference_name) {
        frappe.db.get_value('Material Incoming', frm.doc.reference_name, 'purchase_order', (r) => {
            if (r && r.purchase_order) {
                frm.set_value('po_number', r.purchase_order);
            } else {
                // Opsional: Kosongkan jika tidak ditemukan
                frm.set_value('po_number', '');
            }
        });
        
    } else {
        // Kosongkan field jika kondisi tidak terpenuhi
        frm.set_value('po_number', '');
    }
}

function toggle_summary_section(frm) {
    // Memunculkan atau menyembunyikan section berdasarkan status
    if (frm.doc.status === 'Completed') {
        frm.set_df_property('summary_result_section', 'hidden', 0);
    } else {
        frm.set_df_property('summary_result_section', 'hidden', 1);
    }
}