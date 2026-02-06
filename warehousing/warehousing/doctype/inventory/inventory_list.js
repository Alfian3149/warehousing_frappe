frappe.listview_settings['Inventory'] = {
    onload: function(listview) {
        // 1. Menghilangkan Sidebar (Filter & Report Builder)
        listview.page.sidebar.hide();

        // 2. Menghilangkan Tombol "Add" (Tambah) di bagian atas
        listview.page.clear_primary_action();
        
        $(".layout-side-section").hide();
        $(".layout-main-section").removeClass("col-lg-10").addClass("col-lg-12");
    },
    
    refresh: function(listview) {
        // Jalankan kembali saat refresh untuk memastikan tombol Add tetap hilang
        listview.page.clear_primary_action();
    }
}; 