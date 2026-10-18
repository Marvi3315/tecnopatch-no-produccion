# -*- coding: utf-8 -*-
"""
Genera catalogo.html (catálogo de servicios en la web) a partir de los datos de abajo.

Uso:   python generar_catalogo.py
Salida: catalogo.html

Para cambiar textos, servicios, tiempos o teléfono, edita CATEGORIAS / TEL y vuelve a correr el script.
El PDF (docs/TecnoPatch_Catalogo_CARTA_2026.pdf) se genera imprimiendo catalogo.html (ver generar_catalogo_pdf.py).
"""
import html
import re
import urllib.parse

TEL_WA = "523328496052"
TEL_TXT = "33 2849 6052"
EMAIL = "contacto@tecnopatch.com.mx"
PDF = "docs/TecnoPatch_Catalogo_CARTA_2026.pdf"

CATEGORIAS = [
    {
        "id": "redes", "tab": "Redes",
        "titulo": "Redes y conectividad empresarial",
        "intro": "La base de cualquier operación: fibra, cableado, WiFi y equipos de red diseñados para no fallar y crecer contigo.",
        "img": "img/catalogo/redes.jpg", "alt": "Rack de comunicaciones con cableado estructurado",
        "servicios": [
            {
                "n": "Instalación de fibra óptica empresarial",
                "d": "Tendido e instalación de fibra óptica monomodo y multimodo para redes LAN y WAN de alta velocidad. Fusión certificada con equipo OTDR, etiquetado profesional y documentación completa. Ideal para distancias superiores a 90 metros o donde se requiera máxima velocidad y confiabilidad.",
                "i": ["Fibra monomodo / multimodo", "Fusión óptica certificada con OTDR", "Patch panels de fibra LC/SC", "Planos y documentación técnica", "Garantía de 12 meses en mano de obra"],
                "t": "3 a 10 días hábiles",
                "p": "Corporativos, bodegas, plantas industriales, hospitales",
            },
            {
                "n": "Cableado estructurado Cat6 / Cat6A certificado",
                "d": "Diseño e instalación bajo normas ANSI/TIA-568C. Incluye canaletas, charolas portacables, rack de distribución, patch panels y certificación Fluke de cada punto de red. Velocidades de hasta 10 Gbps con Cat6A.",
                "i": ["Cableado Cat6 / Cat6A certificado", "Rack y patch panel de 24/48 puertos", "Certificación Fluke por punto", "Etiquetado profesional", "Diagrama de red actualizado"],
                "t": "2 a 7 días hábiles",
                "p": "Empresas, corporativos, hospitales, universidades",
            },
            {
                "n": "WiFi empresarial de alta densidad",
                "d": "Redes WiFi administradas con access points de grado empresarial. Diseño de radiofrecuencia, segmentación por VLAN, portal cautivo personalizado, QoS para tráfico crítico y monitoreo centralizado. Cobertura total, sin puntos ciegos.",
                "i": ["Access points Ubiquiti, Cisco o Aruba", "Controlador WiFi en la nube", "Portal cautivo con tu logo", "VLANs por departamento", "Monitoreo remoto 24/7"],
                "t": "1 a 5 días hábiles",
                "p": "Hoteles, restaurantes, hospitales, centros comerciales",
            },
            {
                "n": "Configuración de switches, routers y firewalls",
                "d": "Configuración profesional de equipos administrados: switches Cisco capa 2/3, routers y firewalls UTM. VLANs, QoS, enrutamiento OSPF/BGP, VPN site-to-site IPSec y balanceo de carga. Marcas: Cisco, MikroTik, Fortinet, Ubiquiti y pfSense, con soporte técnico incluido.",
                "i": ["VLANs y trunking 802.1Q", "VPN site-to-site IPSec/SSL", "Firewall y reglas ACL", "QoS y priorización de tráfico", "Documentación de la configuración"],
                "t": "1 a 3 días hábiles",
                "p": "Empresas multisede, call centers, industria",
            },
            {
                "n": "Enlace punto a punto inalámbrico",
                "d": "Enlaces inalámbricos punto a punto y punto-multipunto para interconectar edificios o sucursales sin cableado físico. Velocidades de hasta 1 Gbps con equipos de radiofrecuencia 5 GHz y 60 GHz, en distancias de 50 metros hasta varios kilómetros con línea de vista.",
                "i": ["Equipos RF 5 GHz / 60 GHz", "Instalación en azotea o torre", "Alineación y optimización del enlace", "Pruebas de velocidad y latencia", "Seguridad WPA3 configurada"],
                "t": "1 a 3 días hábiles",
                "p": "Bodegas, plantas industriales, condominios, sucursales",
            },
        ],
    },
    {
        "id": "seguridad", "tab": "Seguridad",
        "titulo": "Videovigilancia y seguridad electrónica",
        "intro": "Cámaras, control de acceso y alarmas que se pueden ver y administrar desde el celular.",
        "img": "img/catalogo/seguridad.jpg", "alt": "Cámara de videovigilancia en una oficina",
        "servicios": [
            {
                "n": "CCTV IP y analógico HD / 4K",
                "d": "Diseño e instalación de sistemas de videovigilancia con cámaras IP y analógicas HD, Full HD y 4K. Grabación continua o por detección de movimiento con IA en NVR/DVR. Acceso remoto en tiempo real desde el celular y respaldo en la nube como opción adicional.",
                "i": ["Cámaras domo, bala, PTZ y panorámicas", "NVR/DVR con disco duro incluido", "App móvil para acceso remoto", "Detección de movimiento por IA", "Configuración y capacitación al usuario"],
                "t": "1 a 5 días hábiles",
                "p": "Comercios, bodegas, plantas, residencias, estacionamientos",
            },
            {
                "n": "Control de acceso biométrico y RFID",
                "d": "Sistemas de control de acceso con huella dactilar, reconocimiento facial y tarjeta RFID. Software de administración con reportes de asistencia, control de horarios y zonas restringidas. Integrable con los sistemas de nómina de la empresa.",
                "i": ["Lectores biométricos de huella, facial y RFID", "Software de administración completo", "Control de horarios y zonas", "Reportes de asistencia exportables", "Integración con sistemas de nómina"],
                "t": "2 a 5 días hábiles",
                "p": "Empresas, fábricas, hospitales, universidades, escuelas",
            },
            {
                "n": "Sistemas de alarma e intrusión",
                "d": "Alarmas con sensores PIR, contactos magnéticos, detectores de rotura de vidrio, sirenas y panel inteligente con pantalla touch. Notificaciones push en tiempo real al celular y monitoreo en central 24/7 como opción.",
                "i": ["Panel DSC, Paradox o Honeywell", "Sensores de movimiento y perimetrales", "Sirenas interiores y exteriores", "Notificaciones por app móvil", "Monitoreo en central 24/7 (opcional)"],
                "t": "1 a 3 días hábiles",
                "p": "Negocios, bodegas, residencias, oficinas",
            },
        ],
    },
    {
        "id": "soporte", "tab": "Soporte IT",
        "titulo": "Soporte IT y mantenimiento tecnológico",
        "intro": "Que tus equipos, servidores y datos sigan funcionando: soporte rápido y mantenimiento programado.",
        "img": "img/catalogo/soporte.jpg", "alt": "Técnico dando soporte a un equipo de cómputo",
        "servicios": [
            {
                "n": "Soporte técnico presencial y remoto",
                "d": "Atención rápida a incidencias de hardware y software en equipos de cómputo, laptops, impresoras, servidores y equipos de red. Diagnóstico completo, resolución de fallas y actualización de sistemas. Soporte remoto inmediato con tiempos de respuesta según la póliza contratada.",
                "i": ["Diagnóstico completo de hardware y software", "Resolución de fallas del sistema", "Actualización de sistema operativo y drivers", "Limpieza física interna de equipos", "Informe técnico detallado"],
                "t": "El mismo día o el siguiente hábil",
                "p": "Empresas con parque de equipos de cómputo",
            },
            {
                "n": "Póliza de mantenimiento preventivo IT",
                "d": "Servicio programado, mensual o trimestral, de mantenimiento preventivo a toda la infraestructura tecnológica: limpieza de equipos, actualizaciones de seguridad, revisión de red y reporte ejecutivo del estado general para garantizar la continuidad operativa.",
                "i": ["Visitas mensuales o trimestrales", "Mantenimiento preventivo completo", "Limpieza y cambio de pasta térmica", "Actualizaciones de seguridad", "Reporte ejecutivo mensual"],
                "t": "Visitas programadas según la póliza",
                "p": "Empresas que requieren continuidad operativa",
            },
            {
                "n": "Instalación y configuración de servidores",
                "d": "Instalación y configuración de servidores Windows Server 2019/2022 y Linux: Active Directory, DNS, DHCP, servidor de archivos con permisos por departamento, VPN remota, Hyper-V y políticas de respaldo automático. Migración de datos sin pérdida de información.",
                "i": ["Windows Server o Linux instalado", "Active Directory, DNS y DHCP", "Servidor de archivos con permisos", "VPN de acceso remoto seguro", "Virtualización Hyper-V / VMware"],
                "t": "2 a 5 días hábiles",
                "p": "Empresas medianas con infraestructura propia",
            },
            {
                "n": "Backup y recuperación de datos",
                "d": "Respaldo local y en la nube con políticas de retención personalizadas. Backup incremental y diferencial automático con cifrado AES-256, pruebas periódicas de recuperación y plan de continuidad del negocio (BCP) ante desastres o fallas críticas.",
                "i": ["Backup local y en la nube", "Políticas automáticas diarias", "Cifrado AES-256 en tránsito", "Pruebas de recuperación mensuales", "Plan BCP ante desastres"],
                "t": "1 a 3 días hábiles",
                "p": "Empresas con información crítica o sensible",
            },
        ],
    },
    {
        "id": "telefonia", "tab": "Telefonía",
        "titulo": "Telefonía IP y comunicaciones unificadas",
        "intro": "Conmutadores y salas de videoconferencia para comunicarte con clientes y equipos sin importar dónde estén.",
        "img": "img/catalogo/telefonia.jpg", "alt": "Teléfono IP de escritorio",
        "servicios": [
            {
                "n": "Central telefónica IP (PBX / conmutador)",
                "d": "Instalación de centrales IP con tecnología VoIP: extensiones ilimitadas, IVR, colas de llamadas, buzones de voz, grabación y reportes estadísticos. Compatible con troncales SIP, líneas analógicas y celulares. Marcas: Grandstream, Panasonic, Avaya y 3CX.",
                "i": ["Central PBX IP configurada", "Extensiones internas ilimitadas", "IVR y contestadora automática", "Grabación de llamadas", "Reportes estadísticos de uso"],
                "t": "3 a 7 días hábiles",
                "p": "Empresas, call centers, hospitales, hoteles",
            },
            {
                "n": "Sala de videoconferencia profesional",
                "d": "Diseño e instalación de salas de videoconferencia con cámara PTZ de alta resolución, audio omnidireccional, pantalla o proyector y control desde tablet. Compatible con Zoom, Microsoft Teams, Google Meet y Cisco Webex.",
                "i": ["Cámara PTZ de alta resolución", "Audio omnidireccional profesional", "Pantalla o proyector instalado", "Control desde tablet", "Compatible con Zoom, Teams, Meet y Webex"],
                "t": "1 a 3 días hábiles",
                "p": "Corporativos, salas de juntas, empresas con equipos remotos",
            },
        ],
    },
    {
        "id": "web", "tab": "Desarrollo web",
        "titulo": "Desarrollo web y transformación digital",
        "intro": "Sitios y sistemas a la medida para vender más y automatizar procesos internos.",
        "img": "img/catalogo/web.jpg", "alt": "Desarrollo de sitios web y sistemas a medida",
        "servicios": [
            {
                "n": "Sitios web corporativos y sistemas a medida",
                "d": "Sitios web modernos, responsivos y optimizados para SEO. Desde landing pages hasta sistemas personalizados: CRM, portales de clientes, cotizadores y automatizaciones internas. Tecnología React y Node.js con bases de datos en la nube.",
                "i": ["Diseño UI/UX con tu marca", "Desarrollo responsivo, mobile-first", "Optimización SEO on-page incluida", "Panel de administración de contenido", "Hosting, dominio y SSL el primer año"],
                "t": "7 a 90 días, según el alcance",
                "p": "Empresas que buscan presencia digital y automatización",
            },
        ],
    },
    {
        "id": "electrico", "tab": "Eléctrico",
        "titulo": "Instalaciones eléctricas y sistemas especiales",
        "intro": "Protección eléctrica para que un apagón o una descarga no detenga tu operación.",
        "img": "img/catalogo/electrico.jpg", "alt": "Panel de control de sistemas especiales",
        "servicios": [
            {
                "n": "UPS y sistemas de energía regulada",
                "d": "Suministro e instalación de sistemas de alimentación ininterrumpida (UPS) para proteger servidores, equipos de red y cómputo de cortes de luz, picos de voltaje y variaciones eléctricas. Cálculo de carga, selección del equipo y configuración de alertas de batería y autonomía.",
                "i": ["Selección y suministro de UPS", "Instalación y conexión eléctrica", "Cálculo de autonomía por carga", "Alertas de batería configuradas", "Reguladores para equipos críticos"],
                "t": "1 a 2 días hábiles",
                "p": "Servidores, equipos de red, hospitales, comercios",
            },
            {
                "n": "Tierra física y protección contra rayos",
                "d": "Sistemas de tierra física para proteger equipos electrónicos y personas. Medición con equipo Megger, malla de tierra, varillas copperweld y conductores de cobre desnudo. Incluye pararrayos y descargadores de sobretensión, con certificación NOM-001-SEDE.",
                "i": ["Medición Megger de resistencia", "Malla de tierra y varillas copperweld", "Conductores de cobre desnudo", "Pararrayos y descargadores", "Certificación NOM-001-SEDE"],
                "t": "1 a 3 días hábiles",
                "p": "Cuartos de datos, plantas industriales, torres de comunicación",
            },
        ],
    },
]

