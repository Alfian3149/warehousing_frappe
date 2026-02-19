import requests
def test_internal_api(url):
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            return {"status": "success", "message": "Koneksi server internal berhasil"}
    except requests.exceptions.ConnectionError:
        return {"status": "failed", "message": "Koneksi server internal gagal"}