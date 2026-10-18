# -*- coding: utf-8 -*-
"""
Genera el PDF del catálogo imprimiendo catalogo.html (misma fuente que la web).

Requisitos:  pip install playwright   y   playwright install chromium
Uso:         python generar_catalogo_pdf.py
Salida:      docs/TecnoPatch_Catalogo_CARTA_2026.pdf
"""
import http.server
import socketserver
import threading
import os
from playwright.sync_api import sync_playwright

PUERTO = 8765
SALIDA = os.path.join("docs", "TecnoPatch_Catalogo_CARTA_2026.pdf")

class Silencioso(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

def main():
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(("127.0.0.1", PUERTO), Silencioso)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        pg.goto("http://127.0.0.1:%d/catalogo.html" % PUERTO, wait_until="networkidle")
        pg.evaluate("document.fonts.ready")
        pg.evaluate("document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')")
        pg.wait_for_timeout(1500)
        pg.emulate_media(media="print")
        pie = ('<div style="width:100%;font-size:8px;font-family:Arial,sans-serif;color:#64748b;'
               'padding:0 14mm;display:flex;justify-content:space-between">'
               '<span>TecnoPatch · Catálogo de servicios 2026</span>'
               '<span>tecnopatch.com.mx</span>'
               '<span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>')
        pg.pdf(path=SALIDA, format="Letter", print_background=True, display_header_footer=True,
               header_template="<span></span>", footer_template=pie,
               margin={"top": "15mm", "bottom": "16mm", "left": "14mm", "right": "14mm"})
        b.close()
    srv.shutdown()
    print("PDF generado:", SALIDA)

if __name__ == "__main__":
    main()