PILARES = [
    ("Experiencia", "Técnicos con años de experiencia en proyectos empresariales e industriales de alto impacto en la ZMG."),
    ("Calidad", "Normas ANSI/TIA, NFPA y NOM en cada instalación, con equipos y materiales de marcas internacionales."),
    ("Compromiso", "Soporte técnico rápido, garantía en mano de obra y acompañamiento después de la instalación."),
    ("Soluciones a la medida", "Tecnología adaptada a las necesidades y al presupuesto de cada cliente."),
]

SECTORES = [
    "Construcción e inmobiliario", "Manufactura e industria", "Salud y hospitales", "Educación y universidades",
    "Comercio y retail", "Hotelería y restaurantes", "Corporativos y oficinas", "Gobierno y sector público",
    "Logística y transporte", "Desarrollos inmobiliarios",
]

e = html.escape


def wa(texto):
    return "https://wa.me/%s?text=%s" % (TEL_WA, urllib.parse.quote(texto))


def servicio_html(s):
    items = "".join("<li>%s</li>" % e(x) for x in s["i"])
    return f'''
      <article class="svc">
        <h3>{e(s["n"])}</h3>
        <p class="svc-d">{e(s["d"])}</p>
        <div class="svc-cols">
          <div>
            <h4>Qué incluye</h4>
            <ul>{items}</ul>
          </div>
          <div>
            <h4>Tiempo estimado</h4>
            <p>{e(s["t"])}</p>
            <h4>Ideal para</h4>
            <p>{e(s["p"])}</p>
          </div>
        </div>
        <a class="svc-q" href="{wa("Hola TecnoPatch, me interesa cotizar: " + s["n"])}" target="_blank" rel="noopener">Cotizar este servicio</a>
      </article>'''


