// Copyright (c) 2026, lukubara and contributors
// For license information, please see license.txt

frappe.ui.form.on("Material Return Request", {
    refresh: function(frm) {
        // Menghilangkan tombol Add Row dan tombol hapus di tiap baris
        frm.get_field('items').grid.cannot_add_rows = true;
        frm.get_field('items').grid.cannot_delete_rows = true;
        
        // Menghilangkan tombol centang massal (bulk actions)
        frm.get_field('items').grid.only_sortable();
        
        frm.refresh_field('items');
    }
});
