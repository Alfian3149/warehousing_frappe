// Copyright (c) 2026, lukubara and contributors
// For license information, please see license.txt

frappe.ui.form.on("Putaway Method", {
	refresh(frm) {
        if (frm.doc.unique_key === undefined || frm.doc.unique_key === null || frm.doc.unique_key === "") {
            if (frm.doc.part && frm.doc.warehouse_location) {
                frm.set_value("unique_key", frm.doc.part + "#" + frm.doc.warehouse_location);
                frm.save().then(() => {
                    frappe.show_alert({
                        message: __('Auto-generated Unique Key has been set.'),
                    indicator: 'green'
                });
            });
            } 
        }
        
	},
    before_save: function(frm) {
        if (frm.doc.part && frm.doc.warehouse_location) {
            frm.set_value("unique_key", frm.doc.part + "#" + frm.doc.warehouse_location);
        }

    }

});