def categoria_html(c):
    servs = "".join(servicio_html(s) for s in c["servicios"])
    return f'''
    <section class="cat" id="{c["id"]}" aria-labelledby="h-{c["id"]}">
      <div class="cat-side">
        <h2 id="h-{c["id"]}">{e(c["titulo"])}</h2>
        <p>{e(c["intro"])}</p>
        <img src="{c["img"]}" alt="{e(c["alt"])}" loading="lazy" decoding="async" width="640" height="480">
      </div>
      <div class="cat-list">{servs}
      </div>
    </section>'''


CSS = r'''
/* ===== CATALOGO ===== */
.sr-only{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
:root{--accent:#22e0c4;--accentl:#7ff0de;--accent-ink:#04120f;--bg:#020509}
[data-theme="light"]{--accent:#0a8f7e;--accentl:#12b8a2;--accent-ink:#ffffff;--bg:#f0f4ff;--bg2:#e8edf8;--nav-bg:rgba(240,244,255,.92);--text:#0f172a;--sub:#475569;--muted:#64748b;--border:rgba(15,23,42,.12);--bgcard:rgba(255,255,255,.85)}
.ncta,.btn-p,.mnav a.ncta{color:var(--accent-ink)}
.ncta:hover,.btn-p:hover{background:var(--accentl)}
.logo-img{height:60px}
@media(max-width:768px){.logo-img{height:52px}}
body{padding-top:70px}
.print-only{display:none}

.cat-head{max-width:var(--max,1400px);margin:0 auto;padding:clamp(48px,8vh,96px) 5% clamp(28px,4vh,48px)}
.cat-kicker{font-family:var(--fm);font-size:13px;color:var(--accent);margin-bottom:18px}
.cat-head h1{font-size:clamp(2.4rem,6vw,4.6rem);line-height:1.02;margin-bottom:20px;max-width:14ch}
.cat-lead{font-size:clamp(1rem,1.5vw,1.15rem);color:var(--sub);max-width:58ch;line-height:1.7}
.cat-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:30px}
.cat-actions .btn-p,.cat-actions .btn-s{display:inline-flex;align-items:center;gap:8px;padding:13px 26px;border-radius:100px;font-size:15px;font-weight:600;text-decoration:none}
.btn-s{border:1px solid var(--border);color:var(--text);background:transparent;transition:all .2s}
.btn-s:hover{border-color:var(--accent);color:var(--accent)}

.cat-tabs{position:sticky;top:70px;z-index:100;background:var(--nav-bg);backdrop-filter:blur(20px);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.cat-tabs ul{list-style:none;display:flex;justify-content:flex-start!important;gap:4px;max-width:var(--max,1400px);margin:0 auto;padding:10px 5%;overflow-x:auto;scrollbar-width:none}
.cat-tabs ul::-webkit-scrollbar{display:none}
.cat-tabs a{display:block;padding:7px 16px;border-radius:100px;border:1px solid transparent;color:var(--sub);font-size:14px;font-weight:500;text-decoration:none;white-space:nowrap;transition:all .2s}
.cat-tabs a:hover{color:var(--text)}
.cat-tabs a.on{border-color:var(--accent);color:var(--accent)}

.cat-main{max-width:var(--max,1400px);margin:0 auto;padding:0 5%}
.cat{display:grid;grid-template-columns:minmax(0,340px) minmax(0,1fr);gap:clamp(28px,5vw,72px);padding:clamp(56px,9vh,96px) 0;border-bottom:1px solid var(--border);scroll-margin-top:130px}
.cat:last-child{border-bottom:0}
.cat-side{position:sticky;top:150px;align-self:start}
.cat-side h2{font-size:clamp(1.6rem,2.6vw,2.3rem);line-height:1.1;margin-bottom:14px}
.cat-side p{color:var(--sub);line-height:1.7;font-size:15px}
.cat-side img{width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;border-radius:6px;border:1px solid var(--border);margin-top:24px;display:block}

.cat-list{display:flex;flex-direction:column}
.svc{padding:0 0 clamp(28px,4vh,40px);margin-bottom:clamp(28px,4vh,40px);border-bottom:1px solid var(--border)}
.svc:last-child{margin-bottom:0;padding-bottom:0;border-bottom:0}
.svc h3{font-size:clamp(1.25rem,2vw,1.6rem);margin-bottom:12px}
.svc-d{color:var(--sub);line-height:1.75;max-width:68ch;margin-bottom:22px}
.svc-cols{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:28px;margin-bottom:22px}
.svc h4{font-family:var(--fm);font-size:12px;font-weight:500;color:var(--muted);margin-bottom:8px}
.svc ul{list-style:none;display:grid;gap:7px}
.svc li{position:relative;padding-left:18px;font-size:14.5px;line-height:1.5}
.svc li::before{content:"";position:absolute;left:0;top:.7em;width:8px;height:1px;background:var(--accent)}
.svc-cols p{font-size:14.5px;line-height:1.55;margin-bottom:16px}
.svc-q{display:inline-block;color:var(--accent);font-weight:600;font-size:14.5px;text-decoration:none;border-bottom:1px solid currentColor;padding-bottom:2px}
.svc-q:hover{color:var(--accentl)}

.cat-about{max-width:var(--max,1400px);margin:0 auto;padding:clamp(56px,9vh,96px) 5%;border-top:1px solid var(--border);display:grid;grid-template-columns:minmax(0,340px) minmax(0,1fr);gap:clamp(28px,5vw,72px)}
.cat-about h2{font-size:clamp(1.6rem,2.6vw,2.3rem);line-height:1.1}
.cat-about p{color:var(--sub);line-height:1.75;max-width:66ch;margin-bottom:16px}
.cat-about dl{display:grid;grid-template-columns:max-content 1fr;gap:10px 28px;margin:26px 0}
.cat-about dt{font-weight:600}
.cat-about dd{color:var(--sub);line-height:1.6;font-size:14.5px}
.sectores{list-style:none;display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.sectores li{padding:6px 14px;border:1px solid var(--border);border-radius:100px;font-size:13.5px;color:var(--sub)}
.cat-about h3{font-size:1.1rem;margin-top:28px}

.cat-contact{max-width:var(--max,1400px);margin:0 auto;padding:clamp(56px,9vh,96px) 5%;border-top:1px solid var(--border);text-align:left}
.cat-contact h2{font-size:clamp(1.8rem,3.4vw,3rem);max-width:20ch;margin-bottom:16px}
.cat-contact>p{color:var(--sub);max-width:56ch;line-height:1.7;margin-bottom:28px}
.cat-contact dl{display:grid;grid-template-columns:max-content 1fr;gap:8px 28px;margin-top:34px;font-size:14.5px}
.cat-contact dt{color:var(--muted)}
.cat-contact dd a{color:var(--text)}

@media(max-width:900px){
  .cat,.cat-about{grid-template-columns:1fr}
  .cat-side{position:static}
  .cat-side img{max-width:none;aspect-ratio:16/9}
  .svc-cols{grid-template-columns:1fr;gap:4px}
}
@media(max-width:560px){
  .cat-about dl,.cat-contact dl{grid-template-columns:1fr;gap:2px}
  .cat-about dd{margin-bottom:10px}
  .cat-contact dd{margin-bottom:12px}
}

/* ===== PDF / IMPRESION ===== */
@media print{
  @page{size:Letter;margin:15mm 14mm 16mm}
  :root,[data-theme="light"],[data-theme="dark"]{--bg:#fff;--text:#0f172a;--sub:#334155;--muted:#64748b;--border:#d5dbe5;--accent:#0a8f7e;--accentl:#0a8f7e}
  html,body{background:#fff!important;color:#0f172a;font-size:10.5pt}
  body{padding-top:0}
  nav,#nav,.mnav,.wa,.cat-tabs,.cat-actions,footer,.hbg,.cat-head,.svc-q{display:none!important}
  .print-only{display:block}
  .print-cover{min-height:245mm;display:flex!important;flex-direction:column;justify-content:space-between;page-break-after:always;break-after:page}
  .print-cover .pc-brand{font-family:var(--fd);font-size:44pt;font-weight:700;letter-spacing:-.03em;line-height:1}
  .print-cover .pc-tag{font-family:var(--fm);font-size:10pt;color:#0a8f7e;margin-top:10px}
  .print-cover h1{font-size:34pt;line-height:1.05;margin-top:90mm;max-width:12ch}
  .print-cover .pc-ed{color:#475569;margin-top:10px;font-size:12pt}
  .print-cover .pc-foot{border-top:2px solid #0a8f7e;padding-top:12px;font-size:10.5pt;line-height:1.7}
  .cat-main,.cat-about,.cat-contact{padding-left:0;padding-right:0;max-width:none}
  .cat{display:block;padding:0 0 6mm;border:0}
  .cat-list{display:block}
  .cat-side{break-after:avoid;page-break-after:avoid;break-inside:avoid}
  .cat-side{position:static;display:grid;grid-template-columns:1fr 44mm;gap:6mm;align-items:start;margin-bottom:5mm;padding-bottom:4mm;border-bottom:1.5px solid #0a8f7e}
  .cat-side h2{font-size:20pt;grid-column:1}
  .cat-side p{grid-column:1;font-size:10.5pt}
  .cat-side img{grid-column:2;grid-row:1/3;margin:0;aspect-ratio:4/3;border-radius:3px}
  .svc{break-inside:avoid;page-break-inside:avoid;padding-bottom:4mm;margin-bottom:4mm}
  .svc h3{font-size:12.5pt;margin-bottom:4px}
  .svc-d{font-size:9.3pt;line-height:1.42;margin-bottom:6px;max-width:none}
  .svc-cols{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:14px;margin-bottom:0}
  .svc ul{gap:2px}
  .svc li,.svc-cols p{font-size:9pt;line-height:1.35}
  .svc-cols p{margin-bottom:6px}
  .svc h4{font-size:7.5pt;margin-bottom:3px}
  .cat-about{display:block;border:0;padding-top:0;break-before:page;page-break-before:always}
  .cat-about h2{font-size:20pt;margin-bottom:10px}
  .cat-contact{break-before:page;page-break-before:always;border:0}
  .cat-contact .btn-p{display:none}
  a{color:inherit;text-decoration:none}
  img{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
'''

JS = r'''
(function(){
  var saved='dark'; try{saved=localStorage.getItem('tp_theme')||'dark'}catch(e){}
  function applyTheme(t){document.documentElement.setAttribute('data-theme',t);document.body.classList.toggle('light',t==='light');var b=document.getElementById('thbtn');if(b)b.setAttribute('aria-label',t==='dark'?'Cambiar a modo claro':'Cambiar a modo oscuro');}
  applyTheme(saved);
  var tb=document.getElementById('thbtn');
  if(tb)tb.addEventListener('click',function(){var n=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';applyTheme(n);try{localStorage.setItem('tp_theme',n)}catch(e){}});
  window.toggleMob=function(){document.getElementById('mnav').classList.toggle('open')};

  // categoria activa en las pestanas
  var links=[].slice.call(document.querySelectorAll('.cat-tabs a'));
  var secs=links.map(function(a){return document.querySelector(a.getAttribute('href'))}).filter(Boolean);
  function spy(){
    var y=window.scrollY+170,cur=null;
    secs.forEach(function(s){if(s.offsetTop<=y)cur=s.id});
    links.forEach(function(a){var on=a.getAttribute('href')==='#'+cur;a.classList.toggle('on',on);if(on&&a.scrollIntoView&&a.parentNode.parentNode.scrollWidth>a.parentNode.parentNode.clientWidth){var u=a.parentNode.parentNode;u.scrollLeft=a.offsetLeft-20}});
  }
  window.addEventListener('scroll',spy,{passive:true});spy();
})();
'''


def main():
    base = open("proyectos.html", "rb").read().decode("utf-8")
    head_end = base.index('<h1 class="sr-only">')
    head = base[:head_end]
    foot = base[base.index("<footer>"):base.index("<!-- LIGHTBOX -->")]

    # <head>: titulo / descripcion / canonical / og
    titulo = "Catálogo de servicios 2026 | TecnoPatch – Telecomunicaciones y seguridad en Guadalajara"
    desc = ("Catálogo de servicios de TecnoPatch: fibra óptica, cableado estructurado, WiFi empresarial, CCTV, control de acceso, "
            "telefonía IP, soporte IT y más en Guadalajara. Descarga el PDF o cotiza por WhatsApp.")
    head = re.sub(r"<title>.*?</title>", "<title>%s</title>" % e(titulo), head, count=1, flags=re.S)
    head = re.sub(r'(<meta name="description" content=")[^"]*(")', lambda m: m.group(1) + e(desc, quote=True) + m.group(2), head, count=1)
    head = re.sub(r'(<meta property="og:title" content=")[^"]*(")', lambda m: m.group(1) + e(titulo, quote=True) + m.group(2), head, count=1)
    head = re.sub(r'(<meta property="og:description" content=")[^"]*(")', lambda m: m.group(1) + e(desc, quote=True) + m.group(2), head, count=1)
    head = head.replace("proyectos.html", "catalogo.html")
    head = head.replace('<li><a href="catalogo.html" class="active">Proyectos</a></li>', '<li><a href="proyectos.html">Proyectos</a></li>')
    head = head.replace('<a href="catalogo.html" class="active" onclick="toggleMob()">Proyectos</a>', '<a href="proyectos.html" onclick="toggleMob()">Proyectos</a>')
    # menu: agregar Catalogo (activo) antes de FAQ
    # el menu de proyectos.html ya trae "Catalogo": solo se marca como activo
    head = head.replace('<li><a href="catalogo.html">Cat&aacute;logo</a></li>', '<li><a href="catalogo.html" class="active">Cat&aacute;logo</a></li>', 1)
    head = head.replace('<a href="catalogo.html" onclick="toggleMob()">Cat&aacute;logo</a>', '<a href="catalogo.html" class="active" onclick="toggleMob()">Cat&aacute;logo</a>', 1)
    head = head.replace("</head>", "<style id=\"tp-catalogo\">%s</style>\n</head>" % CSS, 1)

    tabs = "".join('<li><a href="#%s">%s</a></li>' % (c["id"], e(c["tab"])) for c in CATEGORIAS)
    cats = "".join(categoria_html(c) for c in CATEGORIAS)
    pilares = "".join("<dt>%s</dt><dd>%s</dd>" % (e(a), e(b)) for a, b in PILARES)
    sect = "".join("<li>%s</li>" % e(s) for s in SECTORES)

    body = f'''<div class="print-only print-cover">
  <div>
    <div class="pc-brand">TecnoPatch</div>
    <div class="pc-tag">Telecomunicaciones, infraestructura IT y seguridad electrónica</div>
    <h1>Catálogo de servicios</h1>
    <div class="pc-ed">Edición 2026 · Corporativo y PyME</div>
  </div>
  <div class="pc-foot">
    {EMAIL}<br>WhatsApp {TEL_TXT}<br>tecnopatch.com.mx · Guadalajara, Jalisco, México
  </div>
</div>

<header class="cat-head">
  <p class="cat-kicker">Edición 2026 · Corporativo y PyME</p>
  <h1>Catálogo de servicios</h1>
  <p class="cat-lead">Redes, seguridad, telefonía, soporte y desarrollo web. Cada servicio indica qué incluye, cuánto tarda y para quién es ideal, para que sepas qué pedir antes de escribirnos.</p>
  <div class="cat-actions">
    <a class="btn-p" href="{PDF}" download="TecnoPatch_Catalogo_Servicios_2026.pdf">Descargar PDF</a>
    <a class="btn-s" href="{wa("Hola TecnoPatch, vi su catálogo y me interesa cotizar")}" target="_blank" rel="noopener">Pedir cotización</a>
  </div>
</header>

<nav class="cat-tabs" aria-label="Categorías del catálogo"><ul>{tabs}</ul></nav>

<main class="cat-main">{cats}
</main>

<section class="cat-about" aria-labelledby="h-quienes">
  <h2 id="h-quienes">Quiénes somos</h2>
  <div>
    <p>TecnoPatch es una empresa de telecomunicaciones e infraestructura IT con sede en Guadalajara, Jalisco. Diseñamos, instalamos y mantenemos soluciones tecnológicas para empresas de todos los tamaños, con estándares internacionales en cada proyecto y soporte después de la instalación en toda la ZMG.</p>
    <p>Trabajamos con Cisco, Ubiquiti, Grandstream, Hikvision, Dahua, Panduit, Fortinet y Microsoft. Cada solución se diseña a la medida, con tiempos de respuesta rápidos y garantía en todos los servicios.</p>
    <dl>{pilares}</dl>
    <h3>Sectores que atendemos</h3>
    <ul class="sectores">{sect}</ul>
  </div>
</section>

<section class="cat-contact" aria-labelledby="h-contacto">
  <h2 id="h-contacto">Solicita una visita técnica sin costo</h2>
  <p>Evaluamos tus necesidades y te presentamos la mejor solución para tu empresa, sin compromiso.</p>
  <a class="btn-p" style="display:inline-flex;padding:13px 28px;border-radius:100px;font-weight:600;text-decoration:none" href="{wa("Hola TecnoPatch, quiero solicitar una visita técnica")}" target="_blank" rel="noopener">Escribir por WhatsApp</a>
  <dl>
    <dt>Correo</dt><dd><a href="mailto:{EMAIL}">{EMAIL}</a></dd>
    <dt>WhatsApp y teléfono</dt><dd><a href="https://wa.me/{TEL_WA}" target="_blank" rel="noopener">{TEL_TXT}</a></dd>
    <dt>Ubicación</dt><dd>Guadalajara, Jalisco, México</dd>
    <dt>Horario</dt><dd>Lunes a viernes, 9:00 a 18:00 h</dd>
    <dt>Emergencias</dt><dd>Disponible para clientes con póliza activa</dd>
  </dl>
</section>

'''
    foot = foot.replace("322 518 7656", TEL_TXT)
    foot = re.sub(r"https://wa\.me/\d+\?text=[^\"]*", wa("Hola TecnoPatch, me interesa cotizar"), foot, count=1)
    out = head + body + foot + "\n<script>%s</script>\n</body>\n</html>\n" % JS
    open("catalogo.html", "wb").write(out.encode("utf-8"))
    print("catalogo.html generado:", len(out), "bytes")


if __name__ == "__main__":
    main()
